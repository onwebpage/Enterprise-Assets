import { pgTable, serial, text, integer, numeric, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ── Plans ─────────────────────────────────────────────────────────────────────
export const billingPlans = pgTable("billing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }).notNull().default("0"),
  priceYearly: numeric("price_yearly", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUsers: integer("max_users"),           // null = unlimited
  maxModules: integer("max_modules"),
  maxStorageGb: integer("max_storage_gb"),
  maxApiCallsMonthly: integer("max_api_calls_monthly"),
  features: jsonb("features").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isPopular: boolean("is_popular").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const billingSubscriptions = pgTable("billing_subscriptions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  planId: integer("plan_id").notNull().references(() => billingPlans.id),
  status: text("status").notNull().default("active"), // active | trial | suspended | cancelled | past_due
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | yearly
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  currentUsers: integer("current_users").notNull().default(0),
  currentStorageGb: numeric("current_storage_gb", { precision: 10, scale: 2 }).notNull().default("0"),
  currentApiCalls: integer("current_api_calls").notNull().default(0),
  uptime30d: numeric("uptime_30d", { precision: 5, scale: 2 }).notNull().default("99.98"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Invoices ──────────────────────────────────────────────────────────────────
export const billingInvoices = pgTable("billing_invoices", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  subscriptionId: integer("subscription_id").references(() => billingSubscriptions.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull().default("paid"), // paid | open | void | uncollectible
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"),
  lineItems: jsonb("line_items").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Payment Methods ───────────────────────────────────────────────────────────
export const billingPaymentMethods = pgTable("billing_payment_methods", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  type: text("type").notNull().default("card"), // card | bank_account | upi
  brand: text("brand"),           // Visa | Mastercard | Amex | Rupay
  last4: text("last4"),
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  cardholderName: text("cardholder_name"),
  bankName: text("bank_name"),
  accountLast4: text("account_last4"),
  upiId: text("upi_id"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Add-ons ───────────────────────────────────────────────────────────────────
export const billingAddOns = pgTable("billing_add_ons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Subscription Add-Ons (junction) ───────────────────────────────────────────
export const billingSubscriptionAddOns = pgTable("billing_subscription_add_ons", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => billingSubscriptions.id),
  addOnId: integer("add_on_id").notNull().references(() => billingAddOns.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BillingPlan = typeof billingPlans.$inferSelect;
export type BillingSubscription = typeof billingSubscriptions.$inferSelect;
export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type BillingPaymentMethod = typeof billingPaymentMethods.$inferSelect;
export type BillingAddOn = typeof billingAddOns.$inferSelect;
export type BillingSubscriptionAddOn = typeof billingSubscriptionAddOns.$inferSelect;
