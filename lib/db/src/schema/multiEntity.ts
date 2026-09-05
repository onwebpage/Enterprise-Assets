import { pgTable, serial, text, integer, timestamp, numeric, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { invWarehouses } from "./inventory";
import { users } from "./users";

export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  parentId: integer("parent_id"),
  code: text("code").notNull(),
  name: text("name").notNull(),
  unitType: text("unit_type").notNull().default("operating"),
  status: text("status").notNull().default("active"),
  currency: text("currency").notNull().default("INR"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ codeUnique: uniqueIndex("business_units_org_code_uidx").on(table.orgId, table.code) }));

export const warehouseNodes = pgTable("warehouse_nodes", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  warehouseId: integer("warehouse_id").references(() => invWarehouses.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  parentId: integer("parent_id"),
  code: text("code").notNull(),
  name: text("name").notNull(),
  nodeType: text("node_type").notNull().default("warehouse"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({ codeUnique: uniqueIndex("warehouse_nodes_org_code_uidx").on(table.orgId, table.code) }));

export const intercompanyReconciliations = pgTable("intercompany_reconciliations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  counterpartyOrgId: integer("counterparty_org_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  asOfDate: text("as_of_date").notNull(),
  sourceAmount: numeric("source_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  difference: numeric("difference", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const consolidationRuns = pgTable("consolidation_runs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  status: text("status").notNull().default("draft"),
  entityCount: integer("entity_count").notNull().default(0),
  totals: jsonb("totals").notNull().default({}),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BusinessUnit = typeof businessUnits.$inferSelect;
export type WarehouseNode = typeof warehouseNodes.$inferSelect;
export type IntercompanyReconciliation = typeof intercompanyReconciliations.$inferSelect;
export type ConsolidationRun = typeof consolidationRuns.$inferSelect;