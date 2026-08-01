/**
 * /api/finance/ledger — General Ledger: Journal Entries + Account Ledger View
 *
 * All routes require authentication + finance module permission.
 *
 * Journal Entry lifecycle:
 *   draft → posted (immutable) → void (reversal, future)
 *
 * Posting validates Σdebit == Σcredit and updates chart_of_accounts.balance.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, gte, lte, desc, asc, inArray } from "drizzle-orm";
import {
  db,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  permissions,
  roles,
} from "@workspace/db";
import {
  insertJournalEntrySchema,
  updateJournalEntrySchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────

function orgScope(req: AuthRequest) {
  const { orgId } = req.user!;
  return orgId !== null
    ? eq(journalEntries.orgId, orgId)
    : sql`${journalEntries.orgId} is null`;
}

function coaOrgScope(req: AuthRequest) {
  const { orgId } = req.user!;
  return orgId !== null
    ? or(eq(chartOfAccounts.orgId, orgId), sql`${chartOfAccounts.orgId} is null`)
    : sql`${chartOfAccounts.orgId} is null`;
}

/** Generate the next entry number: JE-NNNN scoped to org. */
async function nextEntryNumber(orgId: number | null): Promise<string> {
  const [row] = await db
    .select({ max: sql<string>`max(${journalEntries.entryNumber})` })
    .from(journalEntries)
    .where(
      orgId !== null
        ? eq(journalEntries.orgId, orgId)
        : sql`${journalEntries.orgId} is null`,
    );

  const maxNum = row?.max
    ? parseInt(row.max.replace(/^JE-0*/, "") || "0", 10)
    : 0;

  return `JE-${String(maxNum + 1).padStart(4, "0")}`;
}

/** Fetch full JE with joined lines + account info. */
async function fetchJEWithLines(id: number) {
  const [header] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);

  if (!header) return null;

  const lines = await db
    .select({
      id:             journalEntryLines.id,
      journalEntryId: journalEntryLines.journalEntryId,
      accountId:      journalEntryLines.accountId,
      accountCode:    chartOfAccounts.code,
      accountName:    chartOfAccounts.name,
      accountType:    chartOfAccounts.type,
      normalBalance:  chartOfAccounts.normalBalance,
      description:    journalEntryLines.description,
      debit:          journalEntryLines.debit,
      credit:         journalEntryLines.credit,
      sequence:       journalEntryLines.sequence,
    })
    .from(journalEntryLines)
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(eq(journalEntryLines.journalEntryId, id))
    .orderBy(asc(journalEntryLines.sequence), asc(journalEntryLines.id));

  return { ...header, lines };
}

// ── GET /api/finance/ledger/my-permissions ────────────────────────────────────
router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      return res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      return res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
    }
    const [perm] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = 'finance'`))
      .limit(1);
    res.json({
      success: true,
      data: perm
        ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
        : { canView: false, canCreate: false, canEdit: false, canDelete: false },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── GET /api/finance/ledger/journal-entries ───────────────────────────────────
// Query: search, dateFrom, dateTo, accountId, status, page, limit
router.get("/journal-entries", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 50))));
    const offset = (page - 1) * limit;
    const { search, dateFrom, dateTo, status, accountId } = req.query as Record<string, string>;

    const filters: any[] = [orgScope(req)];

    if (search?.trim()) {
      filters.push(
        or(
          ilike(journalEntries.entryNumber, `%${search.trim()}%`),
          ilike(journalEntries.memo,        `%${search.trim()}%`),
          ilike(journalEntries.reference,   `%${search.trim()}%`),
        ),
      );
    }
    if (status)   filters.push(eq(journalEntries.status, status));
    if (dateFrom) filters.push(gte(journalEntries.date, dateFrom));
    if (dateTo)   filters.push(lte(journalEntries.date, dateTo));

    // If filtering by accountId, restrict to JEs that have a line for that account
    let jeIdsForAccount: number[] | null = null;
    if (accountId && !isNaN(parseInt(accountId))) {
      const accId = parseInt(accountId);
      const rows = await db
        .selectDistinct({ jeId: journalEntryLines.journalEntryId })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.accountId, accId));
      jeIdsForAccount = rows.map((r) => r.jeId);
      if (jeIdsForAccount.length === 0) {
        return res.json({ success: true, data: [], total: 0, page, limit, totalPages: 0 });
      }
      filters.push(inArray(journalEntries.id, jeIdsForAccount));
    }

    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(journalEntries).where(where).orderBy(desc(journalEntries.date), desc(journalEntries.id)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(journalEntries).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch journal entries" });
  }
});

// ── GET /api/finance/ledger/summary ──────────────────────────────────────────
// Ledger summary: per-account totals from posted JE lines, with optional date range.
// Query: dateFrom, dateTo
router.get("/summary", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;

    // Build date filters on the joined journal_entries table
    const jeFilters: any[] = [
      eq(journalEntries.status, "posted"),
      orgScope(req),
    ];
    if (dateFrom) jeFilters.push(gte(journalEntries.date, dateFrom));
    if (dateTo)   jeFilters.push(lte(journalEntries.date, dateTo));

    const rows = await db
      .select({
        accountId:     chartOfAccounts.id,
        accountCode:   chartOfAccounts.code,
        accountName:   chartOfAccounts.name,
        accountType:   chartOfAccounts.type,
        normalBalance: chartOfAccounts.normalBalance,
        currentBalance: chartOfAccounts.balance,
        totalDebit:  sql<string>`coalesce(sum(${journalEntryLines.debit}),  '0')`,
        totalCredit: sql<string>`coalesce(sum(${journalEntryLines.credit}), '0')`,
        lineCount:   sql<number>`count(${journalEntryLines.id})::int`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries,  and(...jeFilters.map((f) => f), eq(journalEntries.id, journalEntryLines.journalEntryId)))
      .innerJoin(chartOfAccounts, and(eq(chartOfAccounts.id, journalEntryLines.accountId), coaOrgScope(req) as any))
      .groupBy(
        chartOfAccounts.id,
        chartOfAccounts.code,
        chartOfAccounts.name,
        chartOfAccounts.type,
        chartOfAccounts.normalBalance,
        chartOfAccounts.balance,
      )
      .orderBy(asc(chartOfAccounts.code));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch ledger summary" });
  }
});

// ── GET /api/finance/ledger/account-entries ───────────────────────────────────
// Ledger entries for a single account: all posted JE lines with running balance.
// Query: accountId (required), dateFrom, dateTo, page, limit
router.get("/account-entries", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const { accountId, dateFrom, dateTo } = req.query as Record<string, string>;
    if (!accountId || isNaN(parseInt(accountId))) {
      return res.status(400).json({ success: false, error: "accountId is required" });
    }
    const accId = parseInt(accountId);
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? 100))));
    const offset = (page - 1) * limit;

    // Fetch the account (verify it exists and is in scope)
    const [account] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, accId), coaOrgScope(req) as any))
      .limit(1);
    if (!account) return res.status(404).json({ success: false, error: "Account not found" });

    // Build JE filters (posted only)
    const jeFilters: any[] = [
      eq(journalEntries.status, "posted"),
      orgScope(req),
    ];
    if (dateFrom) jeFilters.push(gte(journalEntries.date, dateFrom));
    if (dateTo)   jeFilters.push(lte(journalEntries.date, dateTo));

    // Compute net change from all posted lines for this account IN the range
    // net change (for debit-normal): Σ(debit - credit); for credit-normal: Σ(credit - debit)
    // opening balance = current balance - net change in range
    const [netRow] = await db
      .select({
        sumDebit:  sql<string>`coalesce(sum(${journalEntryLines.debit}),  '0')`,
        sumCredit: sql<string>`coalesce(sum(${journalEntryLines.credit}), '0')`,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        and(
          eq(journalEntries.id, journalEntryLines.journalEntryId),
          ...jeFilters,
        ),
      )
      .where(eq(journalEntryLines.accountId, accId));

    const sumDebitInRange  = parseFloat(netRow?.sumDebit  ?? "0");
    const sumCreditInRange = parseFloat(netRow?.sumCredit ?? "0");
    const currentBalance   = parseFloat(account.balance ?? "0");

    // opening balance = current - net effect of lines in range
    let openingBalance: number;
    if (account.normalBalance === "Debit") {
      openingBalance = currentBalance - (sumDebitInRange - sumCreditInRange);
    } else {
      openingBalance = currentBalance - (sumCreditInRange - sumDebitInRange);
    }

    // Count total lines
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        and(eq(journalEntries.id, journalEntryLines.journalEntryId), ...jeFilters),
      )
      .where(eq(journalEntryLines.accountId, accId));

    // Fetch the page of lines
    const lines = await db
      .select({
        id:          journalEntryLines.id,
        date:        journalEntries.date,
        entryNumber: journalEntries.entryNumber,
        reference:   journalEntries.reference,
        memo:        journalEntries.memo,
        description: journalEntryLines.description,
        debit:       journalEntryLines.debit,
        credit:      journalEntryLines.credit,
        sequence:    journalEntryLines.sequence,
        jeId:        journalEntries.id,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        and(eq(journalEntries.id, journalEntryLines.journalEntryId), ...jeFilters),
      )
      .where(eq(journalEntryLines.accountId, accId))
      .orderBy(asc(journalEntries.date), asc(journalEntries.id), asc(journalEntryLines.sequence))
      .limit(limit)
      .offset(offset);

    // Compute running balance starting from opening (for pages beyond page 1, we need the carry-forward)
    // For page > 1, compute carry-forward balance up to the offset
    let runningBalance = openingBalance;
    if (offset > 0) {
      // Get the net change of all lines BEFORE this page
      const [carryRow] = await db
        .select({
          sumDebit:  sql<string>`coalesce(sum(${journalEntryLines.debit}),  '0')`,
          sumCredit: sql<string>`coalesce(sum(${journalEntryLines.credit}), '0')`,
        })
        .from(journalEntryLines)
        .innerJoin(
          journalEntries,
          and(eq(journalEntries.id, journalEntryLines.journalEntryId), ...jeFilters),
        )
        .where(eq(journalEntryLines.accountId, accId))
        .orderBy(asc(journalEntries.date), asc(journalEntries.id), asc(journalEntryLines.sequence))
        .limit(offset);
      // Carry-forward net change
      const cd = parseFloat((carryRow as any)?.sumDebit  ?? "0");
      const cc = parseFloat((carryRow as any)?.sumCredit ?? "0");
      if (account.normalBalance === "Debit") {
        runningBalance = openingBalance + (cd - cc);
      } else {
        runningBalance = openingBalance + (cc - cd);
      }
    }

    // Attach running balance to each line
    const linesWithBalance = lines.map((line) => {
      const d = parseFloat(line.debit  ?? "0");
      const c = parseFloat(line.credit ?? "0");
      if (account.normalBalance === "Debit") {
        runningBalance = runningBalance + d - c;
      } else {
        runningBalance = runningBalance + c - d;
      }
      return { ...line, runningBalance };
    });

    res.json({
      success: true,
      account,
      openingBalance,
      closingBalance: currentBalance,
      totalDebitInRange:  sumDebitInRange,
      totalCreditInRange: sumCreditInRange,
      data:       linesWithBalance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch account ledger" });
  }
});

// ── GET /api/finance/ledger/journal-entries/:id ───────────────────────────────
router.get("/journal-entries/:id", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });
  try {
    const je = await fetchJEWithLines(id);
    if (!je) return res.status(404).json({ success: false, error: "Journal entry not found" });
    // Scope check
    const { orgId } = req.user!;
    if (orgId !== null && je.orgId !== null && je.orgId !== orgId) {
      return res.status(404).json({ success: false, error: "Journal entry not found" });
    }
    res.json({ success: true, data: je });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch journal entry" });
  }
});

// ── POST /api/finance/ledger/journal-entries ──────────────────────────────────
router.post("/journal-entries", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  const parsed = insertJournalEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
  }

  const { date, reference, memo, lines } = parsed.data;
  const { orgId, userId } = req.user!;

  // Validate debit/credit amounts on each line
  for (const line of lines) {
    const d = parseFloat(line.debit  ?? "0");
    const c = parseFloat(line.credit ?? "0");
    if (d < 0 || c < 0) {
      return res.status(422).json({ success: false, error: "Debit and credit amounts must be non-negative" });
    }
    if (d === 0 && c === 0) {
      return res.status(422).json({ success: false, error: "Each line must have a non-zero debit or credit" });
    }
  }

  // Compute totals
  const totalDebit  = lines.reduce((s, l) => s + parseFloat(l.debit  ?? "0"), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit ?? "0"), 0);

  try {
    const entryNumber = await nextEntryNumber(orgId);

    const [header] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        date,
        reference: reference ?? null,
        memo,
        status: "draft",
        totalDebit:  totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        createdBy: (userId as any) ?? null,
      })
      .returning();

    // Insert lines
    if (lines.length > 0) {
      await db.insert(journalEntryLines).values(
        lines.map((l, i) => ({
          journalEntryId: header.id,
          accountId:      l.accountId,
          description:    l.description ?? null,
          debit:          l.debit  ?? "0",
          credit:         l.credit ?? "0",
          sequence:       l.sequence ?? i,
        })),
      );
    }

    const full = await fetchJEWithLines(header.id);
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to create journal entry" });
  }
});

// ── PUT /api/finance/ledger/journal-entries/:id ───────────────────────────────
// Only draft entries may be edited.
router.put("/journal-entries/:id", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  const parsed = updateJournalEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
  }

  try {
    const [existing] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Journal entry not found" });

    const { orgId } = req.user!;
    if (orgId !== null && existing.orgId !== null && existing.orgId !== orgId) {
      return res.status(404).json({ success: false, error: "Journal entry not found" });
    }
    if (existing.status !== "draft") {
      return res.status(409).json({ success: false, error: `Cannot edit a ${existing.status} journal entry` });
    }

    const { date, reference, memo, lines } = parsed.data;

    // Validate lines
    for (const line of lines) {
      const d = parseFloat(line.debit  ?? "0");
      const c = parseFloat(line.credit ?? "0");
      if (d === 0 && c === 0) {
        return res.status(422).json({ success: false, error: "Each line must have a non-zero debit or credit" });
      }
    }

    const totalDebit  = lines.reduce((s, l) => s + parseFloat(l.debit  ?? "0"), 0);
    const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit ?? "0"), 0);

    // Delete existing lines, re-insert
    await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));

    await db.update(journalEntries).set({
      date,
      reference: reference ?? null,
      memo,
      totalDebit:  totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      updatedAt: new Date(),
    }).where(eq(journalEntries.id, id));

    if (lines.length > 0) {
      await db.insert(journalEntryLines).values(
        lines.map((l, i) => ({
          journalEntryId: id,
          accountId:      l.accountId,
          description:    l.description ?? null,
          debit:          l.debit  ?? "0",
          credit:         l.credit ?? "0",
          sequence:       l.sequence ?? i,
        })),
      );
    }

    const full = await fetchJEWithLines(id);
    res.json({ success: true, data: full });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update journal entry" });
  }
});

// ── POST /api/finance/ledger/journal-entries/:id/post ────────────────────────
// Posts a draft journal entry: validates balance, marks posted, updates account balances.
router.post("/journal-entries/:id/post", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    const [existing] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Journal entry not found" });

    const { orgId } = req.user!;
    if (orgId !== null && existing.orgId !== null && existing.orgId !== orgId) {
      return res.status(404).json({ success: false, error: "Journal entry not found" });
    }
    if (existing.status !== "draft") {
      return res.status(409).json({ success: false, error: `Entry is already ${existing.status}` });
    }

    // Fetch lines
    const lines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, id));

    if (lines.length < 2) {
      return res.status(422).json({ success: false, error: "A journal entry must have at least 2 lines" });
    }

    const totalDebit  = lines.reduce((s, l) => s + parseFloat(l.debit  ?? "0"), 0);
    const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit ?? "0"), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      return res.status(422).json({
        success: false,
        error: `Entry is not balanced: debits (${totalDebit.toFixed(2)}) ≠ credits (${totalCredit.toFixed(2)})`,
      });
    }

    // Update account balances for each line
    for (const line of lines) {
      const [account] = await db
        .select({ id: chartOfAccounts.id, balance: chartOfAccounts.balance, normalBalance: chartOfAccounts.normalBalance })
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.id, line.accountId))
        .limit(1);

      if (!account) continue;

      const d = parseFloat(line.debit  ?? "0");
      const c = parseFloat(line.credit ?? "0");
      const currentBal = parseFloat(account.balance ?? "0");

      let newBalance: number;
      if (account.normalBalance === "Debit") {
        newBalance = currentBal + d - c;
      } else {
        newBalance = currentBal + c - d;
      }

      await db
        .update(chartOfAccounts)
        .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(chartOfAccounts.id, account.id));
    }

    // Mark as posted
    await db
      .update(journalEntries)
      .set({ status: "posted", updatedAt: new Date() })
      .where(eq(journalEntries.id, id));

    const full = await fetchJEWithLines(id);
    res.json({ success: true, data: full });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to post journal entry" });
  }
});

// ── DELETE /api/finance/ledger/journal-entries/:id ────────────────────────────
// Only draft entries may be deleted.
router.delete("/journal-entries/:id", requirePermission("finance", "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    const [existing] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Journal entry not found" });

    const { orgId } = req.user!;
    if (orgId !== null && existing.orgId !== null && existing.orgId !== orgId) {
      return res.status(404).json({ success: false, error: "Journal entry not found" });
    }
    if (existing.status !== "draft") {
      return res.status(409).json({ success: false, error: `Cannot delete a ${existing.status} journal entry` });
    }

    // Lines are deleted via cascade
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete journal entry" });
  }
});

export default router;
