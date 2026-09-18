import {
  pgTable, serial, text, integer, timestamp, numeric,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { chartOfAccounts } from "./chartOfAccounts";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const JE_STATUSES = ["draft", "posted", "void"] as const;
export type JEStatus = (typeof JE_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * journal_entries — header record for each double-entry journal entry.
 * A posted entry is immutable; only draft entries may be edited or deleted.
 * Posting validates that Σdebit == Σcredit and updates account balances.
 */
export const journalEntries = pgTable("journal_entries", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  branchId:     integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  entryNumber:  text("entry_number").notNull(),          // e.g. JE-0001
  date:         text("date").notNull(),                  // ISO date YYYY-MM-DD
  reference:    text("reference"),                       // optional external ref (INV-xxx)
  memo:         text("memo").notNull(),
  status:       text("status").notNull().default("draft"), // JEStatus
  totalDebit:   numeric("total_debit",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalCredit:  numeric("total_credit", { precision: 15, scale: 2 }).notNull().default("0"),
  createdBy:    integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/**
 * journal_entry_lines — individual debit/credit lines for a journal entry.
 * Each line belongs to one account; a line has either a debit or a credit (or both = 0).
 */
export const journalEntryLines = pgTable("journal_entry_lines", {
  id:               serial("id").primaryKey(),
  journalEntryId:   integer("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId:        integer("account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  description:      text("description"),
  debit:            numeric("debit",  { precision: 15, scale: 2 }).notNull().default("0"),
  credit:           numeric("credit", { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:         integer("sequence").notNull().default(0),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative number with up to 2 decimal places");

export const insertJournalEntryLineSchema = z.object({
  accountId:   z.number().int().positive(),
  description: z.string().max(500).optional().nullable(),
  debit:       amountString.optional().default("0"),
  credit:      amountString.optional().default("0"),
  sequence:    z.number().int().min(0).optional().default(0),
});

export const insertJournalEntrySchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  reference: z.string().max(100).optional().nullable(),
  memo:      z.string().min(1).max(500),
  lines:     z.array(insertJournalEntryLineSchema).min(2, "At least 2 lines required"),
});

export const updateJournalEntrySchema = insertJournalEntrySchema;

// ── TS types ──────────────────────────────────────────────────────────────────

export type JournalEntry     = typeof journalEntries.$inferSelect;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
