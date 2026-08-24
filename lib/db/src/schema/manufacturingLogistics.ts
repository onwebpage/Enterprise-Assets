import { pgTable, serial, text, integer, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const MFG_LOGISTICS_TYPES = [
  "production_plan", "mrp_run", "batch", "material_issue", "material_return", "by_product",
  "production_cost", "yield_wastage", "capacity_plan", "schedule", "shop_floor",
  "dispatch", "transporter", "delivery_challan", "shipment", "route", "pod", "freight",
  "vehicle", "logistics_cost",
] as const;
export type MfgLogisticsType = (typeof MFG_LOGISTICS_TYPES)[number];

export const MFG_LOGISTICS_STATUSES = [
  "draft", "planned", "scheduled", "in_progress", "ready", "dispatched", "in_transit",
  "delivered", "completed", "cancelled", "on_hold",
] as const;
export type MfgLogisticsStatus = (typeof MFG_LOGISTICS_STATUSES)[number];

export const mfgLogisticsRecords = pgTable("mfg_logistics_records", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  recordNumber: text("record_number").notNull(),
  recordType: text("record_type").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  recordDate: text("record_date").notNull(),
  dueDate: text("due_date"),
  productName: text("product_name"),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  unit: text("unit").notNull().default("each"),
  source: text("source"),
  destination: text("destination"),
  partner: text("partner"),
  vehicle: text("vehicle"),
  plannedCost: numeric("planned_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  actualCost: numeric("actual_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MfgLogisticsRecord = typeof mfgLogisticsRecords.$inferSelect;