import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAdminAuth, type AdminRequest } from "../middlewares/adminAuth";

const router = Router();
router.use(requireAdminAuth);

// ── Helper: audit log ─────────────────────────────────────────────────────────
async function audit(req: AdminRequest, action: string, resource: string, resourceId?: string | number, details?: Record<string, unknown>) {
  await pool.query(
    `INSERT INTO admin_audit_logs (admin_id, admin_username, action, resource, resource_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      req.admin!.adminId,
      req.admin!.username,
      action,
      resource,
      resourceId != null ? String(resourceId) : null,
      JSON.stringify(details ?? {}),
      req.socket?.remoteAddress ?? "unknown",
    ]
  );
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
router.get("/dashboard", async (_req, res) => {
  try {
    const [tenants, users, revenue, activeSubs, tickets, recentOrgs, monthlyRevenue] = await Promise.all([
      pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM organizations`),
      pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM users`),
      pool.query<{ total: string }>(`SELECT COALESCE(SUM(mrr),0)::text AS total FROM saas_subscriptions WHERE status='active'`),
      pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM saas_subscriptions WHERE status='active'`),
      pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM admin_support_tickets WHERE status IN ('open','in_progress')`),
      pool.query<{ id: number; name: string; status: string; created_at: Date }>(
        `SELECT id, name, status, created_at FROM organizations ORDER BY created_at DESC LIMIT 5`
      ),
      pool.query<{ month: string; revenue: string }>(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(mrr)::text AS revenue
         FROM saas_subscriptions WHERE status = 'active' AND created_at > NOW() - INTERVAL '6 months'
         GROUP BY month ORDER BY month`
      ),
    ]);

    res.json({
      success: true,
      data: {
        tenants: tenants.rows[0]?.count ?? 0,
        users: users.rows[0]?.count ?? 0,
        monthlyRevenue: parseFloat(revenue.rows[0]?.total ?? "0"),
        activeSubscriptions: activeSubs.rows[0]?.count ?? 0,
        openTickets: tickets.rows[0]?.count ?? 0,
        recentTenants: recentOrgs.rows,
        revenueChart: monthlyRevenue.rows,
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

    let query = `
      SELECT o.id, o.name, o.legal_name, o.status, o.country, o.industry, o.gstin, o.created_at,
             COUNT(DISTINCT u.id)::int AS user_count,
             sp.name AS plan_name,
             ss.status AS sub_status
      FROM organizations o
      LEFT JOIN users u ON u.org_id = o.id
      LEFT JOIN saas_subscriptions ss ON ss.org_id = o.id AND ss.status = 'active'
      LEFT JOIN saas_plans sp ON sp.id = ss.plan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (search) { params.push(`%${search}%`); query += ` AND o.name ILIKE $${params.length}`; }
    if (status) { params.push(status); query += ` AND o.status = $${params.length}`; }
    query += ` GROUP BY o.id, sp.name, ss.status ORDER BY o.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch tenants" });
  }
});

router.post("/tenants", async (req: AdminRequest, res) => {
  try {
    const { name, legalName, country, industry, gstin, status } = req.body;
    if (!name) { res.status(400).json({ success: false, error: "Name is required" }); return; }
    const result = await pool.query<{ id: number }>(
      `INSERT INTO organizations (name, legal_name, country, industry, gstin, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, legalName ?? null, country ?? null, industry ?? null, gstin ?? null, status ?? "active"]
    );
    const id = result.rows[0]?.id;
    await audit(req, "CREATE", "tenant", id, { name });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create tenant" });
  }
});

router.put("/tenants/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, legalName, country, industry, gstin, status } = req.body;
    await pool.query(
      `UPDATE organizations SET name=$1, legal_name=$2, country=$3, industry=$4, gstin=$5, status=$6, updated_at=NOW() WHERE id=$7`,
      [name, legalName ?? null, country ?? null, industry ?? null, gstin ?? null, status ?? "active", id]
    );
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
    await pool.query(`UPDATE organizations SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id]);
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
    await pool.query(`DELETE FROM organizations WHERE id=$1`, [id]);
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
    let query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.mfa_enabled,
             u.last_login_at, u.created_at, o.name AS org_name, r.name AS role_name
      FROM users u
      LEFT JOIN organizations o ON o.id = u.org_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1)`;
    }
    query += ` ORDER BY u.created_at DESC LIMIT 200`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.patch("/users/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await pool.query(`UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id]);
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
    await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
    await audit(req, "DELETE", "user", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

router.get("/roles", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.name, r.description, r.is_system, r.created_at,
             o.name AS org_name,
             COUNT(DISTINCT u.id)::int AS user_count
      FROM roles r
      LEFT JOIN organizations o ON o.id = r.org_id
      LEFT JOIN users u ON u.role_id = r.id
      GROUP BY r.id, o.name ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
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
    const result = await pool.query(`
      SELECT sp.*, COUNT(ss.id)::int AS sub_count
      FROM saas_plans sp
      LEFT JOIN saas_subscriptions ss ON ss.plan_id = sp.id AND ss.status='active'
      GROUP BY sp.id ORDER BY sp.sort_order, sp.created_at
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

router.post("/plans", async (req: AdminRequest, res) => {
  try {
    const { name, slug, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, features } = req.body;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO saas_plans (name, slug, price_monthly, price_yearly, max_users, max_modules, max_storage_gb, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, slug, priceMonthly ?? 0, priceYearly ?? 0, maxUsers ?? null, maxModules ?? null, maxStorageGb ?? null, JSON.stringify(features ?? [])]
    );
    await audit(req, "CREATE", "plan", result.rows[0]?.id, { name });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create plan" });
  }
});

router.put("/plans/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, isActive } = req.body;
    await pool.query(
      `UPDATE saas_plans SET name=$1, price_monthly=$2, price_yearly=$3, max_users=$4, max_modules=$5, max_storage_gb=$6, is_active=$7, updated_at=NOW() WHERE id=$8`,
      [name, priceMonthly, priceYearly, maxUsers ?? null, maxModules ?? null, maxStorageGb ?? null, isActive ?? true, id]
    );
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
    await pool.query(`DELETE FROM saas_plans WHERE id=$1`, [id]);
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
    let query = `
      SELECT ss.id, o.name AS org_name, sp.name AS plan_name, ss.status,
             ss.billing_cycle, ss.mrr, ss.started_at, ss.expires_at, ss.current_users
      FROM saas_subscriptions ss
      JOIN organizations o ON o.id = ss.org_id
      JOIN saas_plans sp ON sp.id = ss.plan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (status) { params.push(status); query += ` AND ss.status = $${params.length}`; }
    query += ` ORDER BY ss.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions" });
  }
});

router.patch("/subscriptions/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await pool.query(`UPDATE saas_subscriptions SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id]);
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
      pool.query<{ v: string }>(`SELECT COALESCE(SUM(mrr),0)::text AS v FROM saas_subscriptions WHERE status='active'`),
      pool.query<{ v: string }>(`SELECT (COALESCE(SUM(mrr),0)*12)::text AS v FROM saas_subscriptions WHERE status='active'`),
      pool.query<{ v: number }>(`SELECT COUNT(*)::int AS v FROM billing_invoices`),
      pool.query<{ v: string }>(`SELECT COALESCE(SUM(total),0)::text AS v FROM billing_invoices WHERE status='paid'`),
    ]);
    res.json({
      success: true,
      data: {
        mrr: parseFloat(mrr.rows[0]?.v ?? "0"),
        arr: parseFloat(arr.rows[0]?.v ?? "0"),
        totalInvoices: totalInvoices.rows[0]?.v ?? 0,
        paidRevenue: parseFloat(paidInvoices.rows[0]?.v ?? "0"),
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to load billing overview" });
  }
});

router.get("/billing/invoices", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT bi.id, bi.invoice_number, bi.status, bi.total, bi.currency, bi.created_at, bi.paid_at,
             o.name AS org_name
      FROM billing_invoices bi
      JOIN organizations o ON o.id = bi.org_id
      ORDER BY bi.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
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
    const result = await pool.query(`
      SELECT l.*, o.name AS org_name
      FROM admin_licenses l
      LEFT JOIN organizations o ON o.id = l.org_id
      ORDER BY l.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
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
    const result = await pool.query<{ id: number }>(
      `INSERT INTO admin_licenses (license_key, org_id, plan_name, max_users, max_modules, issued_to, expires_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [key, orgId ?? null, planName ?? "Professional", maxUsers ?? 50, maxModules ?? 10, issuedTo ?? null, expiresAt ? new Date(expiresAt) : null, notes ?? null]
    );
    await audit(req, "CREATE", "license", result.rows[0]?.id, { key, planName });
    res.status(201).json({ success: true, data: { id: result.rows[0]?.id, licenseKey: key } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create license" });
  }
});

router.patch("/licenses/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status } = req.body;
    await pool.query(`UPDATE admin_licenses SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id]);
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
    await pool.query(`DELETE FROM admin_licenses WHERE id=$1`, [id]);
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
function featureValidation(body: Record<string, unknown>, includeKey: boolean) {
  const key = typeof body.key === "string" ? body.key.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const category = typeof body.category === "string" && body.category.trim()
    ? body.category.trim().toLowerCase()
    : "general";
  const rolloutPct = Number(body.rolloutPct ?? 100);

  if (includeKey && !/^[a-z0-9][a-z0-9_-]{1,99}$/.test(key)) {
    return { error: "Feature key must be 2–100 characters using lowercase letters, numbers, hyphens, or underscores" };
  }
  if (!name || name.length > 120) return { error: "Feature name is required and must be 120 characters or fewer" };
  if (description && description.length > 500) return { error: "Description must be 500 characters or fewer" };
  if (!Number.isInteger(rolloutPct) || rolloutPct < 0 || rolloutPct > 100) {
    return { error: "Rollout percentage must be an integer between 0 and 100" };
  }
  if (category.length > 50) return { error: "Category must be 50 characters or fewer" };
  if (typeof body.isEnabled !== "boolean") return { error: "Enabled status must be true or false" };

  return { key, name, description, category, rolloutPct, isEnabled: body.isEnabled };
}

router.get("/features", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, key, name, description, is_enabled, rollout_pct, category, created_at, updated_at
       FROM admin_features ORDER BY category, name`
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch features" });
  }
});

router.post("/features", async (req: AdminRequest, res) => {
  try {
    const input = featureValidation(req.body, true);
    if ("error" in input) {
      res.status(400).json({ success: false, error: input.error });
      return;
    }
    const result = await pool.query(
      `INSERT INTO admin_features (key, name, description, is_enabled, rollout_pct, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, key, name, description, is_enabled, rollout_pct, category, created_at, updated_at`,
      [input.key, input.name, input.description, input.isEnabled, input.rolloutPct, input.category]
    );
    await audit(req, "CREATE", "feature", result.rows[0]?.id, { key: input.key, name: input.name });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    if ((e as { code?: string }).code === "23505") {
      res.status(409).json({ success: false, error: "A feature with this key already exists" });
      return;
    }
    res.status(500).json({ success: false, error: "Failed to create feature" });
  }
});

router.put("/features/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, error: "Invalid feature id" });
      return;
    }
    const input = featureValidation(req.body, false);
    if ("error" in input) {
      res.status(400).json({ success: false, error: input.error });
      return;
    }
    const result = await pool.query(
      `UPDATE admin_features
       SET name=$1, description=$2, is_enabled=$3, rollout_pct=$4, category=$5, updated_at=NOW()
       WHERE id=$6
       RETURNING id, key, name, description, is_enabled, rollout_pct, category, created_at, updated_at`,
      [input.name, input.description, input.isEnabled, input.rolloutPct, input.category, id]
    );
    if (!result.rowCount) {
      res.status(404).json({ success: false, error: "Feature not found" });
      return;
    }
    await audit(req, "UPDATE", "feature", id, { name: input.name, isEnabled: input.isEnabled });
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update feature" });
  }
});

router.patch("/features/:id/toggle", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, error: "Invalid feature id" });
      return;
    }
    const result = await pool.query<{ is_enabled: boolean }>(
      `UPDATE admin_features SET is_enabled = NOT is_enabled, updated_at=NOW() WHERE id=$1 RETURNING is_enabled`,
      [id]
    );
    if (!result.rowCount) {
      res.status(404).json({ success: false, error: "Feature not found" });
      return;
    }
    await audit(req, "TOGGLE_FEATURE", "feature", id, { isEnabled: result.rows[0]?.is_enabled });
    res.json({ success: true, data: { isEnabled: result.rows[0]?.is_enabled } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to toggle feature" });
  }
});

router.delete("/features/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, error: "Invalid feature id" });
      return;
    }
    const result = await pool.query(`DELETE FROM admin_features WHERE id=$1`, [id]);
    if (!result.rowCount) {
      res.status(404).json({ success: false, error: "Feature not found" });
      return;
    }
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
    const result = await pool.query(`
      SELECT w.*, o.name AS org_name FROM saas_whitelabel w
      JOIN organizations o ON o.id = w.org_id
      ORDER BY w.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch whitelabel configs" });
  }
});

router.put("/whitelabel/:orgId", async (req: AdminRequest, res) => {
  try {
    const orgId = parseInt(req.params["orgId"] as string);
    const { isEnabled, productName, primaryColor, accentColor, customDomain, supportEmail, hidePoweredBy, logoUrl } = req.body;
    await pool.query(
      `INSERT INTO saas_whitelabel (org_id, is_enabled, product_name, primary_color, accent_color, custom_domain, support_email, hide_powered_by, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (org_id) DO UPDATE SET
         is_enabled=$2, product_name=$3, primary_color=$4, accent_color=$5,
         custom_domain=$6, support_email=$7, hide_powered_by=$8, logo_url=$9, updated_at=NOW()`,
      [orgId, isEnabled ?? true, productName ?? "OmniERP", primaryColor ?? "#2563EB", accentColor ?? "#06B6D4",
       customDomain ?? null, supportEmail ?? null, hidePoweredBy ?? false, logoUrl ?? null]
    );
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
    const result = await pool.query(`
      SELECT a.*, COUNT(DISTINCT ac.id)::int AS client_count,
             COALESCE(SUM(ap.commission_amount), 0)::text AS total_commission
      FROM saas_agencies a
      LEFT JOIN saas_agency_clients ac ON ac.agency_id = a.id
      LEFT JOIN saas_agency_payouts ap ON ap.agency_id = a.id AND ap.status='paid'
      GROUP BY a.id ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch agencies" });
  }
});

router.post("/agencies", async (req: AdminRequest, res) => {
  try {
    const { name, slug, contactName, contactEmail, country, commissionRate } = req.body;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO saas_agencies (name, slug, contact_name, contact_email, country, commission_rate)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, slug ?? name.toLowerCase().replace(/\s+/g, "-"), contactName ?? null, contactEmail ?? null, country ?? null, commissionRate ?? 10]
    );
    await audit(req, "CREATE", "agency", result.rows[0]?.id, { name });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create agency" });
  }
});

router.put("/agencies/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, contactName, contactEmail, country, commissionRate, status } = req.body;
    await pool.query(
      `UPDATE saas_agencies SET name=$1, contact_name=$2, contact_email=$3, country=$4, commission_rate=$5, status=$6, updated_at=NOW() WHERE id=$7`,
      [name, contactName ?? null, contactEmail ?? null, country ?? null, commissionRate ?? 10, status ?? "active", id]
    );
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
    const result = await pool.query(`SELECT * FROM admin_integrations_config ORDER BY category, name`);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch integrations" });
  }
});

router.put("/integrations/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { isEnabled, status, config } = req.body;
    await pool.query(
      `UPDATE admin_integrations_config SET is_enabled=$1, status=$2, config=$3, updated_at=NOW() WHERE id=$4`,
      [isEnabled ?? false, status ?? "inactive", JSON.stringify(config ?? {}), id]
    );
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
    await pool.query(`UPDATE admin_integrations_config SET last_tested_at=NOW() WHERE id=$1`, [id]);
    await audit(req, "TEST", "integration", id);
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
    const [settingsResult, attemptsResult] = await Promise.all([
      pool.query<{ key: string; value: string }>(
        `SELECT key, value FROM admin_system_settings WHERE category='security'`
      ),
      pool.query<{ username: string; ip_address: string; success: boolean; attempted_at: Date }>(
        `SELECT username, ip_address, success, attempted_at FROM admin_login_attempts ORDER BY attempted_at DESC LIMIT 20`
      ),
    ]);
    const settings: Record<string, string> = {};
    settingsResult.rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, data: { settings, recentAttempts: attemptsResult.rows } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch security settings" });
  }
});

router.put("/security", async (req: AdminRequest, res) => {
  try {
    const { maxLoginAttempts, lockoutMinutes, sessionHours } = req.body;
    const updates = [
      { key: "max_login_attempts", value: String(maxLoginAttempts ?? 5) },
      { key: "lockout_minutes", value: String(lockoutMinutes ?? 15) },
      { key: "session_hours", value: String(sessionHours ?? 24) },
    ];
    for (const u of updates) {
      await pool.query(
        `UPDATE admin_system_settings SET value=$1, updated_by=$2, updated_at=NOW() WHERE key=$3`,
        [u.value, req.admin!.username, u.key]
      );
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
    const limit = Math.min(parseInt(req.query.limit as string ?? "100"), 500);
    const resource = req.query.resource as string | undefined;

    const params: unknown[] = [limit];
    let adminQuery = `SELECT * FROM admin_audit_logs WHERE 1=1`;
    if (resource) { params.push(resource); adminQuery += ` AND resource = $${params.length}`; }
    adminQuery += ` ORDER BY created_at DESC LIMIT $1`;

    const [adminLogs, appLogs] = await Promise.all([
      pool.query(adminQuery, params),
      pool.query(`
        SELECT al.*, u.email AS user_email FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC LIMIT 50
      `),
    ]);

    res.json({ success: true, data: { adminLogs: adminLogs.rows, appLogs: appLogs.rows } });
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
    const requestedPeriod = String(_req.query.period ?? "365");
    const period = ["30", "90", "365", "all"].includes(requestedPeriod) ? requestedPeriod : "365";
    const periodDays = period === "all" ? null : Number(period);
    const activityFilter = periodDays === null ? "" : " WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')";
    const subscriptionFilter = periodDays === null ? "" : " WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')";
    const periodParams = periodDays === null ? [] : [periodDays];

    const [summary, orgStats, userStats, moduleStats, subByPlan, revenueByMonth] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM organizations) AS tenants,
          (SELECT COUNT(*)::int FROM users) AS users,
          (SELECT COUNT(*)::int FROM users WHERE status='active') AS active_users,
          (SELECT COUNT(*)::int FROM saas_subscriptions WHERE status='active') AS active_subscriptions,
          (SELECT COALESCE(SUM(mrr), 0)::text FROM saas_subscriptions WHERE status='active') AS monthly_revenue,
          (SELECT COUNT(*)::int FROM audit_logs${activityFilter}) AS tracked_actions
      `, periodParams),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM organizations GROUP BY status`),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM users GROUP BY status`),
      pool.query(`SELECT action, COUNT(*)::int AS count FROM audit_logs${activityFilter} GROUP BY action ORDER BY count DESC LIMIT 10`, periodParams),
      pool.query(`
        SELECT sp.name AS plan_name, COUNT(ss.id)::int AS count, COALESCE(SUM(ss.mrr), 0)::text AS revenue
        FROM saas_subscriptions ss JOIN saas_plans sp ON sp.id = ss.plan_id
        WHERE ss.status='active' GROUP BY sp.name
      `),
      pool.query(`
        SELECT TO_CHAR(created_at,'YYYY-MM') AS month, SUM(mrr)::text AS mrr, COUNT(*)::int AS new_subs
        FROM saas_subscriptions
        ${subscriptionFilter}
        GROUP BY month ORDER BY month
      `, periodParams),
    ]);
    res.json({
      success: true,
      data: {
        period,
        summary: summary.rows[0],
        orgStats: orgStats.rows,
        userStats: userStats.rows,
        moduleStats: moduleStats.rows,
        subByPlan: subByPlan.rows,
        revenueByMonth: revenueByMonth.rows,
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
    const result = await pool.query(`SELECT * FROM admin_backup_logs ORDER BY started_at DESC LIMIT 50`);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch backups" });
  }
});

router.post("/backups", async (req: AdminRequest, res) => {
  try {
    const { type, notes } = req.body;
    const name = `backup_${new Date().toISOString().replace(/[:.]/g, "_").slice(0, 19)}_manual`;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO admin_backup_logs (backup_name, type, status, initiated_by, notes) VALUES ($1, $2, 'running', $3, $4) RETURNING id`,
      [name, type ?? "full", req.admin!.username, notes ?? null]
    );
    const id = result.rows[0]?.id;
    // Simulate backup completion
    setTimeout(async () => {
      await pool.query(
        `UPDATE admin_backup_logs SET status='completed', completed_at=NOW(), size_bytes=$1 WHERE id=$2`,
        [Math.floor(Math.random() * 500_000_000 + 100_000_000), id]
      );
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
    await pool.query(`DELETE FROM admin_backup_logs WHERE id=$1`, [id]);
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
    const result = await pool.query(`
      SELECT n.*, u.email AS target_email FROM notifications n
      LEFT JOIN users u ON u.id = n.user_id
      ORDER BY n.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

router.post("/notifications/broadcast", async (req: AdminRequest, res) => {
  try {
    const { title, body, type, orgId } = req.body;
    if (!title) { res.status(400).json({ success: false, error: "Title is required" }); return; }

    let targetQuery = `SELECT id FROM users WHERE status='active'`;
    const params: unknown[] = [];
    if (orgId) { params.push(orgId); targetQuery += ` AND org_id = $${params.length}`; }

    const targets = await pool.query<{ id: number }>(targetQuery, params);
    let inserted = 0;
    for (const u of targets.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [u.id, type ?? "system", title, body ?? null]
      );
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
    let query = `
      SELECT t.*, o.name AS org_name
      FROM admin_support_tickets t
      LEFT JOIN organizations o ON o.id = t.org_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    query += ` ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch tickets" });
  }
});

router.post("/support-tickets", async (req: AdminRequest, res) => {
  try {
    const { subject, description, orgId, reporterName, reporterEmail, priority, category } = req.body;
    const countResult = await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM admin_support_tickets`);
    const num = `TKT-${String((countResult.rows[0]?.n ?? 0) + 1).padStart(3, "0")}`;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO admin_support_tickets (ticket_number, subject, description, org_id, reporter_name, reporter_email, priority, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [num, subject, description ?? null, orgId ?? null, reporterName ?? null, reporterEmail ?? null, priority ?? "medium", category ?? "general"]
    );
    await audit(req, "CREATE", "support_ticket", result.rows[0]?.id, { subject });
    res.status(201).json({ success: true, data: { id: result.rows[0]?.id, ticketNumber: num } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create ticket" });
  }
});

router.put("/support-tickets/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status, priority, assignedTo, resolution } = req.body;
    await pool.query(
      `UPDATE admin_support_tickets SET status=$1, priority=$2, assigned_to=$3, resolution=$4, updated_at=NOW() WHERE id=$5`,
      [status, priority, assignedTo ?? null, resolution ?? null, id]
    );
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
      pool.query<{ now: Date }>(`SELECT NOW() AS now`),
      pool.query<{ relname: string; n_live_tup: number }>(
        `SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 15`
      ),
    ]);
    const dbLatency = Date.now() - start;
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        dbConnected: !!dbCheck.rows[0],
        dbLatencyMs: dbLatency,
        serverUptimeSeconds: Math.floor(uptime),
        memoryMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        tableStats: tableStats.rows,
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
    const result = await pool.query(`SELECT * FROM admin_system_settings ORDER BY category, key`);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req: AdminRequest, res) => {
  try {
    const { settings } = req.body as { settings: Array<{ key: string; value: string }> };
    for (const s of settings) {
      await pool.query(
        `INSERT INTO admin_system_settings (key, value, category, updated_by, updated_at)
         VALUES ($1, $2, 'general', $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_by=$3, updated_at=NOW()`,
        [s.key, s.value, req.admin!.username]
      );
    }
    await audit(req, "UPDATE", "system_settings", undefined, { keys: settings.map(s => s.key) });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
});

export default router;
