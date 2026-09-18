import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const EWAY_BILL_STATUSES = ["draft", "generated", "cancelled", "expired"] as const;
export type EWayBillStatus = (typeof EWAY_BILL_STATUSES)[number];

export const SUPPLY_TYPES = ["outward", "inward"] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];

export const SUPPLY_SUB_TYPES = [
  "supply", "export", "job_work", "sez_supplies", "deemed_export",
  "import", "job_work_returns", "sales_return", "others",
] as const;
export type SupplySubType = (typeof SUPPLY_SUB_TYPES)[number];

export const DOC_TYPES = [
  "tax_invoice", "bill_of_supply", "credit_note", "debit_note",
  "bill_of_entry", "delivery_challan", "others",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const TRANSPORT_MODES = ["road", "rail", "air", "ship"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const VEHICLE_TYPES = ["regular", "over_dimensional_cargo"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ── Table ─────────────────────────────────────────────────────────────────────

/**
 * eway_bills — E-Way Bill records for goods movement under GST
 */
export const ewayBills = pgTable("eway_bills", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),

  // Bill identity
  ewbNumber:        text("ewb_number"),                              // 12-digit EWB number (set on generate)
  status:           text("status").notNull().default("draft"),       // EWayBillStatus

  // Supply details
  supplyType:       text("supply_type").notNull().default("outward"),  // SupplyType
  supplySubType:    text("supply_sub_type").notNull().default("supply"), // SupplySubType
  docType:          text("doc_type").notNull().default("tax_invoice"),  // DocType
  docNumber:        text("doc_number").notNull(),
  docDate:          text("doc_date").notNull(),                       // YYYY-MM-DD

  // From party (consignor / shipper)
  fromGstin:        text("from_gstin"),
  fromTradeName:    text("from_trade_name").notNull(),
  fromAddress1:     text("from_address1"),
  fromAddress2:     text("from_address2"),
  fromPlace:        text("from_place"),
  fromPincode:      text("from_pincode"),
  fromState:        text("from_state"),                              // state name / code

  // To party (consignee / recipient)
  toGstin:          text("to_gstin"),
  toTradeName:      text("to_trade_name").notNull(),
  toAddress1:       text("to_address1"),
  toAddress2:       text("to_address2"),
  toPlace:          text("to_place"),
  toPincode:        text("to_pincode"),
  toState:          text("to_state"),
  placeOfDelivery:  text("place_of_delivery"),

  // Goods
  productName:      text("product_name").notNull(),
  productDesc:      text("product_desc"),
  hsnCode:          text("hsn_code"),
  quantity:         numeric("quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  unit:             text("unit"),                                    // NOS, KGS, LTR, MTR, etc.

  // Values
  totalValue:       numeric("total_value",   { precision: 15, scale: 2 }).notNull().default("0"),
  taxableValue:     numeric("taxable_value", { precision: 15, scale: 2 }).notNull().default("0"),
  cgstRate:         numeric("cgst_rate",     { precision: 8,  scale: 4 }).notNull().default("0"),
  sgstRate:         numeric("sgst_rate",     { precision: 8,  scale: 4 }).notNull().default("0"),
  igstRate:         numeric("igst_rate",     { precision: 8,  scale: 4 }).notNull().default("0"),
  cessRate:         numeric("cess_rate",     { precision: 8,  scale: 4 }).notNull().default("0"),
  cgstAmount:       numeric("cgst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  sgstAmount:       numeric("sgst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  igstAmount:       numeric("igst_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  cessAmount:       numeric("cess_amount",   { precision: 15, scale: 2 }).notNull().default("0"),
  totalTaxAmount:   numeric("total_tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),

  // Transport
  transportMode:    text("transport_mode").notNull().default("road"),  // TransportMode
  transporterId:    text("transporter_id"),
  transporterName:  text("transporter_name"),
  vehicleNumber:    text("vehicle_number"),
  vehicleType:      text("vehicle_type").default("regular"),           // VehicleType
  distance:         integer("distance"),                               // km

  // Validity
  validFrom:        text("valid_from"),                               // ISO YYYY-MM-DD HH:mm
  validUpto:        text("valid_upto"),                               // ISO YYYY-MM-DD HH:mm
  cancelReason:     text("cancel_reason"),

  notes:            text("notes"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amountStr = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

export const insertEWayBillSchema = z.object({
  supplyType:      z.enum(SUPPLY_TYPES).optional().default("outward"),
  supplySubType:   z.enum(SUPPLY_SUB_TYPES).optional().default("supply"),
  docType:         z.enum(DOC_TYPES).optional().default("tax_invoice"),
  docNumber:       z.string().min(1).max(50),
  docDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  fromGstin:       z.string().max(20).nullable().optional(),
  fromTradeName:   z.string().min(1).max(300),
  fromAddress1:    z.string().max(300).nullable().optional(),
  fromAddress2:    z.string().max(300).nullable().optional(),
  fromPlace:       z.string().max(100).nullable().optional(),
  fromPincode:     z.string().max(10).nullable().optional(),
  fromState:       z.string().max(100).nullable().optional(),

  toGstin:         z.string().max(20).nullable().optional(),
  toTradeName:     z.string().min(1).max(300),
  toAddress1:      z.string().max(300).nullable().optional(),
  toAddress2:      z.string().max(300).nullable().optional(),
  toPlace:         z.string().max(100).nullable().optional(),
  toPincode:       z.string().max(10).nullable().optional(),
  toState:         z.string().max(100).nullable().optional(),
  placeOfDelivery: z.string().max(100).nullable().optional(),

  productName:     z.string().min(1).max(300),
  productDesc:     z.string().max(500).nullable().optional(),
  hsnCode:         z.string().max(20).nullable().optional(),
  quantity:        amountStr.optional().default("1"),
  unit:            z.string().max(20).nullable().optional(),

  totalValue:      amountStr,
  taxableValue:    amountStr,
  cgstRate:        amountStr.optional().default("0"),
  sgstRate:        amountStr.optional().default("0"),
  igstRate:        amountStr.optional().default("0"),
  cessRate:        amountStr.optional().default("0"),

  transportMode:   z.enum(TRANSPORT_MODES).optional().default("road"),
  transporterId:   z.string().max(50).nullable().optional(),
  transporterName: z.string().max(300).nullable().optional(),
  vehicleNumber:   z.string().max(20).nullable().optional(),
  vehicleType:     z.enum(VEHICLE_TYPES).optional().default("regular"),
  distance:        z.number().int().min(0).nullable().optional(),

  notes:           z.string().max(1000).nullable().optional(),
});

export const updateEWayBillSchema = insertEWayBillSchema.partial();

export const cancelEWayBillSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type EWayBill        = typeof ewayBills.$inferSelect;
export type InsertEWayBill  = z.infer<typeof insertEWayBillSchema>;
export type UpdateEWayBill  = z.infer<typeof updateEWayBillSchema>;
export type CancelEWayBill  = z.infer<typeof cancelEWayBillSchema>;
