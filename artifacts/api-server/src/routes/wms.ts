import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Advanced WMS";

const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const qty = z.coerce.number().positive();
const binSchema = z.object({
  warehouseId: id, code: z.string().min(1).max(50), name: z.string().min(1).max(200),
  zone: z.string().max(100).nullable().optional(), binType: z.enum(["bulk", "picking", "receiving", "shipping", "quarantine"]).optional(),
  capacity: z.coerce.number().min(0).optional(), barcode: z.string().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
});
const receiptSchema = z.object({
  grnId: id.nullable().optional(), warehouseId: id, supplierName: z.string().max(250).nullable().optional(),
  receiptDate: date, notes: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    productId: id, binId: id.nullable().optional(), lotNumber: z.string().max(100).nullable().optional(),
    expiryDate: date.nullable().optional(), qty: qty, acceptedQty: z.coerce.number().min(0).optional(),
    rejectedQty: z.coerce.number().min(0).optional(), serialNumbers: z.string().max(5000).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })).min(1),
});
const cycleSchema = z.object({
  warehouseId: id, binId: id.nullable().optional(), scheduledDate: date,
  lines: z.array(z.object({ productId: id, binId: id.nullable().optional(), countedQty: z.coerce.number().min(0).optional(), notes: z.string().max(500).nullable().optional() })).optional(),
});

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, column: string, prefix: string, orgId: number, client: any = pool) {
  const allowed = new Set(["wms_receipts", "wms_cycle_counts"]);
  if (!allowed.has(table)) throw new Error("invalid number table");
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}
async function stockRow(client: any, orgId: number, productId: number, warehouseId: number) {
  const found = await client.query(
    `select id, qty_on_hand from inv_stock_levels where org_id=$1 and product_id=$2 and warehouse_id=$3 limit 1`,
    [orgId, productId, warehouseId],
  );
  if (found.rows[0]) return found.rows[0];
  const created = await client.query(
    `insert into inv_stock_levels(org_id, product_id, warehouse_id, qty_on_hand, qty_reserved) values($1,$2,$3,0,0) returning id, qty_on_hand`,
    [orgId, productId, warehouseId],
  );
  return created.rows[0];
}
async function movement(client: any, orgId: number, productId: number, warehouseId: number, delta: number, type: string, reference: string, userId: number) {
  const row = await stockRow(client, orgId, productId, warehouseId);
  const next = Math.max(0, Number(row.qty_on_hand) + delta);
  await client.query(`update inv_stock_levels set qty_on_hand=$1, updated_at=now() where id=$2`, [next.toFixed(4), row.id]);
  const n = await client.query(`select count(*)::int as count from inv_movements where org_id=$1`, [orgId]);
  await client.query(
    `insert into inv_movements(org_id,movement_number,product_id,warehouse_id,movement_type,qty,reference,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [orgId, `WMS-${String(Number(n.rows[0]?.count ?? 0) + 1).padStart(5, "0")}`, productId, warehouseId, type, delta.toFixed(4), reference, userId],
  );
}

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = org(req);
    const [bins, lots, serials, receipts, counts, expiring] = await Promise.all([
      pool.query(`select count(*)::int as count from wms_bins where org_id=$1 and is_active=true`, [orgId]),
      pool.query(`select count(*)::int as count, coalesce(sum(qty_on_hand),0)::text as units from wms_lots where org_id=$1 and qty_on_hand>0`, [orgId]),
      pool.query(`select count(*)::int as count from wms_serials where org_id=$1 and status='available'`, [orgId]),
      pool.query(`select count(*)::int as count from wms_receipts where org_id=$1 and status in ('draft','received')`, [orgId]),
      pool.query(`select count(*)::int as count from wms_cycle_counts where org_id=$1 and status in ('draft','in_progress')`, [orgId]),
      pool.query(`select count(*)::int as count from wms_lots where org_id=$1 and expiry_date ~ '^\\d{4}-\\d{2}-\\d{2}$' and expiry_date::date <= current_date + 30 and qty_on_hand>0`, [orgId]),
    ]);
    res.json({ success: true, data: {
      activeBins: bins.rows[0].count, activeLots: lots.rows[0].count, lotUnits: lots.rows[0].units,
      availableSerials: serials.rows[0].count, openReceipts: receipts.rows[0].count,
      openCounts: counts.rows[0].count, expiringLots: expiring.rows[0].count,
    }});
  } catch { fail(res, "Failed to load WMS summary", 500); }
});

router.get("/bins", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = org(req); const warehouseId = req.query.warehouseId ? parsedId(String(req.query.warehouseId)) : null;
    const search = String(req.query.search ?? "").trim();
    const params: any[] = [orgId]; const filters = ["b.org_id=$1"];
    if (warehouseId) { params.push(warehouseId); filters.push(`b.warehouse_id=$${params.length}`); }
    if (search) { params.push(`%${search}%`); filters.push(`(b.code ilike $${params.length} or b.name ilike $${params.length} or coalesce(b.barcode,'') ilike $${params.length})`); }
    const result = await pool.query(
      `select b.*, w.code as warehouse_code, w.name as warehouse_name,
        coalesce(sum(l.qty_on_hand),0)::text as lot_units, count(distinct l.id)::int as lot_count
       from wms_bins b join inv_warehouses w on w.id=b.warehouse_id
       left join wms_lots l on l.bin_id=b.id and l.qty_on_hand>0
       where ${filters.join(" and ")} group by b.id,w.code,w.name order by w.code,b.code`, params);
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load warehouse bins", 500); }
});

router.post("/bins", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = binSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data; const o = org(req);
    const wh = await pool.query(`select id from inv_warehouses where id=$1 and org_id=$2`, [d.warehouseId, o]);
    if (!wh.rows[0]) return fail(res, "Warehouse not found", 422);
    const result = await pool.query(
      `insert into wms_bins(org_id,warehouse_id,code,name,zone,bin_type,capacity,barcode,is_active) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [o,d.warehouseId,d.code.trim().toUpperCase(),d.name,d.zone ?? null,d.binType ?? "picking",d.capacity ?? 0,d.barcode ?? null,d.isActive ?? true]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Bin code or barcode already exists" : "Failed to create bin", e.code === "23505" ? 409 : 500); }
});

router.put("/bins/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const binId = parsedId(req.params.id as string); if (!binId) return fail(res, "Invalid bin id");
  const parsed = binSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data; const result = await pool.query(
      `update wms_bins set warehouse_id=coalesce($1,warehouse_id),code=coalesce($2,code),name=coalesce($3,name),zone=coalesce($4,zone),bin_type=coalesce($5,bin_type),capacity=coalesce($6,capacity),barcode=coalesce($7,barcode),is_active=coalesce($8,is_active),updated_at=now() where id=$9 and org_id=$10 returning *`,
      [d.warehouseId ?? null,d.code?.trim().toUpperCase() ?? null,d.name ?? null,d.zone ?? null,d.binType ?? null,d.capacity ?? null,d.barcode ?? null,d.isActive ?? null,binId,org(req)]);
    if (!result.rows[0]) return fail(res, "Bin not found", 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Bin code or barcode already exists" : "Failed to update bin", e.code === "23505" ? 409 : 500); }
});

router.delete("/bins/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const binId = parsedId(req.params.id as string); if (!binId) return fail(res, "Invalid bin id");
  try {
    const existing = await pool.query(`select id from wms_bins where id=$1 and org_id=$2`, [binId, org(req)]);
    const stock = await pool.query(`select coalesce(sum(qty_on_hand),0)::numeric as units from wms_lots where bin_id=$1`, [binId]);
    if (!existing.rows[0]) return fail(res, "Bin not found", 404);
    if (Number(stock.rows[0].units) > 0) return fail(res, "Cannot delete a bin with stock; move or adjust inventory first", 409);
    await pool.query(`delete from wms_bins where id=$1`, [binId]); res.json({ success: true, data: { id: binId } });
  } catch { fail(res, "Failed to delete bin", 500); }
});

router.get("/barcodes", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const search = `%${String(req.query.search ?? "").trim()}%`;
    const result = await pool.query(
      `select b.*, p.sku, p.name as product_name from wms_barcodes b join inv_products p on p.id=b.product_id where b.org_id=$1 and (b.barcode ilike $2 or p.sku ilike $2 or p.name ilike $2) order by b.created_at desc`,
      [org(req), search]);
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load barcodes", 500); }
});

router.post("/barcodes", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = z.object({ productId: id, barcode: z.string().min(3).max(120), barcodeType: z.enum(["barcode","qr"]).default("barcode"), isPrimary: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data; const o = org(req);
    const p = await pool.query(`select id from inv_products where id=$1 and org_id=$2`, [d.productId,o]);
    if (!p.rows[0]) return fail(res, "Product not found", 422);
    const result = await pool.query(`insert into wms_barcodes(org_id,product_id,barcode,barcode_type,is_primary) values($1,$2,$3,$4,$5) returning *`, [o,d.productId,d.barcode.trim(),d.barcodeType,d.isPrimary ?? false]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Barcode already exists" : "Failed to create barcode", e.code === "23505" ? 409 : 500); }
});

router.delete("/barcodes/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const barcodeId = parsedId(req.params.id as string); if (!barcodeId) return fail(res, "Invalid barcode id");
  await pool.query(`delete from wms_barcodes where id=$1 and org_id=$2`, [barcodeId,org(req)]); res.json({ success: true, data: { id: barcodeId } });
});

router.get("/scan", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const code = String(req.query.code ?? "").trim(); if (!code) return fail(res, "Scan code is required");
  try {
    const o = org(req);
    const [product, bin, serial, lot] = await Promise.all([
      pool.query(`select b.barcode,b.barcode_type,p.id as product_id,p.sku,p.name,p.unit from wms_barcodes b join inv_products p on p.id=b.product_id where b.org_id=$1 and b.barcode=$2 union all select null,'sku',id,sku,name,unit from inv_products where org_id=$1 and sku=$2 limit 1`, [o,code]),
      pool.query(`select b.id,b.code,b.name,b.zone,b.bin_type,w.id as warehouse_id,w.code as warehouse_code,w.name as warehouse_name from wms_bins b join inv_warehouses w on w.id=b.warehouse_id where b.org_id=$1 and (b.barcode=$2 or b.code=$2) limit 1`, [o,code]),
      pool.query(`select s.*,p.sku,p.name as product_name from wms_serials s join inv_products p on p.id=s.product_id where s.org_id=$1 and s.serial_number=$2`, [o,code]),
      pool.query(`select l.*,p.sku,p.name as product_name,w.code as warehouse_code,b.code as bin_code from wms_lots l join inv_products p on p.id=l.product_id join inv_warehouses w on w.id=l.warehouse_id left join wms_bins b on b.id=l.bin_id where l.org_id=$1 and l.lot_number=$2`, [o,code]),
    ]);
    res.json({ success: true, data: { code, product: product.rows[0] ?? null, bin: bin.rows[0] ?? null, serial: serial.rows[0] ?? null, lots: lot.rows } });
  } catch { fail(res, "Failed to scan code", 500); }
});

router.get("/lots", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req); const search = `%${String(req.query.search ?? "").trim()}%`;
    const result = await pool.query(`select l.*,p.sku,p.name as product_name,w.code as warehouse_code,b.code as bin_code from wms_lots l join inv_products p on p.id=l.product_id join inv_warehouses w on w.id=l.warehouse_id left join wms_bins b on b.id=l.bin_id where l.org_id=$1 and (l.lot_number ilike $2 or p.sku ilike $2 or p.name ilike $2) order by l.expiry_date nulls last,l.updated_at desc`, [o,search]);
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load lots", 500); }
});

router.get("/serials", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req); const search = `%${String(req.query.search ?? "").trim()}%`;
    const result = await pool.query(`select s.*,p.sku,p.name as product_name,w.code as warehouse_code,b.code as bin_code from wms_serials s join inv_products p on p.id=s.product_id join inv_warehouses w on w.id=s.warehouse_id left join wms_bins b on b.id=s.bin_id where s.org_id=$1 and (s.serial_number ilike $2 or p.sku ilike $2 or p.name ilike $2) order by s.received_at desc`, [o,search]);
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load serial numbers", 500); }
});

router.get("/receipts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`select r.*,w.code as warehouse_code,w.name as warehouse_name,count(l.id)::int as line_count,coalesce(sum(l.accepted_qty),0)::text as accepted_units from wms_receipts r join inv_warehouses w on w.id=r.warehouse_id left join wms_receipt_lines l on l.receipt_id=r.id where r.org_id=$1 group by r.id,w.code,w.name order by r.created_at desc`, [org(req)]);
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load WMS receipts", 500); }
});

router.post("/receipts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = receiptSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); const wh = await client.query(`select id from inv_warehouses where id=$1 and org_id=$2`,[d.warehouseId,o]);
    if (!wh.rows[0]) return fail(res, "Warehouse not found", 422);
    await client.query("begin"); const number = await nextNumber("wms_receipts","receipt_number","WMS-GRN",o,client);
    const header = await client.query(`insert into wms_receipts(org_id,receipt_number,grn_id,warehouse_id,supplier_name,receipt_date,status,notes,created_by) values($1,$2,$3,$4,$5,$6,'received',$7,$8) returning *`,[o,number,d.grnId ?? null,d.warehouseId,d.supplierName ?? null,d.receiptDate,d.notes ?? null,req.user!.userId]);
    for (const line of d.lines) {
      const accepted = Math.min(Number(line.acceptedQty ?? line.qty), Number(line.qty)); const rejected = Number(line.rejectedQty ?? (Number(line.qty)-accepted));
      if (line.binId) {
        const b = await client.query(`select id from wms_bins where id=$1 and warehouse_id=$2 and org_id=$3`,[line.binId,d.warehouseId,o]);
        if (!b.rows[0]) throw new Error("Invalid putaway bin");
      }
      await client.query(`insert into wms_receipt_lines(receipt_id,product_id,bin_id,lot_number,expiry_date,qty,accepted_qty,rejected_qty,serial_numbers,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[header.rows[0].id,line.productId,line.binId ?? null,line.lotNumber ?? null,line.expiryDate ?? null,line.qty,accepted,rejected,line.serialNumbers ?? null,line.notes ?? null]);
    }
    await client.query("commit"); res.status(201).json({ success:true,data:header.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(()=>{}); fail(res,e.message === "Invalid putaway bin" ? e.message : "Failed to create WMS receipt",e.message === "Invalid putaway bin" ? 422 : 500); }
  finally { client.release(); }
});

async function putawayReceipt(client: any, receiptId: number, orgId: number, userId: number) {
  const receipt = await client.query(`select * from wms_receipts where id=$1 and org_id=$2 for update`,[receiptId,orgId]);
  if (!receipt.rows[0]) throw new Error("Receipt not found");
  if (receipt.rows[0].status === "putaway") throw new Error("Receipt is already put away");
  const lines = await client.query(`select * from wms_receipt_lines where receipt_id=$1`,[receiptId]);
  for (const line of lines.rows) {
    const accepted = Number(line.accepted_qty);
    if (accepted <= 0) continue;
    await movement(client,orgId,line.product_id,receipt.rows[0].warehouse_id,accepted,"receipt",receipt.rows[0].receipt_number,userId);
    if (line.lot_number) {
      const existing = await client.query(`select * from wms_lots where org_id=$1 and product_id=$2 and warehouse_id=$3 and bin_id is not distinct from $4 and lot_number=$5 for update`,[orgId,line.product_id,receipt.rows[0].warehouse_id,line.bin_id,line.lot_number]);
      if (existing.rows[0]) await client.query(`update wms_lots set qty_on_hand=qty_on_hand+$1,expiry_date=coalesce($2,expiry_date),updated_at=now(),status='available' where id=$3`,[accepted,line.expiry_date,existing.rows[0].id]);
      else await client.query(`insert into wms_lots(org_id,product_id,warehouse_id,bin_id,lot_number,expiry_date,qty_on_hand,status) values($1,$2,$3,$4,$5,$6,$7,'available')`,[orgId,line.product_id,receipt.rows[0].warehouse_id,line.bin_id,line.lot_number,line.expiry_date,accepted]);
    }
    const serials = String(line.serial_numbers ?? "").split(/[\s,;\n]+/).map((s:string)=>s.trim()).filter(Boolean);
    for (const serialNumber of serials) await client.query(`insert into wms_serials(org_id,product_id,warehouse_id,bin_id,serial_number,status) values($1,$2,$3,$4,$5,'available')`,[orgId,line.product_id,receipt.rows[0].warehouse_id,line.bin_id,serialNumber]);
  }
  await client.query(`update wms_receipts set status='putaway',updated_at=now() where id=$1`,[receiptId]);
}

router.put("/receipts/:id/putaway", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const receiptId = parsedId(req.params.id as string); if (!receiptId) return fail(res, "Invalid receipt id");
  const client = await pool.connect();
  try { await client.query("begin"); await putawayReceipt(client,receiptId,org(req),req.user!.userId); await client.query("commit"); res.json({success:true,data:{id:receiptId,status:"putaway"}}); }
  catch(e:any){await client.query("rollback").catch(()=>{});fail(res,e.message==="Receipt not found"||e.message==="Receipt is already put away"?e.message:"Failed to put away receipt",e.message==="Receipt not found"?404:409);}
  finally{client.release();}
});

router.get("/cycle-counts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try { const r=await pool.query(`select c.*,w.code as warehouse_code,b.code as bin_code,count(l.id)::int as line_count,count(l.id) filter(where l.counted_qty is null)::int as open_lines,coalesce(sum(abs(coalesce(l.variance_qty,0))),0)::text as variance_units from wms_cycle_counts c join inv_warehouses w on w.id=c.warehouse_id left join wms_bins b on b.id=c.bin_id left join wms_cycle_count_lines l on l.count_id=c.id where c.org_id=$1 group by c.id,w.code,b.code order by c.created_at desc`,[org(req)]); res.json({success:true,data:r.rows}); }
  catch{fail(res,"Failed to load cycle counts",500);}
});

router.post("/cycle-counts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed=cycleSchema.safeParse(req.body); if(!parsed.success)return fail(res,"Validation failed"); const d=parsed.data; const client=await pool.connect();
  try { const o=org(req); await client.query("begin"); const number=await nextNumber("wms_cycle_counts","count_number","CC",o,client); const head=await client.query(`insert into wms_cycle_counts(org_id,count_number,warehouse_id,bin_id,status,scheduled_date,created_by) values($1,$2,$3,$4,'in_progress',$5,$6) returning *`,[o,number,d.warehouseId,d.binId??null,d.scheduledDate,req.user!.userId]);
    let lines=d.lines??[]; if(!lines.length){const stock=await client.query(`select product_id,coalesce(sum(qty_on_hand),0)::text as expected from inv_stock_levels where org_id=$1 and warehouse_id=$2 group by product_id`,[o,d.warehouseId]); lines=stock.rows.map((r:any)=>({productId:r.product_id,binId:d.binId??null,countedQty:undefined,notes:null}));}
    for(const line of lines){const expected=await client.query(`select coalesce(sum(qty_on_hand),0)::text as expected from wms_lots where org_id=$1 and product_id=$2 and warehouse_id=$3 and bin_id is not distinct from $4`,[o,line.productId,d.warehouseId,line.binId??d.binId??null]); const fallback=await client.query(`select coalesce(sum(qty_on_hand),0)::text as expected from inv_stock_levels where org_id=$1 and product_id=$2 and warehouse_id=$3`,[o,line.productId,d.warehouseId]); const e=Number(expected.rows[0].expected)||Number(fallback.rows[0].expected)||0; const counted=line.countedQty===undefined?null:line.countedQty; await client.query(`insert into wms_cycle_count_lines(count_id,product_id,bin_id,expected_qty,counted_qty,variance_qty,notes) values($1,$2,$3,$4,$5,$6,$7)`,[head.rows[0].id,line.productId,line.binId??d.binId??null,e,counted,counted===null?null:Number(counted)-e,line.notes??null]);}
    await client.query("commit");res.status(201).json({success:true,data:head.rows[0]});
  }catch{await client.query("rollback").catch(()=>{});fail(res,"Failed to create cycle count",500);}finally{client.release();}
});

router.get("/cycle-counts/:id", requirePermission(MODULE, "view"), async (req: AuthRequest,res) => {const countId=parsedId(req.params.id as string);if(!countId)return fail(res,"Invalid count id");try{const h=await pool.query(`select c.*,w.code as warehouse_code,b.code as bin_code from wms_cycle_counts c join inv_warehouses w on w.id=c.warehouse_id left join wms_bins b on b.id=c.bin_id where c.id=$1 and c.org_id=$2`,[countId,org(req)]);if(!h.rows[0])return fail(res,"Cycle count not found",404);const l=await pool.query(`select l.*,p.sku,p.name as product_name,b.code as bin_code from wms_cycle_count_lines l join inv_products p on p.id=l.product_id left join wms_bins b on b.id=l.bin_id where l.count_id=$1 order by p.sku`,[countId]);res.json({success:true,data:{...h.rows[0],lines:l.rows}});}catch{fail(res,"Failed to load cycle count",500);}});

router.put("/cycle-counts/:id/lines/:lineId", requirePermission(MODULE, "edit"), async (req: AuthRequest,res) => {const countId=parsedId(req.params.id as string);const lineId=parsedId(req.params.lineId as string);const counted=z.object({countedQty:z.coerce.number().min(0),notes:z.string().max(500).nullable().optional()}).safeParse(req.body);if(!countId||!lineId||!counted.success)return fail(res,"Validation failed");try{const r=await pool.query(`update wms_cycle_count_lines set counted_qty=$1,variance_qty=$1-expected_qty,notes=coalesce($2,notes) where id=$3 and count_id=$4 and exists(select 1 from wms_cycle_counts c where c.id=count_id and c.org_id=$5 and c.status not in ('completed','cancelled')) returning *`,[counted.data.countedQty,counted.data.notes??null,lineId,countId,org(req)]);if(!r.rows[0])return fail(res,"Count line not found or locked",409);res.json({success:true,data:r.rows[0]});}catch{fail(res,"Failed to update count line",500);}});

router.put("/cycle-counts/:id/complete", requirePermission(MODULE, "edit"), async (req: AuthRequest,res) => {const countId=parsedId(req.params.id as string);if(!countId)return fail(res,"Invalid count id");const client=await pool.connect();try{const o=org(req);await client.query("begin");const h=await client.query(`select * from wms_cycle_counts where id=$1 and org_id=$2 for update`,[countId,o]);if(!h.rows[0])throw new Error("Cycle count not found");if(h.rows[0].status==="completed")throw new Error("Cycle count is already completed");const lines=await client.query(`select * from wms_cycle_count_lines where count_id=$1 for update`,[countId]);for(const line of lines.rows){if(line.counted_qty===null)throw new Error("All count lines must be counted before completion");const variance=Number(line.variance_qty??Number(line.counted_qty)-Number(line.expected_qty));if(Math.abs(variance)>0)await movement(client,o,line.product_id,h.rows[0].warehouse_id,variance,"adjustment",h.rows[0].count_number,req.user!.userId);}await client.query(`update wms_cycle_counts set status='completed',completed_at=now(),updated_at=now() where id=$1`,[countId]);await client.query("commit");res.json({success:true,data:{id:countId,status:"completed"}});}catch(e:any){await client.query("rollback").catch(()=>{});fail(res,e.message==="Cycle count not found"?e.message:e.message==="Cycle count is already completed"||e.message==="All count lines must be counted before completion"?e.message:"Failed to complete cycle count",e.message==="Cycle count not found"?404:409);}finally{client.release();}});

router.post("/bin-transfers", requirePermission(MODULE, "create"), async (req: AuthRequest,res) => {const parsed=z.object({fromBinId:id,toBinId:id,productId:id,lotNumber:z.string().min(1).max(100),qty}).safeParse(req.body);if(!parsed.success)return fail(res,"Validation failed");const d=parsed.data;const client=await pool.connect();try{const o=org(req);await client.query("begin");const bins=await client.query(`select id,warehouse_id from wms_bins where id=any($1::int[]) and org_id=$2`,[[d.fromBinId,d.toBinId],o]);if(bins.rows.length!==2||bins.rows[0].warehouse_id!==bins.rows[1].warehouse_id)throw new Error("Bins must be in the same warehouse");const from=await client.query(`select * from wms_lots where org_id=$1 and product_id=$2 and warehouse_id=$3 and bin_id=$4 and lot_number=$5 for update`,[o,d.productId,bins.rows[0].warehouse_id,d.fromBinId,d.lotNumber]);if(!from.rows[0]||Number(from.rows[0].qty_on_hand)<d.qty)throw new Error("Insufficient lot stock in source bin");await client.query(`update wms_lots set qty_on_hand=qty_on_hand-$1,status=case when qty_on_hand-$1<=0 then 'depleted' else status end,updated_at=now() where id=$2`,[d.qty,from.rows[0].id]);const to=await client.query(`select id from wms_lots where org_id=$1 and product_id=$2 and warehouse_id=$3 and bin_id=$4 and lot_number=$5`,[o,d.productId,bins.rows[0].warehouse_id,d.toBinId,d.lotNumber]);if(to.rows[0])await client.query(`update wms_lots set qty_on_hand=qty_on_hand+$1,status='available',updated_at=now() where id=$2`,[d.qty,to.rows[0].id]);else await client.query(`insert into wms_lots(org_id,product_id,warehouse_id,bin_id,lot_number,expiry_date,qty_on_hand,status) values($1,$2,$3,$4,$5,$6,$7,'available')`,[o,d.productId,bins.rows[0].warehouse_id,d.toBinId,d.lotNumber,from.rows[0].expiry_date,d.qty]);const serials=await client.query(`update wms_serials set bin_id=$1 where org_id=$2 and product_id=$3 and warehouse_id=$4 and bin_id=$5 and lot_id=$6 and status='available' returning id`,[d.toBinId,o,d.productId,bins.rows[0].warehouse_id,d.fromBinId,from.rows[0].id]);await client.query("commit");res.status(201).json({success:true,data:{qty:d.qty,serialsMoved:serials.rowCount}});}catch(e:any){await client.query("rollback").catch(()=>{});fail(res,e.message||"Failed to transfer stock",e.message?.startsWith("Bins")||e.message?.startsWith("Insufficient")?422:500);}finally{client.release();}});

export default router;