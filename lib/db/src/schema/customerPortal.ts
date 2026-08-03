/**
 * Customer Portal schema
 *
 * Tables:
 *  cp_customers        – portal-registered customer accounts
 *  cp_invoices         – invoices shared with customers via the portal
 *  cp_tickets          – customer support tickets
 *  cp_ticket_messages  – threaded messages on each ticket
 */
import {
  pgTable, serial, text, integer, timestamp, boolean, numeric,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const CP_CUSTOMER_STATUSES = ["active", "inactive", "pending"] as const;
export type CpCustomerStatus = (typeof CP_CUSTOMER_STATUSES)[number];

export const CP_INVOICE_STATUSES = ["draft", "sent", "viewed", "paid", "overdue"] as const;
export type CpInvoiceStatus = (typeof CP_INVOICE_STATUSES)[number];

export const CP_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type CpTicketStatus = (typeof CP_TICKET_STATUSES)[number];

export const CP_TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type CpTicketPriority = (typeof CP_TICKET_PRIORITIES)[number];

export const CP_TICKET_CATEGORIES = [
  "billing", "technical", "general", "returns", "shipping", "other",
] as const;
export type CpTicketCategory = (typeof CP_TICKET_CATEGORIES)[number];

export const CP_SENDER_TYPES = ["customer", "staff"] as const;
export type CpSenderType = (typeof CP_SENDER_TYPES)[number];

export const CP_AVATAR_COLORS = [
  "blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "slate",
] as const;
export type CpAvatarColor = (typeof CP_AVATAR_COLORS)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/** Portal customer accounts */
export const cpCustomers = pgTable("cp_customers", {
  id:            serial("id").primaryKey(),
  orgId:         integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  customerCode:  text("customer_code").notNull(),          // CPC-XXXX
  name:          text("name").notNull(),
  email:         text("email").notNull(),
  company:       text("company"),
  phone:         text("phone"),
  status:        text("status").notNull().default("pending"), // CpCustomerStatus
  avatarColor:   text("avatar_color").notNull().default("blue"),
  notes:         text("notes"),
  lastLogin:     timestamp("last_login"),
  portalEnabled: boolean("portal_enabled").notNull().default(true),
  inviteSentAt:  timestamp("invite_sent_at"),
  createdBy:     integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

/** Invoices shared with customers via the portal */
export const cpInvoices = pgTable("cp_invoices", {
  id:            serial("id").primaryKey(),
  orgId:         integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    integer("customer_id").notNull().references(() => cpCustomers.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),         // CPI-XXXX
  invoiceDate:   text("invoice_date").notNull(),
  dueDate:       text("due_date"),
  amount:        numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paidAmount:    numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency:      text("currency").notNull().default("INR"),
  status:        text("status").notNull().default("draft"),  // CpInvoiceStatus
  description:   text("description"),
  notes:         text("notes"),
  viewedAt:      timestamp("viewed_at"),
  paidAt:        timestamp("paid_at"),
  createdBy:     integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

/** Customer support tickets */
export const cpTickets = pgTable("cp_tickets", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  customerId:   integer("customer_id").notNull().references(() => cpCustomers.id, { onDelete: "cascade" }),
  ticketNumber: text("ticket_number").notNull(),           // TKT-XXXX
  subject:      text("subject").notNull(),
  description:  text("description"),
  category:     text("category").notNull().default("general"), // CpTicketCategory
  priority:     text("priority").notNull().default("medium"),  // CpTicketPriority
  status:       text("status").notNull().default("open"),      // CpTicketStatus
  assignedTo:   integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolvedAt:   timestamp("resolved_at"),
  closedAt:     timestamp("closed_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/** Threaded messages on support tickets */
export const cpTicketMessages = pgTable("cp_ticket_messages", {
  id:          serial("id").primaryKey(),
  ticketId:    integer("ticket_id").notNull().references(() => cpTickets.id, { onDelete: "cascade" }),
  senderType:  text("sender_type").notNull().default("staff"),  // CpSenderType
  senderName:  text("sender_name").notNull(),
  message:     text("message").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertCpCustomerSchema = z.object({
  name:          z.string().min(1),
  email:         z.email(),
  company:       z.string().optional(),
  phone:         z.string().optional(),
  status:        z.enum(CP_CUSTOMER_STATUSES).optional(),
  avatarColor:   z.enum(CP_AVATAR_COLORS).optional(),
  notes:         z.string().optional(),
  portalEnabled: z.boolean().optional(),
});

export const updateCpCustomerSchema = insertCpCustomerSchema.partial();

export const insertCpInvoiceSchema = z.object({
  customerId:    z.number().int().positive(),
  invoiceDate:   z.string().min(1),
  dueDate:       z.string().optional(),
  amount:        z.string().or(z.number()).transform(String),
  paidAmount:    z.string().or(z.number()).transform(String).optional(),
  currency:      z.string().optional(),
  status:        z.enum(CP_INVOICE_STATUSES).optional(),
  description:   z.string().optional(),
  notes:         z.string().optional(),
});

export const updateCpInvoiceSchema = insertCpInvoiceSchema.omit({ customerId: true }).partial();

export const insertCpTicketSchema = z.object({
  customerId:  z.number().int().positive(),
  subject:     z.string().min(1),
  description: z.string().optional(),
  category:    z.enum(CP_TICKET_CATEGORIES).optional(),
  priority:    z.enum(CP_TICKET_PRIORITIES).optional(),
});

export const updateCpTicketSchema = z.object({
  subject:    z.string().min(1).optional(),
  category:   z.enum(CP_TICKET_CATEGORIES).optional(),
  priority:   z.enum(CP_TICKET_PRIORITIES).optional(),
  status:     z.enum(CP_TICKET_STATUSES).optional(),
  assignedTo: z.number().int().nullable().optional(),
});

export const insertCpTicketMessageSchema = z.object({
  senderType: z.enum(CP_SENDER_TYPES).optional(),
  senderName: z.string().min(1),
  message:    z.string().min(1),
});
