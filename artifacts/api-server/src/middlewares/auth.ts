import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import { and, eq } from "drizzle-orm";
import { db, organizationMemberships, organizations } from "@workspace/db";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    const authenticatedUser = req.user;
    resolveOrganizationContext(req, res, next, authenticatedUser);
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

async function resolveOrganizationContext(req: AuthRequest, res: Response, next: NextFunction, authenticatedUser: JwtPayload | undefined): Promise<void> {
  if (!authenticatedUser) { res.status(401).json({ success: false, error: "Authentication required" }); return; }
  const requestedOrgId = Number(req.headers["x-organization-id"]);
  const tokenOrgId = authenticatedUser.orgId;
  const organizationId = Number.isInteger(requestedOrgId) && requestedOrgId > 0 ? requestedOrgId : tokenOrgId;

  if (!organizationId) {
    next();
    return;
  }

  try {
    const [membership] = await db
      .select({ organizationId: organizationMemberships.organizationId, roleId: organizationMemberships.roleId, branchId: organizationMemberships.branchId })
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.userId, authenticatedUser.userId), eq(organizationMemberships.organizationId, organizationId)))
      .limit(1);

    // Preserve access for legacy super-admin tokens while requiring membership for normal users.
    if (!membership && authenticatedUser.roleId !== null) {
      res.status(403).json({ success: false, error: "You are not assigned to this company" });
      return;
    }

    const [organization] = await db.select({ tenantId: organizations.tenantId }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!organization) {
      res.status(404).json({ success: false, error: "Company not found" });
      return;
    }

    authenticatedUser.orgId = organizationId;
    authenticatedUser.tenantId = organization.tenantId;
    if (membership) {
      authenticatedUser.roleId = membership.roleId;
      authenticatedUser.branchId = membership.branchId;
    }
    next();
  } catch {
    res.status(500).json({ success: false, error: "Failed to resolve company context" });
  }
}
