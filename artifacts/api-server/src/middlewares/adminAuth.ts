import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken, type AdminJwtPayload } from "../lib/adminJwt";
import { pool } from "@workspace/db";

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
}

export async function requireAdminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyAdminToken(token);
    if (!payload.isAdmin) {
      res.status(403).json({ success: false, error: "Not an admin token" });
      return;
    }
    const result = await pool.query<{ username: string; session_version: number; is_active: boolean }>(
      "SELECT username, session_version, is_active FROM super_admins WHERE id = $1 LIMIT 1",
      [payload.adminId],
    );
    const admin = result.rows[0];
    if (!admin?.is_active || admin.session_version !== payload.sessionVersion) {
      res.status(401).json({ success: false, error: "Admin session has been revoked" });
      return;
    }
    req.admin = { ...payload, username: admin.username };
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired admin token" });
  }
}
