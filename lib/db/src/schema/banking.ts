import {
  pgTable, serial, text, integer, timestamp, numeric, boolean, unique,
} from "drizzle-orm/pg-core";
import { z } from "zod";
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
export const BANK_TRANSACTION_SOURCES = ["manual", "statement_import"] as const;
export type BankTransactionSource = (typeof BANK_TRANSACTION_SOURCES)[number];

export const RECONCILIATION_STATUSES = ["draft", "completed"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];
export const CHEQUE_BOOK_STATUSES = ["active", "closed"] as const;
export type ChequeBookStatus = (typeof CHEQUE_BOOK_STATUSES)[number];
export const CHEQUE_DIRECTIONS = ["issued", "received"] as const;
export type ChequeDirection = (typeof CHEQUE_DIRECTIONS)[number];
export const CHEQUE_STATUSES = ["pending", "cleared", "bounced", "cancelled"] as const;
export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

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
  currency:       text("currency").notNull().default("INR"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  accountType:    text("account_type").notNull().default("checking"), // BankAccountType
  status:         text("status").notNull().default("active"),          // BankAccountStatus
  notes:          text("notes"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const bankStatementImports = pgTable("bank_statement_imports", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  statementDate: text("statement_date"),
  transactionCount: integer("transaction_count").notNull().default(0),
  importedBy: integer("imported_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  source:          text("source").notNull().default("manual"),
  importId:        integer("import_id").references(() => bankStatementImports.id, { onDelete: "set null" }),
  matchedJournalEntryId: integer("matched_journal_entry_id"),
  matchConfidence: numeric("match_confidence", { precision: 5, scale: 2 }),
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

export const chequeBooks = pgTable("cheque_books", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prefix: text("prefix"),
  startNumber: integer("start_number").notNull(),
  endNumber: integer("end_number").notNull(),
  nextNumber: integer("next_number").notNull(),
  issueDate: text("issue_date").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cheques = pgTable("cheques", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  chequeBookId: integer("cheque_book_id").references(() => chequeBooks.id, { onDelete: "set null" }),
  chequeNumber: text("cheque_number").notNull(),
  direction: text("direction").notNull(),
  issueDate: text("issue_date").notNull(),
  chequeDate: text("cheque_date").notNull(),
  partyName: text("party_name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  clearedDate: text("cleared_date"),
  bouncedDate: text("bounced_date"),
  bounceReason: text("bounce_reason"),
  reference: text("reference"),
  notes: text("notes"),
  journalEntryId: integer("journal_entry_id"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ chequeNumberUnique: unique().on(table.orgId, table.bankAccountId, table.chequeNumber, table.direction) }));

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr    = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Must be a valid number");
const posAmountStr = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

export const insertBankAccountSchema = z.object({
  name:           z.string().min(1).max(200),
  accountNumber:  z.string().max(100).nullable().optional(),
  bankName:       z.string().max(200).nullable().optional(),
  bankBranch:     z.string().max(200).nullable().optional(),
  currency:       z.string().max(10).optional().default("INR"),
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

const baseChequeBookSchema = z.object({
  bankAccountId: z.number().int().positive(), name: z.string().trim().min(1).max(200), prefix: z.string().trim().max(30).nullable().optional(),
  startNumber: z.number().int().positive(), endNumber: z.number().int().positive(), issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().max(1000).nullable().optional(),
});
export const insertChequeBookSchema = baseChequeBookSchema.refine((value) => value.endNumber >= value.startNumber, { message: "End number must be greater than or equal to start number" });
export const updateChequeBookSchema = baseChequeBookSchema.omit({ bankAccountId: true, startNumber: true, endNumber: true }).partial();
export const insertChequeSchema = z.object({
  bankAccountId: z.number().int().positive(), chequeBookId: z.number().int().positive().nullable().optional(), chequeNumber: z.string().trim().min(1).max(50).optional(), direction: z.enum(CHEQUE_DIRECTIONS), issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), chequeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), partyName: z.string().trim().min(1).max(200), amount: posAmountStr, reference: z.string().max(100).nullable().optional(), notes: z.string().max(1000).nullable().optional(), journalEntryId: z.number().int().positive().nullable().optional(),
});
export const updateChequeSchema = z.object({ status: z.enum(CHEQUE_STATUSES).optional(), clearedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), bouncedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), bounceReason: z.string().max(500).nullable().optional(), reference: z.string().max(100).nullable().optional(), notes: z.string().max(1000).nullable().optional(), journalEntryId: z.number().int().positive().nullable().optional() });

// ── TS types ──────────────────────────────────────────────────────────────────

export type BankAccount            = typeof bankAccounts.$inferSelect;
export type BankStatementImport    = typeof bankStatementImports.$inferSelect;
export type BankTransaction        = typeof bankTransactions.$inferSelect;
export type BankReconciliation     = typeof bankReconciliations.$inferSelect;
export type BankReconciliationItem = typeof bankReconciliationItems.$inferSelect;
export type InsertBankAccount      = z.infer<typeof insertBankAccountSchema>;
export type InsertBankTransaction  = z.infer<typeof insertBankTransactionSchema>;
export type InsertBankReconciliation = z.infer<typeof insertBankReconciliationSchema>;
export type ChequeBook = typeof chequeBooks.$inferSelect;
export type Cheque = typeof cheques.$inferSelect;
