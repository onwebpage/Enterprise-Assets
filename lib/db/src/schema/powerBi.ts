import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const powerBiIntegrations = pgTable("power_bi_integrations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull(),
  clientId: text("client_id").notNull(),
  clientSecretEncrypted: text("client_secret_encrypted").notNull(),
  workspaceId: text("workspace_id").notNull(),
  reportId: text("report_id").notNull(),
  datasetId: text("dataset_id"),
  embedUrl: text("embed_url"),
  enabled: boolean("enabled").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgUnique: uniqueIndex("power_bi_integrations_org_unique").on(table.orgId),
}));

export type PowerBiIntegration = typeof powerBiIntegrations.$inferSelect;
export type InsertPowerBiIntegration = typeof powerBiIntegrations.$inferInsert;