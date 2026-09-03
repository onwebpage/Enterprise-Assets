import { Router } from "express";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pool } from "@workspace/db";
import { requireAdminAuth, type AdminRequest } from "../middlewares/adminAuth";
import { hashPassword } from "../lib/password";

const router = Router();
router.use(requireAdminAuth);
const execFileAsync = promisify(execFile);
const backupDirectory = process.env.ADMIN_BACKUP_DIR ?? "/tmp/omnierp-backups";
const tenantStatuses = new Set(["active", "suspended", "inactive"]);
const userStatuses = new Set(["active", "inactive", "suspended"]);
const subscriptionStatuses = new Set(["active", "trial", "suspended", "cancelled"]);
const licenseStatuses = new Set(["active", "revoked", "expired"]);

router.get("/payment-submissions", async (req, res) => {
  try {
    const status = String(req.query.status ?? "").trim();
    const params: unknown[] = [];
    let filter = "";
    if (["pending", "approved", "rejected"].includes(status)) { params.push(status); filter = `WHERE p.status=$${params.length}`; }
    const result = await pool.query(`SELECT p.id,p.org_id,p.user_id,p.subscription_id,p.amount,p.currency,p.payment_method,p.utr,p.paid_at,p.proof_data,p.proof_file_name,p.notes,p.status,p.reviewed_by,p.reviewed_at,p.rejection_reason,p.billing_invoice_id,p.created_at,o.name AS org_name,u.email,u.first_name,u.last_name,bs.status AS subscription_status FROM payment_submissions p JOIN organizations o ON o.id=p.org_id JOIN users u ON u.id=p.user_id LEFT JOIN billing_subscriptions bs ON bs.id=p.subscription_id ${filter} ORDER BY CASE WHEN p.status='pending' THEN 0 ELSE 1 END,p.created_at DESC`, params);
    res.json({ success: true, data: result.rows });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch payment submissions" }); }
});

router.post("/payment-submissions/:id/decision", async (req: AdminRequest, res) => {
  const id = positiveId(req.params.id);
  const decision = String(req.body?.decision ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) { res.status(400).json({ success: false, error: "Valid payment and decision are required" }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const payment = await client.query(`SELECT * FROM payment_submissions WHERE id=$1 FOR UPDATE`, [id]);
    const row = payment.rows[0];
    if (!row) { await client.query("ROLLBACK"); res.status(404).json({ success: false, error: "Payment submission not found" }); return; }
    if (row.status !== "pending") { await client.query("ROLLBACK"); res.status(409).json({ success: false, error: "Payment has already been reviewed" }); return; }
    if (decision === "rejected") {
      const updated = await client.query(`UPDATE payment_submissions SET status='rejected',rejection_reason=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`, [id, String(req.body?.reason ?? "Payment proof could not be verified").slice(0, 1000), req.admin!.adminId]);
      await client.query("COMMIT"); res.json({ success: true, data: updated.rows[0] }); return;
    }
    let billingInvoiceId: number | null = null;
    if (row.subscription_id) {
      const invoice = await client.query(`INSERT INTO billing_invoices (org_id,subscription_id,invoice_number,status,total,currency,paid_at,line_items) VALUES ($1,$2,$3,'paid',$4,$5,NOW(),$6) RETURNING id`, [row.org_id, row.subscription_id, `PAY-${row.id}-${row.utr}`, row.amount, row.currency, JSON.stringify([{ description: 'Razorpay / UPI payment', amount: row.amount, utr: row.utr }])]);
      billingInvoiceId = invoice.rows[0].id;
      await client.query(`UPDATE billing_subscriptions SET status='active',current_period_start=NOW(),current_period_end=CASE WHEN billing_cycle='yearly' THEN NOW()+INTERVAL '1 year' ELSE NOW()+INTERVAL '1 month' END,cancelled_at=NULL,cancel_at_period_end=false,updated_at=NOW() WHERE id=$1`, [row.subscription_id]);
      await client.query(`UPDATE saas_subscriptions SET status='active',started_at=NOW(),expires_at=CASE WHEN billing_cycle='yearly' THEN NOW()+INTERVAL '1 year' ELSE NOW()+INTERVAL '1 month' END,cancelled_at=NULL,updated_at=NOW() WHERE org_id=$1`, [row.org_id]);
    }
    await client.query(`UPDATE users SET payment_status='paid',status=CASE WHEN status='pending' THEN 'active' ELSE status END,updated_at=NOW() WHERE id=$1`, [row.user_id]);
    const updated = await client.query(`UPDATE payment_submissions SET status='approved',reviewed_by=$2,reviewed_at=NOW(),billing_invoice_id=$3,updated_at=NOW() WHERE id=$1 RETURNING *`, [id, req.admin!.adminId, billingInvoiceId]);
    await client.query(`INSERT INTO admin_audit_logs (admin_id,admin_username,action,resource,resource_id,details) VALUES ($1,$2,'APPROVE','payment_submission',$3,$4)`, [req.admin!.adminId, req.admin!.username, id, JSON.stringify({ amount: row.amount, utr: row.utr, orgId: row.org_id })]);
    await client.query("COMMIT"); res.json({ success: true, data: updated.rows[0] });
  } catch (e) { await client.query("ROLLBACK").catch(() => undefined); console.error(e); res.status(500).json({ success: false, error: "Failed to approve payment" }); } finally { client.release(); }
});

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function textField(value: unknown, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

async function runDatabaseBackup(id: number, name: string, type: string, initiatedBy: string) {
  const outputPath = path.join(backupDirectory, `${name}.dump`);
  try {
    const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Database connection is not configured");
    await mkdir(backupDirectory, { recursive: true });
    const args = ["--dbname", databaseUrl, "--format=custom", "--file", outputPath];
    if (type === "schema") args.push("--schema-only");
    await execFileAsync("pg_dump", args, { timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 });
    const file = await stat(outputPath);
    await pool.query(
      `UPDATE admin_backup_logs SET status='completed', completed_at=NOW(), size_bytes=$1, updated_at=NOW() WHERE id=$2`,
      [file.size, id],
    );
  } catch (error) {
    await pool.query(
      `UPDATE admin_backup_logs SET status='failed', notes=COALESCE(notes || E'\n', '') || $1, updated_at=NOW() WHERE id=$2`,
      [`Backup failed: ${error instanceof Error ? error.message : "unknown error"}`, id],
    ).catch(() => undefined);
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_username, action, resource, resource_id, details)
       VALUES ($1, 'BACKUP_FAILED', 'backup', $2, $3)`,
      [initiatedBy, id, JSON.stringify({ type })],
    ).catch(() => undefined);
  }
}

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
    const normalizedName = textField(name, 200);
    if (!normalizedName) { res.status(400).json({ success: false, error: "Name is required and must be 200 characters or fewer" }); return; }
    if (status != null && !tenantStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid tenant status" }); return; }
    const result = await pool.query<{ id: number }>(
      `INSERT INTO organizations (name, legal_name, country, industry, gstin, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [normalizedName, textField(legalName, 200), textField(country, 100), textField(industry, 150), textField(gstin, 50), status ?? "active"]
    );
    const id = result.rows[0]?.id;
    await audit(req, "CREATE", "tenant", id, { name: normalizedName });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create tenant" });
  }
});

router.put("/tenants/:id", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    const { name, legalName, country, industry, gstin, status } = req.body;
    const normalizedName = textField(name, 200);
    if (!id || !normalizedName) { res.status(400).json({ success: false, error: "A valid id and name are required" }); return; }
    if (status != null && !tenantStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid tenant status" }); return; }
    const existing = await pool.query("SELECT 1 FROM organizations WHERE id=$1", [id]);
    if (!existing.rowCount) { res.status(404).json({ success: false, error: "Tenant not found" }); return; }
    await pool.query(
      `UPDATE organizations SET name=$1, legal_name=$2, country=$3, industry=$4, gstin=$5, status=$6, updated_at=NOW() WHERE id=$7`,
      [normalizedName, textField(legalName, 200), textField(country, 100), textField(industry, 150), textField(gstin, 50), status ?? "active", id]
    );
    await audit(req, "UPDATE", "tenant", id, { name: normalizedName });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update tenant" });
  }
});

router.patch("/tenants/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    const { status } = req.body;
    if (!id || !tenantStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid tenant id or status" }); return; }
    const existing = await pool.query("SELECT 1 FROM organizations WHERE id=$1", [id]);
    if (!existing.rowCount) { res.status(404).json({ success: false, error: "Tenant not found" }); return; }
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
    const id = positiveId(req.params["id"]);
    if (!id) { res.status(400).json({ success: false, error: "Invalid tenant id" }); return; }
    const dependencies = await pool.query<{ users: number; subscriptions: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE org_id=$1) AS users,
         (SELECT COUNT(*)::int FROM saas_subscriptions WHERE org_id=$1) AS subscriptions`,
      [id],
    );
    const dependencyRow = dependencies.rows[0];
    if (!dependencyRow) { res.status(404).json({ success: false, error: "Tenant not found" }); return; }
    if (dependencyRow.users > 0 || dependencyRow.subscriptions > 0) {
      res.status(409).json({ success: false, error: "Tenant cannot be deleted while users or subscriptions are attached" });
      return;
    }
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
       SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.org_id, u.role_id, u.mfa_enabled,
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

router.post("/users", async (req: AdminRequest, res) => {
  try {
    const { email, password, firstName, lastName, orgId, roleId, status, mfaEnabled } = req.body;
    const normalizedEmail = textField(email, 320)?.toLowerCase();
    const normalizedFirstName = textField(firstName, 100);
    const normalizedLastName = textField(lastName, 100);
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !normalizedFirstName || !normalizedLastName || typeof password !== "string" || password.length < 12 || password.length > 200) {
      res.status(400).json({ success: false, error: "Valid email, first and last name, and a 12–200 character password are required" });
      return;
    }
    if (status != null && !userStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid user status" }); return; }
    const organizationId = orgId == null || orgId === "" ? null : positiveId(orgId);
    const role = roleId == null || roleId === "" ? null : positiveId(roleId);
    if (orgId != null && orgId !== "" && !organizationId) { res.status(400).json({ success: false, error: "Invalid organization id" }); return; }
    if (roleId != null && roleId !== "" && !role) { res.status(400).json({ success: false, error: "Invalid role id" }); return; }
    if (organizationId && !(await pool.query("SELECT 1 FROM organizations WHERE id=$1", [organizationId])).rowCount) {
      res.status(400).json({ success: false, error: "Organization not found" }); return;
    }
    if (role && !(await pool.query("SELECT 1 FROM roles WHERE id=$1", [role])).rowCount) {
      res.status(400).json({ success: false, error: "Role not found" }); return;
    }
    if (role) {
      const roleResult = await pool.query<{ org_id: number | null }>("SELECT org_id FROM roles WHERE id=$1", [role]);
      const roleOrgId = roleResult.rows[0]?.org_id;
      if (roleOrgId != null && roleOrgId !== organizationId) {
        res.status(400).json({ success: false, error: "Role belongs to a different organization" }); return;
      }
    }
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, org_id, role_id, status, mfa_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, email, first_name, last_name, org_id, role_id, status, mfa_enabled, created_at`,
      [normalizedEmail, passwordHash, normalizedFirstName, normalizedLastName, organizationId, role, status ?? "active", mfaEnabled === true],
    );
    await audit(req, "CREATE", "user", result.rows[0]?.id, { email: normalizedEmail });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      res.status(409).json({ success: false, error: "Email already exists" }); return;
    }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
});

router.put("/users/:id", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    if (!id) { res.status(400).json({ success: false, error: "Invalid user id" }); return; }
    const { email, password, firstName, lastName, orgId, roleId, status, mfaEnabled } = req.body;
    const updates: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => { values.push(value); updates.push(`${sql}=$${values.length}`); };
    if (email !== undefined) {
      const normalizedEmail = textField(email, 320)?.toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { res.status(400).json({ success: false, error: "Invalid email" }); return; }
      add("email", normalizedEmail);
    }
    if (firstName !== undefined) { const value = textField(firstName, 100); if (!value) { res.status(400).json({ success: false, error: "First name is required" }); return; } add("first_name", value); }
    if (lastName !== undefined) { const value = textField(lastName, 100); if (!value) { res.status(400).json({ success: false, error: "Last name is required" }); return; } add("last_name", value); }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 12 || password.length > 200) { res.status(400).json({ success: false, error: "Password must be 12–200 characters" }); return; }
      add("password_hash", await hashPassword(password));
    }
    if (status !== undefined) { if (!userStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid user status" }); return; } add("status", status); }
    if (mfaEnabled !== undefined) { if (typeof mfaEnabled !== "boolean") { res.status(400).json({ success: false, error: "MFA status must be boolean" }); return; } add("mfa_enabled", mfaEnabled); }
    if (orgId !== undefined) { const value = orgId === null || orgId === "" ? null : positiveId(orgId); if (orgId !== null && orgId !== "" && !value) { res.status(400).json({ success: false, error: "Invalid organization id" }); return; } add("org_id", value); }
    if (roleId !== undefined) {
      const value = roleId === null || roleId === "" ? null : positiveId(roleId);
      if (roleId !== null && roleId !== "" && !value) { res.status(400).json({ success: false, error: "Invalid role id" }); return; }
      if (value) {
        const roleResult = await pool.query<{ org_id: number | null }>("SELECT org_id FROM roles WHERE id=$1", [value]);
        if (!roleResult.rowCount) { res.status(400).json({ success: false, error: "Role not found" }); return; }
        if (roleResult.rows[0]?.org_id != null && orgId !== undefined) {
          const organizationId = orgId === null || orgId === "" ? null : positiveId(orgId);
          if (organizationId !== roleResult.rows[0].org_id) {
            res.status(400).json({ success: false, error: "Role belongs to a different organization" }); return;
          }
        }
      }
      add("role_id", value);
    }
    if (!updates.length) { res.status(400).json({ success: false, error: "No changes supplied" }); return; }
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")}, updated_at=NOW() WHERE id=$${values.length}
       RETURNING id, email, first_name, last_name, org_id, role_id, status, mfa_enabled, updated_at`,
      values,
    );
    if (!result.rowCount) { res.status(404).json({ success: false, error: "User not found" }); return; }
    await audit(req, "UPDATE", "user", id, { fields: updates.map(field => field.split("=")[0]) });
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") { res.status(409).json({ success: false, error: "Email already exists" }); return; }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

router.patch("/users/:id/status", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    const { status } = req.body;
    if (!id || !userStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid user id or status" }); return; }
    const existing = await pool.query("SELECT 1 FROM users WHERE id=$1", [id]);
    if (!existing.rowCount) { res.status(404).json({ success: false, error: "User not found" }); return; }
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
    const id = positiveId(req.params["id"]);
    if (!id) { res.status(400).json({ success: false, error: "Invalid user id" }); return; }
    const result = await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
    if (!result.rowCount) { res.status(404).json({ success: false, error: "User not found" }); return; }
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
      SELECT r.id, r.name, r.description, r.is_system, r.org_id, r.created_at,
             o.name AS org_name,
             COUNT(DISTINCT u.id)::int AS user_count,
             COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
               'module', p.module, 'canView', p.can_view, 'canCreate', p.can_create,
               'canEdit', p.can_edit, 'canDelete', p.can_delete
             )) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions
      FROM roles r
      LEFT JOIN organizations o ON o.id = r.org_id
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN permissions p ON p.role_id = r.id
      GROUP BY r.id, o.name ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch roles" });
  }
});

router.get("/permission-modules", async (_req, res) => {
  try {
    const result = await pool.query<{ module: string }>("SELECT DISTINCT module FROM permissions WHERE module IS NOT NULL ORDER BY module");
    res.json({ success: true, data: result.rows.map(row => row.module) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch permission modules" });
  }
});

router.put("/roles/:id/permissions", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    const input = req.body?.permissions;
    if (!id || !Array.isArray(input) || input.length > 200) {
      res.status(400).json({ success: false, error: "A valid role and permission list are required" }); return;
    }
    const normalized = input.map((permission: unknown) => {
      const item = permission as Record<string, unknown>;
      return {
        module: textField(item.module, 100),
        canView: item.canView === true,
        canCreate: item.canCreate === true,
        canEdit: item.canEdit === true,
        canDelete: item.canDelete === true,
      };
    });
    if (normalized.some(permission => !permission.module)) {
      res.status(400).json({ success: false, error: "Every permission needs a module name" }); return;
    }
    const role = await pool.query("SELECT id FROM roles WHERE id=$1", [id]);
    if (!role.rowCount) { res.status(404).json({ success: false, error: "Role not found" }); return; }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM permissions WHERE role_id=$1", [id]);
      for (const permission of normalized) {
        await client.query(
          `INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, permission.module, permission.canView, permission.canCreate, permission.canEdit, permission.canDelete],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(req, "UPDATE_PERMISSIONS", "role", id, { permissionCount: normalized.length });
    res.json({ success: true, data: normalized });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update role permissions" });
  }
});

router.post("/roles", async (req: AdminRequest, res) => {
  try {
    const name = textField(req.body.name, 100);
    const description = textField(req.body.description, 500);
    const orgId = req.body.orgId == null || req.body.orgId === "" ? null : positiveId(req.body.orgId);
    if (!name) { res.status(400).json({ success: false, error: "Role name is required" }); return; }
    if (req.body.orgId != null && req.body.orgId !== "" && !orgId) { res.status(400).json({ success: false, error: "Invalid organization id" }); return; }
    const result = await pool.query(
      `INSERT INTO roles (name, description, org_id, is_system) VALUES ($1,$2,$3,false) RETURNING id,name,description,org_id,is_system,created_at`,
      [name, description, orgId],
    );
    await audit(req, "CREATE", "role", result.rows[0]?.id, { name });
    res.status(201).json({ success: true, data: { ...result.rows[0], permissions: [] } });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") { res.status(409).json({ success: false, error: "Role already exists" }); return; }
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create role" });
  }
});

router.put("/roles/:id", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    const name = req.body.name === undefined ? undefined : textField(req.body.name, 100);
    const description = req.body.description === undefined ? undefined : textField(req.body.description, 500);
    if (!id || (req.body.name !== undefined && !name)) { res.status(400).json({ success: false, error: "Invalid role id or name" }); return; }
    const updates: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { values.push(name); updates.push(`name=$${values.length}`); }
    if (description !== undefined) { values.push(description); updates.push(`description=$${values.length}`); }
    if (!updates.length) { res.status(400).json({ success: false, error: "No changes supplied" }); return; }
    values.push(id);
    const result = await pool.query(`UPDATE roles SET ${updates.join(", ")} WHERE id=$${values.length} RETURNING id,name,description,org_id,is_system,created_at`, values);
    if (!result.rowCount) { res.status(404).json({ success: false, error: "Role not found" }); return; }
    await audit(req, "UPDATE", "role", id, { fields: updates.map(field => field.split("=")[0]) });
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update role" });
  }
});

router.delete("/roles/:id", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    if (!id) { res.status(400).json({ success: false, error: "Invalid role id" }); return; }
    const role = await pool.query<{ is_system: boolean; user_count: number }>(
      `SELECT r.is_system, COUNT(u.id)::int AS user_count FROM roles r LEFT JOIN users u ON u.role_id=r.id WHERE r.id=$1 GROUP BY r.id`,
      [id],
    );
    if (!role.rowCount) { res.status(404).json({ success: false, error: "Role not found" }); return; }
    if (role.rows[0]?.is_system) { res.status(409).json({ success: false, error: "System roles cannot be deleted" }); return; }
    if ((role.rows[0]?.user_count ?? 0) > 0) { res.status(409).json({ success: false, error: "Role cannot be deleted while users are assigned" }); return; }
    await pool.query("DELETE FROM roles WHERE id=$1", [id]);
    await audit(req, "DELETE", "role", id);
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to delete role" });
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
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedSlug = (typeof slug === "string" ? slug.trim().toLowerCase() : normalizedName.toLowerCase())
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const monthly = Number(priceMonthly ?? 0);
    const yearly = Number(priceYearly ?? 0);
    if (!normalizedName || normalizedName.length > 120 || !normalizedSlug || normalizedSlug.length > 120) {
      res.status(400).json({ success: false, error: "Plan name and slug are required and must be 120 characters or fewer" });
      return;
    }
    if (![monthly, yearly].every(value => Number.isFinite(value) && value >= 0)) {
      res.status(400).json({ success: false, error: "Plan prices must be non-negative numbers" });
      return;
    }
    const result = await pool.query<{ id: number }>(
      `INSERT INTO saas_plans (name, slug, price_monthly, price_yearly, max_users, max_modules, max_storage_gb, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [normalizedName, normalizedSlug, monthly, yearly, maxUsers ?? null, maxModules ?? null, maxStorageGb ?? null, JSON.stringify(features ?? [])]
    );
    await audit(req, "CREATE", "plan", result.rows[0]?.id, { name: normalizedName });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    if ((e as { code?: string }).code === "23505") {
      res.status(409).json({ success: false, error: "A plan with this slug already exists" });
      return;
    }
    res.status(500).json({ success: false, error: "Failed to create plan" });
  }
});

router.put("/plans/:id", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    const { name, priceMonthly, priceYearly, maxUsers, maxModules, maxStorageGb, isActive } = req.body;
    const normalizedName = textField(name, 120);
    const monthly = Number(priceMonthly);
    const yearly = Number(priceYearly);
    if (!id || !normalizedName || !Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) {
      res.status(400).json({ success: false, error: "Valid plan id, name, and non-negative prices are required" }); return;
    }
    await pool.query(
      `UPDATE saas_plans SET name=$1, price_monthly=$2, price_yearly=$3, max_users=$4, max_modules=$5, max_storage_gb=$6, is_active=$7, updated_at=NOW() WHERE id=$8`,
      [normalizedName, monthly, yearly, maxUsers ?? null, maxModules ?? null, maxStorageGb ?? null, isActive ?? true, id]
    );
    await audit(req, "UPDATE", "plan", id, { name: normalizedName });
    res.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update plan" });
  }
});

router.delete("/plans/:id", async (req: AdminRequest, res) => {
  try {
    const id = positiveId(req.params["id"]);
    if (!id) { res.status(400).json({ success: false, error: "Invalid plan id" }); return; }
    const active = await pool.query("SELECT 1 FROM saas_subscriptions WHERE plan_id=$1 LIMIT 1", [id]);
    if (active.rowCount) { res.status(409).json({ success: false, error: "Plan cannot be deleted while subscriptions reference it" }); return; }
    const result = await pool.query(`UPDATE saas_plans SET is_active=false, updated_at=NOW() WHERE id=$1`, [id]);
    if (!result.rowCount) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
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
    const id = positiveId(req.params["id"]);
    const { status } = req.body;
    if (!id || !subscriptionStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid subscription id or status" }); return; }
    const existing = await pool.query("SELECT 1 FROM saas_subscriptions WHERE id=$1", [id]);
    if (!existing.rowCount) { res.status(404).json({ success: false, error: "Subscription not found" }); return; }
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
    const normalizedPlan = textField(planName, 120);
    const users = Number(maxUsers);
    const modules = Number(maxModules);
    if (!normalizedPlan || !Number.isInteger(users) || users < 1 || !Number.isInteger(modules) || modules < 1) {
      res.status(400).json({ success: false, error: "Plan name, max users, and max modules are required" }); return;
    }
    const organizationId = orgId == null || orgId === "" ? null : positiveId(orgId);
    if (orgId != null && orgId !== "" && !organizationId) { res.status(400).json({ success: false, error: "Invalid organization id" }); return; }
    if (organizationId && !(await pool.query("SELECT 1 FROM organizations WHERE id=$1", [organizationId])).rowCount) {
      res.status(400).json({ success: false, error: "Organization not found" }); return;
    }
    const key = `LIC-${randomBytes(8).toString("hex").toUpperCase()}`;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO admin_licenses (license_key, org_id, plan_name, max_users, max_modules, issued_to, expires_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [key, organizationId, normalizedPlan, users, modules, textField(issuedTo, 200), expiresAt ? new Date(expiresAt) : null, textField(notes, 2000)]
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
    const id = positiveId(req.params["id"]);
    const { status } = req.body;
    if (!id || !licenseStatuses.has(status)) { res.status(400).json({ success: false, error: "Invalid license id or status" }); return; }
    const existing = await pool.query("SELECT 1 FROM admin_licenses WHERE id=$1", [id]);
    if (!existing.rowCount) { res.status(404).json({ success: false, error: "License not found" }); return; }
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
    const id = positiveId(req.params["id"]);
    if (!id) { res.status(400).json({ success: false, error: "Invalid license id" }); return; }
    const result = await pool.query(`DELETE FROM admin_licenses WHERE id=$1`, [id]);
    if (!result.rowCount) { res.status(404).json({ success: false, error: "License not found" }); return; }
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
      SELECT
        w.id,
        o.id AS org_id,
        o.name AS org_name,
         w.id IS NOT NULL AS is_configured,
         COALESCE(w.is_enabled, false) AS is_enabled,
         w.product_name,
         w.primary_color,
         w.accent_color,
        w.custom_domain,
        w.support_email,
        COALESCE(w.hide_powered_by, false) AS hide_powered_by,
        w.logo_url
      FROM organizations o
      LEFT JOIN saas_whitelabel w ON w.org_id = o.id
      ORDER BY o.name
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
    if (!Number.isInteger(orgId) || orgId < 1) {
      res.status(400).json({ success: false, error: "A valid organization is required" });
      return;
    }
    const { isEnabled, productName, primaryColor, accentColor, customDomain, supportEmail, hidePoweredBy, logoUrl } = req.body;
    if (typeof productName !== "string" || productName.trim().length < 1 || productName.trim().length > 120) {
      res.status(400).json({ success: false, error: "Product name must be 1–120 characters" });
      return;
    }
    if (![primaryColor, accentColor].every((value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value))) {
      res.status(400).json({ success: false, error: "Colors must be valid six-digit hex values" });
      return;
    }
    if (customDomain != null && customDomain !== "" && (typeof customDomain !== "string" || customDomain.length > 253)) {
      res.status(400).json({ success: false, error: "Custom domain is invalid" });
      return;
    }
    if (supportEmail != null && supportEmail !== "" && (typeof supportEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail))) {
      res.status(400).json({ success: false, error: "Support email is invalid" });
      return;
    }
    const organization = await pool.query("SELECT 1 FROM organizations WHERE id = $1", [orgId]);
    if (organization.rowCount !== 1) {
      res.status(404).json({ success: false, error: "Organization not found" });
      return;
    }
    await pool.query(
      `INSERT INTO saas_whitelabel (org_id, is_enabled, product_name, primary_color, accent_color, custom_domain, support_email, hide_powered_by, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (org_id) DO UPDATE SET
         is_enabled=$2, product_name=$3, primary_color=$4, accent_color=$5,
         custom_domain=$6, support_email=$7, hide_powered_by=$8, logo_url=$9, updated_at=NOW()`,
       [orgId, isEnabled ?? true, productName.trim(), primaryColor, accentColor,
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
    const result = await pool.query<{ is_enabled: boolean; config: Record<string, unknown> }>(
      `SELECT is_enabled, config FROM admin_integrations_config WHERE id=$1`,
      [id],
    );
    const integration = result.rows[0];
    if (!integration) {
      res.status(404).json({ success: false, error: "Integration not found" });
      return;
    }
    const configuredValues = Object.values(integration.config ?? {}).filter(
      value => typeof value === "string" ? value.trim().length > 0 : value != null,
    );
    const connected = integration.is_enabled && configuredValues.length > 0;
    const status = connected ? "active" : integration.is_enabled ? "error" : "inactive";
    const message = connected
      ? "Configuration is present and the integration is enabled."
      : integration.is_enabled
        ? "The integration is enabled but has no saved configuration."
        : "Enable the integration before testing it.";
    await pool.query(
      `UPDATE admin_integrations_config SET status=$1, last_tested_at=NOW(), updated_at=NOW() WHERE id=$2`,
      [status, id],
    );
    await audit(req, "TEST", "integration", id, { connected, status });
    res.json({ success: true, data: { connected, status, message } });
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
    const values = [
      ["maxLoginAttempts", maxLoginAttempts, 1, 20],
      ["lockoutMinutes", lockoutMinutes, 1, 1440],
      ["sessionHours", sessionHours, 1, 168],
    ] as const;
    for (const [name, value, min, max] of values) {
      if (!Number.isInteger(value) || value < min || value > max) {
        res.status(400).json({ success: false, error: `${name} must be an integer between ${min} and ${max}` });
        return;
      }
    }
    const updates = [
      { key: "max_login_attempts", value: String(maxLoginAttempts) },
      { key: "lockout_minutes", value: String(lockoutMinutes) },
      { key: "session_hours", value: String(sessionHours) },
    ];
    for (const u of updates) {
      await pool.query(
        `INSERT INTO admin_system_settings (key, value, category, description, updated_by, updated_at)
         VALUES ($1, $2, 'security', $3, $4, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value=EXCLUDED.value, category='security', updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
        [u.key, u.value, u.key === "max_login_attempts" ? "Max failed logins before lockout" : u.key === "lockout_minutes" ? "Lockout duration in minutes" : "Admin session duration in hours", req.admin!.username]
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
    if (!["full", "schema"].includes(type ?? "full")) {
      res.status(400).json({ success: false, error: "Only full and schema backups are supported" });
      return;
    }
    const name = `backup_${new Date().toISOString().replace(/[:.]/g, "_").slice(0, 19)}_manual`;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO admin_backup_logs (backup_name, type, status, initiated_by, notes) VALUES ($1, $2, 'running', $3, $4) RETURNING id`,
      [name, type ?? "full", req.admin!.username, notes ?? null]
    );
    const id = result.rows[0]?.id;
    void runDatabaseBackup(id!, name, type ?? "full", req.admin!.username);
    await audit(req, "CREATE_BACKUP", "backup", id, { type });
    res.status(201).json({ success: true, data: { id, name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to initiate backup" });
  }
});

router.get("/backups/:id/download", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const result = await pool.query<{ backup_name: string; status: string }>(
      `SELECT backup_name, status FROM admin_backup_logs WHERE id=$1`,
      [id],
    );
    const backup = result.rows[0];
    if (!backup) { res.status(404).json({ success: false, error: "Backup not found" }); return; }
    if (backup.status !== "completed") {
      res.status(409).json({ success: false, error: "Backup is not completed" });
      return;
    }
    const safeName = path.basename(backup.backup_name);
    res.download(path.join(backupDirectory, `${safeName}.dump`), `${safeName}.dump`);
  } catch {
    res.status(404).json({ success: false, error: "Backup file not found" });
  }
});

router.delete("/backups/:id", async (req: AdminRequest, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, error: "Invalid backup id" });
      return;
    }
    const backupResult = await pool.query<{ backup_name: string; status: string }>(
      `SELECT backup_name, status FROM admin_backup_logs WHERE id=$1`,
      [id],
    );
    const backup = backupResult.rows[0];
    if (!backup) {
      res.status(404).json({ success: false, error: "Backup not found" });
      return;
    }
    if (backup.status === "running") {
      res.status(409).json({ success: false, error: "A running backup cannot be deleted" });
      return;
    }
    await unlink(path.join(backupDirectory, `${path.basename(backup.backup_name)}.dump`)).catch(() => undefined);
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
      SELECT n.*, n.read AS is_read, u.email AS target_email FROM notifications n
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
    if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
      res.status(400).json({ success: false, error: "Title is required and must be 200 characters or fewer" });
      return;
    }
    if (body != null && (typeof body !== "string" || body.length > 5000)) {
      res.status(400).json({ success: false, error: "Notification body must be 5000 characters or fewer" });
      return;
    }

    let targetQuery = `SELECT id, org_id FROM users WHERE status='active'`;
    const params: unknown[] = [];
    if (orgId != null) {
      const normalizedOrgId = Number(orgId);
      if (!Number.isInteger(normalizedOrgId) || normalizedOrgId < 1) {
        res.status(400).json({ success: false, error: "Organization id must be a positive integer" });
        return;
      }
      params.push(normalizedOrgId);
      targetQuery += ` AND org_id = $${params.length}`;
    }

    const targets = await pool.query<{ id: number; org_id: number }>(targetQuery, params);
    let inserted = 0;
    for (const u of targets.rows) {
      await pool.query(
        `INSERT INTO notifications (org_id, user_id, type, category, title, body, created_at) VALUES ($1, $2, $3, 'system', $4, $5, NOW())`,
        [u.org_id, u.id, typeof type === "string" && type.trim() ? type.trim() : "system", title.trim(), body?.trim() || null]
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
      pool.query<{ tablename: string; n_live_tup: number }>(
        `SELECT relname AS tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 15`
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
    if (!Array.isArray(settings) || settings.length === 0 || settings.length > 100) {
      res.status(400).json({ success: false, error: "Settings must be a non-empty list of at most 100 items" });
      return;
    }
    if (settings.some(s => !s || !/^[a-z][a-z0-9_-]{1,99}$/.test(s.key) || typeof s.value !== "string" || s.value.length > 5000)) {
      res.status(400).json({ success: false, error: "Each setting needs a valid key and a value of at most 5000 characters" });
      return;
    }
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
