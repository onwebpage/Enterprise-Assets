import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { departments } from "./departments";
import { chartOfAccounts } from "./chartOfAccounts";
import { invProducts } from "./inventory";

// ── Constants ─────────────────────────────────────────────────────────────────

export const BUDGET_PERIODS = ["monthly", "quarterly", "yearly"] as const;
export const BUDGET_TYPES = ["operating", "capital", "cash_flow", "project"] as const;
export const BUDGET_STATUSES = ["draft", "active", "closed", "cancelled"] as const;
export const VARIANCE_TYPES = ["price", "quantity", "usage", "labour_rate", "labour_efficiency", "overhead", "sales_volume", "sales_price", "material"] as const;
export const FORECAST_METHODS = ["linear", "moving_average", "seasonal", "manual"] as const;
export const FORECAST_STATUSES = ["draft", "approved", "archived"] as const;
export const ALLOCATION_BASES = ["percentage", "budget", "fixed"] as const;
export const ALLOCATION_STATUSES = ["draft", "posted", "cancelled"] as const;

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * cost_centres — responsible cost accumulation units (e.g. IT, Marketing, Warehouse).
 */
export const costCentres = pgTable("cost_centres", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "set null" }),
  manager: text("manager"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * profit_centres — business units that generate revenue vs. cost (e.g. Product line, Region).
 */
export const profitCentres = pgTable("profit_centres", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  manager: text("manager"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * budgets — budget header per fiscal period/type.
 */
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  budgetNumber: text("budget_number").notNull(),
  name: text("name").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  periodType: text("period_type").notNull().default("monthly"),
  budgetType: text("budget_type").notNull().default("operating"),
  status: text("status").notNull().default("draft"),
  costCentreId: integer("cost_centre_id").references(() => costCentres.id, { onDelete: "set null" }),
  profitCentreId: integer("profit_centre_id").references(() => profitCentres.id, { onDelete: "set null" }),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * budget_lines — budget amount per chart-of-accounts line, per period index.
 * period_index = 0..11 for monthly, 0..3 for quarterly, 0 for yearly.
 */
export const budgetLines = pgTable("budget_lines", {
  id: serial("id").primaryKey(),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  costCentreId: integer("cost_centre_id").references(() => costCentres.id, { onDelete: "set null" }),
  profitCentreId: integer("profit_centre_id").references(() => profitCentres.id, { onDelete: "set null" }),
  periodIndex: integer("period_index").notNull().default(0),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
});

/**
 * product_costings — standard/variance costing per product (BOM-style rollup).
 */
export const productCostings = pgTable("product_costings", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "cascade" }),
  version: text("version").notNull().default("v1"),
  standardCost: numeric("standard_cost", { precision: 15, scale: 4 }).notNull().default("0"),
  lastActualCost: numeric("last_actual_cost", { precision: 15, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * product_costing_lines — cost components of a product costing (materials, labour, overhead...).
 */
export const productCostingLines = pgTable("product_costing_lines", {
  id: serial("id").primaryKey(),
  costingId: integer("costing_id").notNull().references(() => productCostings.id, { onDelete: "cascade" }),
  componentName: text("component_name").notNull(),
  costType: text("cost_type").notNull().default("material"), // material | labour | overhead | other
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull().default("1"),
  unitCost: numeric("unit_cost", { precision: 15, scale: 4 }).notNull().default("0"),
  amount: numeric("amount", { precision: 15, scale: 4 }).notNull().default("0"),
  description: text("description"),
});

/**
 * cost_variances — recorded variance analysis entries.
 */
export const costVariances = pgTable("cost_variances", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  varianceNumber: text("variance_number").notNull(),
  varianceType: text("variance_type").notNull().default("price"),
  productId: integer("product_id").references(() => invProducts.id, { onDelete: "set null" }),
  accountId: integer("account_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),
  costCentreId: integer("cost_centre_id").references(() => costCentres.id, { onDelete: "set null" }),
  profitCentreId: integer("profit_centre_id").references(() => profitCentres.id, { onDelete: "set null" }),
  period: text("period").notNull(), // YYYY-MM
  standardAmount: numeric("standard_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  actualAmount: numeric("actual_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  varianceAmount: numeric("variance_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  variancePct: numeric("variance_pct", { precision: 8, scale: 2 }).notNull().default("0"),
  reason: text("reason"),
  action: text("action"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * forecasts — revenue/expense forecasts per period using a selected method.
 */
export const forecasts = pgTable("forecasts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  forecastNumber: text("forecast_number").notNull(),
  name: text("name").notNull(),
  method: text("method").notNull().default("manual"),
  status: text("status").notNull().default("draft"),
  currency: text("currency").notNull().default("INR"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * forecast_lines — one line per account per period (YYYY-MM).
 */
export const forecastLines = pgTable("forecast_lines", {
  id: serial("id").primaryKey(),
  forecastId: integer("forecast_id").notNull().references(() => forecasts.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  period: text("period").notNull(), // YYYY-MM
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  isActual: boolean("is_actual").notNull().default(false),
  notes: text("notes"),
});

/**
 * allocation_rules — repeatable rules for moving shared cost centre spend into
 * profit centres for management reporting.
 */
export const allocationRules = pgTable("allocation_rules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  ruleNumber: text("rule_number").notNull(),
  name: text("name").notNull(),
  sourceCostCentreId: integer("source_cost_centre_id").notNull().references(() => costCentres.id, { onDelete: "restrict" }),
  targetProfitCentreId: integer("target_profit_centre_id").notNull().references(() => profitCentres.id, { onDelete: "restrict" }),
  basis: text("basis").notNull().default("percentage"),
  rate: numeric("rate", { precision: 8, scale: 2 }).notNull().default("100"),
  fixedAmount: numeric("fixed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * allocation_runs — an auditable execution of the active allocation rules for
 * one management-accounting period.
 */
export const allocationRuns = pgTable("allocation_runs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  runNumber: text("run_number").notNull(),
  period: text("period").notNull(),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const allocationLines = pgTable("allocation_lines", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => allocationRuns.id, { onDelete: "cascade" }),
  ruleId: integer("rule_id").notNull().references(() => allocationRules.id, { onDelete: "restrict" }),
  sourceCostCentreId: integer("source_cost_centre_id").notNull().references(() => costCentres.id, { onDelete: "restrict" }),
  targetProfitCentreId: integer("target_profit_centre_id").notNull().references(() => profitCentres.id, { onDelete: "restrict" }),
  basisAmount: numeric("basis_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  rate: numeric("rate", { precision: 8, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CostCentre = typeof costCentres.$inferSelect;
export type ProfitCentre = typeof profitCentres.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type BudgetLine = typeof budgetLines.$inferSelect;
export type ProductCosting = typeof productCostings.$inferSelect;
export type ProductCostingLine = typeof productCostingLines.$inferSelect;
export type CostVariance = typeof costVariances.$inferSelect;
export type Forecast = typeof forecasts.$inferSelect;
export type ForecastLine = typeof forecastLines.$inferSelect;
export type AllocationRule = typeof allocationRules.$inferSelect;
export type AllocationRun = typeof allocationRuns.$inferSelect;
export type AllocationLine = typeof allocationLines.$inferSelect;