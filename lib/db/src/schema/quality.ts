import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { invProducts } from "./inventory";
import { invWarehouses } from "./inventory";

// ── Constants ─────────────────────────────────────────────────────────────────

export const QC_INSPECTION_TYPES = ["incoming", "in_process", "finished_goods"] as const;
export type QcInspectionType = (typeof QC_INSPECTION_TYPES)[number];

export const QC_INSPECTION_STATUSES = ["draft", "in_progress", "passed", "failed", "on_hold", "cancelled"] as const;
export type QcInspectionStatus = (typeof QC_INSPECTION_STATUSES)[number];

export const QC_PARAMETER_TYPES = ["numeric", "text", "boolean", "enum"] as const;
export type QcParameterType = (typeof QC_PARAMETER_TYPES)[number];

export const QC_REJECTION_STATUSES = ["open", "quarantined", "returned", "scrapped", "reworked", "closed"] as const;
export type QcRejectionStatus = (typeof QC_REJECTION_STATUSES)[number];

export const QC_CAPA_STATUSES = ["open", "investigating", "action_planned", "in_progress", "verification", "closed"] as const;
export type QcCapaStatus = (typeof QC_CAPA_STATUSES)[number];

export const QC_CAPA_TYPES = ["corrective", "preventive"] as const;
export type QcCapaType = (typeof QC_CAPA_TYPES)[number];

export const QC_CAPA_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type QcCapaPriority = (typeof QC_CAPA_PRIORITIES)[number];

export const QC_CERTIFICATE_STATUSES = ["draft", "issued", "revoked"] as const;
export type QcCertificateStatus = (typeof QC_CERTIFICATE_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * qc_parameters — inspection parameter master (e.g. weight, dimension, colour, defect rate).
 */
export const qcParameters = pgTable("qc_parameters", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  parameterType: text("parameter_type").notNull().default("parameter"), // QcParameterType
  unit: text("unit"),
  minValue: numeric("min_value", { precision: 15, scale: 4 }),
  maxValue: numeric("max_value", { precision: 15, scale: 4 }),
  allowedValues: text("allowed_values"), // comma-separated for enum type
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * qc_inspections — QC inspection header (incoming, in-process, finished-goods).
 */
export const qcInspections = pgTable("qc_inspections", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  inspectionNumber: text("inspection_number").notNull(),
  inspectionType: text("inspection_type").notNull().default("incoming"), // QcInspectionType
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id").references(() => invWarehouses.id, { onDelete: "set null" }),
  referenceNumber: text("reference_number"), // PO / WO / SO reference
  lotNumber: text("lot_number"),
  batchNumber: text("batch_number"),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  inspectedQty: numeric("inspected_qty", { precision: 15, scale: 4 }).notNull().default("0"),
  passedQty: numeric("passed_qty", { precision: 15, scale: 4 }).notNull().default("0"),
  rejectedQty: numeric("rejected_qty", { precision: 15, scale: 4 }).notNull().default("0"),
  status: text("status").notNull().default("draft"), // QcInspectionStatus
  inspector: text("inspector"),
  inspectionDate: text("inspection_date"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * qc_inspection_lines — parameter results per inspection.
 */
export const qcInspectionLines = pgTable("qc_inspection_lines", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => qcInspections.id, { onDelete: "cascade" }),
  parameterId: integer("parameter_id").notNull().references(() => qcParameters.id, { onDelete: "restrict" }),
  measuredValue: text("measured_value"),
  expectedValue: text("expected_value"),
  result: text("result").notNull().default("pending"), // pending | pass | fail
  notes: text("notes"),
});

/**
 * qc_rejections — rejection records for failed inspections.
 */
export const qcRejections = pgTable("qc_rejections", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  rejectionNumber: text("rejection_number").notNull(),
  inspectionId: integer("inspection_id").references(() => qcInspections.id, { onDelete: "set null" }),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id").references(() => invWarehouses.id, { onDelete: "set null" }),
  lotNumber: text("lot_number"),
  batchNumber: text("batch_number"),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  reason: text("reason").notNull(),
  disposition: text("disposition").notNull().default("quarantine"), // quarantine | return | scrap | rework
  status: text("status").notNull().default("open"), // QcRejectionStatus
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * qc_capas — Corrective and Preventive Actions.
 */
export const qcCapas = pgTable("qc_capas", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  capaNumber: text("capa_number").notNull(),
  capaType: text("capa_type").notNull().default("corrective"), // QcCapaType
  title: text("title").notNull(),
  description: text("description"),
  sourceType: text("source_type"), // inspection | rejection | audit | complaint | other
  sourceId: integer("source_id"),
  priority: text("priority").notNull().default("medium"), // QcCapaPriority
  status: text("status").notNull().default("open"), // QcCapaStatus
  rootCause: text("root_cause"),
  actionPlan: text("action_plan"),
  assignedTo: text("assigned_to"),
  dueDate: text("due_date"),
  closedDate: text("closed_date"),
  effectivenessCheck: text("effectiveness_check"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * qc_certificates — quality certificates for products / lots.
 */
export const qcCertificates = pgTable("qc_certificates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  certificateNumber: text("certificate_number").notNull(),
  productId: integer("product_id").notNull().references(() => invProducts.id, { onDelete: "restrict" }),
  inspectionId: integer("inspection_id").references(() => qcInspections.id, { onDelete: "set null" }),
  lotNumber: text("lot_number"),
  batchNumber: text("batch_number"),
  certificateType: text("certificate_type").notNull().default("coa"), // coa | cof | coc | other
  issueDate: text("issue_date").notNull(),
  expiryDate: text("expiry_date"),
  status: text("status").notNull().default("draft"), // QcCertificateStatus
  issuedBy: text("issued_by"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * qc_certificate_lines — parameter results included on a certificate.
 */
export const qcCertificateLines = pgTable("qc_certificate_lines", {
  id: serial("id").primaryKey(),
  certificateId: integer("certificate_id").notNull().references(() => qcCertificates.id, { onDelete: "cascade" }),
  parameterId: integer("parameter_id").notNull().references(() => qcParameters.id, { onDelete: "restrict" }),
  measuredValue: text("measured_value"),
  expectedValue: text("expected_value"),
  result: text("result").notNull().default("pass"),
  notes: text("notes"),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type QcParameter = typeof qcParameters.$inferSelect;
export type QcInspection = typeof qcInspections.$inferSelect;
export type QcInspectionLine = typeof qcInspectionLines.$inferSelect;
export type QcRejection = typeof qcRejections.$inferSelect;
export type QcCapa = typeof qcCapas.$inferSelect;
export type QcCertificate = typeof qcCertificates.$inferSelect;
export type QcCertificateLine = typeof qcCertificateLines.$inferSelect;