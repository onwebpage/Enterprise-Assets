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
  organizations,
} from "@workspace/db";
import {
  insertBankAccountSchema, updateBankAccountSchema,
  insertBankTransactionSchema, updateBankTransactionSchema,
  insertBankReconciliationSchema, updateBankReconciliationSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Banking";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMyPermissions(roleId: number | null) {
  if (roleId === null) return { canView: true, canCreate: true, canEdit: true, canDelete: true };
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
