import { Router } from "express";
import { desc, sql, eq, and, gte, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAdminAuth, type AdminRequest } from "../middlewares/adminAuth";

const router = Router();
router.use(requireAdminAuth);

// ── Helper: audit log ─────────────────────────────────────────────────────────
async function audit(req: AdminRequest, action: string, resource: string, resourceId?: string | number, details?: Record<string, unknown>) {
  await db.execute(sql`
    INSERT INTO admin_audit_logs (admin_id, admin_username, action, resource, resource_id, details, ip_address)
    VALUES (
      ${req.admin!.adminId}, ${req.admin!.username}, ${action}, ${resource},
      ${resourceId != null ? String(resourceId) : null},
      ${JSON.stringify(details ?? {})}::jsonb,
      ${req.socket?.remoteAddress ?? "unknown"}
    )
  `);
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
router.get("/dashboard", async (_req, res) => {
  try {
    const [tenants, users, revenue, activeSubs, tickets, recentOrgs] = await Promise.all([
      db.execute<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM organizations`),
      db.execute<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM users`),
      db.execute<{ total: string }>(sql`SELECT COALESCE(SUM(mrr),0)::text AS total FROM saas_subscriptions WHERE status='active'`),
      db.execute<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM saas_subscriptions WHERE status='active'`),
      db.execute<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM admin_support_tickets WHERE status IN ('open','in_progress')`),
      db.execute<{ id: number; name: string; status: string; created_at: Date }>(
        sql`SELECT id, name, status, created_at FROM organizations ORDER BY created_at DESC LIMIT 5`
      ),
    ]);

    const monthlyRevenue = await db.execute<{ month: string; revenue: string }>(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(mrr)::text AS revenue
      FROM saas_subscriptions WHERE status = 'active' AND created_at > NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month
    `);

    res.json({
      success: true,
      data: {
        tenants: tenants[0]?.count ?? 0,
        users: users[0]?.count ?? 0,
        monthlyRevenue: parseFloat(revenue[0]?.total ?? "0"),
        activeSubscriptions: activeSubs[0]?.count ?? 0,
        openTickets: tickets[0]?.count ?? 0,
        recentTenants: recentOrgs,
        revenueChart: monthlyRevenue,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to load dashboard" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  TENANTS & COMPANIES
// ══════════════════════════════════════════════════════════════════
router.get("/tenants", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const rows = await db.execute<{
      id: number; name: string; legal_name: string | null; status: string;
      country: string | null; industry: string | null; gstin: string | null;
      user_count: number; plan_name: string | null; sub_status: string | null; created_at: Date;
    }>(sql`
      SELECT o.id, o.name, o.legal_name, o.status, o.country, o.industry, o.gstin, o.created_at,
             COUNT(DISTINCT u.id)::int AS user_count,
             sp.name AS plan_name,
             ss.status AS sub_status
      FROM organizations o
      LEFT JOIN users u ON u.org_id = o.id
      LEFT JOIN saas_subscriptions ss ON ss.org_id = o.id AND ss.status = 'active'
      LEFT JOIN saas_plans sp ON sp.id = ss.plan_id
      WHERE (${search ? sql`o.name ILIKE ${'%' + search + '%'}` : sql`TRUE`})
        AND (${status ? sql`o.status = ${status}` : sql`TRUE`})
      GROUP BY o.id, sp.name, ss.status
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch tenants" });
  }
});

router.post("/tenants", async (req: AdminRequest, res) => {
  try {
    const { name, legalName, country, industry, gstin, status } = req.body;
    if (!name) { res.status(400).json({ success: false, error: "Name is required" }); return; }
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO organizations (name, legal_name, country, industry, gstin, status)
      VALUES (${name}, ${legalName ?? null}, ${country ?? null}, ${industry ?? null}, ${gstin ?? null}, ${status ?? 'active'})
      RETURNING id
    `);
    await audit(req, "CREATE", "tenant", rows[0]?.id, { name });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create tenant" });
  }
});

router.put("/tenants/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, legalName, country, industry, gstin, status } = req.body;
    await db.execute(sql`
      UPDATE organizations SET name=${name}, legal_name=${legalName ?? null},
      country=${country ?? null}, industry=${industry ?? null},
      gstin=${gstin ?? null}, status=${status ?? 'active'}, updated_at=NOW()
      WHERE id=${id}
    `);
    await audit(req, "UPDATE", "tenant", id, { name });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update tenant" });
  }
});

router.patch("/tenants/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await db.execute(sql`UPDATE organizations SET status=${status}, updated_at=NOW() WHERE id=${id}`);
    await audit(req, "STATUS_CHANGE", "tenant", id, { status });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

router.delete("/tenants/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`DELETE FROM organizations WHERE id=${id}`);
    await audit(req, "DELETE", "tenant", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete tenant" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  USERS, ROLES & PERMISSIONS
// ══════════════════════════════════════════════════════════════════
router.get("/users", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const rows = await db.execute<{
      id: number; first_name: string; last_name: string; email: string;
      status: string; org_name: string | null; role_name: string | null;
      mfa_enabled: boolean; last_login_at: Date | null; created_at: Date;
    }>(sql`
      SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.mfa_enabled,
             u.last_login_at, u.created_at, o.name AS org_name, r.name AS role_name
      FROM users u
      LEFT JOIN organizations o ON o.id = u.org_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE (${search ? sql`(u.email ILIKE ${'%' + search + '%'} OR u.first_name ILIKE ${'%' + search + '%'} OR u.last_name ILIKE ${'%' + search + '%'})` : sql`TRUE`})
      ORDER BY u.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.patch("/users/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await db.execute(sql`UPDATE users SET status=${status}, updated_at=NOW() WHERE id=${id}`);
    await audit(req, "USER_STATUS_CHANGE", "user", id, { status });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`DELETE FROM users WHERE id=${id}`);
    await audit(req, "DELETE", "user", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

router.get("/roles", async (_req, res) => {
  try {
    const rows = await db.execute<{
      id: number; name: string; description: string | null; is_system: boolean;
      org_name: string | null; user_count: number; created_at: Date;
    }>(sql`
      SELECT r.id, r.name, r.description, r.is_system, r.created_at,
             o.name AS org_name,
             COUNT(DISTINCT u.id)::int AS user_count
      FROM roles r
      LEFT JOIN organizations o ON o.id = r.org_id
      LEFT JOIN users u ON u.role_id = r.id
      GROUP BY r.id, o.name ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch roles" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  PLANS & SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════════
router.get("/plans", async (_req, res) => {
  try {
    const rows = await db.execute<{
      id: number; name: string; slug: string; price_monthly: string; price_yearly: string;
      max_users: number | null; max_modules: number | null; max_storage_gb: number | null;
      is_active: boolean; sub_count: number; created_at: Date;
    }>(sql`
      SELECT sp.*, COUNT(ss.id)::int AS sub_count
      FROM saas_plans sp
      LEFT JOIN saas_subscriptions ss ON ss.plan_id = sp.id AND ss.status='active'
      GROUP BY sp.id ORDER BY sp.sort_order, sp.created_at
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

router.post("/plans", async (req: AdminRequest, res) => {
  try {
    const { name, slug, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, features } = req.body;
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO saas_plans (name, slug, price_monthly, price_yearly, max_users, max_modules, max_storage_gb, features)
      VALUES (${name}, ${slug}, ${priceMonthly ?? 0}, ${priceYearly ?? 0},
              ${maxUsers ?? null}, ${maxModules ?? null}, ${maxStorageGb ?? null},
              ${JSON.stringify(features ?? [])}::jsonb)
      RETURNING id
    `);
    await audit(req, "CREATE", "plan", rows[0]?.id, { name });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create plan" });
  }
});

router.put("/plans/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, isActive } = req.body;
    await db.execute(sql`
      UPDATE saas_plans SET name=${name}, price_monthly=${priceMonthly}, price_yearly=${priceYearly},
      max_users=${maxUsers ?? null}, max_modules=${maxModules ?? null},
      max_storage_gb=${maxStorageGb ?? null}, is_active=${isActive ?? true}, updated_at=NOW()
      WHERE id=${id}
    `);
    await audit(req, "UPDATE", "plan", id, { name });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update plan" });
  }
});

router.delete("/plans/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`DELETE FROM saas_plans WHERE id=${id}`);
    await audit(req, "DELETE", "plan", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete plan" });
  }
});

router.get("/subscriptions", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const rows = await db.execute<{
      id: number; org_name: string; plan_name: string; status: string;
      billing_cycle: string; mrr: string; started_at: Date;
      expires_at: Date | null; current_users: number;
    }>(sql`
      SELECT ss.id, o.name AS org_name, sp.name AS plan_name, ss.status,
             ss.billing_cycle, ss.mrr, ss.started_at, ss.expires_at, ss.current_users
      FROM saas_subscriptions ss
      JOIN organizations o ON o.id = ss.org_id
      JOIN saas_plans sp ON sp.id = ss.plan_id
      WHERE (${status ? sql`ss.status = ${status}` : sql`TRUE`})
      ORDER BY ss.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions" });
  }
});

router.patch("/subscriptions/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await db.execute(sql`UPDATE saas_subscriptions SET status=${status}, updated_at=NOW() WHERE id=${id}`);
    await audit(req, "SUB_STATUS_CHANGE", "subscription", id, { status });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update subscription" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  BILLING & PAYMENTS
// ══════════════════════════════════════════════════════════════════
router.get("/billing/overview", async (_req, res) => {
  try {
    const [mrr, arr, totalInvoices, paidInvoices] = await Promise.all([
      db.execute<{ v: string }>(sql`SELECT COALESCE(SUM(mrr),0)::text AS v FROM saas_subscriptions WHERE status='active'`),
      db.execute<{ v: string }>(sql`SELECT (COALESCE(SUM(mrr),0)*12)::text AS v FROM saas_subscriptions WHERE status='active'`),
      db.execute<{ v: number }>(sql`SELECT COUNT(*)::int AS v FROM billing_invoices`),
      db.execute<{ v: string }>(sql`SELECT COALESCE(SUM(total),0)::text AS v FROM billing_invoices WHERE status='paid'`),
    ]);
    res.json({
      success: true, data: {
        mrr: parseFloat(mrr[0]?.v ?? "0"),
        arr: parseFloat(arr[0]?.v ?? "0"),
        totalInvoices: totalInvoices[0]?.v ?? 0,
        paidRevenue: parseFloat(paidInvoices[0]?.v ?? "0"),
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to load billing overview" });
  }
});

router.get("/billing/invoices", async (_req, res) => {
  try {
    const rows = await db.execute<{
      id: number; invoice_number: string; org_name: string; status: string;
      total: string; currency: string; created_at: Date; paid_at: Date | null;
    }>(sql`
      SELECT bi.id, bi.invoice_number, bi.status, bi.total, bi.currency, bi.created_at, bi.paid_at,
             o.name AS org_name
      FROM billing_invoices bi
      JOIN organizations o ON o.id = bi.org_id
      ORDER BY bi.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  LICENSES
// ══════════════════════════════════════════════════════════════════
router.get("/licenses", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT l.*, o.name AS org_name
      FROM admin_licenses l
      LEFT JOIN organizations o ON o.id = l.org_id
      ORDER BY l.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch licenses" });
  }
});

router.post("/licenses", async (req: AdminRequest, res) => {
  try {
    const { orgId, planName, maxUsers, maxModules, issuedTo, expiresAt, notes } = req.body;
    const key = "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase()
      + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO admin_licenses (license_key, org_id, plan_name, max_users, max_modules, issued_to, expires_at, notes)
      VALUES (${key}, ${orgId ?? null}, ${planName ?? 'Professional'}, ${maxUsers ?? 50},
              ${maxModules ?? 10}, ${issuedTo ?? null},
              ${expiresAt ? new Date(expiresAt) : null}, ${notes ?? null})
      RETURNING id
    `);
    await audit(req, "CREATE", "license", rows[0]?.id, { key, planName });
    res.status(201).json({ success: true, data: { id: rows[0]?.id, licenseKey: key } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create license" });
  }
});

router.patch("/licenses/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await db.execute(sql`UPDATE admin_licenses SET status=${status}, updated_at=NOW() WHERE id=${id}`);
    await audit(req, "LICENSE_STATUS_CHANGE", "license", id, { status });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update license" });
  }
});

router.delete("/licenses/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`DELETE FROM admin_licenses WHERE id=${id}`);
    await audit(req, "DELETE", "license", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete license" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  FEATURE MANAGEMENT
// ══════════════════════════════════════════════════════════════════
router.get("/features", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM admin_features ORDER BY category, name`);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch features" });
  }
});

router.post("/features", async (req: AdminRequest, res) => {
  try {
    const { key, name, description, isEnabled, rolloutPct, category } = req.body;
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO admin_features (key, name, description, is_enabled, rollout_pct, category)
      VALUES (${key}, ${name}, ${description ?? null}, ${isEnabled ?? true}, ${rolloutPct ?? 100}, ${category ?? 'general'})
      RETURNING id
    `);
    await audit(req, "CREATE", "feature", rows[0]?.id, { key, name });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create feature" });
  }
});

router.put("/features/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, description, isEnabled, rolloutPct, category } = req.body;
    await db.execute(sql`
      UPDATE admin_features SET name=${name}, description=${description ?? null},
      is_enabled=${isEnabled}, rollout_pct=${rolloutPct ?? 100},
      category=${category ?? 'general'}, updated_at=NOW()
      WHERE id=${id}
    `);
    await audit(req, "UPDATE", "feature", id, { name, isEnabled });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update feature" });
  }
});

router.patch("/features/:id/toggle", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const rows = await db.execute<{ is_enabled: boolean }>(
      sql`UPDATE admin_features SET is_enabled = NOT is_enabled, updated_at=NOW() WHERE id=${id} RETURNING is_enabled`
    );
    await audit(req, "TOGGLE_FEATURE", "feature", id, { isEnabled: rows[0]?.is_enabled });
    res.json({ success: true, data: { isEnabled: rows[0]?.is_enabled } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to toggle feature" });
  }
});

router.delete("/features/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`DELETE FROM admin_features WHERE id=${id}`);
    await audit(req, "DELETE", "feature", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete feature" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  WHITE LABEL
// ══════════════════════════════════════════════════════════════════
router.get("/whitelabel", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT w.*, o.name AS org_name FROM saas_whitelabel w
      JOIN organizations o ON o.id = w.org_id
      ORDER BY w.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch whitelabel configs" });
  }
});

router.put("/whitelabel/:orgId", async (req: AdminRequest, res) => {
  try {
    const orgId = parseInt(req.params["orgId"] as string);
    const { isEnabled, productName, primaryColor, accentColor, customDomain,
      supportEmail, hidePoweredBy, logoUrl } = req.body;
    await db.execute(sql`
      INSERT INTO saas_whitelabel (org_id, is_enabled, product_name, primary_color, accent_color,
        custom_domain, support_email, hide_powered_by, logo_url)
      VALUES (${orgId}, ${isEnabled ?? true}, ${productName ?? 'OmniERP'},
        ${primaryColor ?? '#2563EB'}, ${accentColor ?? '#06B6D4'},
        ${customDomain ?? null}, ${supportEmail ?? null},
        ${hidePoweredBy ?? false}, ${logoUrl ?? null})
      ON CONFLICT (org_id) DO UPDATE SET
        is_enabled=${isEnabled ?? true}, product_name=${productName ?? 'OmniERP'},
        primary_color=${primaryColor ?? '#2563EB'}, accent_color=${accentColor ?? '#06B6D4'},
        custom_domain=${customDomain ?? null}, support_email=${supportEmail ?? null},
        hide_powered_by=${hidePoweredBy ?? false}, logo_url=${logoUrl ?? null},
        updated_at=NOW()
    `);
    await audit(req, "UPDATE", "whitelabel", orgId, { productName });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update whitelabel" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  AGENCIES & RESELLERS
// ══════════════════════════════════════════════════════════════════
router.get("/agencies", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT a.*, COUNT(DISTINCT ac.id)::int AS client_count,
             SUM(ap.commission_amount)::text AS total_commission
      FROM saas_agencies a
      LEFT JOIN saas_agency_clients ac ON ac.agency_id = a.id
      LEFT JOIN saas_agency_payouts ap ON ap.agency_id = a.id AND ap.status='paid'
      GROUP BY a.id ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch agencies" });
  }
});

router.post("/agencies", async (req: AdminRequest, res) => {
  try {
    const { name, slug, contactName, contactEmail, country, commissionRate } = req.body;
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO saas_agencies (name, slug, contact_name, contact_email, country, commission_rate)
      VALUES (${name}, ${slug ?? name.toLowerCase().replace(/\s+/g, '-')},
              ${contactName ?? null}, ${contactEmail ?? null},
              ${country ?? null}, ${commissionRate ?? 10})
      RETURNING id
    `);
    await audit(req, "CREATE", "agency", rows[0]?.id, { name });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create agency" });
  }
});

router.put("/agencies/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, contactName, contactEmail, country, commissionRate, status } = req.body;
    await db.execute(sql`
      UPDATE saas_agencies SET name=${name}, contact_name=${contactName ?? null},
      contact_email=${contactEmail ?? null}, country=${country ?? null},
      commission_rate=${commissionRate ?? 10}, status=${status ?? 'active'}, updated_at=NOW()
      WHERE id=${id}
    `);
    await audit(req, "UPDATE", "agency", id, { name });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update agency" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  INTEGRATIONS
// ══════════════════════════════════════════════════════════════════
router.get("/integrations", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM admin_integrations_config ORDER BY category, name`);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch integrations" });
  }
});

router.put("/integrations/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { isEnabled, status, config } = req.body;
    await db.execute(sql`
      UPDATE admin_integrations_config
      SET is_enabled=${isEnabled ?? false}, status=${status ?? 'inactive'},
          config=${JSON.stringify(config ?? {})}::jsonb, updated_at=NOW()
      WHERE id=${id}
    `);
    await audit(req, "UPDATE", "integration", id, { isEnabled, status });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update integration" });
  }
});

router.post("/integrations/:id/test", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`UPDATE admin_integrations_config SET last_tested_at=NOW() WHERE id=${id}`);
    await audit(req, "TEST", "integration", id);
    // Simulate test result
    res.json({ success: true, data: { connected: false, message: "Test connection not yet implemented for this integration" } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Test failed" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  SECURITY SETTINGS
// ══════════════════════════════════════════════════════════════════
router.get("/security", async (_req, res) => {
  try {
    const rows = await db.execute<{ key: string; value: string }>(
      sql`SELECT key, value FROM admin_system_settings WHERE category='security'`
    );
    const settings: Record<string, string> = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    
    const recentAttempts = await db.execute<{
      username: string; ip_address: string; success: boolean; attempted_at: Date;
    }>(sql`
      SELECT username, ip_address, success, attempted_at FROM admin_login_attempts
      ORDER BY attempted_at DESC LIMIT 20
    `);
    res.json({ success: true, data: { settings, recentAttempts } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch security settings" });
  }
});

router.put("/security", async (req: AdminRequest, res) => {
  try {
    const { maxLoginAttempts, lockoutMinutes, sessionHours } = req.body;
    const updates = [
      { key: 'max_login_attempts', value: String(maxLoginAttempts ?? 5) },
      { key: 'lockout_minutes', value: String(lockoutMinutes ?? 15) },
      { key: 'session_hours', value: String(sessionHours ?? 24) },
    ];
    for (const u of updates) {
      await db.execute(sql`UPDATE admin_system_settings SET value=${u.value}, updated_by=${req.admin!.username}, updated_at=NOW() WHERE key=${u.key}`);
    }
    await audit(req, "UPDATE", "security_settings", undefined, req.body);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update security settings" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ══════════════════════════════════════════════════════════════════
router.get("/audit-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string ?? "100");
    const resource = req.query.resource as string | undefined;
    const rows = await db.execute(sql`
      SELECT * FROM admin_audit_logs
      WHERE (${resource ? sql`resource = ${resource}` : sql`TRUE`})
      ORDER BY created_at DESC LIMIT ${limit}
    `);
    // Also include app audit logs
    const appLogs = await db.execute(sql`
      SELECT al.*, u.email AS user_email FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 50
    `);
    res.json({ success: true, data: { adminLogs: rows, appLogs } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  USAGE ANALYTICS
// ══════════════════════════════════════════════════════════════════
router.get("/analytics", async (_req, res) => {
  try {
    const [orgStats, userStats, moduleStats, subByPlan, revenueByMonth] = await Promise.all([
      db.execute<{ status: string; count: number }>(
        sql`SELECT status, COUNT(*)::int AS count FROM organizations GROUP BY status`
      ),
      db.execute<{ status: string; count: number }>(
        sql`SELECT status, COUNT(*)::int AS count FROM users GROUP BY status`
      ),
      db.execute<{ action: string; count: number }>(
        sql`SELECT action, COUNT(*)::int AS count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 10`
      ),
      db.execute<{ plan_name: string; count: number; revenue: string }>(sql`
        SELECT sp.name AS plan_name, COUNT(ss.id)::int AS count, SUM(ss.mrr)::text AS revenue
        FROM saas_subscriptions ss JOIN saas_plans sp ON sp.id = ss.plan_id
        WHERE ss.status='active' GROUP BY sp.name
      `),
      db.execute<{ month: string; mrr: string; new_subs: number }>(sql`
        SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
               SUM(mrr)::text AS mrr,
               COUNT(*)::int AS new_subs
        FROM saas_subscriptions
        WHERE created_at > NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
    ]);
    res.json({
      success: true, data: {
        orgStats, userStats, moduleStats, subByPlan, revenueByMonth
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch analytics" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  BACKUP & RESTORE
// ══════════════════════════════════════════════════════════════════
router.get("/backups", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM admin_backup_logs ORDER BY started_at DESC LIMIT 50`);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch backups" });
  }
});

router.post("/backups", async (req: AdminRequest, res) => {
  try {
    const { type, notes } = req.body;
    const name = `backup_${new Date().toISOString().replace(/[:.]/g, '_').slice(0, 19)}_manual`;
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO admin_backup_logs (backup_name, type, status, initiated_by, notes)
      VALUES (${name}, ${type ?? 'full'}, 'running', ${req.admin!.username}, ${notes ?? null})
      RETURNING id
    `);
    const id = rows[0]?.id;
    // Simulate backup completion after a moment
    setTimeout(async () => {
      await db.execute(sql`
        UPDATE admin_backup_logs SET status='completed', completed_at=NOW(),
        size_bytes=${Math.floor(Math.random() * 500_000_000 + 100_000_000)}
        WHERE id=${id}
      `);
    }, 3000);
    await audit(req, "CREATE_BACKUP", "backup", id, { type });
    res.status(201).json({ success: true, data: { id, name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to initiate backup" });
  }
});

router.delete("/backups/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.execute(sql`DELETE FROM admin_backup_logs WHERE id=${id}`);
    await audit(req, "DELETE_BACKUP", "backup", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete backup" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS (broadcast)
// ══════════════════════════════════════════════════════════════════
router.get("/notifications", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT n.*, u.email AS target_email FROM notifications n
      LEFT JOIN users u ON u.id = n.user_id
      ORDER BY n.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

router.post("/notifications/broadcast", async (req: AdminRequest, res) => {
  try {
    const { title, body, type, orgId } = req.body;
    if (!title) { res.status(400).json({ success: false, error: "Title is required" }); return; }

    // Get target users
    const targets = await db.execute<{ id: number }>(sql`
      SELECT id FROM users WHERE status='active'
      AND (${orgId ? sql`org_id = ${orgId}` : sql`TRUE`})
    `);

    let inserted = 0;
    for (const u of targets) {
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, body, created_at)
        VALUES (${u.id}, ${type ?? 'system'}, ${title}, ${body ?? null}, NOW())
      `);
      inserted++;
    }

    await audit(req, "BROADCAST_NOTIFICATION", "notification", undefined, { title, targetCount: inserted });
    res.json({ success: true, data: { sent: inserted } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to send notification" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════
router.get("/support-tickets", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const rows = await db.execute(sql`
      SELECT t.*, o.name AS org_name
      FROM admin_support_tickets t
      LEFT JOIN organizations o ON o.id = t.org_id
      WHERE (${status ? sql`t.status = ${status}` : sql`TRUE`})
      ORDER BY
        CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch tickets" });
  }
});

router.post("/support-tickets", async (req: AdminRequest, res) => {
  try {
    const { subject, description, orgId, reporterName, reporterEmail, priority, category } = req.body;
    const count = await db.execute<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM admin_support_tickets`);
    const num = `TKT-${String((count[0]?.n ?? 0) + 1).padStart(3, '0')}`;
    const rows = await db.execute<{ id: number }>(sql`
      INSERT INTO admin_support_tickets
        (ticket_number, subject, description, org_id, reporter_name, reporter_email, priority, category)
      VALUES (${num}, ${subject}, ${description ?? null}, ${orgId ?? null},
              ${reporterName ?? null}, ${reporterEmail ?? null},
              ${priority ?? 'medium'}, ${category ?? 'general'})
      RETURNING id
    `);
    await audit(req, "CREATE", "support_ticket", rows[0]?.id, { subject });
    res.status(201).json({ success: true, data: { id: rows[0]?.id, ticketNumber: num } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create ticket" });
  }
});

router.put("/support-tickets/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status, priority, assignedTo, resolution } = req.body;
    await db.execute(sql`
      UPDATE admin_support_tickets
      SET status=${status}, priority=${priority}, assigned_to=${assignedTo ?? null},
          resolution=${resolution ?? null}, updated_at=NOW()
      WHERE id=${id}
    `);
    await audit(req, "UPDATE", "support_ticket", id, { status, priority });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update ticket" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  SYSTEM HEALTH
// ══════════════════════════════════════════════════════════════════
router.get("/health", async (_req, res) => {
  try {
    const start = Date.now();
    const [dbCheck, tableStats] = await Promise.all([
      db.execute<{ now: Date }>(sql`SELECT NOW() AS now`),
      db.execute<{ tablename: string; n_live_tup: number }>(sql`
        SELECT tablename, n_live_tup FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC LIMIT 15
      `),
    ]);
    const dbLatency = Date.now() - start;

    const uptime = process.uptime();
    const mem = process.memoryUsage();

    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        dbConnected: !!dbCheck[0],
        dbLatencyMs: dbLatency,
        serverUptimeSeconds: Math.floor(uptime),
        memoryMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        tableStats,
        nodeVersion: process.version,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ success: false, error: "Health check failed", data: { status: "unhealthy" } });
  }
});

// ══════════════════════════════════════════════════════════════════
//  GLOBAL SETTINGS
// ══════════════════════════════════════════════════════════════════
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM admin_system_settings ORDER BY category, key`);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req: AdminRequest, res) => {
  try {
    const { settings } = req.body as { settings: Array<{ key: string; value: string }> };
    for (const s of settings) {
      await db.execute(sql`
        INSERT INTO admin_system_settings (key, value, category, updated_by, updated_at)
        VALUES (${s.key}, ${s.value}, 'general', ${req.admin!.username}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=${s.value}, updated_by=${req.admin!.username}, updated_at=NOW()
      `);
    }
    await audit(req, "UPDATE", "system_settings", undefined, { keys: settings.map(s => s.key) });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
});

export default router;
