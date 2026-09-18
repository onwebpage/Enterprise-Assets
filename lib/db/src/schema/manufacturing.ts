import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const MFG_WORK_CENTER_STATUSES = ["active", "idle", "maintenance", "inactive"] as const;
export type MfgWorkCenterStatus = (typeof MFG_WORK_CENTER_STATUSES)[number];

export const MFG_WORK_CENTER_TYPES = ["machine", "labor", "tool", "assembly"] as const;
export type MfgWorkCenterType = (typeof MFG_WORK_CENTER_TYPES)[number];

export const MFG_BOM_STATUSES = ["draft", "active", "archived"] as const;
export type MfgBomStatus = (typeof MFG_BOM_STATUSES)[number];

export const MFG_WO_STATUSES = ["planned", "scheduled", "in_progress", "done", "cancelled"] as const;
export type MfgWorkOrderStatus = (typeof MFG_WO_STATUSES)[number];

export const MFG_WO_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type MfgWorkOrderPriority = (typeof MFG_WO_PRIORITIES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * mfg_work_centers — machines, assembly lines, labor stations, etc.
 */
export const mfgWorkCenters = pgTable("mfg_work_centers", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code:        text("code").notNull(),              // e.g. CNC-01
  name:        text("name").notNull(),
  type:        text("type").notNull().default("machine"), // MfgWorkCenterType
  description: text("description"),
  capacity:    numeric("capacity", { precision: 10, scale: 2 }).notNull().default("1"), // units/hour
  costPerHour: numeric("cost_per_hour", { precision: 15, scale: 2 }).notNull().default("0"),
  operator:    text("operator"),
  status:      text("status").notNull().default("active"), // MfgWorkCenterStatus
  notes:       text("notes"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * mfg_boms — Bill of Materials headers.
 */
export const mfgBOMs = pgTable("mfg_boms", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  bomNumber:   text("bom_number").notNull(),        // BOM-XXX
  productName: text("product_name").notNull(),      // finished good name
  productSku:  text("product_sku"),                 // optional SKU reference
  outputQty:   numeric("output_qty", { precision: 15, scale: 4 }).notNull().default("1"),
  unit:        text("unit").notNull().default("each"),
  version:     text("version").notNull().default("1.0"),
  status:      text("status").notNull().default("draft"), // MfgBomStatus
  notes:       text("notes"),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * mfg_bom_lines — components / raw materials needed per BOM.
 */
export const mfgBOMLines = pgTable("mfg_bom_lines", {
  id:            serial("id").primaryKey(),
  bomId:         integer("bom_id").notNull().references(() => mfgBOMs.id, { onDelete: "cascade" }),
  sequence:      integer("sequence").notNull().default(1),
  componentName: text("component_name").notNull(),
  componentSku:  text("component_sku"),
  qty:           numeric("qty", { precision: 15, scale: 4 }).notNull(),
  unit:          text("unit").notNull().default("each"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

/**
 * mfg_work_orders — production orders.
 */
export const mfgWorkOrders = pgTable("mfg_work_orders", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  woNumber:         text("wo_number").notNull(),         // WO-XXXX
  bomId:            integer("bom_id").references(() => mfgBOMs.id, { onDelete: "set null" }),
  productName:      text("product_name").notNull(),
  workCenterId:     integer("work_center_id").references(() => mfgWorkCenters.id, { onDelete: "set null" }),
  plannedQty:       numeric("planned_qty",   { precision: 15, scale: 4 }).notNull(),
  producedQty:      numeric("produced_qty",  { precision: 15, scale: 4 }).notNull().default("0"),
  priority:         text("priority").notNull().default("medium"),  // MfgWorkOrderPriority
  status:           text("status").notNull().default("planned"),   // MfgWorkOrderStatus
  plannedStartDate: text("planned_start_date"),    // ISO date YYYY-MM-DD
  plannedEndDate:   text("planned_end_date"),
  actualStartDate:  text("actual_start_date"),
  actualEndDate:    text("actual_end_date"),
  notes:            text("notes"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertMfgWorkCenterSchema = z.object({
  code:        z.string().min(1).max(30),
  name:        z.string().min(1).max(200),
  type:        z.enum(MFG_WORK_CENTER_TYPES).optional().default("machine"),
  description: z.string().max(500).nullable().optional(),
  capacity:    z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("1"),
  costPerHour: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  operator:    z.string().max(200).nullable().optional(),
  status:      z.enum(MFG_WORK_CENTER_STATUSES).optional().default("active"),
  notes:       z.string().max(1000).nullable().optional(),
});
export const updateMfgWorkCenterSchema = insertMfgWorkCenterSchema.partial();

export const insertMfgBOMLineSchema = z.object({
  sequence:      z.number().int().min(1).optional().default(1),
  componentName: z.string().min(1).max(300),
  componentSku:  z.string().max(50).nullable().optional(),
  qty:           z.string().regex(/^\d+(\.\d{1,4})?$/).refine(v => parseFloat(v) > 0, "Qty must be positive"),
  unit:          z.string().max(20).optional().default("each"),
  notes:         z.string().max(500).nullable().optional(),
});

export const insertMfgBOMSchema = z.object({
  productName: z.string().min(1).max(300),
  productSku:  z.string().max(50).nullable().optional(),
  outputQty:   z.string().regex(/^\d+(\.\d{1,4})?$/).optional().default("1"),
  unit:        z.string().max(20).optional().default("each"),
  version:     z.string().max(20).optional().default("1.0"),
  status:      z.enum(MFG_BOM_STATUSES).optional().default("draft"),
  notes:       z.string().max(1000).nullable().optional(),
  lines:       z.array(insertMfgBOMLineSchema).optional().default([]),
});
export const updateMfgBOMSchema = z.object({
  productName: z.string().min(1).max(300).optional(),
  productSku:  z.string().max(50).nullable().optional(),
  outputQty:   z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  unit:        z.string().max(20).optional(),
  version:     z.string().max(20).optional(),
  status:      z.enum(MFG_BOM_STATUSES).optional(),
  notes:       z.string().max(1000).nullable().optional(),
  lines:       z.array(insertMfgBOMLineSchema).optional(),
});

export const insertMfgWorkOrderSchema = z.object({
  bomId:            z.number().int().positive().nullable().optional(),
  productName:      z.string().min(1).max(300),
  workCenterId:     z.number().int().positive().nullable().optional(),
  plannedQty:       z.string().regex(/^\d+(\.\d{1,4})?$/).refine(v => parseFloat(v) > 0, "Qty must be positive"),
  priority:         z.enum(MFG_WO_PRIORITIES).optional().default("medium"),
  status:           z.enum(MFG_WO_STATUSES).optional().default("planned"),
  plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  plannedEndDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:            z.string().max(1000).nullable().optional(),
});
export const updateMfgWorkOrderSchema = insertMfgWorkOrderSchema.partial().extend({
  producedQty:     z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  actualStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  actualEndDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type MfgWorkCenter  = typeof mfgWorkCenters.$inferSelect;
export type MfgBOM         = typeof mfgBOMs.$inferSelect;
export type MfgBOMLine     = typeof mfgBOMLines.$inferSelect;
export type MfgWorkOrder   = typeof mfgWorkOrders.$inferSelect;

export type InsertMfgWorkCenter = z.infer<typeof insertMfgWorkCenterSchema>;
export type InsertMfgBOM        = z.infer<typeof insertMfgBOMSchema>;
export type InsertMfgWorkOrder  = z.infer<typeof insertMfgWorkOrderSchema>;
export type UpdateMfgWorkOrder  = z.infer<typeof updateMfgWorkOrderSchema>;
