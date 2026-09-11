import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);
const MODULE = "Budget & Cost Accounting";

const id = z.coerce.number().int().positive();
const money = z.coerce.number().min(0);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const period = z.string().regex(/^\d{4}-\d{2}$/);
const amountStr = (min = 0) => z.string().regex(/^\d+(\.\d{1,4})?$/).transform(Number).refine(v => v >= min, `Must be >= ${min}`);

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, column: string, prefix: string, orgId: number, client: any = pool) {
  const allowed = new Set(["budgets", "cost_variances", "forecasts", "allocation_rules", "allocation_runs"]);
  if (!allowed.has(table)) throw new Error("invalid number table");
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}

// ── My Permissions ─────────────────────────────────────────────────────────────
router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const roleId = req.user?.roleId ?? null;
    const perms = await resolveRoleModulePermissions(roleId, MODULE);
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary ────────────────────────────────────────────────────────────────────
router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const [activeBudgets, costCentres, profitCentres, openVariances, productCosts, forecasts, budgetActual] = await Promise.all([
      pool.query(`select count(*)::int as count, coalesce(sum(total_amount),0)::text as amount from budgets where org_id=$1 and status='active'`, [o]),
      pool.query(`select count(*)::int as count from cost_centres where org_id=$1 and is_active=true`, [o]),
      pool.query(`select count(*)::int as count from profit_centres where org_id=$1 and is_active=true`, [o]),
      pool.query(`select count(*)::int as count, coalesce(sum(abs(variance_amount)),0)::text as amount from cost_variances where org_id=$1 and status='open'`, [o]),
      pool.query(`select count(*)::int as count from product_costings where org_id=$1 and is_active=true`, [o]),
      pool.query(`select count(*)::int as count from forecasts where org_id=$1 and status in ('draft','approved')`, [o]),
      pool.query(`select coalesce(sum(amount),0)::text as budget, null::text as actual from budget_lines bl join budgets b on b.id=bl.budget_id where b.org_id=$1`, [o]),
    ]);
    res.json({ success: true, data: {
      activeBudgets: activeBudgets.rows[0].count,
      budgetAmount: activeBudgets.rows[0].amount,
      costCentres: costCentres.rows[0].count,
      profitCentres: profitCentres.rows[0].count,
      openVariances: openVariances.rows[0].count,
      varianceAmount: openVariances.rows[0].amount,
      productCosts: productCosts.rows[0].count,
      activeForecasts: forecasts.rows[0].count,
    }});
  } catch { fail(res, "Failed to load budget & cost summary", 500); }
});

// ── Cost Centres ───────────────────────────────────────────────────────────────
const costCentreSchema = z.object({
  code: z.string().min(1).max(20), name: z.string().min(1).max(200),
  departmentId: id.nullable().optional(), manager: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(), isActive: z.boolean().optional(),
});

router.get("/cost-centres", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select cc.*, d.name as department_name from cost_centres cc left join departments d on d.id=cc.department_id where cc.org_id=$1 order by cc.code`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load cost centres", 500); }
});

router.post("/cost-centres", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = costCentreSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data; const o = org(req);
    const r = await pool.query(
      `insert into cost_centres(org_id,code,name,department_id,manager,description,is_active) values($1,$2,$3,$4,$5,$6,$7) returning *`,
      [o, d.code.trim().toUpperCase(), d.name, d.departmentId ?? null, d.manager ?? null, d.description ?? null, d.isActive ?? true]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Cost centre code already exists" : "Failed to create cost centre", e.code === "23505" ? 409 : 500); }
});

router.put("/cost-centres/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const ccId = parsedId(req.params.id as string); if (!ccId) return fail(res, "Invalid id");
  const parsed = costCentreSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update cost_centres set code=coalesce($1,code),name=coalesce($2,name),department_id=coalesce($3,department_id),manager=coalesce($4,manager),description=coalesce($5,description),is_active=coalesce($6,is_active),updated_at=now() where id=$7 and org_id=$8 returning *`,
      [d.code?.trim().toUpperCase() ?? null, d.name ?? null, d.departmentId ?? null, d.manager ?? null, d.description ?? null, d.isActive ?? null, ccId, org(req)]);
    if (!r.rows[0]) return fail(res, "Cost centre not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Cost centre code already exists" : "Failed to update cost centre", e.code === "23505" ? 409 : 500); }
});

router.delete("/cost-centres/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const ccId = parsedId(req.params.id as string); if (!ccId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from cost_centres where id=$1 and org_id=$2 returning id`, [ccId, org(req)]);
    if (!r.rows[0]) return fail(res, "Cost centre not found", 404);
    res.json({ success: true, data: { id: ccId } });
  } catch (e: any) { fail(res, e.code === "23505" || e.code === "23503" ? "Cost centre is in use; cannot delete" : "Failed to delete cost centre", 409); }
});

// ── Profit Centres ─────────────────────────────────────────────────────────────
const profitCentreSchema = z.object({
  code: z.string().min(1).max(20), name: z.string().min(1).max(200),
  parentId: id.nullable().optional(), manager: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(), isActive: z.boolean().optional(),
});

router.get("/profit-centres", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select pc.*, p.name as parent_name from profit_centres pc left join profit_centres p on p.id=pc.parent_id where pc.org_id=$1 order by pc.code`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load profit centres", 500); }
});

router.post("/profit-centres", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = profitCentreSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data; const o = org(req);
    const r = await pool.query(
      `insert into profit_centres(org_id,code,name,parent_id,manager,description,is_active) values($1,$2,$3,$4,$5,$6,$7) returning *`,
      [o, d.code.trim().toUpperCase(), d.name, d.parentId ?? null, d.manager ?? null, d.description ?? null, d.isActive ?? true]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Profit centre code already exists" : "Failed to create profit centre", e.code === "23505" ? 409 : 500); }
});

router.put("/profit-centres/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const pcId = parsedId(req.params.id as string); if (!pcId) return fail(res, "Invalid id");
  const parsed = profitCentreSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update profit_centres set code=coalesce($1,code),name=coalesce($2,name),parent_id=coalesce($3,parent_id),manager=coalesce($4,manager),description=coalesce($5,description),is_active=coalesce($6,is_active),updated_at=now() where id=$7 and org_id=$8 returning *`,
      [d.code?.trim().toUpperCase() ?? null, d.name ?? null, d.parentId ?? null, d.manager ?? null, d.description ?? null, d.isActive ?? null, pcId, org(req)]);
    if (!r.rows[0]) return fail(res, "Profit centre not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Profit centre code already exists" : "Failed to update profit centre", e.code === "23505" ? 409 : 500); }
});

router.delete("/profit-centres/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const pcId = parsedId(req.params.id as string); if (!pcId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from profit_centres where id=$1 and org_id=$2 returning id`, [pcId, org(req)]);
    if (!r.rows[0]) return fail(res, "Profit centre not found", 404);
    res.json({ success: true, data: { id: pcId } });
  } catch (e: any) { fail(res, e.code === "23505" || e.code === "23503" ? "Profit centre is in use; cannot delete" : "Failed to delete profit centre", 409); }
});

// ── Budgets ────────────────────────────────────────────────────────────────────
const budgetSchemaBase = z.object({
  name: z.string().min(1).max(200), fiscalYear: z.coerce.number().int().min(2000).max(2100),
  periodType: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  budgetType: z.enum(["operating", "capital", "cash_flow", "project"]).default("operating"),
  costCentreId: id.nullable().optional(), profitCentreId: id.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    accountId: id, costCentreId: id.nullable().optional(), profitCentreId: id.nullable().optional(),
    periodIndex: z.coerce.number().int().min(0).max(11), amount: z.coerce.number().min(0),
    description: z.string().max(500).nullable().optional(),
  })).optional(),
  });
const budgetSchema = budgetSchemaBase.superRefine((value, ctx) => {
   const maxPeriodIndex = value.periodType === "yearly" ? 0 : value.periodType === "quarterly" ? 3 : 11;
   value.lines?.forEach((line, index) => {
     if (line.periodIndex > maxPeriodIndex) {
       ctx.addIssue({
         code: z.ZodIssueCode.custom,
         path: ["lines", index, "periodIndex"],
         message: `Period must be between 0 and ${maxPeriodIndex} for ${value.periodType} budgets`,
       });
     }
   });
 });

async function assertBudgetReferences(client: any, orgId: number, data: {
  accountIds: number[];
  costCentreId?: number | null;
  profitCentreId?: number | null;
  lineCostCentreIds?: Array<number | null | undefined>;
  lineProfitCentreIds?: Array<number | null | undefined>;
}) {
  const accountIds = [...new Set(data.accountIds)];
  const lineCostCentreIds = [...new Set((data.lineCostCentreIds ?? []).filter((value): value is number => value != null))];
  const lineProfitCentreIds = [...new Set((data.lineProfitCentreIds ?? []).filter((value): value is number => value != null))];
  const refs = await client.query(
    `select
       (select count(*)::int from chart_of_accounts where id = any($1::int[]) and (org_id=$2 or org_id is null) and status='active') as account_count,
       ($3::int is null or exists(select 1 from cost_centres where id=$3 and org_id=$2)) as cost_centre_valid,
       ($4::int is null or exists(select 1 from profit_centres where id=$4 and org_id=$2)) as profit_centre_valid,
       (select count(*)::int from cost_centres where id = any($5::int[]) and org_id=$2) as line_cost_centre_count,
       (select count(*)::int from profit_centres where id = any($6::int[]) and org_id=$2) as line_profit_centre_count`,
    [accountIds, orgId, data.costCentreId ?? null, data.profitCentreId ?? null, lineCostCentreIds, lineProfitCentreIds],
  );
  const row = refs.rows[0];
  if (Number(row.account_count) !== accountIds.length || !row.cost_centre_valid || !row.profit_centre_valid ||
      Number(row.line_cost_centre_count) !== lineCostCentreIds.length || Number(row.line_profit_centre_count) !== lineProfitCentreIds.length) {
    throw new Error("Budget accounts and centres must belong to your organisation");
  }
}

router.get("/accounts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select id, code, name, type, normal_balance, status
         from chart_of_accounts
        where (org_id=$1 or org_id is null) and status='active'
        order by code`,
      [org(req)],
    );
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load budget accounts", 500); }
});

router.get("/budgets", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select b.*, cc.code as cost_centre_code, cc.name as cost_centre_name, pc.code as profit_centre_code, pc.name as profit_centre_name,
        count(bl.id)::int as line_count, coalesce(sum(bl.amount),0)::text as line_total
       from budgets b
       left join cost_centres cc on cc.id=b.cost_centre_id
       left join profit_centres pc on pc.id=b.profit_centre_id
       left join budget_lines bl on bl.budget_id=b.id
       where b.org_id=$1
       group by b.id, cc.code, cc.name, pc.code, pc.name
       order by b.fiscal_year desc, b.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load budgets", 500); }
});

router.post("/budgets", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = budgetSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
     await assertBudgetReferences(client, o, {
       accountIds: (d.lines ?? []).map((line) => line.accountId),
       costCentreId: d.costCentreId,
       profitCentreId: d.profitCentreId,
       lineCostCentreIds: (d.lines ?? []).map((line) => line.costCentreId),
       lineProfitCentreIds: (d.lines ?? []).map((line) => line.profitCentreId),
     });
    const number = await nextNumber("budgets", "budget_number", "BUD", o, client);
    const total = (d.lines ?? []).reduce((s, l) => s + l.amount, 0);
    const head = await client.query(
      `insert into budgets(org_id,budget_number,name,fiscal_year,period_type,budget_type,status,cost_centre_id,profit_centre_id,total_amount,notes,created_by) values($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9,$10,$11) returning *`,
      [o, number, d.name, d.fiscalYear, d.periodType, d.budgetType, d.costCentreId ?? null, d.profitCentreId ?? null, total.toFixed(2), d.notes ?? null, req.user!.userId]);
    for (const line of d.lines ?? []) {
      await client.query(
        `insert into budget_lines(budget_id,account_id,cost_centre_id,profit_centre_id,period_index,amount,description) values($1,$2,$3,$4,$5,$6,$7)`,
         [head.rows[0].id, line.accountId, line.costCentreId ?? d.costCentreId ?? null, line.profitCentreId ?? d.profitCentreId ?? null, line.periodIndex, line.amount, line.description ?? null]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
   } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Budget accounts and centres must belong to your organisation" ? e.message : "Failed to create budget", e.message === "Budget accounts and centres must belong to your organisation" ? 422 : 500); }
  finally { client.release(); }
});

router.get("/budgets/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const budgetId = parsedId(req.params.id as string); if (!budgetId) return fail(res, "Invalid id");
  try {
    const h = await pool.query(
      `select b.*, cc.code as cost_centre_code, cc.name as cost_centre_name, pc.code as profit_centre_code, pc.name as profit_centre_name
       from budgets b left join cost_centres cc on cc.id=b.cost_centre_id left join profit_centres pc on pc.id=b.profit_centre_id
       where b.id=$1 and b.org_id=$2`, [budgetId, org(req)]);
    if (!h.rows[0]) return fail(res, "Budget not found", 404);
    const lines = await pool.query(
      `select bl.*, ca.code as account_code, ca.name as account_name, cc.code as cost_centre_code, pc.code as profit_centre_code
       from budget_lines bl
       join chart_of_accounts ca on ca.id=bl.account_id
       left join cost_centres cc on cc.id=bl.cost_centre_id
       left join profit_centres pc on pc.id=bl.profit_centre_id
       where bl.budget_id=$1 order by bl.period_index, ca.code`, [budgetId]);
    res.json({ success: true, data: { ...h.rows[0], lines: lines.rows } });
  } catch { fail(res, "Failed to load budget", 500); }
});

router.put("/budgets/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const budgetId = parsedId(req.params.id as string); if (!budgetId) return fail(res, "Invalid id");
  const parsed = budgetSchemaBase.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from budgets where id=$1 and org_id=$2 for update`, [budgetId, o]);
    if (!existing.rows[0]) throw new Error("Budget not found");
    if (existing.rows[0].status === "active") throw new Error("Active budgets cannot be edited");
     await assertBudgetReferences(client, o, {
       accountIds: (d.lines ?? []).map((line) => line.accountId),
       costCentreId: d.costCentreId ?? existing.rows[0].cost_centre_id,
       profitCentreId: d.profitCentreId ?? existing.rows[0].profit_centre_id,
       lineCostCentreIds: (d.lines ?? []).map((line) => line.costCentreId),
       lineProfitCentreIds: (d.lines ?? []).map((line) => line.profitCentreId),
     });
    let total = Number(existing.rows[0].total_amount ?? 0);
    if (d.lines) { total = d.lines.reduce((s, l) => s + l.amount, 0); }
    const head = await client.query(
      `update budgets set name=coalesce($1,name),fiscal_year=coalesce($2,fiscal_year),period_type=coalesce($3,period_type),budget_type=coalesce($4,budget_type),cost_centre_id=coalesce($5,cost_centre_id),profit_centre_id=coalesce($6,profit_centre_id),total_amount=$7,notes=coalesce($8,notes),updated_at=now() where id=$9 and org_id=$10 returning *`,
      [d.name ?? null, d.fiscalYear ?? null, d.periodType ?? null, d.budgetType ?? null, d.costCentreId ?? null, d.profitCentreId ?? null, total.toFixed(2), d.notes ?? null, budgetId, o]);
    if (d.lines) {
      await client.query(`delete from budget_lines where budget_id=$1`, [budgetId]);
      for (const line of d.lines) {
        await client.query(
          `insert into budget_lines(budget_id,account_id,cost_centre_id,profit_centre_id,period_index,amount,description) values($1,$2,$3,$4,$5,$6,$7)`,
          [budgetId, line.accountId, line.costCentreId ?? null, line.profitCentreId ?? null, line.periodIndex, line.amount, line.description ?? null]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
   } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Budget not found" ? e.message : e.message === "Active budgets cannot be edited" ? e.message : e.message === "Budget accounts and centres must belong to your organisation" ? e.message : "Failed to update budget", e.message === "Budget not found" ? 404 : e.message === "Active budgets cannot be edited" ? 409 : e.message === "Budget accounts and centres must belong to your organisation" ? 422 : 500); }
  finally { client.release(); }
});

router.post("/budgets/:id/activate", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const budgetId = parsedId(req.params.id as string); if (!budgetId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update budgets set status='active',updated_at=now()
         where id=$1 and org_id=$2 and status='draft'
           and exists(select 1 from budget_lines where budget_id=budgets.id)
       returning *`, [budgetId, org(req)]);
    if (!r.rows[0]) return fail(res, "Budget not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to activate budget", 500); }
});

router.post("/budgets/:id/close", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const budgetId = parsedId(req.params.id as string); if (!budgetId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`update budgets set status='closed',updated_at=now() where id=$1 and org_id=$2 returning *`, [budgetId, org(req)]);
    if (!r.rows[0]) return fail(res, "Budget not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to close budget", 500); }
});

router.delete("/budgets/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const budgetId = parsedId(req.params.id as string); if (!budgetId) return fail(res, "Invalid id");
  try {
    const result = await pool.query(
      `delete from budgets where id=$1 and org_id=$2 and status='draft' returning id`,
      [budgetId, org(req)],
    );
    if (!result.rows[0]) return fail(res, "Only draft budgets can be deleted", 409);
    res.json({ success: true, data: { id: budgetId } });
  } catch { fail(res, "Failed to delete budget", 500); }
});

router.get("/budgets/:id/vs-actual", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const budgetId = parsedId(req.params.id as string); if (!budgetId) return fail(res, "Invalid id");
  try {
    const o = org(req);
    const h = await pool.query(`select * from budgets where id=$1 and org_id=$2`, [budgetId, o]);
    if (!h.rows[0]) return fail(res, "Budget not found", 404);
    const lines = await pool.query(
       `select bl.*, ca.code as account_code, ca.name as account_name, ca.type as account_type
       from budget_lines bl join chart_of_accounts ca on ca.id=bl.account_id
       where bl.budget_id=$1 order by bl.period_index, ca.code`, [budgetId]);
     const actual = await pool.query(
       `select to_char(transacted_at,'YYYY-MM') as period,
               coalesce(sum(amount) filter (where category='revenue'),0)::numeric as revenue,
               coalesce(sum(amount) filter (where category='expense'),0)::numeric as expense
          from finance_transactions
         where transacted_at >= make_date($2,1,1)
           and transacted_at < make_date($2 + 1,1,1)
         group by 1 order by 1`,
       [Number(h.rows[0].fiscal_year)],
     );
    const periodLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const rows = lines.rows.map((l: any) => {
      const label = h.rows[0].period_type === "monthly" ? periodLabels[l.period_index] ?? `P${l.period_index + 1}` : `Q${l.period_index + 1}`;
       const month = h.rows[0].period_type === "monthly" ? l.period_index : h.rows[0].period_type === "quarterly" ? l.period_index * 3 : 0;
       const periodActual = actual.rows
         .filter((row: any) => {
           const monthIndex = Number(String(row.period).slice(5, 7)) - 1;
           return h.rows[0].period_type === "monthly" ? monthIndex === month : h.rows[0].period_type === "quarterly" ? Math.floor(monthIndex / 3) === l.period_index : true;
         })
         .reduce((sum: number, row: any) => sum + (["Income", "Revenue"].includes(l.account_type) ? Number(row.revenue) : Number(row.expense)), 0);
       const variance = Number(l.amount) - periodActual;
       return { ...l, period_label: label, actual: periodActual.toFixed(2), variance, variance_pct: l.amount > 0 ? ((variance / Number(l.amount)) * 100).toFixed(2) : "0.00" };
    });
     const actualTotal = actual.rows.reduce((sum: number, row: any) => sum + Number(row.revenue) + Number(row.expense), 0);
     res.json({ success: true, data: { budget: h.rows[0], lines: rows, actualTotal: actualTotal.toFixed(2) } });
  } catch { fail(res, "Failed to load budget vs actual", 500); }
});

// ── Product Costing ────────────────────────────────────────────────────────────
const costingSchema = z.object({
  productId: id, version: z.string().max(20).optional(), standardCost: z.coerce.number().min(0).optional(),
  lastActualCost: z.coerce.number().min(0).optional(), isActive: z.boolean().optional(), notes: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    componentName: z.string().min(1).max(200), costType: z.enum(["material", "labour", "overhead", "other"]).default("material"),
    quantity: z.coerce.number().min(0).default(1), unitCost: z.coerce.number().min(0).default(0),
    amount: z.coerce.number().min(0).default(0), description: z.string().max(500).nullable().optional(),
  })).optional(),
});

router.get("/product-costings", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select pc.*, p.sku, p.name as product_name, count(pl.id)::int as line_count,
        coalesce(sum(pl.amount),0)::text as component_total
       from product_costings pc
       join inv_products p on p.id=pc.product_id
       left join product_costing_lines pl on pl.costing_id=pc.id
       where pc.org_id=$1
       group by pc.id, p.sku, p.name
       order by p.sku`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load product costings", 500); }
});

router.post("/product-costings", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = costingSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const p = await client.query(`select id from inv_products where id=$1 and org_id=$2`, [d.productId, o]);
    if (!p.rows[0]) throw new Error("Product not found");
    const computed = (d.lines ?? []).reduce((s, l) => s + l.amount, 0);
    const std = d.standardCost && d.standardCost > 0 ? d.standardCost : computed;
    const head = await client.query(
      `insert into product_costings(org_id,product_id,version,standard_cost,last_actual_cost,is_active,notes) values($1,$2,$3,$4,$5,$6,$7) returning *`,
      [o, d.productId, d.version ?? "v1", std.toFixed(4), d.lastActualCost ?? 0, d.isActive ?? true, d.notes ?? null]);
    for (const line of d.lines ?? []) {
      await client.query(
        `insert into product_costing_lines(costing_id,component_name,cost_type,quantity,unit_cost,amount,description) values($1,$2,$3,$4,$5,$6,$7)`,
        [head.rows[0].id, line.componentName, line.costType, line.quantity, line.unitCost, line.amount, line.description ?? null]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Product not found" ? e.message : "Failed to create product costing", e.message === "Product not found" ? 422 : 500); }
  finally { client.release(); }
});

router.put("/product-costings/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const costingId = parsedId(req.params.id as string); if (!costingId) return fail(res, "Invalid id");
  const parsed = costingSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from product_costings where id=$1 and org_id=$2 for update`, [costingId, o]);
    if (!existing.rows[0]) throw new Error("Product costing not found");
    let std = Number(existing.rows[0].standard_cost ?? 0);
    if (d.lines) { std = d.lines.reduce((s, l) => s + l.amount, 0); }
    const head = await client.query(
      `update product_costings set version=coalesce($1,version),standard_cost=$2,last_actual_cost=coalesce($3,last_actual_cost),is_active=coalesce($4,is_active),notes=coalesce($5,notes),updated_at=now() where id=$6 and org_id=$7 returning *`,
      [d.version ?? null, std.toFixed(4), d.lastActualCost ?? null, d.isActive ?? null, d.notes ?? null, costingId, o]);
    if (d.lines) {
      await client.query(`delete from product_costing_lines where costing_id=$1`, [costingId]);
      for (const line of d.lines) {
        await client.query(
          `insert into product_costing_lines(costing_id,component_name,cost_type,quantity,unit_cost,amount,description) values($1,$2,$3,$4,$5,$6,$7)`,
          [costingId, line.componentName, line.costType, line.quantity, line.unitCost, line.amount, line.description ?? null]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Product costing not found" ? e.message : "Failed to update product costing", e.message === "Product costing not found" ? 404 : 500); }
  finally { client.release(); }
});

router.post("/product-costings/:id/recalculate", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const costingId = parsedId(req.params.id as string); if (!costingId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update product_costings set standard_cost=(select coalesce(sum(amount),0) from product_costing_lines where costing_id=$1),updated_at=now() where id=$1 and org_id=$2 returning *`,
      [costingId, org(req)]);
    if (!r.rows[0]) return fail(res, "Product costing not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to recalculate product costing", 500); }
});

router.delete("/product-costings/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const costingId = parsedId(req.params.id as string); if (!costingId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from product_costings where id=$1 and org_id=$2 returning id`, [costingId, org(req)]);
    if (!r.rows[0]) return fail(res, "Product costing not found", 404);
    res.json({ success: true, data: { id: costingId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Product costing is in use; cannot delete" : "Failed to delete product costing", 409); }
});

// ── Variances ─────────────────────────────────────────────────────────────────
const varianceSchema = z.object({
  varianceType: z.enum(["price", "quantity", "usage", "labour_rate", "labour_efficiency", "overhead", "sales_volume", "sales_price", "material"]).default("price"),
  productId: id.nullable().optional(), accountId: id.nullable().optional(),
  costCentreId: id.nullable().optional(), profitCentreId: id.nullable().optional(),
  period: period, standardAmount: z.coerce.number().min(0).default(0),
  actualAmount: z.coerce.number().min(0).default(0),
  reason: z.string().max(1000).nullable().optional(), action: z.string().max(1000).nullable().optional(),
  status: z.enum(["open", "investigating", "resolved"]).default("open"),
});

router.get("/variances", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select v.*, p.sku, p.name as product_name, ca.code as account_code, ca.name as account_name,
        cc.code as cost_centre_code, pc.code as profit_centre_code
       from cost_variances v
       left join inv_products p on p.id=v.product_id
       left join chart_of_accounts ca on ca.id=v.account_id
       left join cost_centres cc on cc.id=v.cost_centre_id
       left join profit_centres pc on pc.id=v.profit_centre_id
       where v.org_id=$1
       order by v.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load variances", 500); }
});

router.post("/variances", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = varianceSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = await nextNumber("cost_variances", "variance_number", "VAR", o, client);
    const variance = Number((d.actualAmount - d.standardAmount).toFixed(2));
    const pct = d.standardAmount > 0 ? Number(((variance / d.standardAmount) * 100).toFixed(2)) : 0;
    const r = await client.query(
      `insert into cost_variances(org_id,variance_number,variance_type,product_id,account_id,cost_centre_id,profit_centre_id,period,standard_amount,actual_amount,variance_amount,variance_pct,reason,action,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
      [o, number, d.varianceType, d.productId ?? null, d.accountId ?? null, d.costCentreId ?? null, d.profitCentreId ?? null, d.period, d.standardAmount, d.actualAmount, variance, pct, d.reason ?? null, d.action ?? null, d.status]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch { await client.query("rollback").catch(() => {}); fail(res, "Failed to create variance", 500); }
  finally { client.release(); }
});

router.put("/variances/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const varId = parsedId(req.params.id as string); if (!varId) return fail(res, "Invalid id");
  const parsed = varianceSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const existing = await pool.query(`select * from cost_variances where id=$1 and org_id=$2`, [varId, org(req)]);
    if (!existing.rows[0]) return fail(res, "Variance not found", 404);
    const std = d.standardAmount ?? Number(existing.rows[0].standard_amount ?? 0);
    const act = d.actualAmount ?? Number(existing.rows[0].actual_amount ?? 0);
    const variance = Number((act - std).toFixed(2));
    const pct = std > 0 ? Number(((variance / std) * 100).toFixed(2)) : 0;
    const r = await pool.query(
      `update cost_variances set variance_type=coalesce($1,variance_type),product_id=coalesce($2,product_id),account_id=coalesce($3,account_id),cost_centre_id=coalesce($4,cost_centre_id),profit_centre_id=coalesce($5,profit_centre_id),period=coalesce($6,period),standard_amount=coalesce($7,standard_amount),actual_amount=coalesce($8,actual_amount),variance_amount=$9,variance_pct=$10,reason=coalesce($11,reason),action=coalesce($12,action),status=coalesce($13,status),updated_at=now() where id=$14 and org_id=$15 returning *`,
      [d.varianceType ?? null, d.productId ?? null, d.accountId ?? null, d.costCentreId ?? null, d.profitCentreId ?? null, d.period ?? null, d.standardAmount ?? null, d.actualAmount ?? null, variance, pct, d.reason ?? null, d.action ?? null, d.status ?? null, varId, org(req)]);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update variance", 500); }
});

router.delete("/variances/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const varId = parsedId(req.params.id as string); if (!varId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from cost_variances where id=$1 and org_id=$2 returning id`, [varId, org(req)]);
    if (!r.rows[0]) return fail(res, "Variance not found", 404);
    res.json({ success: true, data: { id: varId } });
  } catch { fail(res, "Failed to delete variance", 500); }
});

// ── Forecasts ─────────────────────────────────────────────────────────────────
const forecastSchema = z.object({
  name: z.string().min(1).max(200), method: z.enum(["linear", "moving_average", "seasonal", "manual"]).default("manual"),
  currency: z.string().max(10).default("INR"), notes: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    accountId: id, period: period, amount: z.coerce.number().min(0).default(0),
    isActual: z.boolean().default(false), notes: z.string().max(500).nullable().optional(),
  })).optional(),
});

router.get("/forecasts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select f.*, count(fl.id)::int as line_count, coalesce(sum(fl.amount),0)::text as line_total,
        min(fl.period) as start_period, max(fl.period) as end_period
       from forecasts f
       left join forecast_lines fl on fl.forecast_id=f.id
       where f.org_id=$1
       group by f.id
       order by f.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load forecasts", 500); }
});

router.post("/forecasts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = forecastSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    await assertBudgetReferences(client, o, {
      accountIds: (d.lines ?? []).map((line) => line.accountId),
    });
    const number = await nextNumber("forecasts", "forecast_number", "FCST", o, client);
    const head = await client.query(
      `insert into forecasts(org_id,forecast_number,name,method,status,currency,notes,created_by) values($1,$2,$3,$4,'draft',$5,$6,$7) returning *`,
      [o, number, d.name, d.method, d.currency, d.notes ?? null, req.user!.userId]);
    for (const line of d.lines ?? []) {
      await client.query(
        `insert into forecast_lines(forecast_id,account_id,period,amount,is_actual,notes) values($1,$2,$3,$4,$5,$6)`,
        [head.rows[0].id, line.accountId, line.period, line.amount, line.isActual, line.notes ?? null]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Budget accounts and centres must belong to your organisation" ? e.message : "Failed to create forecast", e.message === "Budget accounts and centres must belong to your organisation" ? 422 : 500); }
  finally { client.release(); }
});

router.get("/forecasts/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const forecastId = parsedId(req.params.id as string); if (!forecastId) return fail(res, "Invalid id");
  try {
    const h = await pool.query(`select * from forecasts where id=$1 and org_id=$2`, [forecastId, org(req)]);
    if (!h.rows[0]) return fail(res, "Forecast not found", 404);
    const lines = await pool.query(
      `select fl.*, ca.code as account_code, ca.name as account_name from forecast_lines fl join chart_of_accounts ca on ca.id=fl.account_id where fl.forecast_id=$1 order by fl.period, ca.code`, [forecastId]);
    res.json({ success: true, data: { ...h.rows[0], lines: lines.rows } });
  } catch { fail(res, "Failed to load forecast", 500); }
});

router.put("/forecasts/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const forecastId = parsedId(req.params.id as string); if (!forecastId) return fail(res, "Invalid id");
  const parsed = forecastSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from forecasts where id=$1 and org_id=$2 for update`, [forecastId, o]);
    if (!existing.rows[0]) throw new Error("Forecast not found");
    if (d.lines) await assertBudgetReferences(client, o, { accountIds: d.lines.map((line) => line.accountId) });
    const head = await client.query(
      `update forecasts set name=coalesce($1,name),method=coalesce($2,method),status=coalesce($3,status),currency=coalesce($4,currency),notes=coalesce($5,notes),updated_at=now() where id=$6 and org_id=$7 returning *`,
      [d.name ?? null, d.method ?? null, (d as any).status ?? null, d.currency ?? null, d.notes ?? null, forecastId, o]);
    if (d.lines) {
      await client.query(`delete from forecast_lines where forecast_id=$1`, [forecastId]);
      for (const line of d.lines) {
        await client.query(
          `insert into forecast_lines(forecast_id,account_id,period,amount,is_actual,notes) values($1,$2,$3,$4,$5,$6)`,
          [forecastId, line.accountId, line.period, line.amount, line.isActual, line.notes ?? null]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Forecast not found" ? e.message : "Failed to update forecast", e.message === "Forecast not found" ? 404 : 500); }
  finally { client.release(); }
});

router.post("/forecasts/:id/approve", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const forecastId = parsedId(req.params.id as string); if (!forecastId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`update forecasts set status='approved',updated_at=now() where id=$1 and org_id=$2 and status='draft' returning *`, [forecastId, org(req)]);
    if (!r.rows[0]) return fail(res, "Forecast not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to approve forecast", 500); }
});

router.post("/forecasts/:id/generate", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  // Auto-generate forecast lines for the next 12 months using linear regression on transaction history.
  const forecastId = parsedId(req.params.id as string); if (!forecastId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const f = await client.query(`select * from forecasts where id=$1 and org_id=$2 for update`, [forecastId, o]);
    if (!f.rows[0]) throw new Error("Forecast not found");
    const method = f.rows[0].method;
     const accounts = await client.query(
       `select id, type from chart_of_accounts
          where (org_id=$1 or org_id is null) and status='active' and type in ('Income','Expense')
          order by code`,
       [o],
     );
     const revenueAccount = accounts.rows.find((account: any) => account.type === "Income");
     const expenseAccount = accounts.rows.find((account: any) => account.type === "Expense");
     if (!revenueAccount || !expenseAccount) throw new Error("Create an active income and expense account before generating a forecast");
     const hist = await client.query(
       `select to_char(transacted_at,'YYYY-MM') as period, category,
               coalesce(sum(amount),0)::numeric as total
          from finance_transactions
         where transacted_at >= date_trunc('month', now()) - interval '12 months'
         group by 1,2 order by 1`,
     );
     const history: Record<string, number[]> = { revenue: [], expense: [] };
     const byPeriod: Record<string, { revenue: number; expense: number }> = {};
     for (const row of hist.rows) {
       byPeriod[row.period] ??= { revenue: 0, expense: 0 };
        if (row.category === "revenue" || row.category === "expense") {
          byPeriod[row.period][row.category as "revenue" | "expense"] = Number(row.total);
        }
     }
     const periods = Object.keys(byPeriod).sort();
     for (const periodValue of periods) {
       history.revenue.push(byPeriod[periodValue].revenue);
       history.expense.push(byPeriod[periodValue].expense);
     }
     const project = (values: number[], method: string) => {
       if (!values.length) return 0;
       if (method === "moving_average") return values.slice(-3).reduce((sum, value) => sum + value, 0) / Math.min(values.length, 3);
       if (method === "linear" && values.length > 1) {
         const xMean = (values.length - 1) / 2;
         const yMean = values.reduce((sum, value) => sum + value, 0) / values.length;
         const slope = values.reduce((sum, value, index) => sum + (index - xMean) * (value - yMean), 0) /
           values.reduce((sum, _value, index) => sum + (index - xMean) ** 2, 0);
         return Math.max(0, yMean + slope * values.length);
       }
       return values.reduce((sum, value) => sum + value, 0) / values.length;
     };
    await client.query(`delete from forecast_lines where forecast_id=$1`, [forecastId]);
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const periodStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
       const seasonal = method === "seasonal" ? 1 + 0.1 * Math.sin((d.getMonth() + 1) / 12 * Math.PI * 2) : 1;
      await client.query(
        `insert into forecast_lines(forecast_id,account_id,period,amount,is_actual,notes) values($1,$2,$3,$4,false,$5)`,
         [forecastId, revenueAccount.id, periodStr, Number((project(history.revenue, method) * seasonal).toFixed(2)), `${method} revenue projection`]);
      await client.query(
        `insert into forecast_lines(forecast_id,account_id,period,amount,is_actual,notes) values($1,$2,$3,$4,false,$5)`,
         [forecastId, expenseAccount.id, periodStr, Number((project(history.expense, method) * seasonal).toFixed(2)), `${method} expense projection`]);
    }
    await client.query("commit");
    res.json({ success: true, data: { id: forecastId, status: "regenerated" } });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Forecast not found" ? e.message : e.message === "Create an active income and expense account before generating a forecast" ? e.message : "Failed to generate forecast", e.message === "Forecast not found" ? 404 : e.message === "Create an active income and expense account before generating a forecast" ? 422 : 500); }
  finally { client.release(); }
});

router.delete("/forecasts/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const forecastId = parsedId(req.params.id as string); if (!forecastId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from forecasts where id=$1 and org_id=$2 and status='draft' returning id`, [forecastId, org(req)]);
    if (!r.rows[0]) return fail(res, "Only draft forecasts can be deleted", 409);
    res.json({ success: true, data: { id: forecastId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Forecast is in use; cannot delete" : "Failed to delete forecast", 409); }
});

// ── Management accounting allocations ─────────────────────────────────────────
const allocationRuleSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sourceCostCentreId: id,
  targetProfitCentreId: id,
  basis: z.enum(["percentage", "budget", "fixed"]).default("percentage"),
  rate: z.coerce.number().min(0).max(100).default(100),
  fixedAmount: z.coerce.number().min(0).max(999999999999).default(0),
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).nullable().optional(),
});

const allocationRunSchema = z.object({
  period,
  notes: z.string().max(1000).nullable().optional(),
});

async function assertAllocationReferences(client: any, orgId: number, sourceCostCentreId: number, targetProfitCentreId: number) {
  const refs = await client.query(
    `select
       exists(select 1 from cost_centres where id=$1 and org_id=$3) as source_exists,
       exists(select 1 from profit_centres where id=$2 and org_id=$3) as target_exists`,
    [sourceCostCentreId, targetProfitCentreId, orgId],
  );
  if (!refs.rows[0]?.source_exists || !refs.rows[0]?.target_exists) {
    throw new Error("Allocation centres must belong to your organisation");
  }
}

async function budgetBasis(client: any, orgId: number, sourceCostCentreId: number, periodValue: string) {
  const [yearText, monthText] = periodValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const result = await client.query(
    `select coalesce(sum(bl.amount),0)::numeric as amount
       from budget_lines bl
       join budgets b on b.id=bl.budget_id
      where b.org_id=$1
        and b.status in ('active','closed')
        and b.fiscal_year=$2
        and coalesce(bl.cost_centre_id,b.cost_centre_id)=$3
        and (
          (b.period_type='monthly' and bl.period_index=$4)
          or (b.period_type='quarterly' and bl.period_index=floor($4 / 3))
          or (b.period_type='yearly' and bl.period_index=0)
        )`,
    [orgId, year, sourceCostCentreId, monthIndex],
  );
  return Number(result.rows[0]?.amount ?? 0);
}

router.get("/allocation-rules", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select ar.*, s.code as source_cost_centre_code, s.name as source_cost_centre_name,
              t.code as target_profit_centre_code, t.name as target_profit_centre_name
         from allocation_rules ar
         join cost_centres s on s.id=ar.source_cost_centre_id
         join profit_centres t on t.id=ar.target_profit_centre_id
        where ar.org_id=$1
        order by ar.is_active desc, ar.name`,
      [org(req)],
    );
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load allocation rules", 500); }
});

router.post("/allocation-rules", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = allocationRuleSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, "Validation failed");
  const client = await pool.connect();
  try {
    const d = parsed.data;
    const o = org(req);
    await assertAllocationReferences(client, o, d.sourceCostCentreId, d.targetProfitCentreId);
    await client.query("begin");
    const number = await nextNumber("allocation_rules", "rule_number", "ALLOC", o, client);
    const result = await client.query(
      `insert into allocation_rules
        (org_id,rule_number,name,source_cost_centre_id,target_profit_centre_id,basis,rate,fixed_amount,is_active,notes,created_by)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [o, number, d.name, d.sourceCostCentreId, d.targetProfitCentreId, d.basis, d.rate, d.fixedAmount, d.isActive, d.notes ?? null, req.user!.userId],
    );
    await client.query("commit");
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e: any) {
    await client.query("rollback").catch(() => {});
    fail(res, e.message === "Allocation centres must belong to your organisation" ? e.message : "Failed to create allocation rule", e.message ? 422 : 500);
  } finally { client.release(); }
});

router.put("/allocation-rules/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const ruleId = parsedId(req.params.id as string);
  if (!ruleId) return fail(res, "Invalid id");
  const parsed = allocationRuleSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, "Validation failed");
  const client = await pool.connect();
  try {
    const o = org(req);
    const existing = await client.query(`select * from allocation_rules where id=$1 and org_id=$2`, [ruleId, o]);
    if (!existing.rows[0]) return fail(res, "Allocation rule not found", 404);
    const d = parsed.data;
    if (d.sourceCostCentreId || d.targetProfitCentreId) {
      await assertAllocationReferences(client, o, d.sourceCostCentreId ?? existing.rows[0].source_cost_centre_id, d.targetProfitCentreId ?? existing.rows[0].target_profit_centre_id);
    }
    const result = await client.query(
      `update allocation_rules set
         name=coalesce($1,name), source_cost_centre_id=coalesce($2,source_cost_centre_id),
         target_profit_centre_id=coalesce($3,target_profit_centre_id), basis=coalesce($4,basis),
         rate=coalesce($5,rate), fixed_amount=coalesce($6,fixed_amount),
         is_active=coalesce($7,is_active), notes=coalesce($8,notes), updated_at=now()
       where id=$9 and org_id=$10 returning *`,
      [d.name ?? null, d.sourceCostCentreId ?? null, d.targetProfitCentreId ?? null, d.basis ?? null,
        d.rate ?? null, d.fixedAmount ?? null, d.isActive ?? null, d.notes ?? null, ruleId, o],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e: any) {
    fail(res, e.message === "Allocation centres must belong to your organisation" ? e.message : "Failed to update allocation rule", e.message ? 422 : 500);
  } finally { client.release(); }
});

router.delete("/allocation-rules/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const ruleId = parsedId(req.params.id as string);
  if (!ruleId) return fail(res, "Invalid id");
  try {
    const result = await pool.query(`delete from allocation_rules where id=$1 and org_id=$2 returning id`, [ruleId, org(req)]);
    if (!result.rows[0]) return fail(res, "Allocation rule not found", 404);
    res.json({ success: true, data: { id: ruleId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Allocation rule is used by a run; archive it instead" : "Failed to delete allocation rule", 409); }
});

router.get("/allocation-runs", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select r.*, count(l.id)::int as line_count,
              coalesce(sum(l.amount),0)::text as line_total
         from allocation_runs r
         left join allocation_lines l on l.run_id=r.id
        where r.org_id=$1
        group by r.id
        order by r.period desc, r.created_at desc`,
      [org(req)],
    );
    res.json({ success: true, data: result.rows });
  } catch { fail(res, "Failed to load allocation runs", 500); }
});

router.get("/allocation-runs/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const runId = parsedId(req.params.id as string);
  if (!runId) return fail(res, "Invalid id");
  try {
    const header = await pool.query(`select * from allocation_runs where id=$1 and org_id=$2`, [runId, org(req)]);
    if (!header.rows[0]) return fail(res, "Allocation run not found", 404);
    const lines = await pool.query(
      `select l.*, ar.rule_number, ar.name as rule_name, s.code as source_cost_centre_code,
              t.code as target_profit_centre_code
         from allocation_lines l
         join allocation_rules ar on ar.id=l.rule_id
         join cost_centres s on s.id=l.source_cost_centre_id
         join profit_centres t on t.id=l.target_profit_centre_id
        where l.run_id=$1
        order by l.id`,
      [runId],
    );
    res.json({ success: true, data: { ...header.rows[0], lines: lines.rows } });
  } catch { fail(res, "Failed to load allocation run", 500); }
});

router.post("/allocation-runs", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = allocationRunSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, "Validation failed");
  const client = await pool.connect();
  try {
    const o = org(req);
    await client.query("begin");
    const rules = await client.query(`select * from allocation_rules where org_id=$1 and is_active=true order by id`, [o]);
    if (!rules.rows.length) throw new Error("Create at least one active allocation rule first");
    const number = await nextNumber("allocation_runs", "run_number", "RUN", o, client);
    const run = await client.query(
      `insert into allocation_runs(org_id,run_number,period,status,total_amount,notes,created_by)
       values($1,$2,$3,'draft',0,$4,$5) returning *`,
      [o, number, parsed.data.period, parsed.data.notes ?? null, req.user!.userId],
    );
    let total = 0;
    for (const rule of rules.rows) {
      const basis = await budgetBasis(client, o, rule.source_cost_centre_id, parsed.data.period);
      const amount = rule.basis === "fixed" ? Number(rule.fixed_amount) : rule.basis === "budget" ? basis : basis * Number(rule.rate) / 100;
      const rounded = Number(amount.toFixed(2));
      total += rounded;
      await client.query(
        `insert into allocation_lines(run_id,rule_id,source_cost_centre_id,target_profit_centre_id,basis_amount,rate,amount,description)
         values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [run.rows[0].id, rule.id, rule.source_cost_centre_id, rule.target_profit_centre_id, basis, rule.rate, rounded, `${rule.basis} allocation for ${parsed.data.period}`],
      );
    }
    const updated = await client.query(`update allocation_runs set total_amount=$1,updated_at=now() where id=$2 returning *`, [total.toFixed(2), run.rows[0].id]);
    await client.query("commit");
    res.status(201).json({ success: true, data: updated.rows[0] });
  } catch (e: any) {
    await client.query("rollback").catch(() => {});
    fail(res, e.message === "Create at least one active allocation rule first" ? e.message : "Failed to generate allocation run", e.message ? 422 : 500);
  } finally { client.release(); }
});

router.post("/allocation-runs/:id/post", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const runId = parsedId(req.params.id as string);
  if (!runId) return fail(res, "Invalid id");
  try {
    const result = await pool.query(
      `update allocation_runs set status='posted',updated_at=now()
        where id=$1 and org_id=$2 and status='draft' returning *`,
      [runId, org(req)],
    );
    if (!result.rows[0]) return fail(res, "Only draft allocation runs can be posted", 409);
    res.json({ success: true, data: result.rows[0] });
  } catch { fail(res, "Failed to post allocation run", 500); }
});

router.delete("/allocation-runs/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const runId = parsedId(req.params.id as string);
  if (!runId) return fail(res, "Invalid id");
  try {
    const result = await pool.query(
      `delete from allocation_runs where id=$1 and org_id=$2 and status in ('draft','cancelled') returning id`,
      [runId, org(req)],
    );
    if (!result.rows[0]) return fail(res, "Only draft or cancelled allocation runs can be deleted", 409);
    res.json({ success: true, data: { id: runId } });
  } catch { fail(res, "Failed to delete allocation run", 500); }
});

// Profitability is deliberately computed from budgets and posted allocation runs
// rather than cached values, so the report stays correct after CRUD changes.
router.get("/profitability", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const parsed = period.safeParse(req.query.period);
  const periodValue = parsed.success ? parsed.data : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [yearText, monthText] = periodValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  try {
    const result = await pool.query(
      `select pc.id, pc.code, pc.name,
              coalesce(sum(case when ca.type='Income' then bl.amount else 0 end),0)::text as revenue,
              coalesce(sum(case when ca.type='Expense' then bl.amount else 0 end),0)::text as budget_cost,
              coalesce((
                select sum(al.amount)
                  from allocation_lines al
                  join allocation_runs ar on ar.id=al.run_id
                 where ar.org_id=$1 and ar.period=$2 and ar.status='posted'
                   and al.target_profit_centre_id=pc.id
              ),0)::text as allocated_cost
         from profit_centres pc
         left join budgets b on b.org_id=pc.org_id and b.status in ('active','closed') and b.fiscal_year=$3
         left join budget_lines bl on bl.budget_id=b.id
           and coalesce(bl.profit_centre_id,b.profit_centre_id)=pc.id
           and (
             (b.period_type='monthly' and bl.period_index=$4)
             or (b.period_type='quarterly' and bl.period_index=floor($4 / 3))
             or (b.period_type='yearly' and bl.period_index=0)
           )
         left join chart_of_accounts ca on ca.id=bl.account_id
        where pc.org_id=$1
        group by pc.id
        order by pc.code`,
      [org(req), periodValue, year, monthIndex],
    );
    const rows = result.rows.map((row: any) => {
      const revenue = Number(row.revenue ?? 0);
      const cost = Number(row.budget_cost ?? 0) + Number(row.allocated_cost ?? 0);
      const contribution = revenue - cost;
      return { ...row, revenue: revenue.toFixed(2), total_cost: cost.toFixed(2), contribution: contribution.toFixed(2), margin_pct: revenue ? ((contribution / revenue) * 100).toFixed(2) : "0.00" };
    });
    const totals = rows.reduce((acc: any, row: any) => {
      acc.revenue += Number(row.revenue); acc.totalCost += Number(row.total_cost); acc.contribution += Number(row.contribution); return acc;
    }, { revenue: 0, totalCost: 0, contribution: 0 });
    res.json({ success: true, data: { period: periodValue, rows, totals: { revenue: totals.revenue.toFixed(2), totalCost: totals.totalCost.toFixed(2), contribution: totals.contribution.toFixed(2), marginPct: totals.revenue ? ((totals.contribution / totals.revenue) * 100).toFixed(2) : "0.00" } } });
  } catch { fail(res, "Failed to load profitability report", 500); }
});

export default router;