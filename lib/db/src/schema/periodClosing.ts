import { pgTable, serial, text, integer, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { chartOfAccounts } from "./chartOfAccounts";
import { journalEntries } from "./generalLedger";

export const FINANCIAL_PERIOD_STATUSES = ["open", "soft_closed", "closed"] as const;
export type FinancialPeriodStatus = (typeof FINANCIAL_PERIOD_STATUSES)[number];

export const YEAR_END_CLOSING_STATUSES = ["completed"] as const;
export type YearEndClosingStatus = (typeof YEAR_END_CLOSING_STATUSES)[number];

export const financialPeriods = pgTable("financial_periods", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  fiscalYear: integer("fiscal_year").notNull(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("open"),
  isYearEnd: boolean("is_year_end").notNull().default(false),
  notes: text("notes"),
  closedAt: timestamp("closed_at"),
  closedBy: integer("closed_by").references(() => users.id, { onDelete: "set null" }),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const yearEndClosings = pgTable("year_end_closings", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  periodId: integer("period_id").notNull().references(() => financialPeriods.id, { onDelete: "restrict" }),
  fiscalYear: integer("fiscal_year").notNull(),
  closingDate: text("closing_date").notNull(),
  retainedEarningsAccountId: integer("retained_earnings_account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "restrict" }),
  netIncome: numeric("net_income", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FinancialPeriod = typeof financialPeriods.$inferSelect;
export type YearEndClosing = typeof yearEndClosings.$inferSelect;