import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const FINANCIAL_CONTROL_CATEGORIES = [
  "reconciliation",
  "approval",
  "segregation_of_duties",
  "period_close",
  "journal_review",
  "access",
  "other",
] as const;
export type FinancialControlCategory = (typeof FINANCIAL_CONTROL_CATEGORIES)[number];

export const FINANCIAL_CONTROL_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "annual", "event"] as const;
export type FinancialControlFrequency = (typeof FINANCIAL_CONTROL_FREQUENCIES)[number];

export const FINANCIAL_CONTROL_RISKS = ["low", "medium", "high", "critical"] as const;
export type FinancialControlRisk = (typeof FINANCIAL_CONTROL_RISKS)[number];

export const FINANCIAL_CONTROL_STATUSES = ["active", "inactive"] as const;
export type FinancialControlStatus = (typeof FINANCIAL_CONTROL_STATUSES)[number];

export const CONTROL_RUN_STATUSES = ["pending", "in_progress", "completed", "waived"] as const;
export type ControlRunStatus = (typeof CONTROL_RUN_STATUSES)[number];

export const CONTROL_RUN_RESULTS = ["pending", "passed", "failed", "partial"] as const;
export type ControlRunResult = (typeof CONTROL_RUN_RESULTS)[number];

export const CONTROL_EXCEPTION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type ControlExceptionSeverity = (typeof CONTROL_EXCEPTION_SEVERITIES)[number];

export const CONTROL_EXCEPTION_STATUSES = ["open", "investigating", "resolved", "accepted"] as const;
export type ControlExceptionStatus = (typeof CONTROL_EXCEPTION_STATUSES)[number];

export const financialControls = pgTable("financial_controls", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  controlNumber: text("control_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  frequency: text("frequency").notNull().default("monthly"),
  riskLevel: text("risk_level").notNull().default("medium"),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
  reviewerId: integer("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  threshold: numeric("threshold", { precision: 15, scale: 2 }),
  dueDay: integer("due_day"),
  status: text("status").notNull().default("active"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const controlRuns = pgTable("financial_control_runs", {
  id: serial("id").primaryKey(),
  controlId: integer("control_id").notNull().references(() => financialControls.id, { onDelete: "restrict" }),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  runNumber: text("run_number").notNull().unique(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"),
  result: text("result").notNull().default("pending"),
  performedBy: integer("performed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  performedAt: timestamp("performed_at"),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  evidenceReference: text("evidence_reference"),
  exceptionCount: integer("exception_count").notNull().default(0),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const controlExceptions = pgTable("financial_control_exceptions", {
  id: serial("id").primaryKey(),
  controlRunId: integer("control_run_id").notNull().references(() => controlRuns.id, { onDelete: "restrict" }),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  exceptionNumber: text("exception_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: text("due_date"),
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FinancialControl = typeof financialControls.$inferSelect;
export type ControlRun = typeof controlRuns.$inferSelect;
export type ControlException = typeof controlExceptions.$inferSelect;