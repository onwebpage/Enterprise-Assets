import { Router } from "express";
import { and, desc, eq, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  controlExceptions,
  controlRuns,
  financialControls,
  permissions,
  roles,
  users,
  db,
} from "@workspace/db";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const categories = ["reconciliation", "approval", "segregation_of_duties", "period_close", "journal_review", "access", "other"] as const;
const frequencies = ["daily", "weekly", "monthly", "quarterly", "annual", "event"] as const;
const risks = ["low", "medium", "high", "critical"] as const;
const controlStatuses = ["active", "inactive"] as const;
const runStatuses = ["pending", "in_progress", "completed", "waived"] as const;
const runResults = ["pending", "passed", "failed", "partial"] as const;
const exceptionSeverities = ["low", "medium", "high", "critical"] as const;
const exceptionStatuses = ["open", "investigating", "resolved", "accepted"] as const;

const controlInput = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.enum(categories).default("other"),
  frequency: z.enum(frequencies).default("monthly"),
  riskLevel: z.enum(risks).default("medium"),
  ownerId: z.coerce.number().int().positive().optional().nullable(),
  reviewerId: z.coerce.number().int().positive().optional().nullable(),
  threshold: z.coerce.number().finite().nonnegative().optional().nullable(),
  dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  status: z.enum(controlStatuses).default("active"),
}).superRefine((value, ctx) => {
  if (value.ownerId && value.reviewerId && value.ownerId === value.reviewerId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewerId"], message: "Owner and reviewer must be different people" });
  }
});

const runInput = z.object({
  periodStart: z.string().regex(ISO_DATE, "Period start must be YYYY-MM-DD"),
  periodEnd: z.string().regex(ISO_DATE, "Period end must be YYYY-MM-DD"),
  dueDate: z.string().regex(ISO_DATE, "Due date must be YYYY-MM-DD").optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  evidenceReference: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.periodEnd < value.periodStart) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["periodEnd"], message: "Period end must be on or after period start" });
  }
});

const runUpdateInput = z.object({
  status: z.enum(runStatuses),
  result: z.enum(runResults),
  notes: z.string().trim().max(2000).optional().nullable(),
  evidenceReference: z.string().trim().max(500).optional().nullable(),
  reviewedBy: z.coerce.number().int().positive().optional().nullable(),
});

const exceptionInput = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  severity: z.enum(exceptionSeverities).default("medium"),
  status: z.enum(exceptionStatuses).default("open"),
  assignedTo: z.coerce.number().int().positive().optional().nullable(),
  dueDate: z.string().regex(ISO_DATE, "Due date must be YYYY-MM-DD").optional().nullable(),
  resolution: z.string().trim().max(2000).optional().nullable(),
});

function idFromParam(value: string | string[]) {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validCalendarDate(value: string | null | undefined) {
  if (!value || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function scope(table: typeof financialControls, req: AuthRequest) {
  return req.user!.orgId === null ? isNull(table.orgId) : eq(table.orgId, req.user!.orgId);
}
function runScope(req: AuthRequest) {
  return req.user!.orgId === null ? isNull(controlRuns.orgId) : eq(controlRuns.orgId, req.user!.orgId);
}
function exceptionScope(req: AuthRequest) {
  return req.user!.orgId === null ? isNull(controlExceptions.orgId) : eq(controlExceptions.orgId, req.user!.orgId);
}

async function getControl(req: AuthRequest, id: number) {
  const [row] = await db.select().from(financialControls)
    .where(and(eq(financialControls.id, id), scope(financialControls, req))).limit(1);
  return row ?? null;
}
async function getRun(req: AuthRequest, id: number) {
  const [row] = await db.select().from(controlRuns)
    .where(and(eq(controlRuns.id, id), runScope(req))).limit(1);
  return row ?? null;
}
async function getException(req: AuthRequest, id: number) {
  const [row] = await db.select().from(controlExceptions)
    .where(and(eq(controlExceptions.id, id), exceptionScope(req))).limit(1);
  return row ?? null;
}

async function activeUserInScope(req: AuthRequest, id: number | null | undefined) {
  if (!id) return true;
  const conditions = [eq(users.id, id), eq(users.status, "active")];
  if (req.user!.orgId === null) conditions.push(isNull(users.orgId) as any);
  else conditions.push(eq(users.orgId, req.user!.orgId) as any);
  const [user] = await db.select({ id: users.id }).from(users).where(and(...conditions)).limit(1);
  return Boolean(user);
}

async function namesFor(ids: Array<number | null>) {
  const clean = ids.filter((id): id is number => Number.isInteger(id));
  if (!clean.length) return new Map<number, string>();
  const rows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users).where(inArray(users.id, clean));
  return new Map(rows.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim() || user.email]));
}

async function nextNumber(table: typeof financialControls | typeof controlRuns | typeof controlExceptions, prefix: string, tx: any = db) {
  const [row] = await tx.select({ max: sql<string>`max(${table.controlNumber ?? table.runNumber ?? table.exceptionNumber})` }).from(table);
  const max = row?.max ? parseInt(String(row.max).replace(new RegExp(`^${prefix}-0*`), "") || "0", 10) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

async function syncExceptionCount(tx: any, runId: number) {
  const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(controlExceptions)
    .where(eq(controlExceptions.controlRunId, runId));
  await tx.update(controlRuns).set({ exceptionCount: count?.count ?? 0, updatedAt: new Date() })
    .where(eq(controlRuns.id, runId));
}

router.get("/permissions", async (req: AuthRequest, res) => {
  try {
    if (req.user!.roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } }); return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, req.user!.roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } }); return;
    }
    const [permission] = await db.select().from(permissions)
      .where(and(eq(permissions.roleId, req.user!.roleId), sql`lower(${permissions.module}) = 'finance'`)).limit(1);
    res.json({ success: true, data: permission
      ? { canView: permission.canView, canCreate: permission.canCreate, canEdit: permission.canEdit, canDelete: permission.canDelete }
      : { canView: false, canCreate: false, canEdit: false, canDelete: false } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch financial controls permissions" });
  }
});

router.get("/users", requirePermission("Finance", "view"), async (req: AuthRequest, res) => {
  try {
    const userScope = req.user!.orgId === null ? isNull(users.orgId) : eq(users.orgId, req.user!.orgId);
    const data = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users).where(and(userScope, eq(users.status, "active"))).orderBy(users.firstName, users.lastName);
    res.json({ success: true, data: data.map((user) => ({ ...user, name: `${user.firstName} ${user.lastName}`.trim() || user.email })) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch control assignees" });
  }
});

router.get("/summary", requirePermission("Finance", "view"), async (req: AuthRequest, res) => {
  try {
    const controlWhere = scope(financialControls, req);
    const runWhere = runScope(req);
    const exceptionWhere = exceptionScope(req);
    const [[controlCount], [activeCount], [pendingCount], [openExceptions], [highExceptions], [completedRuns], [passedRuns]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(financialControls).where(controlWhere),
      db.select({ count: sql<number>`count(*)::int` }).from(financialControls).where(and(controlWhere, eq(financialControls.status, "active"))),
      db.select({ count: sql<number>`count(*)::int` }).from(controlRuns).where(and(runWhere, or(eq(controlRuns.status, "pending"), eq(controlRuns.status, "in_progress")))),
      db.select({ count: sql<number>`count(*)::int` }).from(controlExceptions).where(and(exceptionWhere, or(eq(controlExceptions.status, "open"), eq(controlExceptions.status, "investigating")))),
      db.select({ count: sql<number>`count(*)::int` }).from(controlExceptions).where(and(exceptionWhere, or(eq(controlExceptions.severity, "high"), eq(controlExceptions.severity, "critical")), or(eq(controlExceptions.status, "open"), eq(controlExceptions.status, "investigating")))),
      db.select({ count: sql<number>`count(*)::int` }).from(controlRuns).where(and(runWhere, eq(controlRuns.status, "completed"))),
      db.select({ count: sql<number>`count(*)::int` }).from(controlRuns).where(and(runWhere, eq(controlRuns.status, "completed"), eq(controlRuns.result, "passed"))),
    ]);
    const completed = completedRuns?.count ?? 0;
    res.json({ success: true, data: {
      totalControls: controlCount?.count ?? 0,
      activeControls: activeCount?.count ?? 0,
      pendingRuns: pendingCount?.count ?? 0,
      openExceptions: openExceptions?.count ?? 0,
      highRiskExceptions: highExceptions?.count ?? 0,
      completedRuns: completed,
      passedRuns: passedRuns?.count ?? 0,
      passRate: completed ? Math.round(((passedRuns?.count ?? 0) / completed) * 100) : 0,
    } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch financial controls summary" });
  }
});

router.get("/", requirePermission("Finance", "view"), async (req: AuthRequest, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" && controlStatuses.includes(req.query.status as any) ? req.query.status : "";
    const category = typeof req.query.category === "string" && categories.includes(req.query.category as any) ? req.query.category : "";
    const riskLevel = typeof req.query.riskLevel === "string" && risks.includes(req.query.riskLevel as any) ? req.query.riskLevel : "";
    const whereParts: any[] = [scope(financialControls, req)];
    if (search) whereParts.push(or(ilike(financialControls.controlNumber, `%${search}%`), ilike(financialControls.name, `%${search}%`), ilike(financialControls.description, `%${search}%`)));
    if (status) whereParts.push(eq(financialControls.status, status));
    if (category) whereParts.push(eq(financialControls.category, category));
    if (riskLevel) whereParts.push(eq(financialControls.riskLevel, riskLevel));
    const controls = await db.select().from(financialControls).where(and(...whereParts))
      .orderBy(desc(financialControls.updatedAt));
    const ids = controls.map((control) => control.id);
    const runs = ids.length ? await db.select().from(controlRuns)
      .where(and(runScope(req), inArray(controlRuns.controlId, ids))).orderBy(desc(controlRuns.createdAt)) : [];
    const ownerNames = await namesFor(controls.flatMap((control) => [control.ownerId, control.reviewerId]));
    const latest = new Map<number, typeof runs[number]>();
    for (const run of runs) if (!latest.has(run.controlId)) latest.set(run.controlId, run);
    res.json({ success: true, data: controls.map((control) => ({
      ...control,
      ownerName: control.ownerId ? ownerNames.get(control.ownerId) ?? "Unknown user" : null,
      reviewerName: control.reviewerId ? ownerNames.get(control.reviewerId) ?? "Unknown user" : null,
      latestRun: latest.get(control.id) ?? null,
      runCount: runs.filter((run) => run.controlId === control.id).length,
    })), total: controls.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch financial controls" });
  }
});

router.get("/:id", requirePermission("Finance", "view"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid control id" }); return; }
  try {
    const control = await getControl(req, id);
    if (!control) { res.status(404).json({ success: false, error: "Financial control not found" }); return; }
    const runs = await db.select().from(controlRuns).where(and(runScope(req), eq(controlRuns.controlId, id))).orderBy(desc(controlRuns.periodStart), desc(controlRuns.id));
    const exceptions = runs.length ? await db.select().from(controlExceptions)
      .where(and(exceptionScope(req), inArray(controlExceptions.controlRunId, runs.map((run) => run.id))))
      .orderBy(desc(controlExceptions.createdAt)) : [];
    const names = await namesFor([control.ownerId, control.reviewerId, ...runs.flatMap((run) => [run.performedBy, run.reviewedBy]), ...exceptions.map((item) => item.assignedTo)]);
    res.json({ success: true, data: {
      ...control,
      ownerName: control.ownerId ? names.get(control.ownerId) ?? "Unknown user" : null,
      reviewerName: control.reviewerId ? names.get(control.reviewerId) ?? "Unknown user" : null,
      runs: runs.map((run) => ({ ...run, performedByName: run.performedBy ? names.get(run.performedBy) ?? "Unknown user" : null, reviewedByName: run.reviewedBy ? names.get(run.reviewedBy) ?? "Unknown user" : null })),
      exceptions: exceptions.map((item) => ({ ...item, assignedToName: item.assignedTo ? names.get(item.assignedTo) ?? "Unknown user" : null })),
    } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch financial control details" });
  }
});

router.post("/", requirePermission("Finance", "create"), async (req: AuthRequest, res) => {
  const parsed = controlInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const value = parsed.data;
    if (!(await activeUserInScope(req, value.ownerId)) || !(await activeUserInScope(req, value.reviewerId))) {
      res.status(422).json({ success: false, error: "Owner and reviewer must be active users in your organization" }); return;
    }
    const controlNumber = await nextNumber(financialControls, "FC");
    const [created] = await db.insert(financialControls).values({
      ...value, controlNumber, orgId: req.user!.orgId,
      description: value.description ?? null, ownerId: value.ownerId ?? null, reviewerId: value.reviewerId ?? null,
      threshold: value.threshold == null ? null : value.threshold.toFixed(2), dueDay: value.dueDay ?? null, createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to create financial control" });
  }
});

router.put("/:id", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid control id" }); return; }
  const parsed = controlInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    if (!(await getControl(req, id))) { res.status(404).json({ success: false, error: "Financial control not found" }); return; }
    const value = parsed.data;
    if (!(await activeUserInScope(req, value.ownerId)) || !(await activeUserInScope(req, value.reviewerId))) {
      res.status(422).json({ success: false, error: "Owner and reviewer must be active users in your organization" }); return;
    }
    const [updated] = await db.update(financialControls).set({
      ...value, description: value.description ?? null, ownerId: value.ownerId ?? null, reviewerId: value.reviewerId ?? null,
      threshold: value.threshold == null ? null : value.threshold.toFixed(2), dueDay: value.dueDay ?? null, updatedAt: new Date(),
    }).where(and(eq(financialControls.id, id), scope(financialControls, req))).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update financial control" });
  }
});

router.delete("/:id", requirePermission("Finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid control id" }); return; }
  try {
    if (!(await getControl(req, id))) { res.status(404).json({ success: false, error: "Financial control not found" }); return; }
    const [run] = await db.select({ id: controlRuns.id }).from(controlRuns).where(and(runScope(req), eq(controlRuns.controlId, id))).limit(1);
    if (run) { res.status(409).json({ success: false, error: "Controls with execution history cannot be deleted; mark them inactive instead" }); return; }
    await db.delete(financialControls).where(and(eq(financialControls.id, id), scope(financialControls, req)));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete financial control" });
  }
});

router.post("/:id/runs", requirePermission("Finance", "create"), async (req: AuthRequest, res) => {
  const controlId = idFromParam(req.params.id);
  if (!controlId) { res.status(400).json({ success: false, error: "Invalid control id" }); return; }
  const parsed = runInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  if (!validCalendarDate(parsed.data.periodStart) || !validCalendarDate(parsed.data.periodEnd) || (parsed.data.dueDate && !validCalendarDate(parsed.data.dueDate))) {
    res.status(422).json({ success: false, error: "Dates must be real calendar dates" }); return;
  }
  try {
    const control = await getControl(req, controlId);
    if (!control) { res.status(404).json({ success: false, error: "Financial control not found" }); return; }
    if (control.status !== "active") { res.status(409).json({ success: false, error: "Inactive controls cannot be executed" }); return; }
    const duplicate = await db.select({ id: controlRuns.id }).from(controlRuns).where(and(runScope(req), eq(controlRuns.controlId, controlId), eq(controlRuns.periodStart, parsed.data.periodStart), eq(controlRuns.periodEnd, parsed.data.periodEnd))).limit(1);
    if (duplicate.length) { res.status(409).json({ success: false, error: "A run for this control and period already exists" }); return; }
    const runNumber = await nextNumber(controlRuns, "CR");
    const [created] = await db.insert(controlRuns).values({
      ...parsed.data, controlId, orgId: req.user!.orgId, runNumber, status: "pending", result: "pending",
      dueDate: parsed.data.dueDate ?? null, notes: parsed.data.notes ?? null, evidenceReference: parsed.data.evidenceReference ?? null, createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create control run" });
  }
});

router.put("/runs/:id", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid run id" }); return; }
  const parsed = runUpdateInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const existing = await getRun(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Control run not found" }); return; }
    if (parsed.data.status === "completed" && parsed.data.result === "pending") {
      res.status(422).json({ success: false, error: "Completed runs must have a result" }); return;
    }
    if (parsed.data.status === "waived" && parsed.data.result === "pending") {
      res.status(422).json({ success: false, error: "Waived runs must record a result" }); return;
    }
    if (!(await activeUserInScope(req, parsed.data.reviewedBy))) {
      res.status(422).json({ success: false, error: "Reviewer must be an active user in your organization" }); return;
    }
    const completing = parsed.data.status === "completed" || parsed.data.status === "waived";
    const [updated] = await db.update(controlRuns).set({
      status: parsed.data.status, result: parsed.data.result, notes: parsed.data.notes ?? null,
      evidenceReference: parsed.data.evidenceReference ?? null, reviewedBy: parsed.data.reviewedBy ?? null,
      performedBy: completing ? (existing.performedBy ?? req.user!.userId) : existing.performedBy,
      performedAt: completing ? (existing.performedAt ?? new Date()) : existing.performedAt,
      reviewedAt: parsed.data.reviewedBy ? new Date() : existing.reviewedAt, updatedAt: new Date(),
    }).where(and(eq(controlRuns.id, id), runScope(req))).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update control run" });
  }
});

router.delete("/runs/:id", requirePermission("Finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid run id" }); return; }
  try {
    const run = await getRun(req, id);
    if (!run) { res.status(404).json({ success: false, error: "Control run not found" }); return; }
    if (run.status === "completed" || run.status === "waived") { res.status(409).json({ success: false, error: "Completed and waived runs are retained for audit history" }); return; }
    const [exception] = await db.select({ id: controlExceptions.id }).from(controlExceptions).where(eq(controlExceptions.controlRunId, id)).limit(1);
    if (exception) { res.status(409).json({ success: false, error: "Runs with exceptions cannot be deleted" }); return; }
    await db.delete(controlRuns).where(and(eq(controlRuns.id, id), runScope(req)));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete control run" });
  }
});

router.post("/runs/:id/exceptions", requirePermission("Finance", "create"), async (req: AuthRequest, res) => {
  const runId = idFromParam(req.params.id);
  if (!runId) { res.status(400).json({ success: false, error: "Invalid run id" }); return; }
  const parsed = exceptionInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const run = await getRun(req, runId);
    if (!run) { res.status(404).json({ success: false, error: "Control run not found" }); return; }
    if (run.status === "waived") { res.status(409).json({ success: false, error: "Waived runs cannot receive exceptions" }); return; }
    if (!(await activeUserInScope(req, parsed.data.assignedTo))) { res.status(422).json({ success: false, error: "Assignee must be an active user in your organization" }); return; }
    if ((parsed.data.status === "resolved" || parsed.data.status === "accepted") && !parsed.data.resolution) {
      res.status(422).json({ success: false, error: "A resolution is required when closing an exception" }); return;
    }
    const exceptionNumber = await nextNumber(controlExceptions, "EX");
    const closed = parsed.data.status === "resolved" || parsed.data.status === "accepted";
    const [created] = await db.transaction(async (tx) => {
      const [item] = await tx.insert(controlExceptions).values({
        ...parsed.data, controlRunId: runId, orgId: req.user!.orgId, exceptionNumber,
        description: parsed.data.description ?? null, assignedTo: parsed.data.assignedTo ?? null,
        dueDate: parsed.data.dueDate ?? null, resolution: parsed.data.resolution ?? null,
        resolvedBy: closed ? req.user!.userId : null, resolvedAt: closed ? new Date() : null, createdBy: req.user!.userId,
      }).returning();
      await syncExceptionCount(tx, runId);
      return [item];
    });
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create control exception" });
  }
});

router.put("/exceptions/:id", requirePermission("Finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid exception id" }); return; }
  const parsed = exceptionInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const existing = await getException(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Control exception not found" }); return; }
    if (!(await activeUserInScope(req, parsed.data.assignedTo))) { res.status(422).json({ success: false, error: "Assignee must be an active user in your organization" }); return; }
    const closed = parsed.data.status === "resolved" || parsed.data.status === "accepted";
    if (closed && !parsed.data.resolution) { res.status(422).json({ success: false, error: "A resolution is required when closing an exception" }); return; }
    const [updated] = await db.transaction(async (tx) => {
      const [item] = await tx.update(controlExceptions).set({
        ...parsed.data, description: parsed.data.description ?? null, assignedTo: parsed.data.assignedTo ?? null,
        dueDate: parsed.data.dueDate ?? null, resolution: parsed.data.resolution ?? null,
        resolvedBy: closed ? (existing.resolvedBy ?? req.user!.userId) : null,
        resolvedAt: closed ? (existing.resolvedAt ?? new Date()) : null, updatedAt: new Date(),
      }).where(and(eq(controlExceptions.id, id), exceptionScope(req))).returning();
      await syncExceptionCount(tx, existing.controlRunId);
      return [item];
    });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update control exception" });
  }
});

router.delete("/exceptions/:id", requirePermission("Finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid exception id" }); return; }
  try {
    const existing = await getException(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Control exception not found" }); return; }
    if (existing.status === "resolved" || existing.status === "accepted") { res.status(409).json({ success: false, error: "Resolved exceptions are retained for audit history" }); return; }
    await db.transaction(async (tx) => {
      await tx.delete(controlExceptions).where(and(eq(controlExceptions.id, id), exceptionScope(req)));
      await syncExceptionCount(tx, existing.controlRunId);
    });
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete control exception" });
  }
});

export default router;