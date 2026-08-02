import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const TAX_RATE_TYPES = ["cgst", "sgst", "igst", "utgst", "cess", "vat", "service_tax", "other"] as const;
export type TaxRateType = (typeof TAX_RATE_TYPES)[number];

export const GST_RETURN_TYPES = ["gstr1", "gstr3b", "gstr9", "gstr2a", "gstr4", "gstr6"] as const;
export type GSTReturnType = (typeof GST_RETURN_TYPES)[number];

export const GST_RETURN_STATUSES = ["draft", "pending", "filed", "overdue", "revised"] as const;
export type GSTReturnStatus = (typeof GST_RETURN_STATUSES)[number];

export const GST_ENTRY_TYPES = ["b2b", "b2c_large", "b2c_small", "export", "import", "rcm", "nil_exempt", "other"] as const;
export type GSTEntryType = (typeof GST_ENTRY_TYPES)[number];

export const TDS_ENTRY_TYPES = ["tds", "tcs"] as const;
export type TDSEntryType = (typeof TDS_ENTRY_TYPES)[number];

export const TDS_STATUSES = ["deducted", "deposited", "filed", "pending"] as const;
export type TDSStatus = (typeof TDS_STATUSES)[number];

export const TAX_PAYMENT_TYPES = ["gst", "tds", "tcs", "advance_tax", "self_assessment"] as const;
export type TaxPaymentType = (typeof TAX_PAYMENT_TYPES)[number];

export const TAX_PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export type TaxPaymentStatus = (typeof TAX_PAYMENT_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * tax_rates — configurable tax rate master (GST components, TDS sections, etc.)
 */
export const taxRates = pgTable("tax_rates", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),                           // e.g. "CGST 9%"
  type:        text("type").notNull().default("cgst"),           // TaxRateType
  rate:        numeric("rate", { precision: 8, scale: 4 }).notNull().default("0"), // percentage
  hsnSacCode:  text("hsn_sac_code"),                            // HSN/SAC code
  description: text("description"),
  isActive:    boolean("is_active").notNull().default(true),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * gst_returns — GST return filing records (GSTR-1, GSTR-3B, GSTR-9, etc.)
 */
export const gstReturns = pgTable("gst_returns", {
  id:                serial("id").primaryKey(),
  orgId:             integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  returnType:        text("return_type").notNull(),              // GSTReturnType
  period:            text("period").notNull(),                   // YYYY-MM (or YYYY for annual)
  dueDate:           text("due_date").notNull(),                 // ISO date YYYY-MM-DD
  submissionDate:    text("submission_date"),                    // null until filed
  status:            text("status").notNull().default("draft"),  // GSTReturnStatus
  gstin:             text("gstin"),                              // GSTIN of the filer
  totalTaxableValue: numeric("total_taxable_value", { precision: 15, scale: 2 }).notNull().default("0"),
  totalCgst:         numeric("total_cgst",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalSgst:         numeric("total_sgst",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalIgst:         numeric("total_igst",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalCess:         numeric("total_cess",  { precision: 15, scale: 2 }).notNull().default("0"),
  totalTaxLiability: numeric("total_tax_liability", { precision: 15, scale: 2 }).notNull().default("0"),
  totalItc:          numeric("total_itc",   { precision: 15, scale: 2 }).notNull().default("0"),
  netPayable:        numeric("net_payable", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:             text("notes"),
  createdBy:         integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

/**
 * gst_return_entries — individual transaction line items within a GST return.
 */
export const gstReturnEntries = pgTable("gst_return_entries", {
  id:             serial("id").primaryKey(),
  returnId:       integer("return_id").notNull().references(() => gstReturns.id, { onDelete: "cascade" }),
  orgId:          integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  entryType:      text("entry_type").notNull().default("b2b"),   // GSTEntryType
  invoiceNumber:  text("invoice_number"),
  invoiceDate:    text("invoice_date"),                          // ISO YYYY-MM-DD
  partyGstin:     text("party_gstin"),
  partyName:      text("party_name"),
  placeOfSupply:  text("place_of_supply"),                       // state code / name
  taxableValue:   numeric("taxable_value", { precision: 15, scale: 2 }).notNull().default("0"),
  cgstAmount:     numeric("cgst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  sgstAmount:     numeric("sgst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  igstAmount:     numeric("igst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  cessAmount:     numeric("cess_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  totalTax:       numeric("total_tax",     { precision: 15, scale: 2 }).notNull().default("0"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

/**
 * tds_entries — TDS (Tax Deducted at Source) / TCS (Tax Collected at Source) records.
 */
export const tdsEntries = pgTable("tds_entries", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  entryType:        text("entry_type").notNull().default("tds"),  // TDSEntryType
  section:          text("section").notNull(),                    // e.g. 194A, 194C, 194J
  partyName:        text("party_name").notNull(),
  partyPan:         text("party_pan"),
  transactionDate:  text("transaction_date").notNull(),           // YYYY-MM-DD
  grossAmount:      numeric("gross_amount",  { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate:          numeric("tax_rate",      { precision: 8, scale: 4 }).notNull().default("0"),
  taxAmount:        numeric("tax_amount",    { precision: 15, scale: 2 }).notNull().default("0"),
  netAmount:        numeric("net_amount",    { precision: 15, scale: 2 }).notNull().default("0"),
  depositDate:      text("deposit_date"),
  challanNumber:    text("challan_number"),
  assessmentYear:   text("assessment_year"),                      // e.g. 2026-27
  status:           text("status").notNull().default("deducted"), // TDSStatus
  notes:            text("notes"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

/**
 * tax_payments — payments made to the government for GST, TDS, advance tax, etc.
 */
export const taxPayments = pgTable("tax_payments", {
  id:            serial("id").primaryKey(),
  orgId:         integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  paymentType:   text("payment_type").notNull().default("gst"),  // TaxPaymentType
  period:        text("period").notNull(),                        // YYYY-MM or YYYY-MM-DD
  paymentDate:   text("payment_date").notNull(),                  // YYYY-MM-DD
  amount:        numeric("amount",  { precision: 15, scale: 2 }).notNull().default("0"),
  cgst:          numeric("cgst",    { precision: 15, scale: 2 }).notNull().default("0"),
  sgst:          numeric("sgst",    { precision: 15, scale: 2 }).notNull().default("0"),
  igst:          numeric("igst",    { precision: 15, scale: 2 }).notNull().default("0"),
  cess:          numeric("cess",    { precision: 15, scale: 2 }).notNull().default("0"),
  interest:      numeric("interest",{ precision: 15, scale: 2 }).notNull().default("0"),
  penalty:       numeric("penalty", { precision: 15, scale: 2 }).notNull().default("0"),
  challanNumber: text("challan_number"),
  bankReference: text("bank_reference"),
  status:        text("status").notNull().default("pending"),     // TaxPaymentStatus
  notes:         text("notes"),
  createdBy:     integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

// Tax Rates
export const insertTaxRateSchema = z.object({
  name:        z.string().min(1).max(200),
  type:        z.enum(TAX_RATE_TYPES).optional().default("cgst"),
  rate:        amountStr,
  hsnSacCode:  z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive:    z.boolean().optional().default(true),
});
export const updateTaxRateSchema = insertTaxRateSchema.partial();

// GST Returns
export const insertGSTReturnSchema = z.object({
  returnType:        z.enum(GST_RETURN_TYPES),
  period:            z.string().regex(/^\d{4}(-\d{2})?$/, "Period must be YYYY or YYYY-MM"),
  dueDate:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  submissionDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:            z.enum(GST_RETURN_STATUSES).optional().default("draft"),
  gstin:             z.string().max(20).nullable().optional(),
  totalTaxableValue: amountStr.optional().default("0"),
  totalCgst:         amountStr.optional().default("0"),
  totalSgst:         amountStr.optional().default("0"),
  totalIgst:         amountStr.optional().default("0"),
  totalCess:         amountStr.optional().default("0"),
  totalItc:          amountStr.optional().default("0"),
  notes:             z.string().max(1000).nullable().optional(),
});
export const updateGSTReturnSchema = insertGSTReturnSchema.partial();

// GST Return Entries
export const insertGSTReturnEntrySchema = z.object({
  returnId:      z.number().int().positive(),
  entryType:     z.enum(GST_ENTRY_TYPES).optional().default("b2b"),
  invoiceNumber: z.string().max(50).nullable().optional(),
  invoiceDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  partyGstin:    z.string().max(20).nullable().optional(),
  partyName:     z.string().max(300).nullable().optional(),
  placeOfSupply: z.string().max(100).nullable().optional(),
  taxableValue:  amountStr.optional().default("0"),
  cgstAmount:    amountStr.optional().default("0"),
  sgstAmount:    amountStr.optional().default("0"),
  igstAmount:    amountStr.optional().default("0"),
  cessAmount:    amountStr.optional().default("0"),
  notes:         z.string().max(500).nullable().optional(),
});
export const updateGSTReturnEntrySchema = insertGSTReturnEntrySchema.partial();

// TDS Entries
export const insertTDSEntrySchema = z.object({
  entryType:       z.enum(TDS_ENTRY_TYPES).optional().default("tds"),
  section:         z.string().min(1).max(20),
  partyName:       z.string().min(1).max(300),
  partyPan:        z.string().max(20).nullable().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grossAmount:     amountStr,
  taxRate:         amountStr,
  depositDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  challanNumber:   z.string().max(100).nullable().optional(),
  assessmentYear:  z.string().max(10).nullable().optional(),
  status:          z.enum(TDS_STATUSES).optional().default("deducted"),
  notes:           z.string().max(1000).nullable().optional(),
});
export const updateTDSEntrySchema = insertTDSEntrySchema.partial();

// Tax Payments
export const insertTaxPaymentSchema = z.object({
  paymentType:   z.enum(TAX_PAYMENT_TYPES).optional().default("gst"),
  period:        z.string().min(1).max(20),
  paymentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount:        amountStr,
  cgst:          amountStr.optional().default("0"),
  sgst:          amountStr.optional().default("0"),
  igst:          amountStr.optional().default("0"),
  cess:          amountStr.optional().default("0"),
  interest:      amountStr.optional().default("0"),
  penalty:       amountStr.optional().default("0"),
  challanNumber: z.string().max(100).nullable().optional(),
  bankReference: z.string().max(200).nullable().optional(),
  status:        z.enum(TAX_PAYMENT_STATUSES).optional().default("pending"),
  notes:         z.string().max(1000).nullable().optional(),
});
export const updateTaxPaymentSchema = insertTaxPaymentSchema.partial();

// ── TS types ──────────────────────────────────────────────────────────────────

export type TaxRate          = typeof taxRates.$inferSelect;
export type GSTReturn        = typeof gstReturns.$inferSelect;
export type GSTReturnEntry   = typeof gstReturnEntries.$inferSelect;
export type TDSEntry         = typeof tdsEntries.$inferSelect;
export type TaxPayment       = typeof taxPayments.$inferSelect;
export type InsertTaxRate        = z.infer<typeof insertTaxRateSchema>;
export type InsertGSTReturn      = z.infer<typeof insertGSTReturnSchema>;
export type InsertGSTReturnEntry = z.infer<typeof insertGSTReturnEntrySchema>;
export type InsertTDSEntry       = z.infer<typeof insertTDSEntrySchema>;
export type InsertTaxPayment     = z.infer<typeof insertTaxPaymentSchema>;
