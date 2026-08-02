import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const INV_WAREHOUSE_STATUSES = ["active", "inactive", "maintenance"] as const;
export type InvWarehouseStatus = (typeof INV_WAREHOUSE_STATUSES)[number];

export const INV_PRODUCT_STATUSES = ["active", "inactive", "discontinued"] as const;
export type InvProductStatus = (typeof INV_PRODUCT_STATUSES)[number];

export const INV_MOVEMENT_TYPES = ["receipt", "dispatch", "transfer", "adjustment"] as const;
export type InvMovementType = (typeof INV_MOVEMENT_TYPES)[number];

export const INV_TRANSFER_STATUSES = ["pending", "in_transit", "completed", "cancelled", "on_hold"] as const;
export type InvTransferStatus = (typeof INV_TRANSFER_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * inv_categories — product category master.
 */
export const invCategories = pgTable("inv_categories", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  description: text("description"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * inv_warehouses — warehouse / location master.
 */
export const invWarehouses = pgTable("inv_warehouses", {
  id:        serial("id").primaryKey(),
  orgId:     integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code:      text("code").notNull(),              // e.g. WH-01
  name:      text("name").notNull(),
  location:  text("location"),
  manager:   text("manager"),
  capacity:  integer("capacity").notNull().default(0),
  status:    text("status").notNull().default("active"), // InvWarehouseStatus
  notes:     text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * inv_products — product / SKU master.
 */
export const invProducts = pgTable("inv_products", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  sku:          text("sku").notNull(),
  name:         text("name").notNull(),
  description:  text("description"),
  categoryId:   integer("category_id").references(() => invCategories.id, { onDelete: "set null" }),
  unit:         text("unit").notNull().default("each"),      // each, kg, ltr, m, box
  costPrice:    numeric("cost_price",    { precision: 15, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 15, scale: 2 }).notNull().default("0"),
  reorderPoint: integer("reorder_point").notNull().default(0),
  reorderQty:   integer("reorder_qty").notNull().default(0),
  status:       text("status").notNull().default("active"),  // InvProductStatus
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/**
 * inv_stock_levels — current on-hand qty per product per warehouse.
 * Updated atomically by movements.
 */
export const invStockLevels = pgTable("inv_stock_levels", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  productId:   integer("product_id").notNull().references(() => invProducts.id,   { onDelete: "cascade" }),
  warehouseId: integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "cascade" }),
  qtyOnHand:   numeric("qty_on_hand",  { precision: 15, scale: 4 }).notNull().default("0"),
  qtyReserved: numeric("qty_reserved", { precision: 15, scale: 4 }).notNull().default("0"),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * inv_movements — immutable stock movement log.
 */
export const invMovements = pgTable("inv_movements", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  movementNumber: text("movement_number").notNull(),   // MV-XXXX
  productId:    integer("product_id").notNull().references(() => invProducts.id,    { onDelete: "restrict" }),
  warehouseId:  integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "restrict" }),
  movementType: text("movement_type").notNull(),        // InvMovementType
  qty:          numeric("qty", { precision: 15, scale: 4 }).notNull(), // positive = in, negative = out
  reference:    text("reference"),
  notes:        text("notes"),
  createdBy:    integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

/**
 * inv_transfers — inter-warehouse transfer orders.
 */
export const invTransfers = pgTable("inv_transfers", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  transferNumber:   text("transfer_number").notNull(),  // TF-XXXX
  fromWarehouseId:  integer("from_warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "restrict" }),
  toWarehouseId:    integer("to_warehouse_id").notNull().references(() => invWarehouses.id,   { onDelete: "restrict" }),
  status:           text("status").notNull().default("pending"), // InvTransferStatus
  transferDate:     text("transfer_date").notNull(),             // ISO date YYYY-MM-DD
  notes:            text("notes"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

/**
 * inv_transfer_lines — line items for each transfer.
 */
export const invTransferLines = pgTable("inv_transfer_lines", {
  id:         serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull().references(() => invTransfers.id, { onDelete: "cascade" }),
  productId:  integer("product_id").notNull().references(() => invProducts.id,   { onDelete: "restrict" }),
  qty:        numeric("qty", { precision: 15, scale: 4 }).notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertInvCategorySchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
});
export const updateInvCategorySchema = insertInvCategorySchema.partial();

export const insertInvWarehouseSchema = z.object({
  code:     z.string().min(1).max(20),
  name:     z.string().min(1).max(200),
  location: z.string().max(500).nullable().optional(),
  manager:  z.string().max(200).nullable().optional(),
  capacity: z.number().int().min(0).optional().default(0),
  status:   z.enum(INV_WAREHOUSE_STATUSES).optional().default("active"),
  notes:    z.string().max(1000).nullable().optional(),
});
export const updateInvWarehouseSchema = insertInvWarehouseSchema.partial();

export const insertInvProductSchema = z.object({
  sku:          z.string().min(1).max(50),
  name:         z.string().min(1).max(300),
  description:  z.string().max(1000).nullable().optional(),
  categoryId:   z.number().int().positive().nullable().optional(),
  unit:         z.string().max(20).optional().default("each"),
  costPrice:    z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  reorderPoint: z.number().int().min(0).optional().default(0),
  reorderQty:   z.number().int().min(0).optional().default(0),
  status:       z.enum(INV_PRODUCT_STATUSES).optional().default("active"),
  notes:        z.string().max(1000).nullable().optional(),
});
export const updateInvProductSchema = insertInvProductSchema.partial();

export const insertInvMovementSchema = z.object({
  productId:    z.number().int().positive(),
  warehouseId:  z.number().int().positive(),
  movementType: z.enum(INV_MOVEMENT_TYPES),
  qty:          z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Must be a number (positive or negative)"),
  reference:    z.string().max(100).nullable().optional(),
  notes:        z.string().max(500).nullable().optional(),
});

export const insertInvTransferSchema = z.object({
  fromWarehouseId: z.number().int().positive(),
  toWarehouseId:   z.number().int().positive(),
  transferDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:           z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    qty:       z.string().regex(/^\d+(\.\d{1,4})?$/).refine(v => parseFloat(v) > 0, "Qty must be positive"),
  })).min(1, "At least 1 line required"),
});

export const updateInvTransferSchema = z.object({
  status: z.enum(INV_TRANSFER_STATUSES),
  notes:  z.string().max(1000).nullable().optional(),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type InvCategory      = typeof invCategories.$inferSelect;
export type InvWarehouse     = typeof invWarehouses.$inferSelect;
export type InvProduct       = typeof invProducts.$inferSelect;
export type InvStockLevel    = typeof invStockLevels.$inferSelect;
export type InvMovement      = typeof invMovements.$inferSelect;
export type InvTransfer      = typeof invTransfers.$inferSelect;
export type InvTransferLine  = typeof invTransferLines.$inferSelect;

export type InsertInvProduct   = z.infer<typeof insertInvProductSchema>;
export type InsertInvMovement  = z.infer<typeof insertInvMovementSchema>;
export type InsertInvTransfer  = z.infer<typeof insertInvTransferSchema>;
