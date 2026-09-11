/**
 * /api/tds — TDS & TCS Management
 *
 * Dedicated module for Tax Deducted at Source (TDS) and Tax Collected at
 * Source (TCS). Covers entries, challan payments, and a summary dashboard.
 *
 * All routes require authentication + "TDS & TCS" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc, inArray } from "drizzle-orm";
import {
  db, permissions, roles,
  tdsEntries, taxPayments, organizations,
} from "@workspace/db";
import {
  insertTDSEntrySchema, updateTDSEntrySchema,
  insertTaxPaymentSchema, updateTaxPaymentSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const MODULE = "TDS & TCS";

// ── My Permissions ─────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    const perms = await resolveRoleModulePermissions(roleId, MODULE);
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary / Dashboard KPIs ────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    // TDS aggregates
    const [tdsAgg] = await db
      .select({
        totalDeducted:    sql<string>`coalesce(sum(tax_amount), 0)::text`,
        totalGross:       sql<string>`coalesce(sum(gross_amount), 0)::text`,
        deductedCount:    sql<number>`count(*)::int`,
      })
      .from(tdsEntries)
      .where(and(eq(tdsEntries.orgId, orgId), eq(tdsEntries.entryType, "tds")));

    // TCS aggregates
    const [tcsAgg] = await db
      .select({
        totalCollected:   sql<string>`coalesce(sum(tax_amount), 0)::text`,
        totalGross:       sql<string>`coalesce(sum(gross_amount), 0)::text`,
        collectedCount:   sql<number>`count(*)::int`,
      })
      .from(tdsEntries)
      .where(and(eq(tdsEntries.orgId, orgId), eq(tdsEntries.entryType, "tcs")));

    // Pending deposit (both TDS + TCS with status deducted/pending)
    const [pendingAgg] = await db
      .select({
        pendingAmount: sql<string>`coalesce(sum(tax_amount), 0)::text`,
        pendingCount:  sql<number>`count(*)::int`,
      })
      .from(tdsEntries)
      .where(and(
        eq(tdsEntries.orgId, orgId),
        sql`status in ('deducted', 'pending')`,
      ));

    // YTD payments (paymentType in tds, tcs)
    const [paymentsAgg] = await db
      .select({
        ytdPaid:      sql<string>`coalesce(sum(amount), 0)::text`,
        paymentsCount: sql<number>`count(*)::int`,
      })
      .from(taxPayments)
      .where(and(
        eq(taxPayments.orgId, orgId),
        sql`payment_type in ('tds', 'tcs')`,
        sql`status = 'paid'`,
      ));

    // Status breakdown
    const statusBreakdown = await db
      .select({
        status: tdsEntries.status,
        count:  sql<number>`count(*)::int`,
        amount: sql<string>`coalesce(sum(tax_amount), 0)::text`,
      })
      .from(tdsEntries)
      .where(eq(tdsEntries.orgId, orgId))
      .groupBy(tdsEntries.status)
      .orderBy(tdsEntries.status);

    // Top sections by deducted/collected amount
    const topSections = await db
      .select({
        section:    tdsEntries.section,
        entryType:  tdsEntries.entryType,
        count:      sql<number>`count(*)::int`,
        totalTax:   sql<string>`coalesce(sum(tax_amount), 0)::text`,
        totalGross: sql<string>`coalesce(sum(gross_amount), 0)::text`,
      })
      .from(tdsEntries)
      .where(eq(tdsEntries.orgId, orgId))
      .groupBy(tdsEntries.section, tdsEntries.entryType)
      .orderBy(desc(sql`sum(tax_amount)`))
      .limit(8);

    // Recent entries (last 5)
    const recentEntries = await db
      .select()
      .from(tdsEntries)
      .where(eq(tdsEntries.orgId, orgId))
      .orderBy(desc(tdsEntries.transactionDate))
      .limit(5);

    res.json({
      success: true,
      data: {
        tds: {
          totalDeducted: tdsAgg.totalDeducted,
          totalGross:    tdsAgg.totalGross,
          count:         tdsAgg.deductedCount,
        },
        tcs: {
          totalCollected: tcsAgg.totalCollected,
          totalGross:     tcsAgg.totalGross,
          count:          tcsAgg.collectedCount,
        },
        pendingDeposit: {
          amount: pendingAgg.pendingAmount,
          count:  pendingAgg.pendingCount,
        },
        ytdPaid: {
          amount: paymentsAgg.ytdPaid,
          count:  paymentsAgg.paymentsCount,
        },
        statusBreakdown,
        topSections,
        recentEntries,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch TDS/TCS summary" });
  }
});

// ── TDS/TCS Entries ─────────────────────────────────────────────────────────────

router.get("/entries", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId     = req.user!.orgId!;
    const search    = String(req.query.search    ?? "").trim();
    const status    = String(req.query.status    ?? "").trim();
    const entryType = String(req.query.entryType ?? "").trim();
    const section   = String(req.query.section   ?? "").trim();
    const dateFrom  = String(req.query.dateFrom  ?? "").trim();
    const dateTo    = String(req.query.dateTo    ?? "").trim();
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(tdsEntries.orgId, orgId)];

    if (search) {
      filters.push(or(
        ilike(tdsEntries.partyName,     `%${search}%`),
        ilike(tdsEntries.partyPan,      `%${search}%`),
        ilike(tdsEntries.challanNumber, `%${search}%`),
        ilike(tdsEntries.section,       `%${search}%`),
      ));
    }
    if (status)    filters.push(eq(tdsEntries.status,    status));
    if (entryType) filters.push(eq(tdsEntries.entryType, entryType));
    if (section)   filters.push(eq(tdsEntries.section,   section));
    if (dateFrom)  filters.push(sql`transaction_date >= ${dateFrom}`);
    if (dateTo)    filters.push(sql`transaction_date <= ${dateTo}`);

    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(tdsEntries).where(where)
        .orderBy(desc(tdsEntries.transactionDate)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(tdsEntries).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch TDS/TCS entries" });
  }
});

router.get("/entries/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(tdsEntries)
      .where(and(eq(tdsEntries.id, id), eq(tdsEntries.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Entry not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch entry" });
  }
});

router.post("/entries", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertTDSEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const gross   = parseFloat(d.grossAmount as string) || 0;
    const rate    = parseFloat(d.taxRate as string)     || 0;
    const taxAmt  = (gross * rate) / 100;
    const netAmt  = gross - taxAmt;

    const [created] = await db.insert(tdsEntries).values({
      ...d,
      grossAmount: d.grossAmount as string,
      taxRate:     d.taxRate as string,
      taxAmount:   taxAmt.toFixed(2),
      netAmount:   netAmt.toFixed(2),
      orgId,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create entry" });
  }
});

router.put("/entries/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateTDSEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: tdsEntries.id }).from(tdsEntries)
      .where(and(eq(tdsEntries.id, id), eq(tdsEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Entry not found" }); return; }

    const d = parsed.data;
    const updates: any = { ...d, updatedAt: new Date() };

    // Recompute derived amounts if gross or rate changed
    if (d.grossAmount !== undefined || d.taxRate !== undefined) {
      const [cur] = await db.select({ grossAmount: tdsEntries.grossAmount, taxRate: tdsEntries.taxRate })
        .from(tdsEntries).where(eq(tdsEntries.id, id)).limit(1);
      const gross  = parseFloat(String(d.grossAmount ?? cur.grossAmount)) || 0;
      const rate   = parseFloat(String(d.taxRate     ?? cur.taxRate))     || 0;
      const taxAmt = (gross * rate) / 100;
      updates.taxAmount = taxAmt.toFixed(2);
      updates.netAmount = (gross - taxAmt).toFixed(2);
    }

    const [updated] = await db.update(tdsEntries).set(updates).where(eq(tdsEntries.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update entry" });
  }
});

router.delete("/entries/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: tdsEntries.id, status: tdsEntries.status })
      .from(tdsEntries).where(and(eq(tdsEntries.id, id), eq(tdsEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Entry not found" }); return; }
    if (existing.status === "filed") {
      res.status(409).json({ success: false, error: "Filed entries cannot be deleted." });
      return;
    }
    await db.delete(tdsEntries).where(eq(tdsEntries.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
});

// ── TDS/TCS Payments (challan deposits) ─────────────────────────────────────────

router.get("/payments", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId       = req.user!.orgId!;
    const search      = String(req.query.search      ?? "").trim();
    const status      = String(req.query.status      ?? "").trim();
    const paymentType = String(req.query.paymentType ?? "").trim();
    const period      = String(req.query.period      ?? "").trim();
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
    const offset = (page - 1) * limit;

    const filters: any[] = [
      eq(taxPayments.orgId, orgId),
      sql`payment_type in ('tds', 'tcs')`,
    ];

    if (search) {
      filters.push(or(
        ilike(taxPayments.challanNumber, `%${search}%`),
        ilike(taxPayments.bankReference, `%${search}%`),
        ilike(taxPayments.period,        `%${search}%`),
      ));
    }
    if (status)      filters.push(eq(taxPayments.status, status));
    if (paymentType) filters.push(eq(taxPayments.paymentType, paymentType));
    if (period)      filters.push(eq(taxPayments.period, period));

    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(taxPayments).where(where)
        .orderBy(desc(taxPayments.paymentDate)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(taxPayments).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
});

router.post("/payments", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  // Force paymentType to tds or tcs
  const body = { ...req.body };
  if (!["tds", "tcs"].includes(body.paymentType)) body.paymentType = "tds";

  const parsed = insertTaxPaymentSchema.safeParse(body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [created] = await db.insert(taxPayments).values({
      ...parsed.data,
      orgId: req.user!.orgId!,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create payment" });
  }
});

router.put("/payments/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateTaxPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: taxPayments.id }).from(taxPayments)
      .where(and(eq(taxPayments.id, id), eq(taxPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }
    const [updated] = await db.update(taxPayments)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(taxPayments.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update payment" });
  }
});

router.delete("/payments/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: taxPayments.id, status: taxPayments.status })
      .from(taxPayments).where(and(eq(taxPayments.id, id), eq(taxPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }
    if (existing.status === "paid") {
      res.status(409).json({ success: false, error: "Paid payments cannot be deleted." });
      return;
    }
    await db.delete(taxPayments).where(eq(taxPayments.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete payment" });
  }
});

export default router;
