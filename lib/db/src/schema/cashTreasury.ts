import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const TREASURY_ACCOUNT_TYPES = ["checking", "savings", "credit", "cash", "investment", "petty_cash"] as const;
export type TreasuryAccountType = (typeof TREASURY_ACCOUNT_TYPES)[number];

export const TREASURY_ACCOUNT_STATUSES = ["active", "inactive", "closed"] as const;
export type TreasuryAccountStatus = (typeof TREASURY_ACCOUNT_STATUSES)[number];

export const PAYMENT_PLAN_STATUSES = ["draft", "scheduled", "approved", "processing", "paid", "cancelled", "failed"] as const;
export type PaymentPlanStatus = (typeof PAYMENT_PLAN_STATUSES)[number];

export const PAYMENT_METHODS = ["bank_transfer", "wire", "ach", "check", "cash", "credit_card", "upi", "rtgs", "neft"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const COLLECTION_PLAN_STATUSES = ["draft", "scheduled", "approved", "processing", "received", "cancelled", "overdue"] as const;
export type CollectionPlanStatus = (typeof COLLECTION_PLAN_STATUSES)[number];

export const TRANSFER_STATUSES = ["draft", "authorized", "executed", "cancelled", "failed"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const FORECAST_CONFIDENCE = ["high", "medium", "low"] as const;
export type ForecastConfidence = (typeof FORECAST_CONFIDENCE)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * treasury_accounts — cash & bank accounts used across cash, liquidity and forecasting.
 */
export const treasuryAccounts = pgTable("treasury_accounts", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:             text("name").notNull(),
  accountNumber:    text("account_number"),
  bankName:         text("bank_name"),
  bankBranch:       text("bank_branch"),
  currency:         text("currency").notNull().default("INR"),
  currentBalance:   numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  availableBalance: numeric("available_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  accountType:      text("account_type").notNull().default("checking"),
  status:           text("status").notNull().default("active"),
  isPrimary:        boolean("is_primary").notNull().default(false),
  notes:            text("notes"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

/**
 * treasury_positions — daily cash position snapshots per account.
 */
export const treasuryPositions = pgTable("treasury_positions", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  accountId:       integer("account_id").notNull().references(() => treasuryAccounts.id, { onDelete: "cascade" }),
  positionDate:    text("position_date").notNull(),
  openingBalance:  numeric("opening_balance",  { precision: 15, scale: 2 }).notNull().default("0"),
  closingBalance:  numeric("closing_balance",  { precision: 15, scale: 2 }).notNull().default("0"),
  netCashflow:     numeric("net_cashflow",     { precision: 15, scale: 2 }).notNull().default("0"),
  currency:        text("currency").notNull().default("INR"),
  notes:           text("notes"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/**
 * treasury_liquidity_forecasts — projected inflows/outflows and balances per account.
 */
export const treasuryLiquidityForecasts = pgTable("treasury_liquidity_forecasts", {
  id:                serial("id").primaryKey(),
  orgId:             integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  accountId:         integer("account_id").notNull().references(() => treasuryAccounts.id, { onDelete: "cascade" }),
  forecastDate:      text("forecast_date").notNull(),
  projectedInflow:   numeric("projected_inflow",   { precision: 15, scale: 2 }).notNull().default("0"),
  projectedOutflow:  numeric("projected_outflow",  { precision: 15, scale: 2 }).notNull().default("0"),
  netCashflow:       numeric("net_cashflow",       { precision: 15, scale: 2 }).notNull().default("0"),
  projectedBalance:  numeric("projected_balance",  { precision: 15, scale: 2 }).notNull().default("0"),
  confidence:        text("confidence").notNull().default("medium"),
  scenario:          text("scenario").notNull().default("base"),
  notes:             text("notes"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

/**
 * treasury_payment_plans — scheduled / planned outgoing payments.
 */
export const treasuryPaymentPlans = pgTable("treasury_payment_plans", {
  id:             serial("id").primaryKey(),
  orgId:          integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  paymentNumber:  text("payment_number").notNull(),
  accountId:      integer("account_id").references(() => treasuryAccounts.id, { onDelete: "set null" }),
  payeeName:      text("payee_name").notNull(),
  vendorName:     text("vendor_name"),
  amount:         numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency:       text("currency").notNull().default("INR"),
  paymentDate:    text("payment_date").notNull(),
  method:         text("method").notNull().default("bank_transfer"),
  category:       text("category").notNull().default("operating"),
  reference:      text("reference"),
  status:         text("status").notNull().default("draft"),
  paidDate:       text("paid_date"),
  notes:          text("notes"),
  createdBy:      integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

/**
 * treasury_collection_plans — planned / scheduled incoming collections.
 */
export const treasuryCollectionPlans = pgTable("treasury_collection_plans", {
  id:                 serial("id").primaryKey(),
  orgId:              integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  collectionNumber:   text("collection_number").notNull(),
  accountId:          integer("account_id").references(() => treasuryAccounts.id, { onDelete: "set null" }),
  payerName:          text("payer_name").notNull(),
  customerName:       text("customer_name"),
  amount:             numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency:           text("currency").notNull().default("INR"),
  collectionDate:     text("collection_date").notNull(),
  method:             text("method").notNull().default("bank_transfer"),
  category:           text("category").notNull().default("customer_payment"),
  reference:          text("reference"),
  status:             text("status").notNull().default("draft"),
  receivedDate:       text("received_date"),
  notes:              text("notes"),
  createdBy:          integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

/**
 * treasury_transfers — fund transfers between treasury accounts.
 */
export const treasuryTransfers = pgTable("treasury_transfers", {
  id:             serial("id").primaryKey(),
  orgId:          integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  transferNumber: text("transfer_number").notNull(),
  fromAccountId:  integer("from_account_id").notNull().references(() => treasuryAccounts.id, { onDelete: "restrict" }),
  toAccountId:    integer("to_account_id").notNull().references(() => treasuryAccounts.id, { onDelete: "restrict" }),
  amount:         numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency:       text("currency").notNull().default("INR"),
  transferDate:   text("transfer_date").notNull(),
  status:         text("status").notNull().default("draft"),
  reference:      text("reference"),
  notes:          text("notes"),
  createdBy:      integer("created_by").references(() => users.id, { onDelete: "set null" }),
  executedAt:     timestamp("executed_at"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type TreasuryAccount           = typeof treasuryAccounts.$inferSelect;
export type TreasuryPosition          = typeof treasuryPositions.$inferSelect;
export type TreasuryLiquidityForecast = typeof treasuryLiquidityForecasts.$inferSelect;
export type TreasuryPaymentPlan       = typeof treasuryPaymentPlans.$inferSelect;
export type TreasuryCollectionPlan    = typeof treasuryCollectionPlans.$inferSelect;
export type TreasuryTransfer          = typeof treasuryTransfers.$inferSelect;
