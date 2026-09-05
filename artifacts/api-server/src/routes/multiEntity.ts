import { Router } from "express";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { branches, businessUnits, consolidationRuns, db, intercompanyReconciliations, intercompanyTransactions, invWarehouses, journalEntries, organizations, warehouseNodes } from "@workspace/db";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.coerce.number().int().positive();
const scope = (req: AuthRequest, orgColumn: any) => eq(orgColumn, req.user!.orgId!);
const branchScope = (req: AuthRequest, branchColumn: any) => req.user!.branchId ? eq(branchColumn, req.user!.branchId) : undefined;
function parseParam(value: string | string[]) { const parsed = Number(Array.isArray(value) ? value[0] : value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
async function validBranch(orgId: number, branchId: number | null) {
  if (!branchId) return true;
  return !!(await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.orgId, orgId))).limit(1))[0];
}
async function validUnitParent(orgId: number, parentId: number | null) {
  if (!parentId) return true;
  return !!(await db.select({ id: businessUnits.id }).from(businessUnits).where(and(eq(businessUnits.id, parentId), eq(businessUnits.orgId, orgId))).limit(1))[0];
}
async function validWarehouse(orgId: number, warehouseId: number | null, branchId: number | null) {
  if (!warehouseId) return true;
  const [warehouse] = await db.select({ id: invWarehouses.id, branchId: invWarehouses.branchId }).from(invWarehouses).where(and(eq(invWarehouses.id, warehouseId), eq(invWarehouses.orgId, orgId))).limit(1);
  return !!warehouse && (!branchId || warehouse.branchId === null || warehouse.branchId === branchId);
}
async function validNodeParent(orgId: number, parentId: number | null) {
  if (!parentId) return true;
  return !!(await db.select({ id: warehouseNodes.id }).from(warehouseNodes).where(and(eq(warehouseNodes.id, parentId), eq(warehouseNodes.orgId, orgId))).limit(1))[0];
}

router.get("/context", async (req: AuthRequest, res) => {
  const orgId = req.user!.orgId!;
  const branchFilter = branchScope(req, branches.id);
  const [units, branchRows, warehouses, nodes, companies] = await Promise.all([
    db.select().from(businessUnits).where(and(scope(req, businessUnits.orgId), branchFilter ? or(eq(businessUnits.branchId, req.user!.branchId!), sql`${businessUnits.branchId} is null`) : undefined)).orderBy(asc(businessUnits.code)),
    db.select().from(branches).where(and(eq(branches.orgId, orgId), branchFilter)).orderBy(asc(branches.name)),
    db.select().from(invWarehouses).where(eq(invWarehouses.orgId, orgId)).orderBy(asc(invWarehouses.code)),
    db.select().from(warehouseNodes).where(eq(warehouseNodes.orgId, orgId)).orderBy(asc(warehouseNodes.code)),
    db.select({ id: organizations.id, name: organizations.name, currency: organizations.currency, type: organizations.type }).from(organizations).where(eq(organizations.tenantId, (await db.select({ tenantId: organizations.tenantId }).from(organizations).where(eq(organizations.id, orgId)).limit(1))[0]?.tenantId ?? -1)).orderBy(asc(organizations.name)),
  ]);
  res.json({ success: true, data: { units, branches: branchRows, warehouses, warehouseNodes: nodes, companies } });
});

router.get("/business-units", async (req: AuthRequest, res) => {
  const rows = await db.select().from(businessUnits).where(and(scope(req, businessUnits.orgId), branchScope(req, businessUnits.branchId))).orderBy(asc(businessUnits.code));
  res.json({ success: true, data: rows });
});
router.post("/business-units", async (req: AuthRequest, res) => {
  const parsed = z.object({ code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(160), branchId: id.nullable().optional(), parentId: id.nullable().optional(), unitType: z.string().trim().min(1).max(40).default("operating"), currency: z.string().length(3).default("INR") }).safeParse(req.body);
  if (!parsed.success || !(await validBranch(req.user!.orgId!, parsed.data.branchId ?? null)) || !(await validUnitParent(req.user!.orgId!, parsed.data.parentId ?? null))) { res.status(400).json({ success: false, error: "Invalid business unit, parent, or branch" }); return; }
  try { const [row] = await db.insert(businessUnits).values({ ...parsed.data, orgId: req.user!.orgId!, branchId: parsed.data.branchId ?? null, parentId: parsed.data.parentId ?? null, currency: parsed.data.currency.toUpperCase(), createdBy: req.user!.userId }).returning(); res.status(201).json({ success: true, data: row }); }
  catch { res.status(409).json({ success: false, error: "Business unit code already exists" }); }
});
router.put("/business-units/:id", async (req: AuthRequest, res) => {
  const unitId = parseParam(req.params.id); if (!unitId) { res.status(400).json({ success: false, error: "Invalid business unit" }); return; }
  const parsed = z.object({ name: z.string().trim().min(1).max(160).optional(), branchId: id.nullable().optional(), parentId: id.nullable().optional(), status: z.enum(["active", "inactive"]).optional() }).safeParse(req.body);
  if (!parsed.success || !(await validBranch(req.user!.orgId!, parsed.data.branchId ?? null)) || !(await validUnitParent(req.user!.orgId!, parsed.data.parentId ?? null))) { res.status(400).json({ success: false, error: "Invalid business unit, parent, or branch" }); return; }
  const [row] = await db.update(businessUnits).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(businessUnits.id, unitId), scope(req, businessUnits.orgId))).returning();
  if (!row) { res.status(404).json({ success: false, error: "Business unit not found" }); return; } res.json({ success: true, data: row });
});
router.delete("/business-units/:id", async (req: AuthRequest, res) => {
  const unitId = parseParam(req.params.id); if (!unitId) { res.status(400).json({ success: false, error: "Invalid business unit" }); return; }
  const [child] = await db.select({ id: businessUnits.id }).from(businessUnits).where(and(eq(businessUnits.parentId, unitId), scope(req, businessUnits.orgId))).limit(1);
  if (child) { res.status(409).json({ success: false, error: "Move child business units before deleting this unit" }); return; }
  const [deleted] = await db.delete(businessUnits).where(and(eq(businessUnits.id, unitId), scope(req, businessUnits.orgId))).returning({ id: businessUnits.id });
  if (!deleted) { res.status(404).json({ success: false, error: "Business unit not found" }); return; } res.json({ success: true, data: deleted });
});

router.get("/warehouse-hierarchy", async (req: AuthRequest, res) => { const rows = await db.select({ node: warehouseNodes, warehouseName: invWarehouses.name }).from(warehouseNodes).leftJoin(invWarehouses, eq(invWarehouses.id, warehouseNodes.warehouseId)).where(and(scope(req, warehouseNodes.orgId), branchScope(req, warehouseNodes.branchId))).orderBy(asc(warehouseNodes.code)); res.json({ success: true, data: rows }); });
router.post("/warehouse-hierarchy", async (req: AuthRequest, res) => {
  const parsed = z.object({ code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(160), warehouseId: id.nullable().optional(), branchId: id.nullable().optional(), parentId: id.nullable().optional(), nodeType: z.enum(["group", "warehouse", "zone", "bin"]).default("warehouse") }).safeParse(req.body);
  if (!parsed.success || !(await validBranch(req.user!.orgId!, parsed.data.branchId ?? null)) || !(await validWarehouse(req.user!.orgId!, parsed.data.warehouseId ?? null, parsed.data.branchId ?? null)) || !(await validNodeParent(req.user!.orgId!, parsed.data.parentId ?? null))) { res.status(400).json({ success: false, error: "Invalid warehouse node, parent, linked warehouse, or branch" }); return; }
  const [row] = await db.insert(warehouseNodes).values({ ...parsed.data, orgId: req.user!.orgId!, warehouseId: parsed.data.warehouseId ?? null, branchId: parsed.data.branchId ?? null, parentId: parsed.data.parentId ?? null }).returning(); res.status(201).json({ success: true, data: row });
});
router.put("/warehouse-hierarchy/:id", async (req: AuthRequest, res) => {
  const nodeId = parseParam(req.params.id); if (!nodeId) { res.status(400).json({ success: false, error: "Invalid warehouse node" }); return; }
  const parsed = z.object({ name: z.string().trim().min(1).max(160).optional(), parentId: id.nullable().optional(), branchId: id.nullable().optional(), warehouseId: id.nullable().optional(), nodeType: z.enum(["group", "warehouse", "zone", "bin"]).optional() }).safeParse(req.body);
  if (!parsed.success || !(await validBranch(req.user!.orgId!, parsed.data.branchId ?? null)) || !(await validWarehouse(req.user!.orgId!, parsed.data.warehouseId ?? null, parsed.data.branchId ?? null)) || !(await validNodeParent(req.user!.orgId!, parsed.data.parentId ?? null))) { res.status(400).json({ success: false, error: "Invalid warehouse node, parent, linked warehouse, or branch" }); return; }
  const [row] = await db.update(warehouseNodes).set({ ...parsed.data, branchId: parsed.data.branchId ?? null, warehouseId: parsed.data.warehouseId ?? null, parentId: parsed.data.parentId ?? null }).where(and(eq(warehouseNodes.id, nodeId), scope(req, warehouseNodes.orgId))).returning();
  if (!row) { res.status(404).json({ success: false, error: "Warehouse node not found" }); return; } res.json({ success: true, data: row });
});
router.delete("/warehouse-hierarchy/:id", async (req: AuthRequest, res) => {
  const nodeId = parseParam(req.params.id); if (!nodeId) { res.status(400).json({ success: false, error: "Invalid warehouse node" }); return; }
  const [child] = await db.select({ id: warehouseNodes.id }).from(warehouseNodes).where(and(eq(warehouseNodes.parentId, nodeId), scope(req, warehouseNodes.orgId))).limit(1);
  if (child) { res.status(409).json({ success: false, error: "Move child nodes before deleting this node" }); return; }
  const [deleted] = await db.delete(warehouseNodes).where(and(eq(warehouseNodes.id, nodeId), scope(req, warehouseNodes.orgId))).returning({ id: warehouseNodes.id });
  if (!deleted) { res.status(404).json({ success: false, error: "Warehouse node not found" }); return; } res.json({ success: true, data: deleted });
});

router.get("/consolidation", async (req: AuthRequest, res) => { const rows = await db.select().from(consolidationRuns).where(eq(consolidationRuns.orgId, req.user!.orgId!)).orderBy(desc(consolidationRuns.id)); res.json({ success: true, data: rows }); });
router.post("/consolidation", async (req: AuthRequest, res) => {
  const parsed = z.object({ periodStart: date, periodEnd: date }).safeParse(req.body);
  if (!parsed.success || parsed.data.periodEnd < parsed.data.periodStart) { res.status(400).json({ success: false, error: "Invalid consolidation period" }); return; }
  const [current] = await db.select({ tenantId: organizations.tenantId }).from(organizations).where(eq(organizations.id, req.user!.orgId!)).limit(1);
  const entities = current?.tenantId == null ? [{ id: req.user!.orgId! }] : await db.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.tenantId, current.tenantId), eq(organizations.status, "active")));
  const entityIds = entities.map((entity) => entity.id);
  const [totals] = await db.select({
    debit: sql<string>`coalesce(sum(${journalEntries.totalDebit}), '0')`,
    credit: sql<string>`coalesce(sum(${journalEntries.totalCredit}), '0')`,
  }).from(journalEntries).where(and(inArray(journalEntries.orgId, entityIds), eq(journalEntries.status, "posted"), sql`${journalEntries.date} >= ${parsed.data.periodStart}`, sql`${journalEntries.date} <= ${parsed.data.periodEnd}`, sql`coalesce(${journalEntries.reference}, '') not like 'ELIM-%'`));
  const totalDebit = Number(totals?.debit ?? 0);
  const totalCredit = Number(totals?.credit ?? 0);
  const [row] = await db.insert(consolidationRuns).values({ ...parsed.data, orgId: req.user!.orgId!, entityCount: entityIds.length, status: "completed", totals: { totalDebit, totalCredit, net: totalCredit - totalDebit }, createdBy: req.user!.userId }).returning();
  res.status(201).json({ success: true, data: row });
});
router.get("/reconciliation", async (req: AuthRequest, res) => { const rows = await db.select({ reconciliation: intercompanyReconciliations, counterparty: organizations.name }).from(intercompanyReconciliations).innerJoin(organizations, eq(organizations.id, intercompanyReconciliations.counterpartyOrgId)).where(eq(intercompanyReconciliations.orgId, req.user!.orgId!)).orderBy(desc(intercompanyReconciliations.asOfDate)); res.json({ success: true, data: rows }); });
router.post("/reconciliation", async (req: AuthRequest, res) => {
  const parsed = z.object({ counterpartyOrgId: id, asOfDate: date, notes: z.string().trim().max(500).nullable().optional() }).safeParse(req.body);
  if (!parsed.success || parsed.data.counterpartyOrgId === req.user!.orgId) { res.status(400).json({ success: false, error: "Invalid reconciliation" }); return; }
  const orgId = req.user!.orgId!;
  const [counterparty] = await db.select({ id: organizations.id, tenantId: organizations.tenantId }).from(organizations).where(and(eq(organizations.id, parsed.data.counterpartyOrgId), eq(organizations.status, "active"))).limit(1);
  const [current] = await db.select({ tenantId: organizations.tenantId }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!counterparty || counterparty.tenantId !== current?.tenantId) { res.status(404).json({ success: false, error: "Counterparty is outside the current company group" }); return; }
  const activeTransaction = sql`${intercompanyTransactions.status} in ('posted', 'settled', 'eliminated')`;
  const [sourceRows, targetRows] = await Promise.all([
    db.select({ amount: sql<string>`coalesce(sum(${intercompanyTransactions.amount}), '0')` }).from(intercompanyTransactions).where(and(eq(intercompanyTransactions.fromOrgId, orgId), eq(intercompanyTransactions.toOrgId, parsed.data.counterpartyOrgId), sql`${intercompanyTransactions.transactionDate} <= ${parsed.data.asOfDate}`, activeTransaction)),
    db.select({ amount: sql<string>`coalesce(sum(${intercompanyTransactions.amount}), '0')` }).from(intercompanyTransactions).where(and(eq(intercompanyTransactions.toOrgId, orgId), eq(intercompanyTransactions.fromOrgId, parsed.data.counterpartyOrgId), sql`${intercompanyTransactions.transactionDate} <= ${parsed.data.asOfDate}`, activeTransaction)),
  ]);
  const sourceAmount = Number(sourceRows[0]?.amount ?? 0);
  const targetAmount = Number(targetRows[0]?.amount ?? 0);
  const [row] = await db.insert(intercompanyReconciliations).values({ orgId, counterpartyOrgId: parsed.data.counterpartyOrgId, asOfDate: parsed.data.asOfDate, sourceAmount: sourceAmount.toFixed(2), targetAmount: targetAmount.toFixed(2), difference: (sourceAmount - targetAmount).toFixed(2), status: Math.abs(sourceAmount - targetAmount) < 0.005 ? "matched" : "open", notes: parsed.data.notes ?? null, createdBy: req.user!.userId }).returning();
  res.status(201).json({ success: true, data: row });
});

export default router;