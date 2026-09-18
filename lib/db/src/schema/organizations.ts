import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  taxId: text("tax_id"),
  industry: text("industry"),
  foundedYear: integer("founded_year"),
  employeeCount: integer("employee_count").default(0),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("active"),
  currency: text("currency").default("INR"),
  fiscalYearStart: text("fiscal_year_start").default("Jan"),
  type: text("type").default("Parent"), // Parent, Subsidiary
  country: text("country"),
  gstin: text("gstin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const selectOrganizationSchema = createSelectSchema(organizations);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
