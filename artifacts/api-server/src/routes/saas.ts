import { Router } from "express";
import { eq, desc, sql, and, lt, gte } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { saasPlans, saasSubscriptions, saasLicenses, saasWhitelabel, saasTrialEvents, saasTrialConfig, saasFeatures, saasPlanFeatures, saasTenantFeatures, organizations, saasAgencies, saasAgencyClients, saasAgencyPayouts } from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const SAAS_MODULE = "SaaS Platform";

// Feature and subscription administration is a super-admin capability. The
// access resolver remains available to authenticated tenant users so the app
// can build their allowed navigation.
router.use((req, res, next) => {
  if (req.path === "/features/access") { next(); return; }
  requirePermission(SAAS_MODULE, req.method === "GET" ? "view" : "edit")(req, res, next);
});

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
    await db.update(saasPlans).set({ isActive: false, updatedAt: new Date() }).where(eq(saasPlans.id, parseInt(req.params["id"] as string)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete plan" });
  }
});

// ── Feature Management ───────────────────────────────────────────────────────

router.get("/features", requirePermission(SAAS_MODULE, "view"), async (_req, res) => {
  try {
    const [features, plans, tenants, planAssignments, tenantOverrides] = await Promise.all([
      db.select().from(saasFeatures).orderBy(saasFeatures.sortOrder, saasFeatures.name),
      db.select({ id: saasPlans.id, name: saasPlans.name, slug: saasPlans.slug }).from(saasPlans).where(eq(saasPlans.isActive, true)).orderBy(saasPlans.sortOrder),
      db.select({ id: organizations.id, name: organizations.name, status: organizations.status }).from(organizations).orderBy(organizations.name),
      db.select().from(saasPlanFeatures),
      db.select().from(saasTenantFeatures),
    ]);
    res.json({ success: true, data: { features, plans, tenants, planAssignments, tenantOverrides } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch SaaS features" });
  }
});

router.post("/features", requirePermission(SAAS_MODULE, "edit"), async (req: AuthRequest, res) => {
  try {
    const { key, name, description, category, sortOrder } = req.body as Record<string, unknown>;
    if (typeof key !== "string" || !/^[a-z][a-z0-9_-]{1,99}$/.test(key)) {
      res.status(400).json({ success: false, error: "Feature key must use lowercase letters, numbers, hyphens, or underscores" }); return;
    }
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, error: "Feature name is required" }); return;
    }
    const [feature] = await db.insert(saasFeatures).values({
      key, name: name.trim(), description: typeof description === "string" ? description.trim() || null : null,
      category: typeof category === "string" && category.trim() ? category.trim() : "general",
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    }).returning();
    res.status(201).json({ success: true, data: feature });
  } catch (error: any) {
    if (error?.code === "23505") { res.status(409).json({ success: false, error: "Feature key already exists" }); return; }
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to create feature" });
  }
});

router.put("/features/:id", requirePermission(SAAS_MODULE, "edit"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, category, sortOrder, isActive } = req.body as Record<string, unknown>;
    if (!Number.isInteger(id) || typeof name !== "string" || !name.trim()) { res.status(400).json({ success: false, error: "Valid id and feature name are required" }); return; }
    const [feature] = await db.update(saasFeatures).set({
      name: name.trim(), description: typeof description === "string" ? description.trim() || null : null,
      category: typeof category === "string" && category.trim() ? category.trim() : "general",
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      isActive: typeof isActive === "boolean" ? isActive : true,
      updatedAt: new Date(),
    }).where(eq(saasFeatures.id, id)).returning();
    if (!feature) { res.status(404).json({ success: false, error: "Feature not found" }); return; }
    res.json({ success: true, data: feature });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update feature" });
  }
});

router.patch("/features/:id/toggle", requirePermission(SAAS_MODULE, "edit"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [feature] = await db.select({ isActive: saasFeatures.isActive }).from(saasFeatures).where(eq(saasFeatures.id, id)).limit(1);
    if (!feature) { res.status(404).json({ success: false, error: "Feature not found" }); return; }
    const [updated] = await db.update(saasFeatures).set({ isActive: !feature.isActive, updatedAt: new Date() }).where(eq(saasFeatures.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to toggle feature" });
  }
});

router.put("/features/:featureId/plans/:planId", requirePermission(SAAS_MODULE, "edit"), async (req, res) => {
  try {
    const featureId = Number(req.params.featureId);
    const planId = Number(req.params.planId);
    if (!Number.isInteger(featureId) || !Number.isInteger(planId) || typeof req.body.enabled !== "boolean") { res.status(400).json({ success: false, error: "featureId, planId, and enabled are required" }); return; }
    const [assignment] = await db.insert(saasPlanFeatures).values({ featureId, planId, enabled: req.body.enabled }).onConflictDoUpdate({
      target: [saasPlanFeatures.planId, saasPlanFeatures.featureId], set: { enabled: req.body.enabled, updatedAt: new Date() },
    }).returning();
    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update plan feature" });
  }
});

router.put("/features/:featureId/tenants/:orgId", requirePermission(SAAS_MODULE, "edit"), async (req, res) => {
  try {
    const featureId = Number(req.params.featureId);
    const orgId = Number(req.params.orgId);
    if (!Number.isInteger(featureId) || !Number.isInteger(orgId) || typeof req.body.enabled !== "boolean") { res.status(400).json({ success: false, error: "featureId, orgId, and enabled are required" }); return; }
    const [override] = await db.insert(saasTenantFeatures).values({ featureId, orgId, enabled: req.body.enabled }).onConflictDoUpdate({
      target: [saasTenantFeatures.orgId, saasTenantFeatures.featureId], set: { enabled: req.body.enabled, updatedAt: new Date() },
    }).returning();
    res.json({ success: true, data: override });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update tenant feature" });
  }
});

router.delete("/features/:featureId/tenants/:orgId", requirePermission(SAAS_MODULE, "edit"), async (req, res) => {
  try {
    await db.delete(saasTenantFeatures).where(and(eq(saasTenantFeatures.featureId, Number(req.params.featureId)), eq(saasTenantFeatures.orgId, Number(req.params.orgId))));
    res.json({ success: true, data: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to clear tenant feature override" });
  }
});

router.get("/features/access", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) { res.json({ success: true, data: {} }); return; }
    const rows = await db.execute(sql`
      SELECT f.key,
        f.is_active,
        COALESCE(tf.enabled, pf.enabled, NULL) AS enabled
      FROM saas_features f
      LEFT JOIN saas_tenant_features tf ON tf.feature_id = f.id AND tf.org_id = ${orgId}
      LEFT JOIN LATERAL (
        SELECT plan_id
        FROM saas_subscriptions
        WHERE org_id = ${orgId}
          AND status IN ('active', 'trial')
          AND (expires_at IS NULL OR expires_at > now())
          AND (status <> 'trial' OR trial_ends_at IS NULL OR trial_ends_at > now())
        ORDER BY started_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN saas_plan_features pf ON pf.feature_id = f.id AND pf.plan_id = s.plan_id
      ORDER BY f.sort_order, f.name
    `);
    const access = Object.fromEntries(((rows as any).rows ?? rows).map((row: any) => [row.key, Boolean(row.is_active && row.enabled !== false)]));
    res.json({ success: true, data: access });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to resolve feature access" });
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

// GET /saas/tenants/:id/dashboard — comprehensive single-tenant dashboard data
router.get("/tenants/:id/dashboard", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);

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
        maxModules: saasPlans.maxModules,
        maxApiCallsMonthly: saasPlans.maxApiCallsMonthly,
        priceMonthly: saasPlans.priceMonthly,
        priceYearly: saasPlans.priceYearly,
        features: saasPlans.features,
      })
      .from(organizations)
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, organizations.id))
      .leftJoin(saasPlans, eq(saasPlans.id, saasSubscriptions.planId))
      .where(eq(organizations.id, id));

    if (!rows.length) {
      res.status(404).json({ success: false, error: "Tenant not found" });
      return;
    }

    const t = rows[0];

    // Recent trial/subscription events (last 10)
    let recentEvents: Array<{
      id: number; subscriptionId: number; eventType: string;
      daysAdded: number | null; note: string | null;
      createdBy: string | null; createdAt: Date;
    }> = [];
    if (t.subId) {
      recentEvents = await db
        .select()
        .from(saasTrialEvents)
        .where(eq(saasTrialEvents.subscriptionId, t.subId))
        .orderBy(desc(saasTrialEvents.createdAt))
        .limit(10);
    }

    // White label config for this org
    const wlRows = await db
      .select()
      .from(saasWhitelabel)
      .where(eq(saasWhitelabel.orgId, id));
    const whitelabel = wlRows[0] ?? null;

    // Computed metrics
    const now = Date.now();
    const daysToRenewal = t.expiresAt
      ? Math.max(0, Math.ceil((new Date(t.expiresAt).getTime() - now) / 86400000))
      : null;
    const daysInTrial = t.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(t.trialEndsAt).getTime() - now) / 86400000))
      : null;
    const usersPct = t.maxUsers && t.maxUsers > 0 && t.currentUsers
      ? Math.min(Math.round((t.currentUsers / t.maxUsers) * 100), 100) : 0;
    const storagePct = t.maxStorageGb && t.maxStorageGb > 0 && t.currentStorageGb
      ? Math.min(Math.round((Number(t.currentStorageGb) / t.maxStorageGb) * 100), 100) : 0;
    const apiPct = t.maxApiCallsMonthly && t.maxApiCallsMonthly > 0 && t.currentApiCalls
      ? Math.min(Math.round((t.currentApiCalls / t.maxApiCallsMonthly) * 100), 100) : 0;

    res.json({
      success: true,
      data: {
        ...t,
        features: (t.features as string[]) ?? [],
        recentEvents,
        whitelabel,
        daysToRenewal,
        daysInTrial,
        usersPct,
        storagePct,
        apiPct,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch tenant dashboard" });
  }
});

router.post("/tenants", async (req: AuthRequest, res) => {
  try {
    const { name, legalName, industry, country, currency, planId, billingCycle, trialDays, notes } = req.body;
    // Create org
    const [org] = await db
      .insert(organizations)
      .values({ name, legalName, industry, country, currency: currency ?? "INR", status: "active" })
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

// ── License Management ─────────────────────────────────────────────────────
function createLicenseKey() {
  const segments = Array.from({ length: 4 }, () =>
    randomBytes(3).toString("hex").toUpperCase(),
  );
  return `OMNI-${segments.join("-")}`;
}

router.get("/licenses/metrics", async (_req, res) => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(saasLicenses);
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(saasLicenses).where(eq(saasLicenses.status, "active"));
    const [expiring] = await db.select({ count: sql<number>`count(*)::int` }).from(saasLicenses).where(
      and(eq(saasLicenses.status, "active"), gte(saasLicenses.expiresAt, new Date()), lt(saasLicenses.expiresAt, new Date(Date.now() + 30 * 86400000))),
    );
    const [seats] = await db.select({
      assigned: sql<number>`coalesce(sum(${saasLicenses.usedSeats}), 0)::int`,
      capacity: sql<number>`coalesce(sum(${saasLicenses.maxSeats}), 0)::int`,
    }).from(saasLicenses).where(eq(saasLicenses.status, "active"));
    res.json({ success: true, data: {
      total: total?.count ?? 0,
      active: active?.count ?? 0,
      expiring: expiring?.count ?? 0,
      revoked: (total?.count ?? 0) - (active?.count ?? 0),
      assignedSeats: seats?.assigned ?? 0,
      seatCapacity: seats?.capacity ?? 0,
    }});
  } catch (e) {
    _req.log.error(e, "Failed to fetch license metrics");
    res.status(500).json({ success: false, error: "Failed to fetch license metrics" });
  }
});

router.get("/licenses", async (_req, res) => {
  try {
    const data = await db.select({
      id: saasLicenses.id,
      licenseKey: saasLicenses.licenseKey,
      orgId: saasLicenses.orgId,
      orgName: organizations.name,
      planId: saasLicenses.planId,
      planName: saasPlans.name,
      planSlug: saasPlans.slug,
      licenseType: saasLicenses.licenseType,
      status: saasLicenses.status,
      issuedAt: saasLicenses.issuedAt,
      expiresAt: saasLicenses.expiresAt,
      maxSeats: saasLicenses.maxSeats,
      usedSeats: saasLicenses.usedSeats,
      activationLimit: saasLicenses.activationLimit,
      activationCount: saasLicenses.activationCount,
      lastActivatedAt: saasLicenses.lastActivatedAt,
      features: saasLicenses.features,
      notes: saasLicenses.notes,
      createdAt: saasLicenses.createdAt,
      updatedAt: saasLicenses.updatedAt,
    }).from(saasLicenses)
      .leftJoin(organizations, eq(organizations.id, saasLicenses.orgId))
      .leftJoin(saasPlans, eq(saasPlans.id, saasLicenses.planId))
      .orderBy(desc(saasLicenses.createdAt));
    res.json({ success: true, data });
  } catch (e) {
    _req.log.error(e, "Failed to fetch licenses");
    res.status(500).json({ success: false, error: "Failed to fetch licenses" });
  }
});

router.post("/licenses", async (req, res) => {
  try {
    const {
      orgId, planId, licenseType, expiresAt, durationDays,
      maxSeats, activationLimit, features, notes,
    } = req.body;
    const orgIdNum = Number(orgId);
    const planIdNum = Number(planId);
    if (!Number.isInteger(orgIdNum) || !Number.isInteger(planIdNum)) {
      res.status(400).json({ success: false, error: "A valid organization and plan are required" });
      return;
    }
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgIdNum));
    const [plan] = await db.select({ id: saasPlans.id }).from(saasPlans).where(eq(saasPlans.id, planIdNum));
    if (!org || !plan) {
      res.status(400).json({ success: false, error: "Organization or plan not found" });
      return;
    }
    let expiry: Date | null = expiresAt ? new Date(expiresAt) : null;
    if (durationDays && Number(durationDays) > 0) expiry = new Date(Date.now() + Number(durationDays) * 86400000);
    const [license] = await db.insert(saasLicenses).values({
      licenseKey: createLicenseKey(),
      orgId: orgIdNum,
      planId: planIdNum,
      licenseType: licenseType || "subscription",
      expiresAt: expiry,
      maxSeats: Math.max(1, Number(maxSeats) || 1),
      activationLimit: Math.max(1, Number(activationLimit) || 1),
      features: Array.isArray(features) ? features : [],
      notes: notes || null,
    }).returning();
    res.status(201).json({ success: true, data: license });
  } catch (e: any) {
    req.log.error(e, "Failed to create license");
    res.status(500).json({ success: false, error: "Failed to create license" });
  }
});

router.patch("/licenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { planId, licenseType, status, expiresAt, maxSeats, activationLimit, features, notes } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (planId !== undefined) updates.planId = Number(planId);
    if (licenseType !== undefined) updates.licenseType = licenseType;
    if (status !== undefined) updates.status = status;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxSeats !== undefined) updates.maxSeats = Math.max(1, Number(maxSeats) || 1);
    if (activationLimit !== undefined) updates.activationLimit = Math.max(1, Number(activationLimit) || 1);
    if (features !== undefined) updates.features = Array.isArray(features) ? features : [];
    if (notes !== undefined) updates.notes = notes || null;
    const [license] = await db.update(saasLicenses).set(updates).where(eq(saasLicenses.id, id)).returning();
    if (!license) { res.status(404).json({ success: false, error: "License not found" }); return; }
    res.json({ success: true, data: license });
  } catch (e) {
    req.log.error(e, "Failed to update license");
    res.status(500).json({ success: false, error: "Failed to update license" });
  }
});

router.post("/licenses/:id/renew", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const days = Math.max(1, Number(req.body.days) || 30);
    const [current] = await db.select().from(saasLicenses).where(eq(saasLicenses.id, id));
    if (!current) { res.status(404).json({ success: false, error: "License not found" }); return; }
    const base = current.expiresAt && new Date(current.expiresAt).getTime() > Date.now()
      ? new Date(current.expiresAt) : new Date();
    const expiresAt = new Date(base.getTime() + days * 86400000);
    const [license] = await db.update(saasLicenses)
      .set({ expiresAt, status: "active", updatedAt: new Date() })
      .where(eq(saasLicenses.id, id)).returning();
    res.json({ success: true, data: license });
  } catch (e) {
    req.log.error(e, "Failed to renew license");
    res.status(500).json({ success: false, error: "Failed to renew license" });
  }
});

router.patch("/licenses/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");
    if (!["active", "suspended", "revoked", "expired"].includes(status)) {
      res.status(400).json({ success: false, error: "Invalid license status" });
      return;
    }
    const [license] = await db.update(saasLicenses)
      .set({ status, updatedAt: new Date() })
      .where(eq(saasLicenses.id, id)).returning();
    if (!license) { res.status(404).json({ success: false, error: "License not found" }); return; }
    res.json({ success: true, data: license });
  } catch (e) {
    req.log.error(e, "Failed to update license status");
    res.status(500).json({ success: false, error: "Failed to update license status" });
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
    const orgId = parseInt(req.params["orgId"] as string);
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
    const orgId = parseInt(req.params["orgId"] as string);
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
    const orgId = parseInt(req.params["orgId"] as string);
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
    const orgId = parseInt(req.params["orgId"] as string);
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
    const orgId = parseInt(req.params["orgId"] as string);
    await db.delete(saasWhitelabel).where(eq(saasWhitelabel.orgId, orgId));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete white label config" });
  }
});

// ── Trial Management ─────────────────────────────────────────────────────────

// GET /saas/trials — all trial subscriptions with metadata
router.get("/trials", async (_req, res) => {
  try {
    const rows = await db
      .select({
        subId: saasSubscriptions.id,
        orgId: organizations.id,
        orgName: organizations.name,
        industry: organizations.industry,
        country: organizations.country,
        planId: saasPlans.id,
        planName: saasPlans.name,
        planSlug: saasPlans.slug,
        priceMonthly: saasPlans.priceMonthly,
        billingCycle: saasSubscriptions.billingCycle,
        startedAt: saasSubscriptions.startedAt,
        trialEndsAt: saasSubscriptions.trialEndsAt,
        status: saasSubscriptions.status,
        currentUsers: saasSubscriptions.currentUsers,
        notes: saasSubscriptions.notes,
        createdAt: saasSubscriptions.createdAt,
      })
      .from(saasSubscriptions)
      .leftJoin(organizations, eq(organizations.id, saasSubscriptions.orgId))
      .leftJoin(saasPlans, eq(saasPlans.id, saasSubscriptions.planId))
      .where(eq(saasSubscriptions.status, "trial"))
      .orderBy(saasSubscriptions.trialEndsAt);

    // Attach event counts and last event per sub
    const subIds = rows.map((r) => r.subId);
    let eventData: {
      subscriptionId: number;
      eventCount: number;
      extensionCount: number;
      lastEvent: string | null;
    }[] = [];

    if (subIds.length > 0) {
      eventData = await Promise.all(
        subIds.map(async (sid) => {
          const events = await db
            .select()
            .from(saasTrialEvents)
            .where(eq(saasTrialEvents.subscriptionId, sid))
            .orderBy(desc(saasTrialEvents.createdAt));
          return {
            subscriptionId: sid,
            eventCount: events.length,
            extensionCount: events.filter((e) => e.eventType === "extended").length,
            lastEvent: events[0]?.eventType ?? null,
          };
        })
      );
    }

    const eventMap = Object.fromEntries(eventData.map((e) => [e.subscriptionId, e]));
    const enriched = rows.map((r) => ({
      ...r,
      ...(eventMap[r.subId] ?? { eventCount: 0, extensionCount: 0, lastEvent: null }),
      daysRemaining: r.trialEndsAt
        ? Math.ceil((new Date(r.trialEndsAt).getTime() - Date.now()) / 86400000)
        : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch trials" });
  }
});

// GET /saas/trials/stats — aggregated conversion metrics
router.get("/trials/stats", async (_req, res) => {
  try {
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "trial"));

    const [expiringCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.status, "trial"),
          lt(saasSubscriptions.trialEndsAt, new Date(Date.now() + 7 * 86400000))
        )
      );

    // Historical conversion: converted events / (converted + cancelled + expired)
    const convertedEvents = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasTrialEvents)
      .where(eq(saasTrialEvents.eventType, "converted"));

    const endedEvents = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasTrialEvents)
      .where(
        sql`${saasTrialEvents.eventType} IN ('converted','cancelled','expired')`
      );

    const converted = convertedEvents[0]?.count ?? 0;
    const ended = endedEvents[0]?.count ?? 0;
    const conversionRate = ended > 0 ? Math.round((converted / ended) * 100) : 0;

    // Average trial duration (days from startedAt to trialEndsAt for active trials)
    const [avgDuration] = await db
      .select({
        avg: sql<number>`avg(extract(day from trial_ends_at - started_at))::int`,
      })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.status, "trial"));

    res.json({
      success: true,
      data: {
        activeTrials: activeCount?.count ?? 0,
        expiringIn7Days: expiringCount?.count ?? 0,
        conversionRate,
        avgTrialDays: avgDuration?.avg ?? 14,
        totalConverted: converted,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch trial stats" });
  }
});

// GET /saas/trials/:subId/events — event log for a trial
router.get("/trials/:subId/events", async (req, res) => {
  try {
    const subId = parseInt(req.params["subId"] as string);
    const events = await db
      .select()
      .from(saasTrialEvents)
      .where(eq(saasTrialEvents.subscriptionId, subId))
      .orderBy(desc(saasTrialEvents.createdAt));
    res.json({ success: true, data: events });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch trial events" });
  }
});

// POST /saas/trials/:subId/extend — extend a trial
router.post("/trials/:subId/extend", async (req: AuthRequest, res) => {
  try {
    const subId = parseInt(req.params["subId"] as string);
    const { days, note } = req.body;
    const daysNum = parseInt(days) || 7;

    const [sub] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.id, subId));
    if (!sub) { res.status(404).json({ success: false, error: "Subscription not found" }); return; }
    if (sub.status !== "trial") { res.status(400).json({ success: false, error: "Subscription is not in trial" }); return; }

    const currentEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt) : new Date();
    const newEnd = new Date(currentEnd.getTime() + daysNum * 86400000);

    const [updated] = await db
      .update(saasSubscriptions)
      .set({ trialEndsAt: newEnd, updatedAt: new Date() })
      .where(eq(saasSubscriptions.id, subId))
      .returning();

    await db.insert(saasTrialEvents).values({
      subscriptionId: subId,
      eventType: "extended",
      daysAdded: daysNum,
      note: note || `Extended by ${daysNum} days`,
      createdBy: req.user?.email ?? "system",
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to extend trial" });
  }
});

// POST /saas/trials/:subId/convert — convert trial to paid
router.post("/trials/:subId/convert", async (req: AuthRequest, res) => {
  try {
    const subId = parseInt(req.params["subId"] as string);
    const { billingCycle, planId, note } = req.body;

    const [sub] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.id, subId));
    if (!sub) { res.status(404).json({ success: false, error: "Subscription not found" }); return; }

    const targetPlanId = planId ? parseInt(planId) : sub.planId;
    const [plan] = await db.select().from(saasPlans).where(eq(saasPlans.id, targetPlanId));

    const cycle = billingCycle ?? sub.billingCycle ?? "monthly";
    const mrr = cycle === "yearly"
      ? String(Number(plan?.priceYearly ?? 0) / 12)
      : String(plan?.priceMonthly ?? 0);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (cycle === "yearly" ? 12 : 1));

    await db
      .update(organizations)
      .set({ status: "active", updatedAt: now })
      .where(eq(organizations.id, sub.orgId));

    const [updated] = await db
      .update(saasSubscriptions)
      .set({
        status: "active",
        planId: targetPlanId,
        billingCycle: cycle,
        mrr,
        trialEndsAt: null,
        startedAt: now,
        expiresAt: periodEnd,
        updatedAt: now,
      })
      .where(eq(saasSubscriptions.id, subId))
      .returning();

    await db.insert(saasTrialEvents).values({
      subscriptionId: subId,
      eventType: "converted",
      note: note || `Converted to ${cycle} ${plan?.name ?? "plan"}`,
      createdBy: req.user?.email ?? "system",
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to convert trial" });
  }
});

// POST /saas/trials/:subId/cancel — cancel a trial
router.post("/trials/:subId/cancel", async (req: AuthRequest, res) => {
  try {
    const subId = parseInt(req.params["subId"] as string);
    const { note } = req.body;

    const [sub] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.id, subId));
    if (!sub) { res.status(404).json({ success: false, error: "Subscription not found" }); return; }

    const now = new Date();
    await db
      .update(saasSubscriptions)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
      .where(eq(saasSubscriptions.id, subId));

    await db
      .update(organizations)
      .set({ status: "suspended", updatedAt: now })
      .where(eq(organizations.id, sub.orgId));

    await db.insert(saasTrialEvents).values({
      subscriptionId: subId,
      eventType: "cancelled",
      note: note || "Trial cancelled",
      createdBy: req.user?.email ?? "system",
    });

    res.json({ success: true, data: { status: "cancelled" } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to cancel trial" });
  }
});

// POST /saas/trials/:subId/reminder — log a reminder
router.post("/trials/:subId/reminder", async (req: AuthRequest, res) => {
  try {
    const subId = parseInt(req.params["subId"] as string);
    const { note } = req.body;

    const [sub] = await db
      .select({ id: saasSubscriptions.id })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.id, subId));
    if (!sub) { res.status(404).json({ success: false, error: "Subscription not found" }); return; }

    await db.insert(saasTrialEvents).values({
      subscriptionId: subId,
      eventType: "reminder_sent",
      note: note || "Manual reminder sent",
      createdBy: req.user?.email ?? "system",
    });

    res.json({ success: true, data: { sent: true } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to log reminder" });
  }
});

// GET /saas/trial-config
router.get("/trial-config", async (_req, res) => {
  try {
    const [config] = await db.select().from(saasTrialConfig).orderBy(saasTrialConfig.id).limit(1);
    res.json({ success: true, data: config ?? null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch trial config" });
  }
});

// PUT /saas/trial-config
router.put("/trial-config", async (_req, res) => {
  try {
    const { defaultTrialDays, maxExtensions, autoExpireAction, reminderDaysBefore, requireCreditCard } = _req.body;
    const now = new Date();

    const [existing] = await db.select({ id: saasTrialConfig.id }).from(saasTrialConfig).limit(1);
    let config;
    if (existing) {
      [config] = await db
        .update(saasTrialConfig)
        .set({
          defaultTrialDays: parseInt(defaultTrialDays) || 14,
          maxExtensions: parseInt(maxExtensions) || 2,
          autoExpireAction: autoExpireAction || "suspend",
          reminderDaysBefore: reminderDaysBefore ?? [7, 3, 1],
          requireCreditCard: !!requireCreditCard,
          updatedAt: now,
        })
        .where(eq(saasTrialConfig.id, existing.id))
        .returning();
    } else {
      [config] = await db
        .insert(saasTrialConfig)
        .values({
          defaultTrialDays: parseInt(defaultTrialDays) || 14,
          maxExtensions: parseInt(maxExtensions) || 2,
          autoExpireAction: autoExpireAction || "suspend",
          reminderDaysBefore: reminderDaysBefore ?? [7, 3, 1],
          requireCreditCard: !!requireCreditCard,
        })
        .returning();
    }
    res.json({ success: true, data: config });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update trial config" });
  }
});

// ── Agency Panel ─────────────────────────────────────────────────────────────

// GET /saas/agency-metrics — overall platform-wide agency stats
router.get("/agency-metrics", async (_req, res) => {
  try {
    const [totalAgencies] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasAgencies);

    const [activeAgencies] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasAgencies)
      .where(eq(saasAgencies.status, "active"));

    const [totalClients] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasAgencyClients);

    // Total MRR managed by all agencies (sum MRR of subscribed orgs that belong to any agency)
    const [managedMrr] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${saasSubscriptions.mrr} as numeric)), 0)` })
      .from(saasAgencyClients)
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, saasAgencyClients.orgId))
      .where(eq(saasSubscriptions.status, "active"));

    // Total commissions paid + pending
    const [totalCommissions] = await db
      .select({ total: sql<number>`coalesce(sum(commission_amount::numeric), 0)::numeric` })
      .from(saasAgencyPayouts);

    const [pendingCommissions] = await db
      .select({ total: sql<number>`coalesce(sum(commission_amount::numeric), 0)::numeric` })
      .from(saasAgencyPayouts)
      .where(eq(saasAgencyPayouts.status, "pending"));

    res.json({
      success: true,
      data: {
        totalAgencies: totalAgencies?.count ?? 0,
        activeAgencies: activeAgencies?.count ?? 0,
        totalClients: totalClients?.count ?? 0,
        managedMrr: Number(managedMrr?.total ?? 0),
        totalCommissions: Number(totalCommissions?.total ?? 0),
        pendingCommissions: Number(pendingCommissions?.total ?? 0),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch agency metrics" });
  }
});

// GET /saas/agencies — list all agencies with client count + MRR
router.get("/agencies", async (_req, res) => {
  try {
    const agencies = await db.select().from(saasAgencies).orderBy(desc(saasAgencies.createdAt));

    // Enrich each agency with client count and managed MRR
    const enriched = await Promise.all(
      agencies.map(async (ag) => {
        const [clientCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(saasAgencyClients)
          .where(eq(saasAgencyClients.agencyId, ag.id));

        const [mrrResult] = await db
          .select({ total: sql<number>`coalesce(sum(cast(${saasSubscriptions.mrr} as numeric)), 0)` })
          .from(saasAgencyClients)
          .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, saasAgencyClients.orgId))
          .where(
            and(
              eq(saasAgencyClients.agencyId, ag.id),
              eq(saasSubscriptions.status, "active")
            )
          );

        const [payoutResult] = await db
          .select({ total: sql<number>`coalesce(sum(cast(${saasAgencyPayouts.commissionAmount} as numeric)), 0)` })
          .from(saasAgencyPayouts)
          .where(eq(saasAgencyPayouts.agencyId, ag.id));

        const [pendingResult] = await db
          .select({ total: sql<number>`coalesce(sum(cast(${saasAgencyPayouts.commissionAmount} as numeric)), 0)` })
          .from(saasAgencyPayouts)
          .where(
            and(eq(saasAgencyPayouts.agencyId, ag.id), eq(saasAgencyPayouts.status, "pending"))
          );

        const mrr = Number(mrrResult?.total ?? 0);
        const commissionRate = Number(ag.commissionRate ?? 10);
        const totalEarned = Number(payoutResult?.total ?? 0);
        const pendingPayout = Number(pendingResult?.total ?? 0);

        return {
          ...ag,
          clientCount: clientCount?.count ?? 0,
          managedMrr: mrr,
          estimatedMonthlyCommission: (mrr * commissionRate) / 100,
          totalEarned,
          pendingPayout,
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch agencies" });
  }
});

// POST /saas/agencies — create agency
router.post("/agencies", async (req, res) => {
  try {
    const { name, slug, contactName, contactEmail, contactPhone, country, website, commissionRate, notes } = req.body;
    if (!name || !slug) {
      res.status(400).json({ success: false, error: "name and slug are required" });
      return;
    }
    const [agency] = await db
      .insert(saasAgencies)
      .values({ name, slug, contactName, contactEmail, contactPhone, country, website, commissionRate: String(commissionRate ?? 10), notes })
      .returning();
    res.status(201).json({ success: true, data: agency });
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ success: false, error: "Slug already taken" });
      return;
    }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create agency" });
  }
});

// GET /saas/agencies/:id — single agency detail
router.get("/agencies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [agency] = await db.select().from(saasAgencies).where(eq(saasAgencies.id, id));
    if (!agency) { res.status(404).json({ success: false, error: "Agency not found" }); return; }

    const [clientCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(saasAgencyClients)
      .where(eq(saasAgencyClients.agencyId, id));

    const [mrrResult] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${saasSubscriptions.mrr} as numeric)), 0)` })
      .from(saasAgencyClients)
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, saasAgencyClients.orgId))
      .where(and(eq(saasAgencyClients.agencyId, id), eq(saasSubscriptions.status, "active")));

    res.json({
      success: true,
      data: {
        ...agency,
        clientCount: clientCount?.count ?? 0,
        managedMrr: Number(mrrResult?.total ?? 0),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch agency" });
  }
});

// PUT /saas/agencies/:id — update agency
router.put("/agencies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, slug, contactName, contactEmail, contactPhone, country, website, commissionRate, notes } = req.body;
    const [agency] = await db
      .update(saasAgencies)
      .set({ name, slug, contactName, contactEmail, contactPhone, country, website, commissionRate: String(commissionRate ?? 10), notes, updatedAt: new Date() })
      .where(eq(saasAgencies.id, id))
      .returning();
    if (!agency) { res.status(404).json({ success: false, error: "Agency not found" }); return; }
    res.json({ success: true, data: agency });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ success: false, error: "Slug already taken" }); return; }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update agency" });
  }
});

// PATCH /saas/agencies/:id/status — change agency status
router.patch("/agencies/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    const [agency] = await db
      .update(saasAgencies)
      .set({ status, updatedAt: new Date() })
      .where(eq(saasAgencies.id, id))
      .returning();
    if (!agency) { res.status(404).json({ success: false, error: "Agency not found" }); return; }
    res.json({ success: true, data: agency });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update agency status" });
  }
});

// DELETE /saas/agencies/:id — deactivate agency
router.delete("/agencies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.update(saasAgencies).set({ status: "inactive", updatedAt: new Date() }).where(eq(saasAgencies.id, id));
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to deactivate agency" });
  }
});

// GET /saas/agencies/:id/clients — list clients for an agency
router.get("/agencies/:id/clients", async (req, res) => {
  try {
    const agencyId = parseInt(req.params["id"] as string);
    const rows = await db
      .select({
        id: saasAgencyClients.id,
        agencyId: saasAgencyClients.agencyId,
        orgId: saasAgencyClients.orgId,
        assignedAt: saasAgencyClients.assignedAt,
        notes: saasAgencyClients.notes,
        orgName: organizations.name,
        orgIndustry: organizations.industry,
        orgCountry: organizations.country,
        orgStatus: organizations.status,
        subId: saasSubscriptions.id,
        subStatus: saasSubscriptions.status,
        planName: saasPlans.name,
        planSlug: saasPlans.slug,
        mrr: saasSubscriptions.mrr,
        billingCycle: saasSubscriptions.billingCycle,
        currentUsers: saasSubscriptions.currentUsers,
      })
      .from(saasAgencyClients)
      .leftJoin(organizations, eq(organizations.id, saasAgencyClients.orgId))
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, saasAgencyClients.orgId))
      .leftJoin(saasPlans, eq(saasPlans.id, saasSubscriptions.planId))
      .where(eq(saasAgencyClients.agencyId, agencyId))
      .orderBy(desc(saasAgencyClients.assignedAt));
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch agency clients" });
  }
});

// POST /saas/agencies/:id/clients — assign a tenant to agency
router.post("/agencies/:id/clients", async (req, res) => {
  try {
    const agencyId = parseInt(req.params["id"] as string);
    const { orgId, notes } = req.body;
    if (!orgId) { res.status(400).json({ success: false, error: "orgId is required" }); return; }
    const [row] = await db
      .insert(saasAgencyClients)
      .values({ agencyId, orgId: parseInt(orgId), notes })
      .returning();
    res.status(201).json({ success: true, data: row });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ success: false, error: "Tenant already assigned to this agency" }); return; }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to assign client" });
  }
});

// DELETE /saas/agencies/:id/clients/:orgId — remove client from agency
router.delete("/agencies/:id/clients/:orgId", async (req, res) => {
  try {
    const agencyId = parseInt(req.params["id"] as string);
    const orgId = parseInt(req.params["orgId"] as string);
    await db
      .delete(saasAgencyClients)
      .where(and(eq(saasAgencyClients.agencyId, agencyId), eq(saasAgencyClients.orgId, orgId)));
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to remove client" });
  }
});

// GET /saas/agencies/:id/payouts — payout history
router.get("/agencies/:id/payouts", async (req, res) => {
  try {
    const agencyId = parseInt(req.params["id"] as string);
    const rows = await db
      .select()
      .from(saasAgencyPayouts)
      .where(eq(saasAgencyPayouts.agencyId, agencyId))
      .orderBy(desc(saasAgencyPayouts.period));
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch payouts" });
  }
});

// POST /saas/agencies/:id/payouts — create payout record
router.post("/agencies/:id/payouts", async (req, res) => {
  try {
    const agencyId = parseInt(req.params["id"] as string);
    const { period, totalMrr, commissionAmount, status, notes } = req.body;
    if (!period) { res.status(400).json({ success: false, error: "period is required" }); return; }
    const [row] = await db
      .insert(saasAgencyPayouts)
      .values({ agencyId, period, totalMrr: String(totalMrr ?? 0), commissionAmount: String(commissionAmount ?? 0), status: status ?? "pending", notes })
      .returning();
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create payout" });
  }
});

// PATCH /saas/agencies/:id/payouts/:payoutId — update payout status
router.patch("/agencies/:id/payouts/:payoutId", async (req, res) => {
  try {
    const payoutId = parseInt(req.params.payoutId);
    const { status, notes } = req.body;
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (notes !== undefined) updates.notes = notes;
    if (status === "paid") updates.paidAt = new Date();
    const [row] = await db
      .update(saasAgencyPayouts)
      .set(updates)
      .where(eq(saasAgencyPayouts.id, payoutId))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Payout not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update payout" });
  }
});

// POST /saas/agencies/:id/payouts/generate — auto-generate payout from live client MRR
router.post("/agencies/:id/payouts/generate", async (req: AuthRequest, res) => {
  try {
    const agencyId = parseInt(req.params["id"] as string);
    const { period, notes } = req.body;

    const now = new Date();
    const defaultPeriod = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Guard: no duplicate payout for same period
    const [existing] = await db
      .select({ id: saasAgencyPayouts.id })
      .from(saasAgencyPayouts)
      .where(and(eq(saasAgencyPayouts.agencyId, agencyId), eq(saasAgencyPayouts.period, defaultPeriod)));
    if (existing) {
      res.status(409).json({ success: false, error: `A payout for ${defaultPeriod} already exists` });
      return;
    }

    const [agency] = await db.select().from(saasAgencies).where(eq(saasAgencies.id, agencyId));
    if (!agency) { res.status(404).json({ success: false, error: "Agency not found" }); return; }

    // Sum MRR from active subscriptions linked to this agency's clients
    const [mrrResult] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${saasSubscriptions.mrr} as numeric)), 0)` })
      .from(saasAgencyClients)
      .leftJoin(saasSubscriptions, eq(saasSubscriptions.orgId, saasAgencyClients.orgId))
      .where(and(eq(saasAgencyClients.agencyId, agencyId), eq(saasSubscriptions.status, "active")));

    const totalMrr = Number(mrrResult?.total ?? 0);
    const commissionRate = Number(agency.commissionRate ?? 10);
    const commissionAmount = (totalMrr * commissionRate) / 100;

    const [row] = await db
      .insert(saasAgencyPayouts)
      .values({
        agencyId,
        period: defaultPeriod,
        totalMrr: String(totalMrr.toFixed(2)),
        commissionAmount: String(commissionAmount.toFixed(2)),
        status: "pending",
        notes: notes || `Auto-generated for ${defaultPeriod}`,
      })
      .returning();

    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to generate payout" });
  }
});

// GET /saas/payouts — all payouts across all agencies (for overview panel)
router.get("/payouts", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: saasAgencyPayouts.id,
        agencyId: saasAgencyPayouts.agencyId,
        agencyName: saasAgencies.name,
        agencySlug: saasAgencies.slug,
        agencyCommissionRate: saasAgencies.commissionRate,
        period: saasAgencyPayouts.period,
        totalMrr: saasAgencyPayouts.totalMrr,
        commissionAmount: saasAgencyPayouts.commissionAmount,
        status: saasAgencyPayouts.status,
        paidAt: saasAgencyPayouts.paidAt,
        notes: saasAgencyPayouts.notes,
        createdAt: saasAgencyPayouts.createdAt,
        updatedAt: saasAgencyPayouts.updatedAt,
      })
      .from(saasAgencyPayouts)
      .leftJoin(saasAgencies, eq(saasAgencies.id, saasAgencyPayouts.agencyId))
      .orderBy(desc(saasAgencyPayouts.period), desc(saasAgencyPayouts.createdAt));
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch all payouts" });
  }
});

// PATCH /saas/payouts/:payoutId — update any payout by ID (for bulk operations)
router.patch("/payouts/:payoutId", async (req, res) => {
  try {
    const payoutId = parseInt(req.params.payoutId);
    const { status, notes } = req.body;
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (notes !== undefined) updates.notes = notes;
    if (status === "paid") updates.paidAt = new Date();
    const [row] = await db
      .update(saasAgencyPayouts)
      .set(updates)
      .where(eq(saasAgencyPayouts.id, payoutId))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Payout not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update payout" });
  }
});

export default router;
