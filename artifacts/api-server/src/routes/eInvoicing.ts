/**
 * /api/einvoice — E-Invoicing: buyers, invoices, IRN management
 *
 * All routes require authentication + "E-Invoicing" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  einvBuyers, einvInvoices, einvInvoiceLines,
} from "@workspace/db";
import {
  insertEInvBuyerSchema, updateEInvBuyerSchema,
  insertEInvInvoiceSchema, updateEInvInvoiceSchema,
  submitEInvInvoiceSchema, cancelEInvInvoiceSchema,
  EINV_INVOICE_STATUSES,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "E-Invoicing";

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeLineAmounts(line: {
  quantity: string; unitPrice: string; discount: string;
  cgstRate: string; sgstRate: string; igstRate: string; cessRate: string;
}) {
  const qty      = parseFloat(line.quantity  || "1");
  const price    = parseFloat(line.unitPrice || "0");
  const disc     = parseFloat(line.discount  || "0");
  const taxable  = Math.max(0, qty * price - disc);
  const cgst     = parseFloat(line.cgstRate || "0");
  const sgst     = parseFloat(line.sgstRate || "0");
  const igst     = parseFloat(line.igstRate || "0");
  const cess     = parseFloat(line.cessRate || "0");
  const cgstAmt  = taxable * cgst / 100;
  const sgstAmt  = taxable * sgst / 100;
  const igstAmt  = taxable * igst / 100;
  const cessAmt  = taxable * cess / 100;
  const total    = taxable + cgstAmt + sgstAmt + igstAmt + cessAmt;
  return {
    taxableAmount: taxable.toFixed(2),
    cgstAmount:    cgstAmt.toFixed(2),
    sgstAmount:    sgstAmt.toFixed(2),
    igstAmount:    igstAmt.toFixed(2),
    cessAmount:    cessAmt.toFixed(2),
    totalAmount:   total.toFixed(2),
  };
}

function sumLines(lines: ReturnType<typeof computeLineAmounts>[]) {
  let subtotal = 0, totalDiscount = 0, totalTaxable = 0;
  let cgst = 0, sgst = 0, igst = 0, cess = 0, total = 0;
  for (const l of lines) {
    totalTaxable += parseFloat(l.taxableAmount);
    cgst         += parseFloat(l.cgstAmount);
    sgst         += parseFloat(l.sgstAmount);
    igst         += parseFloat(l.igstAmount);
    cess         += parseFloat(l.cessAmount);
    total        += parseFloat(l.totalAmount);
  }
  return {
    subtotal:      subtotal.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    totalTaxable:  totalTaxable.toFixed(2),
    cgstAmount:    cgst.toFixed(2),
    sgstAmount:    sgst.toFixed(2),
    igstAmount:    igst.toFixed(2),
    cessAmount:    cess.toFixed(2),
    totalAmount:   total.toFixed(2),
  };
}

async function nextInvoiceNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(einvInvoices)
    .where(eq(einvInvoices.orgId, orgId));
  return `EINV-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
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

    const [{ totalInvoices }] = await db
      .select({ totalInvoices: sql<number>`count(*)::int` })
      .from(einvInvoices)
      .where(eq(einvInvoices.orgId, orgId));

    const [{ acknowledged }] = await db
      .select({ acknowledged: sql<number>`count(*)::int` })
      .from(einvInvoices)
      .where(and(eq(einvInvoices.orgId, orgId), eq(einvInvoices.status, "acknowledged")));

    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(einvInvoices)
      .where(and(eq(einvInvoices.orgId, orgId), sql`status in ('draft','submitted')`));

    const [{ cancelled }] = await db
      .select({ cancelled: sql<number>`count(*)::int` })
      .from(einvInvoices)
      .where(and(eq(einvInvoices.orgId, orgId), eq(einvInvoices.status, "cancelled")));

    const [{ totalValue }] = await db
      .select({ totalValue: sql<string>`coalesce(sum(total_amount), 0)::text` })
      .from(einvInvoices)
      .where(and(eq(einvInvoices.orgId, orgId), sql`status != 'cancelled'`));

    const [{ totalTax }] = await db
      .select({ totalTax: sql<string>`coalesce(sum(cgst_amount + sgst_amount + igst_amount + cess_amount), 0)::text` })
      .from(einvInvoices)
      .where(and(eq(einvInvoices.orgId, orgId), sql`status != 'cancelled'`));

    res.json({
      success: true,
      data: {
        totalInvoices: totalInvoices ?? 0,
        acknowledged:  acknowledged  ?? 0,
        pending:       pending       ?? 0,
        cancelled:     cancelled     ?? 0,
        totalValue:    totalValue    ?? "0",
        totalTax:      totalTax      ?? "0",
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ── Buyers ────────────────────────────────────────────────────────────────────

router.get("/buyers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const search = req.query.search as string | undefined;
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;

    const where = search
      ? and(
          eq(einvBuyers.orgId, orgId),
          or(
            ilike(einvBuyers.name,  `%${search}%`),
            ilike(einvBuyers.gstin, `%${search}%`),
            ilike(einvBuyers.email, `%${search}%`),
          ),
        )
      : eq(einvBuyers.orgId, orgId);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(einvBuyers)
      .where(where);

    const rows = await db
      .select()
      .from(einvBuyers)
      .where(where)
      .orderBy(einvBuyers.name)
      .limit(limit)
      .offset(offset);

    res.json({ success: true, data: rows, total: total ?? 0 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch buyers" });
  }
});

router.post("/buyers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertEInvBuyerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [row] = await db.insert(einvBuyers).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create buyer" });
  }
});

router.put("/buyers/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateEInvBuyerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvBuyers)
      .where(and(eq(einvBuyers.id, id), eq(einvBuyers.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Buyer not found" }); return; }
    const [updated] = await db.update(einvBuyers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(einvBuyers.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update buyer" });
  }
});

router.delete("/buyers/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvBuyers)
      .where(and(eq(einvBuyers.id, id), eq(einvBuyers.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Buyer not found" }); return; }
    // Check if buyer is used in invoices
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(einvInvoices)
      .where(and(eq(einvInvoices.buyerId, id), sql`status != 'cancelled'`));
    if ((cnt ?? 0) > 0) {
      res.status(409).json({ success: false, error: "Buyer has active invoices and cannot be deleted" });
      return;
    }
    await db.delete(einvBuyers).where(eq(einvBuyers.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete buyer" });
  }
});

// ── Invoices ──────────────────────────────────────────────────────────────────

router.get("/invoices", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId   = req.user!.orgId!;
    const search  = req.query.search as string | undefined;
    const status  = req.query.status as string | undefined;
    const type    = req.query.type   as string | undefined;
    const page    = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit   = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset  = (page - 1) * limit;

    const conditions = [eq(einvInvoices.orgId, orgId)];
    if (status) conditions.push(eq(einvInvoices.status, status));
    if (type)   conditions.push(eq(einvInvoices.invoiceType, type));
    if (search) {
      conditions.push(
        or(
          ilike(einvInvoices.invoiceNumber, `%${search}%`),
          ilike(einvInvoices.irn,           `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(einvInvoices)
      .where(where);

    const rows = await db
      .select({
        invoice: einvInvoices,
        buyerName: einvBuyers.name,
        buyerGstin: einvBuyers.gstin,
      })
      .from(einvInvoices)
      .leftJoin(einvBuyers, eq(einvInvoices.buyerId, einvBuyers.id))
      .where(where)
      .orderBy(desc(einvInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map(r => ({ ...r.invoice, buyerName: r.buyerName, buyerGstin: r.buyerGstin }));
    res.json({ success: true, data, total: total ?? 0 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [row] = await db
      .select({
        invoice: einvInvoices,
        buyerName:  einvBuyers.name,
        buyerGstin: einvBuyers.gstin,
        buyerAddress: einvBuyers.address,
        buyerCity:    einvBuyers.city,
        buyerState:   einvBuyers.state,
      })
      .from(einvInvoices)
      .leftJoin(einvBuyers, eq(einvInvoices.buyerId, einvBuyers.id))
      .where(and(eq(einvInvoices.id, id), eq(einvInvoices.orgId, orgId)))
      .limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    const lines = await db.select().from(einvInvoiceLines)
      .where(eq(einvInvoiceLines.invoiceId, id))
      .orderBy(einvInvoiceLines.sequence);
    res.json({ success: true, data: { ...row.invoice, buyerName: row.buyerName, buyerGstin: row.buyerGstin, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoice" });
  }
});

router.post("/invoices", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertEInvInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId  = req.user!.orgId!;
    const userId = req.user!.id;
    const data   = parsed.data;

    const invoiceNumber = data.invoiceNumber ?? await nextInvoiceNumber(orgId);

    // Compute line amounts
    const computedLines = data.lines.map(l => ({ ...l, ...computeLineAmounts(l as any) }));
    const totals = sumLines(computedLines);

    const [invoice] = await db.insert(einvInvoices).values({
      orgId,
      invoiceNumber,
      invoiceType:   data.invoiceType,
      supplyType:    data.supplyType,
      buyerId:       data.buyerId ?? null,
      issueDate:     data.issueDate,
      placeOfSupply: data.placeOfSupply ?? null,
      notes:         data.notes ?? null,
      status:        "draft",
      createdBy:     userId,
      ...totals,
    }).returning();

    // Insert lines
    if (computedLines.length > 0) {
      await db.insert(einvInvoiceLines).values(
        computedLines.map((l, i) => ({
          invoiceId:    invoice.id,
          description:  l.description,
          hsnCode:      l.hsnCode ?? null,
          quantity:     l.quantity ?? "1",
          unitPrice:    l.unitPrice ?? "0",
          discount:     l.discount ?? "0",
          taxableAmount: l.taxableAmount,
          cgstRate:     l.cgstRate ?? "0",
          cgstAmount:   l.cgstAmount,
          sgstRate:     l.sgstRate ?? "0",
          sgstAmount:   l.sgstAmount,
          igstRate:     l.igstRate ?? "0",
          igstAmount:   l.igstAmount,
          cessRate:     l.cessRate ?? "0",
          cessAmount:   l.cessAmount,
          totalAmount:  l.totalAmount,
          sequence:     l.sequence ?? i,
        })),
      );
    }

    res.status(201).json({ success: true, data: invoice });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create invoice" });
  }
});

router.put("/invoices/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateEInvInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvInvoices)
      .where(and(eq(einvInvoices.id, id), eq(einvInvoices.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (existing.status !== "draft") {
      res.status(409).json({ success: false, error: "Only draft invoices can be edited" });
      return;
    }

    const data = parsed.data;
    const payload: Record<string, unknown> = { updatedAt: new Date() };
    if (data.invoiceType   !== undefined) payload.invoiceType   = data.invoiceType;
    if (data.supplyType    !== undefined) payload.supplyType    = data.supplyType;
    if (data.buyerId       !== undefined) payload.buyerId       = data.buyerId;
    if (data.issueDate     !== undefined) payload.issueDate     = data.issueDate;
    if (data.placeOfSupply !== undefined) payload.placeOfSupply = data.placeOfSupply;
    if (data.notes         !== undefined) payload.notes         = data.notes;

    if (data.lines) {
      const computedLines = data.lines.map(l => ({ ...l, ...computeLineAmounts(l as any) }));
      const totals = sumLines(computedLines);
      Object.assign(payload, totals);

      await db.delete(einvInvoiceLines).where(eq(einvInvoiceLines.invoiceId, id));
      await db.insert(einvInvoiceLines).values(
        computedLines.map((l, i) => ({
          invoiceId:    id,
          description:  l.description,
          hsnCode:      l.hsnCode ?? null,
          quantity:     l.quantity ?? "1",
          unitPrice:    l.unitPrice ?? "0",
          discount:     l.discount ?? "0",
          taxableAmount: l.taxableAmount,
          cgstRate:     l.cgstRate ?? "0",
          cgstAmount:   l.cgstAmount,
          sgstRate:     l.sgstRate ?? "0",
          sgstAmount:   l.sgstAmount,
          igstRate:     l.igstRate ?? "0",
          igstAmount:   l.igstAmount,
          cessRate:     l.cessRate ?? "0",
          cessAmount:   l.cessAmount,
          totalAmount:  l.totalAmount,
          sequence:     l.sequence ?? i,
        })),
      );
    }

    const [updated] = await db.update(einvInvoices).set(payload).where(eq(einvInvoices.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update invoice" });
  }
});

// POST /einvoice/invoices/:id/submit  — draft → submitted (or directly acknowledged)
router.post("/invoices/:id/submit", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = submitEInvInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvInvoices)
      .where(and(eq(einvInvoices.id, id), eq(einvInvoices.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (existing.status !== "draft") {
      res.status(409).json({ success: false, error: `Cannot submit invoice with status '${existing.status}'` });
      return;
    }
    const data = parsed.data;
    // If IRN provided, mark as acknowledged; otherwise mark as submitted
    const newStatus = data.irn ? "acknowledged" : "submitted";
    const [updated] = await db.update(einvInvoices).set({
      status:    newStatus,
      irn:       data.irn       ?? null,
      ackNumber: data.ackNumber ?? null,
      ackDate:   data.ackDate   ?? null,
      qrCode:    data.qrCode    ?? null,
      updatedAt: new Date(),
    }).where(eq(einvInvoices.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to submit invoice" });
  }
});

// POST /einvoice/invoices/:id/acknowledge  — submitted → acknowledged
router.post("/invoices/:id/acknowledge", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = submitEInvInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvInvoices)
      .where(and(eq(einvInvoices.id, id), eq(einvInvoices.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (existing.status !== "submitted") {
      res.status(409).json({ success: false, error: `Invoice must be 'submitted' to acknowledge` });
      return;
    }
    const data = parsed.data;
    const [updated] = await db.update(einvInvoices).set({
      status:    "acknowledged",
      irn:       data.irn       ?? existing.irn,
      ackNumber: data.ackNumber ?? existing.ackNumber,
      ackDate:   data.ackDate   ?? existing.ackDate,
      qrCode:    data.qrCode    ?? existing.qrCode,
      updatedAt: new Date(),
    }).where(eq(einvInvoices.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to acknowledge invoice" });
  }
});

// POST /einvoice/invoices/:id/cancel  — acknowledged → cancelled
router.post("/invoices/:id/cancel", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = cancelEInvInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvInvoices)
      .where(and(eq(einvInvoices.id, id), eq(einvInvoices.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (!["submitted", "acknowledged"].includes(existing.status)) {
      res.status(409).json({ success: false, error: "Only submitted or acknowledged invoices can be cancelled" });
      return;
    }
    const [updated] = await db.update(einvInvoices).set({
      status:       "cancelled",
      cancelReason: parsed.data.cancelReason,
      cancelledAt:  new Date(),
      updatedAt:    new Date(),
    }).where(eq(einvInvoices.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to cancel invoice" });
  }
});

// DELETE /einvoice/invoices/:id  — only draft invoices can be deleted
router.delete("/invoices/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(einvInvoices)
      .where(and(eq(einvInvoices.id, id), eq(einvInvoices.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (existing.status !== "draft") {
      res.status(409).json({ success: false, error: "Only draft invoices can be deleted" });
      return;
    }
    await db.delete(einvInvoiceLines).where(eq(einvInvoiceLines.invoiceId, id));
    await db.delete(einvInvoices).where(eq(einvInvoices.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete invoice" });
  }
});

export default router;
