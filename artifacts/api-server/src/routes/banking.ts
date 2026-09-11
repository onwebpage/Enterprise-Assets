/**
 * /api/banking — Bank Accounts, Transactions, Reconciliations
 *
 * All routes require authentication + "Banking" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc, inArray } from "drizzle-orm";
import {
  db, permissions, roles,
  bankAccounts, bankTransactions, bankReconciliations, bankReconciliationItems,
  bankStatementImports, journalEntries, journalEntryLines,
  chequeBooks, cheques,
  organizations,
} from "@workspace/db";
import {
  insertBankAccountSchema, updateBankAccountSchema,
  insertBankTransactionSchema, updateBankTransactionSchema,
  insertBankReconciliationSchema, updateBankReconciliationSchema,
  insertChequeBookSchema, updateChequeBookSchema, insertChequeSchema, updateChequeSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Banking";

function chequeNumber(prefix: string | null, number: number) {
  return `${prefix ?? ""}${String(number).padStart(6, "0")}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMyPermissions(roleId: number | null) {
  if (roleId === null) return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
  if (role?.isSystem) return { canView: true, canCreate: true, canEdit: true, canDelete: true };
  const [perm] = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
    .limit(1);
  return perm
    ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
    : { canView: false, canCreate: false, canEdit: false, canDelete: false };
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const perms = await getMyPermissions(req.user!.roleId);
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [{ totalBalance }] = await db
      .select({ totalBalance: sql<string>`coalesce(sum(current_balance), 0)::text` })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.orgId, orgId), sql`status = 'active'`));

    const [{ accountCount }] = await db
      .select({ accountCount: sql<number>`count(*)::int` })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.orgId, orgId), sql`status = 'active'`));

    const [{ unreconciledCount }] = await db
      .select({ unreconciledCount: sql<number>`count(*)::int` })
      .from(bankTransactions)
      .where(and(eq(bankTransactions.orgId, orgId), sql`status = 'unreconciled'`));

    const [{ completedReconciliations }] = await db
      .select({ completedReconciliations: sql<number>`count(*)::int` })
      .from(bankReconciliations)
      .where(and(eq(bankReconciliations.orgId, orgId), sql`status = 'completed'`));

    res.json({ success: true, data: { totalBalance, accountCount, unreconciledCount, completedReconciliations } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ── Bank Accounts ─────────────────────────────────────────────────────────────

router.get("/accounts", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10)));
    const offset = (page - 1) * limit;

    const conditions = [eq(bankAccounts.orgId, orgId)];
    if (search) conditions.push(ilike(bankAccounts.name, `%${search}%`));
    if (status) conditions.push(sql`${bankAccounts.status} = ${status}`);

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(bankAccounts).where(where);
    const rows = await db.select().from(bankAccounts).where(where).orderBy(desc(bankAccounts.createdAt)).limit(limit).offset(offset);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch bank accounts" });
  }
});

router.get("/accounts/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.orgId, orgId))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Account not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch account" });
  }
});

router.post("/accounts", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const data = insertBankAccountSchema.parse(req.body);
    const [row] = await db.insert(bankAccounts).values({ ...data, orgId }).returning();
    res.status(201).json({ success: true, data: row });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.put("/accounts/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const data = updateBankAccountSchema.parse(req.body);
    const [row] = await db.update(bankAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.orgId, orgId)))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Account not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.delete("/accounts/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [txn] = await db.select({ id: bankTransactions.id }).from(bankTransactions)
      .where(and(eq(bankTransactions.bankAccountId, id), eq(bankTransactions.orgId, orgId))).limit(1);
    if (txn) { res.status(400).json({ success: false, error: "Cannot delete an account with transactions." }); return; }
    const [row] = await db.delete(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.orgId, orgId))).returning();
    if (!row) { res.status(404).json({ success: false, error: "Account not found" }); return; }
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete account" });
  }
});

// ── Cheque books and cheques ──────────────────────────────────────────────────

router.get("/cheque-books", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = await db.select({ book: chequeBooks, accountName: bankAccounts.name, usedCount: sql<number>`count(${cheques.id})::int` })
      .from(chequeBooks).leftJoin(bankAccounts, eq(chequeBooks.bankAccountId, bankAccounts.id)).leftJoin(cheques, eq(cheques.chequeBookId, chequeBooks.id))
      .where(eq(chequeBooks.orgId, orgId)).groupBy(chequeBooks.id, bankAccounts.name).orderBy(desc(chequeBooks.createdAt));
    res.json({ success: true, data: rows.map(({ book, accountName, usedCount }) => ({ ...book, accountName, usedCount })) });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch cheque books" }); }
});

router.post("/cheque-books", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const data = insertChequeBookSchema.parse(req.body);
    const [account] = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.orgId, orgId))).limit(1);
    if (!account) { res.status(400).json({ success: false, error: "Bank account not found" }); return; }
    const [book] = await db.insert(chequeBooks).values({ ...data, orgId, nextNumber: data.startNumber, createdBy: req.user!.userId }).returning();
    res.status(201).json({ success: true, data: book });
  } catch (e: any) { res.status(400).json({ success: false, error: e?.message ?? "Validation failed" }); }
});

router.put("/cheque-books/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const data = updateChequeBookSchema.parse(req.body);
    const [book] = await db.update(chequeBooks).set({ ...data, updatedAt: new Date() }).where(and(eq(chequeBooks.id, Number(req.params.id)), eq(chequeBooks.orgId, req.user!.orgId!))).returning();
    if (!book) { res.status(404).json({ success: false, error: "Cheque book not found" }); return; }
    res.json({ success: true, data: book });
  } catch (e: any) { res.status(400).json({ success: false, error: e?.message ?? "Validation failed" }); }
});

router.get("/cheques", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const filters = [eq(cheques.orgId, req.user!.orgId!)];
    const status = String(req.query.status ?? "").trim();
    const direction = String(req.query.direction ?? "").trim();
    const bankAccountId = req.query.bankAccountId ? Number(req.query.bankAccountId) : undefined;
    if (status) filters.push(eq(cheques.status, status));
    if (direction) filters.push(eq(cheques.direction, direction));
    if (bankAccountId) filters.push(eq(cheques.bankAccountId, bankAccountId));
    const rows = await db.select({ cheque: cheques, accountName: bankAccounts.name, bookName: chequeBooks.name }).from(cheques).leftJoin(bankAccounts, eq(cheques.bankAccountId, bankAccounts.id)).leftJoin(chequeBooks, eq(cheques.chequeBookId, chequeBooks.id)).where(and(...filters)).orderBy(desc(cheques.chequeDate));
    res.json({ success: true, data: rows.map(({ cheque, accountName, bookName }) => ({ ...cheque, accountName, bookName })) });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch cheques" }); }
});

router.post("/cheques", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const data = insertChequeSchema.parse(req.body);
    const [account] = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.orgId, orgId))).limit(1);
    if (!account) { res.status(400).json({ success: false, error: "Bank account not found" }); return; }
    const result = await db.transaction(async (tx) => {
      let number = data.chequeNumber;
      let book: typeof chequeBooks.$inferSelect | undefined;
      if (data.chequeBookId) {
        [book] = await tx.select().from(chequeBooks).where(and(eq(chequeBooks.id, data.chequeBookId), eq(chequeBooks.orgId, orgId), eq(chequeBooks.bankAccountId, data.bankAccountId), eq(chequeBooks.status, "active"))).limit(1);
        if (!book) throw new Error("Cheque book not found or closed");
        const numericNumber = number ? Number(number.replace(book.prefix ?? "", "")) : book.nextNumber;
        if (!Number.isInteger(numericNumber) || numericNumber < book.startNumber || numericNumber > book.endNumber) throw new Error("Cheque number is outside the book range");
        number = number ?? chequeNumber(book.prefix, numericNumber);
        if (!data.chequeNumber) await tx.update(chequeBooks).set({ nextNumber: Math.min(numericNumber + 1, book.endNumber + 1), updatedAt: new Date() }).where(eq(chequeBooks.id, book.id));
      }
      if (!number) throw new Error("Cheque number is required without a cheque book");
      const [created] = await tx.insert(cheques).values({ ...data, chequeNumber: number, orgId, createdBy: req.user!.userId }).returning();
      return created;
    });
    res.status(201).json({ success: true, data: result });
  } catch (e: any) { res.status(400).json({ success: false, error: e?.message ?? "Validation failed" }); }
});

router.put("/cheques/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const data = updateChequeSchema.parse(req.body);
    const updates = { ...data, ...(data.status === "cleared" && !data.clearedDate ? { clearedDate: new Date().toISOString().slice(0, 10) } : {}), ...(data.status === "bounced" && !data.bouncedDate ? { bouncedDate: new Date().toISOString().slice(0, 10) } : {}), updatedAt: new Date() };
    const [cheque] = await db.update(cheques).set(updates).where(and(eq(cheques.id, Number(req.params.id)), eq(cheques.orgId, req.user!.orgId!))).returning();
    if (!cheque) { res.status(404).json({ success: false, error: "Cheque not found" }); return; }
    res.json({ success: true, data: cheque });
  } catch (e: any) { res.status(400).json({ success: false, error: e?.message ?? "Validation failed" }); }
});

router.get("/cheques/report", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const orgId = req.user!.orgId!;
  const rows = await db.select({ direction: cheques.direction, status: cheques.status, count: sql<number>`count(*)::int`, amount: sql<string>`coalesce(sum(${cheques.amount}), 0)::text` }).from(cheques).where(eq(cheques.orgId, orgId)).groupBy(cheques.direction, cheques.status);
  res.json({ success: true, data: rows });
});

// ── Transactions ──────────────────────────────────────────────────────────────

router.get("/transactions", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const type = String(req.query.type ?? "").trim();
    const bankAccountId = req.query.bankAccountId ? parseInt(String(req.query.bankAccountId), 10) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10)));
    const offset = (page - 1) * limit;

    const conditions = [eq(bankTransactions.orgId, orgId)];
    if (search) conditions.push(or(ilike(bankTransactions.description, `%${search}%`), ilike(bankTransactions.reference, `%${search}%`))!);
    if (status) conditions.push(sql`${bankTransactions.status} = ${status}`);
    if (type) conditions.push(sql`${bankTransactions.type} = ${type}`);
    if (bankAccountId) conditions.push(eq(bankTransactions.bankAccountId, bankAccountId));

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(bankTransactions).where(where);
    const rows = await db
      .select({
        txn: bankTransactions,
        accountName: bankAccounts.name,
      })
      .from(bankTransactions)
      .leftJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
      .where(where)
      .orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.createdAt))
      .limit(limit).offset(offset);

    const data = rows.map(({ txn, accountName }) => ({ ...txn, accountName }));
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch transactions" });
  }
});

router.post("/transactions", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const data = insertBankTransactionSchema.parse(req.body);
    // verify account belongs to org
    const [acct] = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.orgId, orgId))).limit(1);
    if (!acct) { res.status(400).json({ success: false, error: "Bank account not found" }); return; }

    const [row] = await db.insert(bankTransactions).values({
      ...data, orgId, createdBy: req.user!.userId,
    }).returning();

    // update account balance
    const delta = data.type === "credit" ? parseFloat(data.amount) : -parseFloat(data.amount);
    await db.update(bankAccounts)
      .set({ currentBalance: sql`current_balance + ${delta}`, updatedAt: new Date() })
      .where(eq(bankAccounts.id, data.bankAccountId));

    res.status(201).json({ success: true, data: row });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.put("/transactions/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const data = updateBankTransactionSchema.parse(req.body);
    const [row] = await db.update(bankTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bankTransactions.id, id), eq(bankTransactions.orgId, orgId)))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.delete("/transactions/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(bankTransactions)
      .where(and(eq(bankTransactions.id, id), eq(bankTransactions.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }
    if (existing.status === "reconciled") {
      res.status(400).json({ success: false, error: "Cannot delete a reconciled transaction." }); return;
    }
    await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
    // reverse balance
    const delta = existing.type === "credit" ? -parseFloat(existing.amount) : parseFloat(existing.amount);
    await db.update(bankAccounts)
      .set({ currentBalance: sql`current_balance + ${delta}`, updatedAt: new Date() })
      .where(eq(bankAccounts.id, existing.bankAccountId));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete transaction" });
  }
});

// ── Statement import and ERP matching ────────────────────────────────────────

router.post("/statements/import", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const bankAccountId = Number(req.body?.bankAccountId);
    const fileName = String(req.body?.fileName ?? "bank-statement.csv").slice(0, 200);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!Number.isInteger(bankAccountId) || rows.length === 0 || rows.length > 5000) {
      res.status(400).json({ success: false, error: "A valid account and 1-5000 statement rows are required" }); return;
    }
    const [account] = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.orgId, orgId))).limit(1);
    if (!account) { res.status(404).json({ success: false, error: "Bank account not found" }); return; }

    const parsed = rows.map((row: any, index: number) => {
      const transactionDate = String(row.transactionDate ?? row.date ?? "");
      const description = String(row.description ?? row.memo ?? "").trim();
      const amount = String(row.amount ?? "");
      const type = String(row.type ?? (Number(amount) < 0 ? "debit" : "credit")).toLowerCase();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) || !description || !/^\d+(\.\d{1,4})?$/.test(amount.replace(/^-/, "")) || !["credit", "debit"].includes(type)) throw new Error(`Invalid statement row ${index + 1}`);
      return { transactionDate, description: description.slice(0, 500), reference: String(row.externalId ?? row.reference ?? "").slice(0, 100) || null, amount: amount.replace(/^-/, ""), type, category: row.category ? String(row.category).slice(0, 100) : null, notes: null };
    });

    const result = await db.transaction(async (tx) => {
      const [batch] = await tx.insert(bankStatementImports).values({ orgId, bankAccountId, fileName, statementDate: parsed.at(-1)?.transactionDate ?? null, transactionCount: 0, importedBy: req.user!.userId }).returning();
      let imported = 0;
      let balanceDelta = 0;
      for (const row of parsed) {
        if (row.reference) {
          const [duplicate] = await tx.select({ id: bankTransactions.id }).from(bankTransactions).where(and(eq(bankTransactions.orgId, orgId), eq(bankTransactions.bankAccountId, bankAccountId), eq(bankTransactions.reference, row.reference))).limit(1);
          if (duplicate) continue;
        }
        await tx.insert(bankTransactions).values({ ...row, importId: batch.id, source: "statement_import", orgId, bankAccountId, createdBy: req.user!.userId });
        imported += 1;
        balanceDelta += row.type === "credit" ? Number(row.amount) : -Number(row.amount);
      }
      await tx.update(bankStatementImports).set({ transactionCount: imported }).where(eq(bankStatementImports.id, batch.id));
      if (balanceDelta) await tx.update(bankAccounts).set({ currentBalance: sql`current_balance + ${balanceDelta}`, updatedAt: new Date() }).where(eq(bankAccounts.id, bankAccountId));
      return { batchId: batch.id, imported, skipped: parsed.length - imported };
    });
    res.status(201).json({ success: true, data: result });
  } catch (e: any) { res.status(400).json({ success: false, error: e?.message ?? "Statement import failed" }); }
});

router.get("/transactions/:id/matches", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = Number(req.params.id);
    const [transaction] = await db.select().from(bankTransactions).where(and(eq(bankTransactions.id, id), eq(bankTransactions.orgId, orgId))).limit(1);
    if (!transaction) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }
    const rows = await db.select({ entry: journalEntries, total: sql<string>`greatest(sum(${journalEntryLines.debit}), sum(${journalEntryLines.credit}))::text` })
      .from(journalEntries).innerJoin(journalEntryLines, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(eq(journalEntries.orgId, orgId), eq(journalEntries.status, "posted"), sql`${journalEntries.date} between (${transaction.transactionDate}::date - interval '7 days') and (${transaction.transactionDate}::date + interval '7 days')`))
      .groupBy(journalEntries.id).having(sql`abs(greatest(sum(${journalEntryLines.debit}), sum(${journalEntryLines.credit})) - ${transaction.amount}) < 0.01`).limit(20);
    res.json({ success: true, data: rows.map(({ entry, total }) => ({ ...entry, amount: total, confidence: entry.reference === transaction.reference ? 100 : 85 })) });
  } catch { res.status(500).json({ success: false, error: "Failed to find ERP matches" }); }
});

router.post("/statements/auto-match", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const accountId = Number(req.body?.bankAccountId);
    const transactions = await db.select().from(bankTransactions).where(and(eq(bankTransactions.orgId, orgId), eq(bankTransactions.bankAccountId, accountId), eq(bankTransactions.status, "unreconciled"), sql`${bankTransactions.source} = 'statement_import'`)).limit(5000);
    let matched = 0;
    for (const transaction of transactions) {
      const [candidate] = await db.select({ id: journalEntries.id }).from(journalEntries).innerJoin(journalEntryLines, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(and(eq(journalEntries.orgId, orgId), eq(journalEntries.status, "posted"), sql`${journalEntries.date} between (${transaction.transactionDate}::date - interval '3 days') and (${transaction.transactionDate}::date + interval '3 days')`))
        .groupBy(journalEntries.id).having(sql`abs(greatest(sum(${journalEntryLines.debit}), sum(${journalEntryLines.credit})) - ${transaction.amount}) < 0.01`).orderBy(sql`case when ${journalEntries.reference} = ${transaction.reference} then 0 else 1 end`).limit(1);
      if (candidate) {
        await db.update(bankTransactions).set({ matchedJournalEntryId: candidate.id, matchConfidence: transaction.reference ? "100" : "85", status: "reconciled", updatedAt: new Date() }).where(eq(bankTransactions.id, transaction.id));
        matched += 1;
      }
    }
    res.json({ success: true, data: { scanned: transactions.length, matched, unmatched: transactions.length - matched } });
  } catch { res.status(500).json({ success: false, error: "Automatic matching failed" }); }
});

router.post("/transactions/:id/match", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const transactionId = Number(req.params.id);
    const journalEntryId = Number(req.body?.journalEntryId);
    const [entry] = await db.select({ id: journalEntries.id }).from(journalEntries).where(and(eq(journalEntries.id, journalEntryId), eq(journalEntries.orgId, orgId), eq(journalEntries.status, "posted"))).limit(1);
    if (!entry) { res.status(404).json({ success: false, error: "Posted ERP entry not found" }); return; }
    const [transaction] = await db.update(bankTransactions).set({ matchedJournalEntryId: journalEntryId, matchConfidence: String(req.body?.confidence ?? "100"), status: "reconciled", updatedAt: new Date() }).where(and(eq(bankTransactions.id, transactionId), eq(bankTransactions.orgId, orgId))).returning();
    if (!transaction) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }
    res.json({ success: true, data: transaction });
  } catch { res.status(400).json({ success: false, error: "Failed to match transaction" }); }
});

router.delete("/transactions/:id/match", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const [transaction] = await db.update(bankTransactions).set({ matchedJournalEntryId: null, matchConfidence: null, status: "unreconciled", updatedAt: new Date() }).where(and(eq(bankTransactions.id, Number(req.params.id)), eq(bankTransactions.orgId, req.user!.orgId!))).returning();
  if (!transaction) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }
  res.json({ success: true, data: transaction });
});

router.get("/reports/reconciliation", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const orgId = req.user!.orgId!;
  const accountId = req.query.bankAccountId ? Number(req.query.bankAccountId) : undefined;
  const conditions = [eq(bankTransactions.orgId, orgId)];
  if (accountId) conditions.push(eq(bankTransactions.bankAccountId, accountId));
  const [summary] = await db.select({ total: sql<number>`count(*)::int`, matched: sql<number>`count(*) filter (where ${bankTransactions.matchedJournalEntryId} is not null)::int`, unreconciled: sql<number>`count(*) filter (where ${bankTransactions.status} = 'unreconciled')::int`, credits: sql<string>`coalesce(sum(${bankTransactions.amount}) filter (where ${bankTransactions.type} = 'credit'), 0)::text`, debits: sql<string>`coalesce(sum(${bankTransactions.amount}) filter (where ${bankTransactions.type} = 'debit'), 0)::text` }).from(bankTransactions).where(and(...conditions));
  res.json({ success: true, data: summary });
});

// ── Reconciliations ───────────────────────────────────────────────────────────

router.get("/reconciliations", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const status = String(req.query.status ?? "").trim();
    const bankAccountId = req.query.bankAccountId ? parseInt(String(req.query.bankAccountId), 10) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10)));
    const offset = (page - 1) * limit;

    const conditions = [eq(bankReconciliations.orgId, orgId)];
    if (status) conditions.push(sql`${bankReconciliations.status} = ${status}`);
    if (bankAccountId) conditions.push(eq(bankReconciliations.bankAccountId, bankAccountId));

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(bankReconciliations).where(where);
    const rows = await db
      .select({ rec: bankReconciliations, accountName: bankAccounts.name })
      .from(bankReconciliations)
      .leftJoin(bankAccounts, eq(bankReconciliations.bankAccountId, bankAccounts.id))
      .where(where)
      .orderBy(desc(bankReconciliations.statementDate))
      .limit(limit).offset(offset);

    const data = rows.map(({ rec, accountName }) => ({ ...rec, accountName }));
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch reconciliations" });
  }
});

router.get("/reconciliations/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db
      .select({ rec: bankReconciliations, accountName: bankAccounts.name })
      .from(bankReconciliations)
      .leftJoin(bankAccounts, eq(bankReconciliations.bankAccountId, bankAccounts.id))
      .where(and(eq(bankReconciliations.id, id), eq(bankReconciliations.orgId, orgId)))
      .limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Reconciliation not found" }); return; }

    // fetch matched transaction ids
    const items = await db
      .select({ transactionId: bankReconciliationItems.transactionId })
      .from(bankReconciliationItems)
      .where(eq(bankReconciliationItems.reconciliationId, id));

    res.json({ success: true, data: { ...row.rec, accountName: row.accountName, matchedTransactionIds: items.map(i => i.transactionId) } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch reconciliation" });
  }
});

router.post("/reconciliations", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const data = insertBankReconciliationSchema.parse(req.body);

    // verify account
    const [acct] = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.orgId, orgId))).limit(1);
    if (!acct) { res.status(400).json({ success: false, error: "Bank account not found" }); return; }

    // compute reconciled balance from matched transactions
    const matchedIds = data.matchedTransactionIds ?? [];
    let reconciledBalance = parseFloat(data.openingBalance ?? "0");
    if (matchedIds.length > 0) {
      const txns = await db.select().from(bankTransactions).where(inArray(bankTransactions.id, matchedIds));
      for (const t of txns) {
        reconciledBalance += t.type === "credit" ? parseFloat(t.amount) : -parseFloat(t.amount);
      }
    }
    const closingBalance = parseFloat(data.closingBalance);
    const difference = reconciledBalance - closingBalance;

    const result = await db.transaction(async (tx) => {
      const [rec] = await tx.insert(bankReconciliations).values({
        orgId,
        bankAccountId: data.bankAccountId,
        statementDate: data.statementDate,
        openingBalance: data.openingBalance ?? "0",
        closingBalance: data.closingBalance,
        reconciledBalance: reconciledBalance.toFixed(2),
        difference: difference.toFixed(2),
        notes: data.notes ?? null,
        createdBy: req.user!.userId,
      }).returning();

      if (matchedIds.length > 0) {
        await tx.insert(bankReconciliationItems).values(
          matchedIds.map((tid) => ({ reconciliationId: rec.id, transactionId: tid }))
        );
        await tx.update(bankTransactions)
          .set({ status: "reconciled", updatedAt: new Date() })
          .where(inArray(bankTransactions.id, matchedIds));
      }
      return rec;
    });

    res.status(201).json({ success: true, data: result });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.put("/reconciliations/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const data = updateBankReconciliationSchema.parse(req.body);

    const [existing] = await db.select().from(bankReconciliations)
      .where(and(eq(bankReconciliations.id, id), eq(bankReconciliations.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Reconciliation not found" }); return; }
    if (existing.status === "completed") {
      res.status(400).json({ success: false, error: "Cannot edit a completed reconciliation." }); return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.statementDate !== undefined) updates.statementDate = data.statementDate;
    if (data.openingBalance !== undefined) updates.openingBalance = data.openingBalance;
    if (data.closingBalance !== undefined) updates.closingBalance = data.closingBalance;
    if (data.notes !== undefined) updates.notes = data.notes;

    if (data.matchedTransactionIds !== undefined) {
      const matchedIds = data.matchedTransactionIds;
      const openBal = parseFloat(data.openingBalance ?? existing.openingBalance);
      let reconciledBalance = openBal;
      if (matchedIds.length > 0) {
        const txns = await db.select().from(bankTransactions).where(inArray(bankTransactions.id, matchedIds));
        for (const t of txns) {
          reconciledBalance += t.type === "credit" ? parseFloat(t.amount) : -parseFloat(t.amount);
        }
      }
      const closing = parseFloat(data.closingBalance ?? existing.closingBalance);
      updates.reconciledBalance = reconciledBalance.toFixed(2);
      updates.difference = (reconciledBalance - closing).toFixed(2);

      await db.transaction(async (tx) => {
        // un-reconcile old items
        const oldItems = await tx.select({ transactionId: bankReconciliationItems.transactionId })
          .from(bankReconciliationItems).where(eq(bankReconciliationItems.reconciliationId, id));
        if (oldItems.length > 0) {
          await tx.update(bankTransactions)
            .set({ status: "unreconciled", updatedAt: new Date() })
            .where(inArray(bankTransactions.id, oldItems.map(o => o.transactionId)));
          await tx.delete(bankReconciliationItems).where(eq(bankReconciliationItems.reconciliationId, id));
        }
        if (matchedIds.length > 0) {
          await tx.insert(bankReconciliationItems).values(matchedIds.map(tid => ({ reconciliationId: id, transactionId: tid })));
          await tx.update(bankTransactions)
            .set({ status: "reconciled", updatedAt: new Date() })
            .where(inArray(bankTransactions.id, matchedIds));
        }
        await tx.update(bankReconciliations).set(updates).where(eq(bankReconciliations.id, id));
      });
    } else {
      await db.update(bankReconciliations).set(updates).where(eq(bankReconciliations.id, id));
    }

    const [updated] = await db.select().from(bankReconciliations).where(eq(bankReconciliations.id, id)).limit(1);
    res.json({ success: true, data: updated });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.post("/reconciliations/:id/complete", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(bankReconciliations)
      .where(and(eq(bankReconciliations.id, id), eq(bankReconciliations.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Reconciliation not found" }); return; }
    if (existing.status === "completed") {
      res.status(400).json({ success: false, error: "Already completed." }); return;
    }
    const [row] = await db.update(bankReconciliations)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(bankReconciliations.id, id))
      .returning();
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to complete reconciliation" });
  }
});

router.delete("/reconciliations/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(bankReconciliations)
      .where(and(eq(bankReconciliations.id, id), eq(bankReconciliations.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Reconciliation not found" }); return; }
    if (existing.status === "completed") {
      res.status(400).json({ success: false, error: "Cannot delete a completed reconciliation." }); return;
    }
    await db.transaction(async (tx) => {
      const oldItems = await tx.select({ transactionId: bankReconciliationItems.transactionId })
        .from(bankReconciliationItems).where(eq(bankReconciliationItems.reconciliationId, id));
      if (oldItems.length > 0) {
        await tx.update(bankTransactions)
          .set({ status: "unreconciled", updatedAt: new Date() })
          .where(inArray(bankTransactions.id, oldItems.map(o => o.transactionId)));
      }
      await tx.delete(bankReconciliations).where(eq(bankReconciliations.id, id));
    });
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete reconciliation" });
  }
});

export default router;
