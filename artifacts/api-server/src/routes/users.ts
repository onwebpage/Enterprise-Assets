import { Router } from "express";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { db, users, roles, departments, branches } from "@workspace/db";
import { hashPassword } from "../lib/password";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// Safe user shape (no passwordHash)
function safeUser(u: typeof users.$inferSelect & { roleName?: string; deptName?: string }) {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

// GET /api/users
router.get("/", async (req: AuthRequest, res) => {
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
      .where(
        search
          ? or(
              like(users.firstName, `%${search}%`),
              like(users.lastName, `%${search}%`),
              like(users.email, `%${search}%`),
            )
          : undefined,
      )
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

    res.json({ success: true, data: rows, total: count });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// GET /api/users/:id
router.get("/:id", async (req: AuthRequest, res) => {
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
      .where(eq(users.id, parseInt(req.params.id)))
      .limit(1);

    if (!row) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// POST /api/users
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, roleId, deptId, branchId, phone, status } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ success: false, error: "email, password, firstName, lastName are required" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName, lastName, phone,
      roleId: roleId ?? null,
      deptId: deptId ?? null,
      branchId: branchId ?? null,
      orgId: req.user?.orgId ?? null,
      status: status ?? "active",
    }).returning();
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
router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone, roleId, deptId, branchId, status, mfaEnabled } = req.body;
    const [user] = await db.update(users).set({
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(roleId !== undefined && { roleId }),
      ...(deptId !== undefined && { deptId }),
      ...(branchId !== undefined && { branchId }),
      ...(status !== undefined && { status }),
      ...(mfaEnabled !== undefined && { mfaEnabled }),
      updatedAt: new Date(),
    }).where(eq(users.id, parseInt(req.params.id))).returning();
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    const { passwordHash: _ph, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user?.userId) {
      res.status(400).json({ success: false, error: "Cannot delete your own account" });
      return;
    }
    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

export default router;
