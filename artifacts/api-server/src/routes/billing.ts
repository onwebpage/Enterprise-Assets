import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  billingPlans, billingSubscriptions, billingInvoices,
  billingPaymentMethods, billingAddOns, billingSubscriptionAddOns,
  organizations,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Summary ───────────────────────────────────────────────────────────────────
router.get("/summary", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;

    const [subRow] = await db
      .select({
        subId: billingSubscriptions.id,
        status: billingSubscriptions.status,
        billingCycle: billingSubscriptions.billingCycle,
        currentPeriodStart: billingSubscriptions.currentPeriodStart,
        currentPeriodEnd: billingSubscriptions.currentPeriodEnd,
        trialEndsAt: billingSubscriptions.trialEndsAt,
        cancelAtPeriodEnd: billingSubscriptions.cancelAtPeriodEnd,
        currentUsers: billingSubscriptions.currentUsers,
        currentStorageGb: billingSubscriptions.currentStorageGb,
        currentApiCalls: billingSubscriptions.currentApiCalls,
        uptime30d: billingSubscriptions.uptime30d,
        planId: billingPlans.id,
        planName: billingPlans.name,
        planSlug: billingPlans.slug,
        priceMonthly: billingPlans.priceMonthly,
        priceYearly: billingPlans.priceYearly,
        maxUsers: billingPlans.maxUsers,
        maxStorageGb: billingPlans.maxStorageGb,
        maxApiCallsMonthly: billingPlans.maxApiCallsMonthly,
        features: billingPlans.features,
      })
      .from(billingSubscriptions)
      .leftJoin(billingPlans, eq(billingPlans.id, billingSubscriptions.planId))
      .where(eq(billingSubscriptions.orgId, orgId));

    if (!subRow) {
      res.status(404).json({ success: false, error: "No subscription found" });
      return;
    }

    // Active add-ons
    const activeAddOns = await db
      .select({
        id: billingAddOns.id,
        name: billingAddOns.name,
        slug: billingAddOns.slug,
        priceMonthly: billingAddOns.priceMonthly,
        quantity: billingSubscriptionAddOns.quantity,
      })
      .from(billingSubscriptionAddOns)
      .leftJoin(billingAddOns, eq(billingAddOns.id, billingSubscriptionAddOns.addOnId))
      .where(eq(billingSubscriptionAddOns.subscriptionId, subRow.subId!));

    const addOnTotal = activeAddOns.reduce(
      (s, a) => s + Number(a.priceMonthly) * (a.quantity ?? 1),
      0
    );

    const baseMrr =
      subRow.billingCycle === "yearly"
        ? Number(subRow.priceYearly) / 12
        : Number(subRow.priceMonthly);

    res.json({
      success: true,
      data: {
        ...subRow,
        activeAddOns,
        mrr: baseMrr + addOnTotal,
        addOnTotal,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch billing summary" });
  }
});

// ── Plans ─────────────────────────────────────────────────────────────────────
router.get("/plans", async (_req, res) => {
  try {
    const data = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.isActive, true))
      .orderBy(billingPlans.sortOrder);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

// ── Change plan ───────────────────────────────────────────────────────────────
router.post("/change-plan", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const { planId, billingCycle } = req.body;

    const [plan] = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.id, parseInt(planId)));
    if (!plan) {
      res.status(404).json({ success: false, error: "Plan not found" });
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

    const [updated] = await db
      .update(billingSubscriptions)
      .set({
        planId: parseInt(planId),
        billingCycle: billingCycle ?? "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: "active",
        updatedAt: now,
      })
      .where(eq(billingSubscriptions.orgId, orgId))
      .returning();

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to change plan" });
  }
});

// ── Toggle cancel-at-period-end ────────────────────────────────────────────────
router.patch("/cancel", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const { cancelAtPeriodEnd } = req.body;
    const [updated] = await db
      .update(billingSubscriptions)
      .set({ cancelAtPeriodEnd: !!cancelAtPeriodEnd, updatedAt: new Date() })
      .where(eq(billingSubscriptions.orgId, orgId))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update cancellation" });
  }
});

// ── Invoices ──────────────────────────────────────────────────────────────────
router.get("/invoices", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const data = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.orgId, orgId))
      .orderBy(desc(billingInvoices.createdAt));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
});

// ── Payment Methods ───────────────────────────────────────────────────────────
router.get("/payment-methods", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const data = await db
      .select()
      .from(billingPaymentMethods)
      .where(eq(billingPaymentMethods.orgId, orgId))
      .orderBy(desc(billingPaymentMethods.isDefault), desc(billingPaymentMethods.createdAt));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payment methods" });
  }
});

router.post("/payment-methods", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const { type, brand, last4, expiryMonth, expiryYear, cardholderName, bankName, accountLast4, upiId, isDefault } = req.body;

    // If setting as default, undefault others
    if (isDefault) {
      await db
        .update(billingPaymentMethods)
        .set({ isDefault: false })
        .where(eq(billingPaymentMethods.orgId, orgId));
    }

    // Auto-default if first method
    const [existing] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(billingPaymentMethods)
      .where(eq(billingPaymentMethods.orgId, orgId));
    const makeDefault = isDefault || (existing?.count ?? 0) === 0;

    const [pm] = await db
      .insert(billingPaymentMethods)
      .values({
        orgId,
        type: type ?? "card",
        brand, last4,
        expiryMonth: expiryMonth ? parseInt(expiryMonth) : undefined,
        expiryYear: expiryYear ? parseInt(expiryYear) : undefined,
        cardholderName, bankName, accountLast4, upiId,
        isDefault: makeDefault,
      })
      .returning();
    res.status(201).json({ success: true, data: pm });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to add payment method" });
  }
});

router.patch("/payment-methods/:id/default", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const id = parseInt(req.params.id);
    await db
      .update(billingPaymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(billingPaymentMethods.orgId, orgId));
    const [pm] = await db
      .update(billingPaymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(billingPaymentMethods.id, id), eq(billingPaymentMethods.orgId, orgId)))
      .returning();
    if (!pm) { res.status(404).json({ success: false, error: "Payment method not found" }); return; }
    res.json({ success: true, data: pm });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update default" });
  }
});

router.delete("/payment-methods/:id", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const id = parseInt(req.params.id);
    const [pm] = await db
      .select()
      .from(billingPaymentMethods)
      .where(and(eq(billingPaymentMethods.id, id), eq(billingPaymentMethods.orgId, orgId)));
    if (!pm) { res.status(404).json({ success: false, error: "Payment method not found" }); return; }
    await db
      .delete(billingPaymentMethods)
      .where(and(eq(billingPaymentMethods.id, id), eq(billingPaymentMethods.orgId, orgId)));
    // If it was default, auto-promote another
    if (pm.isDefault) {
      const [next] = await db
        .select()
        .from(billingPaymentMethods)
        .where(eq(billingPaymentMethods.orgId, orgId))
        .orderBy(desc(billingPaymentMethods.createdAt))
        .limit(1);
      if (next) {
        await db
          .update(billingPaymentMethods)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(billingPaymentMethods.id, next.id));
      }
    }
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete payment method" });
  }
});

// ── Add-ons ───────────────────────────────────────────────────────────────────
router.get("/add-ons", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;

    const all = await db
      .select()
      .from(billingAddOns)
      .where(eq(billingAddOns.isActive, true))
      .orderBy(billingAddOns.sortOrder);

    // Get current subscription
    const [sub] = await db
      .select({ id: billingSubscriptions.id })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.orgId, orgId));

    const active = sub
      ? await db
          .select({ addOnId: billingSubscriptionAddOns.addOnId })
          .from(billingSubscriptionAddOns)
          .where(eq(billingSubscriptionAddOns.subscriptionId, sub.id))
      : [];

    const activeSet = new Set(active.map((a) => a.addOnId));

    res.json({
      success: true,
      data: all.map((a) => ({ ...a, isActive: activeSet.has(a.id) })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch add-ons" });
  }
});

router.patch("/add-ons/:id/toggle", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const addOnId = parseInt(req.params.id);

    const [sub] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.orgId, orgId));
    if (!sub) { res.status(404).json({ success: false, error: "No subscription found" }); return; }

    const [existing] = await db
      .select()
      .from(billingSubscriptionAddOns)
      .where(
        and(
          eq(billingSubscriptionAddOns.subscriptionId, sub.id),
          eq(billingSubscriptionAddOns.addOnId, addOnId)
        )
      );

    if (existing) {
      await db
        .delete(billingSubscriptionAddOns)
        .where(eq(billingSubscriptionAddOns.id, existing.id));
      res.json({ success: true, data: { active: false } });
    } else {
      await db
        .insert(billingSubscriptionAddOns)
        .values({ subscriptionId: sub.id, addOnId });
      res.json({ success: true, data: { active: true } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to toggle add-on" });
  }
});

// ── Usage (live snapshot) ─────────────────────────────────────────────────────
router.patch("/usage", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    const { currentUsers, currentStorageGb, currentApiCalls } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (currentUsers !== undefined) updates.currentUsers = parseInt(currentUsers);
    if (currentStorageGb !== undefined) updates.currentStorageGb = String(currentStorageGb);
    if (currentApiCalls !== undefined) updates.currentApiCalls = parseInt(currentApiCalls);
    const [updated] = await db
      .update(billingSubscriptions)
      .set(updates)
      .where(eq(billingSubscriptions.orgId, orgId))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update usage" });
  }
});

export default router;
