import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, users, organizations, branches, departments, roles } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// GET /api/dashboard (root endpoint — returns aggregated dashboard data)
router.get("/", async (_req, res) => {
  try {
    const [[userCount], [orgCount], [branchCount], [deptCount], [roleCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(organizations),
      db.select({ count: sql<number>`count(*)::int` }).from(branches),
      db.select({ count: sql<number>`count(*)::int` }).from(departments),
      db.select({ count: sql<number>`count(*)::int` }).from(roles),
    ]);

    res.json({
      success: true,
      data: {
        users: userCount.count,
        organizations: orgCount.count,
        branches: branchCount.count,
        departments: deptCount.count,
        roles: roleCount.count,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
  }
});

// GET /api/dashboard/stats (legacy endpoint — same as root)
router.get("/stats", async (_req, res) => {
  try {
    const [[userCount], [orgCount], [branchCount], [deptCount], [roleCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(organizations),
      db.select({ count: sql<number>`count(*)::int` }).from(branches),
      db.select({ count: sql<number>`count(*)::int` }).from(departments),
      db.select({ count: sql<number>`count(*)::int` }).from(roles),
    ]);

    res.json({
      success: true,
      data: {
        users: userCount.count,
        organizations: orgCount.count,
        branches: branchCount.count,
        departments: deptCount.count,
        roles: roleCount.count,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

export default router;
