import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, organizations, branches, departments, organizationMemberships, users, roles } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Organizations ──────────────────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res) => {
  try {
    const data = await db
      .select({ id: organizations.id, name: organizations.name, legalName: organizations.legalName, type: organizations.type, country: organizations.country, employeeCount: organizations.employeeCount, status: organizations.status, currency: organizations.currency, gstin: organizations.gstin, fiscalYearStart: organizations.fiscalYearStart, tenantId: organizations.tenantId })
      .from(organizations)
      .innerJoin(organizationMemberships, eq(organizationMemberships.organizationId, organizations.id))
      .where(eq(organizationMemberships.userId, req.user!.userId))
      .orderBy(organizations.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch organizations" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const [current] = await db.select({ tenantId: organizations.tenantId }).from(organizations).where(eq(organizations.id, req.user!.orgId!)).limit(1);
    if (!current?.tenantId) { res.status(400).json({ success: false, error: "Current company is not attached to a tenant" }); return; }
    const [org] = await db.insert(organizations).values({ ...req.body, tenantId: current.tenantId }).returning();
    await db.insert(organizationMemberships).values({ userId: req.user!.userId, organizationId: org.id, isDefault: false });
    res.status(201).json({ success: true, data: org });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create organization" });
  }
});

router.post("/switch", async (req: AuthRequest, res) => {
  const organizationId = Number(req.body?.organizationId);
  if (!Number.isInteger(organizationId) || organizationId < 1) { res.status(400).json({ success: false, error: "A valid company is required" }); return; }
  const [membership] = await db.select().from(organizationMemberships).where(and(eq(organizationMemberships.userId, req.user!.userId), eq(organizationMemberships.organizationId, organizationId))).limit(1);
  if (!membership) { res.status(403).json({ success: false, error: "You are not assigned to this company" }); return; }
  res.json({ success: true, data: { organizationId, roleId: membership.roleId, branchId: membership.branchId } });
});

router.get("/memberships", async (req: AuthRequest, res) => {
  const data = await db.select({ id: organizationMemberships.id, userId: organizationMemberships.userId, organizationId: organizationMemberships.organizationId, branchId: organizationMemberships.branchId, roleId: organizationMemberships.roleId, isDefault: organizationMemberships.isDefault, email: users.email, firstName: users.firstName, lastName: users.lastName }).from(organizationMemberships).innerJoin(users, eq(users.id, organizationMemberships.userId)).where(eq(organizationMemberships.organizationId, req.user!.orgId!));
  res.json({ success: true, data });
});

router.post("/memberships", async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.body?.userId);
    const branchId = req.body?.branchId == null ? null : Number(req.body.branchId);
    const roleId = req.body?.roleId == null ? null : Number(req.body.roleId);
    if (!Number.isInteger(userId) || userId < 1) { res.status(400).json({ success: false, error: "A valid user is required" }); return; }
    const [targetUser] = await db.select({ id: users.id, orgId: users.orgId }).from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) { res.status(404).json({ success: false, error: "User not found" }); return; }
    if (targetUser.orgId !== null && targetUser.orgId !== req.user!.orgId!) {
      res.status(409).json({ success: false, error: "User already belongs to another company" });
      return;
    }
    if (branchId !== null && !(await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.orgId, req.user!.orgId!))).limit(1)).length) { res.status(400).json({ success: false, error: "Branch does not belong to this company" }); return; }
    if (roleId !== null && !(await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, req.user!.orgId!))).limit(1)).length) { res.status(400).json({ success: false, error: "Role does not belong to this company" }); return; }
    const [membership] = await db.insert(organizationMemberships).values({ userId, organizationId: req.user!.orgId!, branchId, roleId, isDefault: false }).onConflictDoUpdate({ target: [organizationMemberships.userId, organizationMemberships.organizationId], set: { branchId, roleId } }).returning();
    await db.update(users).set({ orgId: req.user!.orgId!, branchId, roleId, updatedAt: new Date() }).where(eq(users.id, userId));
    res.status(201).json({ success: true, data: membership });
  } catch { res.status(500).json({ success: false, error: "Failed to assign user to company" }); }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [org] = await db
      .update(organizations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(organizations.id, parseInt(id as string)), eq(organizations.id, req.user!.orgId!)))
      .returning();
    if (!org) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: org });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update organization" });
  }
});

// ── Branches ───────────────────────────────────────────────────────────────

router.get("/branches", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(branches)
      .where(eq(branches.orgId, (req as AuthRequest).user!.orgId!))
      .orderBy(branches.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch branches" });
  }
});

router.post("/branches", async (req, res) => {
  try {
    const [branch] = await db.insert(branches).values({ ...req.body, orgId: (req as AuthRequest).user!.orgId! }).returning();
    res.status(201).json({ success: true, data: branch });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create branch" });
  }
});

router.put("/branches/:id", async (req, res) => {
  try {
    const [branch] = await db
      .update(branches)
      .set(req.body)
      .where(and(eq(branches.id, parseInt(req.params.id)), eq(branches.orgId, (req as AuthRequest).user!.orgId!)))
      .returning();
    if (!branch) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: branch });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update branch" });
  }
});

router.delete("/branches/:id", async (req, res) => {
  try {
    await db.delete(branches).where(and(eq(branches.id, parseInt(req.params.id)), eq(branches.orgId, (req as AuthRequest).user!.orgId!)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete branch" });
  }
});

// ── Departments ────────────────────────────────────────────────────────────

router.get("/departments", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(departments)
      .where(eq(departments.orgId, (req as AuthRequest).user!.orgId!))
      .orderBy(departments.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch departments" });
  }
});

router.post("/departments", async (req, res) => {
  try {
    const [dept] = await db.insert(departments).values({ ...req.body, orgId: (req as AuthRequest).user!.orgId! }).returning();
    res.status(201).json({ success: true, data: dept });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create department" });
  }
});

router.put("/departments/:id", async (req, res) => {
  try {
    const [dept] = await db
      .update(departments)
      .set(req.body)
      .where(and(eq(departments.id, parseInt(req.params.id)), eq(departments.orgId, (req as AuthRequest).user!.orgId!)))
      .returning();
    if (!dept) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: dept });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update department" });
  }
});

router.delete("/departments/:id", async (req, res) => {
  try {
    await db.delete(departments).where(and(eq(departments.id, parseInt(req.params.id)), eq(departments.orgId, (req as AuthRequest).user!.orgId!)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete department" });
  }
});

export default router;
