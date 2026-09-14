import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, permissions, roles, users } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { canonicalModuleKey, getAllCanonicalModuleKeys } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

function parseRoleId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePermissions(input: unknown) {
  if (!Array.isArray(input) || input.length > 200) return null;
  const normalized = input.map((item) => {
    const permission = item as Record<string, unknown>;
    return {
      module: canonicalModuleKey(typeof permission.module === "string" ? permission.module : ""),
      canView: permission.canView === true,
      canCreate: permission.canCreate === true,
      canEdit: permission.canEdit === true,
      canDelete: permission.canDelete === true,
    };
  });
  if (normalized.some((permission) => !permission.module)) return null;
  if (new Set(normalized.map((permission) => permission.module)).size !== normalized.length) return null;
  return normalized;
}

router.get("/", requirePermission("roles", "view"), async (req: AuthRequest, res) => {
  try {
    const allRoles = await db
      .select({
        id: roles.id,
        orgId: roles.orgId,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
        createdAt: roles.createdAt,
        userCount: sql<number>`count(${users.id})::int`,
      })
      .from(roles)
      .leftJoin(users, eq(users.roleId, roles.id))
      .where(eq(roles.orgId, req.user!.orgId ?? 0))
      .groupBy(roles.id)
      .orderBy(roles.name);
    const allPerms = await db.select().from(permissions);
    const data = allRoles.map((role) => ({ ...role, permissions: allPerms.filter((permission) => permission.roleId === role.id) }));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch roles" });
  }
});

router.get("/modules", requirePermission("roles", "view"), (_req, res) => {
  res.json({ success: true, data: getAllCanonicalModuleKeys() });
});

router.post("/", requirePermission("roles", "create"), async (req: AuthRequest, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : null;
    if (!name || name.length > 100) { res.status(400).json({ success: false, error: "A role name between 1 and 100 characters is required" }); return; }
    if (description && description.length > 500) { res.status(400).json({ success: false, error: "Description must be 500 characters or fewer" }); return; }
    const [role] = await db.insert(roles).values({ name, description, orgId: req.user!.orgId, isSystem: false }).returning();
    res.status(201).json({ success: true, data: { ...role, userCount: 0, permissions: [] } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create role" });
  }
});

router.put("/:id", requirePermission("roles", "edit"), async (req: AuthRequest, res) => {
  const id = parseRoleId(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "A valid role id is required" }); return; }
  const name = req.body?.name === undefined ? undefined : typeof req.body.name === "string" ? req.body.name.trim() : "";
  const description = req.body?.description === undefined ? undefined : typeof req.body.description === "string" ? req.body.description.trim() : null;
  if (name !== undefined && (!name || name.length > 100)) { res.status(400).json({ success: false, error: "Role name must be between 1 and 100 characters" }); return; }
  if (description !== undefined && description !== null && description.length > 500) { res.status(400).json({ success: false, error: "Description must be 500 characters or fewer" }); return; }
  const permissionsInput = req.body?.permissions;
  const normalizedPermissions = permissionsInput === undefined ? undefined : normalizePermissions(permissionsInput);
  if (permissionsInput !== undefined && normalizedPermissions === null) { res.status(400).json({ success: false, error: "Invalid or duplicate permission list" }); return; }
  const permissionRows = normalizedPermissions ?? [];
  const shouldUpdatePermissions = permissionsInput !== undefined;
  try {
    const updated = await db.transaction(async (tx) => {
      const [role] = await tx.update(roles).set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      }).where(and(eq(roles.id, id), eq(roles.orgId, req.user!.orgId!))).returning();
      if (!role) return null;
      if (shouldUpdatePermissions) {
        await tx.delete(permissions).where(eq(permissions.roleId, id));
        if (permissionRows.length > 0) {
          await tx.insert(permissions).values(permissionRows.map((permission) => ({ ...permission, roleId: id })));
        }
      }
      const savedPermissions = await tx.select().from(permissions).where(eq(permissions.roleId, id));
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.roleId, id));
      return { ...role, userCount: Number(count), permissions: savedPermissions };
    });
    if (!updated) { res.status(404).json({ success: false, error: "Role not found" }); return; }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update role" });
  }
});

router.delete("/:id", requirePermission("roles", "delete"), async (req: AuthRequest, res) => {
  const id = parseRoleId(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "A valid role id is required" }); return; }
  try {
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(and(eq(roles.id, id), eq(roles.orgId, req.user!.orgId!))).limit(1);
    if (!role) { res.status(404).json({ success: false, error: "Role not found" }); return; }
    if (role.isSystem) { res.status(400).json({ success: false, error: "Cannot delete system roles" }); return; }
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.roleId, id));
    if (Number(count) > 0) { res.status(409).json({ success: false, error: "Role cannot be deleted while users are assigned" }); return; }
    await db.delete(roles).where(and(eq(roles.id, id), eq(roles.orgId, req.user!.orgId!)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete role" });
  }
});

export default router;
