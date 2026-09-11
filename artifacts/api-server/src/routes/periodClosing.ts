import { Router } from "express";
import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import {
  db,
  chartOfAccounts,
  financialPeriods,
  journalEntries,
  journalEntryLines,
  yearEndClosings,
  roles,
  permissions,
} from "@workspace/db";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const periodInput = z.object({
  fiscalYear: z.coerce.number().int().min(1900).max(2200),
  name: z.string().trim().min(1).max(120),
  startDate: z.string().regex(ISO_DATE, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(ISO_DATE, "End date must be YYYY-MM-DD"),
  isYearEnd: z.boolean().optional().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.endDate < value.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be on or after start date" });
  }
});

const yearEndInput = z.object({
  retainedEarningsAccountId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(500).optional().nullable(),
});

function idFromParam(value: string | string[]) {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function orgFilter(req: AuthRequest, table: typeof financialPeriods) {
  return req.user!.orgId === null
    ? isNull(table.orgId)
    : eq(table.orgId, req.user!.orgId);
}

function jeOrgFilter(req: AuthRequest) {
  return req.user!.orgId === null
    ? isNull(journalEntries.orgId)
    : eq(journalEntries.orgId, req.user!.orgId);
}

function coaOrgFilter(req: AuthRequest) {
  return req.user!.orgId === null
    ? isNull(chartOfAccounts.orgId)
    : or(eq(chartOfAccounts.orgId, req.user!.orgId), isNull(chartOfAccounts.orgId));
}

function isValidCalendarDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function getPeriod(req: AuthRequest, id: number) {
  const [period] = await db.select()
    .from(financialPeriods)
    .where(and(eq(financialPeriods.id, id), orgFilter(req, financialPeriods)))
    .limit(1);
  return period ?? null;
}

async function countDraftEntries(req: AuthRequest, startDate: string, endDate: string) {
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(journalEntries)
    .where(and(
      jeOrgFilter(req),
      eq(journalEntries.status, "draft"),
      gte(journalEntries.date, startDate),
      lte(journalEntries.date, endDate),
    ));
  return row?.count ?? 0;
}

async function countEntries(req: AuthRequest, startDate: string, endDate: string) {
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(journalEntries)
    .where(and(
      jeOrgFilter(req),
      gte(journalEntries.date, startDate),
      lte(journalEntries.date, endDate),
    ));
  return row?.count ?? 0;
}

async function nextEntryNumber(orgId: number | null, tx: any = db) {
  const [row] = await tx.select({ max: sql<string>`max(${journalEntries.entryNumber})` })
    .from(journalEntries)
    .where(orgId === null ? isNull(journalEntries.orgId) : eq(journalEntries.orgId, orgId));
  const max = row?.max ? parseInt(row.max.replace(/^JE-0*/, "") || "0", 10) : 0;
  return `JE-${String(max + 1).padStart(4, "0")}`;
}

// Period locks are intentionally resolved by date so existing Finance modules
// can continue working without a second period identifier in every request.
export async function assertPostingDateOpen(req: AuthRequest, date: string) {
  if (!isValidCalendarDate(date)) return;
  const [period] = await db.select({ status: financialPeriods.status, name: financialPeriods.name })
    .from(financialPeriods)
    .where(and(
      orgFilter(req, financialPeriods),
      lte(financialPeriods.startDate, date),
      gte(financialPeriods.endDate, date),
    ))
    .orderBy(desc(financialPeriods.id))
    .limit(1);
  if (period && period.status !== "open") {
    throw new Error(`The ${period.name} period is ${period.status.replace("_", " ")} and does not accept postings`);
  }
}

router.get("/permissions", async (req: AuthRequest, res) => {
  try {
    const roleId = req.user?.roleId ?? null;
    const perms = await resolveRoleModulePermissions(roleId, "finance");
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch closing permissions" });
  }
});

router.get("/accounts", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const accounts = await db.select({
      id: chartOfAccounts.id,
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      type: chartOfAccounts.type,
      balance: chartOfAccounts.balance,
    }).from(chartOfAccounts)
      .where(and(coaOrgFilter(req) as any, eq(chartOfAccounts.type, "Equity"), eq(chartOfAccounts.status, "active")))
      .orderBy(asc(chartOfAccounts.code));
    res.json({ success: true, data: accounts });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch equity accounts" });
  }
});

router.get("/periods", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const year = typeof req.query.fiscalYear === "string" ? Number(req.query.fiscalYear) : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filters = [orgFilter(req, financialPeriods)];
    if (status && ["open", "soft_closed", "closed"].includes(status)) filters.push(eq(financialPeriods.status, status));
    if (year !== undefined && Number.isInteger(year)) filters.push(eq(financialPeriods.fiscalYear, year));
    if (search) filters.push(or(ilike(financialPeriods.name, `%${search}%`), ilike(financialPeriods.notes, `%${search}%`))!);

    const [periods, closings] = await Promise.all([
      db.select().from(financialPeriods).where(and(...filters)).orderBy(desc(financialPeriods.startDate), desc(financialPeriods.id)),
      db.select({
        id: yearEndClosings.id,
        periodId: yearEndClosings.periodId,
        fiscalYear: yearEndClosings.fiscalYear,
        closingDate: yearEndClosings.closingDate,
        netIncome: yearEndClosings.netIncome,
        journalEntryId: yearEndClosings.journalEntryId,
        retainedEarningsAccountId: yearEndClosings.retainedEarningsAccountId,
      }).from(yearEndClosings).where(orgFilter(req, yearEndClosings as any)),
    ]);
    const closingByPeriod = new Map(closings.map((closing) => [closing.periodId, closing]));
    const data = periods.map((period) => ({ ...period, closing: closingByPeriod.get(period.id) ?? null }));
    res.json({
      success: true,
      data,
      summary: {
        total: periods.length,
        open: periods.filter((period) => period.status === "open").length,
        softClosed: periods.filter((period) => period.status === "soft_closed").length,
        closed: periods.filter((period) => period.status === "closed").length,
        yearEndClosed: closings.filter((closing) => periods.some((period) => period.id === closing.periodId)).length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch financial periods" });
  }
});

router.get("/periods/:id", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid period id" }); return; }
  try {
    const period = await getPeriod(req, id);
    if (!period) { res.status(404).json({ success: false, error: "Financial period not found" }); return; }
    const [closing] = await db.select().from(yearEndClosings).where(and(eq(yearEndClosings.periodId, id), orgFilter(req, yearEndClosings as any))).limit(1);
    const [draftEntries, entries] = await Promise.all([
      countDraftEntries(req, period.startDate, period.endDate),
      countEntries(req, period.startDate, period.endDate),
    ]);
    res.json({ success: true, data: { ...period, closing: closing ?? null, draftEntries, entries } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch financial period" });
  }
});

router.post("/periods", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  const parsed = periodInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  const value = parsed.data;
  if (!isValidCalendarDate(value.startDate) || !isValidCalendarDate(value.endDate)) {
    res.status(422).json({ success: false, error: "Dates must be real calendar dates" }); return;
  }
  try {
    const overlapping = await db.select({ id: financialPeriods.id, name: financialPeriods.name })
      .from(financialPeriods)
      .where(and(orgFilter(req, financialPeriods), lte(financialPeriods.startDate, value.endDate), gte(financialPeriods.endDate, value.startDate)))
      .limit(1);
    if (overlapping.length) { res.status(409).json({ success: false, error: `Dates overlap the ${overlapping[0].name} period` }); return; }
    const [period] = await db.insert(financialPeriods).values({
      ...value,
      orgId: req.user!.orgId,
      createdBy: req.user!.userId,
      notes: value.notes ?? null,
    }).returning();
    res.status(201).json({ success: true, data: period });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to create financial period" });
  }
});

router.put("/periods/:id", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid period id" }); return; }
  const parsed = periodInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  const value = parsed.data;
  if (!isValidCalendarDate(value.startDate) || !isValidCalendarDate(value.endDate)) {
    res.status(422).json({ success: false, error: "Dates must be real calendar dates" }); return;
  }
  try {
    const existing = await getPeriod(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Financial period not found" }); return; }
    if (existing.status !== "open") { res.status(409).json({ success: false, error: "Only open periods can be edited" }); return; }
    const [closing] = await db.select({ id: yearEndClosings.id }).from(yearEndClosings).where(eq(yearEndClosings.periodId, id)).limit(1);
    if (closing) { res.status(409).json({ success: false, error: "A period with a completed year-end closing cannot be edited" }); return; }
    const overlapping = await db.select({ id: financialPeriods.id, name: financialPeriods.name }).from(financialPeriods)
      .where(and(orgFilter(req, financialPeriods), sql`${financialPeriods.id} <> ${id}`, lte(financialPeriods.startDate, value.endDate), gte(financialPeriods.endDate, value.startDate))).limit(1);
    if (overlapping.length) { res.status(409).json({ success: false, error: `Dates overlap the ${overlapping[0].name} period` }); return; }
    const [period] = await db.update(financialPeriods).set({ ...value, notes: value.notes ?? null, updatedAt: new Date() })
      .where(and(eq(financialPeriods.id, id), orgFilter(req, financialPeriods))).returning();
    res.json({ success: true, data: period });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update financial period" });
  }
});

router.delete("/periods/:id", requirePermission("finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid period id" }); return; }
  try {
    const period = await getPeriod(req, id);
    if (!period) { res.status(404).json({ success: false, error: "Financial period not found" }); return; }
    if (period.status !== "open") { res.status(409).json({ success: false, error: "Only open periods can be deleted" }); return; }
    const [closing] = await db.select({ id: yearEndClosings.id }).from(yearEndClosings).where(eq(yearEndClosings.periodId, id)).limit(1);
    if (closing) { res.status(409).json({ success: false, error: "Completed closing periods cannot be deleted" }); return; }
    if (await countEntries(req, period.startDate, period.endDate)) {
      res.status(409).json({ success: false, error: "Periods with journal entries cannot be deleted" }); return;
    }
    await db.delete(financialPeriods).where(and(eq(financialPeriods.id, id), orgFilter(req, financialPeriods)));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete financial period" });
  }
});

async function changePeriodStatus(req: AuthRequest, res: any, status: "soft_closed" | "closed") {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid period id" }); return; }
  try {
    const period = await getPeriod(req, id);
    if (!period) { res.status(404).json({ success: false, error: "Financial period not found" }); return; }
    if (period.status === "closed") { res.status(409).json({ success: false, error: "Period is already closed" }); return; }
    if (status === "closed" && await countDraftEntries(req, period.startDate, period.endDate)) {
      res.status(409).json({ success: false, error: "Post or remove all draft journal entries before closing this period" }); return;
    }
    const [updated] = await db.update(financialPeriods).set({
      status,
      closedAt: status === "closed" ? new Date() : null,
      closedBy: status === "closed" ? req.user!.userId : null,
      updatedAt: new Date(),
    }).where(and(eq(financialPeriods.id, id), orgFilter(req, financialPeriods))).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: `Failed to ${status === "closed" ? "close" : "soft-close"} period` });
  }
}

router.post("/periods/:id/soft-close", requirePermission("finance", "edit"), (req, res) => changePeriodStatus(req as AuthRequest, res, "soft_closed"));
router.post("/periods/:id/close", requirePermission("finance", "edit"), (req, res) => changePeriodStatus(req as AuthRequest, res, "closed"));

router.post("/periods/:id/reopen", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid period id" }); return; }
  try {
    const period = await getPeriod(req, id);
    if (!period) { res.status(404).json({ success: false, error: "Financial period not found" }); return; }
    const [closing] = await db.select({ id: yearEndClosings.id }).from(yearEndClosings).where(eq(yearEndClosings.periodId, id)).limit(1);
    if (closing) { res.status(409).json({ success: false, error: "A period with a completed year-end closing cannot be reopened" }); return; }
    const [updated] = await db.update(financialPeriods).set({ status: "open", closedAt: null, closedBy: null, updatedAt: new Date() })
      .where(and(eq(financialPeriods.id, id), orgFilter(req, financialPeriods))).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to reopen period" });
  }
});

router.post("/periods/:id/year-end-close", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid period id" }); return; }
  const parsed = yearEndInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const period = await getPeriod(req, id);
    if (!period) { res.status(404).json({ success: false, error: "Financial period not found" }); return; }
    if (!period.isYearEnd) { res.status(422).json({ success: false, error: "Only a year-end period can run year-end closing" }); return; }
    if (period.status !== "open" && period.status !== "soft_closed") { res.status(409).json({ success: false, error: "This period is already closed" }); return; }
    if (await countDraftEntries(req, period.startDate, period.endDate)) {
      res.status(409).json({ success: false, error: "Post or remove all draft journal entries before year-end closing" }); return;
    }
    const [existingClosing] = await db.select({ id: yearEndClosings.id }).from(yearEndClosings).where(eq(yearEndClosings.periodId, id)).limit(1);
    if (existingClosing) { res.status(409).json({ success: false, error: "This period already has a completed year-end closing" }); return; }

    const [retainedEarnings] = await db.select().from(chartOfAccounts).where(and(
      eq(chartOfAccounts.id, parsed.data.retainedEarningsAccountId),
      coaOrgFilter(req) as any,
      eq(chartOfAccounts.type, "Equity"),
      eq(chartOfAccounts.status, "active"),
    )).limit(1);
    if (!retainedEarnings) { res.status(422).json({ success: false, error: "Select an active Equity account for retained earnings" }); return; }

    const aggregates = await db.select({
      accountId: chartOfAccounts.id,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountType: chartOfAccounts.type,
      normalBalance: chartOfAccounts.normalBalance,
      totalDebit: sql<string>`coalesce(sum(${journalEntryLines.debit}), '0')`,
      totalCredit: sql<string>`coalesce(sum(${journalEntryLines.credit}), '0')`,
    }).from(journalEntryLines)
      .innerJoin(journalEntries, and(
        eq(journalEntries.id, journalEntryLines.journalEntryId),
        jeOrgFilter(req),
        eq(journalEntries.status, "posted"),
        gte(journalEntries.date, period.startDate),
        lte(journalEntries.date, period.endDate),
      ))
      .innerJoin(chartOfAccounts, and(eq(chartOfAccounts.id, journalEntryLines.accountId), coaOrgFilter(req) as any))
      .where(or(eq(chartOfAccounts.type, "Income"), eq(chartOfAccounts.type, "Expense")))
      .groupBy(chartOfAccounts.id, chartOfAccounts.code, chartOfAccounts.name, chartOfAccounts.type, chartOfAccounts.normalBalance)
      .orderBy(asc(chartOfAccounts.code));

    const lines: Array<{ accountId: number; description: string; debit: string; credit: string; sequence: number }> = [];
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const row of aggregates) {
      const debit = parseFloat(row.totalDebit ?? "0");
      const credit = parseFloat(row.totalCredit ?? "0");
      const net = row.accountType === "Income" ? credit - debit : debit - credit;
      if (row.accountType === "Income") totalIncome += net;
      else totalExpenses += net;
      if (Math.abs(net) <= 0.005) continue;
      lines.push({
        accountId: row.accountId,
        description: `Close ${row.accountCode} — ${row.accountName}`,
        debit: row.accountType === "Income" ? (net > 0 ? net.toFixed(2) : "0.00") : (net < 0 ? Math.abs(net).toFixed(2) : "0.00"),
        credit: row.accountType === "Income" ? (net < 0 ? Math.abs(net).toFixed(2) : "0.00") : (net > 0 ? net.toFixed(2) : "0.00"),
        sequence: lines.length,
      });
    }
    const netIncome = totalIncome - totalExpenses;
    if (Math.abs(netIncome) <= 0.005 || lines.length === 0) {
      res.status(422).json({ success: false, error: "There is no non-zero income or expense activity to close for this period" }); return;
    }
    lines.push({
      accountId: retainedEarnings.id,
      description: `Transfer FY ${period.fiscalYear} ${netIncome >= 0 ? "net profit" : "net loss"} to retained earnings`,
      debit: netIncome < 0 ? Math.abs(netIncome).toFixed(2) : "0.00",
      credit: netIncome > 0 ? netIncome.toFixed(2) : "0.00",
      sequence: lines.length,
    });
    const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
    const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      res.status(500).json({ success: false, error: "Closing entry could not be balanced" }); return;
    }

    const result = await db.transaction(async (tx) => {
      const entryNumber = await nextEntryNumber(req.user!.orgId, tx);
      const [header] = await tx.insert(journalEntries).values({
        orgId: req.user!.orgId,
        entryNumber,
        date: period.endDate,
        reference: `YEC-${period.fiscalYear}`,
        memo: `Year-end closing — FY ${period.fiscalYear}`,
        status: "posted",
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        createdBy: req.user!.userId,
      }).returning();
      await tx.insert(journalEntryLines).values(lines.map((line) => ({ ...line, journalEntryId: header.id })));

      for (const line of lines) {
        const [account] = await tx.select({
          id: chartOfAccounts.id,
          balance: chartOfAccounts.balance,
          normalBalance: chartOfAccounts.normalBalance,
        }).from(chartOfAccounts).where(eq(chartOfAccounts.id, line.accountId)).limit(1);
        if (!account) continue;
        const debit = parseFloat(line.debit);
        const credit = parseFloat(line.credit);
        const current = parseFloat(account.balance ?? "0");
        const balance = account.normalBalance === "Debit" ? current + debit - credit : current + credit - debit;
        await tx.update(chartOfAccounts).set({ balance: balance.toFixed(2), updatedAt: new Date() }).where(eq(chartOfAccounts.id, account.id));
      }
      const [updatedPeriod] = await tx.update(financialPeriods).set({
        status: "closed",
        closedAt: new Date(),
        closedBy: req.user!.userId,
        updatedAt: new Date(),
      }).where(and(eq(financialPeriods.id, id), orgFilter(req, financialPeriods))).returning();
      const [closing] = await tx.insert(yearEndClosings).values({
        orgId: req.user!.orgId,
        periodId: id,
        fiscalYear: period.fiscalYear,
        closingDate: period.endDate,
        retainedEarningsAccountId: retainedEarnings.id,
        journalEntryId: header.id,
        netIncome: netIncome.toFixed(2),
        status: "completed",
        notes: parsed.data.notes ?? null,
        createdBy: req.user!.userId,
      }).returning();
      return { header, closing, period: updatedPeriod };
    });
    res.status(201).json({ success: true, data: { ...result.closing, journalEntry: result.header, period: result.period } });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error?.message?.includes("period") ? error.message : "Failed to complete year-end closing" });
  }
});

router.get("/closings", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const data = await db.select({
      id: yearEndClosings.id,
      periodId: yearEndClosings.periodId,
      fiscalYear: yearEndClosings.fiscalYear,
      closingDate: yearEndClosings.closingDate,
      netIncome: yearEndClosings.netIncome,
      status: yearEndClosings.status,
      journalEntryId: yearEndClosings.journalEntryId,
      retainedEarningsAccountId: yearEndClosings.retainedEarningsAccountId,
      completedAt: yearEndClosings.completedAt,
      periodName: financialPeriods.name,
    }).from(yearEndClosings)
      .innerJoin(financialPeriods, eq(financialPeriods.id, yearEndClosings.periodId))
      .where(and(orgFilter(req, yearEndClosings as any), orgFilter(req, financialPeriods)))
      .orderBy(desc(yearEndClosings.completedAt));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch year-end closings" });
  }
});

export default router;