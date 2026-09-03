import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, roles, permissions } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

// GET /api/roles — includes permissions
router.get("/", requirePermission("roles", "view"), async (req: AuthRequest, res) => {
  try {
    const allRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.orgId, req.user!.orgId ?? 0));

    const allPerms = await db.select().from(permissions);

    const data = allRoles.map((role) => ({
      ...role,
      permissions: allPerms.filter((p) => p.roleId === role.id),
    }));

    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch roles" });
  }
});

// POST /api/roles
router.post("/", requirePermission("roles", "create"), async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name) { res.status(400).json({ success: false, error: "name is required" }); return; }

    const [role] = await db.insert(roles).values({
      name, description,
      orgId: req.user!.orgId,
      isSystem: false,
    }).returning();

    res.status(201).json({ success: true, data: { ...role, permissions: [] } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create role" });
  }
});

// PUT /api/roles/:id — update role + permissions
router.put("/:id", requirePermission("roles", "edit"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, description, permissions: permsInput } = req.body as {
      name?: string; description?: string;
      permissions?: Array<{ module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>;
    };

    const [role] = await db.update(roles).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    }).where(and(eq(roles.id, id), eq(roles.orgId, req.user!.orgId!))).returning();

    if (!role) { res.status(404).json({ success: false, error: "Role not found" }); return; }

    if (permsInput) {
      await db.delete(permissions).where(eq(permissions.roleId, id));
      if (permsInput.length > 0) {
        await db.insert(permissions).values(permsInput.map((p) => ({ ...p, roleId: id })));
      }
    }

    const updatedPerms = await db.select().from(permissions).where(eq(permissions.roleId, id));
    res.json({ success: true, data: { ...role, permissions: updatedPerms } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update role" });
  }
});

// DELETE /api/roles/:id
router.delete("/:id", requirePermission("roles", "delete"), async (req: AuthRequest, res) => {
  try {
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(and(eq(roles.id, parseInt(req.params.id as string)), eq(roles.orgId, req.user!.orgId!))).limit(1);
    if (role?.isSystem) {
      res.status(400).json({ success: false, error: "Cannot delete system roles" });
      return;
    }
    await db.delete(roles).where(and(eq(roles.id, parseInt(req.params.id as string)), eq(roles.orgId, req.user!.orgId!)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete role" });
  }
});

export default router;
