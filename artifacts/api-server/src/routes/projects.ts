import { Router } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, projects } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
const statuses = new Set(["planned", "active", "on_hold", "completed", "cancelled"]);
router.use(requireAuth);

function projectInput(body: Record<string, unknown>) {
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const status = typeof body.status === "string" ? body.status : "planned";
  const budget = body.budget == null || body.budget === "" ? "0" : String(body.budget);
  if (!code || code.length > 50 || !name || name.length > 200 || !statuses.has(status) || !/^\d+(\.\d{1,2})?$/.test(budget)) return null;
  return {
    code, name,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 5000) || null : null,
    status, budget,
    managerId: body.managerId == null || body.managerId === "" ? null : Number(body.managerId),
    startDate: typeof body.startDate === "string" && body.startDate ? body.startDate : null,
    endDate: typeof body.endDate === "string" && body.endDate ? body.endDate : null,
    isArchived: body.isArchived === true,
  };
}

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    const perms = await resolveRoleModulePermissions(roleId, "Projects");
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch project permissions" });
  }
});

router.get("/", requirePermission("Projects", "view"), async (req: AuthRequest, res) => {
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  if (status && !statuses.has(status)) { res.status(400).json({ success: false, error: "Invalid project status" }); return; }
  try {
    const conditions = [eq(projects.orgId, req.user!.orgId!)];
    if (search) conditions.push(or(ilike(projects.code, `%${search}%`), ilike(projects.name, `%${search}%`))!);
    if (status) conditions.push(eq(projects.status, status));
    const data = await db.select().from(projects).where(and(...conditions)).orderBy(desc(projects.updatedAt));
    res.json({ success: true, data, total: data.length });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch projects" }); }
});

router.get("/export/csv", requirePermission("Projects", "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(projects).where(eq(projects.orgId, req.user!.orgId!)).orderBy(desc(projects.updatedAt));
    const csv = ["Code,Name,Status,Budget,Start Date,End Date", ...rows.map((row) => [row.code, row.name, row.status, row.budget, row.startDate ?? "", row.endDate ?? ""].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="projects.csv"');
    res.send(csv);
  } catch { res.status(500).json({ success: false, error: "Failed to export projects" }); }
});

router.post("/", requirePermission("Projects", "create"), async (req: AuthRequest, res) => {
  const input = projectInput(req.body ?? {});
  if (!input || (input.managerId !== null && !Number.isInteger(input.managerId))) { res.status(400).json({ success: false, error: "Valid project code, name, status, and budget are required" }); return; }
  try { const [project] = await db.insert(projects).values({ ...input, orgId: req.user!.orgId! }).returning(); res.status(201).json({ success: true, data: project }); }
  catch { res.status(409).json({ success: false, error: "Project code already exists or project data is invalid" }); }
});

router.put("/:id", requirePermission("Projects", "edit"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id); const input = projectInput(req.body ?? {});
  if (!Number.isInteger(id) || id < 1 || !input || (input.managerId !== null && !Number.isInteger(input.managerId))) { res.status(400).json({ success: false, error: "Valid project data is required" }); return; }
  try {
    const [project] = await db.update(projects).set({ ...input, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.orgId, req.user!.orgId!))).returning();
    if (!project) { res.status(404).json({ success: false, error: "Project not found" }); return; }
    res.json({ success: true, data: project });
  } catch { res.status(409).json({ success: false, error: "Project code already exists or project data is invalid" }); }
});

router.delete("/:id", requirePermission("Projects", "delete"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ success: false, error: "Invalid project id" }); return; }
  try { const result = await db.delete(projects).where(and(eq(projects.id, id), eq(projects.orgId, req.user!.orgId!))).returning({ id: projects.id }); if (!result.length) { res.status(404).json({ success: false, error: "Project not found" }); return; } res.json({ success: true, data: null }); }
  catch { res.status(500).json({ success: false, error: "Failed to delete project" }); }
});

export default router;