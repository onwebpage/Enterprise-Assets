import { Router } from "express";
import { and, eq, like, or, desc, sql } from "drizzle-orm";
import { db, users, roles, departments, branches, organizationMemberships } from "@workspace/db";
import { hashPassword } from "../lib/password";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

// Safe user shape (no passwordHash)
function safeUser(u: typeof users.$inferSelect & { roleName?: string; deptName?: string }) {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

// GET /api/users
router.get("/", requirePermission("users", "view"), async (req: AuthRequest, res) => {
  try {
    const { search = "", page = "1", limit = "50" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const rows = await db
      .select({
        id: users.id,
        orgId: users.orgId,
        branchId: users.branchId,
        deptId: users.deptId,
        roleId: users.roleId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        status: users.status,
        mfaEnabled: users.mfaEnabled,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleName: roles.name,
        deptName: departments.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.deptId, departments.id))
      .where(and(eq(users.orgId, req.user!.orgId!), search ? or(
              like(users.firstName, `%${search}%`),
              like(users.lastName, `%${search}%`),
              like(users.email, `%${search}%`),
            ) : undefined))
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.orgId, req.user!.orgId!));

    res.json({ success: true, data: rows, total: count });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// GET /api/users/:id
router.get("/:id", requirePermission("users", "view"), async (req: AuthRequest, res) => {
  try {
    const [row] = await db
      .select({
        id: users.id, orgId: users.orgId, branchId: users.branchId,
        deptId: users.deptId, roleId: users.roleId, email: users.email,
        firstName: users.firstName, lastName: users.lastName,
        phone: users.phone, status: users.status,
        mfaEnabled: users.mfaEnabled, lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt, updatedAt: users.updatedAt,
        roleName: roles.name, deptName: departments.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.deptId, departments.id))
      .where(and(eq(users.id, parseInt(req.params.id as string)), eq(users.orgId, req.user!.orgId!)))
      .limit(1);

    if (!row) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// POST /api/users
router.post("/", requirePermission("users", "create"), async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, roleId, deptId, branchId, phone, status } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ success: false, error: "email, password, firstName, lastName are required" });
      return;
    }
    const requestedRoleId = roleId == null ? null : Number(roleId);
    if (requestedRoleId !== null) {
      if (!Number.isInteger(requestedRoleId) || requestedRoleId <= 0) { res.status(400).json({ success: false, error: "Invalid role id" }); return; }
      const [role] = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, requestedRoleId), eq(roles.orgId, req.user!.orgId!))).limit(1);
      if (!role) { res.status(400).json({ success: false, error: "Role does not belong to this company" }); return; }
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName, lastName, phone,
      roleId: requestedRoleId,
      deptId: deptId ?? null,
      branchId: branchId ?? null,
      orgId: req.user?.orgId ?? null,
      status: status ?? "active",
    }).returning();
    await db.insert(organizationMemberships).values({ userId: user.id, organizationId: req.user!.orgId!, branchId: branchId ?? null, roleId: requestedRoleId, isDefault: true });
    const { passwordHash: _ph, ...safe } = user;
    res.status(201).json({ success: true, data: safe });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique")) {
      res.status(409).json({ success: false, error: "Email already in use" });
    } else {
      res.status(500).json({ success: false, error: "Failed to create user" });
    }
  }
});

// PUT /api/users/:id
router.put("/:id", requirePermission("users", "edit"), async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone, roleId, deptId, branchId, status, mfaEnabled } = req.body;
    const normalizedRoleId = roleId === undefined ? undefined : roleId === null ? null : Number(roleId);
    if (normalizedRoleId !== undefined && normalizedRoleId !== null) {
      if (!Number.isInteger(normalizedRoleId) || normalizedRoleId <= 0) { res.status(400).json({ success: false, error: "Invalid role id" }); return; }
      const [role] = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, normalizedRoleId), eq(roles.orgId, req.user!.orgId!))).limit(1);
      if (!role) { res.status(400).json({ success: false, error: "Role does not belong to this company" }); return; }
    }
    const [user] = await db.update(users).set({
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(normalizedRoleId !== undefined && { roleId: normalizedRoleId }),
      ...(deptId !== undefined && { deptId }),
      ...(branchId !== undefined && { branchId }),
      ...(status !== undefined && { status }),
      ...(mfaEnabled !== undefined && { mfaEnabled }),
      updatedAt: new Date(),
    }).where(and(eq(users.id, parseInt(req.params.id as string)), eq(users.orgId, req.user!.orgId!))).returning();
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    if (normalizedRoleId !== undefined) {
      await db.insert(organizationMemberships).values({ userId: user.id, organizationId: req.user!.orgId!, roleId: normalizedRoleId, isDefault: true }).onConflictDoUpdate({ target: [organizationMemberships.userId, organizationMemberships.organizationId], set: { roleId: normalizedRoleId, isDefault: true } });
    }
    const { passwordHash: _ph, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", requirePermission("users", "delete"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (id === req.user?.userId) {
      res.status(400).json({ success: false, error: "Cannot delete your own account" });
      return;
    }
    await db.delete(users).where(and(eq(users.id, id), eq(users.orgId, req.user!.orgId!)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

export default router;
