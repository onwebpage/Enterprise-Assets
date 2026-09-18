import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PURCHASE_VENDOR_STATUSES = ["active", "inactive", "blocked"] as const;
export type PurchaseVendorStatus = (typeof PURCHASE_VENDOR_STATUSES)[number];

export const PURCHASE_VENDOR_CATEGORIES = ["goods", "services", "both"] as const;
export type PurchaseVendorCategory = (typeof PURCHASE_VENDOR_CATEGORIES)[number];

export const PURCHASE_ORDER_STATUSES = ["draft", "sent", "confirmed", "partial", "received", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const GRN_STATUSES = ["draft", "received", "accepted", "rejected"] as const;
export type GRNStatus = (typeof GRN_STATUSES)[number];

export const RFQ_STATUSES = ["draft", "sent", "responded", "converted", "cancelled"] as const;
export type RFQStatus = (typeof RFQ_STATUSES)[number];

export const PURCHASE_REQUISITION_STATUSES = ["draft", "submitted", "approved", "rejected", "converted", "cancelled"] as const;
export type PurchaseRequisitionStatus = (typeof PURCHASE_REQUISITION_STATUSES)[number];

export const PURCHASE_QUOTE_STATUSES = ["draft", "submitted", "awarded", "rejected", "expired"] as const;
export type PurchaseQuoteStatus = (typeof PURCHASE_QUOTE_STATUSES)[number];

export const PURCHASE_INVOICE_STATUSES = ["draft", "received", "matched", "exception", "approved", "partially_paid", "paid", "blocked"] as const;
export type PurchaseInvoiceStatus = (typeof PURCHASE_INVOICE_STATUSES)[number];

export const PURCHASE_PAYMENT_STATUSES = ["draft", "initiated", "processing", "paid", "failed", "cancelled"] as const;
export type PurchasePaymentStatus = (typeof PURCHASE_PAYMENT_STATUSES)[number];

export const PURCHASE_PAYMENT_METHODS = ["razorpay", "bank_transfer", "manual"] as const;
export type PurchasePaymentMethod = (typeof PURCHASE_PAYMENT_METHODS)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * purchase_vendors — supplier/vendor master for procurement.
 */
export const purchaseVendors = pgTable("purchase_vendors", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code:         text("code"),                                   // e.g. VND-0001
  name:         text("name").notNull(),
  category:     text("category").notNull().default("goods"),    // PurchaseVendorCategory
  gstin:        text("gstin"),                                  // GST registration number
  pan:          text("pan"),
  email:        text("email"),
  phone:        text("phone"),
  address:      text("address"),
  city:         text("city"),
  state:        text("state"),
  country:      text("country").notNull().default("India"),
  currency:     text("currency").notNull().default("INR"),
  paymentTerms: text("payment_terms"),                          // e.g. "Net 30"
  creditLimit:  numeric("credit_limit",  { precision: 15, scale: 2 }),
  status:       text("status").notNull().default("active"),     // PurchaseVendorStatus
  isActive:     boolean("is_active").notNull().default(true),
  notes:        text("notes"),
  createdBy:    integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/**
 * purchase_orders — PO headers.
 * totalAmount = subtotal + taxAmount; amountReceived tracks GRN receipts.
 */
export const purchaseOrders = pgTable("purchase_orders", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  vendorId:         integer("vendor_id").notNull().references(() => purchaseVendors.id, { onDelete: "restrict" }),
  poNumber:         text("po_number").notNull(),                 // e.g. PO-0001
  orderDate:        text("order_date").notNull(),                // YYYY-MM-DD
  expectedDelivery: text("expected_delivery"),                   // YYYY-MM-DD
  deliveryAddress:  text("delivery_address"),
  currency:         text("currency").notNull().default("INR"),
  subtotal:         numeric("subtotal",     { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:        numeric("tax_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:      numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status:           text("status").notNull().default("draft"),   // PurchaseOrderStatus
  notes:            text("notes"),
  termsConditions:  text("terms_conditions"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

/**
 * purchase_order_lines — line items for each PO.
 */
export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id:          serial("id").primaryKey(),
  poId:        integer("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  itemCode:    text("item_code"),
  description: text("description").notNull(),
  unit:        text("unit").notNull().default("pcs"),
  quantity:    numeric("quantity",   { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice:   numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate:     numeric("tax_rate",   { precision: 8,  scale: 4 }).notNull().default("0"),
  taxAmount:   numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  amount:      numeric("amount",     { precision: 15, scale: 2 }).notNull().default("0"),  // qty * unitPrice
  totalAmount: numeric("total_amount",{ precision: 15, scale: 2 }).notNull().default("0"), // amount + taxAmount
  receivedQty: numeric("received_qty",{ precision: 12, scale: 4 }).notNull().default("0"),
  sequence:    integer("sequence").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

/**
 * goods_receipt_notes — GRN headers confirming physical receipt of goods.
 */
export const goodsReceiptNotes = pgTable("goods_receipt_notes", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  poId:        integer("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "restrict" }),
  vendorId:    integer("vendor_id").notNull().references(() => purchaseVendors.id, { onDelete: "restrict" }),
  grnNumber:   text("grn_number").notNull(),                    // e.g. GRN-0001
  receiptDate: text("receipt_date").notNull(),                  // YYYY-MM-DD
  status:      text("status").notNull().default("draft"),       // GRNStatus
  notes:       text("notes"),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/**
 * goods_receipt_lines — per-line receipt quantities.
 */
export const goodsReceiptLines = pgTable("goods_receipt_lines", {
  id:           serial("id").primaryKey(),
  grnId:        integer("grn_id").notNull().references(() => goodsReceiptNotes.id, { onDelete: "cascade" }),
  poLineId:     integer("po_line_id").notNull().references(() => purchaseOrderLines.id, { onDelete: "restrict" }),
  description:  text("description").notNull(),
  orderedQty:   numeric("ordered_qty",  { precision: 12, scale: 4 }).notNull().default("0"),
  receivedQty:  numeric("received_qty", { precision: 12, scale: 4 }).notNull().default("0"),
  acceptedQty:  numeric("accepted_qty", { precision: 12, scale: 4 }).notNull().default("0"),
  rejectedQty:  numeric("rejected_qty", { precision: 12, scale: 4 }).notNull().default("0"),
  unit:         text("unit").notNull().default("pcs"),
  notes:        text("notes"),
  sequence:     integer("sequence").notNull().default(0),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

/**
 * purchase_rfqs — Request for Quotation records.
 */
export const purchaseRFQs = pgTable("purchase_rfqs", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  vendorId:        integer("vendor_id").references(() => purchaseVendors.id, { onDelete: "set null" }),
  rfqNumber:       text("rfq_number").notNull(),               // e.g. RFQ-0001
  rfqDate:         text("rfq_date").notNull(),                 // YYYY-MM-DD
  dueDate:         text("due_date"),                           // response deadline
  itemsDescription: text("items_description"),                 // free-text summary of items
  estimatedValue:  numeric("estimated_value", { precision: 15, scale: 2 }),
  status:          text("status").notNull().default("draft"),  // RFQStatus
  convertedPoId:   integer("converted_po_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  notes:           text("notes"),
  createdBy:       integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/**
 * purchase_requisitions — internal demand intake before sourcing.
 */
export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  requisitionNumber: text("requisition_number").notNull(),
  requestedBy:     integer("requested_by").references(() => users.id, { onDelete: "set null" }),
  department:      text("department").notNull(),
  costCenter:      text("cost_center"),
  neededBy:        text("needed_by").notNull(),
  justification:   text("justification").notNull(),
  estimatedAmount: numeric("estimated_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status:          text("status").notNull().default("draft"),
  approvedBy:      integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt:      timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  convertedPoId:   integer("converted_po_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const purchaseRequisitionLines = pgTable("purchase_requisition_lines", {
  id:                serial("id").primaryKey(),
  requisitionId:     integer("requisition_id").notNull().references(() => purchaseRequisitions.id, { onDelete: "cascade" }),
  itemCode:          text("item_code"),
  description:       text("description").notNull(),
  unit:              text("unit").notNull().default("pcs"),
  quantity:          numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
  estimatedUnitPrice: numeric("estimated_unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate:           numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("0"),
  totalEstimate:     numeric("total_estimate", { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:          integer("sequence").notNull().default(0),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

/**
 * RFQ supplier responses. Existing purchase_rfqs remains backward compatible.
 */
export const purchaseRfqInvites = pgTable("purchase_rfq_invites", {
  id:          serial("id").primaryKey(),
  rfqId:       integer("rfq_id").notNull().references(() => purchaseRFQs.id, { onDelete: "cascade" }),
  vendorId:    integer("vendor_id").notNull().references(() => purchaseVendors.id, { onDelete: "restrict" }),
  status:      text("status").notNull().default("invited"),
  invitedAt:   timestamp("invited_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
  notes:       text("notes"),
});

export const purchaseQuotes = pgTable("purchase_quotes", {
  id:            serial("id").primaryKey(),
  orgId:         integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  rfqId:         integer("rfq_id").notNull().references(() => purchaseRFQs.id, { onDelete: "cascade" }),
  vendorId:      integer("vendor_id").notNull().references(() => purchaseVendors.id, { onDelete: "restrict" }),
  quoteNumber:   text("quote_number").notNull(),
  quoteDate:     text("quote_date").notNull(),
  validUntil:    text("valid_until"),
  subtotal:      numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:     numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:   numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  deliveryDays:  integer("delivery_days"),
  paymentTerms:  text("payment_terms"),
  status:        text("status").notNull().default("submitted"),
  awardReason:   text("award_reason"),
  createdBy:     integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const purchaseQuoteLines = pgTable("purchase_quote_lines", {
  id:          serial("id").primaryKey(),
  quoteId:     integer("quote_id").notNull().references(() => purchaseQuotes.id, { onDelete: "cascade" }),
  itemCode:    text("item_code"),
  description: text("description").notNull(),
  unit:        text("unit").notNull().default("pcs"),
  quantity:    numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice:   numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate:     numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("0"),
  taxAmount:   numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:    integer("sequence").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

/**
 * purchase_invoices — supplier invoices matched against PO and receipt data.
 */
export const purchaseInvoices = pgTable("purchase_invoices", {
  id:             serial("id").primaryKey(),
  orgId:          integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  invoiceNumber:  text("invoice_number").notNull(),
  vendorId:       integer("vendor_id").notNull().references(() => purchaseVendors.id, { onDelete: "restrict" }),
  poId:           integer("po_id").references(() => purchaseOrders.id, { onDelete: "restrict" }),
  grnId:          integer("grn_id").references(() => goodsReceiptNotes.id, { onDelete: "restrict" }),
  invoiceDate:    text("invoice_date").notNull(),
  dueDate:        text("due_date"),
  currency:       text("currency").notNull().default("INR"),
  subtotal:       numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount:      numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount:    numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status:         text("status").notNull().default("draft"),
  matchStatus:    text("match_status").notNull().default("pending"),
  matchVariance:  numeric("match_variance", { precision: 15, scale: 2 }).notNull().default("0"),
  notes:          text("notes"),
  createdBy:      integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const purchaseInvoiceLines = pgTable("purchase_invoice_lines", {
  id:          serial("id").primaryKey(),
  invoiceId:   integer("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  poLineId:    integer("po_line_id").references(() => purchaseOrderLines.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity:    numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice:   numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate:     numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("0"),
  taxAmount:   numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  amount:      numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  sequence:    integer("sequence").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const purchasePayments = pgTable("purchase_payments", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  paymentNumber:   text("payment_number").notNull(),
  invoiceId:       integer("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: "restrict" }),
  vendorId:        integer("vendor_id").notNull().references(() => purchaseVendors.id, { onDelete: "restrict" }),
  amount:          numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paymentDate:     text("payment_date").notNull(),
  method:          text("method").notNull().default("manual"),
  status:          text("status").notNull().default("draft"),
  providerOrderId: text("provider_order_id"),
  providerPaymentId: text("provider_payment_id"),
  failureReason:   text("failure_reason"),
  notes:           text("notes"),
  createdBy:       integer("created_by").references(() => users.id, { onDelete: "set null" }),
  paidAt:         timestamp("paid_at"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

// Purchase Vendors
export const insertPurchaseVendorSchema = z.object({
  code:         z.string().max(50).nullable().optional(),
  name:         z.string().min(1).max(300),
  category:     z.enum(PURCHASE_VENDOR_CATEGORIES).optional().default("goods"),
  gstin:        z.string().max(20).nullable().optional(),
  pan:          z.string().max(20).nullable().optional(),
  email:        z.string().max(200).nullable().optional(),
  phone:        z.string().max(50).nullable().optional(),
  address:      z.string().max(500).nullable().optional(),
  city:         z.string().max(100).nullable().optional(),
  state:        z.string().max(100).nullable().optional(),
  country:      z.string().max(100).optional().default("India"),
  currency:     z.string().max(10).optional().default("INR"),
  paymentTerms: z.string().max(50).nullable().optional(),
  creditLimit:  amountStr.nullable().optional(),
  status:       z.enum(PURCHASE_VENDOR_STATUSES).optional().default("active"),
  notes:        z.string().max(1000).nullable().optional(),
});
export const updatePurchaseVendorSchema = insertPurchaseVendorSchema.partial();

// PO Lines
export const insertPurchaseOrderLineSchema = z.object({
  itemCode:    z.string().max(100).nullable().optional(),
  description: z.string().min(1).max(500),
  unit:        z.string().max(50).optional().default("pcs"),
  quantity:    amountStr.optional().default("1"),
  unitPrice:   amountStr.optional().default("0"),
  taxRate:     amountStr.optional().default("0"),
  sequence:    z.number().int().min(0).optional().default(0),
});

// Purchase Orders
export const insertPurchaseOrderSchema = z.object({
  vendorId:         z.number().int().positive(),
  poNumber:         z.string().min(1).max(50).optional(),
  orderDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deliveryAddress:  z.string().max(500).nullable().optional(),
  currency:         z.string().max(10).optional().default("INR"),
  status:           z.enum(PURCHASE_ORDER_STATUSES).optional().default("draft"),
  taxAmount:        amountStr.optional().default("0"),
  notes:            z.string().max(1000).nullable().optional(),
  termsConditions:  z.string().max(2000).nullable().optional(),
  lines:            z.array(insertPurchaseOrderLineSchema).min(1, "At least 1 line required"),
});
export const updatePurchaseOrderSchema = z.object({
  vendorId:         z.number().int().positive().optional(),
  orderDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deliveryAddress:  z.string().max(500).nullable().optional(),
  currency:         z.string().max(10).optional(),
  status:           z.enum(PURCHASE_ORDER_STATUSES).optional(),
  taxAmount:        amountStr.optional(),
  notes:            z.string().max(1000).nullable().optional(),
  termsConditions:  z.string().max(2000).nullable().optional(),
  lines:            z.array(insertPurchaseOrderLineSchema).min(1).optional(),
});

// GRN Lines
export const insertGRNLineSchema = z.object({
  poLineId:    z.number().int().positive(),
  description: z.string().min(1).max(500),
  orderedQty:  amountStr.optional().default("0"),
  receivedQty: amountStr.optional().default("0"),
  acceptedQty: amountStr.optional().default("0"),
  rejectedQty: amountStr.optional().default("0"),
  unit:        z.string().max(50).optional().default("pcs"),
  notes:       z.string().max(500).nullable().optional(),
  sequence:    z.number().int().min(0).optional().default(0),
});

// Goods Receipt Notes
export const insertGRNSchema = z.object({
  poId:        z.number().int().positive(),
  grnNumber:   z.string().min(1).max(50).optional(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:      z.enum(GRN_STATUSES).optional().default("draft"),
  notes:       z.string().max(1000).nullable().optional(),
  lines:       z.array(insertGRNLineSchema).min(1, "At least 1 line required"),
});
export const updateGRNSchema = z.object({
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:      z.enum(GRN_STATUSES).optional(),
  notes:       z.string().max(1000).nullable().optional(),
});

// Purchase RFQs
export const insertPurchaseRFQSchema = z.object({
  vendorId:         z.number().int().positive().nullable().optional(),
  rfqNumber:        z.string().min(1).max(50).optional(),
  rfqDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  itemsDescription: z.string().max(2000).nullable().optional(),
  estimatedValue:   amountStr.nullable().optional(),
  status:           z.enum(RFQ_STATUSES).optional().default("draft"),
  notes:            z.string().max(1000).nullable().optional(),
});
export const updatePurchaseRFQSchema = insertPurchaseRFQSchema.partial();

const positiveAmountStr = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

export const insertPurchaseRequisitionLineSchema = z.object({
  itemCode: z.string().max(100).nullable().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().max(50).optional().default("pcs"),
  quantity: positiveAmountStr.optional().default("1"),
  estimatedUnitPrice: positiveAmountStr.optional().default("0"),
  taxRate: positiveAmountStr.optional().default("0"),
  sequence: z.number().int().min(0).optional().default(0),
});

export const insertPurchaseRequisitionSchema = z.object({
  requisitionNumber: z.string().min(1).max(50).optional(),
  department: z.string().min(1).max(150),
  costCenter: z.string().max(100).nullable().optional(),
  neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  justification: z.string().min(1).max(2000),
  status: z.enum(PURCHASE_REQUISITION_STATUSES).optional().default("draft"),
  lines: z.array(insertPurchaseRequisitionLineSchema).min(1, "At least 1 line required"),
});
export const updatePurchaseRequisitionSchema = insertPurchaseRequisitionSchema.partial();

export const insertPurchaseQuoteLineSchema = z.object({
  itemCode: z.string().max(100).nullable().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().max(50).optional().default("pcs"),
  quantity: positiveAmountStr.optional().default("1"),
  unitPrice: positiveAmountStr.optional().default("0"),
  taxRate: positiveAmountStr.optional().default("0"),
  sequence: z.number().int().min(0).optional().default(0),
});

export const insertPurchaseQuoteSchema = z.object({
  rfqId: z.number().int().positive(),
  vendorId: z.number().int().positive(),
  quoteNumber: z.string().min(1).max(50),
  quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deliveryDays: z.number().int().min(0).max(365).nullable().optional(),
  paymentTerms: z.string().max(100).nullable().optional(),
  status: z.enum(PURCHASE_QUOTE_STATUSES).optional().default("submitted"),
  lines: z.array(insertPurchaseQuoteLineSchema).min(1, "At least 1 line required"),
});
export const updatePurchaseQuoteSchema = insertPurchaseQuoteSchema.partial().omit({ rfqId: true, vendorId: true, lines: true });

export const insertPurchaseInvoiceLineSchema = z.object({
  poLineId: z.number().int().positive().nullable().optional(),
  description: z.string().min(1).max(500),
  quantity: positiveAmountStr.optional().default("1"),
  unitPrice: positiveAmountStr.optional().default("0"),
  taxRate: positiveAmountStr.optional().default("0"),
  sequence: z.number().int().min(0).optional().default(0),
});

export const insertPurchaseInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  vendorId: z.number().int().positive(),
  poId: z.number().int().positive().nullable().optional(),
  grnId: z.number().int().positive().nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  currency: z.string().max(10).optional().default("INR"),
  status: z.enum(PURCHASE_INVOICE_STATUSES).optional().default("received"),
  notes: z.string().max(1000).nullable().optional(),
  lines: z.array(insertPurchaseInvoiceLineSchema).min(1, "At least 1 line required"),
});
export const updatePurchaseInvoiceSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(PURCHASE_INVOICE_STATUSES).optional(),
});

export const insertPurchasePaymentSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: positiveAmountStr,
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(PURCHASE_PAYMENT_METHODS).default("manual"),
  notes: z.string().max(1000).nullable().optional(),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type PurchaseVendor      = typeof purchaseVendors.$inferSelect;
export type PurchaseOrder       = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderLine   = typeof purchaseOrderLines.$inferSelect;
export type GoodsReceiptNote    = typeof goodsReceiptNotes.$inferSelect;
export type GoodsReceiptLine    = typeof goodsReceiptLines.$inferSelect;
export type PurchaseRFQ         = typeof purchaseRFQs.$inferSelect;
export type PurchaseRequisition = typeof purchaseRequisitions.$inferSelect;
export type PurchaseRequisitionLine = typeof purchaseRequisitionLines.$inferSelect;
export type PurchaseRfqInvite = typeof purchaseRfqInvites.$inferSelect;
export type PurchaseQuote = typeof purchaseQuotes.$inferSelect;
export type PurchaseQuoteLine = typeof purchaseQuoteLines.$inferSelect;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type PurchaseInvoiceLine = typeof purchaseInvoiceLines.$inferSelect;
export type PurchasePayment = typeof purchasePayments.$inferSelect;

export type InsertPurchaseVendor = z.infer<typeof insertPurchaseVendorSchema>;
export type InsertPurchaseOrder  = z.infer<typeof insertPurchaseOrderSchema>;
export type InsertGRN            = z.infer<typeof insertGRNSchema>;
export type InsertPurchaseRFQ    = z.infer<typeof insertPurchaseRFQSchema>;
