/**
 * Notifications schema
 *
 * Table:
 *  notifications – per-user in-app notification records
 *
 * Column notes (match the live DB exactly):
 *  body        – notification message body
 *  entity_type – related record type (e.g. "invoice", "bill")
 *  entity_id   – related record id
 *  read        – whether the notification has been read
 *  read_at     – when it was read
 *  action_url  – optional deep-link path
 *  is_archived – soft-archive flag (added via ALTER)
 *  updated_at  – last update time (added via ALTER)
 */
import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = ["info", "success", "warning", "error"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CATEGORIES = [
  "finance", "inventory", "hr", "purchase", "sales",
  "manufacturing", "workflow", "documents", "system", "general",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

// ── Table ─────────────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId:      integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  type:        text("type").notNull().default("info"),
  category:    text("category").notNull().default("system"),
  title:       text("title").notNull(),
  body:        text("body"),
  entityType:  text("entity_type"),
  entityId:    integer("entity_id"),
  actionUrl:   text("action_url"),
  read:        boolean("read").notNull().default(false),
  readAt:      timestamp("read_at"),
  isArchived:  boolean("is_archived").notNull().default(false),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertNotificationSchema = z.object({
  userId:     z.number().int().positive().nullable().optional(),
  title:      z.string().min(1).max(500),
  body:       z.string().max(2000).nullable().optional(),
  type:       z.enum(NOTIFICATION_TYPES).optional().default("info"),
  category:   z.enum(NOTIFICATION_CATEGORIES).optional().default("general"),
  entityType: z.string().max(100).nullable().optional(),
  entityId:   z.number().int().positive().nullable().optional(),
  actionUrl:  z.string().max(500).nullable().optional(),
});

export const updateNotificationSchema = insertNotificationSchema.partial();

// ── TS types ──────────────────────────────────────────────────────────────────

export type Notification       = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
