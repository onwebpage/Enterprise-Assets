import { pgTable, serial, text, integer, numeric, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

export const saasLicenses = pgTable("saas_licenses", {
  id: serial("id").primaryKey(),
  licenseKey: text("license_key").notNull().unique(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  planId: integer("plan_id").notNull().references(() => saasPlans.id),
  licenseType: text("license_type").notNull().default("subscription"),
  status: text("status").notNull().default("active"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  maxSeats: integer("max_seats").notNull().default(1),
  usedSeats: integer("used_seats").notNull().default(0),
  activationLimit: integer("activation_limit").notNull().default(1),
  activationCount: integer("activation_count").notNull().default(0),
  lastActivatedAt: timestamp("last_activated_at"),
  features: jsonb("features").notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const saasWhitelabel = pgTable("saas_whitelabel", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().unique().references(() => organizations.id),
  isEnabled: boolean("is_enabled").notNull().default(true),
  productName: text("product_name").notNull().default("ZorvanI ERP"),
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

// ── Trial Events ──────────────────────────────────────────────────────────────
export const saasTrialEvents = pgTable("saas_trial_events", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => saasSubscriptions.id),
  eventType: text("event_type").notNull(), // created | extended | reminder_sent | converted | cancelled | expired
  daysAdded: integer("days_added"),
  note: text("note"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Trial Config (single-row settings) ────────────────────────────────────────
export const saasTrialConfig = pgTable("saas_trial_config", {
  id: serial("id").primaryKey(),
  defaultTrialDays: integer("default_trial_days").notNull().default(14),
  maxExtensions: integer("max_extensions").notNull().default(2),
  autoExpireAction: text("auto_expire_action").notNull().default("suspend"),
  reminderDaysBefore: jsonb("reminder_days_before").notNull().default([7, 3, 1]),
  requireCreditCard: boolean("require_credit_card").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Feature Management ───────────────────────────────────────────────────────
export const saasFeatures = pgTable("saas_features", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const saasPlanFeatures = pgTable("saas_plan_features", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => saasPlans.id, { onDelete: "cascade" }),
  featureId: integer("feature_id").notNull().references(() => saasFeatures.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  planFeatureUnique: uniqueIndex("saas_plan_features_unique").on(table.planId, table.featureId),
}));

export const saasTenantFeatures = pgTable("saas_tenant_features", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  featureId: integer("feature_id").notNull().references(() => saasFeatures.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantFeatureUnique: uniqueIndex("saas_tenant_features_unique").on(table.orgId, table.featureId),
}));

// ── Agencies ──────────────────────────────────────────────────────────────────
export const saasAgencies = pgTable("saas_agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  country: text("country"),
  website: text("website"),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("10"),
  status: text("status").notNull().default("active"), // active | inactive | suspended
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const saasAgencyClients = pgTable("saas_agency_clients", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => saasAgencies.id, { onDelete: "cascade" }),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  notes: text("notes"),
});

export const saasAgencyPayouts = pgTable("saas_agency_payouts", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => saasAgencies.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // e.g. "2026-06"
  totalMrr: numeric("total_mrr", { precision: 10, scale: 2 }).notNull().default("0"),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"), // pending | paid | cancelled
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SaasPlan = typeof saasPlans.$inferSelect;
export type SaasSubscription = typeof saasSubscriptions.$inferSelect;
export type SaasLicense = typeof saasLicenses.$inferSelect;
export type SaasWhitelabel = typeof saasWhitelabel.$inferSelect;
export type SaasTrialEvent = typeof saasTrialEvents.$inferSelect;
export type SaasTrialConfig = typeof saasTrialConfig.$inferSelect;
export type SaasFeature = typeof saasFeatures.$inferSelect;
export type SaasPlanFeature = typeof saasPlanFeatures.$inferSelect;
export type SaasTenantFeature = typeof saasTenantFeatures.$inferSelect;
export type SaasAgency = typeof saasAgencies.$inferSelect;
export type SaasAgencyClient = typeof saasAgencyClients.$inferSelect;
export type SaasAgencyPayout = typeof saasAgencyPayouts.$inferSelect;
