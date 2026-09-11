import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { resolveRoleModulePermissions } from "../lib/rbac";

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
      const perm = await resolveRoleModulePermissions(user.roleId, module);

      const allowed =
        action === "view" ? perm.canView :
        action === "create" ? perm.canCreate :
        action === "edit" ? perm.canEdit :
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
