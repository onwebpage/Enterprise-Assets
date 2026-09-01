/**
 * /api/master-data — centralized master data administration.
 *
 * The module intentionally uses the existing canonical AR, AP, and Inventory
 * tables so changes made here are immediately visible to those workflows.
 */
import { Router } from "express";
import type { Response } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
  db, permissions, roles,
  arCustomers, arInvoices,
  apVendors, apBills,
  invCategories, invProducts, invWarehouses, invStockLevels, invMovements, invTransfers,
} from "@workspace/db";
import {
  insertARCustomerSchema, updateARCustomerSchema,
  insertAPVendorSchema, updateAPVendorSchema,
  insertInvCategorySchema, updateInvCategorySchema,
  insertInvProductSchema, updateInvProductSchema,
  insertInvWarehouseSchema, updateInvWarehouseSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Master Data Management";

const invalidId = (value: string) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

function validationError(res: Response, details: unknown) {
  res.status(422).json({ success: false, error: "Validation failed", details });
}

// ── My permissions ───────────────────────────────────────────────────────────

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
    const [permission] = await db.select().from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
      .limit(1);
    res.json({
      success: true,
      data: permission
        ? { canView: permission.canView, canCreate: permission.canCreate, canEdit: permission.canEdit, canDelete: permission.canDelete }
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
    const [
      [{ total: customerCount }],
      [{ active: activeCustomers }],
      [{ total: vendorCount }],
      [{ active: activeVendors }],
      [{ total: productCount }],
      [{ active: activeProducts }],
      [{ total: warehouseCount }],
      [{ total: categoryCount }],
    ] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(arCustomers).where(eq(arCustomers.orgId, orgId)),
      db.select({ active: sql<number>`count(*)::int` }).from(arCustomers).where(and(eq(arCustomers.orgId, orgId), eq(arCustomers.status, "active"))),
      db.select({ total: sql<number>`count(*)::int` }).from(apVendors).where(eq(apVendors.orgId, orgId)),
      db.select({ active: sql<number>`count(*)::int` }).from(apVendors).where(and(eq(apVendors.orgId, orgId), eq(apVendors.status, "active"))),
      db.select({ total: sql<number>`count(*)::int` }).from(invProducts).where(eq(invProducts.orgId, orgId)),
      db.select({ active: sql<number>`count(*)::int` }).from(invProducts).where(and(eq(invProducts.orgId, orgId), eq(invProducts.status, "active"))),
      db.select({ total: sql<number>`count(*)::int` }).from(invWarehouses).where(eq(invWarehouses.orgId, orgId)),
      db.select({ total: sql<number>`count(*)::int` }).from(invCategories).where(eq(invCategories.orgId, orgId)),
    ]);
    res.json({
      success: true,
      data: {
        customerCount, activeCustomers, vendorCount, activeVendors,
        productCount, activeProducts, warehouseCount, categoryCount,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch master data summary" });
  }
});

// ── Customers ────────────────────────────────────────────────────────────────

router.get("/customers", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filters = [eq(arCustomers.orgId, orgId)];
    if (search) filters.push(or(
      ilike(arCustomers.name, `%${search}%`),
      ilike(arCustomers.email, `%${search}%`),
      ilike(arCustomers.taxId, `%${search}%`),
    )!);
    if (status) filters.push(eq(arCustomers.status, status));
    const rows = await db.select().from(arCustomers).where(and(...filters)).orderBy(arCustomers.name);
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
  }
});

router.post("/customers", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertARCustomerSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const [created] = await db.insert(arCustomers).values({ ...parsed.data, orgId: req.user!.orgId! }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create customer" });
  }
});

router.put("/customers/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateARCustomerSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const [existing] = await db.select({ id: arCustomers.id }).from(arCustomers)
      .where(and(eq(arCustomers.id, id), eq(arCustomers.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    const [updated] = await db.update(arCustomers).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(arCustomers.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: arCustomers.id, name: arCustomers.name }).from(arCustomers)
      .where(and(eq(arCustomers.id, id), eq(arCustomers.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Customer not found" }); return; }
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(arInvoices).where(eq(arInvoices.customerId, id));
    if (count > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — ${count} invoice(s) exist. Deactivate the customer instead.` });
      return;
    }
    await db.delete(arCustomers).where(eq(arCustomers.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete customer" });
  }
});

// ── Vendors ───────────────────────────────────────────────────────────────────

router.get("/vendors", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filters = [eq(apVendors.orgId, orgId)];
    if (search) filters.push(or(
      ilike(apVendors.name, `%${search}%`),
      ilike(apVendors.email, `%${search}%`),
      ilike(apVendors.taxId, `%${search}%`),
    )!);
    if (status) filters.push(eq(apVendors.status, status));
    const rows = await db.select().from(apVendors).where(and(...filters)).orderBy(apVendors.name);
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch vendors" });
  }
});

router.post("/vendors", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertAPVendorSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const [created] = await db.insert(apVendors).values({ ...parsed.data, orgId: req.user!.orgId! }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create vendor" });
  }
});

router.put("/vendors/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateAPVendorSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const [existing] = await db.select({ id: apVendors.id }).from(apVendors)
      .where(and(eq(apVendors.id, id), eq(apVendors.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const [updated] = await db.update(apVendors).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(apVendors.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: apVendors.id, name: apVendors.name }).from(apVendors)
      .where(and(eq(apVendors.id, id), eq(apVendors.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Vendor not found" }); return; }
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(apBills).where(eq(apBills.vendorId, id));
    if (count > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — ${count} bill(s) exist. Deactivate the vendor instead.` });
      return;
    }
    await db.delete(apVendors).where(eq(apVendors.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete vendor" });
  }
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const filters = [eq(invCategories.orgId, req.user!.orgId!)];
    if (search) filters.push(ilike(invCategories.name, `%${search}%`));
    const rows = await db.select().from(invCategories).where(and(...filters)).orderBy(invCategories.name);
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.post("/categories", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvCategorySchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const [created] = await db.insert(invCategories).values({ ...parsed.data, orgId: req.user!.orgId! }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create category" });
  }
});

router.put("/categories/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvCategorySchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
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
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: invCategories.id, name: invCategories.name }).from(invCategories)
      .where(and(eq(invCategories.id, id), eq(invCategories.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Category not found" }); return; }
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(invProducts).where(eq(invProducts.categoryId, id));
    if (count > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — ${count} product(s) use this category.` });
      return;
    }
    await db.delete(invCategories).where(eq(invCategories.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete category" });
  }
});

// ── Products ──────────────────────────────────────────────────────────────────

router.get("/products", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filters = [eq(invProducts.orgId, req.user!.orgId!)];
    if (search) filters.push(or(
      ilike(invProducts.sku, `%${search}%`),
      ilike(invProducts.name, `%${search}%`),
    )!);
    if (status) filters.push(eq(invProducts.status, status));
    const rows = await db.select({
      id: invProducts.id, orgId: invProducts.orgId, sku: invProducts.sku, name: invProducts.name,
      description: invProducts.description, categoryId: invProducts.categoryId, unit: invProducts.unit,
      costPrice: invProducts.costPrice, sellingPrice: invProducts.sellingPrice,
      reorderPoint: invProducts.reorderPoint, reorderQty: invProducts.reorderQty,
      status: invProducts.status, notes: invProducts.notes, createdAt: invProducts.createdAt, updatedAt: invProducts.updatedAt,
      categoryName: invCategories.name,
    }).from(invProducts).leftJoin(invCategories, eq(invProducts.categoryId, invCategories.id))
      .where(and(...filters)).orderBy(invProducts.sku);
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

router.post("/products", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvProductSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const orgId = req.user!.orgId!;
    const [duplicate] = await db.select({ id: invProducts.id }).from(invProducts)
      .where(and(eq(invProducts.orgId, orgId), eq(invProducts.sku, parsed.data.sku))).limit(1);
    if (duplicate) { res.status(409).json({ success: false, error: `SKU "${parsed.data.sku}" already exists` }); return; }
    if (parsed.data.categoryId) {
      const [category] = await db.select({ id: invCategories.id }).from(invCategories)
        .where(and(eq(invCategories.id, parsed.data.categoryId), eq(invCategories.orgId, orgId))).limit(1);
      if (!category) { res.status(422).json({ success: false, error: "Category not found" }); return; }
    }
    const [created] = await db.insert(invProducts).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create product" });
  }
});

router.put("/products/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvProductSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: invProducts.id }).from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Product not found" }); return; }
    if (parsed.data.sku) {
      const [duplicate] = await db.select({ id: invProducts.id }).from(invProducts)
        .where(and(eq(invProducts.orgId, orgId), eq(invProducts.sku, parsed.data.sku), sql`${invProducts.id} <> ${id}`)).limit(1);
      if (duplicate) { res.status(409).json({ success: false, error: `SKU "${parsed.data.sku}" already exists` }); return; }
    }
    if (parsed.data.categoryId) {
      const [category] = await db.select({ id: invCategories.id }).from(invCategories)
        .where(and(eq(invCategories.id, parsed.data.categoryId), eq(invCategories.orgId, orgId))).limit(1);
      if (!category) { res.status(422).json({ success: false, error: "Category not found" }); return; }
    }
    const [updated] = await db.update(invProducts).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(invProducts.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
});

router.delete("/products/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: invProducts.id, name: invProducts.name }).from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Product not found" }); return; }
    const [{ movementCount }] = await db.select({ movementCount: sql<number>`count(*)::int` }).from(invMovements).where(eq(invMovements.productId, id));
    const [{ transferCount }] = await db.select({ transferCount: sql<number>`count(*)::int` }).from(invTransfers).where(sql`${invTransfers.id} in (select transfer_id from inv_transfer_lines where product_id = ${id})`);
    if (movementCount > 0 || transferCount > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — it has inventory activity. Mark it inactive instead.` });
      return;
    }
    await db.delete(invProducts).where(eq(invProducts.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

// ── Warehouses ────────────────────────────────────────────────────────────────

router.get("/warehouses", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filters = [eq(invWarehouses.orgId, req.user!.orgId!)];
    if (search) filters.push(or(ilike(invWarehouses.code, `%${search}%`), ilike(invWarehouses.name, `%${search}%`))!);
    if (status) filters.push(eq(invWarehouses.status, status));
    const rows = await db.select().from(invWarehouses).where(and(...filters)).orderBy(invWarehouses.code);
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch warehouses" });
  }
});

router.post("/warehouses", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertInvWarehouseSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const orgId = req.user!.orgId!;
    const [duplicate] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
      .where(and(eq(invWarehouses.orgId, orgId), eq(invWarehouses.code, parsed.data.code))).limit(1);
    if (duplicate) { res.status(409).json({ success: false, error: `Warehouse code "${parsed.data.code}" already exists` }); return; }
    const [created] = await db.insert(invWarehouses).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create warehouse" });
  }
});

router.put("/warehouses/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateInvWarehouseSchema.safeParse(req.body);
  if (!parsed.success) { validationError(res, parsed.error.issues); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
      .where(and(eq(invWarehouses.id, id), eq(invWarehouses.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Warehouse not found" }); return; }
    if (parsed.data.code) {
      const [duplicate] = await db.select({ id: invWarehouses.id }).from(invWarehouses)
        .where(and(eq(invWarehouses.orgId, orgId), eq(invWarehouses.code, parsed.data.code), sql`${invWarehouses.id} <> ${id}`)).limit(1);
      if (duplicate) { res.status(409).json({ success: false, error: `Warehouse code "${parsed.data.code}" already exists` }); return; }
    }
    const [updated] = await db.update(invWarehouses).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(invWarehouses.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update warehouse" });
  }
});

router.delete("/warehouses/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = invalidId(req.params.id as string);
  if (!id) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: invWarehouses.id, name: invWarehouses.name }).from(invWarehouses)
      .where(and(eq(invWarehouses.id, id), eq(invWarehouses.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Warehouse not found" }); return; }
    const [{ stockCount }] = await db.select({ stockCount: sql<number>`count(*)::int` }).from(invStockLevels).where(eq(invStockLevels.warehouseId, id));
    if (stockCount > 0) {
      res.status(409).json({ success: false, error: `Cannot delete "${existing.name}" — stock records exist. Mark it inactive instead.` });
      return;
    }
    await db.delete(invWarehouses).where(eq(invWarehouses.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete warehouse" });
  }
});

export default router;