/**
 * /api/ar — Accounts Receivable: customers, invoices, payments
 *
 * All routes require authentication + "Accounts Receivable" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  arCustomers, arInvoices, arInvoiceLines, arPayments,
  organizations,
} from "@workspace/db";
import {
  insertARCustomerSchema, updateARCustomerSchema,
  insertARInvoiceSchema, updateARInvoiceSchema,
  insertARPaymentSchema, updateARPaymentSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Accounts Receivable";

// ── Helpers ───────────────────────────────────────────────────────────────────

function orgScope(req: AuthRequest) {
  return eq(arCustomers.orgId, req.user!.orgId!);
}

function invoiceOrgScope(req: AuthRequest) {
  return eq(arInvoices.orgId, req.user!.orgId!);
}

function paymentOrgScope(req: AuthRequest) {
  return eq(arPayments.orgId, req.user!.orgId!);
}

/** Derive invoice status from amounts */
function deriveInvoiceStatus(totalAmount: string, amountPaid: string, currentStatus: string): string {
  if (currentStatus === "void" || currentStatus === "draft") return currentStatus;
  const total = parseFloat(totalAmount);
  const paid  = parseFloat(amountPaid);
  if (paid <= 0) return currentStatus === "sent" ? "sent" : "sent";
  if (paid >= total) return "paid";
  return "partial";
}

async function nextInvoiceNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(arInvoices)
    .where(eq(arInvoices.orgId, orgId));
  return `INV-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
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

    const [{ totalReceivable }] = await db
      .select({ totalReceivable: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text` })
      .from(arInvoices)
      .where(and(eq(arInvoices.orgId, orgId), sql`status not in ('paid', 'void', 'draft')`));

    const [{ totalOverdue }] = await db
      .select({ totalOverdue: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text` })
      .from(arInvoices)
      .where(and(eq(arInvoices.orgId, orgId), sql`status = 'overdue'`));

    const [{ paidThisMonth }] = await db
      .select({ paidThisMonth: sql<string>`coalesce(sum(amount), 0)::text` })
      .from(arPayments)
      .where(and(eq(arPayments.orgId, orgId), sql`payment_date >= ${monthStart}`));

    const [{ draftCount }] = await db
      .select({ draftCount: sql<number>`count(*)::int` })
      .from(arInvoices)
      .where(and(eq(arInvoices.orgId, orgId), sql`status = 'draft'`));

    const [{ overdueCount }] = await db
      .select({ overdueCount: sql<number>`count(*)::int` })
      .from(arInvoices)
      .where(and(eq(arInvoices.orgId, orgId), sql`status = 'overdue'`));

    const [{ customerCount }] = await db
      .select({ customerCount: sql<number>`count(*)::int` })
      .from(arCustomers)
      .where(and(eq(arCustomers.orgId, orgId), sql`status = 'active'`));

    res.json({
      success: true,
      data: { totalReceivable, totalOverdue, paidThisMonth, draftCount, overdueCount, customerCount },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /ar/customers
router.get("/customers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status } = req.query as Record<string, string>;

    const filters: any[] = [eq(arCustomers.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(arCustomers.name,  `%${search.trim()}%`),
        ilike(arCustomers.email, `%${search.trim()}%`),
      ));
    }
    if (status) filters.push(eq(arCustomers.status, status));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(arCustomers).where(where).orderBy(arCustomers.name).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(arCustomers).where(where),
    ]);

    // Invoice counts + outstanding per customer
    const ids = rows.map((r) => r.id);
    let invoiceMeta: Record<number, { invoiceCount: number; totalOutstanding: string }> = {};
    if (ids.length > 0) {
      const meta = await db
        .select({
          customerId:       arInvoices.customerId,
          invoiceCount:     sql<number>`count(*)::int`,
          totalOutstanding: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text`,
        })
        .from(arInvoices)
        .where(sql`customer_id = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(arInvoices.customerId);
      meta.forEach((m) => { invoiceMeta[m.customerId] = { invoiceCount: m.invoiceCount, totalOutstanding: m.totalOutstanding }; });
    }

    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, ...(invoiceMeta[r.id] ?? { invoiceCount: 0, totalOutstanding: "0" }) })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
  }
});

// GET /ar/customers/:id
router.get("/customers/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(arCustomers)
      .where(and(eq(arCustomers.id, id), eq(arCustomers.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch customer" });
  }
});

// POST /ar/customers
router.post("/customers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertARCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [created] = await db.insert(arCustomers).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create customer" });
  }
});

// PUT /ar/customers/:id
router.put("/customers/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateARCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [existing] = await db.select({ id: arCustomers.id }).from(arCustomers)
      .where(and(eq(arCustomers.id, id), eq(arCustomers.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    const [updated] = await db.update(arCustomers).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(arCustomers.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update customer" });
  }
});

// DELETE /ar/customers/:id
router.delete("/customers/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: arCustomers.id, name: arCustomers.name }).from(arCustomers)
      .where(and(eq(arCustomers.id, id), eq(arCustomers.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` }).from(arInvoices).where(eq(arInvoices.customerId, id));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — ${cnt} invoice(s) exist. Remove invoices first.` });
      return;
    }
    await db.delete(arCustomers).where(eq(arCustomers.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete customer" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════════════════════

// GET /ar/invoices
router.get("/invoices", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, customerId } = req.query as Record<string, string>;

    const filters: any[] = [eq(arInvoices.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(arInvoices.invoiceNumber, `%${search.trim()}%`),
        ilike(arCustomers.name,         `%${search.trim()}%`),
      ));
    }
    if (status)     filters.push(eq(arInvoices.status, status));
    if (customerId) filters.push(eq(arInvoices.customerId, parseInt(customerId)));

    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: arInvoices.id, orgId: arInvoices.orgId, customerId: arInvoices.customerId,
        invoiceNumber: arInvoices.invoiceNumber, issueDate: arInvoices.issueDate, dueDate: arInvoices.dueDate,
        status: arInvoices.status, subtotal: arInvoices.subtotal, taxAmount: arInvoices.taxAmount,
        totalAmount: arInvoices.totalAmount, amountPaid: arInvoices.amountPaid, notes: arInvoices.notes,
        createdBy: arInvoices.createdBy, createdAt: arInvoices.createdAt, updatedAt: arInvoices.updatedAt,
        customerName: arCustomers.name,
      })
        .from(arInvoices)
        .leftJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
        .where(where)
        .orderBy(desc(arInvoices.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(arInvoices)
        .leftJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
        .where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
});

// GET /ar/invoices/:id  (includes lines)
router.get("/invoices/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select({
      id: arInvoices.id, orgId: arInvoices.orgId, customerId: arInvoices.customerId,
      invoiceNumber: arInvoices.invoiceNumber, issueDate: arInvoices.issueDate, dueDate: arInvoices.dueDate,
      status: arInvoices.status, subtotal: arInvoices.subtotal, taxAmount: arInvoices.taxAmount,
      totalAmount: arInvoices.totalAmount, amountPaid: arInvoices.amountPaid, notes: arInvoices.notes,
      createdBy: arInvoices.createdBy, createdAt: arInvoices.createdAt, updatedAt: arInvoices.updatedAt,
      customerName: arCustomers.name,
    })
      .from(arInvoices)
      .leftJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
      .where(and(eq(arInvoices.id, id), eq(arInvoices.orgId, req.user!.orgId!)))
      .limit(1);

    if (!row) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }

    const lines = await db.select().from(arInvoiceLines)
      .where(eq(arInvoiceLines.invoiceId, id)).orderBy(arInvoiceLines.sequence);

    res.json({ success: true, data: { ...row, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoice" });
  }
});

// POST /ar/invoices
router.post("/invoices", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertARInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    // Verify customer belongs to this org
    const [cust] = await db.select({ id: arCustomers.id }).from(arCustomers)
      .where(and(eq(arCustomers.id, data.customerId), eq(arCustomers.orgId, orgId))).limit(1);
    if (!cust) { res.status(422).json({ success: false, error: "Customer not found" }); return; }

    const invoiceNumber = data.invoiceNumber ?? (await nextInvoiceNumber(orgId));

    // Duplicate invoice number check
    const [dup] = await db.select({ id: arInvoices.id }).from(arInvoices)
      .where(and(eq(arInvoices.orgId, orgId), eq(arInvoices.invoiceNumber, invoiceNumber))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `Invoice number "${invoiceNumber}" already exists` }); return; }

    // Calculate totals
    const subtotal = data.lines.reduce((sum, l) => {
      const qty   = parseFloat(l.quantity ?? "1");
      const price = parseFloat(l.unitPrice ?? "0");
      return sum + qty * price;
    }, 0);
    const taxAmount   = parseFloat(data.taxAmount ?? "0");
    const totalAmount = subtotal + taxAmount;

    const [invoice] = await db.insert(arInvoices).values({
      orgId, customerId: data.customerId, invoiceNumber, issueDate: data.issueDate, dueDate: data.dueDate,
      status: data.status ?? "draft",
      subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), totalAmount: totalAmount.toFixed(2),
      amountPaid: "0.00", notes: data.notes ?? null, createdBy: req.user!.id,
    }).returning();

    // Insert lines
    const linesData = data.lines.map((l, i) => {
      const qty   = parseFloat(l.quantity ?? "1");
      const price = parseFloat(l.unitPrice ?? "0");
      return {
        invoiceId: invoice.id, description: l.description,
        quantity: qty.toString(), unitPrice: price.toFixed(2), amount: (qty * price).toFixed(2),
        sequence: l.sequence ?? i,
      };
    });
    const lines = await db.insert(arInvoiceLines).values(linesData).returning();

    res.status(201).json({ success: true, data: { ...invoice, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create invoice" });
  }
});

// PUT /ar/invoices/:id
router.put("/invoices/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }

  const parsed = updateARInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(arInvoices)
      .where(and(eq(arInvoices.id, id), eq(arInvoices.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }

    const data = parsed.data;
    const updatePayload: Record<string, any> = { updatedAt: new Date() };

    if (data.customerId) updatePayload.customerId = data.customerId;
    if (data.issueDate)  updatePayload.issueDate  = data.issueDate;
    if (data.dueDate)    updatePayload.dueDate     = data.dueDate;
    if (data.status)     updatePayload.status      = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    // Recalculate totals if lines provided (only for draft/sent)
    if (data.lines && (existing.status === "draft" || existing.status === "sent")) {
      const subtotal = data.lines.reduce((sum, l) => {
        return sum + parseFloat(l.quantity ?? "1") * parseFloat(l.unitPrice ?? "0");
      }, 0);
      const taxAmount   = parseFloat(data.taxAmount ?? existing.taxAmount);
      const totalAmount = subtotal + taxAmount;
      updatePayload.subtotal    = subtotal.toFixed(2);
      updatePayload.taxAmount   = taxAmount.toFixed(2);
      updatePayload.totalAmount = totalAmount.toFixed(2);

      // Replace lines
      await db.delete(arInvoiceLines).where(eq(arInvoiceLines.invoiceId, id));
      const linesData = data.lines.map((l, i) => {
        const qty   = parseFloat(l.quantity ?? "1");
        const price = parseFloat(l.unitPrice ?? "0");
        return { invoiceId: id, description: l.description, quantity: qty.toString(), unitPrice: price.toFixed(2), amount: (qty * price).toFixed(2), sequence: l.sequence ?? i };
      });
      await db.insert(arInvoiceLines).values(linesData);
    }

    const [updated] = await db.update(arInvoices).set(updatePayload).where(eq(arInvoices.id, id)).returning();
    const lines = await db.select().from(arInvoiceLines).where(eq(arInvoiceLines.invoiceId, id)).orderBy(arInvoiceLines.sequence);

    res.json({ success: true, data: { ...updated, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update invoice" });
  }
});

// DELETE /ar/invoices/:id  (draft only)
router.delete("/invoices/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select().from(arInvoices)
      .where(and(eq(arInvoices.id, id), eq(arInvoices.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (existing.status !== "draft") {
      res.status(409).json({ success: false, error: "Only draft invoices can be deleted. Void it first." });
      return;
    }
    await db.delete(arInvoices).where(eq(arInvoices.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete invoice" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /ar/payments
router.get("/payments", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { invoiceId, customerId } = req.query as Record<string, string>;

    const filters: any[] = [eq(arPayments.orgId, orgId)];
    if (invoiceId)  filters.push(eq(arPayments.invoiceId,  parseInt(invoiceId)));
    if (customerId) filters.push(eq(arPayments.customerId, parseInt(customerId)));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: arPayments.id, orgId: arPayments.orgId, invoiceId: arPayments.invoiceId,
        customerId: arPayments.customerId, paymentDate: arPayments.paymentDate,
        amount: arPayments.amount, method: arPayments.method, reference: arPayments.reference,
        notes: arPayments.notes, createdBy: arPayments.createdBy, createdAt: arPayments.createdAt,
        invoiceNumber: arInvoices.invoiceNumber, customerName: arCustomers.name,
      })
        .from(arPayments)
        .leftJoin(arInvoices,  eq(arPayments.invoiceId,  arInvoices.id))
        .leftJoin(arCustomers, eq(arPayments.customerId, arCustomers.id))
        .where(where)
        .orderBy(desc(arPayments.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(arPayments).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
});

// POST /ar/payments
router.post("/payments", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertARPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    const [invoice] = await db.select().from(arInvoices)
      .where(and(eq(arInvoices.id, data.invoiceId), eq(arInvoices.orgId, orgId))).limit(1);
    if (!invoice) { res.status(422).json({ success: false, error: "Invoice not found" }); return; }
    if (invoice.status === "void") { res.status(409).json({ success: false, error: "Cannot apply payment to a voided invoice" }); return; }

    const paymentAmt = parseFloat(data.amount);
    const newPaid    = parseFloat(invoice.amountPaid) + paymentAmt;
    const total      = parseFloat(invoice.totalAmount);

    if (newPaid > total + 0.001) {
      res.status(409).json({ success: false, error: `Payment of ${data.amount} exceeds remaining balance of ${(total - parseFloat(invoice.amountPaid)).toFixed(2)}` });
      return;
    }

    const newStatus = newPaid >= total - 0.001 ? "paid" : "partial";

    const payment = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(arPayments).values({
        orgId, invoiceId: data.invoiceId, customerId: invoice.customerId,
        paymentDate: data.paymentDate, amount: paymentAmt.toFixed(2),
        method: data.method ?? "bank_transfer", reference: data.reference ?? null,
        notes: data.notes ?? null, createdBy: req.user!.id,
      }).returning();
      await tx.update(arInvoices)
        .set({ amountPaid: newPaid.toFixed(2), status: newStatus, updatedAt: new Date() })
        .where(eq(arInvoices.id, data.invoiceId));
      return inserted;
    });

    res.status(201).json({ success: true, data: payment });
  } catch {
    res.status(500).json({ success: false, error: "Failed to record payment" });
  }
});

// PUT /ar/payments/:id
router.put("/payments/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateARPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(arPayments)
      .where(and(eq(arPayments.id, id), eq(arPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }

    const data = parsed.data;
    const updatePayload: Record<string, any> = {};
    if (data.paymentDate) updatePayload.paymentDate = data.paymentDate;
    if (data.method)      updatePayload.method      = data.method;
    if (data.reference !== undefined) updatePayload.reference = data.reference;
    if (data.notes !== undefined)     updatePayload.notes     = data.notes;

    // If amount changed, reconcile the invoice
    if (data.amount && data.amount !== existing.amount) {
      const [invoice] = await db.select().from(arInvoices).where(eq(arInvoices.id, existing.invoiceId)).limit(1);
      if (invoice) {
        const delta    = parseFloat(data.amount) - parseFloat(existing.amount);
        const newPaid  = parseFloat(invoice.amountPaid) + delta;
        const total    = parseFloat(invoice.totalAmount);
        if (newPaid > total + 0.001) {
          res.status(409).json({ success: false, error: "Adjusted amount exceeds invoice total" });
          return;
        }
        const newStatus = newPaid >= total - 0.001 ? "paid" : newPaid > 0 ? "partial" : "sent";
        await db.update(arInvoices)
          .set({ amountPaid: Math.max(0, newPaid).toFixed(2), status: newStatus, updatedAt: new Date() })
          .where(eq(arInvoices.id, existing.invoiceId));
        updatePayload.amount = parseFloat(data.amount).toFixed(2);
      }
    }

    const [updated] = await db.update(arPayments).set(updatePayload).where(eq(arPayments.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update payment" });
  }
});

// DELETE /ar/payments/:id  (reverses amountPaid on invoice)
router.delete("/payments/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(arPayments)
      .where(and(eq(arPayments.id, id), eq(arPayments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }

    const [invoice] = await db.select().from(arInvoices).where(eq(arInvoices.id, existing.invoiceId)).limit(1);
    if (invoice) {
      const newPaid   = Math.max(0, parseFloat(invoice.amountPaid) - parseFloat(existing.amount));
      const total     = parseFloat(invoice.totalAmount);
      const newStatus = invoice.status === "void" ? "void" : newPaid <= 0 ? "sent" : newPaid < total ? "partial" : "paid";
      await db.update(arInvoices)
        .set({ amountPaid: newPaid.toFixed(2), status: newStatus, updatedAt: new Date() })
        .where(eq(arInvoices.id, existing.invoiceId));
    }

    await db.delete(arPayments).where(eq(arPayments.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete payment" });
  }
});

export default router;
