import { pgTable, serial, text, integer, timestamp, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { chartOfAccounts } from "./chartOfAccounts";
import { journalEntries } from "./generalLedger";
import { users } from "./users";

export const INTERCOMPANY_RELATIONSHIP_STATUSES = ["active", "inactive"] as const;
export type IntercompanyRelationshipStatus = (typeof INTERCOMPANY_RELATIONSHIP_STATUSES)[number];

export const INTERCOMPANY_TRANSACTION_STATUSES = ["draft", "posted", "settled", "eliminated", "void"] as const;
export type IntercompanyTransactionStatus = (typeof INTERCOMPANY_TRANSACTION_STATUSES)[number];

export const intercompanyRelationships = pgTable("intercompany_relationships", {
  id: serial("id").primaryKey(),
  fromOrgId: integer("from_org_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  toOrgId: integer("to_org_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  fromDueFromAccountId: integer("from_due_from_account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  toDueToAccountId: integer("to_due_to_account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  directionUnique: uniqueIndex("intercompany_relationships_direction_uidx").on(table.fromOrgId, table.toOrgId),
}));

export const intercompanyTransactions = pgTable("intercompany_transactions", {
  id: serial("id").primaryKey(),
  relationshipId: integer("relationship_id").notNull().references(() => intercompanyRelationships.id, { onDelete: "restrict" }),
  transactionNumber: text("transaction_number").notNull(),
  fromOrgId: integer("from_org_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  toOrgId: integer("to_org_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  transactionDate: text("transaction_date").notNull(),
  dueDate: text("due_date"),
  description: text("description").notNull(),
  reference: text("reference"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  fromSettlementAccountId: integer("from_settlement_account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  toSettlementAccountId: integer("to_settlement_account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("draft"),
  fromJournalEntryId: integer("from_journal_entry_id").references(() => journalEntries.id, { onDelete: "restrict" }),
  toJournalEntryId: integer("to_journal_entry_id").references(() => journalEntries.id, { onDelete: "restrict" }),
  postedAt: timestamp("posted_at"),
  postedBy: integer("posted_by").references(() => users.id, { onDelete: "set null" }),
  settledAt: timestamp("settled_at"),
  eliminatedAt: timestamp("eliminated_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const intercompanyEliminations = pgTable("intercompany_eliminations", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => intercompanyTransactions.id, { onDelete: "restrict" }),
  fromJournalEntryId: integer("from_journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "restrict" }),
  toJournalEntryId: integer("to_journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "restrict" }),
  notes: text("notes"),
  eliminatedBy: integer("eliminated_by").references(() => users.id, { onDelete: "set null" }),
  eliminatedAt: timestamp("eliminated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type IntercompanyRelationship = typeof intercompanyRelationships.$inferSelect;
export type IntercompanyTransaction = typeof intercompanyTransactions.$inferSelect;
export type IntercompanyElimination = typeof intercompanyEliminations.$inferSelect;