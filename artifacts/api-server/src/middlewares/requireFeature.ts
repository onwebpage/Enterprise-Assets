import type { Response, NextFunction } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, saasFeatures, saasPlanFeatures, saasSubscriptions, saasTenantFeatures } from "@workspace/db";
import type { AuthRequest } from "./auth";

/**
 * Gate a module by its SaaS feature key. Missing feature definitions are treated
 * as legacy modules so existing installations remain accessible until configured.
 */
export function requireFeature(featureKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orgId = req.user?.orgId;
    if (!orgId) { next(); return; }
    try {
      const [feature] = await db
        .select({ id: saasFeatures.id, isActive: saasFeatures.isActive })
        .from(saasFeatures)
        .where(eq(saasFeatures.key, featureKey))
        .limit(1);
      if (!feature) { next(); return; }

      const [access] = await db
        .select({ enabled: sql<boolean>`coalesce(${saasTenantFeatures.enabled}, ${saasPlanFeatures.enabled}, false)` })
        .from(saasFeatures)
        .leftJoin(saasTenantFeatures, and(eq(saasTenantFeatures.featureId, saasFeatures.id), eq(saasTenantFeatures.orgId, orgId)))
        .leftJoin(saasSubscriptions, and(eq(saasSubscriptions.orgId, orgId), sql`${saasSubscriptions.status} in ('active', 'trial')`))
        .leftJoin(saasPlanFeatures, and(eq(saasPlanFeatures.featureId, saasFeatures.id), eq(saasPlanFeatures.planId, saasSubscriptions.planId)))
        .where(eq(saasFeatures.id, feature.id))
        .limit(1);
      if (!feature.isActive || !access?.enabled) {
        res.status(403).json({ success: false, error: "This module is not enabled for your plan" });
        return;
      }
      next();
    } catch {
      res.status(500).json({ success: false, error: "Feature access check failed" });
    }
  };
}