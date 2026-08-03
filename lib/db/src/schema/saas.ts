import { pgTable, serial, text, integer, numeric, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const saasPlans = pgTable("saas_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }).notNull().default("0"),
  priceYearly: numeric("price_yearly", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUsers: integer("max_users").default(10),
  maxModules: integer("max_modules").default(5),
  maxStorageGb: integer("max_storage_gb").default(10),
  maxApiCallsMonthly: integer("max_api_calls_monthly").default(100000),
  features: jsonb("features").default([]),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const saasSubscriptions = pgTable("saas_subscriptions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  planId: integer("plan_id").notNull().references(() => saasPlans.id),
  status: text("status").notNull().default("active"), // active | trial | suspended | cancelled
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | yearly
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  currentUsers: integer("current_users").default(0),
  currentStorageGb: numeric("current_storage_gb", { precision: 10, scale: 2 }).default("0"),
  currentApiCalls: integer("current_api_calls").default(0),
  mrr: numeric("mrr", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SaasPlan = typeof saasPlans.$inferSelect;
export type SaasSubscription = typeof saasSubscriptions.$inferSelect;
