import { pgTable, serial, text, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { arCustomers } from "./accountsReceivable";

export const whatsappConfigs = pgTable("whatsapp_configs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default("WhatsApp Demo"),
  phoneNumber: text("phone_number"),
  enabled: boolean("enabled").notNull().default(true),
  mode: text("mode").notNull().default("demo"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ orgUnique: uniqueIndex("whatsapp_configs_org_unique").on(table.orgId) }));

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  body: text("body").notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ orgNameUnique: uniqueIndex("whatsapp_templates_org_name_unique").on(table.orgId, table.name) }));

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => arCustomers.id, { onDelete: "set null" }),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  templateId: integer("template_id").references(() => whatsappTemplates.id, { onDelete: "set null" }),
  notificationType: text("notification_type").notNull().default("general"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  failureReason: text("failure_reason"),
  sentAt: timestamp("sent_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WhatsappConfig = typeof whatsappConfigs.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;