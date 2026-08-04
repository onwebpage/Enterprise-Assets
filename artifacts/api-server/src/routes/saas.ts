import { Router } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { saasPlans, saasSubscriptions, saasWhitelabel, organizations } from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Platform Metrics ────────────────────────────────────────────────────────
router.get("/metrics", async (_req, res) => {
  try {
    const [totalTenants] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations);

    const [activeSubs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "active"));

    const [mrrResult] = await db
      .select({ total: sql<number>`coalesce(sum(mrr::numeric), 0)::numeric` })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "active"));

    const [trialCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "trial"));

    const [suspendedCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "suspended"));

    const planBreakdown = await db
      .select({
        plan: saasPlans.name,
        slug: saasPlans.slug,
        count: sql<number>`count(${saasSubscriptions.id})::int`,
        mrr: sql<number>`coalesce(sum(${saasSubscriptions.mrr}::numeric), 0)::numeric`,
      })
      .from(saasPlans)
      .leftJoin(
        saasSubscriptions,
        and(eq(saasSubscriptions.planId, saasPlans.id), eq(saasSubscriptions.status, "active"))
      )
      .groupBy(saasPlans.id, saasPlans.name, saasPlans.slug)
      .orderBy(saasPlans.sortOrder);

    const totalUsers = await db
      .select({ total: sql<number>`coalesce(sum(current_users), 0)::int` })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "active"));

    res.json({
      success: true,
      data: {
        totalTenants: totalTenants?.count ?? 0,
        activeTenants: activeSubs?.count ?? 0,
        trialTenants: trialCount?.count ?? 0,
        suspendedTenants: suspendedCount?.count ?? 0,
        mrr: Number(mrrResult?.total ?? 0),
        arr: Number(mrrResult?.total ?? 0) * 12,
        totalUsers: totalUsers[0]?.total ?? 0,
        planBreakdown,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch metrics" });
  }
});

// ── Plans ───────────────────────────────────────────────────────────────────
router.get("/plans", async (_req, res) => {
  try {
    const data = await db.select().from(saasPlans).orderBy(saasPlans.sortOrder);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

router.post("/plans", async (req, res) => {
  try {
    const { name, slug, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, maxApiCallsMonthly, features, sortOrder } = req.body;
    const [plan] = await db
      .insert(saasPlans)
      .values({ name, slug, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, maxApiCallsMonthly, features, sortOrder })
      .returning();
    res.status(201).json({ success: true, data: plan });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create plan" });
  }
});

router.put("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [plan] = await db
      .update(saasPlans)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(saasPlans.id, parseInt(id)))
      .returning();
    if (!plan) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    res.json({ success: true, data: plan });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update plan" });
  }
});

router.delete("/plans/:id", async (req, res) => {
  try {
    await db.update(saasPlans).set({ isActive: false, updatedAt: new Date() }).where(eq(saasPlans.id, parseInt(req.params.id)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete plan" });
  }
});

// ── Tenants ─────────────────────────────────────────────────────────────────
router.get("/tenants", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        legalName: organizations.legalName,
        industry: organizations.industry,
        country: organizations.country,
        status: organizations.status,
        currency: organizations.currency,
        employeeCount: organizations.employeeCount,
        createdAt: organizations.createdAt,
        subId: saasSubscriptions.id,
        subStatus: saasSubscriptions.status,
        billingCycle: saasSubscriptions.billingCycle,
        startedAt: saasSubscriptions.startedAt,
        expiresAt: saasSubscriptions.expiresAt,
        trialEndsAt: saasSubscriptions.trialEndsAt,
        currentUsers: saasSubscriptions.currentUsers,
        currentStorageGb: saasSubscriptions.currentStorageGb,
        currentApiCalls: saasSubscriptions.currentApiCalls,
        mrr: saasSubscriptions.mrr,
        planId: saasPlans.id,
        planName: saasPlans.name,
        planSlug: saasPlans.slug,
        maxUsers: saasPlans.maxUsers,
        maxStorageGb: saasPlans.maxStorageGb,
      })
      .from(organizations)
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, organizations.id))
      .leftJoin(saasPlans, eq(saasPlans.id, saasSubscriptions.planId))
      .orderBy(desc(organizations.createdAt));
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch tenants" });
  }
});

router.get("/tenants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        legalName: organizations.legalName,
        industry: organizations.industry,
        country: organizations.country,
        status: organizations.status,
        currency: organizations.currency,
        employeeCount: organizations.employeeCount,
        taxId: organizations.taxId,
        gstin: organizations.gstin,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        subId: saasSubscriptions.id,
        subStatus: saasSubscriptions.status,
        billingCycle: saasSubscriptions.billingCycle,
        startedAt: saasSubscriptions.startedAt,
        expiresAt: saasSubscriptions.expiresAt,
        trialEndsAt: saasSubscriptions.trialEndsAt,
        cancelledAt: saasSubscriptions.cancelledAt,
        currentUsers: saasSubscriptions.currentUsers,
        currentStorageGb: saasSubscriptions.currentStorageGb,
        currentApiCalls: saasSubscriptions.currentApiCalls,
        mrr: saasSubscriptions.mrr,
        notes: saasSubscriptions.notes,
        planId: saasPlans.id,
        planName: saasPlans.name,
        planSlug: saasPlans.slug,
        maxUsers: saasPlans.maxUsers,
        maxStorageGb: saasPlans.maxStorageGb,
        maxApiCallsMonthly: saasPlans.maxApiCallsMonthly,
        priceMonthly: saasPlans.priceMonthly,
      })
      .from(organizations)
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, organizations.id))
      .leftJoin(saasPlans, eq(saasPlans.id, saasSubscriptions.planId))
      .where(eq(organizations.id, parseInt(id)));
    if (!rows.length) { res.status(404).json({ success: false, error: "Tenant not found" }); return; }
    res.json({ success: true, data: rows[0] });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tenant" });
  }
});

router.post("/tenants", async (req: AuthRequest, res) => {
  try {
    const { name, legalName, industry, country, currency, planId, billingCycle, trialDays, notes } = req.body;
    // Create org
    const [org] = await db
      .insert(organizations)
      .values({ name, legalName, industry, country, currency: currency ?? "USD", status: "active" })
      .returning();

    // Determine plan
    const planIdNum = parseInt(planId);
    const [plan] = await db.select().from(saasPlans).where(eq(saasPlans.id, planIdNum));

    const trialEndsAt = trialDays ? new Date(Date.now() + parseInt(trialDays) * 86400000) : undefined;
    const status = trialDays ? "trial" : "active";

    const [sub] = await db
      .insert(saasSubscriptions)
      .values({
        orgId: org.id,
        planId: planIdNum,
        status,
        billingCycle: billingCycle ?? "monthly",
        trialEndsAt,
        mrr: billingCycle === "yearly"
          ? String(Number(plan?.priceYearly ?? 0) / 12)
          : String(plan?.priceMonthly ?? 0),
        notes,
      })
      .returning();

    res.status(201).json({ success: true, data: { org, sub } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create tenant" });
  }
});

router.put("/tenants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, legalName, industry, country, currency, planId, billingCycle, notes, currentUsers, currentStorageGb } = req.body;

    const [org] = await db
      .update(organizations)
      .set({ name, legalName, industry, country, currency, updatedAt: new Date() })
      .where(eq(organizations.id, parseInt(id)))
      .returning();

    if (!org) { res.status(404).json({ success: false, error: "Tenant not found" }); return; }

    // Update subscription if planId provided
    if (planId) {
      const planIdNum = parseInt(planId);
      const [plan] = await db.select().from(saasPlans).where(eq(saasPlans.id, planIdNum));
      const mrr = billingCycle === "yearly"
        ? String(Number(plan?.priceYearly ?? 0) / 12)
        : String(plan?.priceMonthly ?? 0);

      await db
        .update(saasSubscriptions)
        .set({ planId: planIdNum, billingCycle, notes, currentUsers, currentStorageGb, mrr, updatedAt: new Date() })
        .where(eq(saasSubscriptions.orgId, parseInt(id)));
    }

    res.json({ success: true, data: org });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update tenant" });
  }
});

router.patch("/tenants/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // active | suspended | cancelled | trial
    const orgStatus = status === "suspended" ? "suspended" : "active";
    const cancelledAt = status === "cancelled" ? new Date() : undefined;

    await db.update(organizations).set({ status: orgStatus, updatedAt: new Date() }).where(eq(organizations.id, parseInt(id)));
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (cancelledAt) updates.cancelledAt = cancelledAt;
    await db.update(saasSubscriptions).set(updates).where(eq(saasSubscriptions.orgId, parseInt(id)));

    res.json({ success: true, data: { status } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update tenant status" });
  }
});

// ── Subscriptions ────────────────────────────────────────────────────────────
router.get("/subscriptions", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: saasSubscriptions.id,
        orgId: saasSubscriptions.orgId,
        orgName: organizations.name,
        planId: saasSubscriptions.planId,
        planName: saasPlans.name,
        status: saasSubscriptions.status,
        billingCycle: saasSubscriptions.billingCycle,
        startedAt: saasSubscriptions.startedAt,
        expiresAt: saasSubscriptions.expiresAt,
        trialEndsAt: saasSubscriptions.trialEndsAt,
        currentUsers: saasSubscriptions.currentUsers,
        currentStorageGb: saasSubscriptions.currentStorageGb,
        currentApiCalls: saasSubscriptions.currentApiCalls,
        mrr: saasSubscriptions.mrr,
        notes: saasSubscriptions.notes,
        createdAt: saasSubscriptions.createdAt,
      })
      .from(saasSubscriptions)
      .leftJoin(organizations, eq(organizations.id, saasSubscriptions.orgId))
      .leftJoin(saasPlans, eq(saasPlans.id, saasSubscriptions.planId))
      .orderBy(desc(saasSubscriptions.createdAt));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions" });
  }
});

// ── White Label ──────────────────────────────────────────────────────────────

router.get("/whitelabel", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: saasWhitelabel.id,
        orgId: saasWhitelabel.orgId,
        orgName: organizations.name,
        isEnabled: saasWhitelabel.isEnabled,
        productName: saasWhitelabel.productName,
        logoUrl: saasWhitelabel.logoUrl,
        faviconUrl: saasWhitelabel.faviconUrl,
        primaryColor: saasWhitelabel.primaryColor,
        accentColor: saasWhitelabel.accentColor,
        customDomain: saasWhitelabel.customDomain,
        domainStatus: saasWhitelabel.domainStatus,
        supportEmail: saasWhitelabel.supportEmail,
        supportUrl: saasWhitelabel.supportUrl,
        loginHeadline: saasWhitelabel.loginHeadline,
        loginSubline: saasWhitelabel.loginSubline,
        loginBackgroundColor: saasWhitelabel.loginBackgroundColor,
        footerText: saasWhitelabel.footerText,
        hidePoweredBy: saasWhitelabel.hidePoweredBy,
        customCss: saasWhitelabel.customCss,
        emailSenderName: saasWhitelabel.emailSenderName,
        emailReplyTo: saasWhitelabel.emailReplyTo,
        navTheme: saasWhitelabel.navTheme,
        fontFamily: saasWhitelabel.fontFamily,
        notes: saasWhitelabel.notes,
        createdAt: saasWhitelabel.createdAt,
        updatedAt: saasWhitelabel.updatedAt,
      })
      .from(saasWhitelabel)
      .leftJoin(organizations, eq(organizations.id, saasWhitelabel.orgId))
      .orderBy(desc(saasWhitelabel.updatedAt));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch white label configs" });
  }
});

router.get("/whitelabel/:orgId", async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const rows = await db
      .select()
      .from(saasWhitelabel)
      .where(eq(saasWhitelabel.orgId, orgId));
    if (!rows.length) {
      res.status(404).json({ success: false, error: "No white label config found" });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch white label config" });
  }
});

router.post("/whitelabel", async (req, res) => {
  try {
    const {
      orgId, productName, logoUrl, faviconUrl, primaryColor, accentColor,
      customDomain, supportEmail, supportUrl, loginHeadline, loginSubline,
      loginBackgroundColor, footerText, hidePoweredBy, customCss,
      emailSenderName, emailReplyTo, navTheme, fontFamily, notes,
    } = req.body;
    const [config] = await db
      .insert(saasWhitelabel)
      .values({
        orgId: parseInt(orgId),
        productName: productName || "OmniERP",
        logoUrl, faviconUrl,
        primaryColor: primaryColor || "#2563EB",
        accentColor: accentColor || "#06B6D4",
        customDomain, supportEmail, supportUrl,
        loginHeadline, loginSubline,
        loginBackgroundColor: loginBackgroundColor || "#050816",
        footerText,
        hidePoweredBy: !!hidePoweredBy,
        customCss, emailSenderName, emailReplyTo,
        navTheme: navTheme || "dark",
        fontFamily: fontFamily || "Inter",
        notes,
      })
      .returning();
    res.status(201).json({ success: true, data: config });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create white label config" });
  }
});

router.put("/whitelabel/:orgId", async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const updates = { ...req.body, updatedAt: new Date() };
    if (updates.orgId) delete updates.orgId; // prevent changing orgId
    if (typeof updates.hidePoweredBy !== "undefined") {
      updates.hidePoweredBy = !!updates.hidePoweredBy;
    }
    const [config] = await db
      .update(saasWhitelabel)
      .set(updates)
      .where(eq(saasWhitelabel.orgId, orgId))
      .returning();
    if (!config) {
      res.status(404).json({ success: false, error: "Config not found" });
      return;
    }
    res.json({ success: true, data: config });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update white label config" });
  }
});

router.patch("/whitelabel/:orgId/domain-verify", async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    // Simulate DNS verification check (would be a real DNS lookup in production)
    const [existing] = await db
      .select()
      .from(saasWhitelabel)
      .where(eq(saasWhitelabel.orgId, orgId));
    if (!existing) {
      res.status(404).json({ success: false, error: "Config not found" });
      return;
    }
    if (!existing.customDomain) {
      res.status(400).json({ success: false, error: "No custom domain configured" });
      return;
    }
    // Transition: unverified -> verifying -> verified (cycle for demo purposes)
    const nextStatus =
      existing.domainStatus === "unverified" ? "verifying" :
      existing.domainStatus === "verifying" ? "verified" : "verifying";
    const [updated] = await db
      .update(saasWhitelabel)
      .set({ domainStatus: nextStatus, updatedAt: new Date() })
      .where(eq(saasWhitelabel.orgId, orgId))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to verify domain" });
  }
});

router.patch("/whitelabel/:orgId/toggle", async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const [existing] = await db
      .select({ isEnabled: saasWhitelabel.isEnabled })
      .from(saasWhitelabel)
      .where(eq(saasWhitelabel.orgId, orgId));
    if (!existing) {
      res.status(404).json({ success: false, error: "Config not found" });
      return;
    }
    const [updated] = await db
      .update(saasWhitelabel)
      .set({ isEnabled: !existing.isEnabled, updatedAt: new Date() })
      .where(eq(saasWhitelabel.orgId, orgId))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle white label" });
  }
});

router.delete("/whitelabel/:orgId", async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    await db.delete(saasWhitelabel).where(eq(saasWhitelabel.orgId, orgId));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete white label config" });
  }
});

export default router;
