import { pgTable, serial, text, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

// ── finance_transactions ──────────────────────────────────────────────────────
// Individual debit/credit movements used for "Recent Transactions" + KPI roll-ups.
// amount is always positive; direction ('credit'|'debit') carries the sign.
export const financeTransactions = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  direction: text("direction").notNull(), // 'credit' | 'debit'
  category: text("category").notNull(),  // 'revenue' | 'expense' | 'transfer'
  reference: text("reference"),
  transactedAt: timestamp("transacted_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceTransactionSchema = createInsertSchema(financeTransactions).omit({ id: true, createdAt: true });
export const selectFinanceTransactionSchema = createSelectSchema(financeTransactions);

export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type InsertFinanceTransaction = z.infer<typeof insertFinanceTransactionSchema>;

// ── finance_monthly_summary ───────────────────────────────────────────────────
// Pre-aggregated monthly P&L figures (in millions) for the Revenue Chart.
// One row per month. Populated by seed; updated by a background job in production.
export const financeMonthlySummary = pgTable("finance_monthly_summary", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  month: text("month").notNull(),       // 'Jan', 'Feb', …
  year: integer("year").notNull(),
  revenue: numeric("revenue", { precision: 10, scale: 3 }).notNull(),  // in $M
  cogs: numeric("cogs",    { precision: 10, scale: 3 }).notNull(),
  gross: numeric("gross",  { precision: 10, scale: 3 }).notNull(),
  opex: numeric("opex",    { precision: 10, scale: 3 }).notNull(),
  net: numeric("net",      { precision: 10, scale: 3 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceMonthlySummarySchema = createInsertSchema(financeMonthlySummary).omit({ id: true, createdAt: true });
export const selectFinanceMonthlySummarySchema = createSelectSchema(financeMonthlySummary);

export type FinanceMonthlySummary = typeof financeMonthlySummary.$inferSelect;
export type InsertFinanceMonthlySummary = z.infer<typeof insertFinanceMonthlySummarySchema>;
