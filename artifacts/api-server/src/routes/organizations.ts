import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, organizations, branches, departments } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Organizations ──────────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  try {
    const data = await db.select().from(organizations).orderBy(organizations.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch organizations" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const [org] = await db.insert(organizations).values(req.body).returning();
    res.status(201).json({ success: true, data: org });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create organization" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [org] = await db
      .update(organizations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(organizations.id, parseInt(id)))
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
    const { orgId } = req.query as { orgId?: string };
    const data = await db
      .select()
      .from(branches)
      .where(orgId ? eq(branches.orgId, parseInt(orgId)) : undefined)
      .orderBy(branches.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch branches" });
  }
});

router.post("/branches", async (req, res) => {
  try {
    const [branch] = await db.insert(branches).values(req.body).returning();
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
      .where(eq(branches.id, parseInt(req.params.id)))
      .returning();
    if (!branch) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: branch });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update branch" });
  }
});

router.delete("/branches/:id", async (req, res) => {
  try {
    await db.delete(branches).where(eq(branches.id, parseInt(req.params.id)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete branch" });
  }
});

// ── Departments ────────────────────────────────────────────────────────────

router.get("/departments", async (req, res) => {
  try {
    const { orgId } = req.query as { orgId?: string };
    const data = await db
      .select()
      .from(departments)
      .where(orgId ? eq(departments.orgId, parseInt(orgId)) : undefined)
      .orderBy(departments.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch departments" });
  }
});

router.post("/departments", async (req, res) => {
  try {
    const [dept] = await db.insert(departments).values(req.body).returning();
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
      .where(eq(departments.id, parseInt(req.params.id)))
      .returning();
    if (!dept) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: dept });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update department" });
  }
});

router.delete("/departments/:id", async (req, res) => {
  try {
    await db.delete(departments).where(eq(departments.id, parseInt(req.params.id)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete department" });
  }
});

export default router;
