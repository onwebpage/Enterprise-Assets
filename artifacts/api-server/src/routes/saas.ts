import { Router } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { saasPlans, saasSubscriptions, organizations } from "@workspace/db/schema";
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

export default router;
