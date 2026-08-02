import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const BANK_ACCOUNT_TYPES = ["checking", "savings", "credit", "cash"] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export const BANK_ACCOUNT_STATUSES = ["active", "inactive", "closed"] as const;
export type BankAccountStatus = (typeof BANK_ACCOUNT_STATUSES)[number];

export const BANK_TRANSACTION_TYPES = ["credit", "debit"] as const;
export type BankTransactionType = (typeof BANK_TRANSACTION_TYPES)[number];

export const BANK_TRANSACTION_STATUSES = ["unreconciled", "reconciled", "excluded"] as const;
export type BankTransactionStatus = (typeof BANK_TRANSACTION_STATUSES)[number];

export const RECONCILIATION_STATUSES = ["draft", "completed"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * bank_accounts — company bank accounts used in reconciliation.
 */
export const bankAccounts = pgTable("bank_accounts", {
  id:             serial("id").primaryKey(),
  orgId:          integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  accountNumber:  text("account_number"),
  bankName:       text("bank_name"),
  bankBranch:     text("bank_branch"),
  currency:       text("currency").notNull().default("USD"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  accountType:    text("account_type").notNull().default("checking"), // BankAccountType
  status:         text("status").notNull().default("active"),          // BankAccountStatus
  notes:          text("notes"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

/**
 * bank_transactions — individual debit/credit entries imported from bank statements.
 */
export const bankTransactions = pgTable("bank_transactions", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  bankAccountId:   integer("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  transactionDate: text("transaction_date").notNull(), // YYYY-MM-DD
  description:     text("description").notNull(),
  reference:       text("reference"),
  amount:          numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type:            text("type").notNull().default("credit"),            // BankTransactionType
  category:        text("category"),
  status:          text("status").notNull().default("unreconciled"),    // BankTransactionStatus
  notes:           text("notes"),
  createdBy:       integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/**
 * bank_reconciliations — a reconciliation run comparing book vs. bank statement.
 */
export const bankReconciliations = pgTable("bank_reconciliations", {
  id:                 serial("id").primaryKey(),
  orgId:              integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  bankAccountId:      integer("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  statementDate:      text("statement_date").notNull(),   // YYYY-MM-DD
  openingBalance:     numeric("opening_balance",     { precision: 15, scale: 2 }).notNull().default("0"),
  closingBalance:     numeric("closing_balance",     { precision: 15, scale: 2 }).notNull().default("0"),
  reconciledBalance:  numeric("reconciled_balance",  { precision: 15, scale: 2 }).notNull().default("0"),
  difference:         numeric("difference",          { precision: 15, scale: 2 }).notNull().default("0"),
  status:             text("status").notNull().default("draft"),        // ReconciliationStatus
  notes:              text("notes"),
  createdBy:          integer("created_by").references(() => users.id, { onDelete: "set null" }),
  completedAt:        timestamp("completed_at"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

/**
 * bank_reconciliation_items — transactions matched/cleared in a reconciliation.
 */
export const bankReconciliationItems = pgTable("bank_reconciliation_items", {
  id:               serial("id").primaryKey(),
  reconciliationId: integer("reconciliation_id").notNull().references(() => bankReconciliations.id, { onDelete: "cascade" }),
  transactionId:    integer("transaction_id").notNull().references(() => bankTransactions.id, { onDelete: "cascade" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr    = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Must be a valid number");
const posAmountStr = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

export const insertBankAccountSchema = z.object({
  name:           z.string().min(1).max(200),
  accountNumber:  z.string().max(100).nullable().optional(),
  bankName:       z.string().max(200).nullable().optional(),
  bankBranch:     z.string().max(200).nullable().optional(),
  currency:       z.string().max(10).optional().default("USD"),
  currentBalance: amountStr.optional().default("0"),
  accountType:    z.enum(BANK_ACCOUNT_TYPES).optional().default("checking"),
  status:         z.enum(BANK_ACCOUNT_STATUSES).optional().default("active"),
  notes:          z.string().max(1000).nullable().optional(),
});

export const updateBankAccountSchema = insertBankAccountSchema.partial();

export const insertBankTransactionSchema = z.object({
  bankAccountId:   z.number().int().positive(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description:     z.string().min(1).max(500),
  reference:       z.string().max(100).nullable().optional(),
  amount:          posAmountStr,
  type:            z.enum(BANK_TRANSACTION_TYPES).optional().default("credit"),
  category:        z.string().max(100).nullable().optional(),
  notes:           z.string().max(500).nullable().optional(),
});

export const updateBankTransactionSchema = insertBankTransactionSchema.omit({ bankAccountId: true }).partial();

export const insertBankReconciliationSchema = z.object({
  bankAccountId:          z.number().int().positive(),
  statementDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance:         amountStr.optional().default("0"),
  closingBalance:         amountStr,
  notes:                  z.string().max(1000).nullable().optional(),
  matchedTransactionIds:  z.array(z.number().int().positive()).optional().default([]),
});

export const updateBankReconciliationSchema = z.object({
  statementDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  openingBalance:         amountStr.optional(),
  closingBalance:         amountStr.optional(),
  notes:                  z.string().max(1000).nullable().optional(),
  matchedTransactionIds:  z.array(z.number().int().positive()).optional(),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type BankAccount            = typeof bankAccounts.$inferSelect;
export type BankTransaction        = typeof bankTransactions.$inferSelect;
export type BankReconciliation     = typeof bankReconciliations.$inferSelect;
export type BankReconciliationItem = typeof bankReconciliationItems.$inferSelect;
export type InsertBankAccount      = z.infer<typeof insertBankAccountSchema>;
export type InsertBankTransaction  = z.infer<typeof insertBankTransactionSchema>;
export type InsertBankReconciliation = z.infer<typeof insertBankReconciliationSchema>;
