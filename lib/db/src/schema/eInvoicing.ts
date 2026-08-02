import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const EINV_INVOICE_STATUSES = [
  "draft", "submitted", "acknowledged", "rejected", "cancelled",
] as const;
export type EInvInvoiceStatus = (typeof EINV_INVOICE_STATUSES)[number];

export const EINV_INVOICE_TYPES = ["B2B", "B2C", "EXPORT", "B2BUR", "SEZWP", "SEZWOP"] as const;
export type EInvInvoiceType = (typeof EINV_INVOICE_TYPES)[number];

export const EINV_SUPPLY_TYPES = ["regular", "deemed_export", "sez_supplies", "reverse_charge"] as const;
export type EInvSupplyType = (typeof EINV_SUPPLY_TYPES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * einv_buyers — buyer/recipient master for e-invoicing.
 */
export const einvBuyers = pgTable("einv_buyers", {
  id:        serial("id").primaryKey(),
  orgId:     integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  gstin:     text("gstin"),
  pan:       text("pan"),
  email:     text("email"),
  phone:     text("phone"),
  address:   text("address"),
  city:      text("city"),
  state:     text("state"),
  pincode:   text("pincode"),
  country:   text("country").notNull().default("India"),
  isActive:  boolean("is_active").notNull().default(true),
  notes:     text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * einv_invoices — e-invoice headers with IRN tracking.
 */
export const einvInvoices = pgTable("einv_invoices", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  invoiceNumber:   text("invoice_number").notNull(),
  invoiceType:     text("invoice_type").notNull().default("B2B"),   // EInvInvoiceType
  supplyType:      text("supply_type").notNull().default("regular"), // EInvSupplyType
  buyerId:         integer("buyer_id").references(() => einvBuyers.id, { onDelete: "restrict" }),
  issueDate:       text("issue_date").notNull(),         // YYYY-MM-DD
  placeOfSupply:   text("place_of_supply"),
  // IRN / acknowledgement
  irn:             text("irn"),                          // Invoice Reference Number (64-char hash)
  ackNumber:       text("ack_number"),
  ackDate:         text("ack_date"),
  qrCode:          text("qr_code"),                     // Base64 QR or URL
  // Amounts
  subtotal:        numeric("subtotal",       { precision: 15, scale: 2 }).notNull().default("0"),
  totalDiscount:   numeric("total_discount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalTaxable:    numeric("total_taxable",  { precision: 15, scale: 2 }).notNull().default("0"),
  cgstAmount:      numeric("cgst_amount",    { precision: 15, scale: 2 }).notNull().default("0"),
  sgstAmount:      numeric("sgst_amount",    { precision: 15, scale: 2 }).notNull().default("0"),
  igstAmount:      numeric("igst_amount",    { precision: 15, scale: 2 }).notNull().default("0"),
  cessAmount:      numeric("cess_amount",    { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:     numeric("total_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  // Status
  status:          text("status").notNull().default("draft"),       // EInvInvoiceStatus
  cancelReason:    text("cancel_reason"),
  cancelledAt:     timestamp("cancelled_at"),
  rejectionReason: text("rejection_reason"),
  notes:           text("notes"),
  createdBy:       integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/**
 * einv_invoice_lines — line items for each e-invoice.
 */
export const einvInvoiceLines = pgTable("einv_invoice_lines", {
  id:           serial("id").primaryKey(),
  invoiceId:    integer("invoice_id").notNull().references(() => einvInvoices.id, { onDelete: "cascade" }),
  description:  text("description").notNull(),
  hsnCode:      text("hsn_code"),
  quantity:     numeric("quantity",      { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice:    numeric("unit_price",    { precision: 15, scale: 2 }).notNull().default("0"),
  discount:     numeric("discount",      { precision: 15, scale: 2 }).notNull().default("0"),
  taxableAmount:numeric("taxable_amount",{ precision: 15, scale: 2 }).notNull().default("0"),
  cgstRate:     numeric("cgst_rate",     { precision: 5,  scale: 2 }).notNull().default("0"),
  cgstAmount:   numeric("cgst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  sgstRate:     numeric("sgst_rate",     { precision: 5,  scale: 2 }).notNull().default("0"),
  sgstAmount:   numeric("sgst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  igstRate:     numeric("igst_rate",     { precision: 5,  scale: 2 }).notNull().default("0"),
  igstAmount:   numeric("igst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  cessRate:     numeric("cess_rate",     { precision: 5,  scale: 2 }).notNull().default("0"),
  cessAmount:   numeric("cess_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:  numeric("total_amount",  { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:     integer("sequence").notNull().default(0),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a positive number");

// Buyers
export const insertEInvBuyerSchema = z.object({
  name:    z.string().min(1).max(200),
  gstin:   z.string().max(15).nullable().optional(),
  pan:     z.string().max(10).nullable().optional(),
  email:   z.string().email().nullable().optional(),
  phone:   z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city:    z.string().max(100).nullable().optional(),
  state:   z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  country: z.string().max(100).optional().default("India"),
  notes:   z.string().max(500).nullable().optional(),
});

export const updateEInvBuyerSchema = insertEInvBuyerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Invoice lines
export const insertEInvLineSchema = z.object({
  description:  z.string().min(1).max(500),
  hsnCode:      z.string().max(8).nullable().optional(),
  quantity:     amountStr.optional().default("1"),
  unitPrice:    amountStr.optional().default("0"),
  discount:     amountStr.optional().default("0"),
  cgstRate:     amountStr.optional().default("0"),
  sgstRate:     amountStr.optional().default("0"),
  igstRate:     amountStr.optional().default("0"),
  cessRate:     amountStr.optional().default("0"),
  sequence:     z.number().int().min(0).optional().default(0),
});

// Invoices
export const insertEInvInvoiceSchema = z.object({
  invoiceNumber:  z.string().min(1).max(50).optional(),
  invoiceType:    z.enum(EINV_INVOICE_TYPES).optional().default("B2B"),
  supplyType:     z.enum(EINV_SUPPLY_TYPES).optional().default("regular"),
  buyerId:        z.number().int().positive().nullable().optional(),
  issueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  placeOfSupply:  z.string().max(100).nullable().optional(),
  notes:          z.string().max(1000).nullable().optional(),
  lines:          z.array(insertEInvLineSchema).min(1, "At least 1 line required"),
});

export const updateEInvInvoiceSchema = z.object({
  invoiceType:    z.enum(EINV_INVOICE_TYPES).optional(),
  supplyType:     z.enum(EINV_SUPPLY_TYPES).optional(),
  buyerId:        z.number().int().positive().nullable().optional(),
  issueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  placeOfSupply:  z.string().max(100).nullable().optional(),
  notes:          z.string().max(1000).nullable().optional(),
  lines:          z.array(insertEInvLineSchema).min(1).optional(),
});

export const submitEInvInvoiceSchema = z.object({
  irn:       z.string().min(1).max(100).optional(),
  ackNumber: z.string().max(50).nullable().optional(),
  ackDate:   z.string().nullable().optional(),
  qrCode:    z.string().nullable().optional(),
});

export const cancelEInvInvoiceSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type EInvBuyer        = typeof einvBuyers.$inferSelect;
export type EInvInvoice      = typeof einvInvoices.$inferSelect;
export type EInvInvoiceLine  = typeof einvInvoiceLines.$inferSelect;
export type InsertEInvBuyer   = z.infer<typeof insertEInvBuyerSchema>;
export type InsertEInvInvoice = z.infer<typeof insertEInvInvoiceSchema>;
