import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Expense Management";

const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().min(0);

const categorySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(300),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
});

const policySchema = z.object({
  policyNumber: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(300),
  policyType: z.enum(["per_diem", "max_amount", "category_limit", "approval_threshold"]).default("max_amount"),
  category: z.string().max(100).nullable().optional(),
  maxAmount: money.default(0),
  perDiemRate: money.default(0),
  approvalThreshold: money.default(0),
  requiresReceipt: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const itemSchema = z.object({
  categoryId: id.nullable().optional(),
  categoryName: z.string().min(1).max(100),
  expenseDate: date,
  description: z.string().min(1).max(500),
  amount: money,
  currency: z.string().max(10).default("USD"),
  paymentMethod: z.string().max(50).nullable().optional(),
  vendor: z.string().max(200).nullable().optional(),
  receiptNumber: z.string().max(100).nullable().optional(),
  receiptUrl: z.string().max(500).nullable().optional(),
  hasReceipt: z.boolean().default(false),
  notes: z.string().max(1000).nullable().optional(),
});

const claimSchema = z.object({
  employeeId: id,
  employeeName: z.string().min(1).max(300),
  department: z.string().max(200).nullable().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  claimDate: date,
  status: z.enum(["draft", "submitted", "in_review", "approved", "rejected", "reimbursed"]).default("draft"),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(itemSchema).optional(),
});

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, prefix: string, orgId: number, client: any = pool) {
  const allowed = new Set(["expense_claims", "expense_policies"]);
  if (!allowed.has(table)) throw new Error("invalid number table");
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}

// ── Summary ────────────────────────────────────────────────────────────────────
router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const [claims, draftClaims, submittedClaims, approvedClaims, reimbursedClaims, totalAmount, pendingAmount, items, categories, policies, activePolicies, receipts] = await Promise.all([
      pool.query(`select count(*)::int as count from expense_claims where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from expense_claims where org_id=$1 and status='draft'`, [o]),
      pool.query(`select count(*)::int as count from expense_claims where org_id=$1 and status in ('submitted','in_review')`, [o]),
      pool.query(`select count(*)::int as count from expense_claims where org_id=$1 and status='approved'`, [o]),
      pool.query(`select count(*)::int as count from expense_claims where org_id=$1 and status='reimbursed'`, [o]),
      pool.query(`select coalesce(sum(total_amount),0)::numeric as total from expense_claims where org_id=$1`, [o]),
      pool.query(`select coalesce(sum(total_amount),0)::numeric as total from expense_claims where org_id=$1 and status in ('submitted','in_review','approved')`, [o]),
      pool.query(`select count(*)::int as count from expense_items where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from expense_categories where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from expense_policies where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from expense_policies where org_id=$1 and status='active'`, [o]),
      pool.query(`select count(*)::int as count from expense_items where org_id=$1 and has_receipt=true`, [o]),
    ]);
    res.json({ success: true, data: {
      totalClaims: claims.rows[0].count,
      draftClaims: draftClaims.rows[0].count,
      pendingClaims: submittedClaims.rows[0].count,
      approvedClaims: approvedClaims.rows[0].count,
      reimbursedClaims: reimbursedClaims.rows[0].count,
      totalAmount: totalAmount.rows[0].total,
      pendingAmount: pendingAmount.rows[0].total,
      totalItems: items.rows[0].count,
      totalCategories: categories.rows[0].count,
      totalPolicies: policies.rows[0].count,
      activePolicies: activePolicies.rows[0].count,
      totalReceipts: receipts.rows[0].count,
    }});
  } catch { fail(res, "Failed to load expense summary", 500); }
});

// ── Categories ─────────────────────────────────────────────────────────────────
router.get("/categories", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from expense_categories where org_id=$1 order by name`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load categories", 500); }
});

router.post("/categories", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = categorySchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const r = await pool.query(
      `insert into expense_categories(org_id,code,name,description,is_active,created_by) values($1,$2,$3,$4,$5,$6) returning *`,
      [org(req), d.code, d.name, d.description ?? null, d.isActive, req.user!.userId]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Category code already exists" : "Failed to create category", e.code === "23505" ? 409 : 500); }
});

router.put("/categories/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const catId = parsedId(req.params.id as string); if (!catId) return fail(res, "Invalid id");
  const parsed = categorySchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update expense_categories set code=coalesce($1,code),name=coalesce($2,name),description=coalesce($3,description),is_active=coalesce($4,is_active),updated_at=now() where id=$5 and org_id=$6 returning *`,
      [d.code ?? null, d.name ?? null, d.description ?? null, d.isActive ?? null, catId, org(req)]);
    if (!r.rows[0]) return fail(res, "Category not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update category", 500); }
});

router.delete("/categories/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const catId = parsedId(req.params.id as string); if (!catId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from expense_categories where id=$1 and org_id=$2 returning id`, [catId, org(req)]);
    if (!r.rows[0]) return fail(res, "Category not found", 404);
    res.json({ success: true, data: { id: catId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Category is in use; cannot delete" : "Failed to delete category", 409); }
});

// ── Policies ──────────────────────────────────────────────────────────────────
router.get("/policies", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from expense_policies where org_id=$1 order by created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load policies", 500); }
});

router.post("/policies", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = policySchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = d.policyNumber ?? await nextNumber("expense_policies", "POL", o, client);
    const r = await client.query(
      `insert into expense_policies(org_id,policy_number,name,policy_type,category,max_amount,per_diem_rate,approval_threshold,requires_receipt,requires_approval,description,status,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [o, number, d.name, d.policyType, d.category ?? null, d.maxAmount, d.perDiemRate, d.approvalThreshold, d.requiresReceipt, d.requiresApproval, d.description ?? null, d.status, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.code === "23505" ? "Policy number already exists" : "Failed to create policy", e.code === "23505" ? 409 : 500); }
  finally { client.release(); }
});

router.put("/policies/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const polId = parsedId(req.params.id as string); if (!polId) return fail(res, "Invalid id");
  const parsed = policySchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update expense_policies set name=coalesce($1,name),policy_type=coalesce($2,policy_type),category=coalesce($3,category),max_amount=coalesce($4,max_amount),per_diem_rate=coalesce($5,per_diem_rate),approval_threshold=coalesce($6,approval_threshold),requires_receipt=coalesce($7,requires_receipt),requires_approval=coalesce($8,requires_approval),description=coalesce($9,description),status=coalesce($10,status),updated_at=now() where id=$11 and org_id=$12 returning *`,
      [d.name ?? null, d.policyType ?? null, d.category ?? null, d.maxAmount ?? null, d.perDiemRate ?? null, d.approvalThreshold ?? null, d.requiresReceipt ?? null, d.requiresApproval ?? null, d.description ?? null, d.status ?? null, polId, org(req)]);
    if (!r.rows[0]) return fail(res, "Policy not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update policy", 500); }
});

router.delete("/policies/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const polId = parsedId(req.params.id as string); if (!polId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from expense_policies where id=$1 and org_id=$2 returning id`, [polId, org(req)]);
    if (!r.rows[0]) return fail(res, "Policy not found", 404);
    res.json({ success: true, data: { id: polId } });
  } catch { fail(res, "Failed to delete policy", 500); }
});

// ── Claims ────────────────────────────────────────────────────────────────────
router.get("/claims", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select c.*,
        (select count(*)::int from expense_items i where i.claim_id=c.id) as item_count,
        (select count(*)::int from expense_items i where i.claim_id=c.id and i.has_receipt=true) as receipt_count
       from expense_claims c where c.org_id=$1 order by c.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load claims", 500); }
});

router.get("/claims/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  try {
    const c = await pool.query(`select * from expense_claims where id=$1 and org_id=$2`, [claimId, org(req)]);
    if (!c.rows[0]) return fail(res, "Claim not found", 404);
    const items = await pool.query(`select * from expense_items where claim_id=$1 order by id`, [claimId]);
    res.json({ success: true, data: { ...c.rows[0], items: items.rows } });
  } catch { fail(res, "Failed to load claim", 500); }
});

router.post("/claims", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = claimSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const emp = await client.query(`select id from users where id=$1 and org_id=$2`, [d.employeeId, o]);
    if (!emp.rows[0]) throw new Error("Employee not found");
    const number = await nextNumber("expense_claims", "EXP", o, client);
    const total = (d.items ?? []).reduce((sum, i) => sum + i.amount, 0);
    const head = await client.query(
      `insert into expense_claims(org_id,claim_number,employee_id,employee_name,department,title,description,claim_date,total_amount,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [o, number, d.employeeId, d.employeeName, d.department ?? null, d.title, d.description ?? null, d.claimDate, total, d.status, d.notes ?? null, req.user!.userId]);
    for (const item of d.items ?? []) {
      await client.query(
        `insert into expense_items(org_id,claim_id,category_id,category_name,expense_date,description,amount,currency,payment_method,vendor,receipt_number,receipt_url,has_receipt,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [o, head.rows[0].id, item.categoryId ?? null, item.categoryName, item.expenseDate, item.description, item.amount, item.currency, item.paymentMethod ?? null, item.vendor ?? null, item.receiptNumber ?? null, item.receiptUrl ?? null, item.hasReceipt, item.notes ?? null]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Employee not found" ? e.message : "Failed to create claim", e.message === "Employee not found" ? 422 : 500); }
  finally { client.release(); }
});

router.put("/claims/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  const parsed = claimSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from expense_claims where id=$1 and org_id=$2 for update`, [claimId, o]);
    if (!existing.rows[0]) throw new Error("Claim not found");
    const total = d.items ? (d.items ?? []).reduce((sum, i) => sum + i.amount, 0) : Number(existing.rows[0].total_amount || 0);
    const head = await client.query(
      `update expense_claims set employee_id=coalesce($1,employee_id),employee_name=coalesce($2,employee_name),department=coalesce($3,department),title=coalesce($4,title),description=coalesce($5,description),claim_date=coalesce($6,claim_date),total_amount=$7,status=coalesce($8,status),notes=coalesce($9,notes),updated_at=now() where id=$10 and org_id=$11 returning *`,
      [d.employeeId ?? null, d.employeeName ?? null, d.department ?? null, d.title ?? null, d.description ?? null, d.claimDate ?? null, total, d.status ?? null, d.notes ?? null, claimId, o]);
    if (d.items) {
      await client.query(`delete from expense_items where claim_id=$1`, [claimId]);
      for (const item of d.items) {
        await client.query(
          `insert into expense_items(org_id,claim_id,category_id,category_name,expense_date,description,amount,currency,payment_method,vendor,receipt_number,receipt_url,has_receipt,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [o, claimId, item.categoryId ?? null, item.categoryName, item.expenseDate, item.description, item.amount, item.currency, item.paymentMethod ?? null, item.vendor ?? null, item.receiptNumber ?? null, item.receiptUrl ?? null, item.hasReceipt, item.notes ?? null]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Claim not found" ? e.message : "Failed to update claim", e.message === "Claim not found" ? 404 : 500); }
  finally { client.release(); }
});

router.post("/claims/:id/submit", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update expense_claims set status='submitted',submitted_date=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 and org_id=$2 returning *`,
      [claimId, org(req)]);
    if (!r.rows[0]) return fail(res, "Claim not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to submit claim", 500); }
});

router.post("/claims/:id/approve", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  const notes = (req.body?.notes as string) ?? null;
  try {
    const r = await pool.query(
      `update expense_claims set status='approved',approved_date=to_char(now(),'YYYY-MM-DD'),approved_by=$1,approval_notes=$2,updated_at=now() where id=$3 and org_id=$4 returning *`,
      [req.user!.email ?? "Approver", notes, claimId, org(req)]);
    if (!r.rows[0]) return fail(res, "Claim not found", 404);
    await pool.query(`update expense_items set status='approved' where claim_id=$1`, [claimId]);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to approve claim", 500); }
});

router.post("/claims/:id/reject", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  const notes = (req.body?.notes as string) ?? null;
  try {
    const r = await pool.query(
      `update expense_claims set status='rejected',approval_notes=$1,updated_at=now() where id=$2 and org_id=$3 returning *`,
      [notes, claimId, org(req)]);
    if (!r.rows[0]) return fail(res, "Claim not found", 404);
    await pool.query(`update expense_items set status='rejected' where claim_id=$1`, [claimId]);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to reject claim", 500); }
});

router.post("/claims/:id/reimburse", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  const method = (req.body?.method as string) ?? "bank_transfer";
  try {
    const r = await pool.query(
      `update expense_claims set status='reimbursed',reimbursed_date=to_char(now(),'YYYY-MM-DD'),reimbursement_method=$1,updated_at=now() where id=$2 and org_id=$3 returning *`,
      [method, claimId, org(req)]);
    if (!r.rows[0]) return fail(res, "Claim not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to reimburse claim", 500); }
});

router.delete("/claims/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const claimId = parsedId(req.params.id as string); if (!claimId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from expense_claims where id=$1 and org_id=$2 returning id`, [claimId, org(req)]);
    if (!r.rows[0]) return fail(res, "Claim not found", 404);
    res.json({ success: true, data: { id: claimId } });
  } catch { fail(res, "Failed to delete claim", 500); }
});

export default router;