import {
  pgTable, serial, text, integer, timestamp, numeric,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

export const ORDER_QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "expired", "converted"] as const;
export const SALES_ORDER_STATUSES = ["draft", "confirmed", "processing", "partially_delivered", "fulfilled", "back_ordered", "cancelled"] as const;
export const ORDER_PAYMENT_STATUSES = ["pending", "partial", "paid"] as const;
export const DELIVERY_STATUSES = ["pending", "picked", "packed", "in_transit", "delivered", "failed"] as const;

const amount = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const orderQuotations = pgTable("order_quotations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  quoteNumber: text("quote_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  quoteDate: text("quote_date").notNull(),
  expiryDate: text("expiry_date"),
  currency: text("currency").notNull().default("INR"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  convertedOrderId: integer("converted_order_id"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderQuotationLines = pgTable("order_quotation_lines", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => orderQuotations.id, { onDelete: "cascade" }),
  itemCode: text("item_code"),
  description: text("description").notNull(),
  unit: text("unit").notNull().default("pcs"),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  sequence: integer("sequence").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderSalesOrders = pgTable("order_sales_orders", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  quotationId: integer("quotation_id").references(() => orderQuotations.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  orderDate: text("order_date").notNull(),
  requestedDelivery: text("requested_delivery"),
  shippingAddress: text("shipping_address"),
  currency: text("currency").notNull().default("INR"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderSalesOrderLines = pgTable("order_sales_order_lines", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull().references(() => orderSalesOrders.id, { onDelete: "cascade" }),
  itemCode: text("item_code"),
  description: text("description").notNull(),
  unit: text("unit").notNull().default("pcs"),
  orderedQty: numeric("ordered_qty", { precision: 12, scale: 4 }).notNull().default("1"),
  deliveredQty: numeric("delivered_qty", { precision: 12, scale: 4 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  sequence: integer("sequence").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderDeliveries = pgTable("order_deliveries", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  salesOrderId: integer("sales_order_id").notNull().references(() => orderSalesOrders.id, { onDelete: "restrict" }),
  deliveryNumber: text("delivery_number").notNull(),
  dispatchDate: text("dispatch_date").notNull(),
  estimatedDate: text("estimated_date"),
  actualDate: text("actual_date"),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderDeliveryLines = pgTable("order_delivery_lines", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").notNull().references(() => orderDeliveries.id, { onDelete: "cascade" }),
  salesOrderLineId: integer("sales_order_line_id").notNull().references(() => orderSalesOrderLines.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderLineSchema = z.object({
  itemCode: z.string().max(100).nullable().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().max(50).optional().default("pcs"),
  quantity: amount.optional().default("1"),
  unitPrice: amount.optional().default("0"),
  taxRate: amount.optional().default("0"),
  sequence: z.number().int().min(0).optional().default(0),
});

export const insertQuotationSchema = z.object({
  customerName: z.string().min(1).max(300),
  customerEmail: z.string().email().max(200).nullable().optional(),
  quoteDate: date,
  expiryDate: date.nullable().optional(),
  currency: z.string().max(10).optional().default("INR"),
  status: z.enum(ORDER_QUOTATION_STATUSES).optional().default("draft"),
  notes: z.string().max(2000).nullable().optional(),
  lines: z.array(insertOrderLineSchema).min(1),
});

export const insertSalesOrderSchema = z.object({
  quotationId: z.number().int().positive().nullable().optional(),
  customerName: z.string().min(1).max(300),
  customerEmail: z.string().email().max(200).nullable().optional(),
  orderDate: date,
  requestedDelivery: date.nullable().optional(),
  shippingAddress: z.string().max(1000).nullable().optional(),
  currency: z.string().max(10).optional().default("INR"),
  status: z.enum(SALES_ORDER_STATUSES).optional().default("draft"),
  paymentStatus: z.enum(ORDER_PAYMENT_STATUSES).optional().default("pending"),
  notes: z.string().max(2000).nullable().optional(),
  lines: z.array(insertOrderLineSchema).min(1),
});

export const updateSalesOrderSchema = insertSalesOrderSchema.omit({ lines: true }).partial().extend({
  lines: z.array(insertOrderLineSchema).min(1).optional(),
});

export const insertDeliverySchema = z.object({
  salesOrderId: z.number().int().positive(),
  dispatchDate: date,
  estimatedDate: date.nullable().optional(),
  actualDate: date.nullable().optional(),
  carrier: z.string().max(200).nullable().optional(),
  trackingNumber: z.string().max(200).nullable().optional(),
  status: z.enum(DELIVERY_STATUSES).optional().default("pending"),
  notes: z.string().max(2000).nullable().optional(),
  lines: z.array(z.object({
    salesOrderLineId: z.number().int().positive(),
    quantity: amount,
  })).min(1),
});

export const updateDeliverySchema = z.object({
  estimatedDate: date.nullable().optional(),
  actualDate: date.nullable().optional(),
  carrier: z.string().max(200).nullable().optional(),
  trackingNumber: z.string().max(200).nullable().optional(),
  status: z.enum(DELIVERY_STATUSES).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;