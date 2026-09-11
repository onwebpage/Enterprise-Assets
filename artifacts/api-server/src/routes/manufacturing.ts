/**
 * /api/manufacturing — Manufacturing module
 *
 * Covers: Work Centers, Bills of Materials (+ lines), Work Orders
 * All routes require authentication + "Manufacturing" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  mfgWorkCenters, mfgBOMs, mfgBOMLines, mfgWorkOrders,
} from "@workspace/db";
import {
  insertMfgWorkCenterSchema, updateMfgWorkCenterSchema,
  insertMfgBOMSchema, updateMfgBOMSchema,
  insertMfgWorkOrderSchema, updateMfgWorkOrderSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const MODULE = "Manufacturing";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextWONumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(mfgWorkOrders)
    .where(eq(mfgWorkOrders.orgId, orgId));
  return `WO-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextBOMNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(mfgBOMs)
    .where(eq(mfgBOMs.orgId, orgId));
  return `BOM-${String((cnt ?? 0) + 1).padStart(3, "0")}`;
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    const perms = await resolveRoleModulePermissions(roleId, MODULE);
    res.json({ success: true, data: perms });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [[{ activeWOs }], [{ totalWorkCenters }], [{ activeBOMs }], [{ behindSchedule }]] = await Promise.all([
      db.select({ activeWOs: sql<number>`count(*)::int` })
        .from(mfgWorkOrders)
        .where(and(eq(mfgWorkOrders.orgId, orgId), sql`status in ('planned','scheduled','in_progress')`)),
      db.select({ totalWorkCenters: sql<number>`count(*)::int` })
        .from(mfgWorkCenters)
        .where(and(eq(mfgWorkCenters.orgId, orgId), eq(mfgWorkCenters.status, "active"))),
      db.select({ activeBOMs: sql<number>`count(*)::int` })
        .from(mfgBOMs)
        .where(and(eq(mfgBOMs.orgId, orgId), eq(mfgBOMs.status, "active"))),
      db.select({ behindSchedule: sql<number>`count(*)::int` })
        .from(mfgWorkOrders)
        .where(and(
          eq(mfgWorkOrders.orgId, orgId),
          sql`status in ('planned','scheduled','in_progress')`,
          sql`planned_end_date < current_date::text`,
        )),
    ]);

    // Units produced this month
    const [{ unitsProduced }] = await db
      .select({ unitsProduced: sql<string>`coalesce(sum(produced_qty), 0)::text` })
      .from(mfgWorkOrders)
      .where(and(
        eq(mfgWorkOrders.orgId, orgId),
        sql`date_trunc('month', created_at) = date_trunc('month', now())`,
      ));

    res.json({
      success: true,
      data: { activeWOs, totalWorkCenters, activeBOMs, behindSchedule, unitsProduced },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch manufacturing summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WORK CENTERS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/work-centers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const { search, status } = req.query as Record<string, string>;

    const filters: any[] = [eq(mfgWorkCenters.orgId, orgId)];
    if (status) filters.push(eq(mfgWorkCenters.status, status));
    if (search?.trim()) {
      filters.push(or(
        ilike(mfgWorkCenters.code, `%${search.trim()}%`),
        ilike(mfgWorkCenters.name, `%${search.trim()}%`),
      ));
    }

    const rows = await db.select().from(mfgWorkCenters)
      .where(and(...filters))
      .orderBy(mfgWorkCenters.code);

    // Attach active WO count per work center
    const ids = rows.map(r => r.id);
    let woCounts: Record<number, number> = {};
    if (ids.length > 0) {
      const counts = await db
        .select({
          workCenterId: mfgWorkOrders.workCenterId,
          cnt: sql<number>`count(*)::int`,
        })
        .from(mfgWorkOrders)
        .where(sql`work_center_id = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)}) and status in ('planned','scheduled','in_progress')`)
        .groupBy(mfgWorkOrders.workCenterId);
      counts.forEach(c => { if (c.workCenterId) woCounts[c.workCenterId] = c.cnt; });
    }

    res.json({ success: true, data: rows.map(r => ({ ...r, activeWOs: woCounts[r.id] ?? 0 })) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch work centers" });
  }
});

router.get("/work-centers/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(mfgWorkCenters)
      .where(and(eq(mfgWorkCenters.id, id), eq(mfgWorkCenters.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Work center not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch work center" });
  }
});

router.post("/work-centers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertMfgWorkCenterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [dup] = await db.select({ id: mfgWorkCenters.id }).from(mfgWorkCenters)
      .where(and(eq(mfgWorkCenters.orgId, orgId), eq(mfgWorkCenters.code, parsed.data.code))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `Work center code "${parsed.data.code}" already exists` }); return; }
    const [created] = await db.insert(mfgWorkCenters).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create work center" });
  }
});

router.put("/work-centers/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateMfgWorkCenterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: mfgWorkCenters.id }).from(mfgWorkCenters)
      .where(and(eq(mfgWorkCenters.id, id), eq(mfgWorkCenters.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Work center not found" }); return; }
    const [updated] = await db.update(mfgWorkCenters).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(mfgWorkCenters.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update work center" });
  }
});

router.delete("/work-centers/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: mfgWorkCenters.id, name: mfgWorkCenters.name }).from(mfgWorkCenters)
      .where(and(eq(mfgWorkCenters.id, id), eq(mfgWorkCenters.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Work center not found" }); return; }
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` }).from(mfgWorkOrders)
      .where(and(eq(mfgWorkOrders.workCenterId, id), sql`status in ('planned','scheduled','in_progress')`));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — it has ${cnt} active work order(s).` });
      return;
    }
    await db.delete(mfgWorkCenters).where(eq(mfgWorkCenters.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete work center" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BILL OF MATERIALS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/boms", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status } = req.query as Record<string, string>;

    const filters: any[] = [eq(mfgBOMs.orgId, orgId)];
    if (status) filters.push(eq(mfgBOMs.status, status));
    if (search?.trim()) {
      filters.push(or(
        ilike(mfgBOMs.bomNumber,   `%${search.trim()}%`),
        ilike(mfgBOMs.productName, `%${search.trim()}%`),
        ilike(mfgBOMs.productSku,  `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(mfgBOMs).where(where).orderBy(desc(mfgBOMs.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(mfgBOMs).where(where),
    ]);

    // Attach line counts
    const ids = rows.map(r => r.id);
    let lineCounts: Record<number, number> = {};
    if (ids.length > 0) {
      const lc = await db
        .select({ bomId: mfgBOMLines.bomId, cnt: sql<number>`count(*)::int` })
        .from(mfgBOMLines)
        .where(sql`bom_id = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(mfgBOMLines.bomId);
      lc.forEach(l => { lineCounts[l.bomId] = l.cnt; });
    }

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, lineCount: lineCounts[r.id] ?? 0 })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch BOMs" });
  }
});

router.get("/boms/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [bom] = await db.select().from(mfgBOMs)
      .where(and(eq(mfgBOMs.id, id), eq(mfgBOMs.orgId, req.user!.orgId!))).limit(1);
    if (!bom) { res.status(404).json({ success: false, error: "BOM not found" }); return; }
    const lines = await db.select().from(mfgBOMLines).where(eq(mfgBOMLines.bomId, id)).orderBy(mfgBOMLines.sequence);
    res.json({ success: true, data: { ...bom, lines } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch BOM" });
  }
});

router.post("/boms", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertMfgBOMSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const bomNumber = await nextBOMNumber(orgId);

    const result = await db.transaction(async (tx) => {
      const [bom] = await tx.insert(mfgBOMs).values({
        orgId, bomNumber,
        productName: parsed.data.productName,
        productSku:  parsed.data.productSku ?? null,
        outputQty:   parsed.data.outputQty ?? "1",
        unit:        parsed.data.unit ?? "each",
        version:     parsed.data.version ?? "1.0",
        status:      parsed.data.status ?? "draft",
        notes:       parsed.data.notes ?? null,
        createdBy:   req.user!.userId,
      }).returning();

      const lines = parsed.data.lines ?? [];
      const insertedLines = lines.length > 0
        ? await tx.insert(mfgBOMLines).values(
            lines.map((l, i) => ({ bomId: bom.id, sequence: l.sequence ?? (i + 1), componentName: l.componentName, componentSku: l.componentSku ?? null, qty: l.qty, unit: l.unit ?? "each", notes: l.notes ?? null }))
          ).returning()
        : [];

      return { ...bom, lines: insertedLines };
    });

    res.status(201).json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create BOM" });
  }
});

router.put("/boms/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateMfgBOMSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: mfgBOMs.id, status: mfgBOMs.status }).from(mfgBOMs)
      .where(and(eq(mfgBOMs.id, id), eq(mfgBOMs.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "BOM not found" }); return; }

    const { lines: newLines, ...bomData } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(mfgBOMs).set({ ...bomData, updatedAt: new Date() })
        .where(eq(mfgBOMs.id, id)).returning();

      if (newLines !== undefined) {
        await tx.delete(mfgBOMLines).where(eq(mfgBOMLines.bomId, id));
        const insertedLines = newLines.length > 0
          ? await tx.insert(mfgBOMLines).values(
              newLines.map((l, i) => ({ bomId: id, sequence: l.sequence ?? (i + 1), componentName: l.componentName, componentSku: l.componentSku ?? null, qty: l.qty, unit: l.unit ?? "each", notes: l.notes ?? null }))
            ).returning()
          : [];
        return { ...updated, lines: insertedLines };
      }

      const lines = await tx.select().from(mfgBOMLines).where(eq(mfgBOMLines.bomId, id)).orderBy(mfgBOMLines.sequence);
      return { ...updated, lines };
    });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update BOM" });
  }
});

router.delete("/boms/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: mfgBOMs.id, bomNumber: mfgBOMs.bomNumber, status: mfgBOMs.status }).from(mfgBOMs)
      .where(and(eq(mfgBOMs.id, id), eq(mfgBOMs.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "BOM not found" }); return; }
    if (existing.status === "active") {
      res.status(409).json({ success: false, error: `Cannot delete active BOM "${existing.bomNumber}". Archive it first.` });
      return;
    }
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(mfgWorkOrders)
      .where(eq(mfgWorkOrders.bomId, id));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete — ${cnt} work order(s) reference this BOM.` });
      return;
    }
    await db.delete(mfgBOMs).where(eq(mfgBOMs.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete BOM" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WORK ORDERS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/work-orders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, priority, workCenterId } = req.query as Record<string, string>;

    const filters: any[] = [eq(mfgWorkOrders.orgId, orgId)];
    if (status)       filters.push(eq(mfgWorkOrders.status, status));
    if (priority)     filters.push(eq(mfgWorkOrders.priority, priority));
    if (workCenterId) filters.push(eq(mfgWorkOrders.workCenterId, parseInt(workCenterId)));
    if (search?.trim()) {
      filters.push(or(
        ilike(mfgWorkOrders.woNumber,    `%${search.trim()}%`),
        ilike(mfgWorkOrders.productName, `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:               mfgWorkOrders.id,
        orgId:            mfgWorkOrders.orgId,
        woNumber:         mfgWorkOrders.woNumber,
        bomId:            mfgWorkOrders.bomId,
        productName:      mfgWorkOrders.productName,
        workCenterId:     mfgWorkOrders.workCenterId,
        plannedQty:       mfgWorkOrders.plannedQty,
        producedQty:      mfgWorkOrders.producedQty,
        priority:         mfgWorkOrders.priority,
        status:           mfgWorkOrders.status,
        plannedStartDate: mfgWorkOrders.plannedStartDate,
        plannedEndDate:   mfgWorkOrders.plannedEndDate,
        actualStartDate:  mfgWorkOrders.actualStartDate,
        actualEndDate:    mfgWorkOrders.actualEndDate,
        notes:            mfgWorkOrders.notes,
        createdAt:        mfgWorkOrders.createdAt,
        updatedAt:        mfgWorkOrders.updatedAt,
        bomNumber:        mfgBOMs.bomNumber,
        workCenterCode:   mfgWorkCenters.code,
        workCenterName:   mfgWorkCenters.name,
      })
        .from(mfgWorkOrders)
        .leftJoin(mfgBOMs,        eq(mfgWorkOrders.bomId,        mfgBOMs.id))
        .leftJoin(mfgWorkCenters, eq(mfgWorkOrders.workCenterId, mfgWorkCenters.id))
        .where(where)
        .orderBy(desc(mfgWorkOrders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(mfgWorkOrders).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch work orders" });
  }
});

router.get("/work-orders/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select({
      id:               mfgWorkOrders.id,
      orgId:            mfgWorkOrders.orgId,
      woNumber:         mfgWorkOrders.woNumber,
      bomId:            mfgWorkOrders.bomId,
      productName:      mfgWorkOrders.productName,
      workCenterId:     mfgWorkOrders.workCenterId,
      plannedQty:       mfgWorkOrders.plannedQty,
      producedQty:      mfgWorkOrders.producedQty,
      priority:         mfgWorkOrders.priority,
      status:           mfgWorkOrders.status,
      plannedStartDate: mfgWorkOrders.plannedStartDate,
      plannedEndDate:   mfgWorkOrders.plannedEndDate,
      actualStartDate:  mfgWorkOrders.actualStartDate,
      actualEndDate:    mfgWorkOrders.actualEndDate,
      notes:            mfgWorkOrders.notes,
      createdAt:        mfgWorkOrders.createdAt,
      updatedAt:        mfgWorkOrders.updatedAt,
      bomNumber:        mfgBOMs.bomNumber,
      workCenterCode:   mfgWorkCenters.code,
      workCenterName:   mfgWorkCenters.name,
    })
      .from(mfgWorkOrders)
      .leftJoin(mfgBOMs,        eq(mfgWorkOrders.bomId,        mfgBOMs.id))
      .leftJoin(mfgWorkCenters, eq(mfgWorkOrders.workCenterId, mfgWorkCenters.id))
      .where(and(eq(mfgWorkOrders.id, id), eq(mfgWorkOrders.orgId, req.user!.orgId!)))
      .limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Work order not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch work order" });
  }
});

router.post("/work-orders", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertMfgWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const woNumber = await nextWONumber(orgId);
    const [created] = await db.insert(mfgWorkOrders).values({
      orgId, woNumber,
      bomId:            parsed.data.bomId ?? null,
      productName:      parsed.data.productName,
      workCenterId:     parsed.data.workCenterId ?? null,
      plannedQty:       parsed.data.plannedQty,
      priority:         parsed.data.priority ?? "medium",
      status:           parsed.data.status ?? "planned",
      plannedStartDate: parsed.data.plannedStartDate ?? null,
      plannedEndDate:   parsed.data.plannedEndDate ?? null,
      notes:            parsed.data.notes ?? null,
      createdBy:        req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create work order" });
  }
});

router.put("/work-orders/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateMfgWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: mfgWorkOrders.id, status: mfgWorkOrders.status }).from(mfgWorkOrders)
      .where(and(eq(mfgWorkOrders.id, id), eq(mfgWorkOrders.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Work order not found" }); return; }
    if (existing.status === "done" || existing.status === "cancelled") {
      res.status(409).json({ success: false, error: `Cannot edit a ${existing.status} work order.` });
      return;
    }
    const [updated] = await db.update(mfgWorkOrders).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(mfgWorkOrders.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update work order" });
  }
});

router.delete("/work-orders/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: mfgWorkOrders.id, woNumber: mfgWorkOrders.woNumber, status: mfgWorkOrders.status }).from(mfgWorkOrders)
      .where(and(eq(mfgWorkOrders.id, id), eq(mfgWorkOrders.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Work order not found" }); return; }
    if (existing.status === "in_progress" || existing.status === "done") {
      res.status(409).json({ success: false, error: `Cannot delete a ${existing.status} work order.` });
      return;
    }
    await db.delete(mfgWorkOrders).where(eq(mfgWorkOrders.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete work order" });
  }
});

export default router;
