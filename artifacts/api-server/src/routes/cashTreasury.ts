import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Cash & Treasury Management";

const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().finite().min(0);
const positiveMoney = z.coerce.number().finite().positive();

const accountFields = z.object({
  name: z.string().min(1).max(200),
  accountNumber: z.string().max(100).nullable().optional(),
  bankName: z.string().max(200).nullable().optional(),
  bankBranch: z.string().max(200).nullable().optional(),
  currency: z.string().max(10).default("INR"),
  currentBalance: money.default(0),
  availableBalance: money.default(0),
  accountType: z.enum(["checking", "savings", "credit", "cash", "investment", "petty_cash"]).default("checking"),
  status: z.enum(["active", "inactive", "closed"]).default("active"),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(2000).nullable().optional(),
});

const accountSchema = accountFields.refine((value) => value.currentBalance == null || value.availableBalance == null || value.availableBalance <= value.currentBalance, {
  message: "Available balance cannot exceed current balance",
});

const positionSchema = z.object({
  accountId: id,
  positionDate: date,
  openingBalance: money.default(0),
  closingBalance: money.default(0),
  currency: z.string().max(10).default("INR"),
  notes: z.string().max(1000).nullable().optional(),
});

const forecastSchema = z.object({
  accountId: id,
  forecastDate: date,
  projectedInflow: money.default(0),
  projectedOutflow: money.default(0),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  scenario: z.enum(["base", "optimistic", "pessimistic"]).default("base"),
  notes: z.string().max(1000).nullable().optional(),
});

const paymentSchema = z.object({
  accountId: id.nullable().optional(),
  payeeName: z.string().min(1).max(300),
  vendorName: z.string().max(300).nullable().optional(),
  amount: positiveMoney,
  currency: z.string().max(10).default("INR"),
  paymentDate: date,
  method: z.enum(["bank_transfer", "wire", "ach", "check", "cash", "credit_card", "upi", "rtgs", "neft"]).default("bank_transfer"),
  category: z.enum(["operating", "payroll", "vendor", "tax", "loan", "capex", "other"]).default("operating"),
  reference: z.string().max(200).nullable().optional(),
  status: z.enum(["draft", "scheduled", "approved", "processing", "paid", "cancelled", "failed"]).default("draft"),
  notes: z.string().max(1000).nullable().optional(),
});

const collectionSchema = z.object({
  accountId: id.nullable().optional(),
  payerName: z.string().min(1).max(300),
  customerName: z.string().max(300).nullable().optional(),
  amount: positiveMoney,
  currency: z.string().max(10).default("INR"),
  collectionDate: date,
  method: z.enum(["bank_transfer", "wire", "ach", "check", "cash", "credit_card", "upi", "rtgs", "neft"]).default("bank_transfer"),
  category: z.string().max(100).default("customer_payment"),
  reference: z.string().max(200).nullable().optional(),
  status: z.enum(["draft", "scheduled", "approved", "processing", "received", "cancelled", "overdue"]).default("draft"),
  notes: z.string().max(1000).nullable().optional(),
});

const transferSchema = z.object({
  fromAccountId: id,
  toAccountId: id,
  amount: positiveMoney,
  currency: z.string().max(10).default("INR"),
  transferDate: date,
  reference: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, prefix: string, orgId: number, client: any = pool) {
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}

// ── Summary ────────────────────────────────────────────────────────────────────
router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const [accounts, activeAccounts, totalBalance, availableBalance, positions, forecasts, payments, paymentsDue, paidPayments, collections, collectionsDue, receivedCollections, transfers, executedTransfers, forecastStats, overdueCollections, approvalQueue] = await Promise.all([
      pool.query(`select count(*)::int as count from treasury_accounts where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from treasury_accounts where org_id=$1 and status='active'`, [o]),
      pool.query(`select coalesce(sum(current_balance),0)::numeric as total from treasury_accounts where org_id=$1`, [o]),
      pool.query(`select coalesce(sum(available_balance),0)::numeric as total from treasury_accounts where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from treasury_positions where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from treasury_liquidity_forecasts where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from treasury_payment_plans where org_id=$1`, [o]),
      pool.query(`select coalesce(sum(amount),0)::numeric as total from treasury_payment_plans where org_id=$1 and status in ('draft','scheduled','approved','processing')`, [o]),
      pool.query(`select count(*)::int as count from treasury_payment_plans where org_id=$1 and status='paid'`, [o]),
      pool.query(`select count(*)::int as count from treasury_collection_plans where org_id=$1`, [o]),
      pool.query(`select coalesce(sum(amount),0)::numeric as total from treasury_collection_plans where org_id=$1 and status in ('draft','scheduled','approved','processing')`, [o]),
      pool.query(`select count(*)::int as count from treasury_collection_plans where org_id=$1 and status='received'`, [o]),
      pool.query(`select count(*)::int as count from treasury_transfers where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from treasury_transfers where org_id=$1 and status='executed'`, [o]),
      pool.query(`select coalesce(sum(net_cashflow),0)::numeric as net, coalesce(min(projected_balance),0)::numeric as lowest from treasury_liquidity_forecasts where org_id=$1 and scenario='base' and forecast_date::date between current_date and current_date + 30`, [o]),
      pool.query(`select count(*)::int as count from treasury_collection_plans where org_id=$1 and status='overdue'`, [o]),
      pool.query(`select (select count(*) from treasury_payment_plans where org_id=$1 and status in ('draft','scheduled')) + (select count(*) from treasury_collection_plans where org_id=$1 and status in ('draft','scheduled')) as count`, [o]),
    ]);
    res.json({ success: true, data: {
      totalAccounts: accounts.rows[0].count,
      activeAccounts: activeAccounts.rows[0].count,
      totalBalance: totalBalance.rows[0].total,
      availableBalance: availableBalance.rows[0].total,
      totalPositions: positions.rows[0].count,
      totalForecasts: forecasts.rows[0].count,
      totalPayments: payments.rows[0].count,
      paymentsDue: paymentsDue.rows[0].total,
      paidPayments: paidPayments.rows[0].count,
      totalCollections: collections.rows[0].count,
      collectionsDue: collectionsDue.rows[0].total,
      receivedCollections: receivedCollections.rows[0].count,
      totalTransfers: transfers.rows[0].count,
      executedTransfers: executedTransfers.rows[0].count,
      forecastNet30: forecastStats.rows[0].net,
      lowestForecastBalance: forecastStats.rows[0].lowest,
      overdueCollections: overdueCollections.rows[0].count,
      approvalQueue: Number(approvalQueue.rows[0].count ?? 0),
    }});
  } catch { fail(res, "Failed to load treasury summary", 500); }
});

// ── Accounts ──────────────────────────────────────────────────────────────────
router.get("/accounts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from treasury_accounts where org_id=$1 order by is_primary desc, name`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load accounts", 500); }
});

router.post("/accounts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = accountSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const r = await pool.query(
      `insert into treasury_accounts(org_id,name,account_number,bank_name,bank_branch,currency,current_balance,available_balance,account_type,status,is_primary,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [org(req), d.name, d.accountNumber ?? null, d.bankName ?? null, d.bankBranch ?? null, d.currency, d.currentBalance, d.availableBalance, d.accountType, d.status, d.isPrimary, d.notes ?? null, req.user!.userId]);
    if (d.isPrimary) {
      await pool.query(`update treasury_accounts set is_primary=false where org_id=$1 and id<>$2`, [org(req), r.rows[0].id]);
    }
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Account name already exists" : "Failed to create account", e.code === "23505" ? 409 : 500); }
});

router.put("/accounts/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const accountId = parsedId(req.params.id as string); if (!accountId) return fail(res, "Invalid id");
  const parsed = accountFields.partial().refine((value) => value.currentBalance == null || value.availableBalance == null || value.availableBalance <= value.currentBalance, {
    message: "Available balance cannot exceed current balance",
  }).safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    if (d.isPrimary) {
      await pool.query(`update treasury_accounts set is_primary=false where org_id=$1 and id<>$2`, [o, accountId]);
    }
    const r = await pool.query(
      `update treasury_accounts set name=coalesce($1,name),account_number=coalesce($2,account_number),bank_name=coalesce($3,bank_name),bank_branch=coalesce($4,bank_branch),currency=coalesce($5,currency),current_balance=coalesce($6,current_balance),available_balance=coalesce($7,available_balance),account_type=coalesce($8,account_type),status=coalesce($9,status),is_primary=coalesce($10,is_primary),notes=coalesce($11,notes),updated_at=now() where id=$12 and org_id=$13 and coalesce($7,available_balance) <= coalesce($6,current_balance) returning *`,
      [d.name ?? null, d.accountNumber ?? null, d.bankName ?? null, d.bankBranch ?? null, d.currency ?? null, d.currentBalance ?? null, d.availableBalance ?? null, d.accountType ?? null, d.status ?? null, d.isPrimary ?? null, d.notes ?? null, accountId, o]);
    if (!r.rows[0]) return fail(res, "Account not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update account", 500); }
});

router.delete("/accounts/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const accountId = parsedId(req.params.id as string); if (!accountId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from treasury_accounts where id=$1 and org_id=$2 returning id`, [accountId, org(req)]);
    if (!r.rows[0]) return fail(res, "Account not found", 404);
    res.json({ success: true, data: { id: accountId } });
  } catch (e: any) { fail(res, e.code === "23503" ? "Account is in use; cannot delete" : "Failed to delete account", 409); }
});

// ── Positions ─────────────────────────────────────────────────────────────────
router.get("/positions", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select p.*, a.name as account_name from treasury_positions p left join treasury_accounts a on a.id=p.account_id where p.org_id=$1 order by p.position_date desc limit 60`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load positions", 500); }
});

router.post("/positions", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = positionSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    const acct = await pool.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
    if (!acct.rows[0]) return fail(res, "Account not found", 404);
    const net = d.closingBalance - d.openingBalance;
    const r = await pool.query(
      `insert into treasury_positions(org_id,account_id,position_date,opening_balance,closing_balance,net_cashflow,currency,notes) values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [o, d.accountId, d.positionDate, d.openingBalance, d.closingBalance, net, d.currency, d.notes ?? null]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Position already exists for this account/date" : "Failed to create position", e.code === "23505" ? 409 : 500); }
});

router.delete("/positions/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const posId = parsedId(req.params.id as string); if (!posId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from treasury_positions where id=$1 and org_id=$2 returning id`, [posId, org(req)]);
    if (!r.rows[0]) return fail(res, "Position not found", 404);
    res.json({ success: true, data: { id: posId } });
  } catch { fail(res, "Failed to delete position", 500); }
});

router.put("/positions/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const posId = parsedId(req.params.id as string); if (!posId) return fail(res, "Invalid id");
  const parsed = positionSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    if (d.accountId != null) {
      const acct = await pool.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
      if (!acct.rows[0]) return fail(res, "Account not found", 404);
    }
    const r = await pool.query(
      `update treasury_positions set account_id=coalesce($1,account_id),position_date=coalesce($2,position_date),opening_balance=coalesce($3,opening_balance),closing_balance=coalesce($4,closing_balance),net_cashflow=coalesce($4,closing_balance)-coalesce($3,opening_balance),currency=coalesce($5,currency),notes=coalesce($6,notes),updated_at=now() where id=$7 and org_id=$8 returning *`,
      [d.accountId ?? null, d.positionDate ?? null, d.openingBalance ?? null, d.closingBalance ?? null, d.currency ?? null, d.notes ?? null, posId, o]);
    if (!r.rows[0]) return fail(res, "Position not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Position already exists for this account/date" : "Failed to update position", e.code === "23505" ? 409 : 500); }
});

// ── Liquidity Forecasts ───────────────────────────────────────────────────────
router.get("/forecasts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select f.*, a.name as account_name from treasury_liquidity_forecasts f left join treasury_accounts a on a.id=f.account_id where f.org_id=$1 order by f.forecast_date`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load forecasts", 500); }
});

router.post("/forecasts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = forecastSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    const acct = await pool.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
    if (!acct.rows[0]) return fail(res, "Account not found", 404);
    const net = d.projectedInflow - d.projectedOutflow;
    const last = await pool.query(`select projected_balance from treasury_liquidity_forecasts where account_id=$1 and org_id=$3 and forecast_date<(select $2::date) and scenario=$4 order by forecast_date desc limit 1`, [d.accountId, d.forecastDate, o, d.scenario]);
    const base = last.rows[0]?.projected_balance ?? (await pool.query(`select available_balance from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o])).rows[0]?.available_balance ?? 0;
    const projectedBalance = Number(base) + net;
    const r = await pool.query(
      `insert into treasury_liquidity_forecasts(org_id,account_id,forecast_date,projected_inflow,projected_outflow,net_cashflow,projected_balance,confidence,scenario,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [o, d.accountId, d.forecastDate, d.projectedInflow, d.projectedOutflow, net, projectedBalance, d.confidence, d.scenario, d.notes ?? null]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Forecast already exists for this account/date/scenario" : "Failed to create forecast", e.code === "23505" ? 409 : 500); }
});

router.delete("/forecasts/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const fId = parsedId(req.params.id as string); if (!fId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from treasury_liquidity_forecasts where id=$1 and org_id=$2 returning id`, [fId, org(req)]);
    if (!r.rows[0]) return fail(res, "Forecast not found", 404);
    res.json({ success: true, data: { id: fId } });
  } catch { fail(res, "Failed to delete forecast", 500); }
});

router.put("/forecasts/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const fId = parsedId(req.params.id as string); if (!fId) return fail(res, "Invalid id");
  const parsed = forecastSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    if (d.accountId != null) {
      const acct = await pool.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
      if (!acct.rows[0]) return fail(res, "Account not found", 404);
    }
    const existing = await pool.query(`select * from treasury_liquidity_forecasts where id=$1 and org_id=$2`, [fId, o]);
    if (!existing.rows[0]) return fail(res, "Forecast not found", 404);
    const inflow = d.projectedInflow ?? Number(existing.rows[0].projected_inflow);
    const outflow = d.projectedOutflow ?? Number(existing.rows[0].projected_outflow);
    const r = await pool.query(
      `update treasury_liquidity_forecasts set account_id=coalesce($1,account_id),forecast_date=coalesce($2,forecast_date),projected_inflow=$3,projected_outflow=$4,net_cashflow=$5,projected_balance=projected_balance+($5-net_cashflow),confidence=coalesce($6,confidence),scenario=coalesce($7,scenario),notes=coalesce($8,notes),updated_at=now() where id=$9 and org_id=$10 returning *`,
      [d.accountId ?? null, d.forecastDate ?? null, inflow, outflow, inflow - outflow, d.confidence ?? null, d.scenario ?? null, d.notes ?? null, fId, o]);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Forecast already exists for this account/date/scenario" : "Failed to update forecast", e.code === "23505" ? 409 : 500); }
});

// ── Payment Plans ─────────────────────────────────────────────────────────────
router.get("/payments", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select p.*, a.name as account_name from treasury_payment_plans p left join treasury_accounts a on a.id=p.account_id where p.org_id=$1 order by p.payment_date`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load payment plans", 500); }
});

router.post("/payments", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = paymentSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    if (d.status !== "draft" && d.status !== "scheduled") throw new Error("New payment plans must be draft or scheduled");
    if (d.accountId != null) {
      const account = await client.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
      if (!account.rows[0]) throw new Error("Account not found");
    }
    const number = await nextNumber("treasury_payment_plans", "PMT", o, client);
    const r = await client.query(
      `insert into treasury_payment_plans(org_id,payment_number,account_id,payee_name,vendor_name,amount,currency,payment_date,method,category,reference,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
      [o, number, d.accountId ?? null, d.payeeName, d.vendorName ?? null, d.amount, d.currency, d.paymentDate, d.method, d.category, d.reference ?? null, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Account not found" || e.message === "New payment plans must be draft or scheduled" ? e.message : e.code === "23505" ? "Payment number already exists" : "Failed to create payment plan", e.message === "Account not found" ? 404 : e.code === "23505" ? 409 : 400); }
  finally { client.release(); }
});

router.put("/payments/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const payId = parsedId(req.params.id as string); if (!payId) return fail(res, "Invalid id");
  const parsed = paymentSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    const existing = await pool.query(`select status from treasury_payment_plans where id=$1 and org_id=$2`, [payId, o]);
    if (!existing.rows[0]) return fail(res, "Payment plan not found", 404);
    if (existing.rows[0].status !== "draft") return fail(res, "Only draft payment plans can be edited", 422);
    if (d.accountId != null) {
      const account = await pool.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
      if (!account.rows[0]) return fail(res, "Account not found", 404);
    }
    const r = await pool.query(
      `update treasury_payment_plans set account_id=coalesce($1,account_id),payee_name=coalesce($2,payee_name),vendor_name=coalesce($3,vendor_name),amount=coalesce($4,amount),currency=coalesce($5,currency),payment_date=coalesce($6,payment_date),method=coalesce($7,method),category=coalesce($8,category),reference=coalesce($9,reference),status=coalesce($10,status),notes=coalesce($11,notes),updated_at=now() where id=$12 and org_id=$13 returning *`,
      [d.accountId ?? null, d.payeeName ?? null, d.vendorName ?? null, d.amount ?? null, d.currency ?? null, d.paymentDate ?? null, d.method ?? null, d.category ?? null, d.reference ?? null, d.status ?? null, d.notes ?? null, payId, o]);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Payment number already exists" : "Failed to update payment plan", e.code === "23505" ? 409 : 500); }
});

router.post("/payments/:id/approve", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const payId = parsedId(req.params.id as string); if (!payId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update treasury_payment_plans set status='approved',updated_at=now() where id=$1 and org_id=$2 and status in ('draft','scheduled') returning *`,
      [payId, org(req)]);
    if (!r.rows[0]) return fail(res, "Payment plan not found or not ready for approval", 422);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to approve payment plan", 500); }
});

router.post("/payments/:id/mark-paid", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const payId = parsedId(req.params.id as string); if (!payId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const payment = await client.query(`select * from treasury_payment_plans where id=$1 and org_id=$2 for update`, [payId, o]);
    if (!payment.rows[0]) throw new Error("Payment plan not found");
    if (!["approved", "processing"].includes(payment.rows[0].status)) throw new Error("Payment must be approved before it is paid");
    if (payment.rows[0].account_id) {
      const account = await client.query(`select * from treasury_accounts where id=$1 and org_id=$2 for update`, [payment.rows[0].account_id, o]);
      if (!account.rows[0]) throw new Error("Account not found");
      const amount = Number(payment.rows[0].amount ?? 0);
      if (Number(account.rows[0].available_balance ?? 0) < amount) throw new Error("Insufficient available balance in account");
      await client.query(`update treasury_accounts set current_balance=current_balance-$1,available_balance=available_balance-$1,updated_at=now() where id=$2`, [amount, payment.rows[0].account_id]);
    }
    const r = await client.query(
      `update treasury_payment_plans set status='paid',paid_date=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 and org_id=$2 returning *`,
      [payId, o]);
    await client.query("commit");
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Payment plan not found" || e.message === "Account not found" ? e.message : e.message === "Payment must be approved before it is paid" || e.message === "Insufficient available balance in account" ? e.message : "Failed to mark payment as paid", e.message === "Payment plan not found" || e.message === "Account not found" ? 404 : e.message === "Payment must be approved before it is paid" || e.message === "Insufficient available balance in account" ? 422 : 500); }
  finally { client.release(); }
});

router.delete("/payments/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const payId = parsedId(req.params.id as string); if (!payId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from treasury_payment_plans where id=$1 and org_id=$2 and status='draft' returning id`, [payId, org(req)]);
    if (!r.rows[0]) return fail(res, "Payment plan not found", 404);
    res.json({ success: true, data: { id: payId } });
  } catch { fail(res, "Failed to delete payment plan", 500); }
});

// ── Collection Plans ──────────────────────────────────────────────────────────
router.get("/collections", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select c.*, a.name as account_name from treasury_collection_plans c left join treasury_accounts a on a.id=c.account_id where c.org_id=$1 order by c.collection_date`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load collection plans", 500); }
});

router.post("/collections", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = collectionSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    if (d.status !== "draft" && d.status !== "scheduled") throw new Error("New collection plans must be draft or scheduled");
    if (d.accountId != null) {
      const account = await client.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
      if (!account.rows[0]) throw new Error("Account not found");
    }
    const number = await nextNumber("treasury_collection_plans", "COL", o, client);
    const r = await client.query(
      `insert into treasury_collection_plans(org_id,collection_number,account_id,payer_name,customer_name,amount,currency,collection_date,method,category,reference,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
      [o, number, d.accountId ?? null, d.payerName, d.customerName ?? null, d.amount, d.currency, d.collectionDate, d.method, d.category, d.reference ?? null, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Account not found" || e.message === "New collection plans must be draft or scheduled" ? e.message : e.code === "23505" ? "Collection number already exists" : "Failed to create collection plan", e.message === "Account not found" ? 404 : e.code === "23505" ? 409 : 400); }
  finally { client.release(); }
});

router.put("/collections/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const colId = parsedId(req.params.id as string); if (!colId) return fail(res, "Invalid id");
  const parsed = collectionSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const o = org(req);
    const existing = await pool.query(`select status from treasury_collection_plans where id=$1 and org_id=$2`, [colId, o]);
    if (!existing.rows[0]) return fail(res, "Collection plan not found", 404);
    if (["received", "cancelled"].includes(existing.rows[0].status)) return fail(res, "Received or cancelled collection plans cannot be edited", 422);
    if (d.accountId != null) {
      const account = await pool.query(`select id from treasury_accounts where id=$1 and org_id=$2`, [d.accountId, o]);
      if (!account.rows[0]) return fail(res, "Account not found", 404);
    }
    const r = await pool.query(
      `update treasury_collection_plans set account_id=coalesce($1,account_id),payer_name=coalesce($2,payer_name),customer_name=coalesce($3,customer_name),amount=coalesce($4,amount),currency=coalesce($5,currency),collection_date=coalesce($6,collection_date),method=coalesce($7,method),category=coalesce($8,category),reference=coalesce($9,reference),status=coalesce($10,status),notes=coalesce($11,notes),updated_at=now() where id=$12 and org_id=$13 returning *`,
      [d.accountId ?? null, d.payerName ?? null, d.customerName ?? null, d.amount ?? null, d.currency ?? null, d.collectionDate ?? null, d.method ?? null, d.category ?? null, d.reference ?? null, d.status ?? null, d.notes ?? null, colId, o]);
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { fail(res, e.code === "23505" ? "Collection number already exists" : "Failed to update collection plan", e.code === "23505" ? 409 : 500); }
});

router.post("/collections/:id/mark-received", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const colId = parsedId(req.params.id as string); if (!colId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const collection = await client.query(`select * from treasury_collection_plans where id=$1 and org_id=$2 for update`, [colId, o]);
    if (!collection.rows[0]) throw new Error("Collection plan not found");
    if (collection.rows[0].status === "received") throw new Error("Collection is already received");
    if (collection.rows[0].status === "cancelled") throw new Error("Cancelled collections cannot be received");
    if (!["scheduled", "approved", "processing"].includes(collection.rows[0].status)) throw new Error("Collection must be scheduled before it is received");
    if (collection.rows[0].account_id) {
      const account = await client.query(`select id from treasury_accounts where id=$1 and org_id=$2 for update`, [collection.rows[0].account_id, o]);
      if (!account.rows[0]) throw new Error("Account not found");
      await client.query(`update treasury_accounts set current_balance=current_balance+$1,available_balance=available_balance+$1,updated_at=now() where id=$2`, [Number(collection.rows[0].amount ?? 0), collection.rows[0].account_id]);
    }
    const r = await client.query(
      `update treasury_collection_plans set status='received',received_date=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 and org_id=$2 and status not in ('received','cancelled') returning *`,
      [colId, o]);
    await client.query("commit");
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Collection plan not found" || e.message === "Account not found" ? e.message : e.message === "Collection is already received" || e.message === "Cancelled collections cannot be received" || e.message === "Collection must be scheduled before it is received" ? e.message : "Failed to mark collection as received", e.message === "Collection plan not found" || e.message === "Account not found" ? 404 : e.message === "Collection is already received" || e.message === "Cancelled collections cannot be received" || e.message === "Collection must be scheduled before it is received" ? 422 : 500); }
  finally { client.release(); }
});

router.delete("/collections/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const colId = parsedId(req.params.id as string); if (!colId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from treasury_collection_plans where id=$1 and org_id=$2 and status='draft' returning id`, [colId, org(req)]);
    if (!r.rows[0]) return fail(res, "Only draft collection plans can be deleted", 422);
    res.json({ success: true, data: { id: colId } });
  } catch { fail(res, "Failed to delete collection plan", 500); }
});

// ── Transfers ─────────────────────────────────────────────────────────────────
router.get("/transfers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select t.*, fa.name as from_account_name, ta.name as to_account_name
       from treasury_transfers t
       left join treasury_accounts fa on fa.id=t.from_account_id
       left join treasury_accounts ta on ta.id=t.to_account_id
       where t.org_id=$1 order by t.transfer_date desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load transfers", 500); }
});

router.post("/transfers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = transferSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    if (d.fromAccountId === d.toAccountId) throw new Error("Cannot transfer to the same account");
    const fromAcct = await client.query(`select * from treasury_accounts where id=$1 and org_id=$2 for update`, [d.fromAccountId, o]);
    const toAcct = await client.query(`select * from treasury_accounts where id=$1 and org_id=$2 for update`, [d.toAccountId, o]);
    if (!fromAcct.rows[0]) throw new Error("Source account not found");
    if (!toAcct.rows[0]) throw new Error("Destination account not found");
    const fromBalance = Number(fromAcct.rows[0].available_balance ?? 0);
    if (fromBalance < d.amount) throw new Error("Insufficient available balance in source account");
    const number = await nextNumber("treasury_transfers", "TRF", o, client);
    const r = await client.query(
      `insert into treasury_transfers(org_id,transfer_number,from_account_id,to_account_id,amount,currency,transfer_date,status,reference,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$10) returning *`,
      [o, number, d.fromAccountId, d.toAccountId, d.amount, d.currency, d.transferDate, d.reference ?? null, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Cannot transfer to the same account" || e.message === "Source account not found" || e.message === "Destination account not found" || e.message === "Insufficient available balance in source account" ? e.message : e.code === "23505" ? "Transfer number already exists" : "Failed to create transfer", e.message === "Source account not found" || e.message === "Destination account not found" ? 404 : e.message === "Insufficient available balance in source account" ? 422 : 400); }
  finally { client.release(); }
});

router.post("/transfers/:id/authorize", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const trId = parsedId(req.params.id as string); if (!trId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update treasury_transfers set status='authorized',updated_at=now() where id=$1 and org_id=$2 and status='draft' returning *`,
      [trId, org(req)]);
    if (!r.rows[0]) return fail(res, "Transfer not found or not in draft state", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to authorize transfer", 500); }
});

router.post("/transfers/:id/execute", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const trId = parsedId(req.params.id as string); if (!trId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const t = await client.query(`select * from treasury_transfers where id=$1 and org_id=$2 for update`, [trId, o]);
    if (!t.rows[0]) throw new Error("Transfer not found");
    if (t.rows[0].status !== "authorized") throw new Error("Transfer must be authorized before execution");
    const fromAcct = await client.query(`select * from treasury_accounts where id=$1 and org_id=$2 for update`, [t.rows[0].from_account_id, o]);
    const toAcct = await client.query(`select * from treasury_accounts where id=$1 and org_id=$2 for update`, [t.rows[0].to_account_id, o]);
    if (!fromAcct.rows[0] || !toAcct.rows[0]) throw new Error("Transfer accounts not found");
    const amount = Number(t.rows[0].amount ?? 0);
    const fromBal = Number(fromAcct.rows[0].current_balance ?? 0);
    const fromAvailable = Number(fromAcct.rows[0].available_balance ?? 0);
    const toBal = Number(toAcct.rows[0].current_balance ?? 0);
    if (fromBal < amount || fromAvailable < amount) throw new Error("Insufficient available balance in source account");
    await client.query(`update treasury_accounts set current_balance=$1,available_balance=available_balance-$2,updated_at=now() where id=$3`, [fromBal - amount, amount, t.rows[0].from_account_id]);
    await client.query(`update treasury_accounts set current_balance=$1,available_balance=available_balance+$2,updated_at=now() where id=$3`, [toBal + amount, amount, t.rows[0].to_account_id]);
    const r = await client.query(
      `update treasury_transfers set status='executed',executed_at=now(),updated_at=now() where id=$1 returning *`, [trId]);
    await client.query("commit");
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Transfer not found" || e.message === "Transfer accounts not found" ? e.message : e.message === "Transfer must be authorized before execution" || e.message === "Insufficient available balance in source account" ? e.message : "Failed to execute transfer", e.message === "Transfer not found" || e.message === "Transfer accounts not found" ? 404 : 422); }
  finally { client.release(); }
});

router.delete("/transfers/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const trId = parsedId(req.params.id as string); if (!trId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from treasury_transfers where id=$1 and org_id=$2 and status in ('draft','authorized') returning id`, [trId, org(req)]);
    if (!r.rows[0]) return fail(res, "Transfer not found or already executed", 404);
    res.json({ success: true, data: { id: trId } });
  } catch { fail(res, "Failed to delete transfer", 500); }
});

export default router;