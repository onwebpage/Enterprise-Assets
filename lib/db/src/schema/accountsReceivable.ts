import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const AR_CUSTOMER_STATUSES = ["active", "inactive", "blocked"] as const;
export type ARCustomerStatus = (typeof AR_CUSTOMER_STATUSES)[number];

export const AR_INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "void"] as const;
export type ARInvoiceStatus = (typeof AR_INVOICE_STATUSES)[number];

export const AR_PAYMENT_METHODS = ["bank_transfer", "check", "cash", "card", "other"] as const;
export type ARPaymentMethod = (typeof AR_PAYMENT_METHODS)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * ar_customers — customer master list for accounts receivable.
 */
export const arCustomers = pgTable("ar_customers", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  email:        text("email"),
  phone:        text("phone"),
  address:      text("address"),
  city:         text("city"),
  country:      text("country"),
  taxId:        text("tax_id"),
  creditLimit:  numeric("credit_limit",  { precision: 15, scale: 2 }).notNull().default("0"),
  currency:     text("currency").notNull().default("USD"),
  status:       text("status").notNull().default("active"),   // ARCustomerStatus
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ar_invoices — invoice headers for accounts receivable.
 * amountPaid is updated atomically when payments are recorded or deleted.
 */
export const arInvoices = pgTable("ar_invoices", {
  id:             serial("id").primaryKey(),
  orgId:          integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  customerId:     integer("customer_id").notNull().references(() => arCustomers.id, { onDelete: "restrict" }),
  invoiceNumber:  text("invoice_number").notNull(),   // e.g. INV-0001
  issueDate:      text("issue_date").notNull(),        // ISO date YYYY-MM-DD
  dueDate:        text("due_date").notNull(),
  status:         text("status").notNull().default("draft"), // ARInvoiceStatus
  subtotal:       numeric("subtotal",    { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:      numeric("tax_amount",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:    numeric("total_amount",{ precision: 15, scale: 2 }).notNull().default("0"),
  amountPaid:     numeric("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:          text("notes"),
  createdBy:      integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ar_invoice_lines — line items for each invoice.
 */
export const arInvoiceLines = pgTable("ar_invoice_lines", {
  id:          serial("id").primaryKey(),
  invoiceId:   integer("invoice_id").notNull().references(() => arInvoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity:    numeric("quantity",   { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice:   numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  amount:      numeric("amount",     { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:    integer("sequence").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

/**
 * ar_payments — payment records that reduce an invoice's outstanding balance.
 * Creating or deleting a payment atomically updates the invoice's amountPaid and status.
 */
export const arPayments = pgTable("ar_payments", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId:    integer("invoice_id").notNull().references(() => arInvoices.id, { onDelete: "restrict" }),
  customerId:   integer("customer_id").notNull().references(() => arCustomers.id, { onDelete: "restrict" }),
  paymentDate:  text("payment_date").notNull(), // ISO date YYYY-MM-DD
  amount:       numeric("amount", { precision: 15, scale: 2 }).notNull(),
  method:       text("method").notNull().default("bank_transfer"), // ARPaymentMethod
  reference:    text("reference"),
  notes:        text("notes"),
  createdBy:    integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

// Customers
export const insertARCustomerSchema = z.object({
  name:        z.string().min(1).max(200),
  email:       z.string().max(200).nullable().optional(),
  phone:       z.string().max(50).nullable().optional(),
  address:     z.string().max(500).nullable().optional(),
  city:        z.string().max(100).nullable().optional(),
  country:     z.string().max(100).nullable().optional(),
  taxId:       z.string().max(100).nullable().optional(),
  creditLimit: amountStr.optional().default("0"),
  currency:    z.string().max(10).optional().default("USD"),
  status:      z.enum(AR_CUSTOMER_STATUSES).optional().default("active"),
  notes:       z.string().max(1000).nullable().optional(),
});

export const updateARCustomerSchema = insertARCustomerSchema.partial();

// Invoice lines
export const insertARInvoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity:    amountStr.optional().default("1"),
  unitPrice:   amountStr.optional().default("0"),
  sequence:    z.number().int().min(0).optional().default(0),
});

// Invoices
export const insertARInvoiceSchema = z.object({
  customerId:    z.number().int().positive(),
  invoiceNumber: z.string().min(1).max(50).optional(), // auto-generated if absent
  issueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:        z.enum(AR_INVOICE_STATUSES).optional().default("draft"),
  taxAmount:     amountStr.optional().default("0"),
  notes:         z.string().max(1000).nullable().optional(),
  lines:         z.array(insertARInvoiceLineSchema).min(1, "At least 1 line required"),
});

export const updateARInvoiceSchema = z.object({
  customerId: z.number().int().positive().optional(),
  issueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:     z.enum(AR_INVOICE_STATUSES).optional(),
  taxAmount:  amountStr.optional(),
  notes:      z.string().max(1000).nullable().optional(),
  lines:      z.array(insertARInvoiceLineSchema).min(1).optional(),
});

// Payments
export const insertARPaymentSchema = z.object({
  invoiceId:   z.number().int().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount:      amountStr,
  method:      z.enum(AR_PAYMENT_METHODS).optional().default("bank_transfer"),
  reference:   z.string().max(100).nullable().optional(),
  notes:       z.string().max(500).nullable().optional(),
});

export const updateARPaymentSchema = insertARPaymentSchema.partial();

// ── TS types ──────────────────────────────────────────────────────────────────

export type ARCustomer     = typeof arCustomers.$inferSelect;
export type ARInvoice      = typeof arInvoices.$inferSelect;
export type ARInvoiceLine  = typeof arInvoiceLines.$inferSelect;
export type ARPayment      = typeof arPayments.$inferSelect;
export type InsertARCustomer = z.infer<typeof insertARCustomerSchema>;
export type InsertARInvoice  = z.infer<typeof insertARInvoiceSchema>;
export type InsertARPayment  = z.infer<typeof insertARPaymentSchema>;
