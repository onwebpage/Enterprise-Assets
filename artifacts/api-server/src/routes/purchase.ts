/**
 * /api/purchase — Purchase & Procurement
 *
 * Covers: vendor master, purchase orders (with lines), goods receipt notes
 * (GRN), and request for quotations (RFQ).
 *
 * All routes require authentication + "Purchase & Procurement" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc, inArray } from "drizzle-orm";
import {
  db, permissions, roles, organizations,
  purchaseVendors, purchaseOrders, purchaseOrderLines,
  goodsReceiptNotes, goodsReceiptLines, purchaseRFQs,
} from "@workspace/db";
import {
  insertPurchaseVendorSchema, updatePurchaseVendorSchema,
  insertPurchaseOrderSchema, updatePurchaseOrderSchema,
  insertGRNSchema, updateGRNSchema,
  insertPurchaseRFQSchema, updatePurchaseRFQSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const MODULE = "Purchase & Procurement";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextPoNumber(orgId: number): Promise<string> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.orgId, orgId));
  return `PO-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

async function nextGrnNumber(orgId: number): Promise<string> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(goodsReceiptNotes)
    .where(eq(goodsReceiptNotes.orgId, orgId));
  return `GRN-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

async function nextRfqNumber(orgId: number): Promise<string> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(purchaseRFQs)
    .where(eq(purchaseRFQs.orgId, orgId));
  return `RFQ-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

async function nextVendorCode(orgId: number): Promise<string> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(purchaseVendors)
    .where(eq(purchaseVendors.orgId, orgId));
  return `VND-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

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

// ── Summary / Dashboard KPIs ──────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [poAgg] = await db.select({
      totalOrders:   sql<number>`count(*)::int`,
      totalValue:    sql<string>`coalesce(sum(total_amount), 0)::text`,
      draftCount:    sql<number>`sum(case when status='draft' then 1 else 0 end)::int`,
      sentCount:     sql<number>`sum(case when status='sent' then 1 else 0 end)::int`,
      confirmedCount: sql<number>`sum(case when status='confirmed' then 1 else 0 end)::int`,
      receivedCount: sql<number>`sum(case when status='received' then 1 else 0 end)::int`,
      cancelledCount: sql<number>`sum(case when status='cancelled' then 1 else 0 end)::int`,
    }).from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId));

    const [vendorAgg] = await db.select({
      totalVendors:  sql<number>`count(*)::int`,
      activeVendors: sql<number>`sum(case when status='active' then 1 else 0 end)::int`,
    }).from(purchaseVendors).where(eq(purchaseVendors.orgId, orgId));

    const [grnAgg] = await db.select({
      totalGRNs:     sql<number>`count(*)::int`,
      pendingGRNs:   sql<number>`sum(case when status='draft' then 1 else 0 end)::int`,
    }).from(goodsReceiptNotes).where(eq(goodsReceiptNotes.orgId, orgId));

    const [rfqAgg] = await db.select({
      totalRFQs:  sql<number>`count(*)::int`,
      openRFQs:   sql<number>`sum(case when status in ('draft','sent') then 1 else 0 end)::int`,
    }).from(purchaseRFQs).where(eq(purchaseRFQs.orgId, orgId));

    // Top vendors by PO value
    const topVendors = await db
      .select({
        vendorId:   purchaseOrders.vendorId,
        vendorName: purchaseVendors.name,
        poCount:    sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(${purchaseOrders.totalAmount}), 0)::text`,
      })
      .from(purchaseOrders)
      .innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
      .where(eq(purchaseOrders.orgId, orgId))
      .groupBy(purchaseOrders.vendorId, purchaseVendors.name)
      .orderBy(desc(sql`sum(${purchaseOrders.totalAmount})`))
      .limit(5);

    // Recent POs
    const recentOrders = await db
      .select({
        id:          purchaseOrders.id,
        poNumber:    purchaseOrders.poNumber,
        vendorName:  purchaseVendors.name,
        orderDate:   purchaseOrders.orderDate,
        totalAmount: purchaseOrders.totalAmount,
        status:      purchaseOrders.status,
      })
      .from(purchaseOrders)
      .innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
      .where(eq(purchaseOrders.orgId, orgId))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(5);

    // Status breakdown
    const statusBreakdown = [
      { status: "draft",     count: poAgg.draftCount },
      { status: "sent",      count: poAgg.sentCount },
      { status: "confirmed", count: poAgg.confirmedCount },
      { status: "received",  count: poAgg.receivedCount },
      { status: "cancelled", count: poAgg.cancelledCount },
    ].filter(s => s.count > 0);

    res.json({
      success: true,
      data: {
        totalOrders:   poAgg.totalOrders,
        totalValue:    poAgg.totalValue,
        totalVendors:  vendorAgg.totalVendors,
        activeVendors: vendorAgg.activeVendors,
        totalGRNs:     grnAgg.totalGRNs,
        pendingGRNs:   grnAgg.pendingGRNs,
        totalRFQs:     rfqAgg.totalRFQs,
        openRFQs:      rfqAgg.openRFQs,
        statusBreakdown,
        topVendors,
        recentOrders,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VENDORS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/vendors", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(purchaseVendors.orgId, orgId)];
    if (search) filters.push(or(
      ilike(purchaseVendors.name,  `%${search}%`),
      ilike(purchaseVendors.gstin, `%${search}%`),
      ilike(purchaseVendors.email, `%${search}%`),
      ilike(purchaseVendors.code,  `%${search}%`),
    ));
    if (status)   filters.push(eq(purchaseVendors.status,   status));
    if (category) filters.push(eq(purchaseVendors.category, category));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(purchaseVendors).where(where)
        .orderBy(purchaseVendors.name).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(purchaseVendors).where(where),
    ]);
    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendors" });
  }
});

router.get("/vendors/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(purchaseVendors)
      .where(and(eq(purchaseVendors.id, id), eq(purchaseVendors.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendor" });
  }
});

router.post("/vendors", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertPurchaseVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const code  = parsed.data.code || await nextVendorCode(orgId);
    const [created] = await db.insert(purchaseVendors).values({
      ...parsed.data, code, orgId, createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create vendor" });
  }
});

router.put("/vendors/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updatePurchaseVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: purchaseVendors.id }).from(purchaseVendors)
      .where(and(eq(purchaseVendors.id, id), eq(purchaseVendors.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const [updated] = await db.update(purchaseVendors)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(purchaseVendors.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: purchaseVendors.id }).from(purchaseVendors)
      .where(and(eq(purchaseVendors.id, id), eq(purchaseVendors.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    // Check for existing POs
    const [poCheck] = await db.select({ n: sql<number>`count(*)::int` }).from(purchaseOrders)
      .where(and(eq(purchaseOrders.vendorId, id), eq(purchaseOrders.orgId, orgId)));
    if ((poCheck?.n ?? 0) > 0) {
      res.status(409).json({ success: false, error: "Cannot delete vendor with existing purchase orders." });
      return;
    }
    await db.delete(purchaseVendors).where(eq(purchaseVendors.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete vendor" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/orders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const vendorId = req.query.vendorId ? parseInt(String(req.query.vendorId)) : null;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(purchaseOrders.orgId, orgId)];
    if (search) filters.push(or(
      ilike(purchaseOrders.poNumber, `%${search}%`),
      ilike(purchaseVendors.name,    `%${search}%`),
    ));
    if (status) filters.push(eq(purchaseOrders.status, status));
    if (vendorId && !isNaN(vendorId)) filters.push(eq(purchaseOrders.vendorId, vendorId));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:           purchaseOrders.id,
        poNumber:     purchaseOrders.poNumber,
        vendorId:     purchaseOrders.vendorId,
        vendorName:   purchaseVendors.name,
        orderDate:    purchaseOrders.orderDate,
        expectedDelivery: purchaseOrders.expectedDelivery,
        currency:     purchaseOrders.currency,
        subtotal:     purchaseOrders.subtotal,
        taxAmount:    purchaseOrders.taxAmount,
        totalAmount:  purchaseOrders.totalAmount,
        status:       purchaseOrders.status,
        notes:        purchaseOrders.notes,
        createdAt:    purchaseOrders.createdAt,
        updatedAt:    purchaseOrders.updatedAt,
      })
        .from(purchaseOrders)
        .innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
        .where(where)
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(purchaseOrders)
        .leftJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
        .where(where),
    ]);
    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase orders" });
  }
});

router.get("/orders/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [order] = await db
      .select({
        id:               purchaseOrders.id,
        poNumber:         purchaseOrders.poNumber,
        vendorId:         purchaseOrders.vendorId,
        vendorName:       purchaseVendors.name,
        vendorGstin:      purchaseVendors.gstin,
        vendorEmail:      purchaseVendors.email,
        orderDate:        purchaseOrders.orderDate,
        expectedDelivery: purchaseOrders.expectedDelivery,
        deliveryAddress:  purchaseOrders.deliveryAddress,
        currency:         purchaseOrders.currency,
        subtotal:         purchaseOrders.subtotal,
        taxAmount:        purchaseOrders.taxAmount,
        totalAmount:      purchaseOrders.totalAmount,
        status:           purchaseOrders.status,
        notes:            purchaseOrders.notes,
        termsConditions:  purchaseOrders.termsConditions,
        createdAt:        purchaseOrders.createdAt,
        updatedAt:        purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId)))
      .limit(1);
    if (!order) { res.status(404).json({ success: false, error: "Purchase order not found" }); return; }

    const lines = await db.select().from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.poId, id))
      .orderBy(purchaseOrderLines.sequence);

    res.json({ success: true, data: { ...order, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase order" });
  }
});

router.post("/orders", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertPurchaseOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;

    // Verify vendor belongs to org
    const [vendor] = await db.select({ id: purchaseVendors.id }).from(purchaseVendors)
      .where(and(eq(purchaseVendors.id, d.vendorId), eq(purchaseVendors.orgId, orgId))).limit(1);
    if (!vendor) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }

    const poNumber = d.poNumber || await nextPoNumber(orgId);

    // Compute line amounts
    let subtotal = 0;
    const lineValues = (d.lines ?? []).map((l, i) => {
      const qty   = parseFloat(l.quantity  ?? "1");
      const price = parseFloat(l.unitPrice ?? "0");
      const rate  = parseFloat(l.taxRate   ?? "0");
      const amt   = qty * price;
      const tax   = (amt * rate) / 100;
      subtotal += amt;
      return {
        itemCode:    l.itemCode ?? null,
        description: l.description,
        unit:        l.unit ?? "pcs",
        quantity:    String(qty),
        unitPrice:   price.toFixed(2),
        taxRate:     rate.toFixed(4),
        taxAmount:   tax.toFixed(2),
        amount:      amt.toFixed(2),
        totalAmount: (amt + tax).toFixed(2),
        sequence:    l.sequence ?? i,
      };
    });
    const taxAmount    = parseFloat(d.taxAmount ?? "0");
    const totalAmount  = subtotal + taxAmount;

    const [order] = await db.insert(purchaseOrders).values({
      orgId,
      vendorId:        d.vendorId,
      poNumber,
      orderDate:       d.orderDate,
      expectedDelivery: d.expectedDelivery ?? null,
      deliveryAddress: d.deliveryAddress ?? null,
      currency:        d.currency ?? "INR",
      subtotal:        subtotal.toFixed(2),
      taxAmount:       taxAmount.toFixed(2),
      totalAmount:     totalAmount.toFixed(2),
      status:          d.status ?? "draft",
      notes:           d.notes ?? null,
      termsConditions: d.termsConditions ?? null,
      createdBy:       req.user!.userId,
    }).returning();

    const lines = await db.insert(purchaseOrderLines).values(
      lineValues.map((l) => ({ ...l, poId: order.id }))
    ).returning();

    res.status(201).json({ success: true, data: { ...order, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create purchase order" });
  }
});

router.put("/orders/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updatePurchaseOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Purchase order not found" }); return; }
    if (existing.status === "received") {
      res.status(409).json({ success: false, error: "Received orders cannot be edited." });
      return;
    }

    const d = parsed.data;
    const updates: any = { updatedAt: new Date() };
    if (d.vendorId)         updates.vendorId = d.vendorId;
    if (d.orderDate)        updates.orderDate = d.orderDate;
    if (d.expectedDelivery !== undefined) updates.expectedDelivery = d.expectedDelivery;
    if (d.deliveryAddress !== undefined)  updates.deliveryAddress = d.deliveryAddress;
    if (d.currency)         updates.currency = d.currency;
    if (d.status)           updates.status = d.status;
    if (d.notes !== undefined) updates.notes = d.notes;
    if (d.termsConditions !== undefined) updates.termsConditions = d.termsConditions;

    if (d.lines) {
      // Replace lines
      await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, id));
      let subtotal = 0;
      const lineValues = d.lines.map((l, i) => {
        const qty   = parseFloat(l.quantity  ?? "1");
        const price = parseFloat(l.unitPrice ?? "0");
        const rate  = parseFloat(l.taxRate   ?? "0");
        const amt   = qty * price;
        const tax   = (amt * rate) / 100;
        subtotal += amt;
        return {
          poId:        id,
          itemCode:    l.itemCode ?? null,
          description: l.description,
          unit:        l.unit ?? "pcs",
          quantity:    String(qty),
          unitPrice:   price.toFixed(2),
          taxRate:     rate.toFixed(4),
          taxAmount:   tax.toFixed(2),
          amount:      amt.toFixed(2),
          totalAmount: (amt + tax).toFixed(2),
          sequence:    l.sequence ?? i,
        };
      });
      await db.insert(purchaseOrderLines).values(lineValues);
      const taxAmt = parseFloat(d.taxAmount ?? String(existing.taxAmount));
      updates.subtotal    = subtotal.toFixed(2);
      updates.taxAmount   = taxAmt.toFixed(2);
      updates.totalAmount = (subtotal + taxAmt).toFixed(2);
    } else if (d.taxAmount !== undefined) {
      const sub = parseFloat(String(existing.subtotal));
      const tax = parseFloat(d.taxAmount);
      updates.taxAmount   = tax.toFixed(2);
      updates.totalAmount = (sub + tax).toFixed(2);
    }

    const [updated] = await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id)).returning();
    const lines = await db.select().from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.poId, id)).orderBy(purchaseOrderLines.sequence);
    res.json({ success: true, data: { ...updated, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update purchase order" });
  }
});

router.delete("/orders/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Purchase order not found" }); return; }
    if (existing.status === "received") {
      res.status(409).json({ success: false, error: "Received orders cannot be deleted." });
      return;
    }
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete purchase order" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GOODS RECEIPT NOTES (GRN)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/grns", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const poId   = req.query.poId ? parseInt(String(req.query.poId)) : null;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(goodsReceiptNotes.orgId, orgId)];
    if (search) filters.push(or(
      ilike(goodsReceiptNotes.grnNumber, `%${search}%`),
      ilike(purchaseVendors.name,        `%${search}%`),
    ));
    if (status) filters.push(eq(goodsReceiptNotes.status, status));
    if (poId && !isNaN(poId)) filters.push(eq(goodsReceiptNotes.poId, poId));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:          goodsReceiptNotes.id,
        grnNumber:   goodsReceiptNotes.grnNumber,
        poId:        goodsReceiptNotes.poId,
        poNumber:    purchaseOrders.poNumber,
        vendorId:    goodsReceiptNotes.vendorId,
        vendorName:  purchaseVendors.name,
        receiptDate: goodsReceiptNotes.receiptDate,
        status:      goodsReceiptNotes.status,
        notes:       goodsReceiptNotes.notes,
        createdAt:   goodsReceiptNotes.createdAt,
      })
        .from(goodsReceiptNotes)
        .innerJoin(purchaseOrders,  eq(goodsReceiptNotes.poId,      purchaseOrders.id))
        .innerJoin(purchaseVendors, eq(goodsReceiptNotes.vendorId,   purchaseVendors.id))
        .where(where)
        .orderBy(desc(goodsReceiptNotes.createdAt))
        .limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(goodsReceiptNotes)
        .leftJoin(purchaseOrders,  eq(goodsReceiptNotes.poId,     purchaseOrders.id))
        .leftJoin(purchaseVendors, eq(goodsReceiptNotes.vendorId,  purchaseVendors.id))
        .where(where),
    ]);
    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch GRNs" });
  }
});

router.get("/grns/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [grn] = await db
      .select({
        id:          goodsReceiptNotes.id,
        grnNumber:   goodsReceiptNotes.grnNumber,
        poId:        goodsReceiptNotes.poId,
        poNumber:    purchaseOrders.poNumber,
        vendorId:    goodsReceiptNotes.vendorId,
        vendorName:  purchaseVendors.name,
        receiptDate: goodsReceiptNotes.receiptDate,
        status:      goodsReceiptNotes.status,
        notes:       goodsReceiptNotes.notes,
        createdAt:   goodsReceiptNotes.createdAt,
        updatedAt:   goodsReceiptNotes.updatedAt,
      })
      .from(goodsReceiptNotes)
      .innerJoin(purchaseOrders,  eq(goodsReceiptNotes.poId,     purchaseOrders.id))
      .innerJoin(purchaseVendors, eq(goodsReceiptNotes.vendorId,  purchaseVendors.id))
      .where(and(eq(goodsReceiptNotes.id, id), eq(goodsReceiptNotes.orgId, orgId)))
      .limit(1);
    if (!grn) { res.status(404).json({ success: false, error: "GRN not found" }); return; }
    const lines = await db.select().from(goodsReceiptLines)
      .where(eq(goodsReceiptLines.grnId, id)).orderBy(goodsReceiptLines.sequence);
    res.json({ success: true, data: { ...grn, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch GRN" });
  }
});

router.post("/grns", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertGRNSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;

    const [po] = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, d.poId), eq(purchaseOrders.orgId, orgId))).limit(1);
    if (!po) { res.status(404).json({ success: false, error: "Purchase order not found" }); return; }
    if (po.status === "cancelled") {
      res.status(409).json({ success: false, error: "Cannot create GRN for a cancelled PO." });
      return;
    }

    const grnNumber = d.grnNumber || await nextGrnNumber(orgId);

    const [grn] = await db.insert(goodsReceiptNotes).values({
      orgId, poId: d.poId, vendorId: po.vendorId,
      grnNumber, receiptDate: d.receiptDate,
      status: d.status ?? "draft", notes: d.notes ?? null,
      createdBy: req.user!.userId,
    }).returning();

    const lines = await db.insert(goodsReceiptLines).values(
      d.lines.map((l, i) => ({
        grnId:       grn.id,
        poLineId:    l.poLineId,
        description: l.description,
        orderedQty:  l.orderedQty ?? "0",
        receivedQty: l.receivedQty ?? "0",
        acceptedQty: l.acceptedQty ?? "0",
        rejectedQty: l.rejectedQty ?? "0",
        unit:        l.unit ?? "pcs",
        notes:       l.notes ?? null,
        sequence:    l.sequence ?? i,
      }))
    ).returning();

    // Update PO line received quantities
    for (const l of lines) {
      const received = parseFloat(String(l.receivedQty));
      if (received > 0) {
        const [cur] = await db.select({ receivedQty: purchaseOrderLines.receivedQty })
          .from(purchaseOrderLines).where(eq(purchaseOrderLines.id, l.poLineId)).limit(1);
        const newQty = parseFloat(String(cur?.receivedQty ?? "0")) + received;
        await db.update(purchaseOrderLines)
          .set({ receivedQty: String(newQty) })
          .where(eq(purchaseOrderLines.id, l.poLineId));
      }
    }

    // Update PO status to partial/received based on line quantities
    const poLines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, d.poId));
    const allReceived = poLines.every(l =>
      parseFloat(String(l.receivedQty)) >= parseFloat(String(l.quantity))
    );
    const anyReceived = poLines.some(l => parseFloat(String(l.receivedQty)) > 0);
    if (allReceived) {
      await db.update(purchaseOrders).set({ status: "received", updatedAt: new Date() })
        .where(eq(purchaseOrders.id, d.poId));
    } else if (anyReceived && po.status !== "partial") {
      await db.update(purchaseOrders).set({ status: "partial", updatedAt: new Date() })
        .where(eq(purchaseOrders.id, d.poId));
    }

    res.status(201).json({ success: true, data: { ...grn, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create GRN" });
  }
});

router.put("/grns/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateGRNSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: goodsReceiptNotes.id }).from(goodsReceiptNotes)
      .where(and(eq(goodsReceiptNotes.id, id), eq(goodsReceiptNotes.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "GRN not found" }); return; }
    const [updated] = await db.update(goodsReceiptNotes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(goodsReceiptNotes.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update GRN" });
  }
});

router.delete("/grns/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: goodsReceiptNotes.id, status: goodsReceiptNotes.status })
      .from(goodsReceiptNotes).where(and(eq(goodsReceiptNotes.id, id), eq(goodsReceiptNotes.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "GRN not found" }); return; }
    if (existing.status === "accepted") {
      res.status(409).json({ success: false, error: "Accepted GRNs cannot be deleted." });
      return;
    }
    await db.delete(goodsReceiptNotes).where(eq(goodsReceiptNotes.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete GRN" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST FOR QUOTATIONS (RFQ)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/rfqs", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(purchaseRFQs.orgId, orgId)];
    if (search) filters.push(or(
      ilike(purchaseRFQs.rfqNumber,        `%${search}%`),
      ilike(purchaseRFQs.itemsDescription, `%${search}%`),
      ilike(purchaseVendors.name,          `%${search}%`),
    ));
    if (status) filters.push(eq(purchaseRFQs.status, status));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:               purchaseRFQs.id,
        rfqNumber:        purchaseRFQs.rfqNumber,
        vendorId:         purchaseRFQs.vendorId,
        vendorName:       purchaseVendors.name,
        rfqDate:          purchaseRFQs.rfqDate,
        dueDate:          purchaseRFQs.dueDate,
        itemsDescription: purchaseRFQs.itemsDescription,
        estimatedValue:   purchaseRFQs.estimatedValue,
        status:           purchaseRFQs.status,
        convertedPoId:    purchaseRFQs.convertedPoId,
        notes:            purchaseRFQs.notes,
        createdAt:        purchaseRFQs.createdAt,
      })
        .from(purchaseRFQs)
        .leftJoin(purchaseVendors, eq(purchaseRFQs.vendorId, purchaseVendors.id))
        .where(where)
        .orderBy(desc(purchaseRFQs.createdAt))
        .limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(purchaseRFQs)
        .leftJoin(purchaseVendors, eq(purchaseRFQs.vendorId, purchaseVendors.id))
        .where(where),
    ]);
    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch RFQs" });
  }
});

router.post("/rfqs", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertPurchaseRFQSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const rfqNumber = parsed.data.rfqNumber || await nextRfqNumber(orgId);
    const [created] = await db.insert(purchaseRFQs).values({
      ...parsed.data,
      rfqNumber, orgId,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create RFQ" });
  }
});

router.put("/rfqs/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updatePurchaseRFQSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: purchaseRFQs.id, status: purchaseRFQs.status })
      .from(purchaseRFQs).where(and(eq(purchaseRFQs.id, id), eq(purchaseRFQs.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "RFQ not found" }); return; }
    if (existing.status === "converted") {
      res.status(409).json({ success: false, error: "Converted RFQs cannot be edited." });
      return;
    }
    const [updated] = await db.update(purchaseRFQs)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(purchaseRFQs.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update RFQ" });
  }
});

router.delete("/rfqs/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: purchaseRFQs.id, status: purchaseRFQs.status })
      .from(purchaseRFQs).where(and(eq(purchaseRFQs.id, id), eq(purchaseRFQs.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "RFQ not found" }); return; }
    if (existing.status === "converted") {
      res.status(409).json({ success: false, error: "Converted RFQs cannot be deleted." });
      return;
    }
    await db.delete(purchaseRFQs).where(eq(purchaseRFQs.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete RFQ" });
  }
});

export default router;
