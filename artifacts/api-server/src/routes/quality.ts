import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Quality Management";

const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const qty = z.coerce.number().min(0);

const parameterSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  parameterType: z.enum(["numeric", "text", "boolean", "enum"]).default("numeric"),
  unit: z.string().max(20).nullable().optional(),
  minValue: z.coerce.number().nullable().optional(),
  maxValue: z.coerce.number().nullable().optional(),
  allowedValues: z.string().max(500).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

const inspectionSchema = z.object({
  inspectionType: z.enum(["incoming", "in_process", "finished_goods"]).default("incoming"),
  productId: id,
  warehouseId: id.nullable().optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
  lotNumber: z.string().max(100).nullable().optional(),
  batchNumber: z.string().max(100).nullable().optional(),
  quantity: qty.default(0),
  inspectedQty: qty.default(0),
  passedQty: qty.default(0),
  rejectedQty: qty.default(0),
  inspector: z.string().max(200).nullable().optional(),
  inspectionDate: date.nullable().optional(),
  status: z.enum(["draft", "in_progress", "passed", "failed", "on_hold", "cancelled"]).optional(),
  notes: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    parameterId: id,
    measuredValue: z.string().max(200).nullable().optional(),
    expectedValue: z.string().max(200).nullable().optional(),
    result: z.enum(["pending", "pass", "fail"]).default("pending"),
    notes: z.string().max(500).nullable().optional(),
  })).optional(),
});

const rejectionSchema = z.object({
  inspectionId: id.nullable().optional(),
  productId: id,
  warehouseId: id.nullable().optional(),
  lotNumber: z.string().max(100).nullable().optional(),
  batchNumber: z.string().max(100).nullable().optional(),
  quantity: qty.default(0),
  reason: z.string().min(1).max(1000),
  disposition: z.enum(["quarantine", "return", "scrap", "rework"]).default("quarantine"),
  status: z.enum(["open", "quarantined", "returned", "scrapped", "reworked", "closed"]).default("open"),
  notes: z.string().max(1000).nullable().optional(),
});

const capaSchema = z.object({
  capaType: z.enum(["corrective", "preventive"]).default("corrective"),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  sourceType: z.string().max(50).nullable().optional(),
  sourceId: id.nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["open", "investigating", "action_planned", "in_progress", "verification", "closed"]).default("open"),
  rootCause: z.string().max(2000).nullable().optional(),
  actionPlan: z.string().max(2000).nullable().optional(),
  assignedTo: z.string().max(200).nullable().optional(),
  dueDate: date.nullable().optional(),
  closedDate: date.nullable().optional(),
  effectivenessCheck: z.string().max(2000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const certificateSchema = z.object({
  productId: id,
  inspectionId: id.nullable().optional(),
  lotNumber: z.string().max(100).nullable().optional(),
  batchNumber: z.string().max(100).nullable().optional(),
  certificateType: z.enum(["coa", "cof", "coc", "other"]).default("coa"),
  issueDate: date,
  expiryDate: date.nullable().optional(),
  status: z.enum(["draft", "issued", "revoked"]).default("draft"),
  issuedBy: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    parameterId: id,
    measuredValue: z.string().max(200).nullable().optional(),
    expectedValue: z.string().max(200).nullable().optional(),
    result: z.enum(["pass", "fail"]).default("pass"),
    notes: z.string().max(500).nullable().optional(),
  })).optional(),
});

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, column: string, prefix: string, orgId: number, client: any = pool) {
  const allowed = new Set(["qc_inspections", "qc_rejections", "qc_capas", "qc_certificates"]);
  if (!allowed.has(table)) throw new Error("invalid number table");
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}

// ── Summary ────────────────────────────────────────────────────────────────────
router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const [inspections, incoming, inProcess, finished, failed, rejections, capas, certificates] = await Promise.all([
      pool.query(`select count(*)::int as count from qc_inspections where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from qc_inspections where org_id=$1 and inspection_type='incoming' and status in ('draft','in_progress')`, [o]),
      pool.query(`select count(*)::int as count from qc_inspections where org_id=$1 and inspection_type='in_process' and status in ('draft','in_progress')`, [o]),
      pool.query(`select count(*)::int as count from qc_inspections where org_id=$1 and inspection_type='finished_goods' and status in ('draft','in_progress')`, [o]),
      pool.query(`select count(*)::int as count from qc_inspections where org_id=$1 and status='failed'`, [o]),
      pool.query(`select count(*)::int as count, coalesce(sum(quantity),0)::text as units from qc_rejections where org_id=$1 and status in ('open','quarantined')`, [o]),
      pool.query(`select count(*)::int as count from qc_capas where org_id=$1 and status not in ('closed')`, [o]),
      pool.query(`select count(*)::int as count from qc_certificates where org_id=$1 and status='issued'`, [o]),
    ]);
    res.json({ success: true, data: {
      totalInspections: inspections.rows[0].count,
      openIncoming: incoming.rows[0].count,
      openInProcess: inProcess.rows[0].count,
      openFinished: finished.rows[0].count,
      failedInspections: failed.rows[0].count,
      openRejections: rejections.rows[0].count,
      rejectedUnits: rejections.rows[0].units,
      openCapas: capas.rows[0].count,
      issuedCertificates: certificates.rows[0].count,
    }});
  } catch { fail(res, "Failed to load quality summary", 500); }
});

// ── Parameters ────────────────────────────────────────────────────────────────
router.get("/parameters", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from qc_parameters where org_id=$1 order by code`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load parameters", 500); }
});

router.post("/parameters", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = parameterSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data; const o = org(req);
    const r = await pool.query(
      `insert into qc_parameters(org_id,code,name,parameter_type,unit,min_value,max_value,allowed_values,description,is_active) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [o, d.code.trim().toUpperCase(), d.name, d.parameterType, d.unit ?? null, d.minValue ?? null, d.maxValue ?? null, d.allowedValues ?? null, d.description ?? null, d.isActive ?? true]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Parameter code already exists" : "Failed to create parameter", e.code === "23505" ? 409 : 500); }
});

router.put("/parameters/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const paramId = parsedId(req.params.id as string); if (!paramId) return fail(res, "Invalid id");
  const parsed = parameterSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update qc_parameters set code=coalesce($1,code),name=coalesce($2,name),parameter_type=coalesce($3,parameter_type),unit=coalesce($4,unit),min_value=coalesce($5,min_value),max_value=coalesce($6,max_value),allowed_values=coalesce($7,allowed_values),description=coalesce($8,description),is_active=coalesce($9,is_active),updated_at=now() where id=$10 and org_id=$11 returning *`,
      [d.code?.trim().toUpperCase() ?? null, d.name ?? null, d.parameterType ?? null, d.unit ?? null, d.minValue ?? null, d.maxValue ?? null, d.allowedValues ?? null, d.description ?? null, d.isActive ?? null, paramId, org(req)]);
    if (!r.rows[0]) return fail(res, "Parameter not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Parameter code already exists" : "Failed to update parameter", e.code === "23505" ? 409 : 500); }
});

router.delete("/parameters/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const paramId = parsedId(req.params.id as string); if (!paramId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from qc_parameters where id=$1 and org_id=$2 returning id`, [paramId, org(req)]);
    if (!r.rows[0]) return fail(res, "Parameter not found", 404);
    res.json({ success: true, data: { id: paramId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Parameter is in use; cannot delete" : "Failed to delete parameter", 409); }
});

// ── Inspections ───────────────────────────────────────────────────────────────
router.get("/inspections", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const type = String(req.query.type ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const params: any[] = [o]; const filters = ["i.org_id=$1"];
    if (type) { params.push(type); filters.push(`i.inspection_type=$${params.length}`); }
    if (status) { params.push(status); filters.push(`i.status=$${params.length}`); }
    const r = await pool.query(
      `select i.*, p.sku, p.name as product_name, w.code as warehouse_code, w.name as warehouse_name,
        count(l.id)::int as line_count, count(l.id) filter(where l.result='fail')::int as failed_lines
       from qc_inspections i
       join inv_products p on p.id=i.product_id
       left join inv_warehouses w on w.id=i.warehouse_id
       left join qc_inspection_lines l on l.inspection_id=i.id
       where ${filters.join(" and ")}
       group by i.id, p.sku, p.name, w.code, w.name
       order by i.created_at desc`, params);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load inspections", 500); }
});

router.post("/inspections", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = inspectionSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const p = await client.query(`select id from inv_products where id=$1 and org_id=$2`, [d.productId, o]);
    if (!p.rows[0]) throw new Error("Product not found");
    const number = await nextNumber("qc_inspections", "inspection_number", "QC", o, client);
    const head = await client.query(
      `insert into qc_inspections(org_id,inspection_number,inspection_type,product_id,warehouse_id,reference_number,lot_number,batch_number,quantity,inspected_qty,passed_qty,rejected_qty,status,inspector,inspection_date,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14,$15,$16) returning *`,
      [o, number, d.inspectionType, d.productId, d.warehouseId ?? null, d.referenceNumber ?? null, d.lotNumber ?? null, d.batchNumber ?? null, d.quantity, d.inspectedQty, d.passedQty, d.rejectedQty, d.inspector ?? null, d.inspectionDate ?? null, d.notes ?? null, req.user!.userId]);
    for (const line of d.lines ?? []) {
      await client.query(
        `insert into qc_inspection_lines(inspection_id,parameter_id,measured_value,expected_value,result,notes) values($1,$2,$3,$4,$5,$6)`,
        [head.rows[0].id, line.parameterId, line.measuredValue ?? null, line.expectedValue ?? null, line.result, line.notes ?? null]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Product not found" ? e.message : "Failed to create inspection", e.message === "Product not found" ? 422 : 500); }
  finally { client.release(); }
});

router.get("/inspections/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const inspectionId = parsedId(req.params.id as string); if (!inspectionId) return fail(res, "Invalid id");
  try {
    const h = await pool.query(
      `select i.*, p.sku, p.name as product_name, w.code as warehouse_code, w.name as warehouse_name
       from qc_inspections i join inv_products p on p.id=i.product_id left join inv_warehouses w on w.id=i.warehouse_id
       where i.id=$1 and i.org_id=$2`, [inspectionId, org(req)]);
    if (!h.rows[0]) return fail(res, "Inspection not found", 404);
    const lines = await pool.query(
      `select l.*, qp.code as parameter_code, qp.name as parameter_name, qp.parameter_type, qp.unit, qp.min_value, qp.max_value, qp.allowed_values
       from qc_inspection_lines l join qc_parameters qp on qp.id=l.parameter_id
       where l.inspection_id=$1 order by qp.code`, [inspectionId]);
    res.json({ success: true, data: { ...h.rows[0], lines: lines.rows } });
  } catch { fail(res, "Failed to load inspection", 500); }
});

router.put("/inspections/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const inspectionId = parsedId(req.params.id as string); if (!inspectionId) return fail(res, "Invalid id");
  const parsed = inspectionSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from qc_inspections where id=$1 and org_id=$2 for update`, [inspectionId, o]);
    if (!existing.rows[0]) throw new Error("Inspection not found");
    const head = await client.query(
      `update qc_inspections set inspection_type=coalesce($1,inspection_type),product_id=coalesce($2,product_id),warehouse_id=coalesce($3,warehouse_id),reference_number=coalesce($4,reference_number),lot_number=coalesce($5,lot_number),batch_number=coalesce($6,batch_number),quantity=coalesce($7,quantity),inspected_qty=coalesce($8,inspected_qty),passed_qty=coalesce($9,passed_qty),rejected_qty=coalesce($10,rejected_qty),status=coalesce($11,status),inspector=coalesce($12,inspector),inspection_date=coalesce($13,inspection_date),notes=coalesce($14,notes),updated_at=now() where id=$15 and org_id=$16 returning *`,
      [d.inspectionType ?? null, d.productId ?? null, d.warehouseId ?? null, d.referenceNumber ?? null, d.lotNumber ?? null, d.batchNumber ?? null, d.quantity ?? null, d.inspectedQty ?? null, d.passedQty ?? null, d.rejectedQty ?? null, d.status ?? null, d.inspector ?? null, d.inspectionDate ?? null, d.notes ?? null, inspectionId, o]);
    if (d.lines) {
      await client.query(`delete from qc_inspection_lines where inspection_id=$1`, [inspectionId]);
      for (const line of d.lines) {
        await client.query(
          `insert into qc_inspection_lines(inspection_id,parameter_id,measured_value,expected_value,result,notes) values($1,$2,$3,$4,$5,$6)`,
          [inspectionId, line.parameterId, line.measuredValue ?? null, line.expectedValue ?? null, line.result, line.notes ?? null]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Inspection not found" ? e.message : "Failed to update inspection", e.message === "Inspection not found" ? 404 : 500); }
  finally { client.release(); }
});

router.post("/inspections/:id/complete", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const inspectionId = parsedId(req.params.id as string); if (!inspectionId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const h = await client.query(`select * from qc_inspections where id=$1 and org_id=$2 for update`, [inspectionId, o]);
    if (!h.rows[0]) throw new Error("Inspection not found");
    if (h.rows[0].status === "passed" || h.rows[0].status === "failed") throw new Error("Inspection is already completed");
    const lines = await client.query(`select * from qc_inspection_lines where inspection_id=$1`, [inspectionId]);
    const failed = lines.rows.filter((l: any) => l.result === "fail");
    const passed = lines.rows.filter((l: any) => l.result === "pass");
    const status = failed.length > 0 ? "failed" : "passed";
    const rejectedQty = failed.length > 0 ? Number(h.rows[0].rejected_qty || 0) : 0;
    const passedQty = Number(h.rows[0].quantity || 0) - rejectedQty;
    await client.query(
      `update qc_inspections set status=$1,rejected_qty=$2,passed_qty=$3,updated_at=now() where id=$4`,
      [status, rejectedQty, passedQty, inspectionId]);
    await client.query("commit");
    res.json({ success: true, data: { id: inspectionId, status, rejectedQty, passedQty } });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Inspection not found" ? e.message : e.message === "Inspection is already completed" ? e.message : "Failed to complete inspection", e.message === "Inspection not found" ? 404 : 409); }
  finally { client.release(); }
});

router.delete("/inspections/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const inspectionId = parsedId(req.params.id as string); if (!inspectionId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from qc_inspections where id=$1 and org_id=$2 returning id`, [inspectionId, org(req)]);
    if (!r.rows[0]) return fail(res, "Inspection not found", 404);
    res.json({ success: true, data: { id: inspectionId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Inspection is in use; cannot delete" : "Failed to delete inspection", 409); }
});

// ── Rejections ────────────────────────────────────────────────────────────────
router.get("/rejections", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select r.*, p.sku, p.name as product_name, w.code as warehouse_code, i.inspection_number
       from qc_rejections r
       join inv_products p on p.id=r.product_id
       left join inv_warehouses w on w.id=r.warehouse_id
       left join qc_inspections i on i.id=r.inspection_id
       where r.org_id=$1 order by r.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load rejections", 500); }
});

router.post("/rejections", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = rejectionSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const p = await client.query(`select id from inv_products where id=$1 and org_id=$2`, [d.productId, o]);
    if (!p.rows[0]) throw new Error("Product not found");
    const number = await nextNumber("qc_rejections", "rejection_number", "REJ", o, client);
    const r = await client.query(
      `insert into qc_rejections(org_id,rejection_number,inspection_id,product_id,warehouse_id,lot_number,batch_number,quantity,reason,disposition,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [o, number, d.inspectionId ?? null, d.productId, d.warehouseId ?? null, d.lotNumber ?? null, d.batchNumber ?? null, d.quantity, d.reason, d.disposition, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Product not found" ? e.message : "Failed to create rejection", e.message === "Product not found" ? 422 : 500); }
  finally { client.release(); }
});

router.put("/rejections/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const rejectionId = parsedId(req.params.id as string); if (!rejectionId) return fail(res, "Invalid id");
  const parsed = rejectionSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update qc_rejections set inspection_id=coalesce($1,inspection_id),product_id=coalesce($2,product_id),warehouse_id=coalesce($3,warehouse_id),lot_number=coalesce($4,lot_number),batch_number=coalesce($5,batch_number),quantity=coalesce($6,quantity),reason=coalesce($7,reason),disposition=coalesce($8,disposition),status=coalesce($9,status),notes=coalesce($10,notes),updated_at=now() where id=$11 and org_id=$12 returning *`,
      [d.inspectionId ?? null, d.productId ?? null, d.warehouseId ?? null, d.lotNumber ?? null, d.batchNumber ?? null, d.quantity ?? null, d.reason ?? null, d.disposition ?? null, d.status ?? null, d.notes ?? null, rejectionId, org(req)]);
    if (!r.rows[0]) return fail(res, "Rejection not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update rejection", 500); }
});

router.delete("/rejections/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const rejectionId = parsedId(req.params.id as string); if (!rejectionId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from qc_rejections where id=$1 and org_id=$2 returning id`, [rejectionId, org(req)]);
    if (!r.rows[0]) return fail(res, "Rejection not found", 404);
    res.json({ success: true, data: { id: rejectionId } });
  } catch { fail(res, "Failed to delete rejection", 500); }
});

// ── CAPAs ─────────────────────────────────────────────────────────────────────
router.get("/capas", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from qc_capas where org_id=$1 order by created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load CAPAs", 500); }
});

router.post("/capas", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = capaSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = await nextNumber("qc_capas", "capa_number", "CAPA", o, client);
    const r = await client.query(
      `insert into qc_capas(org_id,capa_number,capa_type,title,description,source_type,source_id,priority,status,root_cause,action_plan,assigned_to,due_date,closed_date,effectiveness_check,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning *`,
      [o, number, d.capaType, d.title, d.description ?? null, d.sourceType ?? null, d.sourceId ?? null, d.priority, d.status, d.rootCause ?? null, d.actionPlan ?? null, d.assignedTo ?? null, d.dueDate ?? null, d.closedDate ?? null, d.effectivenessCheck ?? null, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch { await client.query("rollback").catch(() => {}); fail(res, "Failed to create CAPA", 500); }
  finally { client.release(); }
});

router.put("/capas/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const capaId = parsedId(req.params.id as string); if (!capaId) return fail(res, "Invalid id");
  const parsed = capaSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update qc_capas set capa_type=coalesce($1,capa_type),title=coalesce($2,title),description=coalesce($3,description),source_type=coalesce($4,source_type),source_id=coalesce($5,source_id),priority=coalesce($6,priority),status=coalesce($7,status),root_cause=coalesce($8,root_cause),action_plan=coalesce($9,action_plan),assigned_to=coalesce($10,assigned_to),due_date=coalesce($11,due_date),closed_date=coalesce($12,closed_date),effectiveness_check=coalesce($13,effectiveness_check),notes=coalesce($14,notes),updated_at=now() where id=$15 and org_id=$16 returning *`,
      [d.capaType ?? null, d.title ?? null, d.description ?? null, d.sourceType ?? null, d.sourceId ?? null, d.priority ?? null, d.status ?? null, d.rootCause ?? null, d.actionPlan ?? null, d.assignedTo ?? null, d.dueDate ?? null, d.closedDate ?? null, d.effectivenessCheck ?? null, d.notes ?? null, capaId, org(req)]);
    if (!r.rows[0]) return fail(res, "CAPA not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update CAPA", 500); }
});

router.post("/capas/:id/close", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const capaId = parsedId(req.params.id as string); if (!capaId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`update qc_capas set status='closed',closed_date=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 and org_id=$2 returning *`, [capaId, org(req)]);
    if (!r.rows[0]) return fail(res, "CAPA not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to close CAPA", 500); }
});

router.delete("/capas/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const capaId = parsedId(req.params.id as string); if (!capaId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from qc_capas where id=$1 and org_id=$2 returning id`, [capaId, org(req)]);
    if (!r.rows[0]) return fail(res, "CAPA not found", 404);
    res.json({ success: true, data: { id: capaId } });
  } catch { fail(res, "Failed to delete CAPA", 500); }
});

// ── Certificates ──────────────────────────────────────────────────────────────
router.get("/certificates", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select c.*, p.sku, p.name as product_name, i.inspection_number,
        count(cl.id)::int as line_count
       from qc_certificates c
       join inv_products p on p.id=c.product_id
       left join qc_inspections i on i.id=c.inspection_id
       left join qc_certificate_lines cl on cl.certificate_id=c.id
       where c.org_id=$1
       group by c.id, p.sku, p.name, i.inspection_number
       order by c.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load certificates", 500); }
});

router.post("/certificates", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = certificateSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const p = await client.query(`select id from inv_products where id=$1 and org_id=$2`, [d.productId, o]);
    if (!p.rows[0]) throw new Error("Product not found");
    const number = await nextNumber("qc_certificates", "certificate_number", "COA", o, client);
    const head = await client.query(
      `insert into qc_certificates(org_id,certificate_number,product_id,inspection_id,lot_number,batch_number,certificate_type,issue_date,expiry_date,status,issued_by,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [o, number, d.productId, d.inspectionId ?? null, d.lotNumber ?? null, d.batchNumber ?? null, d.certificateType, d.issueDate, d.expiryDate ?? null, d.status, d.issuedBy ?? null, d.notes ?? null, req.user!.userId]);
    for (const line of d.lines ?? []) {
      await client.query(
        `insert into qc_certificate_lines(certificate_id,parameter_id,measured_value,expected_value,result,notes) values($1,$2,$3,$4,$5,$6)`,
        [head.rows[0].id, line.parameterId, line.measuredValue ?? null, line.expectedValue ?? null, line.result, line.notes ?? null]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Product not found" ? e.message : "Failed to create certificate", e.message === "Product not found" ? 422 : 500); }
  finally { client.release(); }
});

router.get("/certificates/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const certId = parsedId(req.params.id as string); if (!certId) return fail(res, "Invalid id");
  try {
    const h = await pool.query(
      `select c.*, p.sku, p.name as product_name, i.inspection_number
       from qc_certificates c join inv_products p on p.id=c.product_id left join qc_inspections i on i.id=c.inspection_id
       where c.id=$1 and c.org_id=$2`, [certId, org(req)]);
    if (!h.rows[0]) return fail(res, "Certificate not found", 404);
    const lines = await pool.query(
      `select cl.*, q.code as parameter_code, q.name as parameter_name, q.unit
       from qc_certificate_lines cl join qc_parameters q on q.id=cl.parameter_id
       where cl.certificate_id=$1 order by q.code`, [certId]);
    res.json({ success: true, data: { ...h.rows[0], lines: lines.rows } });
  } catch { fail(res, "Failed to load certificate", 500); }
});

router.put("/certificates/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const certId = parsedId(req.params.id as string); if (!certId) return fail(res, "Invalid id");
  const parsed = certificateSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from qc_certificates where id=$1 and org_id=$2 for update`, [certId, o]);
    if (!existing.rows[0]) throw new Error("Certificate not found");
    const head = await client.query(
      `update qc_certificates set product_id=coalesce($1,product_id),inspection_id=coalesce($2,inspection_id),lot_number=coalesce($3,lot_number),batch_number=coalesce($4,batch_number),certificate_type=coalesce($5,certificate_type),issue_date=coalesce($6,issue_date),expiry_date=coalesce($7,expiry_date),status=coalesce($8,status),issued_by=coalesce($9,issued_by),notes=coalesce($10,notes),updated_at=now() where id=$11 and org_id=$12 returning *`,
      [d.productId ?? null, d.inspectionId ?? null, d.lotNumber ?? null, d.batchNumber ?? null, d.certificateType ?? null, d.issueDate ?? null, d.expiryDate ?? null, d.status ?? null, d.issuedBy ?? null, d.notes ?? null, certId, o]);
    if (d.lines) {
      await client.query(`delete from qc_certificate_lines where certificate_id=$1`, [certId]);
      for (const line of d.lines) {
        await client.query(
          `insert into qc_certificate_lines(certificate_id,parameter_id,measured_value,expected_value,result,notes) values($1,$2,$3,$4,$5,$6)`,
          [certId, line.parameterId, line.measuredValue ?? null, line.expectedValue ?? null, line.result, line.notes ?? null]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Certificate not found" ? e.message : "Failed to update certificate", e.message === "Certificate not found" ? 404 : 500); }
  finally { client.release(); }
});

router.post("/certificates/:id/issue", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const certId = parsedId(req.params.id as string); if (!certId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`update qc_certificates set status='issued',updated_at=now() where id=$1 and org_id=$2 returning *`, [certId, org(req)]);
    if (!r.rows[0]) return fail(res, "Certificate not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to issue certificate", 500); }
});

router.delete("/certificates/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const certId = parsedId(req.params.id as string); if (!certId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from qc_certificates where id=$1 and org_id=$2 returning id`, [certId, org(req)]);
    if (!r.rows[0]) return fail(res, "Certificate not found", 404);
    res.json({ success: true, data: { id: certId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Certificate is in use; cannot delete" : "Failed to delete certificate", 409); }
});

export default router;