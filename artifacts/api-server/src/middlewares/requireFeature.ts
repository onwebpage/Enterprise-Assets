import type { Response, NextFunction } from "express";
import { eq, sql } from "drizzle-orm";
import { db, saasFeatures } from "@workspace/db";
import type { AuthRequest } from "./auth";

/**
 * Gate a module by its SaaS feature key. During the initial migration, an empty
 * feature catalog preserves legacy access. Once the catalog has been configured,
 * an undeclared module is denied by default.
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
      if (!feature) {
        const [catalog] = await db.select({ count: sql<number>`count(*)::int` }).from(saasFeatures);
        if (Number(catalog?.count ?? 0) === 0) { next(); return; }
        res.status(403).json({ success: false, error: "This module is not configured for subscription access" });
        return;
      }

      const accessResult = await db.execute(sql`
        SELECT f.is_active,
          COALESCE(tf.enabled, pf.enabled, false) AS enabled
        FROM saas_features f
        LEFT JOIN saas_tenant_features tf
          ON tf.feature_id = f.id AND tf.org_id = ${orgId}
        LEFT JOIN LATERAL (
          SELECT plan_id
          FROM saas_subscriptions
          WHERE org_id = ${orgId}
            AND status IN ('active', 'trial')
            AND (expires_at IS NULL OR expires_at > now())
            AND (status <> 'trial' OR trial_ends_at IS NULL OR trial_ends_at > now())
          ORDER BY started_at DESC NULLS LAST, id DESC
          LIMIT 1
        ) subscription ON true
        LEFT JOIN saas_plan_features pf
          ON pf.feature_id = f.id AND pf.plan_id = subscription.plan_id
        WHERE f.id = ${feature.id}
        LIMIT 1
      `);
      const access = ((accessResult as any).rows ?? accessResult)[0] as { enabled?: boolean; is_active?: boolean } | undefined;
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