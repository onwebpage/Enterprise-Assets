/**
 * /api/gst — GST & Tax Management
 *
 * Covers: tax rate master, GST returns (GSTR-1/3B/9), return line entries,
 * TDS/TCS entries, and tax payments to government.
 *
 * All routes require authentication + "GST & Tax" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  taxRates, gstReturns, gstReturnEntries, tdsEntries, taxPayments,
  organizations,
} from "@workspace/db";
import {
  insertTaxRateSchema, updateTaxRateSchema,
  insertGSTReturnSchema, updateGSTReturnSchema,
  insertGSTReturnEntrySchema, updateGSTReturnEntrySchema,
  insertTDSEntrySchema, updateTDSEntrySchema,
  insertTaxPaymentSchema, updateTaxPaymentSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const MODULE = "GST & Tax";

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    const perms = await resolveRoleModulePermissions(roleId, MODULE);
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Returns Summary (dedicated endpoint for GST Returns module) ───────────────

router.get("/returns-summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const today = new Date().toISOString().slice(0, 10);

    // Counts by status
    const [{ totalReturns }] = await db
      .select({ totalReturns: sql<number>`count(*)::int` })
      .from(gstReturns).where(eq(gstReturns.orgId, orgId));

    const [{ draftCount }] = await db
      .select({ draftCount: sql<number>`count(*)::int` })
      .from(gstReturns).where(and(eq(gstReturns.orgId, orgId), eq(gstReturns.status, "draft")));

    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)::int` })
      .from(gstReturns).where(and(eq(gstReturns.orgId, orgId), eq(gstReturns.status, "pending")));

    const [{ filedCount }] = await db
      .select({ filedCount: sql<number>`count(*)::int` })
      .from(gstReturns).where(and(eq(gstReturns.orgId, orgId), eq(gstReturns.status, "filed")));

    const [{ overdueCount }] = await db
      .select({ overdueCount: sql<number>`count(*)::int` })
      .from(gstReturns).where(and(eq(gstReturns.orgId, orgId), eq(gstReturns.status, "overdue")));

    // Tax aggregates
    const [agg] = await db
      .select({
        totalTaxLiability: sql<string>`coalesce(sum(total_tax_liability), 0)::text`,
        totalItc:          sql<string>`coalesce(sum(total_itc), 0)::text`,
        netPayable:        sql<string>`coalesce(sum(net_payable), 0)::text`,
        totalTaxableValue: sql<string>`coalesce(sum(total_taxable_value), 0)::text`,
        totalCgst:         sql<string>`coalesce(sum(total_cgst), 0)::text`,
        totalSgst:         sql<string>`coalesce(sum(total_sgst), 0)::text`,
        totalIgst:         sql<string>`coalesce(sum(total_igst), 0)::text`,
        totalCess:         sql<string>`coalesce(sum(total_cess), 0)::text`,
      })
      .from(gstReturns)
      .where(and(eq(gstReturns.orgId, orgId), sql`status != 'cancelled'`));

    // By return type
    const byType = await db
      .select({
        returnType: gstReturns.returnType,
        count: sql<number>`count(*)::int`,
        filed: sql<number>`sum(case when status='filed' then 1 else 0 end)::int`,
        pending: sql<number>`sum(case when status in ('draft','pending') then 1 else 0 end)::int`,
        overdue: sql<number>`sum(case when status='overdue' then 1 else 0 end)::int`,
        totalTax: sql<string>`coalesce(sum(total_tax_liability),0)::text`,
      })
      .from(gstReturns)
      .where(eq(gstReturns.orgId, orgId))
      .groupBy(gstReturns.returnType)
      .orderBy(gstReturns.returnType);

    // Due soon (next 7 days, not filed)
    const in7days = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const dueSoon = await db
      .select({ id: gstReturns.id, returnType: gstReturns.returnType, period: gstReturns.period, dueDate: gstReturns.dueDate, status: gstReturns.status })
      .from(gstReturns)
      .where(and(
        eq(gstReturns.orgId, orgId),
        sql`status not in ('filed')`,
        sql`due_date >= ${today}`,
        sql`due_date <= ${in7days}`,
      ))
      .orderBy(gstReturns.dueDate)
      .limit(5);

    res.json({
      success: true,
      data: {
        totalReturns, draftCount, pendingCount, filedCount, overdueCount,
        totalTaxLiability: agg.totalTaxLiability,
        totalItc: agg.totalItc,
        netPayable: agg.netPayable,
        totalTaxableValue: agg.totalTaxableValue,
        totalCgst: agg.totalCgst,
        totalSgst: agg.totalSgst,
        totalIgst: agg.totalIgst,
        totalCess: agg.totalCess,
        byType,
        dueSoon,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch GST returns summary" });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const now   = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [{ totalGstCollected }] = await db
      .select({ totalGstCollected: sql<string>`coalesce(sum(total_tax_liability), 0)::text` })
      .from(gstReturns)
      .where(and(eq(gstReturns.orgId, orgId), sql`period = ${thisMonth}`));

    const [{ totalItc }] = await db
      .select({ totalItc: sql<string>`coalesce(sum(total_itc), 0)::text` })
      .from(gstReturns)
      .where(and(eq(gstReturns.orgId, orgId), sql`period = ${thisMonth}`));

    const [{ netPayable }] = await db
      .select({ netPayable: sql<string>`coalesce(sum(net_payable), 0)::text` })
      .from(gstReturns)
      .where(and(eq(gstReturns.orgId, orgId), sql`period = ${thisMonth}`));

    const [{ ytdPaid }] = await db
      .select({ ytdPaid: sql<string>`coalesce(sum(amount), 0)::text` })
      .from(taxPayments)
      .where(and(eq(taxPayments.orgId, orgId), eq(taxPayments.status, "paid")));

    const [{ pendingFilings }] = await db
      .select({ pendingFilings: sql<number>`count(*)::int` })
      .from(gstReturns)
      .where(and(eq(gstReturns.orgId, orgId), sql`status in ('draft', 'pending')`));

    const [{ overdueFilings }] = await db
      .select({ overdueFilings: sql<number>`count(*)::int` })
      .from(gstReturns)
      .where(and(eq(gstReturns.orgId, orgId), eq(gstReturns.status, "overdue")));

    const [{ pendingTds }] = await db
      .select({ pendingTds: sql<string>`coalesce(sum(tax_amount), 0)::text` })
      .from(tdsEntries)
      .where(and(eq(tdsEntries.orgId, orgId), sql`status in ('deducted', 'pending')`));

    const [{ activeTaxRates }] = await db
      .select({ activeTaxRates: sql<number>`count(*)::int` })
      .from(taxRates)
      .where(and(eq(taxRates.orgId, orgId), eq(taxRates.isActive, true)));

    res.json({
      success: true,
      data: {
        totalGstCollected, totalItc, netPayable, ytdPaid,
        pendingFilings, overdueFilings, pendingTds, activeTaxRates,
        currentPeriod: thisMonth,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch GST summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TAX RATES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/tax-rates", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, type, isActive } = req.query as Record<string, string>;

    const filters: any[] = [eq(taxRates.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(taxRates.name, `%${search.trim()}%`),
        ilike(taxRates.hsnSacCode, `%${search.trim()}%`),
      ));
    }
    if (type) filters.push(eq(taxRates.type, type));
    if (isActive !== undefined) filters.push(eq(taxRates.isActive, isActive === "true"));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(taxRates).where(where).orderBy(taxRates.name).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(taxRates).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tax rates" });
  }
});

router.get("/tax-rates/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(taxRates)
      .where(and(eq(taxRates.id, id), eq(taxRates.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Tax rate not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tax rate" });
  }
});

router.post("/tax-rates", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertTaxRateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    // Check for duplicate name within org
    const [dup] = await db.select({ id: taxRates.id }).from(taxRates)
      .where(and(eq(taxRates.orgId, orgId), sql`lower(name) = lower(${parsed.data.name})`)).limit(1);
    if (dup) {
      res.status(409).json({ success: false, error: `Tax rate named "${parsed.data.name}" already exists` });
      return;
    }
    const [created] = await db.insert(taxRates).values({
      ...parsed.data, orgId, createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create tax rate" });
  }
});

router.put("/tax-rates/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateTaxRateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: taxRates.id }).from(taxRates)
      .where(and(eq(taxRates.id, id), eq(taxRates.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Tax rate not found" }); return; }
    const [updated] = await db.update(taxRates)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(taxRates.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update tax rate" });
  }
});

router.delete("/tax-rates/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: taxRates.id, name: taxRates.name }).from(taxRates)
      .where(and(eq(taxRates.id, id), eq(taxRates.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Tax rate not found" }); return; }
    await db.delete(taxRates).where(eq(taxRates.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete tax rate" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GST RETURNS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/returns", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, returnType, period } = req.query as Record<string, string>;

    const filters: any[] = [eq(gstReturns.orgId, orgId)];
    if (search?.trim())  filters.push(ilike(gstReturns.gstin, `%${search.trim()}%`));
    if (status)          filters.push(eq(gstReturns.status, status));
    if (returnType)      filters.push(eq(gstReturns.returnType, returnType));
    if (period)          filters.push(eq(gstReturns.period, period));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(gstReturns).where(where).orderBy(desc(gstReturns.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(gstReturns).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch GST returns" });
  }
});

router.get("/returns/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(gstReturns)
      .where(and(eq(gstReturns.id, id), eq(gstReturns.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "GST return not found" }); return; }

    const entries = await db.select().from(gstReturnEntries)
      .where(eq(gstReturnEntries.returnId, id)).orderBy(gstReturnEntries.createdAt);

    res.json({ success: true, data: { ...row, entries } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch GST return" });
  }
});

router.post("/returns", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertGSTReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    // Check for duplicate return type + period within org
    const [dup] = await db.select({ id: gstReturns.id }).from(gstReturns)
      .where(and(
        eq(gstReturns.orgId, orgId),
        eq(gstReturns.returnType, data.returnType),
        eq(gstReturns.period, data.period),
      )).limit(1);
    if (dup) {
      res.status(409).json({ success: false, error: `${data.returnType.toUpperCase()} for period ${data.period} already exists` });
      return;
    }

    // Compute derived fields
    const cgst    = parseFloat(data.totalCgst    ?? "0");
    const sgst    = parseFloat(data.totalSgst    ?? "0");
    const igst    = parseFloat(data.totalIgst    ?? "0");
    const cess    = parseFloat(data.totalCess    ?? "0");
    const itc     = parseFloat(data.totalItc     ?? "0");
    const taxLiab = cgst + sgst + igst + cess;
    const netPay  = Math.max(0, taxLiab - itc);

    const [created] = await db.insert(gstReturns).values({
      ...data,
      orgId,
      totalCgst: cgst.toFixed(2), totalSgst: sgst.toFixed(2),
      totalIgst: igst.toFixed(2), totalCess: cess.toFixed(2),
      totalTaxLiability: taxLiab.toFixed(2),
      totalItc: itc.toFixed(2),
      netPayable: netPay.toFixed(2),
      createdBy: req.user!.userId,
    }).returning();

    res.status(201).json({ success: true, data: { ...created, entries: [] } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create GST return" });
  }
});

router.put("/returns/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateGSTReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(gstReturns)
      .where(and(eq(gstReturns.id, id), eq(gstReturns.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "GST return not found" }); return; }
    if (existing.status === "filed") {
      res.status(409).json({ success: false, error: "Filed returns cannot be edited. Revise the return first." });
      return;
    }

    const data = parsed.data;
    const cgst    = parseFloat(String(data.totalCgst    ?? existing.totalCgst));
    const sgst    = parseFloat(String(data.totalSgst    ?? existing.totalSgst));
    const igst    = parseFloat(String(data.totalIgst    ?? existing.totalIgst));
    const cess    = parseFloat(String(data.totalCess    ?? existing.totalCess));
    const itc     = parseFloat(String(data.totalItc     ?? existing.totalItc));
    const taxLiab = cgst + sgst + igst + cess;
    const netPay  = Math.max(0, taxLiab - itc);

    const [updated] = await db.update(gstReturns).set({
      ...data,
      totalCgst: cgst.toFixed(2), totalSgst: sgst.toFixed(2),
      totalIgst: igst.toFixed(2), totalCess: cess.toFixed(2),
      totalTaxLiability: taxLiab.toFixed(2),
      totalItc: itc.toFixed(2),
      netPayable: netPay.toFixed(2),
      updatedAt: new Date(),
    }).where(eq(gstReturns.id, id)).returning();

    const entries = await db.select().from(gstReturnEntries)
      .where(eq(gstReturnEntries.returnId, id)).orderBy(gstReturnEntries.createdAt);

    res.json({ success: true, data: { ...updated, entries } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update GST return" });
  }
});

// POST /gst/returns/:id/submit — file / submit a return
router.post("/returns/:id/submit", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(gstReturns)
      .where(and(eq(gstReturns.id, id), eq(gstReturns.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "GST return not found" }); return; }
    if (existing.status === "filed") {
      res.status(409).json({ success: false, error: "Return is already filed" });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const [updated] = await db.update(gstReturns)
      .set({ status: "filed", submissionDate: today, updatedAt: new Date() })
      .where(eq(gstReturns.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to submit GST return" });
  }
});

router.delete("/returns/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(gstReturns)
      .where(and(eq(gstReturns.id, id), eq(gstReturns.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "GST return not found" }); return; }
    if (existing.status === "filed") {
      res.status(409).json({ success: false, error: "Filed returns cannot be deleted. Revise first." });
      return;
    }
    await db.delete(gstReturns).where(eq(gstReturns.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete GST return" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GST RETURN ENTRIES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/returns/:returnId/entries", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const returnId = parseInt(req.params.returnId as string);
  if (isNaN(returnId)) { res.status(400).json({ success: false, error: "Invalid returnId" }); return; }
  try {
    const orgId = req.user!.orgId!;
    // Verify return belongs to org
    const [ret] = await db.select({ id: gstReturns.id }).from(gstReturns)
      .where(and(eq(gstReturns.id, returnId), eq(gstReturns.orgId, orgId))).limit(1);
    if (!ret) { res.status(404).json({ success: false, error: "GST return not found" }); return; }

    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 50))));
    const offset = (page - 1) * limit;

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(gstReturnEntries)
        .where(eq(gstReturnEntries.returnId, returnId))
        .orderBy(gstReturnEntries.createdAt).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(gstReturnEntries)
        .where(eq(gstReturnEntries.returnId, returnId)),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch return entries" });
  }
});

router.post("/returns/:returnId/entries", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const returnId = parseInt(req.params.returnId as string);
  if (isNaN(returnId)) { res.status(400).json({ success: false, error: "Invalid returnId" }); return; }

  const parsed = insertGSTReturnEntrySchema.safeParse({ ...req.body, returnId });
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [ret] = await db.select({ id: gstReturns.id, status: gstReturns.status }).from(gstReturns)
      .where(and(eq(gstReturns.id, returnId), eq(gstReturns.orgId, orgId))).limit(1);
    if (!ret) { res.status(404).json({ success: false, error: "GST return not found" }); return; }
    if (ret.status === "filed") {
      res.status(409).json({ success: false, error: "Cannot add entries to a filed return" });
      return;
    }

    const d = parsed.data;
    const cgst = parseFloat(d.cgstAmount ?? "0");
    const sgst = parseFloat(d.sgstAmount ?? "0");
    const igst = parseFloat(d.igstAmount ?? "0");
    const cess = parseFloat(d.cessAmount ?? "0");
    const totalTax = cgst + sgst + igst + cess;

    const [created] = await db.insert(gstReturnEntries).values({
      ...d,
      orgId,
      cgstAmount: cgst.toFixed(2), sgstAmount: sgst.toFixed(2),
      igstAmount: igst.toFixed(2), cessAmount: cess.toFixed(2),
      totalTax: totalTax.toFixed(2),
    }).returning();

    // Recompute return totals
    const [agg] = await db
      .select({
        taxableValue: sql<string>`coalesce(sum(taxable_value), 0)::text`,
        cgst:         sql<string>`coalesce(sum(cgst_amount), 0)::text`,
        sgst:         sql<string>`coalesce(sum(sgst_amount), 0)::text`,
        igst:         sql<string>`coalesce(sum(igst_amount), 0)::text`,
        cess:         sql<string>`coalesce(sum(cess_amount), 0)::text`,
      })
      .from(gstReturnEntries)
      .where(eq(gstReturnEntries.returnId, returnId));

    const newCgst   = parseFloat(agg.cgst);
    const newSgst   = parseFloat(agg.sgst);
    const newIgst   = parseFloat(agg.igst);
    const newCess   = parseFloat(agg.cess);
    const newLiab   = newCgst + newSgst + newIgst + newCess;

    const [curRet]  = await db.select({ totalItc: gstReturns.totalItc }).from(gstReturns).where(eq(gstReturns.id, returnId)).limit(1);
    const curItc    = parseFloat(curRet?.totalItc ?? "0");
    const newNetPay = Math.max(0, newLiab - curItc);

    await db.update(gstReturns).set({
      totalTaxableValue: parseFloat(agg.taxableValue).toFixed(2),
      totalCgst: newCgst.toFixed(2), totalSgst: newSgst.toFixed(2),
      totalIgst: newIgst.toFixed(2), totalCess: newCess.toFixed(2),
      totalTaxLiability: newLiab.toFixed(2), netPayable: newNetPay.toFixed(2),
      updatedAt: new Date(),
    }).where(eq(gstReturns.id, returnId));

    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create return entry" });
  }
});

router.put("/entries/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateGSTReturnEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(gstReturnEntries)
      .where(and(eq(gstReturnEntries.id, id), eq(gstReturnEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Entry not found" }); return; }

    const d = parsed.data;
    const cgst = parseFloat(String(d.cgstAmount ?? existing.cgstAmount));
    const sgst = parseFloat(String(d.sgstAmount ?? existing.sgstAmount));
    const igst = parseFloat(String(d.igstAmount ?? existing.igstAmount));
    const cess = parseFloat(String(d.cessAmount ?? existing.cessAmount));
    const totalTax = cgst + sgst + igst + cess;

    const [updated] = await db.update(gstReturnEntries).set({
      ...d,
      cgstAmount: cgst.toFixed(2), sgstAmount: sgst.toFixed(2),
      igstAmount: igst.toFixed(2), cessAmount: cess.toFixed(2),
      totalTax: totalTax.toFixed(2),
    }).where(eq(gstReturnEntries.id, id)).returning();

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
    const [existing] = await db.select().from(gstReturnEntries)
      .where(and(eq(gstReturnEntries.id, id), eq(gstReturnEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Entry not found" }); return; }
    await db.delete(gstReturnEntries).where(eq(gstReturnEntries.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TDS / TCS ENTRIES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/tds", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, entryType, section } = req.query as Record<string, string>;

    const filters: any[] = [eq(tdsEntries.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(tdsEntries.partyName,  `%${search.trim()}%`),
        ilike(tdsEntries.partyPan,   `%${search.trim()}%`),
        ilike(tdsEntries.challanNumber, `%${search.trim()}%`),
      ));
    }
    if (status)    filters.push(eq(tdsEntries.status, status));
    if (entryType) filters.push(eq(tdsEntries.entryType, entryType));
    if (section)   filters.push(eq(tdsEntries.section, section));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(tdsEntries).where(where).orderBy(desc(tdsEntries.transactionDate)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(tdsEntries).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch TDS entries" });
  }
});

router.get("/tds/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(tdsEntries)
      .where(and(eq(tdsEntries.id, id), eq(tdsEntries.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "TDS entry not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch TDS entry" });
  }
});

router.post("/tds", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertTDSEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const gross   = parseFloat(d.grossAmount);
    const rate    = parseFloat(d.taxRate);
    const taxAmt  = (gross * rate) / 100;
    const netAmt  = gross - taxAmt;

    const [created] = await db.insert(tdsEntries).values({
      ...d,
      orgId,
      taxAmount: taxAmt.toFixed(2),
      netAmount: netAmt.toFixed(2),
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create TDS entry" });
  }
});

router.put("/tds/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateTDSEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(tdsEntries)
      .where(and(eq(tdsEntries.id, id), eq(tdsEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "TDS entry not found" }); return; }

    const d = parsed.data;
    const gross  = parseFloat(String(d.grossAmount ?? existing.grossAmount));
    const rate   = parseFloat(String(d.taxRate     ?? existing.taxRate));
    const taxAmt = (gross * rate) / 100;
    const netAmt = gross - taxAmt;

    const [updated] = await db.update(tdsEntries).set({
      ...d,
      taxAmount: taxAmt.toFixed(2),
      netAmount: netAmt.toFixed(2),
      updatedAt: new Date(),
    }).where(eq(tdsEntries.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update TDS entry" });
  }
});

router.delete("/tds/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: tdsEntries.id }).from(tdsEntries)
      .where(and(eq(tdsEntries.id, id), eq(tdsEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "TDS entry not found" }); return; }
    await db.delete(tdsEntries).where(eq(tdsEntries.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete TDS entry" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TAX PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/payments", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, paymentType, period } = req.query as Record<string, string>;

    const filters: any[] = [eq(taxPayments.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(taxPayments.challanNumber, `%${search.trim()}%`),
        ilike(taxPayments.bankReference, `%${search.trim()}%`),
      ));
    }
    if (status)      filters.push(eq(taxPayments.status, status));
    if (paymentType) filters.push(eq(taxPayments.paymentType, paymentType));
    if (period)      filters.push(eq(taxPayments.period, period));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(taxPayments).where(where).orderBy(desc(taxPayments.paymentDate)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(taxPayments).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tax payments" });
  }
});

router.get("/payments/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(taxPayments)
      .where(and(eq(taxPayments.id, id), eq(taxPayments.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Tax payment not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tax payment" });
  }
});

router.post("/payments", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertTaxPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [created] = await db.insert(taxPayments).values({
      ...parsed.data, orgId, createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create tax payment" });
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
    if (!existing) { res.status(404).json({ success: false, error: "Tax payment not found" }); return; }
    const [updated] = await db.update(taxPayments)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(taxPayments.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update tax payment" });
  }
});

router.delete("/payments/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: taxPayments.id, status: taxPayments.status }).from(taxPayments)
      .where(and(eq(taxPayments.id, id), eq(taxPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Tax payment not found" }); return; }
    if (existing.status === "paid") {
      res.status(409).json({ success: false, error: "Paid tax payments cannot be deleted." });
      return;
    }
    await db.delete(taxPayments).where(eq(taxPayments.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete tax payment" });
  }
});

export default router;
