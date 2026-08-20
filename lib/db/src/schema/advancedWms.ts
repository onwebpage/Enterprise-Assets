import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { invWarehouses, invProducts } from "./inventory";

export const WMS_BIN_TYPES = ["bulk", "picking", "receiving", "shipping", "quarantine"] as const;
export const WMS_RECEIPT_STATUSES = ["draft", "received", "putaway", "cancelled"] as const;
export const WMS_LOT_STATUSES = ["available", "quarantine", "expired", "depleted"] as const;
export const WMS_SERIAL_STATUSES = ["available", "reserved", "issued", "damaged"] as const;
export const WMS_COUNT_STATUSES = ["draft", "in_progress", "completed", "cancelled"] as const;

export const wmsBins = pgTable("wms_bins", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  warehouseId: integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  zone: text("zone"),
  binType: text("bin_type").notNull().default("picking"),
  capacity: numeric("capacity", { precision: 15, scale: 4 }).notNull().default("0"),
  barcode: text("barcode"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wmsBarcodes = pgTable("wms_barcodes", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "cascade" }),
  barcode: text("barcode").notNull(),
  barcodeType: text("barcode_type").notNull().default("barcode"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wmsLots = pgTable("wms_lots", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "restrict" }),
  binId: integer("bin_id").references(() => wmsBins.id, { onDelete: "set null" }),
  lotNumber: text("lot_number").notNull(),
  manufactureDate: text("manufacture_date"),
  expiryDate: text("expiry_date"),
  qtyOnHand: numeric("qty_on_hand", { precision: 15, scale: 4 }).notNull().default("0"),
  qtyReserved: numeric("qty_reserved", { precision: 15, scale: 4 }).notNull().default("0"),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wmsSerials = pgTable("wms_serials", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "restrict" }),
  binId: integer("bin_id").references(() => wmsBins.id, { onDelete: "set null" }),
  lotId: integer("lot_id").references(() => wmsLots.id, { onDelete: "set null" }),
  serialNumber: text("serial_number").notNull(),
  status: text("status").notNull().default("available"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  issuedAt: timestamp("issued_at"),
});

export const wmsReceipts = pgTable("wms_receipts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  receiptNumber: text("receipt_number").notNull(),
  grnId: integer("grn_id"),
  warehouseId: integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "restrict" }),
  supplierName: text("supplier_name"),
  receiptDate: text("receipt_date").notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wmsReceiptLines = pgTable("wms_receipt_lines", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull().references(() => wmsReceipts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  binId: integer("bin_id").references(() => wmsBins.id, { onDelete: "set null" }),
  lotNumber: text("lot_number"),
  expiryDate: text("expiry_date"),
  qty: numeric("qty", { precision: 15, scale: 4 }).notNull(),
  acceptedQty: numeric("accepted_qty", { precision: 15, scale: 4 }).notNull().default("0"),
  rejectedQty: numeric("rejected_qty", { precision: 15, scale: 4 }).notNull().default("0"),
  serialNumbers: text("serial_numbers"),
  notes: text("notes"),
});

export const wmsCycleCounts = pgTable("wms_cycle_counts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  countNumber: text("count_number").notNull(),
  warehouseId: integer("warehouse_id").notNull().references(() => invWarehouses.id, { onDelete: "restrict" }),
  binId: integer("bin_id").references(() => wmsBins.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"),
  scheduledDate: text("scheduled_date").notNull(),
  completedAt: timestamp("completed_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wmsCycleCountLines = pgTable("wms_cycle_count_lines", {
  id: serial("id").primaryKey(),
  countId: integer("count_id").notNull().references(() => wmsCycleCounts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  binId: integer("bin_id").references(() => wmsBins.id, { onDelete: "set null" }),
  expectedQty: numeric("expected_qty", { precision: 15, scale: 4 }).notNull().default("0"),
  countedQty: numeric("counted_qty", { precision: 15, scale: 4 }),
  varianceQty: numeric("variance_qty", { precision: 15, scale: 4 }),
  notes: text("notes"),
});