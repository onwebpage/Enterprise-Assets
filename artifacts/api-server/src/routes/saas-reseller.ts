import { Router } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { saasPlans } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// Raw table access (not in drizzle schema yet, using raw sql for new tables)
// ─────────────────────────────────────────────────────────────────────────────

// GET /saas/reseller-metrics
router.get("/reseller-metrics", async (_req, res) => {
  try {
    const r = (key: string) => (result: { rows: Record<string, unknown>[] }) =>
      Number(result.rows[0]?.[key] ?? 0);

    const [totalRes, activeRes, revenueRes, totalDealsRes, pendingRes, wonRes, pipelineRes, wonMrrRes, tierRes] =
      await Promise.all([
        db.execute(sql`SELECT count(*)::int AS c FROM saas_resellers`),
        db.execute(sql`SELECT count(*)::int AS c FROM saas_resellers WHERE status='active'`),
        db.execute(sql`SELECT coalesce(sum(total_revenue),0)::numeric AS c FROM saas_resellers`),
        db.execute(sql`SELECT count(*)::int AS c FROM saas_deal_registrations`),
        db.execute(sql`SELECT count(*)::int AS c FROM saas_deal_registrations WHERE status='pending'`),
        db.execute(sql`SELECT count(*)::int AS c FROM saas_deal_registrations WHERE status='won'`),
        db.execute(sql`SELECT coalesce(sum(estimated_mrr),0)::numeric AS c FROM saas_deal_registrations WHERE status IN ('pending','approved')`),
        db.execute(sql`SELECT coalesce(sum(estimated_mrr),0)::numeric AS c FROM saas_deal_registrations WHERE status='won'`),
        db.execute(sql`SELECT t.name AS tier, t.slug, t.color, count(r.id)::int AS count FROM saas_reseller_tiers t LEFT JOIN saas_resellers r ON r.tier_id=t.id GROUP BY t.id,t.name,t.slug,t.color ORDER BY t.sort_order`),
      ]);

    res.json({
      success: true,
      data: {
        totalResellers:  r('c')(totalRes as any),
        activeResellers: r('c')(activeRes as any),
        totalRevenue:    r('c')(revenueRes as any),
        totalDeals:      r('c')(totalDealsRes as any),
        pendingDeals:    r('c')(pendingRes as any),
        wonDeals:        r('c')(wonRes as any),
        pipelineMrr:     r('c')(pipelineRes as any),
        wonMrr:          r('c')(wonMrrRes as any),
        tierBreakdown:   (tierRes as any).rows as { tier: string; slug: string; color: string; count: number }[],
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch reseller metrics" });
  }
});

// GET /saas/reseller-tiers
router.get("/reseller-tiers", async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT * FROM saas_reseller_tiers ORDER BY sort_order`
    );
    res.json({ success: true, data: (rows as any).rows ?? rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch reseller tiers" });
  }
});

// POST /saas/reseller-tiers
router.post("/reseller-tiers", async (req, res) => {
  try {
    const { name, slug, color, minMrrRequired, commissionRate, discountRate, maxClients, benefits, sortOrder } = req.body;
    if (!name || !slug) { res.status(400).json({ success: false, error: "name and slug are required" }); return; }
    const rows = await db.execute(
      sql`INSERT INTO saas_reseller_tiers (name, slug, color, min_mrr_required, commission_rate, discount_rate, max_clients, benefits, sort_order)
          VALUES (${name}, ${slug}, ${color ?? '#6B7280'}, ${minMrrRequired ?? 0}, ${commissionRate ?? 10}, ${discountRate ?? 0}, ${maxClients ?? null}, ${JSON.stringify(benefits ?? [])}, ${sortOrder ?? 0})
          RETURNING *`
    );
    res.status(201).json({ success: true, data: ((rows as any).rows ?? rows)[0] });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ success: false, error: "Slug already taken" }); return; }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create tier" });
  }
});

// PUT /saas/reseller-tiers/:id
router.put("/reseller-tiers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, color, minMrrRequired, commissionRate, discountRate, maxClients, benefits, sortOrder } = req.body;
    const rows = await db.execute(
      sql`UPDATE saas_reseller_tiers SET
            name=${name}, slug=${slug}, color=${color}, min_mrr_required=${minMrrRequired ?? 0},
            commission_rate=${commissionRate ?? 10}, discount_rate=${discountRate ?? 0},
            max_clients=${maxClients ?? null}, benefits=${JSON.stringify(benefits ?? [])},
            sort_order=${sortOrder ?? 0}, updated_at=NOW()
          WHERE id=${id} RETURNING *`
    );
    const row = ((rows as any).rows ?? rows)[0];
    if (!row) { res.status(404).json({ success: false, error: "Tier not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ success: false, error: "Slug already taken" }); return; }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update tier" });
  }
});

// DELETE /saas/reseller-tiers/:id
router.delete("/reseller-tiers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM saas_reseller_tiers WHERE id=${id}`);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete tier" });
  }
});

// GET /saas/resellers — enriched list
router.get("/resellers", async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT r.*,
            t.name AS tier_name, t.slug AS tier_slug, t.color AS tier_color,
            t.commission_rate AS tier_commission_rate, t.discount_rate AS tier_discount_rate,
            count(d.id)::int AS deal_count,
            count(d.id) FILTER (WHERE d.status='pending')::int AS pending_deals,
            count(d.id) FILTER (WHERE d.status='approved')::int AS approved_deals,
            count(d.id) FILTER (WHERE d.status='won')::int AS won_deals,
            coalesce(sum(d.estimated_mrr) FILTER (WHERE d.status IN ('pending','approved')),0)::numeric AS pipeline_mrr,
            coalesce(sum(d.estimated_mrr) FILTER (WHERE d.status='won'),0)::numeric AS won_mrr
          FROM saas_resellers r
          LEFT JOIN saas_reseller_tiers t ON t.id=r.tier_id
          LEFT JOIN saas_deal_registrations d ON d.reseller_id=r.id
          GROUP BY r.id, t.id, t.name, t.slug, t.color, t.commission_rate, t.discount_rate
          ORDER BY r.created_at DESC`
    );
    res.json({ success: true, data: (rows as any).rows ?? rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch resellers" });
  }
});

// POST /saas/resellers
router.post("/resellers", async (req, res) => {
  try {
    const { companyName, contactName, contactEmail, phone, country, website, tierId, notes } = req.body;
    if (!companyName) { res.status(400).json({ success: false, error: "companyName is required" }); return; }
    const rows = await db.execute(
      sql`INSERT INTO saas_resellers (company_name, contact_name, contact_email, phone, country, website, tier_id, notes)
          VALUES (${companyName}, ${contactName ?? null}, ${contactEmail ?? null}, ${phone ?? null}, ${country ?? null}, ${website ?? null}, ${tierId ? parseInt(tierId) : null}, ${notes ?? null})
          RETURNING *`
    );
    res.status(201).json({ success: true, data: ((rows as any).rows ?? rows)[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create reseller" });
  }
});

// GET /saas/resellers/:id — single reseller detail
router.get("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.execute(
      sql`SELECT r.*, t.name AS tier_name, t.slug AS tier_slug, t.color AS tier_color, t.commission_rate AS tier_commission_rate
          FROM saas_resellers r
          LEFT JOIN saas_reseller_tiers t ON t.id=r.tier_id
          WHERE r.id=${id}`
    );
    const row = ((rows as any).rows ?? rows)[0];
    if (!row) { res.status(404).json({ success: false, error: "Reseller not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch reseller" });
  }
});

// PUT /saas/resellers/:id
router.put("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { companyName, contactName, contactEmail, phone, country, website, tierId, notes } = req.body;
    const rows = await db.execute(
      sql`UPDATE saas_resellers SET
            company_name=${companyName}, contact_name=${contactName ?? null}, contact_email=${contactEmail ?? null},
            phone=${phone ?? null}, country=${country ?? null}, website=${website ?? null},
            tier_id=${tierId ? parseInt(tierId) : null}, notes=${notes ?? null}, updated_at=NOW()
          WHERE id=${id} RETURNING *`
    );
    const row = ((rows as any).rows ?? rows)[0];
    if (!row) { res.status(404).json({ success: false, error: "Reseller not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update reseller" });
  }
});

// PATCH /saas/resellers/:id/status
router.patch("/resellers/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const rows = await db.execute(
      sql`UPDATE saas_resellers SET status=${status}, updated_at=NOW() WHERE id=${id} RETURNING *`
    );
    const row = ((rows as any).rows ?? rows)[0];
    if (!row) { res.status(404).json({ success: false, error: "Reseller not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update reseller status" });
  }
});

// DELETE /saas/resellers/:id
router.delete("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`UPDATE saas_resellers SET status='inactive', updated_at=NOW() WHERE id=${id}`);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to deactivate reseller" });
  }
});

// GET /saas/resellers/:id/deals — deals for a specific reseller
router.get("/resellers/:id/deals", async (req, res) => {
  try {
    const resellerId = parseInt(req.params.id);
    const rows = await db.execute(
      sql`SELECT d.*, p.name AS plan_name, p.slug AS plan_slug
          FROM saas_deal_registrations d
          LEFT JOIN saas_plans p ON p.id=d.plan_id
          WHERE d.reseller_id=${resellerId}
          ORDER BY d.created_at DESC`
    );
    res.json({ success: true, data: (rows as any).rows ?? rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch deals" });
  }
});

// GET /saas/deal-registrations — all deals across all resellers
router.get("/deal-registrations", async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT d.*, r.company_name AS reseller_name, r.tier_id,
            t.name AS tier_name, t.slug AS tier_slug, t.color AS tier_color,
            p.name AS plan_name, p.slug AS plan_slug
          FROM saas_deal_registrations d
          LEFT JOIN saas_resellers r ON r.id=d.reseller_id
          LEFT JOIN saas_reseller_tiers t ON t.id=r.tier_id
          LEFT JOIN saas_plans p ON p.id=d.plan_id
          ORDER BY d.created_at DESC`
    );
    res.json({ success: true, data: (rows as any).rows ?? rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch deal registrations" });
  }
});

// POST /saas/deal-registrations — register a new deal
router.post("/deal-registrations", async (req, res) => {
  try {
    const { resellerId, prospectName, prospectEmail, prospectPhone, industry, country, estimatedMrr, planId, notes, expiresAt } = req.body;
    if (!resellerId || !prospectName) { res.status(400).json({ success: false, error: "resellerId and prospectName are required" }); return; }
    const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days
    const rows = await db.execute(
      sql`INSERT INTO saas_deal_registrations (reseller_id, prospect_name, prospect_email, prospect_phone, industry, country, estimated_mrr, plan_id, notes, expires_at)
          VALUES (${parseInt(resellerId)}, ${prospectName}, ${prospectEmail ?? null}, ${prospectPhone ?? null}, ${industry ?? null}, ${country ?? null}, ${estimatedMrr ?? 0}, ${planId ? parseInt(planId) : null}, ${notes ?? null}, ${expires})
          RETURNING *`
    );
    res.status(201).json({ success: true, data: ((rows as any).rows ?? rows)[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to register deal" });
  }
});

// PATCH /saas/deal-registrations/:id/status — approve/reject/won/lost
router.patch("/deal-registrations/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, rejectionReason } = req.body;
    const closed = ['won', 'lost', 'rejected'].includes(status) ? new Date() : null;
    const rows = await db.execute(
      sql`UPDATE saas_deal_registrations SET
            status=${status},
            rejection_reason=${rejectionReason ?? null},
            closed_at=${closed},
            updated_at=NOW()
          WHERE id=${id} RETURNING *`
    );
    const row = ((rows as any).rows ?? rows)[0];
    if (!row) { res.status(404).json({ success: false, error: "Deal not found" }); return; }
    // If won, bump reseller total_revenue
    if (status === 'won') {
      await db.execute(
        sql`UPDATE saas_resellers SET total_revenue=total_revenue+${Number(row.estimated_mrr)}, updated_at=NOW() WHERE id=${row.reseller_id}`
      );
    }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update deal status" });
  }
});

// PUT /saas/deal-registrations/:id — update deal details
router.put("/deal-registrations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { prospectName, prospectEmail, prospectPhone, industry, country, estimatedMrr, planId, notes } = req.body;
    const rows = await db.execute(
      sql`UPDATE saas_deal_registrations SET
            prospect_name=${prospectName}, prospect_email=${prospectEmail ?? null},
            prospect_phone=${prospectPhone ?? null}, industry=${industry ?? null},
            country=${country ?? null}, estimated_mrr=${estimatedMrr ?? 0},
            plan_id=${planId ? parseInt(planId) : null}, notes=${notes ?? null},
            updated_at=NOW()
          WHERE id=${id} RETURNING *`
    );
    const row = ((rows as any).rows ?? rows)[0];
    if (!row) { res.status(404).json({ success: false, error: "Deal not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update deal" });
  }
});

export default router;
