/**
 * Vendor Portal schema
 *
 * Tables:
 *  vp_vendors          – vendor accounts managed in the portal
 *  vp_bills            – bills shared with vendors via the portal
 *  vp_tickets          – vendor issue / support tickets
 *  vp_ticket_messages  – threaded messages on each ticket
 */
import {
  pgTable, serial, text, integer, timestamp, boolean, numeric,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const VP_VENDOR_STATUSES = ["active", "inactive", "pending", "preferred", "blocked"] as const;
export type VpVendorStatus = (typeof VP_VENDOR_STATUSES)[number];

export const VP_BILL_STATUSES = ["draft", "pending", "approved", "paid", "overdue"] as const;
export type VpBillStatus = (typeof VP_BILL_STATUSES)[number];

export const VP_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type VpTicketStatus = (typeof VP_TICKET_STATUSES)[number];

export const VP_TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type VpTicketPriority = (typeof VP_TICKET_PRIORITIES)[number];

export const VP_TICKET_CATEGORIES = [
  "billing", "delivery", "quality", "returns", "compliance", "general", "other",
] as const;
export type VpTicketCategory = (typeof VP_TICKET_CATEGORIES)[number];

export const VP_SENDER_TYPES = ["vendor", "staff"] as const;
export type VpSenderType = (typeof VP_SENDER_TYPES)[number];

export const VP_AVATAR_COLORS = [
  "blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "slate",
] as const;
export type VpAvatarColor = (typeof VP_AVATAR_COLORS)[number];

export const VP_VENDOR_CATEGORIES = [
  "Electronics", "Raw Materials", "Machinery", "Logistics", "Software",
  "Services", "Office Supplies", "Chemicals", "Packaging", "Other",
] as const;

// ── Tables ────────────────────────────────────────────────────────────────────

/** Portal vendor accounts */
export const vpVendors = pgTable("vp_vendors", {
  id:            serial("id").primaryKey(),
  orgId:         integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  vendorCode:    text("vendor_code").notNull(),          // VND-XXXX
  name:          text("name").notNull(),
  email:         text("email").notNull(),
  company:       text("company"),
  phone:         text("phone"),
  category:      text("category"),
  status:        text("status").notNull().default("pending"),   // VpVendorStatus
  avatarColor:   text("avatar_color").notNull().default("blue"),
  rating:        numeric("rating", { precision: 3, scale: 1 }).default("0"),
  onTimePct:     numeric("on_time_pct", { precision: 5, scale: 2 }).default("0"),
  notes:         text("notes"),
  portalEnabled: boolean("portal_enabled").notNull().default(true),
  inviteSentAt:  timestamp("invite_sent_at"),
  createdBy:     integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

/** Bills shared with vendors via the portal */
export const vpBills = pgTable("vp_bills", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  vendorId:    integer("vendor_id").notNull().references(() => vpVendors.id, { onDelete: "cascade" }),
  billNumber:  text("bill_number").notNull(),            // VPB-XXXX
  billDate:    text("bill_date").notNull(),
  dueDate:     text("due_date"),
  amount:      numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paidAmount:  numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency:    text("currency").notNull().default("INR"),
  status:      text("status").notNull().default("draft"),  // VpBillStatus
  poReference: text("po_reference"),
  description: text("description"),
  notes:       text("notes"),
  paidAt:      timestamp("paid_at"),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/** Vendor issue / support tickets */
export const vpTickets = pgTable("vp_tickets", {
  id:           serial("id").primaryKey(),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  vendorId:     integer("vendor_id").notNull().references(() => vpVendors.id, { onDelete: "cascade" }),
  ticketNumber: text("ticket_number").notNull(),           // VTK-XXXX
  subject:      text("subject").notNull(),
  description:  text("description"),
  category:     text("category").notNull().default("general"), // VpTicketCategory
  priority:     text("priority").notNull().default("medium"),  // VpTicketPriority
  status:       text("status").notNull().default("open"),      // VpTicketStatus
  assignedTo:   integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolvedAt:   timestamp("resolved_at"),
  closedAt:     timestamp("closed_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

/** Threaded messages on vendor tickets */
export const vpTicketMessages = pgTable("vp_ticket_messages", {
  id:          serial("id").primaryKey(),
  ticketId:    integer("ticket_id").notNull().references(() => vpTickets.id, { onDelete: "cascade" }),
  senderType:  text("sender_type").notNull().default("staff"),  // VpSenderType
  senderName:  text("sender_name").notNull(),
  message:     text("message").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertVpVendorSchema = z.object({
  name:          z.string().min(1),
  email:         z.email(),
  company:       z.string().optional(),
  phone:         z.string().optional(),
  category:      z.string().optional(),
  status:        z.enum(VP_VENDOR_STATUSES).optional(),
  avatarColor:   z.enum(VP_AVATAR_COLORS).optional(),
  rating:        z.string().or(z.number()).transform(String).optional(),
  onTimePct:     z.string().or(z.number()).transform(String).optional(),
  notes:         z.string().optional(),
  portalEnabled: z.boolean().optional(),
});

export const updateVpVendorSchema = insertVpVendorSchema.partial();

export const insertVpBillSchema = z.object({
  vendorId:    z.number().int().positive(),
  billDate:    z.string().min(1),
  dueDate:     z.string().optional(),
  amount:      z.string().or(z.number()).transform(String),
  paidAmount:  z.string().or(z.number()).transform(String).optional(),
  currency:    z.string().optional(),
  status:      z.enum(VP_BILL_STATUSES).optional(),
  poReference: z.string().optional(),
  description: z.string().optional(),
  notes:       z.string().optional(),
});

export const updateVpBillSchema = insertVpBillSchema.omit({ vendorId: true }).partial();

export const insertVpTicketSchema = z.object({
  vendorId:    z.number().int().positive(),
  subject:     z.string().min(1),
  description: z.string().optional(),
  category:    z.enum(VP_TICKET_CATEGORIES).optional(),
  priority:    z.enum(VP_TICKET_PRIORITIES).optional(),
});

export const updateVpTicketSchema = z.object({
  subject:    z.string().min(1).optional(),
  category:   z.enum(VP_TICKET_CATEGORIES).optional(),
  priority:   z.enum(VP_TICKET_PRIORITIES).optional(),
  status:     z.enum(VP_TICKET_STATUSES).optional(),
  assignedTo: z.number().int().nullable().optional(),
});

export const insertVpTicketMessageSchema = z.object({
  senderType: z.enum(VP_SENDER_TYPES).optional(),
  senderName: z.string().min(1),
  message:    z.string().min(1),
});
