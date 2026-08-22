import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Maintenance Management";

const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().min(0);

const assetSchema = z.object({
  assetNumber: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(300),
  assetType: z.enum(["machinery", "equipment", "vehicle", "tool", "facility", "other"]).default("machinery"),
  manufacturer: z.string().max(200).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  purchaseDate: date.nullable().optional(),
  expectedLifeMonths: z.coerce.number().int().min(1).max(999).default(120),
  status: z.enum(["operational", "under_maintenance", "breakdown", "retired", "out_of_service"]).default("operational"),
  notes: z.string().max(1000).nullable().optional(),
});

const scheduleSchema = z.object({
  assetId: id,
  scheduleNumber: z.string().min(1).max(50).optional(),
  scheduleType: z.enum(["preventive", "inspection", "calibration", "lubrication", "cleaning"]).default("preventive"),
  title: z.string().min(1).max(300),
  frequencyType: z.enum(["daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly", "custom"]).default("monthly"),
  frequencyValue: z.coerce.number().int().min(1).max(999).default(1),
  lastRunDate: date.nullable().optional(),
  nextDueDate: date.nullable().optional(),
  assignedTo: z.string().max(200).nullable().optional(),
  estimatedHours: money.default(0),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
  notes: z.string().max(1000).nullable().optional(),
});

const breakdownSchema = z.object({
  assetId: id,
  breakdownNumber: z.string().min(1).max(50).optional(),
  breakdownType: z.enum(["mechanical", "electrical", "hydraulic", "pneumatic", "software", "operator_error", "wear_tear", "other"]).default("mechanical"),
  reportedDate: date,
  reportedTime: z.string().max(20).nullable().optional(),
  downtimeHours: money.default(0),
  rootCause: z.string().max(2000).nullable().optional(),
  actionTaken: z.string().max(2000).nullable().optional(),
  status: z.enum(["open", "diagnosing", "in_progress", "resolved", "closed"]).default("open"),
  resolvedDate: date.nullable().optional(),
  resolvedBy: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const workOrderPartSchema = z.object({
  partId: id,
  quantity: money.default(1),
  unitCost: money.default(0),
});

const workOrderSchema = z.object({
  assetId: id,
  workOrderNumber: z.string().min(1).max(50).optional(),
  workType: z.enum(["preventive", "breakdown", "corrective", "amc", "inspection", "other"]).default("corrective"),
  scheduleId: id.nullable().optional(),
  breakdownId: id.nullable().optional(),
  amcId: id.nullable().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["draft", "open", "in_progress", "on_hold", "completed", "cancelled"]).default("draft"),
  plannedStart: date.nullable().optional(),
  plannedEnd: date.nullable().optional(),
  actualStart: date.nullable().optional(),
  actualEnd: date.nullable().optional(),
  assignedTo: z.string().max(200).nullable().optional(),
  laborCost: money.default(0),
  partsCost: money.default(0),
  totalCost: money.default(0),
  notes: z.string().max(1000).nullable().optional(),
  parts: z.array(workOrderPartSchema).optional(),
});

const amcSchema = z.object({
  contractNumber: z.string().min(1).max(50).optional(),
  vendorName: z.string().min(1).max(300),
  title: z.string().min(1).max(300),
  startDate: date,
  endDate: date,
  contractValue: money.default(0),
  coverage: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "expiring", "expired", "terminated"]).default("active"),
  notes: z.string().max(1000).nullable().optional(),
});

const partSchema = z.object({
  partCode: z.string().min(1).max(50),
  name: z.string().min(1).max(300),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  quantityOnHand: money.default(0),
  reorderPoint: money.default(0),
  unitCost: money.default(0),
  location: z.string().max(200).nullable().optional(),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  notes: z.string().max(1000).nullable().optional(),
});

const historySchema = z.object({
  assetId: id,
  workOrderId: id.nullable().optional(),
  partId: id.nullable().optional(),
  historyType: z.enum(["preventive", "breakdown", "corrective", "repair", "inspection", "other"]).default("corrective"),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  datePerformed: date,
  technician: z.string().max(200).nullable().optional(),
  cost: money.default(0),
  hoursSpent: money.default(0),
  notes: z.string().max(1000).nullable().optional(),
});

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, prefix: string, orgId: number, client: any = pool) {
  const allowed = new Set(["maintenance_assets", "maintenance_schedules", "maintenance_breakdowns", "maintenance_work_orders", "maintenance_amc"]);
  if (!allowed.has(table)) throw new Error("invalid number table");
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}

// ── Summary ────────────────────────────────────────────────────────────────────
router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const [assets, operational, underMaint, breakdowns, openBreakdowns, schedules, dueSchedules, workOrders, openWOs, amcs, activeAmcs, parts, lowStock, history] = await Promise.all([
      pool.query(`select count(*)::int as count from maintenance_assets where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from maintenance_assets where org_id=$1 and status='operational'`, [o]),
      pool.query(`select count(*)::int as count from maintenance_assets where org_id=$1 and status='under_maintenance'`, [o]),
      pool.query(`select count(*)::int as count from maintenance_breakdowns where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from maintenance_breakdowns where org_id=$1 and status in ('open','diagnosing','in_progress')`, [o]),
      pool.query(`select count(*)::int as count from maintenance_schedules where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from maintenance_schedules where org_id=$1 and status='active' and next_due_date is not null and next_due_date <= to_char(now(),'YYYY-MM-DD')`, [o]),
      pool.query(`select count(*)::int as count from maintenance_work_orders where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from maintenance_work_orders where org_id=$1 and status in ('draft','open','in_progress','on_hold')`, [o]),
      pool.query(`select count(*)::int as count from maintenance_amc where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from maintenance_amc where org_id=$1 and status='active'`, [o]),
      pool.query(`select count(*)::int as count from maintenance_spare_parts where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from maintenance_spare_parts where org_id=$1 and quantity_on_hand <= reorder_point`, [o]),
      pool.query(`select count(*)::int as count from maintenance_history where org_id=$1`, [o]),
    ]);
    res.json({ success: true, data: {
      totalAssets: assets.rows[0].count,
      operationalAssets: operational.rows[0].count,
      underMaintenance: underMaint.rows[0].count,
      totalBreakdowns: breakdowns.rows[0].count,
      openBreakdowns: openBreakdowns.rows[0].count,
      totalSchedules: schedules.rows[0].count,
      dueSchedules: dueSchedules.rows[0].count,
      totalWorkOrders: workOrders.rows[0].count,
      openWorkOrders: openWOs.rows[0].count,
      totalAmcs: amcs.rows[0].count,
      activeAmcs: activeAmcs.rows[0].count,
      totalParts: parts.rows[0].count,
      lowStockParts: lowStock.rows[0].count,
      totalHistory: history.rows[0].count,
    }});
  } catch { fail(res, "Failed to load maintenance summary", 500); }
});

// ── Assets ─────────────────────────────────────────────────────────────────────
router.get("/assets", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select a.*,
        (select count(*)::int from maintenance_schedules s where s.asset_id=a.id) as schedule_count,
        (select count(*)::int from maintenance_work_orders w where w.asset_id=a.id) as work_order_count,
        (select count(*)::int from maintenance_breakdowns b where b.asset_id=a.id) as breakdown_count
       from maintenance_assets a where a.org_id=$1 order by a.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load assets", 500); }
});

router.post("/assets", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = assetSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = d.assetNumber ?? await nextNumber("maintenance_assets", "AST", o, client);
    const r = await client.query(
      `insert into maintenance_assets(org_id,asset_number,name,asset_type,manufacturer,model,serial_number,location,purchase_date,expected_life_months,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [o, number, d.name, d.assetType, d.manufacturer ?? null, d.model ?? null, d.serialNumber ?? null, d.location ?? null, d.purchaseDate ?? null, d.expectedLifeMonths, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.code === "23505" ? "Asset number already exists" : "Failed to create asset", e.code === "23505" ? 409 : 500); }
  finally { client.release(); }
});

router.put("/assets/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const assetId = parsedId(req.params.id as string); if (!assetId) return fail(res, "Invalid id");
  const parsed = assetSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update maintenance_assets set name=coalesce($1,name),asset_type=coalesce($2,asset_type),manufacturer=coalesce($3,manufacturer),model=coalesce($4,model),serial_number=coalesce($5,serial_number),location=coalesce($6,location),purchase_date=coalesce($7,purchase_date),expected_life_months=coalesce($8,expected_life_months),status=coalesce($9,status),notes=coalesce($10,notes),updated_at=now() where id=$11 and org_id=$12 returning *`,
      [d.name ?? null, d.assetType ?? null, d.manufacturer ?? null, d.model ?? null, d.serialNumber ?? null, d.location ?? null, d.purchaseDate ?? null, d.expectedLifeMonths ?? null, d.status ?? null, d.notes ?? null, assetId, org(req)]);
    if (!r.rows[0]) return fail(res, "Asset not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update asset", 500); }
});

router.delete("/assets/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const assetId = parsedId(req.params.id as string); if (!assetId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from maintenance_assets where id=$1 and org_id=$2 returning id`, [assetId, org(req)]);
    if (!r.rows[0]) return fail(res, "Asset not found", 404);
    res.json({ success: true, data: { id: assetId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Asset is in use; cannot delete" : "Failed to delete asset", 409); }
});

// ── Schedules (Preventive Maintenance) ─────────────────────────────────────────
router.get("/schedules", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select s.*, a.name as asset_name, a.asset_number
       from maintenance_schedules s join maintenance_assets a on a.id=s.asset_id
       where s.org_id=$1 order by s.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load schedules", 500); }
});

router.post("/schedules", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const a = await client.query(`select id from maintenance_assets where id=$1 and org_id=$2`, [d.assetId, o]);
    if (!a.rows[0]) throw new Error("Asset not found");
    const number = d.scheduleNumber ?? await nextNumber("maintenance_schedules", "PM", o, client);
    const r = await client.query(
      `insert into maintenance_schedules(org_id,asset_id,schedule_number,schedule_type,title,frequency_type,frequency_value,last_run_date,next_due_date,assigned_to,estimated_hours,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
      [o, d.assetId, number, d.scheduleType, d.title, d.frequencyType, d.frequencyValue, d.lastRunDate ?? null, d.nextDueDate ?? null, d.assignedTo ?? null, d.estimatedHours, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Asset not found" ? e.message : "Failed to create schedule", e.message === "Asset not found" ? 422 : 500); }
  finally { client.release(); }
});

router.put("/schedules/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const scheduleId = parsedId(req.params.id as string); if (!scheduleId) return fail(res, "Invalid id");
  const parsed = scheduleSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update maintenance_schedules set asset_id=coalesce($1,asset_id),schedule_type=coalesce($2,schedule_type),title=coalesce($3,title),frequency_type=coalesce($4,frequency_type),frequency_value=coalesce($5,frequency_value),last_run_date=coalesce($6,last_run_date),next_due_date=coalesce($7,next_due_date),assigned_to=coalesce($8,assigned_to),estimated_hours=coalesce($9,estimated_hours),status=coalesce($10,status),notes=coalesce($11,notes),updated_at=now() where id=$12 and org_id=$13 returning *`,
      [d.assetId ?? null, d.scheduleType ?? null, d.title ?? null, d.frequencyType ?? null, d.frequencyValue ?? null, d.lastRunDate ?? null, d.nextDueDate ?? null, d.assignedTo ?? null, d.estimatedHours ?? null, d.status ?? null, d.notes ?? null, scheduleId, org(req)]);
    if (!r.rows[0]) return fail(res, "Schedule not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update schedule", 500); }
});

router.delete("/schedules/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const scheduleId = parsedId(req.params.id as string); if (!scheduleId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from maintenance_schedules where id=$1 and org_id=$2 returning id`, [scheduleId, org(req)]);
    if (!r.rows[0]) return fail(res, "Schedule not found", 404);
    res.json({ success: true, data: { id: scheduleId } });
  } catch { fail(res, "Failed to delete schedule", 500); }
});

// ── Breakdowns ─────────────────────────────────────────────────────────────────
router.get("/breakdowns", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select b.*, a.name as asset_name, a.asset_number
       from maintenance_breakdowns b join maintenance_assets a on a.id=b.asset_id
       where b.org_id=$1 order by b.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load breakdowns", 500); }
});

router.post("/breakdowns", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = breakdownSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const a = await client.query(`select id from maintenance_assets where id=$1 and org_id=$2`, [d.assetId, o]);
    if (!a.rows[0]) throw new Error("Asset not found");
    const number = d.breakdownNumber ?? await nextNumber("maintenance_breakdowns", "BD", o, client);
    const r = await client.query(
      `insert into maintenance_breakdowns(org_id,asset_id,breakdown_number,breakdown_type,reported_date,reported_time,downtime_hours,root_cause,action_taken,status,resolved_date,resolved_by,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
      [o, d.assetId, number, d.breakdownType, d.reportedDate, d.reportedTime ?? null, d.downtimeHours, d.rootCause ?? null, d.actionTaken ?? null, d.status, d.resolvedDate ?? null, d.resolvedBy ?? null, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Asset not found" ? e.message : "Failed to create breakdown", e.message === "Asset not found" ? 422 : 500); }
  finally { client.release(); }
});

router.put("/breakdowns/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const breakdownId = parsedId(req.params.id as string); if (!breakdownId) return fail(res, "Invalid id");
  const parsed = breakdownSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update maintenance_breakdowns set asset_id=coalesce($1,asset_id),breakdown_type=coalesce($2,breakdown_type),reported_date=coalesce($3,reported_date),reported_time=coalesce($4,reported_time),downtime_hours=coalesce($5,downtime_hours),root_cause=coalesce($6,root_cause),action_taken=coalesce($7,action_taken),status=coalesce($8,status),resolved_date=coalesce($9,resolved_date),resolved_by=coalesce($10,resolved_by),notes=coalesce($11,notes),updated_at=now() where id=$12 and org_id=$13 returning *`,
      [d.assetId ?? null, d.breakdownType ?? null, d.reportedDate ?? null, d.reportedTime ?? null, d.downtimeHours ?? null, d.rootCause ?? null, d.actionTaken ?? null, d.status ?? null, d.resolvedDate ?? null, d.resolvedBy ?? null, d.notes ?? null, breakdownId, org(req)]);
    if (!r.rows[0]) return fail(res, "Breakdown not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update breakdown", 500); }
});

router.post("/breakdowns/:id/resolve", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const breakdownId = parsedId(req.params.id as string); if (!breakdownId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update maintenance_breakdowns set status='resolved',resolved_date=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 and org_id=$2 returning *`,
      [breakdownId, org(req)]);
    if (!r.rows[0]) return fail(res, "Breakdown not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to resolve breakdown", 500); }
});

router.delete("/breakdowns/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const breakdownId = parsedId(req.params.id as string); if (!breakdownId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from maintenance_breakdowns where id=$1 and org_id=$2 returning id`, [breakdownId, org(req)]);
    if (!r.rows[0]) return fail(res, "Breakdown not found", 404);
    res.json({ success: true, data: { id: breakdownId } });
  } catch { fail(res, "Failed to delete breakdown", 500); }
});

// ── Work Orders ────────────────────────────────────────────────────────────────
router.get("/work-orders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select w.*, a.name as asset_name, a.asset_number,
        count(wp.id)::int as part_count
       from maintenance_work_orders w
       join maintenance_assets a on a.id=w.asset_id
       left join maintenance_work_order_parts wp on wp.work_order_id=w.id
       where w.org_id=$1
       group by w.id, a.name, a.asset_number
       order by w.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load work orders", 500); }
});

router.post("/work-orders", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = workOrderSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const a = await client.query(`select id from maintenance_assets where id=$1 and org_id=$2`, [d.assetId, o]);
    if (!a.rows[0]) throw new Error("Asset not found");
    const number = d.workOrderNumber ?? await nextNumber("maintenance_work_orders", "WO", o, client);
    const partsCost = (d.parts ?? []).reduce((sum, p) => sum + (p.quantity * p.unitCost), 0);
    const totalCost = d.laborCost + partsCost;
    const head = await client.query(
      `insert into maintenance_work_orders(org_id,work_order_number,asset_id,work_type,schedule_id,breakdown_id,amc_id,title,description,priority,status,planned_start,planned_end,actual_start,actual_end,assigned_to,labor_cost,parts_cost,total_cost,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) returning *`,
      [o, number, d.assetId, d.workType, d.scheduleId ?? null, d.breakdownId ?? null, d.amcId ?? null, d.title, d.description ?? null, d.priority, d.status, d.plannedStart ?? null, d.plannedEnd ?? null, d.actualStart ?? null, d.actualEnd ?? null, d.assignedTo ?? null, d.laborCost, partsCost, totalCost, d.notes ?? null, req.user!.userId]);
    for (const p of d.parts ?? []) {
      await client.query(
        `insert into maintenance_work_order_parts(org_id,work_order_id,part_id,quantity,unit_cost,line_total) values($1,$2,$3,$4,$5,$6)`,
        [o, head.rows[0].id, p.partId, p.quantity, p.unitCost, p.quantity * p.unitCost]);
      await client.query(
        `update maintenance_spare_parts set quantity_on_hand=quantity_on_hand-$1,updated_at=now() where id=$2 and org_id=$3`,
        [p.quantity, p.partId, o]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Asset not found" ? e.message : "Failed to create work order", e.message === "Asset not found" ? 422 : 500); }
  finally { client.release(); }
});

router.put("/work-orders/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const woId = parsedId(req.params.id as string); if (!woId) return fail(res, "Invalid id");
  const parsed = workOrderSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from maintenance_work_orders where id=$1 and org_id=$2 for update`, [woId, o]);
    if (!existing.rows[0]) throw new Error("Work order not found");
    const partsCost = d.parts ? (d.parts ?? []).reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : Number(existing.rows[0].parts_cost || 0);
    const laborCost = d.laborCost ?? Number(existing.rows[0].labor_cost || 0);
    const totalCost = laborCost + partsCost;
    const head = await client.query(
      `update maintenance_work_orders set asset_id=coalesce($1,asset_id),work_type=coalesce($2,work_type),schedule_id=coalesce($3,schedule_id),breakdown_id=coalesce($4,breakdown_id),amc_id=coalesce($5,amc_id),title=coalesce($6,title),description=coalesce($7,description),priority=coalesce($8,priority),status=coalesce($9,status),planned_start=coalesce($10,planned_start),planned_end=coalesce($11,planned_end),actual_start=coalesce($12,actual_start),actual_end=coalesce($13,actual_end),assigned_to=coalesce($14,assigned_to),labor_cost=coalesce($15,labor_cost),parts_cost=$16,total_cost=$17,notes=coalesce($18,notes),updated_at=now() where id=$19 and org_id=$20 returning *`,
      [d.assetId ?? null, d.workType ?? null, d.scheduleId ?? null, d.breakdownId ?? null, d.amcId ?? null, d.title ?? null, d.description ?? null, d.priority ?? null, d.status ?? null, d.plannedStart ?? null, d.plannedEnd ?? null, d.actualStart ?? null, d.actualEnd ?? null, d.assignedTo ?? null, d.laborCost ?? null, partsCost, totalCost, d.notes ?? null, woId, o]);
    if (d.parts) {
      await client.query(`delete from maintenance_work_order_parts where work_order_id=$1`, [woId]);
      for (const p of d.parts) {
        await client.query(
          `insert into maintenance_work_order_parts(org_id,work_order_id,part_id,quantity,unit_cost,line_total) values($1,$2,$3,$4,$5,$6)`,
          [o, woId, p.partId, p.quantity, p.unitCost, p.quantity * p.unitCost]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Work order not found" ? e.message : "Failed to update work order", e.message === "Work order not found" ? 404 : 500); }
  finally { client.release(); }
});

router.post("/work-orders/:id/complete", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const woId = parsedId(req.params.id as string); if (!woId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const h = await client.query(`select * from maintenance_work_orders where id=$1 and org_id=$2 for update`, [woId, o]);
    if (!h.rows[0]) throw new Error("Work order not found");
    if (h.rows[0].status === "completed") throw new Error("Work order is already completed");
    const r = await client.query(
      `update maintenance_work_orders set status='completed',actual_end=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 returning *`,
      [woId]);
    await client.query(
      `insert into maintenance_history(org_id,asset_id,work_order_id,history_type,title,description,date_performed,technician,cost,hours_spent,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [o, h.rows[0].asset_id, woId, h.rows[0].work_type, h.rows[0].title, h.rows[0].description, new Date().toISOString().slice(0, 10), h.rows[0].assigned_to, h.rows[0].total_cost, 0, req.user!.userId]);
    await client.query("commit");
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Work order not found" || e.message === "Work order is already completed" ? e.message : "Failed to complete work order", e.message === "Work order not found" ? 404 : 409); }
  finally { client.release(); }
});

router.delete("/work-orders/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const woId = parsedId(req.params.id as string); if (!woId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from maintenance_work_orders where id=$1 and org_id=$2 returning id`, [woId, org(req)]);
    if (!r.rows[0]) return fail(res, "Work order not found", 404);
    res.json({ success: true, data: { id: woId } });
  } catch { fail(res, "Failed to delete work order", 500); }
});

// ── AMC (Annual Maintenance Contracts) ─────────────────────────────────────────
router.get("/amcs", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from maintenance_amc where org_id=$1 order by created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load AMCs", 500); }
});

router.post("/amcs", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = amcSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = d.contractNumber ?? await nextNumber("maintenance_amc", "AMC", o, client);
    const r = await client.query(
      `insert into maintenance_amc(org_id,contract_number,vendor_name,title,start_date,end_date,contract_value,coverage,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [o, number, d.vendorName, d.title, d.startDate, d.endDate, d.contractValue, d.coverage ?? null, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.code === "23505" ? "Contract number already exists" : "Failed to create AMC", e.code === "23505" ? 409 : 500); }
  finally { client.release(); }
});

router.put("/amcs/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const amcId = parsedId(req.params.id as string); if (!amcId) return fail(res, "Invalid id");
  const parsed = amcSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update maintenance_amc set vendor_name=coalesce($1,vendor_name),title=coalesce($2,title),start_date=coalesce($3,start_date),end_date=coalesce($4,end_date),contract_value=coalesce($5,contract_value),coverage=coalesce($6,coverage),status=coalesce($7,status),notes=coalesce($8,notes),updated_at=now() where id=$9 and org_id=$10 returning *`,
      [d.vendorName ?? null, d.title ?? null, d.startDate ?? null, d.endDate ?? null, d.contractValue ?? null, d.coverage ?? null, d.status ?? null, d.notes ?? null, amcId, org(req)]);
    if (!r.rows[0]) return fail(res, "AMC not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update AMC", 500); }
});

router.delete("/amcs/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const amcId = parsedId(req.params.id as string); if (!amcId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from maintenance_amc where id=$1 and org_id=$2 returning id`, [amcId, org(req)]);
    if (!r.rows[0]) return fail(res, "AMC not found", 404);
    res.json({ success: true, data: { id: amcId } });
  } catch { fail(res, "Failed to delete AMC", 500); }
});

// ── Spare Parts ────────────────────────────────────────────────────────────────
router.get("/parts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from maintenance_spare_parts where org_id=$1 order by created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load spare parts", 500); }
});

router.post("/parts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = partSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const r = await pool.query(
      `insert into maintenance_spare_parts(org_id,part_code,name,description,category,quantity_on_hand,reorder_point,unit_cost,location,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [org(req), d.partCode, d.name, d.description ?? null, d.category ?? null, d.quantityOnHand, d.reorderPoint, d.unitCost, d.location ?? null, d.status, d.notes ?? null, req.user!.userId]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Part code already exists" : "Failed to create part", e.code === "23505" ? 409 : 500); }
});

router.put("/parts/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const partId = parsedId(req.params.id as string); if (!partId) return fail(res, "Invalid id");
  const parsed = partSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update maintenance_spare_parts set part_code=coalesce($1,part_code),name=coalesce($2,name),description=coalesce($3,description),category=coalesce($4,category),quantity_on_hand=coalesce($5,quantity_on_hand),reorder_point=coalesce($6,reorder_point),unit_cost=coalesce($7,unit_cost),location=coalesce($8,location),status=coalesce($9,status),notes=coalesce($10,notes),updated_at=now() where id=$11 and org_id=$12 returning *`,
      [d.partCode ?? null, d.name ?? null, d.description ?? null, d.category ?? null, d.quantityOnHand ?? null, d.reorderPoint ?? null, d.unitCost ?? null, d.location ?? null, d.status ?? null, d.notes ?? null, partId, org(req)]);
    if (!r.rows[0]) return fail(res, "Part not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update part", 500); }
});

router.delete("/parts/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const partId = parsedId(req.params.id as string); if (!partId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from maintenance_spare_parts where id=$1 and org_id=$2 returning id`, [partId, org(req)]);
    if (!r.rows[0]) return fail(res, "Part not found", 404);
    res.json({ success: true, data: { id: partId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Part is in use; cannot delete" : "Failed to delete part", 409); }
});

// ── History ────────────────────────────────────────────────────────────────────
router.get("/history", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select h.*, a.name as asset_name, a.asset_number
       from maintenance_history h
       join maintenance_assets a on a.id=h.asset_id
       where h.org_id=$1 order by h.created_at desc limit 200`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load history", 500); }
});

export default router;