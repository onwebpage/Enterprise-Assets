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

export const saasWhitelabel = pgTable("saas_whitelabel", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().unique().references(() => organizations.id),
  isEnabled: boolean("is_enabled").notNull().default(true),
  productName: text("product_name").notNull().default("OmniERP"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").notNull().default("#2563EB"),
  accentColor: text("accent_color").notNull().default("#06B6D4"),
  customDomain: text("custom_domain"),
  domainStatus: text("domain_status").notNull().default("unverified"),
  supportEmail: text("support_email"),
  supportUrl: text("support_url"),
  loginHeadline: text("login_headline"),
  loginSubline: text("login_subline"),
  loginBackgroundColor: text("login_background_color").default("#050816"),
  footerText: text("footer_text"),
  hidePoweredBy: boolean("hide_powered_by").notNull().default(false),
  customCss: text("custom_css"),
  emailSenderName: text("email_sender_name"),
  emailReplyTo: text("email_reply_to"),
  navTheme: text("nav_theme").notNull().default("dark"),
  fontFamily: text("font_family").default("Inter"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SaasPlan = typeof saasPlans.$inferSelect;
export type SaasSubscription = typeof saasSubscriptions.$inferSelect;
export type SaasWhitelabel = typeof saasWhitelabel.$inferSelect;
