/**
 * /api/ap — Accounts Payable: vendors, bills, payments
 *
 * All routes require authentication + "Accounts Payable" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  apVendors, apBills, apBillLines, apPayments,
  organizations,
} from "@workspace/db";
import {
  insertAPVendorSchema, updateAPVendorSchema,
  insertAPBillSchema, updateAPBillSchema,
  insertAPPaymentSchema, updateAPPaymentSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Accounts Payable";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextBillNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(apBills)
    .where(eq(apBills.orgId, orgId));
  return `BILL-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [perm] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
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

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [{ totalPayable }] = await db
      .select({ totalPayable: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text` })
      .from(apBills)
      .where(and(eq(apBills.orgId, orgId), sql`status not in ('paid', 'void', 'draft')`));

    const [{ totalOverdue }] = await db
      .select({ totalOverdue: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text` })
      .from(apBills)
      .where(and(eq(apBills.orgId, orgId), sql`status = 'overdue'`));

    const [{ paidThisMonth }] = await db
      .select({ paidThisMonth: sql<string>`coalesce(sum(amount), 0)::text` })
      .from(apPayments)
      .where(and(eq(apPayments.orgId, orgId), sql`payment_date >= ${monthStart}`));

    const [{ draftCount }] = await db
      .select({ draftCount: sql<number>`count(*)::int` })
      .from(apBills)
      .where(and(eq(apBills.orgId, orgId), sql`status = 'draft'`));

    const [{ overdueCount }] = await db
      .select({ overdueCount: sql<number>`count(*)::int` })
      .from(apBills)
      .where(and(eq(apBills.orgId, orgId), sql`status = 'overdue'`));

    const [{ vendorCount }] = await db
      .select({ vendorCount: sql<number>`count(*)::int` })
      .from(apVendors)
      .where(and(eq(apVendors.orgId, orgId), sql`status = 'active'`));

    res.json({
      success: true,
      data: { totalPayable, totalOverdue, paidThisMonth, draftCount, overdueCount, vendorCount },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VENDORS
// ══════════════════════════════════════════════════════════════════════════════

// GET /ap/vendors
router.get("/vendors", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status } = req.query as Record<string, string>;

    const filters: any[] = [eq(apVendors.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(apVendors.name,  `%${search.trim()}%`),
        ilike(apVendors.email, `%${search.trim()}%`),
      ));
    }
    if (status) filters.push(eq(apVendors.status, status));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(apVendors).where(where).orderBy(apVendors.name).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(apVendors).where(where),
    ]);

    // Bill counts + outstanding per vendor
    const ids = rows.map((r) => r.id);
    let billMeta: Record<number, { billCount: number; totalOutstanding: string }> = {};
    if (ids.length > 0) {
      const meta = await db
        .select({
          vendorId:        apBills.vendorId,
          billCount:       sql<number>`count(*)::int`,
          totalOutstanding: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text`,
        })
        .from(apBills)
        .where(sql`vendor_id = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(apBills.vendorId);
      meta.forEach((m) => { billMeta[m.vendorId] = { billCount: m.billCount, totalOutstanding: m.totalOutstanding }; });
    }

    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, ...(billMeta[r.id] ?? { billCount: 0, totalOutstanding: "0" }) })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendors" });
  }
});

// GET /ap/vendors/:id
router.get("/vendors/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(apVendors)
      .where(and(eq(apVendors.id, id), eq(apVendors.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendor" });
  }
});

// POST /ap/vendors
router.post("/vendors", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertAPVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [created] = await db.insert(apVendors).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create vendor" });
  }
});

// PUT /ap/vendors/:id
router.put("/vendors/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateAPVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [existing] = await db.select({ id: apVendors.id }).from(apVendors)
      .where(and(eq(apVendors.id, id), eq(apVendors.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const [updated] = await db.update(apVendors).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(apVendors.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update vendor" });
  }
});

// DELETE /ap/vendors/:id
router.delete("/vendors/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: apVendors.id, name: apVendors.name }).from(apVendors)
      .where(and(eq(apVendors.id, id), eq(apVendors.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` }).from(apBills).where(eq(apBills.vendorId, id));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — ${cnt} bill(s) exist. Remove bills first.` });
      return;
    }
    await db.delete(apVendors).where(eq(apVendors.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete vendor" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BILLS
// ══════════════════════════════════════════════════════════════════════════════

// GET /ap/bills
router.get("/bills", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, vendorId } = req.query as Record<string, string>;

    const filters: any[] = [eq(apBills.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(apBills.billNumber, `%${search.trim()}%`),
        ilike(apVendors.name,     `%${search.trim()}%`),
      ));
    }
    if (status)   filters.push(eq(apBills.status, status));
    if (vendorId) filters.push(eq(apBills.vendorId, parseInt(vendorId)));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: apBills.id, orgId: apBills.orgId, vendorId: apBills.vendorId,
        billNumber: apBills.billNumber, issueDate: apBills.issueDate, dueDate: apBills.dueDate,
        status: apBills.status, subtotal: apBills.subtotal, taxAmount: apBills.taxAmount,
        totalAmount: apBills.totalAmount, amountPaid: apBills.amountPaid, notes: apBills.notes,
        createdBy: apBills.createdBy, createdAt: apBills.createdAt, updatedAt: apBills.updatedAt,
        vendorName: apVendors.name,
      })
        .from(apBills)
        .leftJoin(apVendors, eq(apBills.vendorId, apVendors.id))
        .where(where)
        .orderBy(desc(apBills.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(apBills)
        .leftJoin(apVendors, eq(apBills.vendorId, apVendors.id))
        .where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch bills" });
  }
});

// GET /ap/bills/:id  (includes lines)
router.get("/bills/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select({
      id: apBills.id, orgId: apBills.orgId, vendorId: apBills.vendorId,
      billNumber: apBills.billNumber, issueDate: apBills.issueDate, dueDate: apBills.dueDate,
      status: apBills.status, subtotal: apBills.subtotal, taxAmount: apBills.taxAmount,
      totalAmount: apBills.totalAmount, amountPaid: apBills.amountPaid, notes: apBills.notes,
      createdBy: apBills.createdBy, createdAt: apBills.createdAt, updatedAt: apBills.updatedAt,
      vendorName: apVendors.name,
    })
      .from(apBills)
      .leftJoin(apVendors, eq(apBills.vendorId, apVendors.id))
      .where(and(eq(apBills.id, id), eq(apBills.orgId, req.user!.orgId!)))
      .limit(1);

    if (!row) { res.status(404).json({ success: false, error: "Bill not found" }); return; }

    const lines = await db.select().from(apBillLines)
      .where(eq(apBillLines.billId, id)).orderBy(apBillLines.sequence);

    res.json({ success: true, data: { ...row, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch bill" });
  }
});

// POST /ap/bills
router.post("/bills", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertAPBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    // Verify vendor belongs to this org
    const [vendor] = await db.select({ id: apVendors.id }).from(apVendors)
      .where(and(eq(apVendors.id, data.vendorId), eq(apVendors.orgId, orgId))).limit(1);
    if (!vendor) { res.status(422).json({ success: false, error: "Vendor not found" }); return; }

    const billNumber = data.billNumber ?? (await nextBillNumber(orgId));

    // Duplicate bill number check
    const [dup] = await db.select({ id: apBills.id }).from(apBills)
      .where(and(eq(apBills.orgId, orgId), eq(apBills.billNumber, billNumber))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `Bill number "${billNumber}" already exists` }); return; }

    const subtotal = data.lines.reduce((sum, l) => {
      return sum + parseFloat(l.quantity ?? "1") * parseFloat(l.unitPrice ?? "0");
    }, 0);
    const taxAmount   = parseFloat(data.taxAmount ?? "0");
    const totalAmount = subtotal + taxAmount;

    const [bill] = await db.insert(apBills).values({
      orgId, vendorId: data.vendorId, billNumber, issueDate: data.issueDate, dueDate: data.dueDate,
      status: data.status ?? "draft",
      subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), totalAmount: totalAmount.toFixed(2),
      amountPaid: "0.00", notes: data.notes ?? null, createdBy: req.user!.id,
    }).returning();

    const linesData = data.lines.map((l, i) => {
      const qty   = parseFloat(l.quantity ?? "1");
      const price = parseFloat(l.unitPrice ?? "0");
      return {
        billId: bill.id, description: l.description,
        quantity: qty.toString(), unitPrice: price.toFixed(2), amount: (qty * price).toFixed(2),
        sequence: l.sequence ?? i,
      };
    });
    const lines = await db.insert(apBillLines).values(linesData).returning();

    res.status(201).json({ success: true, data: { ...bill, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create bill" });
  }
});

// PUT /ap/bills/:id
router.put("/bills/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }

  const parsed = updateAPBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(apBills)
      .where(and(eq(apBills.id, id), eq(apBills.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Bill not found" }); return; }

    const data = parsed.data;
    const updatePayload: Record<string, any> = { updatedAt: new Date() };

    if (data.vendorId)  updatePayload.vendorId  = data.vendorId;
    if (data.issueDate) updatePayload.issueDate  = data.issueDate;
    if (data.dueDate)   updatePayload.dueDate    = data.dueDate;
    if (data.status)    updatePayload.status     = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    if (data.lines && (existing.status === "draft" || existing.status === "received")) {
      const subtotal = data.lines.reduce((sum, l) => {
        return sum + parseFloat(l.quantity ?? "1") * parseFloat(l.unitPrice ?? "0");
      }, 0);
      const taxAmount   = parseFloat(data.taxAmount ?? existing.taxAmount);
      const totalAmount = subtotal + taxAmount;
      updatePayload.subtotal    = subtotal.toFixed(2);
      updatePayload.taxAmount   = taxAmount.toFixed(2);
      updatePayload.totalAmount = totalAmount.toFixed(2);

      await db.delete(apBillLines).where(eq(apBillLines.billId, id));
      const linesData = data.lines.map((l, i) => {
        const qty   = parseFloat(l.quantity ?? "1");
        const price = parseFloat(l.unitPrice ?? "0");
        return { billId: id, description: l.description, quantity: qty.toString(), unitPrice: price.toFixed(2), amount: (qty * price).toFixed(2), sequence: l.sequence ?? i };
      });
      await db.insert(apBillLines).values(linesData);
    }

    const [updated] = await db.update(apBills).set(updatePayload).where(eq(apBills.id, id)).returning();
    const lines = await db.select().from(apBillLines).where(eq(apBillLines.billId, id)).orderBy(apBillLines.sequence);

    res.json({ success: true, data: { ...updated, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update bill" });
  }
});

// DELETE /ap/bills/:id  (draft only)
router.delete("/bills/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select().from(apBills)
      .where(and(eq(apBills.id, id), eq(apBills.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Bill not found" }); return; }
    if (existing.status !== "draft") {
      res.status(409).json({ success: false, error: "Only draft bills can be deleted. Void it first." });
      return;
    }
    await db.delete(apBills).where(eq(apBills.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete bill" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /ap/payments
router.get("/payments", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { billId, vendorId } = req.query as Record<string, string>;

    const filters: any[] = [eq(apPayments.orgId, orgId)];
    if (billId)   filters.push(eq(apPayments.billId,   parseInt(billId)));
    if (vendorId) filters.push(eq(apPayments.vendorId, parseInt(vendorId)));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: apPayments.id, orgId: apPayments.orgId, billId: apPayments.billId,
        vendorId: apPayments.vendorId, paymentDate: apPayments.paymentDate,
        amount: apPayments.amount, method: apPayments.method, reference: apPayments.reference,
        notes: apPayments.notes, createdBy: apPayments.createdBy, createdAt: apPayments.createdAt,
        billNumber: apBills.billNumber, vendorName: apVendors.name,
      })
        .from(apPayments)
        .leftJoin(apBills,   eq(apPayments.billId,   apBills.id))
        .leftJoin(apVendors, eq(apPayments.vendorId, apVendors.id))
        .where(where)
        .orderBy(desc(apPayments.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(apPayments).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
});

// POST /ap/payments
router.post("/payments", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertAPPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    const [bill] = await db.select().from(apBills)
      .where(and(eq(apBills.id, data.billId), eq(apBills.orgId, orgId))).limit(1);
    if (!bill) { res.status(422).json({ success: false, error: "Bill not found" }); return; }
    if (bill.status === "void") { res.status(409).json({ success: false, error: "Cannot apply payment to a voided bill" }); return; }

    const paymentAmt = parseFloat(data.amount);
    const newPaid    = parseFloat(bill.amountPaid) + paymentAmt;
    const total      = parseFloat(bill.totalAmount);

    if (newPaid > total + 0.001) {
      res.status(409).json({ success: false, error: `Payment of ${data.amount} exceeds remaining balance of ${(total - parseFloat(bill.amountPaid)).toFixed(2)}` });
      return;
    }

    const newStatus = newPaid >= total - 0.001 ? "paid" : "partial";

    const [payment] = await db.insert(apPayments).values({
      orgId, billId: data.billId, vendorId: bill.vendorId,
      paymentDate: data.paymentDate, amount: paymentAmt.toFixed(2),
      method: data.method ?? "bank_transfer", reference: data.reference ?? null,
      notes: data.notes ?? null, createdBy: req.user!.id,
    }).returning();

    await db.update(apBills)
      .set({ amountPaid: newPaid.toFixed(2), status: newStatus, updatedAt: new Date() })
      .where(eq(apBills.id, data.billId));

    res.status(201).json({ success: true, data: payment });
  } catch {
    res.status(500).json({ success: false, error: "Failed to record payment" });
  }
});

// PUT /ap/payments/:id
router.put("/payments/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateAPPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(apPayments)
      .where(and(eq(apPayments.id, id), eq(apPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }

    const data = parsed.data;
    const updatePayload: Record<string, any> = {};
    if (data.paymentDate) updatePayload.paymentDate = data.paymentDate;
    if (data.method)      updatePayload.method      = data.method;
    if (data.reference !== undefined) updatePayload.reference = data.reference;
    if (data.notes !== undefined)     updatePayload.notes     = data.notes;

    if (data.amount && data.amount !== existing.amount) {
      const [bill] = await db.select().from(apBills).where(eq(apBills.id, existing.billId)).limit(1);
      if (bill) {
        const delta   = parseFloat(data.amount) - parseFloat(existing.amount);
        const newPaid = parseFloat(bill.amountPaid) + delta;
        const total   = parseFloat(bill.totalAmount);
        if (newPaid > total + 0.001) {
          res.status(409).json({ success: false, error: "Adjusted amount exceeds bill total" });
          return;
        }
        const newStatus = newPaid >= total - 0.001 ? "paid" : newPaid > 0 ? "partial" : "received";
        await db.update(apBills)
          .set({ amountPaid: Math.max(0, newPaid).toFixed(2), status: newStatus, updatedAt: new Date() })
          .where(eq(apBills.id, existing.billId));
        updatePayload.amount = parseFloat(data.amount).toFixed(2);
      }
    }

    const [updated] = await db.update(apPayments).set(updatePayload).where(eq(apPayments.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update payment" });
  }
});

// DELETE /ap/payments/:id  (reverses amountPaid on bill)
router.delete("/payments/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(apPayments)
      .where(and(eq(apPayments.id, id), eq(apPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }

    const [bill] = await db.select().from(apBills).where(eq(apBills.id, existing.billId)).limit(1);
    if (bill) {
      const newPaid   = Math.max(0, parseFloat(bill.amountPaid) - parseFloat(existing.amount));
      const total     = parseFloat(bill.totalAmount);
      const newStatus = bill.status === "void" ? "void" : newPaid <= 0 ? "received" : newPaid < total ? "partial" : "paid";
      await db.update(apBills)
        .set({ amountPaid: newPaid.toFixed(2), status: newStatus, updatedAt: new Date() })
        .where(eq(apBills.id, existing.billId));
    }

    await db.delete(apPayments).where(eq(apPayments.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete payment" });
  }
});

export default router;
