import { Router } from "express";
import { and, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { arCustomers, db, whatsappConfigs, whatsappMessages, whatsappTemplates } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
const MODULE = "Settings";
const notificationTypes = ["general", "invoice", "payment", "order"] as const;
type NotificationType = (typeof notificationTypes)[number];

const defaultTemplates = [
  { name: "Invoice reminder", category: "invoice", body: "Hello {{customer}}, your invoice is ready. Reply here if you need any help." },
  { name: "Payment received", category: "payment", body: "Hello {{customer}}, we received your payment. Thank you for choosing us." },
  { name: "Order update", category: "order", body: "Hello {{customer}}, your order has an update. We will keep you posted on the next step." },
];

router.use(requireAuth);

router.get("/whatsapp/config", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const [config] = await db.select().from(whatsappConfigs).where(eq(whatsappConfigs.orgId, req.user!.orgId!)).limit(1);
    res.json({ success: true, data: config ?? { displayName: "WhatsApp Demo", phoneNumber: null, enabled: true, mode: "demo" } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch WhatsApp configuration" });
  }
});

router.put("/whatsapp/config", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim() : "WhatsApp Demo";
  const phoneNumber = typeof req.body.phoneNumber === "string" ? req.body.phoneNumber.trim() || null : null;
  const enabled = req.body.enabled !== false;
  if (!displayName) { res.status(400).json({ success: false, error: "A display name is required" }); return; }
  try {
    const [existing] = await db.select({ id: whatsappConfigs.id }).from(whatsappConfigs).where(eq(whatsappConfigs.orgId, req.user!.orgId!)).limit(1);
    const [config] = existing
      ? await db.update(whatsappConfigs).set({ displayName, phoneNumber, enabled, mode: "demo", updatedAt: new Date() }).where(eq(whatsappConfigs.id, existing.id)).returning()
      : await db.insert(whatsappConfigs).values({ orgId: req.user!.orgId!, displayName, phoneNumber, enabled, mode: "demo", createdBy: req.user!.userId }).returning();
    res.json({ success: true, data: config });
  } catch {
    res.status(500).json({ success: false, error: "Failed to save WhatsApp configuration" });
  }
});

router.get("/whatsapp/customers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filters = [eq(arCustomers.orgId, req.user!.orgId!), eq(arCustomers.status, "active"), isNotNull(arCustomers.phone)];
    if (search) filters.push(or(ilike(arCustomers.name, `%${search}%`), ilike(arCustomers.phone, `%${search}%`))!);
    const customers = await db.select({ id: arCustomers.id, name: arCustomers.name, phone: arCustomers.phone, email: arCustomers.email })
      .from(arCustomers).where(and(...filters)).orderBy(arCustomers.name).limit(100);
    res.json({ success: true, data: customers });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch WhatsApp contacts" });
  }
});

router.get("/whatsapp/templates", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    let templates = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.orgId, req.user!.orgId!)).orderBy(whatsappTemplates.name);
    if (!templates.length) {
      await db.insert(whatsappTemplates).values(defaultTemplates.map(template => ({ ...template, orgId: req.user!.orgId!, createdBy: req.user!.userId })));
      templates = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.orgId, req.user!.orgId!)).orderBy(whatsappTemplates.name);
    }
    res.json({ success: true, data: templates });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch WhatsApp templates" });
  }
});

router.post("/whatsapp/templates", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  const category = notificationTypes.includes(req.body.category) ? req.body.category : "general";
  if (!name || !body) { res.status(400).json({ success: false, error: "Template name and message are required" }); return; }
  try {
    const [template] = await db.insert(whatsappTemplates).values({ orgId: req.user!.orgId!, name, body, category, createdBy: req.user!.userId }).returning();
    res.status(201).json({ success: true, data: template });
  } catch {
    res.status(409).json({ success: false, error: "A template with that name already exists" });
  }
});

router.delete("/whatsapp/templates/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    await db.delete(whatsappTemplates).where(and(eq(whatsappTemplates.id, Number(req.params.id)), eq(whatsappTemplates.orgId, req.user!.orgId!)));
    res.json({ success: true, data: null });
  } catch { res.status(500).json({ success: false, error: "Failed to delete WhatsApp template" }); }
});

router.get("/whatsapp/messages", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const messages = await db.select().from(whatsappMessages).where(eq(whatsappMessages.orgId, req.user!.orgId!)).orderBy(desc(whatsappMessages.createdAt)).limit(100);
    res.json({ success: true, data: messages });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch WhatsApp message history" }); }
});

router.post("/whatsapp/messages", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const customerId = Number(req.body.customerId);
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  const templateId = req.body.templateId ? Number(req.body.templateId) : null;
  const notificationType: NotificationType = notificationTypes.includes(req.body.notificationType) ? req.body.notificationType : "general";
  if (!Number.isInteger(customerId) || !body) { res.status(400).json({ success: false, error: "Select a customer and enter a message" }); return; }
  try {
    const [config] = await db.select({ enabled: whatsappConfigs.enabled }).from(whatsappConfigs).where(eq(whatsappConfigs.orgId, req.user!.orgId!)).limit(1);
    if (config && !config.enabled) { res.status(409).json({ success: false, error: "WhatsApp local sending is disabled" }); return; }
    const [customer] = await db.select({ id: arCustomers.id, name: arCustomers.name, phone: arCustomers.phone }).from(arCustomers)
      .where(and(eq(arCustomers.id, customerId), eq(arCustomers.orgId, req.user!.orgId!), eq(arCustomers.status, "active"))).limit(1);
    if (!customer?.phone) { res.status(400).json({ success: false, error: "The selected customer does not have a phone number" }); return; }
    const [message] = await db.insert(whatsappMessages).values({ orgId: req.user!.orgId!, customerId: customer.id, recipientName: customer.name, recipientPhone: customer.phone, templateId, notificationType, body, status: "pending", createdBy: req.user!.userId }).returning();
    const [sent] = await db.update(whatsappMessages).set({ status: "sent", sentAt: new Date() }).where(eq(whatsappMessages.id, message.id)).returning();
    res.status(201).json({ success: true, data: sent });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to send WhatsApp message" });
  }
});

export default router;