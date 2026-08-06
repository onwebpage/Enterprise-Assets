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

    const rateCheck = checkRateLimit(rlKey);
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
      email: string | null; is_active: boolean;
    }>(
      "SELECT id, username, password_hash, display_name, email, is_active FROM super_admins WHERE username = $1 LIMIT 1",
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

    const token = signAdminToken({ adminId: admin.id, username: admin.username });

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

// PATCH /api/admin/auth/password — change admin password
router.patch("/password", requireAdminAuth, async (req: AdminRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
      return;
    }
    const result = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM super_admins WHERE id = $1",
      [req.admin!.adminId]
    );
    const row = result.rows[0];
    if (!row) { res.status(404).json({ success: false, error: "Not found" }); return; }
    const valid = await verifyPassword(currentPassword, row.password_hash);
    if (!valid) { res.status(401).json({ success: false, error: "Current password incorrect" }); return; }

    const newHash = await hashPassword(newPassword);
    await pool.query(
      "UPDATE super_admins SET password_hash = $1, updated_at = NOW() WHERE id = $2",
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
