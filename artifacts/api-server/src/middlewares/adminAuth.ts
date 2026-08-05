import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken, type AdminJwtPayload } from "../lib/adminJwt";

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
}

export function requireAdminAuth(req: AdminRequest, res: Response, next: NextFunction): void {
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
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired admin token" });
  }
}
