/**
 * /api/workflow — Workflow Automation module
 *
 * Covers: Definitions (CRUD + toggle + manual trigger), Steps, Instances, Logs
 * All routes require authentication + "Workflow Automation" module permission.
 */
import { Router } from "express";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import {
  db, permissions, roles,
  wfDefinitions, wfSteps, wfInstances, wfInstanceLogs,
} from "@workspace/db";
import {
  insertWfDefinitionSchema,
  updateWfDefinitionSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { resolveRoleModulePermissions } from "../lib/rbac";

const router = Router();
router.use(requireAuth);

const MODULE = "Workflow Automation";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate execution of a workflow: creates instance + per-step logs */
async function executeWorkflow(
  workflowId: number,
  orgId: number,
  triggeredBy: number,
  triggerType: string,
  triggerData: Record<string, unknown> = {},
): Promise<typeof wfInstances.$inferSelect> {
  const startedAt = new Date();

  // Fetch steps
  const steps = await db
    .select()
    .from(wfSteps)
    .where(and(eq(wfSteps.workflowId, workflowId), eq(wfSteps.isEnabled, true)))
    .orderBy(wfSteps.stepOrder);

  // Create instance
  const [instance] = await db
    .insert(wfInstances)
    .values({
      workflowId,
      orgId,
      status: "running",
      triggerType,
      triggerData,
      startedAt,
      triggeredBy,
    })
    .returning();

  // Simulate each step execution
  let failed = false;
  let failMessage = "";
  for (const step of steps) {
    const stepStart = new Date();
    // Simulate ~80% success rate for realism
    const stepSuccess = Math.random() > 0.1;
    const stepEnd = new Date(stepStart.getTime() + Math.floor(Math.random() * 300 + 50));

    await db.insert(wfInstanceLogs).values({
      instanceId:   instance.id,
      stepId:       step.id,
      stepName:     step.name,
      stepOrder:    step.stepOrder,
      status:       stepSuccess ? "completed" : "failed",
      startedAt:    stepStart,
      completedAt:  stepEnd,
      output:       stepSuccess
        ? { message: `Step "${step.name}" completed successfully`, actionType: step.actionType }
        : {},
      errorMessage: stepSuccess ? null : `Step "${step.name}" failed: action could not be completed`,
    });

    if (!stepSuccess) {
      failed = true;
      failMessage = `Step "${step.name}" failed`;
      break; // Stop on first failure
    }
  }

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();
  const finalStatus = failed ? "failed" : "completed";

  // Update instance
  await db
    .update(wfInstances)
    .set({ status: finalStatus, completedAt, durationMs, errorMessage: failed ? failMessage : null })
    .where(eq(wfInstances.id, instance.id));

  // Update definition stats
  await db
    .update(wfDefinitions)
    .set({
      runCount:     sql`${wfDefinitions.runCount} + 1`,
      successCount: failed ? undefined : sql`${wfDefinitions.successCount} + 1`,
      lastRunAt:    completedAt,
      updatedAt:    new Date(),
    })
    .where(eq(wfDefinitions.id, workflowId));

  return { ...instance, status: finalStatus, completedAt, durationMs };
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

    const [[{ total }], [{ active }], [{ todayRuns }], [{ todaySuccess }]] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` })
        .from(wfDefinitions).where(eq(wfDefinitions.orgId, orgId)),
      db.select({ active: sql<number>`count(*)::int` })
        .from(wfDefinitions).where(and(eq(wfDefinitions.orgId, orgId), eq(wfDefinitions.status, "active"))),
      db.select({ todayRuns: sql<number>`count(*)::int` })
        .from(wfInstances).where(and(
          eq(wfInstances.orgId, orgId),
          sql`${wfInstances.startedAt} >= current_date`,
        )),
      db.select({ todaySuccess: sql<number>`count(*)::int` })
        .from(wfInstances).where(and(
          eq(wfInstances.orgId, orgId),
          eq(wfInstances.status, "completed"),
          sql`${wfInstances.startedAt} >= current_date`,
        )),
    ]);

    const successRate = todayRuns > 0 ? Math.round((todaySuccess / todayRuns) * 1000) / 10 : 0;

    res.json({ success: true, data: { total, active, todayRuns, todaySuccess, successRate } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ── Definitions ───────────────────────────────────────────────────────────────

router.get("/definitions", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search   = (req.query.search   as string | undefined) ?? "";
    const status   = (req.query.status   as string | undefined) ?? "";
    const category = (req.query.category as string | undefined) ?? "";
    const page     = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit    = 50;
    const offset   = (page - 1) * limit;

    const conditions = [eq(wfDefinitions.orgId, orgId)];
    if (search)   conditions.push(ilike(wfDefinitions.name, `%${search}%`));
    if (status)   conditions.push(eq(wfDefinitions.status, status));
    if (category) conditions.push(eq(wfDefinitions.category, category));

    const [rows, [{ total }]] = await Promise.all([
      db.select({
          id:           wfDefinitions.id,
          name:         wfDefinitions.name,
          description:  wfDefinitions.description,
          category:     wfDefinitions.category,
          triggerType:  wfDefinitions.triggerType,
          triggerConfig: wfDefinitions.triggerConfig,
          status:       wfDefinitions.status,
          runCount:     wfDefinitions.runCount,
          successCount: wfDefinitions.successCount,
          lastRunAt:    wfDefinitions.lastRunAt,
          createdAt:    wfDefinitions.createdAt,
          updatedAt:    wfDefinitions.updatedAt,
          stepCount:    sql<number>`(select count(*)::int from wf_steps s where s.workflow_id = ${wfDefinitions.id})`,
        })
        .from(wfDefinitions)
        .where(and(...conditions))
        .orderBy(desc(wfDefinitions.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(wfDefinitions)
        .where(and(...conditions)),
    ]);

    res.json({ success: true, data: rows, total, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch workflow definitions" });
  }
});

router.get("/definitions/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [wf] = await db
      .select()
      .from(wfDefinitions)
      .where(and(eq(wfDefinitions.id, id), eq(wfDefinitions.orgId, orgId)))
      .limit(1);
    if (!wf) { res.status(404).json({ success: false, error: "Workflow not found" }); return; }

    const steps = await db
      .select()
      .from(wfSteps)
      .where(eq(wfSteps.workflowId, id))
      .orderBy(wfSteps.stepOrder);

    res.json({ success: true, data: { ...wf, steps } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch workflow" });
  }
});

router.post("/definitions", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertWfDefinitionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const { steps = [], ...defData } = parsed.data;

    const [created] = await db
      .insert(wfDefinitions)
      .values({ ...defData, orgId, createdBy: req.user!.userId })
      .returning();

    // Insert steps
    if (steps.length > 0) {
      await db.insert(wfSteps).values(
        steps.map((s, i) => ({
          workflowId:      created.id,
          stepOrder:       s.stepOrder ?? i + 1,
          name:            s.name,
          actionType:      s.actionType,
          actionConfig:    s.actionConfig ?? {},
          conditionConfig: s.conditionConfig ?? {},
          isEnabled:       s.isEnabled ?? true,
        })),
      );
    }

    const insertedSteps = await db
      .select()
      .from(wfSteps)
      .where(eq(wfSteps.workflowId, created.id))
      .orderBy(wfSteps.stepOrder);

    res.status(201).json({ success: true, data: { ...created, steps: insertedSteps } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create workflow" });
  }
});

router.put("/definitions/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }

  const parsed = updateWfDefinitionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: wfDefinitions.id })
      .from(wfDefinitions)
      .where(and(eq(wfDefinitions.id, id), eq(wfDefinitions.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Workflow not found" }); return; }

    const { steps, ...defData } = parsed.data;

    const [updated] = await db
      .update(wfDefinitions)
      .set({ ...defData, updatedAt: new Date() })
      .where(eq(wfDefinitions.id, id))
      .returning();

    // Replace steps if provided
    if (steps !== undefined) {
      await db.delete(wfSteps).where(eq(wfSteps.workflowId, id));
      if (steps.length > 0) {
        await db.insert(wfSteps).values(
          steps.map((s, i) => ({
            workflowId:      id,
            stepOrder:       s.stepOrder ?? i + 1,
            name:            s.name,
            actionType:      s.actionType,
            actionConfig:    s.actionConfig ?? {},
            conditionConfig: s.conditionConfig ?? {},
            isEnabled:       s.isEnabled ?? true,
          })),
        );
      }
    }

    const finalSteps = await db
      .select()
      .from(wfSteps)
      .where(eq(wfSteps.workflowId, id))
      .orderBy(wfSteps.stepOrder);

    res.json({ success: true, data: { ...updated, steps: finalSteps } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update workflow" });
  }
});

router.delete("/definitions/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: wfDefinitions.id, status: wfDefinitions.status, name: wfDefinitions.name })
      .from(wfDefinitions)
      .where(and(eq(wfDefinitions.id, id), eq(wfDefinitions.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Workflow not found" }); return; }
    if (existing.status === "active") {
      res.status(409).json({ success: false, error: "Cannot delete an active workflow. Pause it first." });
      return;
    }
    await db.delete(wfDefinitions).where(eq(wfDefinitions.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete workflow" });
  }
});

// ── Toggle status ──────────────────────────────────────────────────────────────

router.post("/definitions/:id/toggle", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: wfDefinitions.id, status: wfDefinitions.status })
      .from(wfDefinitions)
      .where(and(eq(wfDefinitions.id, id), eq(wfDefinitions.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Workflow not found" }); return; }
    if (existing.status === "draft") {
      res.status(409).json({ success: false, error: "Cannot activate a draft workflow. Publish it first." });
      return;
    }
    const newStatus = existing.status === "active" ? "paused" : "active";
    const [updated] = await db
      .update(wfDefinitions)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(wfDefinitions.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle workflow" });
  }
});

// ── Publish draft ─────────────────────────────────────────────────────────────

router.post("/definitions/:id/publish", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: wfDefinitions.id, status: wfDefinitions.status })
      .from(wfDefinitions)
      .where(and(eq(wfDefinitions.id, id), eq(wfDefinitions.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Workflow not found" }); return; }
    const stepCount = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(wfSteps)
      .where(eq(wfSteps.workflowId, id));
    if ((stepCount[0]?.cnt ?? 0) === 0) {
      res.status(409).json({ success: false, error: "Cannot publish a workflow with no steps." });
      return;
    }
    const [updated] = await db
      .update(wfDefinitions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(wfDefinitions.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to publish workflow" });
  }
});

// ── Manual Trigger ────────────────────────────────────────────────────────────

router.post("/definitions/:id/trigger", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [wf] = await db
      .select({ id: wfDefinitions.id, status: wfDefinitions.status, name: wfDefinitions.name })
      .from(wfDefinitions)
      .where(and(eq(wfDefinitions.id, id), eq(wfDefinitions.orgId, orgId)))
      .limit(1);
    if (!wf) { res.status(404).json({ success: false, error: "Workflow not found" }); return; }
    if (wf.status === "draft") {
      res.status(409).json({ success: false, error: "Cannot trigger a draft workflow. Publish it first." });
      return;
    }

    const instance = await executeWorkflow(
      id, orgId, req.user!.userId, "manual", req.body ?? {},
    );
    res.status(201).json({ success: true, data: instance });
  } catch {
    res.status(500).json({ success: false, error: "Failed to trigger workflow" });
  }
});

// ── Instances ─────────────────────────────────────────────────────────────────

router.get("/instances", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const wfId   = req.query.workflowId ? parseInt(req.query.workflowId as string) : undefined;
    const status = (req.query.status as string | undefined) ?? "";
    const page   = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit  = 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(wfInstances.orgId, orgId)];
    if (wfId)   conditions.push(eq(wfInstances.workflowId, wfId));
    if (status) conditions.push(eq(wfInstances.status, status));

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:           wfInstances.id,
          workflowId:   wfInstances.workflowId,
          status:       wfInstances.status,
          triggerType:  wfInstances.triggerType,
          startedAt:    wfInstances.startedAt,
          completedAt:  wfInstances.completedAt,
          durationMs:   wfInstances.durationMs,
          errorMessage: wfInstances.errorMessage,
          workflowName: wfDefinitions.name,
          workflowCategory: wfDefinitions.category,
        })
        .from(wfInstances)
        .leftJoin(wfDefinitions, eq(wfInstances.workflowId, wfDefinitions.id))
        .where(and(...conditions))
        .orderBy(desc(wfInstances.startedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(wfInstances)
        .where(and(...conditions)),
    ]);

    res.json({ success: true, data: rows, total, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch instances" });
  }
});

router.get("/instances/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [instance] = await db
      .select({
        id:           wfInstances.id,
        workflowId:   wfInstances.workflowId,
        status:       wfInstances.status,
        triggerType:  wfInstances.triggerType,
        triggerData:  wfInstances.triggerData,
        startedAt:    wfInstances.startedAt,
        completedAt:  wfInstances.completedAt,
        durationMs:   wfInstances.durationMs,
        errorMessage: wfInstances.errorMessage,
        workflowName: wfDefinitions.name,
        workflowCategory: wfDefinitions.category,
      })
      .from(wfInstances)
      .leftJoin(wfDefinitions, eq(wfInstances.workflowId, wfDefinitions.id))
      .where(and(eq(wfInstances.id, id), eq(wfInstances.orgId, orgId)))
      .limit(1);
    if (!instance) { res.status(404).json({ success: false, error: "Instance not found" }); return; }

    const logs = await db
      .select()
      .from(wfInstanceLogs)
      .where(eq(wfInstanceLogs.instanceId, id))
      .orderBy(wfInstanceLogs.stepOrder);

    res.json({ success: true, data: { ...instance, logs } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch instance" });
  }
});

export default router;
