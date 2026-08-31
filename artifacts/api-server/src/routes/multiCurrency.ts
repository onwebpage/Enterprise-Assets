import { Router } from "express";
import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import {
  chartOfAccounts, currencyRevaluationLines, currencyRevaluationRuns, db,
  financeCurrencies, financeExchangeRates, financialPeriods, journalEntries,
  journalEntryLines, organizations, permissions, roles,
} from "@workspace/db";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const currencyInput = z.object({
  code: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(100),
  symbol: z.string().trim().min(1).max(8).default("¤"),
  decimalPlaces: z.coerce.number().int().min(0).max(6).default(2),
  status: z.enum(["active", "inactive"]).default("active"),
});
const rateInput = z.object({
  fromCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  toCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  rate: z.coerce.number().positive().finite(),
  effectiveDate: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD"),
  rateType: z.enum(["spot", "closing", "average"]).default("spot"),
  source: z.string().trim().min(1).max(80).default("manual"),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.fromCurrency === value.toCurrency) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toCurrency"], message: "Currencies must be different" });
  if (!validCalendarDate(value.effectiveDate)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveDate"], message: "Invalid calendar date" });
});
const revaluationLineInput = z.object({
  accountId: z.coerce.number().int().positive(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  foreignBalance: z.coerce.number().finite().refine((value) => value !== 0, "Foreign balance cannot be zero"),
  previousRate: z.coerce.number().positive().finite(),
  currentRate: z.coerce.number().positive().finite(),
});
const revaluationInput = z.object({
  orgId: z.coerce.number().int().positive(),
  valuationDate: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD"),
  baseCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  gainLossAccountId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(500).optional().nullable(),
  lines: z.array(revaluationLineInput).min(1, "At least one exposure line is required"),
});

function validCalendarDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function idFromParam(value: string | string[]) {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
function orgScope(req: AuthRequest, field: any) {
  return req.user!.orgId === null ? undefined : eq(field, req.user!.orgId);
}
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
async function currencyExists(code: string, activeOnly = true) {
  const [row] = await db.select({ code: financeCurrencies.code, status: financeCurrencies.status })
    .from(financeCurrencies).where(and(eq(financeCurrencies.code, code), activeOnly ? eq(financeCurrencies.status, "active") : undefined)).limit(1);
  return row ?? null;
}
async function accountForOrg(id: number, orgId: number) {
  const [row] = await db.select({
    id: chartOfAccounts.id, type: chartOfAccounts.type, status: chartOfAccounts.status,
    orgId: chartOfAccounts.orgId, code: chartOfAccounts.code, name: chartOfAccounts.name,
  }).from(chartOfAccounts).where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.status, "active"), or(eq(chartOfAccounts.orgId, orgId), isNull(chartOfAccounts.orgId)))).limit(1);
  return row ?? null;
}
async function ensureOpenPeriod(orgId: number, date: string) {
  const [period] = await db.select({ status: financialPeriods.status, name: financialPeriods.name })
    .from(financialPeriods).where(and(eq(financialPeriods.orgId, orgId), lte(financialPeriods.startDate, date), gte(financialPeriods.endDate, date)))
    .orderBy(desc(financialPeriods.id)).limit(1);
  if (period && period.status !== "open") throw new Error(`The ${period.name} period is ${period.status.replace("_", " ")} and does not accept postings`);
}
async function nextRunNumber(tx: any = db) {
  const [row] = await tx.select({ max: sql<string>`max(${currencyRevaluationRuns.runNumber})` }).from(currencyRevaluationRuns);
  const max = row?.max ? parseInt(row.max.replace(/^MC-REV-0*/, "") || "0", 10) : 0;
  return `MC-REV-${String(max + 1).padStart(4, "0")}`;
}
async function nextEntryNumber(orgId: number, tx: any) {
  const [row] = await tx.select({ max: sql<string>`max(${journalEntries.entryNumber})` }).from(journalEntries).where(eq(journalEntries.orgId, orgId));
  const max = row?.max ? parseInt(row.max.replace(/^JE-0*/, "") || "0", 10) : 0;
  return `JE-${String(max + 1).padStart(4, "0")}`;
}
async function updateBalance(tx: any, accountId: number, debit: number, credit: number) {
  const [account] = await tx.select({ balance: chartOfAccounts.balance, normalBalance: chartOfAccounts.normalBalance })
    .from(chartOfAccounts).where(eq(chartOfAccounts.id, accountId)).limit(1);
  if (!account) throw new Error("A revaluation account no longer exists");
  const current = Number(account.balance ?? 0);
  const next = account.normalBalance === "Debit" ? current + debit - credit : current + credit - debit;
  await tx.update(chartOfAccounts).set({ balance: next.toFixed(2), updatedAt: new Date() }).where(eq(chartOfAccounts.id, accountId));
}
async function loadRun(req: AuthRequest, id: number) {
  const [run] = await db.select({
    id: currencyRevaluationRuns.id, orgId: currencyRevaluationRuns.orgId, runNumber: currencyRevaluationRuns.runNumber,
    valuationDate: currencyRevaluationRuns.valuationDate, baseCurrency: currencyRevaluationRuns.baseCurrency,
    gainLossAccountId: currencyRevaluationRuns.gainLossAccountId, status: currencyRevaluationRuns.status,
    totalGainLoss: currencyRevaluationRuns.totalGainLoss, journalEntryId: currencyRevaluationRuns.journalEntryId,
    notes: currencyRevaluationRuns.notes, postedAt: currencyRevaluationRuns.postedAt,
    createdAt: currencyRevaluationRuns.createdAt, updatedAt: currencyRevaluationRuns.updatedAt,
    organizationName: organizations.name,
  }).from(currencyRevaluationRuns).innerJoin(organizations, eq(organizations.id, currencyRevaluationRuns.orgId))
    .where(and(eq(currencyRevaluationRuns.id, id), orgScope(req, currencyRevaluationRuns.orgId))).limit(1);
  if (!run) return null;
  const lines = await db.select({
    id: currencyRevaluationLines.id, runId: currencyRevaluationLines.runId, accountId: currencyRevaluationLines.accountId,
    accountCode: chartOfAccounts.code, accountName: chartOfAccounts.name, currency: currencyRevaluationLines.currency,
    foreignBalance: currencyRevaluationLines.foreignBalance, previousRate: currencyRevaluationLines.previousRate,
    currentRate: currencyRevaluationLines.currentRate, previousFunctionalAmount: currencyRevaluationLines.previousFunctionalAmount,
    currentFunctionalAmount: currencyRevaluationLines.currentFunctionalAmount, gainLoss: currencyRevaluationLines.gainLoss,
  }).from(currencyRevaluationLines).innerJoin(chartOfAccounts, eq(chartOfAccounts.id, currencyRevaluationLines.accountId))
    .where(eq(currencyRevaluationLines.runId, id)).orderBy(asc(currencyRevaluationLines.id));
  return { ...run, lines };
}

router.get("/permissions", async (req: AuthRequest, res) => {
  try {
    if (req.user!.roleId === null) { res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } }); return; }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, req.user!.roleId)).limit(1);
    if (role?.isSystem) { res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } }); return; }
    const [permission] = await db.select().from(permissions).where(and(eq(permissions.roleId, req.user!.roleId), eq(permissions.module, "Finance"))).limit(1);
    res.json({ success: true, data: permission ? {
      canView: permission.canView, canCreate: permission.canCreate, canEdit: permission.canEdit, canDelete: permission.canDelete,
    } : { canView: false, canCreate: false, canEdit: false, canDelete: false } });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch multi-currency permissions" }); }
});

router.get("/summary", requirePermission("Finance", "view"), async (req: AuthRequest, res) => {
  try {
    const [currencyCounts] = await db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${financeCurrencies.status} = 'active')::int`,
    }).from(financeCurrencies);
    const [rateCounts] = await db.select({
      total: sql<number>`count(*) filter (where ${financeExchangeRates.status} = 'active')::int`,
      latestDate: sql<string>`max(${financeExchangeRates.effectiveDate})`,
    }).from(financeExchangeRates);
    const runs = await db.select({ status: currencyRevaluationRuns.status, total: currencyRevaluationRuns.totalGainLoss })
      .from(currencyRevaluationRuns).where(orgScope(req, currencyRevaluationRuns.orgId));
    res.json({ success: true, data: {
      currencyCount: currencyCounts?.total ?? 0, activeCurrencyCount: currencyCounts?.active ?? 0,
      activeRateCount: rateCounts?.total ?? 0, latestRateDate: rateCounts?.latestDate ?? null,
      revaluationCount: runs.length, draftRevaluationCount: runs.filter((run) => run.status === "draft").length,
      postedGainLoss: round2(runs.filter((run) => run.status === "posted").reduce((sum, run) => sum + Number(run.total), 0)),
    } });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch multi-currency summary" }); }
});

router.get("/currencies", requirePermission("Finance", "view"), async (_req, res) => {
  try {
    const data = await db.select().from(financeCurrencies).orderBy(asc(financeCurrencies.code));
    res.json({ success: true, data });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch currencies" }); }
});

router.post("/currencies", requirePermission("Finance", "create"), async (req: AuthRequest, res) => {
  const parsed = currencyInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [created] = await db.insert(financeCurrencies).values({ ...parsed.data, createdBy: req.user!.userId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch { res.status(409).json({ success: false, error: "That currency code already exists" }); }
});

router.put("/currencies/:id", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid currency id" }); return; }
  const parsed = currencyInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select().from(financeCurrencies).where(eq(financeCurrencies.id, id)).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Currency not found" }); return; }
    if (existing.code !== parsed.data.code) { res.status(409).json({ success: false, error: "Currency codes cannot be changed after creation" }); return; }
    const [updated] = await db.update(financeCurrencies).set({ ...parsed.data, updatedAt: new Date() }).where(eq(financeCurrencies.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch { res.status(409).json({ success: false, error: "Could not update currency" }); }
});

router.delete("/currencies/:id", requirePermission("Finance", "delete"), async (req, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid currency id" }); return; }
  try {
    const [currency] = await db.select({ code: financeCurrencies.code }).from(financeCurrencies).where(eq(financeCurrencies.id, id)).limit(1);
    if (!currency) { res.status(404).json({ success: false, error: "Currency not found" }); return; }
    const [rate] = await db.select({ id: financeExchangeRates.id }).from(financeExchangeRates)
      .where(or(eq(financeExchangeRates.fromCurrency, currency.code), eq(financeExchangeRates.toCurrency, currency.code))).limit(1);
    const [run] = await db.select({ id: currencyRevaluationRuns.id }).from(currencyRevaluationRuns)
      .where(eq(currencyRevaluationRuns.baseCurrency, currency.code)).limit(1);
    const [line] = await db.select({ id: currencyRevaluationLines.id }).from(currencyRevaluationLines)
      .where(eq(currencyRevaluationLines.currency, currency.code)).limit(1);
    if (rate || run || line) { res.status(409).json({ success: false, error: "Currencies used by rates or revaluations cannot be deleted; mark them inactive instead" }); return; }
    await db.delete(financeCurrencies).where(eq(financeCurrencies.id, id));
    res.json({ success: true, data: { id } });
  } catch { res.status(409).json({ success: false, error: "Currency cannot be deleted because another record references it" }); }
});

router.get("/rates", requirePermission("Finance", "view"), async (req, res) => {
  try {
    const from = typeof req.query.fromCurrency === "string" ? req.query.fromCurrency.toUpperCase() : undefined;
    const to = typeof req.query.toCurrency === "string" ? req.query.toCurrency.toUpperCase() : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filters: any[] = [];
    if (from) filters.push(eq(financeExchangeRates.fromCurrency, from));
    if (to) filters.push(eq(financeExchangeRates.toCurrency, to));
    if (status && ["active", "inactive"].includes(status)) filters.push(eq(financeExchangeRates.status, status));
    if (search) filters.push(or(ilike(financeExchangeRates.source, `%${search}%`), ilike(financeExchangeRates.notes, `%${search}%`)));
    const data = await db.select().from(financeExchangeRates).where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(financeExchangeRates.effectiveDate), asc(financeExchangeRates.fromCurrency));
    res.json({ success: true, data });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch exchange rates" }); }
});

async function validateRateCurrencies(fromCurrency: string, toCurrency: string) {
  const [from, to] = await Promise.all([currencyExists(fromCurrency), currencyExists(toCurrency)]);
  return from && to;
}
router.post("/rates", requirePermission("Finance", "create"), async (req: AuthRequest, res) => {
  const parsed = rateInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  if (!(await validateRateCurrencies(parsed.data.fromCurrency, parsed.data.toCurrency))) { res.status(422).json({ success: false, error: "Both currencies must exist and be active" }); return; }
  try {
    const [created] = await db.insert(financeExchangeRates).values({ ...parsed.data, rate: parsed.data.rate.toFixed(8), createdBy: req.user!.userId, notes: parsed.data.notes ?? null }).returning();
    res.status(201).json({ success: true, data: created });
  } catch { res.status(409).json({ success: false, error: "An exchange rate for this pair, date, and rate type already exists" }); }
});
router.put("/rates/:id", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid exchange rate id" }); return; }
  const parsed = rateInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  if (!(await validateRateCurrencies(parsed.data.fromCurrency, parsed.data.toCurrency))) { res.status(422).json({ success: false, error: "Both currencies must exist and be active" }); return; }
  try {
    const [updated] = await db.update(financeExchangeRates).set({ ...parsed.data, rate: parsed.data.rate.toFixed(8), notes: parsed.data.notes ?? null, updatedAt: new Date() }).where(eq(financeExchangeRates.id, id)).returning();
    if (!updated) { res.status(404).json({ success: false, error: "Exchange rate not found" }); return; }
    res.json({ success: true, data: updated });
  } catch { res.status(409).json({ success: false, error: "An exchange rate for this pair, date, and rate type already exists" }); }
});
router.delete("/rates/:id", requirePermission("Finance", "delete"), async (req, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid exchange rate id" }); return; }
  try {
    const [deleted] = await db.delete(financeExchangeRates).where(eq(financeExchangeRates.id, id)).returning({ id: financeExchangeRates.id });
    if (!deleted) { res.status(404).json({ success: false, error: "Exchange rate not found" }); return; }
    res.json({ success: true, data: deleted });
  } catch { res.status(409).json({ success: false, error: "Exchange rate cannot be deleted" }); }
});

router.post("/convert", requirePermission("Finance", "view"), async (req, res) => {
  const parsed = z.object({
    fromCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    toCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    amount: z.coerce.number().finite().nonnegative(),
    asOfDate: z.string().regex(ISO_DATE).optional(),
    rateType: z.enum(["spot", "closing", "average"]).default("spot"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Enter valid currencies, amount, and date" }); return; }
  const { fromCurrency, toCurrency, amount, asOfDate = new Date().toISOString().slice(0, 10), rateType } = parsed.data;
  if (!validCalendarDate(asOfDate)) { res.status(422).json({ success: false, error: "Invalid calendar date" }); return; }
  if (!(await validateRateCurrencies(fromCurrency, toCurrency)) && fromCurrency !== toCurrency) { res.status(422).json({ success: false, error: "Both currencies must exist and be active" }); return; }
  if (fromCurrency === toCurrency) { res.json({ success: true, data: { amount, convertedAmount: amount, rate: 1, direction: "direct", rateDate: asOfDate, rateType } }); return; }
  const [direct] = await db.select().from(financeExchangeRates).where(and(eq(financeExchangeRates.fromCurrency, fromCurrency), eq(financeExchangeRates.toCurrency, toCurrency), eq(financeExchangeRates.rateType, rateType), eq(financeExchangeRates.status, "active"), lte(financeExchangeRates.effectiveDate, asOfDate))).orderBy(desc(financeExchangeRates.effectiveDate)).limit(1);
  if (direct) { res.json({ success: true, data: { amount, convertedAmount: round2(amount * Number(direct.rate)), rate: Number(direct.rate), direction: "direct", rateDate: direct.effectiveDate, rateType } }); return; }
  const [inverse] = await db.select().from(financeExchangeRates).where(and(eq(financeExchangeRates.fromCurrency, toCurrency), eq(financeExchangeRates.toCurrency, fromCurrency), eq(financeExchangeRates.rateType, rateType), eq(financeExchangeRates.status, "active"), lte(financeExchangeRates.effectiveDate, asOfDate))).orderBy(desc(financeExchangeRates.effectiveDate)).limit(1);
  if (!inverse) { res.status(404).json({ success: false, error: "No active exchange rate exists for this pair on or before the selected date" }); return; }
  const rate = 1 / Number(inverse.rate);
  res.json({ success: true, data: { amount, convertedAmount: round2(amount * rate), rate, direction: "inverse", rateDate: inverse.effectiveDate, rateType } });
});

async function calculateLines(lines: z.infer<typeof revaluationLineInput>[]) {
  return lines.map((line) => {
    const previousFunctionalAmount = round2(line.foreignBalance * line.previousRate);
    const currentFunctionalAmount = round2(line.foreignBalance * line.currentRate);
    return { ...line, previousFunctionalAmount, currentFunctionalAmount, gainLoss: round2(currentFunctionalAmount - previousFunctionalAmount) };
  });
}
async function validateRevaluation(req: AuthRequest, value: z.infer<typeof revaluationInput>) {
  if (req.user!.orgId !== null && value.orgId !== req.user!.orgId) return "You can only revalue your company";
  if (!validCalendarDate(value.valuationDate)) return "Invalid valuation date";
  const [organization] = await db.select({ currency: organizations.currency, status: organizations.status }).from(organizations).where(eq(organizations.id, value.orgId)).limit(1);
  if (!organization || organization.status !== "active") return "Company not found or inactive";
  if (organization.currency && organization.currency.toUpperCase() !== value.baseCurrency) return `Base currency must match the company's functional currency (${organization.currency.toUpperCase()})`;
  if (!(await currencyExists(value.baseCurrency))) return "Base currency must exist and be active";
  const gainLossAccount = await accountForOrg(value.gainLossAccountId, value.orgId);
  if (!gainLossAccount || !["Income", "Expense"].includes(gainLossAccount.type)) return "Gain/loss account must be an active Income or Expense account";
  for (const line of value.lines) {
    if (!(await currencyExists(line.currency))) return `Currency ${line.currency} must exist and be active`;
    if (!await accountForOrg(line.accountId, value.orgId)) return `Each exposure account must be active and belong to the company`;
  }
  return null;
}
async function createRun(req: AuthRequest, value: z.infer<typeof revaluationInput>, tx: any = db) {
  const calculated = await calculateLines(value.lines);
  const totalGainLoss = round2(calculated.reduce((sum, line) => sum + line.gainLoss, 0));
  const [run] = await tx.insert(currencyRevaluationRuns).values({
    orgId: value.orgId, runNumber: await nextRunNumber(tx), valuationDate: value.valuationDate,
    baseCurrency: value.baseCurrency, gainLossAccountId: value.gainLossAccountId, totalGainLoss: totalGainLoss.toFixed(2),
    notes: value.notes ?? null, createdBy: req.user!.userId,
  }).returning();
  await tx.insert(currencyRevaluationLines).values(calculated.map((line) => ({
    runId: run.id, accountId: line.accountId, currency: line.currency, foreignBalance: line.foreignBalance.toFixed(8),
    previousRate: line.previousRate.toFixed(8), currentRate: line.currentRate.toFixed(8),
    previousFunctionalAmount: line.previousFunctionalAmount.toFixed(2), currentFunctionalAmount: line.currentFunctionalAmount.toFixed(2),
    gainLoss: line.gainLoss.toFixed(2),
  })));
  return run;
}

router.get("/revaluations", requirePermission("Finance", "view"), async (req, res) => {
  try {
    const data = await db.select({
      id: currencyRevaluationRuns.id, orgId: currencyRevaluationRuns.orgId, runNumber: currencyRevaluationRuns.runNumber,
      valuationDate: currencyRevaluationRuns.valuationDate, baseCurrency: currencyRevaluationRuns.baseCurrency,
      gainLossAccountId: currencyRevaluationRuns.gainLossAccountId, status: currencyRevaluationRuns.status,
      totalGainLoss: currencyRevaluationRuns.totalGainLoss, journalEntryId: currencyRevaluationRuns.journalEntryId,
      notes: currencyRevaluationRuns.notes, postedAt: currencyRevaluationRuns.postedAt, createdAt: currencyRevaluationRuns.createdAt,
      organizationName: organizations.name,
    }).from(currencyRevaluationRuns).innerJoin(organizations, eq(organizations.id, currencyRevaluationRuns.orgId))
      .where(orgScope(req as AuthRequest, currencyRevaluationRuns.orgId)).orderBy(desc(currencyRevaluationRuns.valuationDate), desc(currencyRevaluationRuns.id));
    res.json({ success: true, data });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch revaluation runs" }); }
});
router.get("/revaluations/:id", requirePermission("Finance", "view"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid revaluation id" }); return; }
  try { const run = await loadRun(req, id); if (!run) { res.status(404).json({ success: false, error: "Revaluation run not found" }); return; } res.json({ success: true, data: run }); }
  catch { res.status(500).json({ success: false, error: "Failed to fetch revaluation run" }); }
});
router.post("/revaluations", requirePermission("Finance", "create"), async (req: AuthRequest, res) => {
  const parsed = revaluationInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  const validationError = await validateRevaluation(req, parsed.data);
  if (validationError) { res.status(422).json({ success: false, error: validationError }); return; }
  try { const run = await db.transaction((tx) => createRun(req, parsed.data, tx)); res.status(201).json({ success: true, data: run }); }
  catch (error) { req.log.error(error, "Failed to create currency revaluation"); res.status(500).json({ success: false, error: "Failed to create revaluation run" }); }
});
router.put("/revaluations/:id", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid revaluation id" }); return; }
  const parsed = revaluationInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  const validationError = await validateRevaluation(req, parsed.data);
  if (validationError) { res.status(422).json({ success: false, error: validationError }); return; }
  try {
    const existing = await loadRun(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Revaluation run not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft revaluation runs can be edited" }); return; }
    const calculated = await calculateLines(parsed.data.lines);
    const total = round2(calculated.reduce((sum, line) => sum + line.gainLoss, 0));
    await db.transaction(async (tx) => {
      await tx.delete(currencyRevaluationLines).where(eq(currencyRevaluationLines.runId, id));
      await tx.insert(currencyRevaluationLines).values(calculated.map((line) => ({
        runId: id, accountId: line.accountId, currency: line.currency, foreignBalance: line.foreignBalance.toFixed(8),
        previousRate: line.previousRate.toFixed(8), currentRate: line.currentRate.toFixed(8),
        previousFunctionalAmount: line.previousFunctionalAmount.toFixed(2), currentFunctionalAmount: line.currentFunctionalAmount.toFixed(2), gainLoss: line.gainLoss.toFixed(2),
      })));
      await tx.update(currencyRevaluationRuns).set({
        orgId: parsed.data.orgId, valuationDate: parsed.data.valuationDate, baseCurrency: parsed.data.baseCurrency,
        gainLossAccountId: parsed.data.gainLossAccountId, totalGainLoss: total.toFixed(2), notes: parsed.data.notes ?? null, updatedAt: new Date(),
      }).where(eq(currencyRevaluationRuns.id, id));
    });
    res.json({ success: true, data: await loadRun(req, id) });
  } catch (error) { req.log.error(error, "Failed to update currency revaluation"); res.status(500).json({ success: false, error: "Failed to update revaluation run" }); }
});
router.delete("/revaluations/:id", requirePermission("Finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid revaluation id" }); return; }
  try {
    const existing = await loadRun(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Revaluation run not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft revaluation runs can be deleted" }); return; }
    await db.delete(currencyRevaluationRuns).where(eq(currencyRevaluationRuns.id, id));
    res.json({ success: true, data: { id } });
  } catch { res.status(500).json({ success: false, error: "Failed to delete revaluation run" }); }
});

router.post("/revaluations/:id/post", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid revaluation id" }); return; }
  try {
    const existing = await loadRun(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Revaluation run not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft revaluation runs can be posted" }); return; }
    await ensureOpenPeriod(existing.orgId, existing.valuationDate);
    const [gainLossAccount] = await db.select({ normalBalance: chartOfAccounts.normalBalance }).from(chartOfAccounts).where(eq(chartOfAccounts.id, existing.gainLossAccountId)).limit(1);
    if (!gainLossAccount) throw new Error("Gain/loss account no longer exists");
    const positiveLines = existing.lines.filter((line) => Number(line.gainLoss) > 0);
    const negativeLines = existing.lines.filter((line) => Number(line.gainLoss) < 0);
    const entryLines = [...positiveLines.map((line) => ({ accountId: line.accountId, debit: Math.abs(Number(line.gainLoss)), credit: 0, description: `${line.currency} revaluation — ${line.accountName}` })),
      ...negativeLines.map((line) => ({ accountId: line.accountId, debit: 0, credit: Math.abs(Number(line.gainLoss)), description: `${line.currency} revaluation — ${line.accountName}` }))];
    const total = round2(entryLines.reduce((sum, line) => sum + line.debit + line.credit, 0));
    if (total > 0) entryLines.push({ accountId: existing.gainLossAccountId, debit: round2(negativeLines.reduce((sum, line) => sum + Math.abs(Number(line.gainLoss)), 0)), credit: round2(positiveLines.reduce((sum, line) => sum + Number(line.gainLoss), 0)), description: `FX gain/loss — ${existing.runNumber}` });
    const result = await db.transaction(async (tx) => {
      let journalEntryId: number | null = null;
      if (total > 0) {
        const debitTotal = round2(entryLines.reduce((sum, line) => sum + line.debit, 0));
        const creditTotal = round2(entryLines.reduce((sum, line) => sum + line.credit, 0));
        const [entry] = await tx.insert(journalEntries).values({
          orgId: existing.orgId, entryNumber: await nextEntryNumber(existing.orgId, tx), date: existing.valuationDate,
          reference: existing.runNumber, memo: `Foreign currency revaluation ${existing.runNumber}`, status: "posted",
          totalDebit: debitTotal.toFixed(2), totalCredit: creditTotal.toFixed(2), createdBy: req.user!.userId,
        }).returning();
        await tx.insert(journalEntryLines).values(entryLines.map((line, sequence) => ({
          journalEntryId: entry.id, accountId: line.accountId, description: line.description,
          debit: line.debit.toFixed(2), credit: line.credit.toFixed(2), sequence,
        })));
        for (const line of entryLines) await updateBalance(tx, line.accountId, line.debit, line.credit);
        journalEntryId = entry.id;
      }
      await tx.update(currencyRevaluationRuns).set({ status: "posted", journalEntryId, postedBy: req.user!.userId, postedAt: new Date(), updatedAt: new Date() }).where(eq(currencyRevaluationRuns.id, id));
      return journalEntryId;
    });
    res.json({ success: true, data: { ...(await loadRun(req, id)), journalEntryId: result } });
  } catch (error: any) { req.log.error(error, "Failed to post currency revaluation"); res.status(409).json({ success: false, error: error?.message ?? "Failed to post revaluation" }); }
});

router.post("/revaluations/:id/void", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid revaluation id" }); return; }
  try {
    const existing = await loadRun(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Revaluation run not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft revaluation runs can be voided" }); return; }
    await db.update(currencyRevaluationRuns).set({ status: "void", updatedAt: new Date() }).where(eq(currencyRevaluationRuns.id, id));
    res.json({ success: true, data: { id, status: "void" } });
  } catch { res.status(500).json({ success: false, error: "Failed to void revaluation run" }); }
});

export default router;