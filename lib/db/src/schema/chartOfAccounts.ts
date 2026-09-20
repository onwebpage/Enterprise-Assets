import {
  pgTable, serial, text, integer, timestamp, numeric,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

// Account type drives the normal balance automatically.
// Asset, Expense   → Debit
// Liability, Equity, Income → Credit
export const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;
export const NORMAL_BALANCES = ["Debit", "Credit"] as const;
export const ACCOUNT_STATUSES = ["active", "inactive"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type NormalBalance = (typeof NORMAL_BALANCES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  // Org-scoped; null = global/system account
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  // Hierarchical code — e.g. "1000" (parent) / "1010" (child)
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),         // AccountType
  normalBalance: text("normal_balance").notNull(), // NormalBalance
  // Self-referencing FK for parent→child hierarchy
  parentId: integer("parent_id").references(
    (): AnyPgColumn => chartOfAccounts.id,
    { onDelete: "restrict" },          // cannot delete a parent that has children
  ),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  status: text("status").notNull().default("active"), // AccountStatus
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts, {
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  type: z.enum(ACCOUNT_TYPES),
  normalBalance: z.enum(NORMAL_BALANCES),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  orgId: z.number().int().positive().optional().nullable(),
  balance: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateChartOfAccountSchema = insertChartOfAccountSchema.partial().required({
  code: true,
  name: true,
  type: true,
  normalBalance: true,
});

export const selectChartOfAccountSchema = createSelectSchema(chartOfAccounts);

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type UpdateChartOfAccount = z.infer<typeof updateChartOfAccountSchema>;
