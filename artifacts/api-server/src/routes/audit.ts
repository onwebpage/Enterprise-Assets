/**
 * /api/audit — Audit Logs module
 *
 * Covers: list with filters, create entry, stats summary, CSV export.
 */
import { Router } from "express";
import { eq, and, ilike, or, gte, lte, desc, sql } from "drizzle-orm";
import { db, auditLogs } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [[{ total }], [{ last24h }], [{ uniqueUsers }]] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` })
        .from(auditLogs).where(eq(auditLogs.orgId, orgId)),
      db.select({ last24h: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(and(eq(auditLogs.orgId, orgId), gte(auditLogs.createdAt, since24h))),
      db.select({ uniqueUsers: sql<number>`count(distinct user_id)::int` })
        .from(auditLogs).where(eq(auditLogs.orgId, orgId)),
    ]);

    const byModule = await db
      .select({ module: auditLogs.module, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .groupBy(auditLogs.module)
      .orderBy(desc(sql`count(*)`));

    const byAction = await db
      .select({ action: auditLogs.action, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .groupBy(auditLogs.action)
      .orderBy(desc(sql`count(*)`));

    const byStatus = await db
      .select({ status: auditLogs.status, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .groupBy(auditLogs.status);

    res.json({ success: true, data: { total, last24h, uniqueUsers, byModule, byAction, byStatus } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch audit stats" });
  }
});

// ── List ──────────────────────────────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page      = Math.max(1, parseInt(String(req.query.page    ?? "1")));
    const limit     = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"))));
    const offset    = (page - 1) * limit;
    const search    = String(req.query.search    ?? "").trim();
    const module_   = String(req.query.module    ?? "").trim();
    const action    = String(req.query.action    ?? "").trim();
    const status    = String(req.query.status    ?? "").trim();
    const userId    = req.query.userId ? parseInt(String(req.query.userId)) : null;
    const dateFrom  = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
    const dateTo    = req.query.dateTo   ? new Date(String(req.query.dateTo))   : null;

    const conditions = [eq(auditLogs.orgId, orgId)];
    if (module_)   conditions.push(eq(auditLogs.module, module_));
    if (action)    conditions.push(eq(auditLogs.action, action));
    if (status)    conditions.push(eq(auditLogs.status, status));
    if (userId)    conditions.push(eq(auditLogs.userId, userId));
    if (dateFrom)  conditions.push(gte(auditLogs.createdAt, dateFrom));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, end));
    }
    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.description, `%${search}%`),
          ilike(auditLogs.userName,    `%${search}%`),
          ilike(auditLogs.userEmail,   `%${search}%`),
          ilike(auditLogs.entityName,  `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [[{ total }], rows] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(where),
      db.select().from(auditLogs).where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    res.json({ success: true, data: rows, total, page, pages: Math.ceil((total as number) / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

// ── Create (internal — called by other modules) ───────────────────────────────

router.post("/", async (req: AuthRequest, res) => {
  try {
    const {
      module, action, entityType, entityId, entityName,
      description, oldValues, newValues, ipAddress, status,
    } = req.body;

    if (!module || !action || !description) {
      res.status(400).json({ success: false, error: "module, action, description are required" });
      return;
    }

    const [entry] = await db.insert(auditLogs).values({
      orgId:      req.user!.orgId ?? null,
      userId:     req.user!.userId,
      userEmail:  req.user!.email,
      userName:   String(req.body.userName ?? req.user!.email),
      module,
      action,
      entityType:  entityType  ?? null,
      entityId:    entityId    ?? null,
      entityName:  entityName  ?? null,
      description,
      oldValues:   oldValues   ?? null,
      newValues:   newValues   ?? null,
      ipAddress:   ipAddress   ?? (req.headers["x-forwarded-for"] as string ?? req.socket.remoteAddress ?? null),
      status:      status      ?? "success",
    }).returning();

    res.status(201).json({ success: true, data: entry });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create audit log" });
  }
});

// ── Export CSV ────────────────────────────────────────────────────────────────

router.get("/export/csv", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const module_  = String(req.query.module  ?? "").trim();
    const action   = String(req.query.action  ?? "").trim();
    const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
    const dateTo   = req.query.dateTo   ? new Date(String(req.query.dateTo))   : null;

    const conditions = [eq(auditLogs.orgId, orgId)];
    if (module_)  conditions.push(eq(auditLogs.module, module_));
    if (action)   conditions.push(eq(auditLogs.action, action));
    if (dateFrom) conditions.push(gte(auditLogs.createdAt, dateFrom));
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, end));
    }

    const rows = await db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10000);

    const header = ["ID", "Timestamp", "User", "Email", "Module", "Action", "Entity Type", "Entity ID", "Entity Name", "Description", "Status", "IP Address"].join(",");
    const csv = [
      header,
      ...rows.map(r => [
        r.id,
        new Date(r.createdAt).toISOString(),
        `"${r.userName.replace(/"/g, '""')}"`,
        r.userEmail,
        r.module,
        r.action,
        r.entityType ?? "",
        r.entityId ?? "",
        `"${(r.entityName ?? "").replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.status,
        r.ipAddress ?? "",
      ].join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ success: false, error: "Failed to export audit logs" });
  }
});

// ── Single ────────────────────────────────────────────────────────────────────

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
    const [row] = await db.select().from(auditLogs)
      .where(and(eq(auditLogs.id, id), eq(auditLogs.orgId, req.user!.orgId!)))
      .limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch audit log" });
  }
});

export default router;
