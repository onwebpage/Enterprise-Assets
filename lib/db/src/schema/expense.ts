import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = ["travel", "meals", "lodging", "transport", "office_supplies", "software", "hardware", "training", "client_entertainment", "fuel", "telecom", "miscellaneous"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CLAIM_STATUSES = ["draft", "submitted", "in_review", "approved", "rejected", "reimbursed"] as const;
export type ExpenseClaimStatus = (typeof EXPENSE_CLAIM_STATUSES)[number];

export const EXPENSE_ITEM_STATUSES = ["pending", "approved", "rejected"] as const;
export type ExpenseItemStatus = (typeof EXPENSE_ITEM_STATUSES)[number];

export const EXPENSE_POLICY_TYPES = ["per_diem", "max_amount", "category_limit", "approval_threshold"] as const;
export type ExpensePolicyType = (typeof EXPENSE_POLICY_TYPES)[number];

export const EXPENSE_POLICY_STATUSES = ["active", "inactive"] as const;
export type ExpensePolicyStatus = (typeof EXPENSE_POLICY_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * expense_categories — expense categories.
 */
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * expense_policies — expense policy controls.
 */
export const expensePolicies = pgTable("expense_policies", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  policyNumber: text("policy_number").notNull(),
  name: text("name").notNull(),
  policyType: text("policy_type").notNull().default("max_amount"),
  category: text("category"),
  maxAmount: numeric("max_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  perDiemRate: numeric("per_diem_rate", { precision: 15, scale: 2 }).notNull().default("0"),
  approvalThreshold: numeric("approval_threshold", { precision: 15, scale: 2 }).notNull().default("0"),
  requiresReceipt: boolean("requires_receipt").notNull().default(true),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * expense_claims — employee expense claims.
 */
export const expenseClaims = pgTable("expense_claims", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  claimNumber: text("claim_number").notNull(),
  employeeId: integer("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employeeName: text("employee_name").notNull(),
  department: text("department"),
  title: text("title").notNull(),
  description: text("description"),
  claimDate: text("claim_date").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  submittedDate: text("submitted_date"),
  approvedDate: text("approved_date"),
  approvedBy: text("approved_by"),
  approvalNotes: text("approval_notes"),
  reimbursedDate: text("reimbursed_date"),
  reimbursementMethod: text("reimbursement_method"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * expense_items — individual expense line items within a claim.
 */
export const expenseItems = pgTable("expense_items", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  claimId: integer("claim_id").notNull().references(() => expenseClaims.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  categoryName: text("category_name").notNull(),
  expenseDate: text("expense_date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("INR"),
  paymentMethod: text("payment_method"),
  vendor: text("vendor"),
  receiptNumber: text("receipt_number"),
  receiptUrl: text("receipt_url"),
  hasReceipt: boolean("has_receipt").notNull().default(false),
  status: text("status").notNull().default("pending"),
  policyCheck: text("policy_check"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExpenseCategoryRecord = typeof expenseCategories.$inferSelect;
export type ExpensePolicyRecord = typeof expensePolicies.$inferSelect;
export type ExpenseClaimRecord = typeof expenseClaims.$inferSelect;
export type ExpenseItemRecord = typeof expenseItems.$inferSelect;
