import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Notification channels
  notifEmail: boolean("notif_email").notNull().default(true),
  notifPush: boolean("notif_push").notNull().default(false),
  // Notification events
  notifInvoices: boolean("notif_invoices").notNull().default(true),
  notifPayroll: boolean("notif_payroll").notNull().default(true),
  notifAlerts: boolean("notif_alerts").notNull().default(true),
  notifReports: boolean("notif_reports").notNull().default(false),
  // Security prefs
  sessionTimeout: boolean("session_timeout").notNull().default(true),
  ipWhitelist: boolean("ip_whitelist").notNull().default(false),
  auditLog: boolean("audit_log").notNull().default(true),
  // Appearance
  theme: text("theme").notNull().default("dark"),
  language: text("language").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  dateFormat: text("date_format").notNull().default("MM/DD/YYYY"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, updatedAt: true });
export const selectUserPreferencesSchema = createSelectSchema(userPreferences);

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
