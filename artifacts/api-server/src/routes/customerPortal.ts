/**
 * /api/customer-portal — Customer Portal module
 *
 * Covers: Customers (CRUD + invite + status toggle),
 *         Invoices (CRUD + status transitions),
 *         Support Tickets (CRUD + messages + resolve/close),
 *         Summary dashboard, Activity feed
 *
 * All routes require authentication + "Customer Portal" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  cpCustomers, cpInvoices, cpTickets, cpTicketMessages,
} from "@workspace/db";
import {
  insertCpCustomerSchema, updateCpCustomerSchema,
  insertCpInvoiceSchema, updateCpInvoiceSchema,
  insertCpTicketSchema, updateCpTicketSchema,
  insertCpTicketMessageSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Customer Portal";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextCustomerCode(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(cpCustomers)
    .where(eq(cpCustomers.orgId, orgId));
  return `CPC-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextInvoiceNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(cpInvoices)
    .where(eq(cpInvoices.orgId, orgId));
  return `CPI-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextTicketNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(cpTickets)
    .where(eq(cpTickets.orgId, orgId));
  return `TKT-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles)
      .where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [perm] = await db.select().from(permissions)
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

    const [
      [{ totalCustomers }],
      [{ activeCustomers }],
      [{ totalInvoices }],
      [{ outstanding }],
      [{ openTickets }],
      [{ resolvedTickets }],
    ] = await Promise.all([
      db.select({ totalCustomers: sql<number>`count(*)::int` }).from(cpCustomers).where(eq(cpCustomers.orgId, orgId)),
      db.select({ activeCustomers: sql<number>`count(*)::int` }).from(cpCustomers)
        .where(and(eq(cpCustomers.orgId, orgId), eq(cpCustomers.status, "active"))),
      db.select({ totalInvoices: sql<number>`count(*)::int` }).from(cpInvoices).where(eq(cpInvoices.orgId, orgId)),
      db.select({ outstanding: sql<number>`coalesce(sum((amount - paid_amount)::numeric), 0)::numeric` })
        .from(cpInvoices)
        .where(and(eq(cpInvoices.orgId, orgId), sql`status not in ('paid')`)),
      db.select({ openTickets: sql<number>`count(*)::int` }).from(cpTickets)
        .where(and(eq(cpTickets.orgId, orgId), sql`status in ('open', 'in_progress')`)),
      db.select({ resolvedTickets: sql<number>`count(*)::int` }).from(cpTickets)
        .where(and(eq(cpTickets.orgId, orgId), sql`status in ('resolved', 'closed')`)),
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        totalInvoices,
        outstanding: Number(outstanding).toFixed(2),
        openTickets,
        resolvedTickets,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ── Activity Feed ─────────────────────────────────────────────────────────────

router.get("/activity", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [customers, invoices, tickets, messages] = await Promise.all([
      db.select({
        id: cpCustomers.id, name: cpCustomers.name, company: cpCustomers.company,
        status: cpCustomers.status, createdAt: cpCustomers.createdAt,
      }).from(cpCustomers).where(eq(cpCustomers.orgId, orgId)).orderBy(desc(cpCustomers.createdAt)).limit(5),

      db.select({
        id: cpInvoices.id, invoiceNumber: cpInvoices.invoiceNumber,
        amount: cpInvoices.amount, status: cpInvoices.status,
        customerId: cpInvoices.customerId, updatedAt: cpInvoices.updatedAt,
        customerName: cpCustomers.name,
      }).from(cpInvoices)
        .innerJoin(cpCustomers, eq(cpInvoices.customerId, cpCustomers.id))
        .where(eq(cpInvoices.orgId, orgId)).orderBy(desc(cpInvoices.updatedAt)).limit(5),

      db.select({
        id: cpTickets.id, ticketNumber: cpTickets.ticketNumber, subject: cpTickets.subject,
        status: cpTickets.status, priority: cpTickets.priority,
        customerId: cpTickets.customerId, updatedAt: cpTickets.updatedAt,
        customerName: cpCustomers.name,
      }).from(cpTickets)
        .innerJoin(cpCustomers, eq(cpTickets.customerId, cpCustomers.id))
        .where(eq(cpTickets.orgId, orgId)).orderBy(desc(cpTickets.updatedAt)).limit(5),

      db.select({
        id: cpTicketMessages.id, message: cpTicketMessages.message,
        senderType: cpTicketMessages.senderType, senderName: cpTicketMessages.senderName,
        ticketId: cpTicketMessages.ticketId, createdAt: cpTicketMessages.createdAt,
        ticketNumber: cpTickets.ticketNumber,
      }).from(cpTicketMessages)
        .innerJoin(cpTickets, eq(cpTicketMessages.ticketId, cpTickets.id))
        .where(eq(cpTickets.orgId, orgId)).orderBy(desc(cpTicketMessages.createdAt)).limit(5),
    ]);

    const events = [
      ...customers.map(c => ({
        type: "customer_joined" as const,
        id: `c-${c.id}`, label: `${c.name} joined the portal`,
        sub: c.company ?? "", status: c.status, at: c.createdAt,
      })),
      ...invoices.map(i => ({
        type: "invoice_updated" as const,
        id: `i-${i.id}`, label: `Invoice ${i.invoiceNumber} — ${i.status}`,
        sub: i.customerName, status: i.status, at: i.updatedAt,
        amount: i.amount,
      })),
      ...tickets.map(t => ({
        type: "ticket_updated" as const,
        id: `t-${t.id}`, label: `${t.ticketNumber}: ${t.subject}`,
        sub: t.customerName, status: t.status, priority: t.priority, at: t.updatedAt,
      })),
      ...messages.map(m => ({
        type: "ticket_message" as const,
        id: `m-${m.id}`, label: `Reply on ${m.ticketNumber}`,
        sub: `${m.senderName}: ${m.message.slice(0, 60)}${m.message.length > 60 ? "…" : ""}`,
        senderType: m.senderType, at: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);

    res.json({ success: true, data: events });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch activity" });
  }
});

// ── Customers ─────────────────────────────────────────────────────────────────

router.get("/customers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search  = (req.query.search as string) ?? "";
    const status  = req.query.status as string;

    const conditions = [eq(cpCustomers.orgId, orgId)];
    if (search) {
      conditions.push(
        or(
          ilike(cpCustomers.name,    `%${search}%`),
          ilike(cpCustomers.email,   `%${search}%`),
          ilike(cpCustomers.company ?? cpCustomers.name, `%${search}%`),
        )!,
      );
    }
    if (status) conditions.push(eq(cpCustomers.status, status));

    const customers = await db
      .select({
        id:            cpCustomers.id,
        customerCode:  cpCustomers.customerCode,
        name:          cpCustomers.name,
        email:         cpCustomers.email,
        company:       cpCustomers.company,
        phone:         cpCustomers.phone,
        status:        cpCustomers.status,
        avatarColor:   cpCustomers.avatarColor,
        notes:         cpCustomers.notes,
        lastLogin:     cpCustomers.lastLogin,
        portalEnabled: cpCustomers.portalEnabled,
        inviteSentAt:  cpCustomers.inviteSentAt,
        createdAt:     cpCustomers.createdAt,
        updatedAt:     cpCustomers.updatedAt,
        invoiceCount:  sql<number>`(select count(*)::int from cp_invoices ci where ci.customer_id = ${cpCustomers.id})`,
        ticketCount:   sql<number>`(select count(*)::int from cp_tickets ct where ct.customer_id = ${cpCustomers.id})`,
        openTickets:   sql<number>`(select count(*)::int from cp_tickets ct where ct.customer_id = ${cpCustomers.id} and ct.status in ('open','in_progress'))`,
        outstanding:   sql<string>`coalesce((select sum((ci.amount - ci.paid_amount)::numeric) from cp_invoices ci where ci.customer_id = ${cpCustomers.id} and ci.status not in ('paid')), 0)::text`,
      })
      .from(cpCustomers)
      .where(and(...conditions))
      .orderBy(desc(cpCustomers.createdAt));

    res.json({ success: true, data: customers });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
  }
});

router.get("/customers/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [customer] = await db.select().from(cpCustomers).where(eq(cpCustomers.id, id)).limit(1);
    if (!customer) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    res.json({ success: true, data: customer });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch customer" });
  }
});

router.post("/customers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertCpCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const customerCode = await nextCustomerCode(orgId);
    const [customer] = await db.insert(cpCustomers).values({
      ...parsed.data,
      orgId,
      customerCode,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: customer });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create customer" });
  }
});

router.put("/customers/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateCpCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [updated] = await db.update(cpCustomers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(cpCustomers.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    await db.delete(cpCustomers).where(eq(cpCustomers.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete customer" });
  }
});

/** Mark invite as sent */
router.post("/customers/:id/invite", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [updated] = await db.update(cpCustomers)
      .set({ inviteSentAt: new Date(), status: "active", updatedAt: new Date() })
      .where(eq(cpCustomers.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to send invite" });
  }
});

/** Toggle portal access */
router.post("/customers/:id/toggle", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ portalEnabled: cpCustomers.portalEnabled, status: cpCustomers.status })
      .from(cpCustomers).where(eq(cpCustomers.id, id)).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    const newEnabled = !existing.portalEnabled;
    const newStatus  = newEnabled ? "active" : "inactive";
    const [updated]  = await db.update(cpCustomers)
      .set({ portalEnabled: newEnabled, status: newStatus, updatedAt: new Date() })
      .where(eq(cpCustomers.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle portal access" });
  }
});

// ── Invoices ──────────────────────────────────────────────────────────────────

router.get("/invoices", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId     = req.user!.orgId!;
    const search    = (req.query.search as string) ?? "";
    const status    = req.query.status as string;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

    const conditions = [eq(cpInvoices.orgId, orgId)];
    if (search) conditions.push(ilike(cpInvoices.invoiceNumber, `%${search}%`));
    if (status) conditions.push(eq(cpInvoices.status, status));
    if (customerId) conditions.push(eq(cpInvoices.customerId, customerId));

    const invoices = await db
      .select({
        id:            cpInvoices.id,
        invoiceNumber: cpInvoices.invoiceNumber,
        invoiceDate:   cpInvoices.invoiceDate,
        dueDate:       cpInvoices.dueDate,
        amount:        cpInvoices.amount,
        paidAmount:    cpInvoices.paidAmount,
        currency:      cpInvoices.currency,
        status:        cpInvoices.status,
        description:   cpInvoices.description,
        notes:         cpInvoices.notes,
        viewedAt:      cpInvoices.viewedAt,
        paidAt:        cpInvoices.paidAt,
        customerId:    cpInvoices.customerId,
        customerName:  cpCustomers.name,
        customerEmail: cpCustomers.email,
        customerCompany: cpCustomers.company,
        createdAt:     cpInvoices.createdAt,
        updatedAt:     cpInvoices.updatedAt,
      })
      .from(cpInvoices)
      .innerJoin(cpCustomers, eq(cpInvoices.customerId, cpCustomers.id))
      .where(and(...conditions))
      .orderBy(desc(cpInvoices.createdAt));

    res.json({ success: true, data: invoices });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [inv] = await db
      .select({
        id:            cpInvoices.id,
        invoiceNumber: cpInvoices.invoiceNumber,
        invoiceDate:   cpInvoices.invoiceDate,
        dueDate:       cpInvoices.dueDate,
        amount:        cpInvoices.amount,
        paidAmount:    cpInvoices.paidAmount,
        currency:      cpInvoices.currency,
        status:        cpInvoices.status,
        description:   cpInvoices.description,
        notes:         cpInvoices.notes,
        viewedAt:      cpInvoices.viewedAt,
        paidAt:        cpInvoices.paidAt,
        customerId:    cpInvoices.customerId,
        customerName:  cpCustomers.name,
        customerEmail: cpCustomers.email,
        createdAt:     cpInvoices.createdAt,
        updatedAt:     cpInvoices.updatedAt,
      })
      .from(cpInvoices)
      .innerJoin(cpCustomers, eq(cpInvoices.customerId, cpCustomers.id))
      .where(eq(cpInvoices.id, id))
      .limit(1);
    if (!inv) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    res.json({ success: true, data: inv });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoice" });
  }
});

router.post("/invoices", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertCpInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const invoiceNumber = await nextInvoiceNumber(orgId);
    const [inv] = await db.insert(cpInvoices).values({
      ...parsed.data,
      orgId,
      invoiceNumber,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: inv });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create invoice" });
  }
});

router.put("/invoices/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateCpInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const extra: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status === "paid") extra.paidAt = new Date();
    const [updated] = await db.update(cpInvoices)
      .set({ ...parsed.data, ...extra })
      .where(eq(cpInvoices.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update invoice" });
  }
});

router.delete("/invoices/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [inv] = await db.select({ status: cpInvoices.status }).from(cpInvoices).where(eq(cpInvoices.id, id)).limit(1);
    if (!inv) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (inv.status === "paid") {
      res.status(422).json({ success: false, error: "Cannot delete a paid invoice" });
      return;
    }
    await db.delete(cpInvoices).where(eq(cpInvoices.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete invoice" });
  }
});

// ── Tickets ───────────────────────────────────────────────────────────────────

router.get("/tickets", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId      = req.user!.orgId!;
    const search     = (req.query.search as string) ?? "";
    const status     = req.query.status as string;
    const priority   = req.query.priority as string;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

    const conditions = [eq(cpTickets.orgId, orgId)];
    if (search) {
      conditions.push(
        or(ilike(cpTickets.subject, `%${search}%`), ilike(cpTickets.ticketNumber, `%${search}%`))!,
      );
    }
    if (status)   conditions.push(eq(cpTickets.status, status));
    if (priority) conditions.push(eq(cpTickets.priority, priority));
    if (customerId) conditions.push(eq(cpTickets.customerId, customerId));

    const tickets = await db
      .select({
        id:            cpTickets.id,
        ticketNumber:  cpTickets.ticketNumber,
        subject:       cpTickets.subject,
        description:   cpTickets.description,
        category:      cpTickets.category,
        priority:      cpTickets.priority,
        status:        cpTickets.status,
        assignedTo:    cpTickets.assignedTo,
        resolvedAt:    cpTickets.resolvedAt,
        closedAt:      cpTickets.closedAt,
        customerId:    cpTickets.customerId,
        customerName:  cpCustomers.name,
        customerEmail: cpCustomers.email,
        customerCompany: cpCustomers.company,
        createdAt:     cpTickets.createdAt,
        updatedAt:     cpTickets.updatedAt,
        messageCount:  sql<number>`(select count(*)::int from cp_ticket_messages m where m.ticket_id = ${cpTickets.id})`,
      })
      .from(cpTickets)
      .innerJoin(cpCustomers, eq(cpTickets.customerId, cpCustomers.id))
      .where(and(...conditions))
      .orderBy(
        sql`case priority when 'urgent' then 1 when 'high' then 2 when 'medium' then 3 else 4 end`,
        desc(cpTickets.createdAt),
      );

    res.json({ success: true, data: tickets });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tickets" });
  }
});

router.get("/tickets/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [ticket] = await db
      .select({
        id:            cpTickets.id,
        ticketNumber:  cpTickets.ticketNumber,
        subject:       cpTickets.subject,
        description:   cpTickets.description,
        category:      cpTickets.category,
        priority:      cpTickets.priority,
        status:        cpTickets.status,
        assignedTo:    cpTickets.assignedTo,
        resolvedAt:    cpTickets.resolvedAt,
        closedAt:      cpTickets.closedAt,
        customerId:    cpTickets.customerId,
        customerName:  cpCustomers.name,
        customerEmail: cpCustomers.email,
        createdAt:     cpTickets.createdAt,
        updatedAt:     cpTickets.updatedAt,
      })
      .from(cpTickets)
      .innerJoin(cpCustomers, eq(cpTickets.customerId, cpCustomers.id))
      .where(eq(cpTickets.id, id))
      .limit(1);
    if (!ticket) { res.status(404).json({ success: false, error: "Ticket not found" }); return; }
    res.json({ success: true, data: ticket });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch ticket" });
  }
});

router.post("/tickets", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertCpTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const ticketNumber = await nextTicketNumber(orgId);
    const [ticket] = await db.insert(cpTickets).values({
      ...parsed.data,
      orgId,
      ticketNumber,
    }).returning();
    res.status(201).json({ success: true, data: ticket });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create ticket" });
  }
});

router.put("/tickets/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateCpTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const extra: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status === "resolved") extra.resolvedAt = new Date();
    if (parsed.data.status === "closed")   extra.closedAt   = new Date();
    const [updated] = await db.update(cpTickets)
      .set({ ...parsed.data, ...extra })
      .where(eq(cpTickets.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Ticket not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update ticket" });
  }
});

router.get("/tickets/:id/messages", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const messages = await db.select().from(cpTicketMessages)
      .where(eq(cpTicketMessages.ticketId, id))
      .orderBy(cpTicketMessages.createdAt);
    res.json({ success: true, data: messages });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

router.post("/tickets/:id/messages", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = insertCpTicketMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [msg] = await db.insert(cpTicketMessages).values({
      ticketId:   id,
      senderType: parsed.data.senderType ?? "staff",
      senderName: parsed.data.senderName,
      message:    parsed.data.message,
    }).returning();
    // bump ticket updatedAt
    await db.update(cpTickets).set({ updatedAt: new Date() }).where(eq(cpTickets.id, id));
    res.status(201).json({ success: true, data: msg });
  } catch {
    res.status(500).json({ success: false, error: "Failed to add message" });
  }
});

export default router;
