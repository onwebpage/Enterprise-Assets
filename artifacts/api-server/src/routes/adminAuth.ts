import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { signAdminToken } from "../lib/adminJwt";
import { verifyPassword, hashPassword } from "../lib/password";
import { checkRateLimit, recordSuccess } from "../lib/rateLimiter";
import { requireAdminAuth, type AdminRequest } from "../middlewares/adminAuth";

const router = Router();

// GET /api/admin/auth/me
router.get("/me", requireAdminAuth, async (req: AdminRequest, res) => {
  try {
    const result = await pool.query<{
      id: number; username: string; display_name: string; email: string | null;
      is_active: boolean; last_login_at: Date | null;
    }>(
      "SELECT id, username, display_name, email, is_active, last_login_at FROM super_admins WHERE id = $1 LIMIT 1",
      [req.admin!.adminId]
    );
    const admin = result.rows[0];
    if (!admin) { res.status(404).json({ success: false, error: "Admin not found" }); return; }
    res.json({ success: true, data: admin });
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/admin/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ success: false, error: "Username and password are required" });
      return;
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress ?? "unknown";
    const rlKey = `admin-login:${ip}`;

    const policy = await pool.query<{ key: string; value: string }>(
      "SELECT key, value FROM admin_system_settings WHERE key IN ('max_login_attempts', 'lockout_minutes')",
    );
    const policyValues = Object.fromEntries(policy.rows.map(row => [row.key, Number(row.value)]));
    const rateCheck = checkRateLimit(
      rlKey,
      policyValues.max_login_attempts,
      policyValues.lockout_minutes,
    );
    if (!rateCheck.allowed) {
      const retryMins = Math.ceil((rateCheck.retryAfterMs ?? 900000) / 60000);
      res.status(429).json({
        success: false,
        error: `Too many failed attempts. Try again in ${retryMins} minute(s).`,
      });
      return;
    }

    // Use pool.query directly to avoid any ORM row-mapping issues
    const result = await pool.query<{
      id: number; username: string; password_hash: string; display_name: string;
      email: string | null; is_active: boolean; session_version: number;
    }>(
      "SELECT id, username, password_hash, display_name, email, is_active, session_version FROM super_admins WHERE username = $1 LIMIT 1",
      [username.trim()]
    );
    const admin = result.rows[0];

    const recordAttempt = async (success: boolean) => {
      await pool.query(
        "INSERT INTO admin_login_attempts (username, ip_address, success, user_agent) VALUES ($1, $2, $3, $4)",
        [username, ip, success, req.headers["user-agent"] ?? null]
      );
    };

    if (!admin || !admin.is_active) {
      await recordAttempt(false);
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      await recordAttempt(false);
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    recordSuccess(rlKey);
    await recordAttempt(true);

    await pool.query(
      "UPDATE super_admins SET last_login_at = NOW(), last_login_ip = $1, updated_at = NOW() WHERE id = $2",
      [ip, admin.id]
    );

    // Audit
    await pool.query(
      "INSERT INTO admin_audit_logs (admin_id, admin_username, action, resource, ip_address) VALUES ($1, $2, $3, $4, $5)",
      [admin.id, admin.username, "LOGIN", "auth", ip]
    );

    const sessionSetting = await pool.query<{ value: string }>(
      "SELECT value FROM admin_system_settings WHERE key = 'session_hours' LIMIT 1",
    );
    const configuredHours = Number(sessionSetting.rows[0]?.value ?? 8);
    const sessionHours = Number.isFinite(configuredHours)
      ? Math.min(Math.max(Math.floor(configuredHours), 1), 168)
      : 8;
    const token = signAdminToken(
      { adminId: admin.id, username: admin.username, sessionVersion: admin.session_version },
      sessionHours * 60 * 60,
    );

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          displayName: admin.display_name,
          email: admin.email,
        },
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/admin/auth/logout
router.post("/logout", requireAdminAuth, async (req: AdminRequest, res) => {
  try {
    const ip = req.socket.remoteAddress ?? "unknown";
    await pool.query(
      "INSERT INTO admin_audit_logs (admin_id, admin_username, action, resource, ip_address) VALUES ($1, $2, $3, $4, $5)",
      [req.admin!.adminId, req.admin!.username, "LOGOUT", "auth", ip]
    );
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PATCH /api/admin/auth/credentials — change the authenticated admin username and/or password.
// The current username and password are always required, even when changing only one value.
router.patch("/credentials", requireAdminAuth, async (req: AdminRequest, res) => {
  const client = await pool.connect();
  try {
    const {
      currentUsername,
      currentPassword,
      newUsername,
      newPassword,
    } = req.body as {
      currentUsername?: unknown;
      currentPassword?: unknown;
      newUsername?: unknown;
      newPassword?: unknown;
    };
    if (
      typeof currentUsername !== "string" ||
      typeof currentPassword !== "string" ||
      typeof newUsername !== "string" ||
      typeof newPassword !== "string"
    ) {
      res.status(400).json({ success: false, error: "All credential fields are required" });
      return;
    }
    const normalizedCurrentUsername = currentUsername.trim();
    const normalizedNewUsername = newUsername.trim();
    if (!normalizedNewUsername || normalizedNewUsername.length < 3 || normalizedNewUsername.length > 100) {
      res.status(400).json({ success: false, error: "New username must be 3–100 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(normalizedNewUsername)) {
      res.status(400).json({ success: false, error: "New username may only contain letters, numbers, dots, underscores, and hyphens" });
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 200) {
      res.status(400).json({ success: false, error: "New password must be 12–200 characters" });
      return;
    }

    await client.query("BEGIN");
    const current = await client.query<{ username: string; password_hash: string }>(
      "SELECT username, password_hash FROM super_admins WHERE id = $1 AND is_active = true FOR UPDATE",
      [req.admin!.adminId],
    );
    const row = current.rows[0];
    if (!row || row.username !== normalizedCurrentUsername || !(await verifyPassword(currentPassword, row.password_hash))) {
      await client.query("ROLLBACK");
      res.status(401).json({ success: false, error: "Current credentials are incorrect" });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const updated = await client.query<{ id: number; username: string; session_version: number }>(
      `UPDATE super_admins
       SET username = $1, password_hash = $2, session_version = session_version + 1, updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, session_version`,
      [normalizedNewUsername, newHash, req.admin!.adminId],
    );
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, admin_username, action, resource, details, ip_address)
       VALUES ($1, $2, 'CHANGE_CREDENTIALS', 'auth', $3, $4)`,
      [
        req.admin!.adminId,
        normalizedNewUsername,
        JSON.stringify({ usernameChanged: row.username !== normalizedNewUsername, sessionsRevoked: true }),
        req.socket.remoteAddress ?? "unknown",
      ],
    );
    await client.query("COMMIT");
    res.json({
      success: true,
      data: { id: updated.rows[0]?.id, username: updated.rows[0]?.username, sessionsRevoked: true },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    if ((err as { code?: string }).code === "23505") {
      res.status(409).json({ success: false, error: "That username is already in use" });
      return;
    }
    console.error("Admin credential update error:", err);
    res.status(500).json({ success: false, error: "Failed to update admin credentials" });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/auth/password — backwards-compatible password-only endpoint.
router.patch("/password", requireAdminAuth, async (req: AdminRequest, res) => {
  try {
    const { currentUsername, currentPassword, newPassword } = req.body;
    if (!currentUsername || !currentPassword || !newPassword || newPassword.length < 12) {
      res.status(400).json({ success: false, error: "Current credentials and a new password of at least 12 characters are required" });
      return;
    }
    const result = await pool.query<{ username: string; password_hash: string }>(
      "SELECT username, password_hash FROM super_admins WHERE id = $1",
      [req.admin!.adminId]
    );
    const row = result.rows[0];
    if (!row) { res.status(404).json({ success: false, error: "Not found" }); return; }
    const valid = row.username === String(currentUsername).trim() && await verifyPassword(currentPassword, row.password_hash);
    if (!valid) { res.status(401).json({ success: false, error: "Current password incorrect" }); return; }

    const newHash = await hashPassword(newPassword);
    await pool.query(
      "UPDATE super_admins SET password_hash = $1, session_version = session_version + 1, updated_at = NOW() WHERE id = $2",
      [newHash, req.admin!.adminId]
    );
    await pool.query(
      "INSERT INTO admin_audit_logs (admin_id, admin_username, action, resource, ip_address) VALUES ($1, $2, $3, $4, $5)",
      [req.admin!.adminId, req.admin!.username, "CHANGE_PASSWORD", "auth", req.socket.remoteAddress ?? "unknown"]
    );
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
