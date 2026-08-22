import {
  pgTable, serial, text, integer, timestamp, numeric,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAINTENANCE_ASSET_CATEGORIES = ["machinery", "equipment", "vehicle", "tool", "facility", "other"] as const;
export type MaintenanceAssetCategory = (typeof MAINTENANCE_ASSET_CATEGORIES)[number];

export const MAINTENANCE_ASSET_STATUSES = ["operational", "under_maintenance", "breakdown", "retired", "out_of_service"] as const;
export type MaintenanceAssetStatus = (typeof MAINTENANCE_ASSET_STATUSES)[number];

export const MAINTENANCE_SCHEDULE_TYPES = ["preventive", "inspection", "calibration", "lubrication", "cleaning"] as const;
export type MaintenanceScheduleType = (typeof MAINTENANCE_SCHEDULE_TYPES)[number];

export const MAINTENANCE_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly", "custom"] as const;
export type MaintenanceFrequency = (typeof MAINTENANCE_FREQUENCIES)[number];

export const MAINTENANCE_SCHEDULE_STATUSES = ["active", "paused", "completed", "cancelled"] as const;
export type MaintenanceScheduleStatus = (typeof MAINTENANCE_SCHEDULE_STATUSES)[number];

export const MAINTENANCE_BREAKDOWN_STATUSES = ["open", "diagnosing", "in_progress", "resolved", "closed"] as const;
export type MaintenanceBreakdownStatus = (typeof MAINTENANCE_BREAKDOWN_STATUSES)[number];

export const MAINTENANCE_BREAKDOWN_TYPES = ["mechanical", "electrical", "hydraulic", "pneumatic", "software", "operator_error", "wear_tear", "other"] as const;
export type MaintenanceBreakdownType = (typeof MAINTENANCE_BREAKDOWN_TYPES)[number];

export const MAINTENANCE_WO_TYPES = ["preventive", "breakdown", "corrective", "amc", "inspection", "other"] as const;
export type MaintenanceWoType = (typeof MAINTENANCE_WO_TYPES)[number];

export const MAINTENANCE_WO_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type MaintenanceWoPriority = (typeof MAINTENANCE_WO_PRIORITIES)[number];

export const MAINTENANCE_WO_STATUSES = ["draft", "open", "in_progress", "on_hold", "completed", "cancelled"] as const;
export type MaintenanceWoStatus = (typeof MAINTENANCE_WO_STATUSES)[number];

export const MAINTENANCE_AMC_STATUSES = ["active", "expiring", "expired", "terminated"] as const;
export type MaintenanceAmcStatus = (typeof MAINTENANCE_AMC_STATUSES)[number];

export const MAINTENANCE_PART_STATUSES = ["active", "inactive", "discontinued"] as const;
export type MaintenancePartStatus = (typeof MAINTENANCE_PART_STATUSES)[number];

export const MAINTENANCE_HISTORY_TYPES = ["preventive", "breakdown", "corrective", "repair", "inspection", "other"] as const;
export type MaintenanceHistoryType = (typeof MAINTENANCE_HISTORY_TYPES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * maintenance_assets — asset/machine maintenance register.
 */
export const maintenanceAssets = pgTable("maintenance_assets", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  assetNumber: text("asset_number").notNull(),
  name: text("name").notNull(),
  assetType: text("asset_type").notNull().default("machinery"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  location: text("location"),
  purchaseDate: text("purchase_date"),
  expectedLifeMonths: integer("expected_life_months").notNull().default(120),
  status: text("status").notNull().default("operational"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * maintenance_schedules — preventive maintenance schedules.
 */
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => maintenanceAssets.id, { onDelete: "cascade" }),
  scheduleNumber: text("schedule_number").notNull(),
  scheduleType: text("schedule_type").notNull().default("preventive"),
  title: text("title").notNull(),
  frequencyType: text("frequency_type").notNull().default("monthly"),
  frequencyValue: integer("frequency_value").notNull().default(1),
  lastRunDate: text("last_run_date"),
  nextDueDate: text("next_due_date"),
  assignedTo: text("assigned_to"),
  estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * maintenance_breakdowns — breakdown / failure tracking.
 */
export const maintenanceBreakdowns = pgTable("maintenance_breakdowns", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => maintenanceAssets.id, { onDelete: "cascade" }),
  breakdownNumber: text("breakdown_number").notNull(),
  breakdownType: text("breakdown_type").notNull().default("mechanical"),
  reportedDate: text("reported_date").notNull(),
  reportedTime: text("reported_time"),
  downtimeHours: numeric("downtime_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  rootCause: text("root_cause"),
  actionTaken: text("action_taken"),
  status: text("status").notNull().default("open"),
  resolvedDate: text("resolved_date"),
  resolvedBy: text("resolved_by"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * maintenance_work_orders — maintenance work orders.
 */
export const maintenanceWorkOrders = pgTable("maintenance_work_orders", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  workOrderNumber: text("work_order_number").notNull(),
  assetId: integer("asset_id").notNull().references(() => maintenanceAssets.id, { onDelete: "cascade" }),
  workType: text("work_type").notNull().default("corrective"),
  scheduleId: integer("schedule_id").references(() => maintenanceSchedules.id, { onDelete: "set null" }),
  breakdownId: integer("breakdown_id").references(() => maintenanceBreakdowns.id, { onDelete: "set null" }),
  amcId: integer("amc_id"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("draft"),
  plannedStart: text("planned_start"),
  plannedEnd: text("planned_end"),
  actualStart: text("actual_start"),
  actualEnd: text("actual_end"),
  assignedTo: text("assigned_to"),
  laborCost: numeric("labor_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  partsCost: numeric("parts_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * maintenance_amc — Annual Maintenance Contracts.
 */
export const maintenanceAmcs = pgTable("maintenance_amc", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  contractNumber: text("contract_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  contractValue: numeric("contract_value", { precision: 15, scale: 2 }).notNull().default("0"),
  coverage: text("coverage"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * maintenance_spare_parts — Spare parts inventory.
 */
export const maintenanceSpareParts = pgTable("maintenance_spare_parts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  partCode: text("part_code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  quantityOnHand: numeric("quantity_on_hand", { precision: 12, scale: 2 }).notNull().default("0"),
  reorderPoint: numeric("reorder_point", { precision: 12, scale: 2 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  location: text("location"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * maintenance_work_order_parts — spare parts used in work orders.
 */
export const maintenanceWorkOrderParts = pgTable("maintenance_work_order_parts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  workOrderId: integer("work_order_id").notNull().references(() => maintenanceWorkOrders.id, { onDelete: "cascade" }),
  partId: integer("part_id").notNull().references(() => maintenanceSpareParts.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull().default("0"),
});

/**
 * maintenance_history — Maintenance history log.
 */
export const maintenanceHistory = pgTable("maintenance_history", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => maintenanceAssets.id, { onDelete: "cascade" }),
  workOrderId: integer("work_order_id").references(() => maintenanceWorkOrders.id, { onDelete: "set null" }),
  partId: integer("part_id").references(() => maintenanceSpareParts.id, { onDelete: "set null" }),
  historyType: text("history_type").notNull().default("other"),
  title: text("title").notNull(),
  description: text("description"),
  datePerformed: text("date_performed").notNull(),
  technician: text("technician"),
  cost: numeric("cost", { precision: 15, scale: 2 }).notNull().default("0"),
  hoursSpent: numeric("hours_spent", { precision: 8, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaintenanceAsset          = typeof maintenanceAssets.$inferSelect;
export type MaintenanceSchedule       = typeof maintenanceSchedules.$inferSelect;
export type MaintenanceBreakdown      = typeof maintenanceBreakdowns.$inferSelect;
export type MaintenanceWorkOrder      = typeof maintenanceWorkOrders.$inferSelect;
export type MaintenanceAmc            = typeof maintenanceAmcs.$inferSelect;
export type MaintenanceSparePart      = typeof maintenanceSpareParts.$inferSelect;
export type MaintenanceWorkOrderPart  = typeof maintenanceWorkOrderParts.$inferSelect;
export type MaintenanceHistoryRecord  = typeof maintenanceHistory.$inferSelect;