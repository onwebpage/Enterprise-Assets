/**
 * /api/inventory — Inventory & Warehouse Management
 *
 * All routes require authentication + "Inventory" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, isNull, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles, organizations,
  invCategories, invWarehouses, invProducts, invStockLevels,
  invMovements, invTransfers, invTransferLines,
} from "@workspace/db";
import {
  insertInvCategorySchema, updateInvCategorySchema,
  insertInvWarehouseSchema, updateInvWarehouseSchema,
  insertInvProductSchema, updateInvProductSchema,
  insertInvMovementSchema,
  insertInvTransferSchema, updateInvTransferSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Inventory";

function branchWarehouseScope(req: AuthRequest) {
  return req.user!.branchId
    ? or(eq(invWarehouses.branchId, req.user!.branchId), isNull(invWarehouses.branchId))
    : undefined;
}

function branchTransferScope(req: AuthRequest) {
  return req.user!.branchId
    ? sql`(${invTransfers.fromWarehouseId} in (select id from inv_warehouses where branch_id is null or branch_id = ${req.user!.branchId}) and ${invTransfers.toWarehouseId} in (select id from inv_warehouses where branch_id is null or branch_id = ${req.user!.branchId}))`
    : undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextMovementNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(invMovements)
    .where(eq(invMovements.orgId, orgId));
  return `MV-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextTransferNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(invTransfers)
    .where(eq(invTransfers.orgId, orgId));
  return `TF-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

/** Ensure a stock level row exists; return current qtyOnHand */
async function ensureStockLevel(orgId: number, productId: number, warehouseId: number) {
  const [existing] = await db
    .select()
    .from(invStockLevels)
    .where(and(
      eq(invStockLevels.productId,   productId),
      eq(invStockLevels.warehouseId, warehouseId),
    ))
    .limit(1);
  if (!existing) {
    const [created] = await db.insert(invStockLevels).values({
      orgId, productId, warehouseId, qtyOnHand: "0", qtyReserved: "0",
    }).returning();
    return created;
  }
  return existing;
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [perm] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
      .limit(1);
    res.json({
      success: true,
      data: perm
        ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
        : { canView: false, canCreate: false, canEdit: false, canDelete: false },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [{ totalSkus }] = await db
      .select({ totalSkus: sql<number>`count(*)::int` })
      .from(invProducts)
      .where(and(eq(invProducts.orgId, orgId), eq(invProducts.status, "active")));

    const [{ warehouseCount }] = await db
      .select({ warehouseCount: sql<number>`count(*)::int` })
      .from(invWarehouses)
      .where(eq(invWarehouses.orgId, orgId));

    // Total inventory value = sum(qtyOnHand * costPrice)
    const valueRows = await db
      .select({ totalValue: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand}::numeric * ${invProducts.costPrice}::numeric), 0)::text` })
      .from(invStockLevels)
      .innerJoin(invProducts, eq(invStockLevels.productId, invProducts.id))
      .where(eq(invStockLevels.orgId, orgId));
    const totalValue = valueRows[0]?.totalValue ?? "0";

    // Low stock: on_hand <= reorder_point (and reorder_point > 0)
    const lowStockRows = await db
      .select({ productId: invStockLevels.productId })
      .from(invStockLevels)
      .innerJoin(invProducts, eq(invStockLevels.productId, invProducts.id))
      .where(and(
        eq(invStockLevels.orgId, orgId),
        sql`${invStockLevels.qtyOnHand} <= ${invProducts.reorderPoint}`,
        sql`${invProducts.reorderPoint} > 0`,
      ));

    const [{ pendingTransfers }] = await db
      .select({ pendingTransfers: sql<number>`count(*)::int` })
      .from(invTransfers)
      .where(and(
        eq(invTransfers.orgId, orgId),
        sql`status in ('pending', 'in_transit')`,
      ));

    res.json({
      success: true,
      data: {
        totalSkus,
        warehouseCount,
        totalValue: totalValue ?? "0",
        lowStockCount: lowStockRows.length,
        pendingTransfers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch inventory summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/categories", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = await db.select().from(invCategories)
      .where(eq(invCategories.orgId, orgId))
      .orderBy(invCategories.name);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.post("/categories", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvCategorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [created] = await db.insert(invCategories).values({ ...parsed.data, orgId: req.user!.orgId! }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create category" });
  }
});

router.put("/categories/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvCategorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: invCategories.id }).from(invCategories)
      .where(and(eq(invCategories.id, id), eq(invCategories.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Category not found" }); return; }
    const [updated] = await db.update(invCategories).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(invCategories.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update category" });
  }
});

router.delete("/categories/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: invCategories.id }).from(invCategories)
      .where(and(eq(invCategories.id, id), eq(invCategories.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Category not found" }); return; }
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` }).from(invProducts).where(eq(invProducts.categoryId, id));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete — ${cnt} product(s) use this category.` });
      return;
    }
    await db.delete(invCategories).where(eq(invCategories.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete category" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WAREHOUSES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/warehouses", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = await db.select().from(invWarehouses)
      .where(and(eq(invWarehouses.orgId, orgId), branchWarehouseScope(req)))
      .orderBy(invWarehouses.code);

    // Attach SKU counts per warehouse
    const ids = rows.map((r) => r.id);
    let skuMeta: Record<number, { skuCount: number; totalUnits: string }> = {};
    if (ids.length > 0) {
      const meta = await db
        .select({
          warehouseId: invStockLevels.warehouseId,
          skuCount:    sql<number>`count(*)::int`,
          totalUnits:  sql<string>`coalesce(sum(qty_on_hand), 0)::text`,
        })
        .from(invStockLevels)
        .where(sql`warehouse_id = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(invStockLevels.warehouseId);
      meta.forEach((m) => { skuMeta[m.warehouseId] = { skuCount: m.skuCount, totalUnits: m.totalUnits }; });
    }

    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, ...(skuMeta[r.id] ?? { skuCount: 0, totalUnits: "0" }) })),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch warehouses" });
  }
});

router.post("/warehouses", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvWarehouseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    // Check duplicate code within org
    const [dup] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
      .where(and(eq(invWarehouses.orgId, orgId), eq(invWarehouses.code, parsed.data.code))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `Warehouse code "${parsed.data.code}" already exists` }); return; }
    const [created] = await db.insert(invWarehouses).values({ ...parsed.data, orgId, branchId: req.user!.branchId ?? null }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create warehouse" });
  }
});

router.put("/warehouses/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvWarehouseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
      .where(and(eq(invWarehouses.id, id), eq(invWarehouses.orgId, req.user!.orgId!), branchWarehouseScope(req))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Warehouse not found" }); return; }
    const [updated] = await db.update(invWarehouses).set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(invWarehouses.id, id), eq(invWarehouses.orgId, req.user!.orgId!), branchWarehouseScope(req))).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update warehouse" });
  }
});

router.delete("/warehouses/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: invWarehouses.id, name: invWarehouses.name }).from(invWarehouses)
      .where(and(eq(invWarehouses.id, id), eq(invWarehouses.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Warehouse not found" }); return; }
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` }).from(invStockLevels)
      .where(and(eq(invStockLevels.warehouseId, id), sql`qty_on_hand > 0`));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — it has stock. Zero out stock first.` });
      return;
    }
    await db.delete(invWarehouses).where(eq(invWarehouses.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete warehouse" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/products", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, categoryId } = req.query as Record<string, string>;

    const filters: any[] = [eq(invProducts.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(invProducts.sku,  `%${search.trim()}%`),
        ilike(invProducts.name, `%${search.trim()}%`),
      ));
    }
    if (status)     filters.push(eq(invProducts.status, status));
    if (categoryId) filters.push(eq(invProducts.categoryId, parseInt(categoryId)));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: invProducts.id, orgId: invProducts.orgId, sku: invProducts.sku, name: invProducts.name,
        description: invProducts.description, categoryId: invProducts.categoryId,
        categoryName: invCategories.name,
        unit: invProducts.unit, costPrice: invProducts.costPrice, sellingPrice: invProducts.sellingPrice,
        reorderPoint: invProducts.reorderPoint, reorderQty: invProducts.reorderQty,
        status: invProducts.status, notes: invProducts.notes,
        createdAt: invProducts.createdAt, updatedAt: invProducts.updatedAt,
      })
        .from(invProducts)
        .leftJoin(invCategories, eq(invProducts.categoryId, invCategories.id))
        .where(where)
        .orderBy(invProducts.sku)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(invProducts).where(where),
    ]);

    // Attach total on-hand from stock levels
    const ids = rows.map((r) => r.id);
    let stockMeta: Record<number, { totalOnHand: string }> = {};
    if (ids.length > 0) {
      const meta = await db
        .select({
          productId:   invStockLevels.productId,
          totalOnHand: sql<string>`coalesce(sum(qty_on_hand), 0)::text`,
        })
        .from(invStockLevels)
        .where(sql`product_id = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(invStockLevels.productId);
      meta.forEach((m) => { stockMeta[m.productId] = { totalOnHand: m.totalOnHand }; });
    }

    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, totalOnHand: stockMeta[r.id]?.totalOnHand ?? "0" })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

router.get("/products/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Product not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

router.post("/products", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvProductSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [dup] = await db.select({ id: invProducts.id }).from(invProducts)
      .where(and(eq(invProducts.orgId, orgId), eq(invProducts.sku, parsed.data.sku))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `SKU "${parsed.data.sku}" already exists` }); return; }
    const [created] = await db.insert(invProducts).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create product" });
  }
});

router.put("/products/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvProductSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: invProducts.id }).from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Product not found" }); return; }
    const [updated] = await db.update(invProducts).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(invProducts.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
});

router.delete("/products/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: invProducts.id, name: invProducts.name }).from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Product not found" }); return; }
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` }).from(invStockLevels)
      .where(and(eq(invStockLevels.productId, id), sql`qty_on_hand > 0`));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — it has on-hand stock. Zero out stock first.` });
      return;
    }
    await db.delete(invProducts).where(eq(invProducts.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STOCK LEVELS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/stock", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? 50))));
    const offset = (page - 1) * limit;
    const { search, warehouseId, status } = req.query as Record<string, string>;

    const filters: any[] = [eq(invStockLevels.orgId, orgId), branchWarehouseScope(req)];
    if (warehouseId) filters.push(eq(invStockLevels.warehouseId, parseInt(warehouseId)));
    if (search?.trim()) {
      filters.push(or(
        ilike(invProducts.sku,  `%${search.trim()}%`),
        ilike(invProducts.name, `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:            invStockLevels.id,
        productId:     invStockLevels.productId,
        warehouseId:   invStockLevels.warehouseId,
        qtyOnHand:     invStockLevels.qtyOnHand,
        qtyReserved:   invStockLevels.qtyReserved,
        updatedAt:     invStockLevels.updatedAt,
        sku:           invProducts.sku,
        productName:   invProducts.name,
        costPrice:     invProducts.costPrice,
        reorderPoint:  invProducts.reorderPoint,
        warehouseCode: invWarehouses.code,
        warehouseName: invWarehouses.name,
      })
        .from(invStockLevels)
        .innerJoin(invProducts,   eq(invStockLevels.productId,   invProducts.id))
        .innerJoin(invWarehouses, eq(invStockLevels.warehouseId, invWarehouses.id))
        .where(where)
        .orderBy(invProducts.sku)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(invStockLevels)
        .innerJoin(invProducts,   eq(invStockLevels.productId,   invProducts.id))
        .innerJoin(invWarehouses, eq(invStockLevels.warehouseId, invWarehouses.id))
        .where(where),
    ]);

    // Compute available + stock status
    const enriched = rows.map((r) => {
      const onHand      = parseFloat(r.qtyOnHand);
      const reserved    = parseFloat(r.qtyReserved);
      const available   = Math.max(0, onHand - reserved);
      const reorder     = r.reorderPoint;
      const stockValue  = (onHand * parseFloat(r.costPrice)).toFixed(2);
      let stockStatus: string;
      if (onHand <= 0) stockStatus = "oos";
      else if (onHand <= reorder * 0.5) stockStatus = "critical";
      else if (reorder > 0 && onHand <= reorder) stockStatus = "low";
      else stockStatus = "ok";
      return { ...r, available: available.toString(), stockValue, stockStatus };
    });

    // Filter by status AFTER enrichment
    const filtered = status ? enriched.filter((r) => r.stockStatus === status) : enriched;

    res.json({ success: true, data: filtered, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch stock levels" });
  }
});

// ── Stock Adjustment (receipt / dispatch / adjustment) ────────────────────────

router.post("/stock/adjust", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvMovementSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    // Validate product + warehouse belong to org
    const [product] = await db.select({ id: invProducts.id, name: invProducts.name }).from(invProducts)
      .where(and(eq(invProducts.id, data.productId), eq(invProducts.orgId, orgId))).limit(1);
    if (!product) { res.status(422).json({ success: false, error: "Product not found" }); return; }

    const [warehouse] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
      .where(and(eq(invWarehouses.id, data.warehouseId), eq(invWarehouses.orgId, orgId), branchWarehouseScope(req))).limit(1);
    if (!warehouse) { res.status(422).json({ success: false, error: "Warehouse not found" }); return; }

    const qtyChange = parseFloat(data.qty);
    const movementNumber = await nextMovementNumber(orgId);

    const movement = await db.transaction(async (tx) => {
      // Insert movement
      const [mv] = await tx.insert(invMovements).values({
        orgId, movementNumber, productId: data.productId, warehouseId: data.warehouseId,
        movementType: data.movementType, qty: qtyChange.toFixed(4),
        reference: data.reference ?? null, notes: data.notes ?? null,
        createdBy: req.user!.userId,
      }).returning();

      // Upsert stock level
      const [sl] = await tx.select().from(invStockLevels)
        .where(and(eq(invStockLevels.productId, data.productId), eq(invStockLevels.warehouseId, data.warehouseId)))
        .limit(1);

      if (sl) {
        const newQty = Math.max(0, parseFloat(sl.qtyOnHand) + qtyChange);
        await tx.update(invStockLevels)
          .set({ qtyOnHand: newQty.toFixed(4), updatedAt: new Date() })
          .where(eq(invStockLevels.id, sl.id));
      } else {
        const initialQty = Math.max(0, qtyChange);
        await tx.insert(invStockLevels).values({
          orgId, productId: data.productId, warehouseId: data.warehouseId,
          qtyOnHand: initialQty.toFixed(4), qtyReserved: "0",
        });
      }

      return mv;
    });

    res.status(201).json({ success: true, data: movement });
  } catch {
    res.status(500).json({ success: false, error: "Failed to record stock adjustment" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// MOVEMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/movements", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, movementType, productId, warehouseId } = req.query as Record<string, string>;

    const filters: any[] = [eq(invMovements.orgId, orgId), branchWarehouseScope(req)];
    if (movementType) filters.push(eq(invMovements.movementType, movementType));
    if (productId)    filters.push(eq(invMovements.productId,    parseInt(productId)));
    if (warehouseId)  filters.push(eq(invMovements.warehouseId,  parseInt(warehouseId)));
    if (search?.trim()) {
      filters.push(or(
        ilike(invMovements.movementNumber, `%${search.trim()}%`),
        ilike(invProducts.sku,             `%${search.trim()}%`),
        ilike(invMovements.reference,      `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:             invMovements.id,
        movementNumber: invMovements.movementNumber,
        movementType:   invMovements.movementType,
        qty:            invMovements.qty,
        reference:      invMovements.reference,
        notes:          invMovements.notes,
        createdAt:      invMovements.createdAt,
        productId:      invMovements.productId,
        warehouseId:    invMovements.warehouseId,
        sku:            invProducts.sku,
        productName:    invProducts.name,
        warehouseCode:  invWarehouses.code,
      })
        .from(invMovements)
        .innerJoin(invProducts,   eq(invMovements.productId,   invProducts.id))
        .innerJoin(invWarehouses, eq(invMovements.warehouseId, invWarehouses.id))
        .where(where)
        .orderBy(desc(invMovements.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(invMovements)
        .innerJoin(invProducts,   eq(invMovements.productId,   invProducts.id))
        .innerJoin(invWarehouses, eq(invMovements.warehouseId, invWarehouses.id))
        .where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch movements" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFERS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/transfers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status } = req.query as Record<string, string>;

    const fromWH = invWarehouses;
    // Need aliases for self-join — we join invWarehouses twice
    const filters: any[] = [eq(invTransfers.orgId, orgId), branchTransferScope(req)];
    if (status) filters.push(eq(invTransfers.status, status));
    if (search?.trim()) {
      filters.push(ilike(invTransfers.transferNumber, `%${search.trim()}%`));
    }
    const where = and(...filters);

    const [transfers, [{ total }]] = await Promise.all([
      db.select({
        id:              invTransfers.id,
        transferNumber:  invTransfers.transferNumber,
        fromWarehouseId: invTransfers.fromWarehouseId,
        toWarehouseId:   invTransfers.toWarehouseId,
        status:          invTransfers.status,
        transferDate:    invTransfers.transferDate,
        notes:           invTransfers.notes,
        createdAt:       invTransfers.createdAt,
        updatedAt:       invTransfers.updatedAt,
      })
        .from(invTransfers)
        .where(where)
        .orderBy(desc(invTransfers.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(invTransfers).where(where),
    ]);

    // Attach warehouse codes + line counts
    const tIds = transfers.map((t) => t.id);
    const whIds = [...new Set([...transfers.map((t) => t.fromWarehouseId), ...transfers.map((t) => t.toWarehouseId)])];

    let whMap: Record<number, string> = {};
    let lineCountMap: Record<number, number> = {};

    if (whIds.length > 0) {
      const whs = await db.select({ id: invWarehouses.id, code: invWarehouses.code }).from(invWarehouses)
        .where(sql`id = any(${sql.raw(`ARRAY[${whIds.join(",")}]::int[]`)})`);
      whs.forEach((w) => { whMap[w.id] = w.code; });
    }
    if (tIds.length > 0) {
      const lc = await db
        .select({ transferId: invTransferLines.transferId, cnt: sql<number>`count(*)::int` })
        .from(invTransferLines)
        .where(sql`transfer_id = any(${sql.raw(`ARRAY[${tIds.join(",")}]::int[]`)})`)
        .groupBy(invTransferLines.transferId);
      lc.forEach((l) => { lineCountMap[l.transferId] = l.cnt; });
    }

    res.json({
      success: true,
      data: transfers.map((t) => ({
        ...t,
        fromWarehouseCode: whMap[t.fromWarehouseId] ?? String(t.fromWarehouseId),
        toWarehouseCode:   whMap[t.toWarehouseId]   ?? String(t.toWarehouseId),
        lineCount:         lineCountMap[t.id] ?? 0,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch transfers" });
  }
});

router.post("/transfers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvTransferSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const data  = parsed.data;

    if (data.fromWarehouseId === data.toWarehouseId) {
      res.status(422).json({ success: false, error: "Source and destination warehouse cannot be the same" });
      return;
    }

    // Validate both warehouses
    for (const whId of [data.fromWarehouseId, data.toWarehouseId]) {
      const [wh] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
        .where(and(eq(invWarehouses.id, whId), eq(invWarehouses.orgId, orgId), branchWarehouseScope(req))).limit(1);
      if (!wh) { res.status(422).json({ success: false, error: `Warehouse ${whId} not found` }); return; }
    }

    const transferNumber = await nextTransferNumber(orgId);

    const result = await db.transaction(async (tx) => {
      const [transfer] = await tx.insert(invTransfers).values({
        orgId, transferNumber,
        fromWarehouseId: data.fromWarehouseId, toWarehouseId: data.toWarehouseId,
        status: "pending", transferDate: data.transferDate,
        notes: data.notes ?? null, createdBy: req.user!.userId,
      }).returning();

      const lineValues = data.lines.map((l) => ({
        transferId: transfer.id, productId: l.productId, qty: parseFloat(l.qty).toFixed(4),
      }));
      const lines = await tx.insert(invTransferLines).values(lineValues).returning();

      return { ...transfer, lines };
    });

    res.status(201).json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create transfer" });
  }
});

router.put("/transfers/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvTransferSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(invTransfers)
      .where(and(eq(invTransfers.id, id), eq(invTransfers.orgId, orgId), branchTransferScope(req))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Transfer not found" }); return; }
    if (existing.status === "completed" || existing.status === "cancelled") {
      res.status(409).json({ success: false, error: `Cannot update a ${existing.status} transfer` });
      return;
    }

    const newStatus = parsed.data.status;

    const result = await db.transaction(async (tx) => {
      // If completing, apply stock movements
      if (newStatus === "completed") {
        const lines = await tx.select().from(invTransferLines).where(eq(invTransferLines.transferId, id));

        for (const line of lines) {
          const qty = parseFloat(line.qty);
          // Deduct from source
          const fromSL = await ensureStockLevel(orgId, line.productId, existing.fromWarehouseId);
          const fromNew = Math.max(0, parseFloat(fromSL.qtyOnHand) - qty);
          await tx.update(invStockLevels).set({ qtyOnHand: fromNew.toFixed(4), updatedAt: new Date() })
            .where(eq(invStockLevels.id, fromSL.id));

          // Add to destination
          const toSL = await ensureStockLevel(orgId, line.productId, existing.toWarehouseId);
          const toNew = parseFloat(toSL.qtyOnHand) + qty;
          await tx.update(invStockLevels).set({ qtyOnHand: toNew.toFixed(4), updatedAt: new Date() })
            .where(eq(invStockLevels.id, toSL.id));

          // Log movements
          const mvNum = await nextMovementNumber(orgId);
          await tx.insert(invMovements).values({
            orgId, movementNumber: mvNum + "-FROM",
            productId: line.productId, warehouseId: existing.fromWarehouseId,
            movementType: "transfer", qty: (-qty).toFixed(4),
            reference: existing.transferNumber, createdBy: req.user!.userId,
          });
          const mvNum2 = await nextMovementNumber(orgId);
          await tx.insert(invMovements).values({
            orgId, movementNumber: mvNum2 + "-TO",
            productId: line.productId, warehouseId: existing.toWarehouseId,
            movementType: "transfer", qty: qty.toFixed(4),
            reference: existing.transferNumber, createdBy: req.user!.userId,
          });
        }
      }

      const [updated] = await tx.update(invTransfers)
        .set({ status: newStatus, notes: parsed.data.notes ?? existing.notes, updatedAt: new Date() })
        .where(eq(invTransfers.id, id)).returning();
      return updated;
    });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update transfer" });
  }
});

export default router;
