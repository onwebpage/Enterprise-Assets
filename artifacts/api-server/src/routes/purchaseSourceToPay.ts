import { Router } from "express";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  purchaseVendors,
  purchaseOrders,
  purchaseOrderLines,
  purchaseRFQs,
  purchaseRequisitions,
  purchaseRequisitionLines,
  purchaseRfqInvites,
  purchaseQuotes,
  purchaseQuoteLines,
  purchaseInvoices,
  purchaseInvoiceLines,
  purchasePayments,
  goodsReceiptNotes,
} from "@workspace/db";
import {
  insertPurchaseRequisitionSchema,
  updatePurchaseRequisitionSchema,
  insertPurchaseQuoteSchema,
  updatePurchaseQuoteSchema,
  insertPurchaseInvoiceSchema,
  updatePurchaseInvoiceSchema,
  insertPurchasePaymentSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Purchase & Procurement";
const requisitionActionSchema = z.object({ reason: z.string().max(1000).nullable().optional() });
const inviteSchema = z.object({ vendorIds: z.array(z.number().int().positive()).min(1).max(100) });
const awardSchema = z.object({ quoteId: z.number().int().positive(), awardReason: z.string().min(1).max(1000) });
const matchTolerance = 0.01;

function idOf(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function nextNumber(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function nextRequisitionNumber(orgId: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseRequisitions).where(eq(purchaseRequisitions.orgId, orgId));
  return nextNumber("REQ", count ?? 0);
}

async function nextQuoteNumber(orgId: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseQuotes).where(eq(purchaseQuotes.orgId, orgId));
  return nextNumber("QUO", count ?? 0);
}

async function nextInvoiceNumber(orgId: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseInvoices).where(eq(purchaseInvoices.orgId, orgId));
  return nextNumber("PINV", count ?? 0);
}

async function nextPaymentNumber(orgId: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(purchasePayments).where(eq(purchasePayments.orgId, orgId));
  return nextNumber("PAY", count ?? 0);
}

async function nextPoNumber(orgId: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId));
  return nextNumber("PO", count ?? 0);
}

async function getOrgVendor(orgId: number, vendorId: number) {
  const [vendor] = await db.select().from(purchaseVendors)
    .where(and(eq(purchaseVendors.id, vendorId), eq(purchaseVendors.orgId, orgId))).limit(1);
  return vendor;
}

async function getOrgPo(orgId: number, poId: number) {
  const [po] = await db.select().from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.orgId, orgId))).limit(1);
  return po;
}

async function calculateLines(lines: Array<{ description: string; itemCode?: string | null; unit?: string; quantity?: string; unitPrice?: string; taxRate?: string; sequence?: number }>) {
  let subtotal = 0;
  let taxAmount = 0;
  const values = lines.map((line, index) => {
    const quantity = Number(line.quantity ?? "1");
    const unitPrice = Number(line.unitPrice ?? "0");
    const taxRate = Number(line.taxRate ?? "0");
    const amount = roundMoney(quantity * unitPrice);
    const tax = roundMoney(amount * taxRate / 100);
    subtotal += amount;
    taxAmount += tax;
    return {
      itemCode: line.itemCode ?? null,
      description: line.description,
      unit: line.unit ?? "pcs",
      quantity: String(quantity),
      unitPrice: unitPrice.toFixed(2),
      taxRate: taxRate.toFixed(4),
      taxAmount: tax.toFixed(2),
      amount: amount.toFixed(2),
      totalAmount: (amount + tax).toFixed(2),
      sequence: line.sequence ?? index,
    };
  });
  return { values, subtotal: roundMoney(subtotal), taxAmount: roundMoney(taxAmount), totalAmount: roundMoney(subtotal + taxAmount) };
}

async function createPoFromQuote(orgId: number, userId: number, quoteId: number, awardReason: string) {
  const [quote] = await db.select().from(purchaseQuotes)
    .where(and(eq(purchaseQuotes.id, quoteId), eq(purchaseQuotes.orgId, orgId))).limit(1);
  if (!quote) throw new Error("Quote not found");
  if (!["submitted", "awarded"].includes(quote.status)) throw new Error("Only an active quote can be awarded");
  const poNumber = await nextPoNumber(orgId);
  const [po] = await db.insert(purchaseOrders).values({
    orgId,
    vendorId: quote.vendorId,
    poNumber,
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDelivery: quote.deliveryDays ? new Date(Date.now() + quote.deliveryDays * 86400000).toISOString().slice(0, 10) : null,
    currency: "INR",
    subtotal: String(quote.subtotal),
    taxAmount: String(quote.taxAmount),
    totalAmount: String(quote.totalAmount),
    status: "draft",
    notes: `Awarded from quote ${quote.quoteNumber}. ${awardReason}`,
    createdBy: userId,
  }).returning();
  const lines = await db.select().from(purchaseQuoteLines).where(eq(purchaseQuoteLines.quoteId, quote.id)).orderBy(purchaseQuoteLines.sequence);
  const poLines = await db.insert(purchaseOrderLines).values(lines.map((line) => ({
    poId: po.id,
    itemCode: line.itemCode,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxRate: line.taxRate,
    taxAmount: line.taxAmount,
    amount: roundMoney(Number(line.quantity) * Number(line.unitPrice)).toFixed(2),
    totalAmount: line.totalAmount,
    sequence: line.sequence,
  }))).returning();
  await db.update(purchaseQuotes).set({ status: "awarded", awardReason, updatedAt: new Date() }).where(eq(purchaseQuotes.id, quote.id));
  await db.update(purchaseQuotes).set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(purchaseQuotes.rfqId, quote.rfqId), sql`${purchaseQuotes.id} <> ${quote.id}`, eq(purchaseQuotes.status, "submitted")));
  await db.update(purchaseRFQs).set({ status: "converted", convertedPoId: po.id, updatedAt: new Date() }).where(eq(purchaseRFQs.id, quote.rfqId));
  return { ...po, lines: poLines };
}

// ── Source-to-Pay dashboard ───────────────────────────────────────────────────

router.get("/source-to-pay/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const [requisitions, invoices, payments, quotes, razorpay] = await Promise.all([
      db.select({
        total: sql<number>`count(*)::int`,
        pendingApproval: sql<number>`count(*) filter (where status = 'submitted')::int`,
        approved: sql<number>`count(*) filter (where status = 'approved')::int`,
        committed: sql<string>`coalesce(sum(estimated_amount) filter (where status in ('approved','converted')), 0)::text`,
      }).from(purchaseRequisitions).where(eq(purchaseRequisitions.orgId, orgId)),
      db.select({
        total: sql<number>`count(*)::int`,
        exceptions: sql<number>`count(*) filter (where match_status = 'exception')::int`,
        awaitingApproval: sql<number>`count(*) filter (where status in ('received','matched'))::int`,
        outstanding: sql<string>`coalesce(sum(total_amount) filter (where status not in ('paid','blocked')), 0)::text`,
      }).from(purchaseInvoices).where(eq(purchaseInvoices.orgId, orgId)),
      db.select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where status in ('draft','initiated','processing'))::int`,
        paid: sql<string>`coalesce(sum(amount) filter (where status = 'paid'), 0)::text`,
      }).from(purchasePayments).where(eq(purchasePayments.orgId, orgId)),
      db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'submitted')::int`,
      }).from(purchaseQuotes).where(eq(purchaseQuotes.orgId, orgId)),
      Promise.resolve(Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)),
    ]);
    res.json({ success: true, data: {
      requisitions: requisitions[0] ?? { total: 0, pendingApproval: 0, approved: 0, committed: "0" },
      invoices: invoices[0] ?? { total: 0, exceptions: 0, awaitingApproval: 0, outstanding: "0" },
      payments: payments[0] ?? { total: 0, pending: 0, paid: "0" },
      quotes: quotes[0] ?? { total: 0, active: 0 },
      razorpayConfigured: razorpay,
    }});
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch source-to-pay summary" });
  }
});

// ── Requisitions ──────────────────────────────────────────────────────────────

router.get("/requisitions", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "25"), 10)));
    const filters = [eq(purchaseRequisitions.orgId, orgId)];
    if (search) filters.push(or(ilike(purchaseRequisitions.requisitionNumber, `%${search}%`), ilike(purchaseRequisitions.department, `%${search}%`)) as any);
    if (status) filters.push(eq(purchaseRequisitions.status, status));
    const where = and(...filters);
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(purchaseRequisitions).where(where).orderBy(desc(purchaseRequisitions.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)::int` }).from(purchaseRequisitions).where(where),
    ]);
    res.json({ success: true, data: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch requisitions" });
  }
});

router.get("/requisitions/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid requisition id" }); return; }
  try {
    const [requisition] = await db.select().from(purchaseRequisitions)
      .where(and(eq(purchaseRequisitions.id, id), eq(purchaseRequisitions.orgId, req.user!.orgId!))).limit(1);
    if (!requisition) { res.status(404).json({ success: false, error: "Requisition not found" }); return; }
    const lines = await db.select().from(purchaseRequisitionLines).where(eq(purchaseRequisitionLines.requisitionId, id)).orderBy(purchaseRequisitionLines.sequence);
    res.json({ success: true, data: { ...requisition, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch requisition" });
  }
});

router.post("/requisitions", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertPurchaseRequisitionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const calculated = await calculateLines(d.lines);
    const [requisition] = await db.insert(purchaseRequisitions).values({
      orgId,
      requisitionNumber: d.requisitionNumber || await nextRequisitionNumber(orgId),
      requestedBy: req.user!.userId,
      department: d.department,
      costCenter: d.costCenter ?? null,
      neededBy: d.neededBy,
      justification: d.justification,
      estimatedAmount: calculated.totalAmount.toFixed(2),
      status: d.status === "submitted" ? "submitted" : "draft",
    }).returning();
    const lines = await db.insert(purchaseRequisitionLines).values(calculated.values.map((line) => ({
      requisitionId: requisition.id,
      itemCode: line.itemCode,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      estimatedUnitPrice: line.unitPrice,
      taxRate: line.taxRate,
      totalEstimate: line.totalAmount,
      sequence: line.sequence,
    }))).returning();
    res.status(201).json({ success: true, data: { ...requisition, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create requisition" });
  }
});

router.put("/requisitions/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid requisition id" }); return; }
  const parsed = updatePurchaseRequisitionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(purchaseRequisitions).where(and(eq(purchaseRequisitions.id, id), eq(purchaseRequisitions.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Requisition not found" }); return; }
    if (!["draft", "rejected"].includes(existing.status)) { res.status(409).json({ success: false, error: "Only draft or rejected requisitions can be edited." }); return; }
    const d = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ["department", "costCenter", "neededBy", "justification"] as const) if (d[key] !== undefined) updateData[key === "costCenter" ? "costCenter" : key] = d[key];
    if (d.status) updateData.status = d.status === "submitted" ? "submitted" : "draft";
    if (d.lines) {
      const calculated = await calculateLines(d.lines);
      updateData.estimatedAmount = calculated.totalAmount.toFixed(2);
      await db.delete(purchaseRequisitionLines).where(eq(purchaseRequisitionLines.requisitionId, id));
      await db.insert(purchaseRequisitionLines).values(calculated.values.map((line) => ({
        requisitionId: id, itemCode: line.itemCode, description: line.description, unit: line.unit,
        quantity: line.quantity, estimatedUnitPrice: line.unitPrice, taxRate: line.taxRate, totalEstimate: line.totalAmount, sequence: line.sequence,
      })));
    }
    const [updated] = await db.update(purchaseRequisitions).set(updateData).where(eq(purchaseRequisitions.id, id)).returning();
    const lines = await db.select().from(purchaseRequisitionLines).where(eq(purchaseRequisitionLines.requisitionId, id)).orderBy(purchaseRequisitionLines.sequence);
    res.json({ success: true, data: { ...updated, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update requisition" });
  }
});

router.delete("/requisitions/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid requisition id" }); return; }
  try {
    const [existing] = await db.select({ id: purchaseRequisitions.id, status: purchaseRequisitions.status }).from(purchaseRequisitions)
      .where(and(eq(purchaseRequisitions.id, id), eq(purchaseRequisitions.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Requisition not found" }); return; }
    if (!["draft", "rejected", "cancelled"].includes(existing.status)) { res.status(409).json({ success: false, error: "Submitted or converted requisitions cannot be deleted." }); return; }
    await db.delete(purchaseRequisitions).where(eq(purchaseRequisitions.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete requisition" });
  }
});

router.post("/requisitions/:id/approve", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid requisition id" }); return; }
  try {
    const [existing] = await db.select().from(purchaseRequisitions).where(and(eq(purchaseRequisitions.id, id), eq(purchaseRequisitions.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Requisition not found" }); return; }
    if (existing.status !== "submitted") { res.status(409).json({ success: false, error: "Only submitted requisitions can be approved." }); return; }
    const [updated] = await db.update(purchaseRequisitions).set({ status: "approved", approvedBy: req.user!.userId, approvedAt: new Date(), updatedAt: new Date() }).where(eq(purchaseRequisitions.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to approve requisition" });
  }
});

router.post("/requisitions/:id/reject", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid requisition id" }); return; }
  const parsed = requisitionActionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ status: purchaseRequisitions.status }).from(purchaseRequisitions).where(and(eq(purchaseRequisitions.id, id), eq(purchaseRequisitions.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Requisition not found" }); return; }
    if (existing.status !== "submitted") { res.status(409).json({ success: false, error: "Only submitted requisitions can be rejected." }); return; }
    const [updated] = await db.update(purchaseRequisitions).set({ status: "rejected", rejectionReason: parsed.data.reason ?? "Rejected during approval review", updatedAt: new Date() }).where(eq(purchaseRequisitions.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to reject requisition" });
  }
});

router.post("/requisitions/:id/convert", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  const body = z.object({ vendorId: z.number().int().positive() }).safeParse(req.body);
  if (!id) { res.status(400).json({ success: false, error: "Invalid requisition id" }); return; }
  if (!body.success) { res.status(422).json({ success: false, error: "A vendor is required to convert a requisition." }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [requisition] = await db.select().from(purchaseRequisitions).where(and(eq(purchaseRequisitions.id, id), eq(purchaseRequisitions.orgId, orgId))).limit(1);
    if (!requisition) { res.status(404).json({ success: false, error: "Requisition not found" }); return; }
    if (requisition.status !== "approved") { res.status(409).json({ success: false, error: "Only approved requisitions can be converted." }); return; }
    const vendor = await getOrgVendor(orgId, body.data.vendorId);
    if (!vendor) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const lines = await db.select().from(purchaseRequisitionLines).where(eq(purchaseRequisitionLines.requisitionId, id)).orderBy(purchaseRequisitionLines.sequence);
    const [po] = await db.insert(purchaseOrders).values({
      orgId, vendorId: vendor.id, poNumber: await nextPoNumber(orgId),
      orderDate: new Date().toISOString().slice(0, 10), expectedDelivery: requisition.neededBy,
      currency: "INR", subtotal: String(Number(requisition.estimatedAmount) || 0), taxAmount: "0",
      totalAmount: String(Number(requisition.estimatedAmount) || 0), status: "draft",
      notes: `Converted from ${requisition.requisitionNumber}: ${requisition.justification}`, createdBy: req.user!.userId,
    }).returning();
    const poLines = await db.insert(purchaseOrderLines).values(lines.map((line) => ({
      poId: po.id, itemCode: line.itemCode, description: line.description, unit: line.unit, quantity: line.quantity,
      unitPrice: line.estimatedUnitPrice, taxRate: line.taxRate, taxAmount: "0", amount: line.totalEstimate, totalAmount: line.totalEstimate, sequence: line.sequence,
    }))).returning();
    const [updated] = await db.update(purchaseRequisitions).set({ status: "converted", convertedPoId: po.id, updatedAt: new Date() }).where(eq(purchaseRequisitions.id, id)).returning();
    res.status(201).json({ success: true, data: { requisition: updated, purchaseOrder: { ...po, lines: poLines } } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to convert requisition" });
  }
});

// ── Supplier invitations, quotes, and award ───────────────────────────────────

router.get("/rfqs/:id/invites", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const rfqId = idOf(req.params.id as string);
  if (!rfqId) { res.status(400).json({ success: false, error: "Invalid RFQ id" }); return; }
  try {
    const [rfq] = await db.select({ id: purchaseRFQs.id }).from(purchaseRFQs).where(and(eq(purchaseRFQs.id, rfqId), eq(purchaseRFQs.orgId, req.user!.orgId!))).limit(1);
    if (!rfq) { res.status(404).json({ success: false, error: "RFQ not found" }); return; }
    const rows = await db.select({ id: purchaseRfqInvites.id, rfqId: purchaseRfqInvites.rfqId, vendorId: purchaseRfqInvites.vendorId, vendorName: purchaseVendors.name, status: purchaseRfqInvites.status, invitedAt: purchaseRfqInvites.invitedAt, respondedAt: purchaseRfqInvites.respondedAt, notes: purchaseRfqInvites.notes })
      .from(purchaseRfqInvites).innerJoin(purchaseVendors, eq(purchaseRfqInvites.vendorId, purchaseVendors.id)).where(eq(purchaseRfqInvites.rfqId, rfqId)).orderBy(desc(purchaseRfqInvites.invitedAt));
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch RFQ invitations" });
  }
});

router.post("/rfqs/:id/invites", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const rfqId = idOf(req.params.id as string);
  const parsed = inviteSchema.safeParse(req.body);
  if (!rfqId) { res.status(400).json({ success: false, error: "Invalid RFQ id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "Select at least one supplier.", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [rfq] = await db.select({ id: purchaseRFQs.id }).from(purchaseRFQs).where(and(eq(purchaseRFQs.id, rfqId), eq(purchaseRFQs.orgId, orgId))).limit(1);
    if (!rfq) { res.status(404).json({ success: false, error: "RFQ not found" }); return; }
    const vendors = await db.select({ id: purchaseVendors.id }).from(purchaseVendors).where(and(eq(purchaseVendors.orgId, orgId), inArray(purchaseVendors.id, parsed.data.vendorIds)));
    if (vendors.length !== new Set(parsed.data.vendorIds).size) { res.status(422).json({ success: false, error: "One or more suppliers are outside your organization." }); return; }
    await db.insert(purchaseRfqInvites).values(vendors.map((vendor) => ({ rfqId, vendorId: vendor.id }))).onConflictDoNothing();
    const rows = await db.select().from(purchaseRfqInvites).where(eq(purchaseRfqInvites.rfqId, rfqId));
    res.status(201).json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to invite suppliers" });
  }
});

router.get("/rfqs/:id/quotes", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const rfqId = idOf(req.params.id as string);
  if (!rfqId) { res.status(400).json({ success: false, error: "Invalid RFQ id" }); return; }
  try {
    const [rfq] = await db.select({ id: purchaseRFQs.id }).from(purchaseRFQs).where(and(eq(purchaseRFQs.id, rfqId), eq(purchaseRFQs.orgId, req.user!.orgId!))).limit(1);
    if (!rfq) { res.status(404).json({ success: false, error: "RFQ not found" }); return; }
    const quotes = await db.select({ id: purchaseQuotes.id, rfqId: purchaseQuotes.rfqId, vendorId: purchaseQuotes.vendorId, vendorName: purchaseVendors.name, quoteNumber: purchaseQuotes.quoteNumber, quoteDate: purchaseQuotes.quoteDate, validUntil: purchaseQuotes.validUntil, subtotal: purchaseQuotes.subtotal, taxAmount: purchaseQuotes.taxAmount, totalAmount: purchaseQuotes.totalAmount, deliveryDays: purchaseQuotes.deliveryDays, paymentTerms: purchaseQuotes.paymentTerms, status: purchaseQuotes.status, awardReason: purchaseQuotes.awardReason, createdAt: purchaseQuotes.createdAt })
      .from(purchaseQuotes).innerJoin(purchaseVendors, eq(purchaseQuotes.vendorId, purchaseVendors.id)).where(eq(purchaseQuotes.rfqId, rfqId)).orderBy(purchaseQuotes.totalAmount);
    const quoteIds = quotes.map((quote) => quote.id);
    const lines = quoteIds.length ? await db.select().from(purchaseQuoteLines).where(inArray(purchaseQuoteLines.quoteId, quoteIds)).orderBy(purchaseQuoteLines.sequence) : [];
    res.json({ success: true, data: quotes.map((quote) => ({ ...quote, lines: lines.filter((line) => line.quoteId === quote.id) })) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch supplier quotes" });
  }
});

router.post("/rfqs/:id/quotes", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const rfqId = idOf(req.params.id as string);
  const parsed = insertPurchaseQuoteSchema.safeParse({ ...req.body, rfqId });
  if (!rfqId) { res.status(400).json({ success: false, error: "Invalid RFQ id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [rfq] = await db.select().from(purchaseRFQs).where(and(eq(purchaseRFQs.id, rfqId), eq(purchaseRFQs.orgId, orgId))).limit(1);
    const vendor = await getOrgVendor(orgId, parsed.data.vendorId);
    if (!rfq || !vendor) { res.status(404).json({ success: false, error: "RFQ or supplier not found" }); return; }
    if (rfq.status === "converted" || rfq.status === "cancelled") { res.status(409).json({ success: false, error: "This RFQ is no longer accepting quotes." }); return; }
    const calculated = await calculateLines(parsed.data.lines);
    const [quote] = await db.insert(purchaseQuotes).values({
      orgId, rfqId, vendorId: vendor.id, quoteNumber: parsed.data.quoteNumber || await nextQuoteNumber(orgId),
      quoteDate: parsed.data.quoteDate, validUntil: parsed.data.validUntil ?? null, subtotal: calculated.subtotal.toFixed(2),
      taxAmount: calculated.taxAmount.toFixed(2), totalAmount: calculated.totalAmount.toFixed(2), deliveryDays: parsed.data.deliveryDays ?? null,
      paymentTerms: parsed.data.paymentTerms ?? null, status: parsed.data.status ?? "submitted", createdBy: req.user!.userId,
    }).returning();
    const lines = await db.insert(purchaseQuoteLines).values(calculated.values.map((line) => ({
      quoteId: quote.id,
      itemCode: line.itemCode,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
      totalAmount: line.totalAmount,
      sequence: line.sequence,
    }))).returning();
    await db.insert(purchaseRfqInvites).values({ rfqId, vendorId: vendor.id, status: "responded", respondedAt: new Date() }).onConflictDoNothing();
    if (rfq.status === "draft") await db.update(purchaseRFQs).set({ status: "responded", updatedAt: new Date() }).where(eq(purchaseRFQs.id, rfqId));
    res.status(201).json({ success: true, data: { ...quote, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to record supplier quote" });
  }
});

router.put("/quotes/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid quote id" }); return; }
  const parsed = updatePurchaseQuoteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select().from(purchaseQuotes).where(and(eq(purchaseQuotes.id, id), eq(purchaseQuotes.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Quote not found" }); return; }
    if (!["draft", "submitted"].includes(existing.status)) { res.status(409).json({ success: false, error: "Awarded, rejected, or expired quotes are immutable." }); return; }
    const [updated] = await db.update(purchaseQuotes).set({ ...parsed.data, updatedAt: new Date() }).where(eq(purchaseQuotes.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update supplier quote" });
  }
});

router.post("/rfqs/:id/award", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const rfqId = idOf(req.params.id as string);
  const parsed = awardSchema.safeParse(req.body);
  if (!rfqId) { res.status(400).json({ success: false, error: "Invalid RFQ id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "A quote and award rationale are required.", details: parsed.error.issues }); return; }
  try {
    const [rfq] = await db.select({ id: purchaseRFQs.id, status: purchaseRFQs.status }).from(purchaseRFQs).where(and(eq(purchaseRFQs.id, rfqId), eq(purchaseRFQs.orgId, req.user!.orgId!))).limit(1);
    if (!rfq) { res.status(404).json({ success: false, error: "RFQ not found" }); return; }
    if (rfq.status === "converted" || rfq.status === "cancelled") { res.status(409).json({ success: false, error: "This RFQ is already closed." }); return; }
    const [quote] = await db.select({ id: purchaseQuotes.id }).from(purchaseQuotes).where(and(eq(purchaseQuotes.id, parsed.data.quoteId), eq(purchaseQuotes.rfqId, rfqId), eq(purchaseQuotes.orgId, req.user!.orgId!))).limit(1);
    if (!quote) { res.status(404).json({ success: false, error: "Quote not found for this RFQ" }); return; }
    const purchaseOrder = await createPoFromQuote(req.user!.orgId!, req.user!.userId, quote.id, parsed.data.awardReason);
    res.status(201).json({ success: true, data: purchaseOrder });
  } catch (error) {
    res.status(409).json({ success: false, error: error instanceof Error ? error.message : "Failed to award quote" });
  }
});

// ── Invoices and three-way matching ───────────────────────────────────────────

router.get("/invoices", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filters = [eq(purchaseInvoices.orgId, orgId)];
    if (search) filters.push(or(ilike(purchaseInvoices.invoiceNumber, `%${search}%`), ilike(purchaseVendors.name, `%${search}%`)) as any);
    if (status) filters.push(eq(purchaseInvoices.status, status));
    const where = and(...filters);
    const rows = await db.select({ id: purchaseInvoices.id, invoiceNumber: purchaseInvoices.invoiceNumber, vendorId: purchaseInvoices.vendorId, vendorName: purchaseVendors.name, poId: purchaseInvoices.poId, grnId: purchaseInvoices.grnId, invoiceDate: purchaseInvoices.invoiceDate, dueDate: purchaseInvoices.dueDate, currency: purchaseInvoices.currency, subtotal: purchaseInvoices.subtotal, taxAmount: purchaseInvoices.taxAmount, totalAmount: purchaseInvoices.totalAmount, status: purchaseInvoices.status, matchStatus: purchaseInvoices.matchStatus, matchVariance: purchaseInvoices.matchVariance, notes: purchaseInvoices.notes, createdAt: purchaseInvoices.createdAt, updatedAt: purchaseInvoices.updatedAt })
      .from(purchaseInvoices).innerJoin(purchaseVendors, eq(purchaseInvoices.vendorId, purchaseVendors.id)).where(where).orderBy(desc(purchaseInvoices.createdAt));
    res.json({ success: true, data: rows, total: rows.length, page: 1, totalPages: 1 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase invoices" });
  }
});

router.get("/invoices/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid invoice id" }); return; }
  try {
    const [invoice] = await db.select().from(purchaseInvoices).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.orgId, req.user!.orgId!))).limit(1);
    if (!invoice) { res.status(404).json({ success: false, error: "Purchase invoice not found" }); return; }
    const lines = await db.select().from(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.invoiceId, id)).orderBy(purchaseInvoiceLines.sequence);
    res.json({ success: true, data: { ...invoice, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase invoice" });
  }
});

router.post("/invoices", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertPurchaseInvoiceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const vendor = await getOrgVendor(orgId, d.vendorId);
    if (!vendor) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const po = d.poId ? await getOrgPo(orgId, d.poId) : null;
    if (d.poId && !po) { res.status(404).json({ success: false, error: "Purchase order not found" }); return; }
    if (po && po.vendorId !== vendor.id) { res.status(422).json({ success: false, error: "Invoice supplier must match the purchase order supplier." }); return; }
    if (d.grnId) {
      const [grn] = await db.select({ id: goodsReceiptNotes.id, poId: goodsReceiptNotes.poId, orgId: goodsReceiptNotes.orgId }).from(goodsReceiptNotes)
        .where(and(eq(goodsReceiptNotes.id, d.grnId), eq(goodsReceiptNotes.orgId, orgId))).limit(1);
      if (!grn || (po && grn.poId !== po.id)) { res.status(422).json({ success: false, error: "Receipt note must belong to the selected purchase order." }); return; }
    }
    const duplicate = await db.select({ id: purchaseInvoices.id }).from(purchaseInvoices).where(and(eq(purchaseInvoices.orgId, orgId), eq(purchaseInvoices.vendorId, vendor.id), eq(purchaseInvoices.invoiceNumber, d.invoiceNumber))).limit(1);
    if (duplicate.length) { res.status(409).json({ success: false, error: "This supplier invoice number already exists." }); return; }
    if (po) {
      const poLineIds = d.lines.flatMap((line) => line.poLineId ? [line.poLineId] : []);
      if (poLineIds.length) {
        const validLines = await db.select({ id: purchaseOrderLines.id }).from(purchaseOrderLines).where(and(eq(purchaseOrderLines.poId, po.id), inArray(purchaseOrderLines.id, poLineIds)));
        if (validLines.length !== new Set(poLineIds).size) { res.status(422).json({ success: false, error: "One or more invoice lines do not belong to the purchase order." }); return; }
      }
    }
    const calculated = await calculateLines(d.lines);
    const [invoice] = await db.insert(purchaseInvoices).values({
      orgId, invoiceNumber: d.invoiceNumber, vendorId: vendor.id, poId: d.poId ?? null, grnId: d.grnId ?? null,
      invoiceDate: d.invoiceDate, dueDate: d.dueDate ?? null, currency: d.currency ?? "INR",
      subtotal: calculated.subtotal.toFixed(2), taxAmount: calculated.taxAmount.toFixed(2), totalAmount: calculated.totalAmount.toFixed(2),
      status: d.status ?? "received", matchStatus: "pending", matchVariance: "0", notes: d.notes ?? null, createdBy: req.user!.userId,
    }).returning();
    const lines = await db.insert(purchaseInvoiceLines).values(calculated.values.map((line, index) => ({
      invoiceId: invoice.id, poLineId: d.lines[index].poLineId ?? null, description: line.description, quantity: line.quantity,
      unitPrice: line.unitPrice, taxRate: line.taxRate, taxAmount: line.taxAmount, amount: line.amount, sequence: line.sequence,
    }))).returning();
    res.status(201).json({ success: true, data: { ...invoice, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create purchase invoice" });
  }
});

router.put("/invoices/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid invoice id" }); return; }
  const parsed = updatePurchaseInvoiceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select().from(purchaseInvoices).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Purchase invoice not found" }); return; }
    if (["approved", "partially_paid", "paid"].includes(existing.status)) { res.status(409).json({ success: false, error: "Approved or paid invoices cannot be edited." }); return; }
    const [updated] = await db.update(purchaseInvoices).set({ ...parsed.data, updatedAt: new Date() }).where(eq(purchaseInvoices.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update purchase invoice" });
  }
});

router.delete("/invoices/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid invoice id" }); return; }
  try {
    const [existing] = await db.select({ id: purchaseInvoices.id, status: purchaseInvoices.status }).from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Purchase invoice not found" }); return; }
    if (!["draft", "received", "exception"].includes(existing.status)) { res.status(409).json({ success: false, error: "Matched or paid invoices cannot be deleted." }); return; }
    await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete purchase invoice" });
  }
});

router.post("/invoices/:id/match", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid invoice id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [invoice] = await db.select().from(purchaseInvoices).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.orgId, orgId))).limit(1);
    if (!invoice) { res.status(404).json({ success: false, error: "Purchase invoice not found" }); return; }
    if (!invoice.poId) {
      const [updated] = await db.update(purchaseInvoices).set({ status: "exception", matchStatus: "exception", matchVariance: invoice.totalAmount, updatedAt: new Date() }).where(eq(purchaseInvoices.id, id)).returning();
      res.json({ success: true, data: { invoice: updated, match: { matched: false, reason: "A purchase order is required for three-way matching." } } });
      return;
    }
    const lines = await db.select().from(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.invoiceId, id)).orderBy(purchaseInvoiceLines.sequence);
    const poLines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, invoice.poId)).orderBy(purchaseOrderLines.sequence);
    const checks = lines.map((line) => {
      const poLine = line.poLineId ? poLines.find((candidate) => candidate.id === line.poLineId) : null;
      if (!poLine) return { lineId: line.id, matched: false, reason: "Invoice line is not linked to a PO line." };
      const invoiceQty = Number(line.quantity);
      const receivedQty = Number(poLine.receivedQty);
      const unitVariance = Math.abs(Number(line.unitPrice) - Number(poLine.unitPrice));
      const allowedVariance = Math.max(Number(poLine.unitPrice) * matchTolerance, 0.01);
      return { lineId: line.id, poLineId: poLine.id, matched: invoiceQty <= receivedQty && unitVariance <= allowedVariance, invoiceQty, receivedQty, unitVariance };
    });
    const poTotal = poLines.reduce((total, line) => total + Number(line.totalAmount), 0);
    const matched = checks.length > 0 && checks.every((check) => check.matched);
    const variance = roundMoney(Math.abs(poTotal - Number(invoice.totalAmount)));
    const [updated] = await db.update(purchaseInvoices).set({ status: matched ? "matched" : "exception", matchStatus: matched ? "matched" : "exception", matchVariance: variance.toFixed(2), updatedAt: new Date() }).where(eq(purchaseInvoices.id, id)).returning();
    res.json({ success: true, data: { invoice: updated, match: { matched, checks, variance } } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to run three-way match" });
  }
});

router.post("/invoices/:id/approve", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid invoice id" }); return; }
  try {
    const [invoice] = await db.select().from(purchaseInvoices).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.orgId, req.user!.orgId!))).limit(1);
    if (!invoice) { res.status(404).json({ success: false, error: "Purchase invoice not found" }); return; }
    if (invoice.matchStatus !== "matched") { res.status(409).json({ success: false, error: "Invoice must pass three-way matching before approval." }); return; }
    const [updated] = await db.update(purchaseInvoices).set({ status: "approved", updatedAt: new Date() }).where(eq(purchaseInvoices.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to approve purchase invoice" });
  }
});

// ── Payments / Razorpay handoff ────────────────────────────────────────────────

router.get("/payments", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const status = String(req.query.status ?? "").trim();
    const filters = [eq(purchasePayments.orgId, orgId)];
    if (status) filters.push(eq(purchasePayments.status, status));
    const rows = await db.select({ id: purchasePayments.id, paymentNumber: purchasePayments.paymentNumber, invoiceId: purchasePayments.invoiceId, invoiceNumber: purchaseInvoices.invoiceNumber, vendorId: purchasePayments.vendorId, vendorName: purchaseVendors.name, amount: purchasePayments.amount, paymentDate: purchasePayments.paymentDate, method: purchasePayments.method, status: purchasePayments.status, providerOrderId: purchasePayments.providerOrderId, providerPaymentId: purchasePayments.providerPaymentId, failureReason: purchasePayments.failureReason, notes: purchasePayments.notes, paidAt: purchasePayments.paidAt, createdAt: purchasePayments.createdAt })
      .from(purchasePayments).innerJoin(purchaseInvoices, eq(purchasePayments.invoiceId, purchaseInvoices.id)).innerJoin(purchaseVendors, eq(purchasePayments.vendorId, purchaseVendors.id)).where(and(...filters)).orderBy(desc(purchasePayments.createdAt));
    res.json({ success: true, data: rows, total: rows.length, page: 1, totalPages: 1 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase payments" });
  }
});

router.post("/payments", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertPurchasePaymentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const [invoice] = await db.select().from(purchaseInvoices).where(and(eq(purchaseInvoices.id, d.invoiceId), eq(purchaseInvoices.orgId, orgId))).limit(1);
    if (!invoice) { res.status(404).json({ success: false, error: "Purchase invoice not found" }); return; }
    if (!["approved", "partially_paid"].includes(invoice.status)) { res.status(409).json({ success: false, error: "Only approved invoices can be paid." }); return; }
    const [{ paid }] = await db.select({ paid: sql<string>`coalesce(sum(amount) filter (where status in ('paid','initiated','processing')), 0)::text` }).from(purchasePayments).where(and(eq(purchasePayments.invoiceId, invoice.id), eq(purchasePayments.orgId, orgId)));
    const outstanding = roundMoney(Number(invoice.totalAmount) - Number(paid ?? 0));
    if (Number(d.amount) <= 0 || Number(d.amount) > outstanding) { res.status(422).json({ success: false, error: `Payment must be greater than zero and no more than the outstanding ₹${outstanding.toFixed(2)}.` }); return; }
    const [payment] = await db.insert(purchasePayments).values({
      orgId, paymentNumber: await nextPaymentNumber(orgId), invoiceId: invoice.id, vendorId: invoice.vendorId, amount: Number(d.amount).toFixed(2),
      paymentDate: d.paymentDate, method: d.method, status: d.method === "razorpay" ? "initiated" : "draft", notes: d.notes ?? null, createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: payment });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create vendor payment" });
  }
});

router.post("/payments/:id/razorpay-order", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid payment id" }); return; }
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) { res.status(503).json({ success: false, error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the workspace secrets." }); return; }
  try {
    const [payment] = await db.select().from(purchasePayments).where(and(eq(purchasePayments.id, id), eq(purchasePayments.orgId, req.user!.orgId!))).limit(1);
    if (!payment) { res.status(404).json({ success: false, error: "Vendor payment not found" }); return; }
    if (payment.method !== "razorpay") { res.status(409).json({ success: false, error: "This payment is not configured for Razorpay." }); return; }
    if (payment.status !== "initiated" && payment.status !== "processing") { res.status(409).json({ success: false, error: "Only initiated Razorpay payments can create an order." }); return; }
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      body: JSON.stringify({ amount: Math.round(Number(payment.amount) * 100), currency: "INR", receipt: payment.paymentNumber, notes: { invoiceId: String(payment.invoiceId), vendorId: String(payment.vendorId) } }),
    });
    const payload = await response.json() as { id?: string; error?: { description?: string } };
    if (!response.ok || !payload.id) {
      await db.update(purchasePayments).set({ status: "failed", failureReason: payload.error?.description ?? "Razorpay order creation failed", updatedAt: new Date() }).where(eq(purchasePayments.id, id));
      res.status(502).json({ success: false, error: payload.error?.description ?? "Razorpay order creation failed" });
      return;
    }
    const [updated] = await db.update(purchasePayments).set({ status: "processing", providerOrderId: payload.id, updatedAt: new Date() }).where(eq(purchasePayments.id, id)).returning();
    res.json({ success: true, data: { payment: updated, razorpayOrderId: payload.id, keyId } });
  } catch {
    res.status(502).json({ success: false, error: "Unable to reach Razorpay" });
  }
});

router.post("/payments/:id/mark-paid", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  const parsed = z.object({ providerPaymentId: z.string().max(200).nullable().optional() }).safeParse(req.body);
  if (!id) { res.status(400).json({ success: false, error: "Invalid payment id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "Invalid payment reference" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [payment] = await db.select().from(purchasePayments).where(and(eq(purchasePayments.id, id), eq(purchasePayments.orgId, orgId))).limit(1);
    if (!payment) { res.status(404).json({ success: false, error: "Vendor payment not found" }); return; }
    if (["paid", "cancelled"].includes(payment.status)) { res.status(409).json({ success: false, error: "This payment cannot be marked paid." }); return; }
    const [updated] = await db.update(purchasePayments).set({ status: "paid", providerPaymentId: parsed.data.providerPaymentId ?? payment.providerPaymentId, paidAt: new Date(), updatedAt: new Date() }).where(eq(purchasePayments.id, id)).returning();
    const [{ paid }] = await db.select({ paid: sql<string>`coalesce(sum(amount) filter (where status = 'paid'), 0)::text` }).from(purchasePayments).where(eq(purchasePayments.invoiceId, payment.invoiceId));
    const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, payment.invoiceId)).limit(1);
    if (invoice) await db.update(purchaseInvoices).set({ status: Number(paid ?? 0) >= Number(invoice.totalAmount) ? "paid" : "partially_paid", updatedAt: new Date() }).where(eq(purchaseInvoices.id, invoice.id));
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark payment paid" });
  }
});

router.post("/payments/:id/fail", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = idOf(req.params.id as string);
  const parsed = z.object({ reason: z.string().min(1).max(1000) }).safeParse(req.body);
  if (!id) { res.status(400).json({ success: false, error: "Invalid payment id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "A failure reason is required." }); return; }
  try {
    const [updated] = await db.update(purchasePayments).set({ status: "failed", failureReason: parsed.data.reason, updatedAt: new Date() })
      .where(and(eq(purchasePayments.id, id), eq(purchasePayments.orgId, req.user!.orgId!))).returning();
    if (!updated) { res.status(404).json({ success: false, error: "Vendor payment not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to record payment failure" });
  }
});

export default router;