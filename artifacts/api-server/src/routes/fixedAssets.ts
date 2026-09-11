/**
 * /api/assets — Fixed Assets & Asset Depreciation
 *
 * Fixed assets use "Fixed Assets" module permission.
 * Depreciation uses "Asset Depreciation" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, sql, desc, inArray } from "drizzle-orm";
import {
  db, permissions, roles,
  fixedAssets, assetDepreciationEntries,
  organizations,
} from "@workspace/db";
import {
  insertFixedAssetSchema, updateFixedAssetSchema,
  runDepreciationSchema, postDepreciationSchema,
  DEPRECIATION_METHODS,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE_ASSETS = "Fixed Assets";
const MODULE_DEPR   = "Asset Depreciation";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMyPermissions(module: string, roleId: number | null) {
  if (roleId === null) return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
  if (role?.isSystem) return { canView: true, canCreate: true, canEdit: true, canDelete: true };
  const [perm] = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${module})`))
    .limit(1);
  return perm
    ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
    : { canView: false, canCreate: false, canEdit: false, canDelete: false };
}

async function nextAssetNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(fixedAssets)
    .where(eq(fixedAssets.orgId, orgId));
  return `AST-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

/** Calculate straight-line monthly depreciation. */
function calcStraightLine(cost: number, salvage: number, lifeMo: number): number {
  if (lifeMo <= 0) return 0;
  return Math.max(0, (cost - salvage) / lifeMo);
}

/** Calculate declining-balance monthly depreciation given current book value. */
function calcDecliningBalance(bookValue: number, salvage: number, lifeMo: number): number {
  if (lifeMo <= 0 || bookValue <= salvage) return 0;
  const annualRate = 2 / (lifeMo / 12);
  const monthly = (bookValue * annualRate) / 12;
  return Math.min(monthly, bookValue - salvage);
}

/** Calculate sum-of-years-digits monthly depreciation. */
function calcSumOfYearsDigits(cost: number, salvage: number, lifeMo: number, periodIndex: number): number {
  const lifeYrs = lifeMo / 12;
  const syd = (lifeYrs * (lifeYrs + 1)) / 2;
  const remaining = Math.max(0, lifeYrs - Math.floor(periodIndex / 12));
  if (syd === 0) return 0;
  return ((cost - salvage) * remaining) / (syd * 12);
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const [assets, depreciation] = await Promise.all([
      getMyPermissions(MODULE_ASSETS, req.user!.roleId),
      getMyPermissions(MODULE_DEPR, req.user!.roleId),
    ]);
    res.json({ success: true, data: { assets, depreciation } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE_ASSETS, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [{ totalCost }] = await db
      .select({ totalCost: sql<string>`coalesce(sum(purchase_cost), 0)::text` })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.orgId, orgId), sql`status != 'disposed'`));

    const [{ totalBookValue }] = await db
      .select({ totalBookValue: sql<string>`coalesce(sum(current_book_value), 0)::text` })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.orgId, orgId), sql`status != 'disposed'`));

    const [{ totalAccumulated }] = await db
      .select({ totalAccumulated: sql<string>`coalesce(sum(accumulated_depreciation), 0)::text` })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.orgId, orgId), sql`status != 'disposed'`));

    const [{ activeCount }] = await db
      .select({ activeCount: sql<number>`count(*)::int` })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.orgId, orgId), sql`status = 'active'`));

    const [{ fullyDepreciatedCount }] = await db
      .select({ fullyDepreciatedCount: sql<number>`count(*)::int` })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.orgId, orgId), sql`status = 'fully_depreciated'`));

    const [{ unpostedCount }] = await db
      .select({ unpostedCount: sql<number>`count(*)::int` })
      .from(assetDepreciationEntries)
      .where(and(eq(assetDepreciationEntries.orgId, orgId), sql`posted = false`));

    res.json({ success: true, data: { totalCost, totalBookValue, totalAccumulated, activeCount, fullyDepreciatedCount, unpostedCount } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ── Fixed Assets CRUD ─────────────────────────────────────────────────────────

router.get("/", requirePermission(MODULE_ASSETS, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10)));
    const offset = (page - 1) * limit;

    const conditions = [eq(fixedAssets.orgId, orgId)];
    if (search) conditions.push(ilike(fixedAssets.name, `%${search}%`));
    if (status) conditions.push(sql`${fixedAssets.status} = ${status}`);
    if (category) conditions.push(sql`${fixedAssets.category} = ${category}`);

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(fixedAssets).where(where);
    const rows = await db.select().from(fixedAssets).where(where).orderBy(desc(fixedAssets.createdAt)).limit(limit).offset(offset);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch assets" });
  }
});

router.get("/:id", requirePermission(MODULE_ASSETS, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db.select().from(fixedAssets).where(and(eq(fixedAssets.id, id), eq(fixedAssets.orgId, orgId))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Asset not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch asset" });
  }
});

router.post("/", requirePermission(MODULE_ASSETS, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const data = insertFixedAssetSchema.parse(req.body);
    const assetNumber = data.assetNumber ?? (await nextAssetNumber(orgId));
    const purchaseCost = parseFloat(data.purchaseCost);
    const [row] = await db.insert(fixedAssets).values({
      ...data,
      assetNumber,
      orgId,
      currentBookValue: purchaseCost.toFixed(2),
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: row });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.put("/:id", requirePermission(MODULE_ASSETS, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const data = updateFixedAssetSchema.parse(req.body);
    const [row] = await db.update(fixedAssets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(fixedAssets.id, id), eq(fixedAssets.orgId, orgId)))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Asset not found" }); return; }
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.delete("/:id", requirePermission(MODULE_ASSETS, "delete"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(fixedAssets).where(and(eq(fixedAssets.id, id), eq(fixedAssets.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Asset not found" }); return; }
    const [posted] = await db.select({ id: assetDepreciationEntries.id }).from(assetDepreciationEntries)
      .where(and(eq(assetDepreciationEntries.assetId, id), sql`posted = true`)).limit(1);
    if (posted) {
      res.status(400).json({ success: false, error: "Cannot delete an asset with posted depreciation entries." }); return;
    }
    await db.delete(fixedAssets).where(eq(fixedAssets.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete asset" });
  }
});

// ── Depreciation ──────────────────────────────────────────────────────────────

router.get("/depreciation/entries", requirePermission(MODULE_DEPR, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const assetId = req.query.assetId ? parseInt(String(req.query.assetId), 10) : undefined;
    const posted = req.query.posted !== undefined ? req.query.posted === "true" : undefined;
    const period = String(req.query.period ?? "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10)));
    const offset = (page - 1) * limit;

    const conditions = [eq(assetDepreciationEntries.orgId, orgId)];
    if (assetId) conditions.push(eq(assetDepreciationEntries.assetId, assetId));
    if (posted !== undefined) conditions.push(sql`${assetDepreciationEntries.posted} = ${posted}`);
    if (period) conditions.push(sql`${assetDepreciationEntries.periodDate} = ${period}`);

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(assetDepreciationEntries).where(where);
    const rows = await db
      .select({ entry: assetDepreciationEntries, assetName: fixedAssets.name, assetNumber: fixedAssets.assetNumber })
      .from(assetDepreciationEntries)
      .leftJoin(fixedAssets, eq(assetDepreciationEntries.assetId, fixedAssets.id))
      .where(where)
      .orderBy(desc(assetDepreciationEntries.periodDate), desc(assetDepreciationEntries.createdAt))
      .limit(limit).offset(offset);

    const data = rows.map(({ entry, assetName, assetNumber }) => ({ ...entry, assetName, assetNumber }));
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch depreciation entries" });
  }
});

router.post("/depreciation/run", requirePermission(MODULE_DEPR, "create"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const { assetId: filterAssetId, periodDate } = runDepreciationSchema.parse(req.body);

    // fetch eligible assets
    const conditions = [eq(fixedAssets.orgId, orgId), sql`status = 'active'`];
    if (filterAssetId) conditions.push(eq(fixedAssets.id, filterAssetId));
    const assets = await db.select().from(fixedAssets).where(and(...conditions));

    const created: typeof assetDepreciationEntries.$inferSelect[] = [];
    const skipped: { assetId: number; reason: string }[] = [];

    for (const asset of assets) {
      // skip if entry for this period already exists
      const [existing] = await db.select({ id: assetDepreciationEntries.id })
        .from(assetDepreciationEntries)
        .where(and(eq(assetDepreciationEntries.assetId, asset.id), sql`period_date = ${periodDate}`))
        .limit(1);
      if (existing) {
        skipped.push({ assetId: asset.id, reason: "Entry already exists for this period" });
        continue;
      }

      const cost     = parseFloat(asset.purchaseCost);
      const salvage  = parseFloat(asset.salvageValue);
      const bookVal  = parseFloat(asset.currentBookValue);
      const lifeM    = asset.usefulLifeMonths;

      if (bookVal <= salvage) {
        skipped.push({ assetId: asset.id, reason: "Already fully depreciated" });
        continue;
      }

      // determine period index (months since purchase)
      const purchaseDate = new Date(asset.purchaseDate);
      const [year, month] = periodDate.split("-").map(Number);
      const periodMs = new Date(year, month - 1, 1);
      const periodIndex = Math.max(0,
        (periodMs.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (periodMs.getMonth() - purchaseDate.getMonth())
      );

      let depAmount = 0;
      if (asset.depreciationMethod === "straight_line") {
        depAmount = calcStraightLine(cost, salvage, lifeM);
      } else if (asset.depreciationMethod === "declining_balance") {
        depAmount = calcDecliningBalance(bookVal, salvage, lifeM);
      } else if (asset.depreciationMethod === "sum_of_years_digits") {
        depAmount = calcSumOfYearsDigits(cost, salvage, lifeM, periodIndex);
      }

      depAmount = Math.max(0, Math.min(depAmount, bookVal - salvage));
      const newAccumulated = parseFloat(asset.accumulatedDepreciation) + depAmount;
      const newBookValue   = bookVal - depAmount;

      const [entry] = await db.insert(assetDepreciationEntries).values({
        assetId:                 asset.id,
        orgId,
        periodDate,
        depreciationAmount:      depAmount.toFixed(2),
        accumulatedDepreciation: newAccumulated.toFixed(2),
        bookValue:               newBookValue.toFixed(2),
        posted:                  false,
        createdBy:               req.user!.userId,
      }).returning();

      created.push(entry);
    }

    res.status(201).json({ success: true, data: { created, skipped } });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.post("/depreciation/post", requirePermission(MODULE_DEPR, "edit"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const { entryIds } = postDepreciationSchema.parse(req.body);

    // verify all entries belong to org and are unposted
    const entries = await db.select().from(assetDepreciationEntries)
      .where(and(eq(assetDepreciationEntries.orgId, orgId), inArray(assetDepreciationEntries.id, entryIds)));

    const alreadyPosted = entries.filter(e => e.posted);
    if (alreadyPosted.length > 0) {
      res.status(400).json({ success: false, error: `${alreadyPosted.length} entries are already posted.` }); return;
    }

    await db.transaction(async (tx) => {
      // mark entries as posted
      await tx.update(assetDepreciationEntries)
        .set({ posted: true })
        .where(and(eq(assetDepreciationEntries.orgId, orgId), inArray(assetDepreciationEntries.id, entryIds)));

      // update asset book values
      for (const entry of entries) {
        const newAccum  = parseFloat(entry.accumulatedDepreciation);
        const newBook   = parseFloat(entry.bookValue);
        const newStatus = newBook <= parseFloat((await tx.select({ sv: fixedAssets.salvageValue })
          .from(fixedAssets).where(eq(fixedAssets.id, entry.assetId)).limit(1))[0]?.sv ?? "0")
          ? "fully_depreciated" : "active";

        await tx.update(fixedAssets)
          .set({
            accumulatedDepreciation: newAccum.toFixed(2),
            currentBookValue: newBook.toFixed(2),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(fixedAssets.id, entry.assetId));
      }
    });

    res.json({ success: true, data: { posted: entryIds.length } });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message ?? "Validation failed" });
  }
});

router.delete("/depreciation/entries/:id", requirePermission(MODULE_DEPR, "delete"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(assetDepreciationEntries)
      .where(and(eq(assetDepreciationEntries.id, id), eq(assetDepreciationEntries.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Entry not found" }); return; }
    if (existing.posted) {
      res.status(400).json({ success: false, error: "Cannot delete a posted depreciation entry." }); return;
    }
    await db.delete(assetDepreciationEntries).where(eq(assetDepreciationEntries.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
});

export default router;
