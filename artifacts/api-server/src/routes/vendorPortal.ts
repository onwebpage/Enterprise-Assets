/**
 * /api/vendor-portal — Vendor Portal module
 *
 * Covers: Vendors (CRUD + invite + status toggle),
 *         Bills (CRUD + status transitions),
 *         Tickets (CRUD + messages + resolve/close),
 *         Summary dashboard, Activity feed
 *
 * All routes require authentication + "Vendor Portal" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  vpVendors, vpBills, vpTickets, vpTicketMessages,
} from "@workspace/db";
import {
  insertVpVendorSchema, updateVpVendorSchema,
  insertVpBillSchema, updateVpBillSchema,
  insertVpTicketSchema, updateVpTicketSchema,
  insertVpTicketMessageSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const MODULE = "Vendor Portal";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextVendorCode(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(vpVendors)
    .where(eq(vpVendors.orgId, orgId));
  return `VND-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextBillNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(vpBills)
    .where(eq(vpBills.orgId, orgId));
  return `VPB-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextTicketNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(vpTickets)
    .where(eq(vpTickets.orgId, orgId));
  return `VTK-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

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

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [
      [{ totalVendors }],
      [{ activeVendors }],
      [{ preferredVendors }],
      [{ totalBills }],
      [{ outstanding }],
      [{ openTickets }],
      [{ resolvedTickets }],
      avgOnTime,
    ] = await Promise.all([
      db.select({ totalVendors: sql<number>`count(*)::int` }).from(vpVendors).where(eq(vpVendors.orgId, orgId)),
      db.select({ activeVendors: sql<number>`count(*)::int` }).from(vpVendors)
        .where(and(eq(vpVendors.orgId, orgId), sql`status in ('active','preferred')`)),
      db.select({ preferredVendors: sql<number>`count(*)::int` }).from(vpVendors)
        .where(and(eq(vpVendors.orgId, orgId), eq(vpVendors.status, "preferred"))),
      db.select({ totalBills: sql<number>`count(*)::int` }).from(vpBills).where(eq(vpBills.orgId, orgId)),
      db.select({ outstanding: sql<number>`coalesce(sum((amount - paid_amount)::numeric), 0)::numeric` })
        .from(vpBills)
        .where(and(eq(vpBills.orgId, orgId), sql`status not in ('paid')`)),
      db.select({ openTickets: sql<number>`count(*)::int` }).from(vpTickets)
        .where(and(eq(vpTickets.orgId, orgId), sql`status in ('open', 'in_progress')`)),
      db.select({ resolvedTickets: sql<number>`count(*)::int` }).from(vpTickets)
        .where(and(eq(vpTickets.orgId, orgId), sql`status in ('resolved', 'closed')`)),
      db.select({ avg: sql<number>`coalesce(avg(on_time_pct::numeric), 0)::numeric` })
        .from(vpVendors).where(and(eq(vpVendors.orgId, orgId), sql`status in ('active','preferred')`)),
    ]);

    res.json({
      success: true,
      data: {
        totalVendors,
        activeVendors,
        preferredVendors,
        totalBills,
        outstanding: Number(outstanding).toFixed(2),
        openTickets,
        resolvedTickets,
        avgOnTimePct: Number(avgOnTime[0]?.avg ?? 0).toFixed(1),
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

    const [vendors, bills, tickets, messages] = await Promise.all([
      db.select({
        id: vpVendors.id, name: vpVendors.name, company: vpVendors.company,
        status: vpVendors.status, createdAt: vpVendors.createdAt,
      }).from(vpVendors).where(eq(vpVendors.orgId, orgId)).orderBy(desc(vpVendors.createdAt)).limit(5),

      db.select({
        id: vpBills.id, billNumber: vpBills.billNumber,
        amount: vpBills.amount, status: vpBills.status,
        vendorId: vpBills.vendorId, updatedAt: vpBills.updatedAt,
        vendorName: vpVendors.name,
      }).from(vpBills)
        .innerJoin(vpVendors, eq(vpBills.vendorId, vpVendors.id))
        .where(eq(vpBills.orgId, orgId)).orderBy(desc(vpBills.updatedAt)).limit(5),

      db.select({
        id: vpTickets.id, ticketNumber: vpTickets.ticketNumber, subject: vpTickets.subject,
        status: vpTickets.status, priority: vpTickets.priority,
        vendorId: vpTickets.vendorId, updatedAt: vpTickets.updatedAt,
        vendorName: vpVendors.name,
      }).from(vpTickets)
        .innerJoin(vpVendors, eq(vpTickets.vendorId, vpVendors.id))
        .where(eq(vpTickets.orgId, orgId)).orderBy(desc(vpTickets.updatedAt)).limit(5),

      db.select({
        id: vpTicketMessages.id, message: vpTicketMessages.message,
        senderType: vpTicketMessages.senderType, senderName: vpTicketMessages.senderName,
        ticketId: vpTicketMessages.ticketId, createdAt: vpTicketMessages.createdAt,
        ticketNumber: vpTickets.ticketNumber,
      }).from(vpTicketMessages)
        .innerJoin(vpTickets, eq(vpTicketMessages.ticketId, vpTickets.id))
        .where(eq(vpTickets.orgId, orgId)).orderBy(desc(vpTicketMessages.createdAt)).limit(5),
    ]);

    const events = [
      ...vendors.map(v => ({
        type: "vendor_joined" as const,
        id: `v-${v.id}`, label: `${v.name} added to vendor portal`,
        sub: v.company ?? "", status: v.status, at: v.createdAt,
      })),
      ...bills.map(b => ({
        type: "bill_updated" as const,
        id: `b-${b.id}`, label: `Bill ${b.billNumber} — ${b.status}`,
        sub: b.vendorName, status: b.status, at: b.updatedAt,
        amount: b.amount,
      })),
      ...tickets.map(t => ({
        type: "ticket_updated" as const,
        id: `t-${t.id}`, label: `${t.ticketNumber}: ${t.subject}`,
        sub: t.vendorName, status: t.status, priority: t.priority, at: t.updatedAt,
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

// ── Vendors ───────────────────────────────────────────────────────────────────

router.get("/vendors", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const search = (req.query.search as string) ?? "";
    const status = req.query.status as string;

    const conditions = [eq(vpVendors.orgId, orgId)];
    if (search) {
      conditions.push(
        or(
          ilike(vpVendors.name,    `%${search}%`),
          ilike(vpVendors.email,   `%${search}%`),
          ilike(vpVendors.company ?? vpVendors.name, `%${search}%`),
          ilike(vpVendors.vendorCode, `%${search}%`),
        )!,
      );
    }
    if (status) conditions.push(eq(vpVendors.status, status));

    const vendors = await db
      .select({
        id:            vpVendors.id,
        vendorCode:    vpVendors.vendorCode,
        name:          vpVendors.name,
        email:         vpVendors.email,
        company:       vpVendors.company,
        phone:         vpVendors.phone,
        category:      vpVendors.category,
        status:        vpVendors.status,
        avatarColor:   vpVendors.avatarColor,
        rating:        vpVendors.rating,
        onTimePct:     vpVendors.onTimePct,
        notes:         vpVendors.notes,
        portalEnabled: vpVendors.portalEnabled,
        inviteSentAt:  vpVendors.inviteSentAt,
        createdAt:     vpVendors.createdAt,
        updatedAt:     vpVendors.updatedAt,
        billCount:     sql<number>`(select count(*)::int from vp_bills vb where vb.vendor_id = ${vpVendors.id})`,
        ticketCount:   sql<number>`(select count(*)::int from vp_tickets vt where vt.vendor_id = ${vpVendors.id})`,
        openTickets:   sql<number>`(select count(*)::int from vp_tickets vt where vt.vendor_id = ${vpVendors.id} and vt.status in ('open','in_progress'))`,
        outstanding:   sql<string>`coalesce((select sum((vb.amount - vb.paid_amount)::numeric) from vp_bills vb where vb.vendor_id = ${vpVendors.id} and vb.status not in ('paid')), 0)::text`,
        totalSpend:    sql<string>`coalesce((select sum(vb.amount::numeric) from vp_bills vb where vb.vendor_id = ${vpVendors.id} and vb.status in ('paid','approved')), 0)::text`,
      })
      .from(vpVendors)
      .where(and(...conditions))
      .orderBy(desc(vpVendors.createdAt));

    res.json({ success: true, data: vendors });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendors" });
  }
});

router.get("/vendors/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [vendor] = await db.select().from(vpVendors).where(eq(vpVendors.id, id)).limit(1);
    if (!vendor) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    res.json({ success: true, data: vendor });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendor" });
  }
});

router.post("/vendors", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertVpVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const vendorCode = await nextVendorCode(orgId);
    const [vendor] = await db.insert(vpVendors).values({
      ...parsed.data,
      orgId,
      vendorCode,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: vendor });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create vendor" });
  }
});

router.put("/vendors/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateVpVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [updated] = await db.update(vpVendors)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(vpVendors.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    await db.delete(vpVendors).where(eq(vpVendors.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete vendor" });
  }
});

/** Mark invite as sent */
router.post("/vendors/:id/invite", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [updated] = await db.update(vpVendors)
      .set({ inviteSentAt: new Date(), status: "active", updatedAt: new Date() })
      .where(eq(vpVendors.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to send invite" });
  }
});

/** Toggle portal access */
router.post("/vendors/:id/toggle", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ portalEnabled: vpVendors.portalEnabled })
      .from(vpVendors).where(eq(vpVendors.id, id)).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const newEnabled = !existing.portalEnabled;
    const newStatus  = newEnabled ? "active" : "inactive";
    const [updated]  = await db.update(vpVendors)
      .set({ portalEnabled: newEnabled, status: newStatus, updatedAt: new Date() })
      .where(eq(vpVendors.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle portal access" });
  }
});

// ── Bills ─────────────────────────────────────────────────────────────────────

router.get("/bills", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId    = req.user!.orgId!;
    const search   = (req.query.search as string) ?? "";
    const status   = req.query.status as string;
    const vendorId = req.query.vendorId ? parseInt(req.query.vendorId as string) : undefined;

    const conditions = [eq(vpBills.orgId, orgId)];
    if (search) conditions.push(
      or(ilike(vpBills.billNumber, `%${search}%`), ilike(vpBills.poReference ?? vpBills.billNumber, `%${search}%`))!,
    );
    if (status) conditions.push(eq(vpBills.status, status));
    if (vendorId) conditions.push(eq(vpBills.vendorId, vendorId));

    const bills = await db
      .select({
        id:          vpBills.id,
        billNumber:  vpBills.billNumber,
        billDate:    vpBills.billDate,
        dueDate:     vpBills.dueDate,
        amount:      vpBills.amount,
        paidAmount:  vpBills.paidAmount,
        currency:    vpBills.currency,
        status:      vpBills.status,
        poReference: vpBills.poReference,
        description: vpBills.description,
        notes:       vpBills.notes,
        paidAt:      vpBills.paidAt,
        vendorId:    vpBills.vendorId,
        vendorName:  vpVendors.name,
        vendorEmail: vpVendors.email,
        vendorCompany: vpVendors.company,
        createdAt:   vpBills.createdAt,
        updatedAt:   vpBills.updatedAt,
      })
      .from(vpBills)
      .innerJoin(vpVendors, eq(vpBills.vendorId, vpVendors.id))
      .where(and(...conditions))
      .orderBy(desc(vpBills.createdAt));

    res.json({ success: true, data: bills });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch bills" });
  }
});

router.get("/bills/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [bill] = await db
      .select({
        id:          vpBills.id,
        billNumber:  vpBills.billNumber,
        billDate:    vpBills.billDate,
        dueDate:     vpBills.dueDate,
        amount:      vpBills.amount,
        paidAmount:  vpBills.paidAmount,
        currency:    vpBills.currency,
        status:      vpBills.status,
        poReference: vpBills.poReference,
        description: vpBills.description,
        notes:       vpBills.notes,
        paidAt:      vpBills.paidAt,
        vendorId:    vpBills.vendorId,
        vendorName:  vpVendors.name,
        vendorEmail: vpVendors.email,
        createdAt:   vpBills.createdAt,
        updatedAt:   vpBills.updatedAt,
      })
      .from(vpBills)
      .innerJoin(vpVendors, eq(vpBills.vendorId, vpVendors.id))
      .where(eq(vpBills.id, id))
      .limit(1);
    if (!bill) { res.status(404).json({ success: false, error: "Bill not found" }); return; }
    res.json({ success: true, data: bill });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch bill" });
  }
});

router.post("/bills", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertVpBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const billNumber = await nextBillNumber(orgId);
    const [bill] = await db.insert(vpBills).values({
      ...parsed.data,
      orgId,
      billNumber,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: bill });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create bill" });
  }
});

router.put("/bills/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateVpBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const extra: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status === "paid") extra.paidAt = new Date();
    const [updated] = await db.update(vpBills)
      .set({ ...parsed.data, ...extra })
      .where(eq(vpBills.id, id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Bill not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update bill" });
  }
});

router.delete("/bills/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [bill] = await db.select({ status: vpBills.status }).from(vpBills).where(eq(vpBills.id, id)).limit(1);
    if (!bill) { res.status(404).json({ success: false, error: "Bill not found" }); return; }
    if (bill.status === "paid") {
      res.status(422).json({ success: false, error: "Cannot delete a paid bill" });
      return;
    }
    await db.delete(vpBills).where(eq(vpBills.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete bill" });
  }
});

// ── Tickets ───────────────────────────────────────────────────────────────────

router.get("/tickets", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId    = req.user!.orgId!;
    const search   = (req.query.search as string) ?? "";
    const status   = req.query.status as string;
    const priority = req.query.priority as string;
    const vendorId = req.query.vendorId ? parseInt(req.query.vendorId as string) : undefined;

    const conditions = [eq(vpTickets.orgId, orgId)];
    if (search) {
      conditions.push(
        or(ilike(vpTickets.subject, `%${search}%`), ilike(vpTickets.ticketNumber, `%${search}%`))!,
      );
    }
    if (status)   conditions.push(eq(vpTickets.status, status));
    if (priority) conditions.push(eq(vpTickets.priority, priority));
    if (vendorId) conditions.push(eq(vpTickets.vendorId, vendorId));

    const tickets = await db
      .select({
        id:           vpTickets.id,
        ticketNumber: vpTickets.ticketNumber,
        subject:      vpTickets.subject,
        description:  vpTickets.description,
        category:     vpTickets.category,
        priority:     vpTickets.priority,
        status:       vpTickets.status,
        assignedTo:   vpTickets.assignedTo,
        resolvedAt:   vpTickets.resolvedAt,
        closedAt:     vpTickets.closedAt,
        vendorId:     vpTickets.vendorId,
        vendorName:   vpVendors.name,
        vendorEmail:  vpVendors.email,
        vendorCompany: vpVendors.company,
        createdAt:    vpTickets.createdAt,
        updatedAt:    vpTickets.updatedAt,
        messageCount: sql<number>`(select count(*)::int from vp_ticket_messages m where m.ticket_id = ${vpTickets.id})`,
      })
      .from(vpTickets)
      .innerJoin(vpVendors, eq(vpTickets.vendorId, vpVendors.id))
      .where(and(...conditions))
      .orderBy(
        sql`case priority when 'urgent' then 1 when 'high' then 2 when 'medium' then 3 else 4 end`,
        desc(vpTickets.createdAt),
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
        id:           vpTickets.id,
        ticketNumber: vpTickets.ticketNumber,
        subject:      vpTickets.subject,
        description:  vpTickets.description,
        category:     vpTickets.category,
        priority:     vpTickets.priority,
        status:       vpTickets.status,
        assignedTo:   vpTickets.assignedTo,
        resolvedAt:   vpTickets.resolvedAt,
        closedAt:     vpTickets.closedAt,
        vendorId:     vpTickets.vendorId,
        vendorName:   vpVendors.name,
        vendorEmail:  vpVendors.email,
        createdAt:    vpTickets.createdAt,
        updatedAt:    vpTickets.updatedAt,
      })
      .from(vpTickets)
      .innerJoin(vpVendors, eq(vpTickets.vendorId, vpVendors.id))
      .where(eq(vpTickets.id, id))
      .limit(1);
    if (!ticket) { res.status(404).json({ success: false, error: "Ticket not found" }); return; }
    res.json({ success: true, data: ticket });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch ticket" });
  }
});

router.post("/tickets", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertVpTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const ticketNumber = await nextTicketNumber(orgId);
    const [ticket] = await db.insert(vpTickets).values({
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
  const parsed = updateVpTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const extra: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status === "resolved") extra.resolvedAt = new Date();
    if (parsed.data.status === "closed")   extra.closedAt   = new Date();
    const [updated] = await db.update(vpTickets)
      .set({ ...parsed.data, ...extra })
      .where(eq(vpTickets.id, id))
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
    const messages = await db.select().from(vpTicketMessages)
      .where(eq(vpTicketMessages.ticketId, id))
      .orderBy(vpTicketMessages.createdAt);
    res.json({ success: true, data: messages });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

router.post("/tickets/:id/messages", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = insertVpTicketMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const [msg] = await db.insert(vpTicketMessages).values({
      ticketId:   id,
      senderType: parsed.data.senderType ?? "staff",
      senderName: parsed.data.senderName,
      message:    parsed.data.message,
    }).returning();
    await db.update(vpTickets).set({ updatedAt: new Date() }).where(eq(vpTickets.id, id));
    res.status(201).json({ success: true, data: msg });
  } catch {
    res.status(500).json({ success: false, error: "Failed to add message" });
  }
});

export default router;
