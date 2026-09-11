import type { Response, NextFunction } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, permissions, roles } from "@workspace/db";
import type { AuthRequest } from "./auth";

type Action = "view" | "create" | "edit" | "delete";

/**
 * requirePermission(module, action)
 *
 * Checks the authenticated user's role has the requested permission on a module.
 * - Users whose role has isSystem=true are treated as super-admins and always pass.
 * - Users with a roleId that has no permission row for the module are denied.
 */
export function requirePermission(module: string, action: Action) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    // A missing role is an unprivileged account, never an implicit super-admin.
    if (user.roleId === null) {
      res.status(403).json({ success: false, error: "Access denied: no role assigned" });
      return;
    }

    try {
      // System roles (isSystem=true) have full access to all modules
      const [role] = await db
        .select({ isSystem: roles.isSystem })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);

      if (role?.isSystem) {
        next();
        return;
      }

      const [perm] = await db
        .select()
        .from(permissions)
        .where(
          and(
            eq(permissions.roleId, user.roleId),
            sql`lower(${permissions.module}) = lower(${module})`,
          ),
        )
        .limit(1);

      // No permission row for this module → deny
      if (!perm) {
        res.status(403).json({ success: false, error: "Access denied: no permission for this module" });
        return;
      }

      const allowed =
        action === "view"   ? perm.canView   :
        action === "create" ? perm.canCreate :
        action === "edit"   ? perm.canEdit   :
        perm.canDelete;

      if (!allowed) {
        res.status(403).json({ success: false, error: `Access denied: cannot ${action} in ${module}` });
        return;
      }

      next();
    } catch {
      res.status(500).json({ success: false, error: "Permission check failed" });
    }
  };
}
