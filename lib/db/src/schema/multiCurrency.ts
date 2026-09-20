import { pgTable, serial, text, integer, timestamp, numeric, boolean, unique, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { chartOfAccounts } from "./chartOfAccounts";
import { journalEntries } from "./generalLedger";
import { users } from "./users";

export const CURRENCY_STATUSES = ["active", "inactive"] as const;
export type CurrencyStatus = (typeof CURRENCY_STATUSES)[number];

export const FX_RATE_TYPES = ["spot", "closing", "average"] as const;
export type FxRateType = (typeof FX_RATE_TYPES)[number];

export const FX_RATE_STATUSES = ["active", "inactive"] as const;
export type FxRateStatus = (typeof FX_RATE_STATUSES)[number];

export const REVALUATION_STATUSES = ["draft", "posted", "void"] as const;
export type RevaluationStatus = (typeof REVALUATION_STATUSES)[number];

export const financeCurrencies = pgTable("finance_currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().default("¤"),
  decimalPlaces: integer("decimal_places").notNull().default(2),
  status: text("status").notNull().default("active"),
  isSystem: boolean("is_system").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  codeUnique: unique("finance_currencies_code_key").on(table.code),
}));

export const financeExchangeRates = pgTable("finance_exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrency: text("from_currency").notNull().references(() => financeCurrencies.code, { onUpdate: "cascade", onDelete: "restrict" }),
  toCurrency: text("to_currency").notNull().references(() => financeCurrencies.code, { onUpdate: "cascade", onDelete: "restrict" }),
  rate: numeric("rate", { precision: 20, scale: 8 }).notNull(),
  effectiveDate: text("effective_date").notNull(),
  rateType: text("rate_type").notNull().default("spot"),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  pairDateUnique: uniqueIndex("finance_exchange_rates_pair_date_uidx").on(
    table.fromCurrency, table.toCurrency, table.effectiveDate, table.rateType,
  ),
  lookupIdx: index("finance_exchange_rates_lookup_idx").on(
    table.fromCurrency, table.toCurrency, table.effectiveDate,
  ),
}));

export const currencyRevaluationRuns = pgTable("currency_revaluation_runs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  runNumber: text("run_number").notNull(),
  valuationDate: text("valuation_date").notNull(),
  baseCurrency: text("base_currency").notNull().references(() => financeCurrencies.code, { onUpdate: "cascade", onDelete: "restrict" }),
  gainLossAccountId: integer("gain_loss_account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("draft"),
  totalGainLoss: numeric("total_gain_loss", { precision: 15, scale: 2 }).notNull().default("0"),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id, { onDelete: "restrict" }),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  postedBy: integer("posted_by").references(() => users.id, { onDelete: "set null" }),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  runNumberUnique: uniqueIndex("currency_revaluation_runs_number_uidx").on(table.runNumber),
  orgDateIdx: index("currency_revaluation_runs_org_date_idx").on(table.orgId, table.valuationDate),
}));

export const currencyRevaluationLines = pgTable("currency_revaluation_lines", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => currencyRevaluationRuns.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  currency: text("currency").notNull().references(() => financeCurrencies.code, { onUpdate: "cascade", onDelete: "restrict" }),
  foreignBalance: numeric("foreign_balance", { precision: 20, scale: 8 }).notNull(),
  previousRate: numeric("previous_rate", { precision: 20, scale: 8 }).notNull(),
  currentRate: numeric("current_rate", { precision: 20, scale: 8 }).notNull(),
  previousFunctionalAmount: numeric("previous_functional_amount", { precision: 15, scale: 2 }).notNull(),
  currentFunctionalAmount: numeric("current_functional_amount", { precision: 15, scale: 2 }).notNull(),
  gainLoss: numeric("gain_loss", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FinanceCurrency = typeof financeCurrencies.$inferSelect;
export type FinanceExchangeRate = typeof financeExchangeRates.$inferSelect;
export type CurrencyRevaluationRun = typeof currencyRevaluationRuns.$inferSelect;
export type CurrencyRevaluationLine = typeof currencyRevaluationLines.$inferSelect;