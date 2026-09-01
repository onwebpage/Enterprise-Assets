import {
  pgTable, serial, text, integer, timestamp, numeric,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const AP_VENDOR_STATUSES = ["active", "inactive", "blocked"] as const;
export type APVendorStatus = (typeof AP_VENDOR_STATUSES)[number];

export const AP_BILL_STATUSES = ["draft", "received", "partial", "paid", "overdue", "void"] as const;
export type APBillStatus = (typeof AP_BILL_STATUSES)[number];

export const AP_PAYMENT_METHODS = ["bank_transfer", "check", "cash", "card", "other"] as const;
export type APPaymentMethod = (typeof AP_PAYMENT_METHODS)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * ap_vendors — vendor/supplier master list for accounts payable.
 */
export const apVendors = pgTable("ap_vendors", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  email:       text("email"),
  phone:       text("phone"),
  address:     text("address"),
  city:        text("city"),
  country:     text("country"),
  taxId:       text("tax_id"),
  currency:    text("currency").notNull().default("INR"),
  paymentTerms: text("payment_terms"),            // e.g. "Net 30"
  status:      text("status").notNull().default("active"), // APVendorStatus
  notes:       text("notes"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ap_bills — vendor bill headers (what we owe to vendors).
 * amountPaid is updated atomically when payments are recorded or deleted.
 */
export const apBills = pgTable("ap_bills", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  vendorId:     integer("vendor_id").notNull().references(() => apVendors.id, { onDelete: "restrict" }),
  billNumber:   text("bill_number").notNull(),    // e.g. BILL-0001
  issueDate:    text("issue_date").notNull(),      // ISO date YYYY-MM-DD
  dueDate:      text("due_date").notNull(),
  status:       text("status").notNull().default("draft"), // APBillStatus
  subtotal:     numeric("subtotal",    { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:    numeric("tax_amount",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:  numeric("total_amount",{ precision: 15, scale: 2 }).notNull().default("0"),
  amountPaid:   numeric("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:        text("notes"),
  createdBy:    integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ap_bill_lines — line items for each vendor bill.
 */
export const apBillLines = pgTable("ap_bill_lines", {
  id:          serial("id").primaryKey(),
  billId:      integer("bill_id").notNull().references(() => apBills.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity:    numeric("quantity",   { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice:   numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  amount:      numeric("amount",     { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:    integer("sequence").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

/**
 * ap_payments — payment records that reduce a bill's outstanding balance.
 * Creating or deleting a payment atomically updates the bill's amountPaid and status.
 */
export const apPayments = pgTable("ap_payments", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  billId:      integer("bill_id").notNull().references(() => apBills.id, { onDelete: "restrict" }),
  vendorId:    integer("vendor_id").notNull().references(() => apVendors.id, { onDelete: "restrict" }),
  paymentDate: text("payment_date").notNull(), // ISO date YYYY-MM-DD
  amount:      numeric("amount", { precision: 15, scale: 2 }).notNull(),
  method:      text("method").notNull().default("bank_transfer"), // APPaymentMethod
  reference:   text("reference"),
  notes:       text("notes"),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

// Vendors
export const insertAPVendorSchema = z.object({
  name:         z.string().trim().min(1).max(200),
  email:        z.string().trim().email().max(200).nullable().optional(),
  phone:        z.string().trim().max(50).nullable().optional(),
  address:      z.string().trim().max(500).nullable().optional(),
  city:         z.string().trim().max(100).nullable().optional(),
  country:      z.string().trim().max(100).nullable().optional(),
  taxId:        z.string().trim().max(100).nullable().optional(),
  currency:     z.string().trim().min(3).max(10).optional().default("INR"),
  paymentTerms: z.string().trim().max(50).nullable().optional(),
  status:       z.enum(AP_VENDOR_STATUSES).optional().default("active"),
  notes:        z.string().trim().max(1000).nullable().optional(),
});

export const updateAPVendorSchema = insertAPVendorSchema.partial();

// Bill lines
export const insertAPBillLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity:    amountStr.optional().default("1"),
  unitPrice:   amountStr.optional().default("0"),
  sequence:    z.number().int().min(0).optional().default(0),
});

// Bills
export const insertAPBillSchema = z.object({
  vendorId:   z.number().int().positive(),
  billNumber: z.string().min(1).max(50).optional(), // auto-generated if absent
  issueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:     z.enum(AP_BILL_STATUSES).optional().default("draft"),
  taxAmount:  amountStr.optional().default("0"),
  notes:      z.string().max(1000).nullable().optional(),
  lines:      z.array(insertAPBillLineSchema).min(1, "At least 1 line required"),
});

export const updateAPBillSchema = z.object({
  vendorId:  z.number().int().positive().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:    z.enum(AP_BILL_STATUSES).optional(),
  taxAmount: amountStr.optional(),
  notes:     z.string().max(1000).nullable().optional(),
  lines:     z.array(insertAPBillLineSchema).min(1).optional(),
});

// Payments
export const insertAPPaymentSchema = z.object({
  billId:      z.number().int().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount:      amountStr,
  method:      z.enum(AP_PAYMENT_METHODS).optional().default("bank_transfer"),
  reference:   z.string().max(100).nullable().optional(),
  notes:       z.string().max(500).nullable().optional(),
});

export const updateAPPaymentSchema = insertAPPaymentSchema.partial();

// ── TS types ──────────────────────────────────────────────────────────────────

export type APVendor      = typeof apVendors.$inferSelect;
export type APBill        = typeof apBills.$inferSelect;
export type APBillLine    = typeof apBillLines.$inferSelect;
export type APPayment     = typeof apPayments.$inferSelect;
export type InsertAPVendor  = z.infer<typeof insertAPVendorSchema>;
export type InsertAPBill    = z.infer<typeof insertAPBillSchema>;
export type InsertAPPayment = z.infer<typeof insertAPPaymentSchema>;
