import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const CRM_LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];

export const CRM_LEAD_SOURCES = ["website", "referral", "cold_call", "email", "social_media", "event", "partner", "other"] as const;
export type CrmLeadSource = (typeof CRM_LEAD_SOURCES)[number];

export const CRM_OPPORTUNITY_STAGES = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
export type CrmOpportunityStage = (typeof CRM_OPPORTUNITY_STAGES)[number];

export const CRM_QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type CrmQuotationStatus = (typeof CRM_QUOTATION_STATUSES)[number];

export const CRM_ACTIVITY_TYPES = ["call", "email", "meeting", "task", "note", "follow_up"] as const;
export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];

export const CRM_COMMUNICATION_TYPES = ["email", "phone", "meeting", "chat", "letter"] as const;
export type CrmCommunicationType = (typeof CRM_COMMUNICATION_TYPES)[number];

export const CRM_TARGET_PERIODS = ["monthly", "quarterly", "yearly"] as const;
export type CrmTargetPeriod = (typeof CRM_TARGET_PERIODS)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * crm_leads — sales leads.
 */
export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  leadNumber: text("lead_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  source: text("source").notNull().default("website"),
  status: text("status").notNull().default("new"),
  assignedTo: text("assigned_to"),
  expectedValue: numeric("expected_value", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * crm_opportunities — sales opportunities in pipeline.
 */
export const crmOpportunities = pgTable("crm_opportunities", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  opportunityNumber: text("opportunity_number").notNull(),
  leadId: integer("lead_id").references(() => crmLeads.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  company: text("company").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  stage: text("stage").notNull().default("prospecting"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  probability: integer("probability").notNull().default(10),
  expectedCloseDate: text("expected_close_date"),
  assignedTo: text("assigned_to"),
  description: text("description"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * crm_quotations — sales quotations.
 */
export const crmQuotations = pgTable("crm_quotations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  quotationNumber: text("quotation_number").notNull(),
  opportunityId: integer("opportunity_id").references(() => crmOpportunities.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => crmLeads.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  quotationDate: text("quotation_date").notNull(),
  validUntil: text("valid_until"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * crm_quotation_items — line items in quotations.
 */
export const crmQuotationItems = pgTable("crm_quotation_items", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  quotationId: integer("quotation_id").notNull().references(() => crmQuotations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull().default("0"),
});

/**
 * crm_activities — follow-ups and activities.
 */
export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }),
  opportunityId: integer("opportunity_id").references(() => crmOpportunities.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull().default("note"),
  subject: text("subject").notNull(),
  description: text("description"),
  activityDate: text("activity_date").notNull(),
  dueDate: text("due_date"),
  completed: boolean("completed").notNull().default(false),
  completedDate: text("completed_date"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * crm_communications — communication log.
 */
export const crmCommunications = pgTable("crm_communications", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }),
  opportunityId: integer("opportunity_id").references(() => crmOpportunities.id, { onDelete: "cascade" }),
  communicationType: text("communication_type").notNull().default("email"),
  subject: text("subject").notNull(),
  body: text("body"),
  communicationDate: text("communication_date").notNull(),
  direction: text("direction").notNull().default("outbound"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * crm_sales_targets — sales targets.
 */
export const crmSalesTargets = pgTable("crm_sales_targets", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  targetNumber: text("target_number").notNull(),
  salesperson: text("salesperson").notNull(),
  period: text("period").notNull().default("monthly"),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  achievedAmount: numeric("achieved_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CrmLead = typeof crmLeads.$inferSelect;
export type CrmOpportunity = typeof crmOpportunities.$inferSelect;
export type CrmQuotation = typeof crmQuotations.$inferSelect;
export type CrmQuotationItem = typeof crmQuotationItems.$inferSelect;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type CrmCommunication = typeof crmCommunications.$inferSelect;
export type CrmSalesTarget = typeof crmSalesTargets.$inferSelect;