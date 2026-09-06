import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const socialIntegrations = pgTable("social_integrations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  accountName: text("account_name"),
  accountId: text("account_id"),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("connected"),
  lastTestedAt: timestamp("last_tested_at"),
  lastError: text("last_error"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgProviderUnique: uniqueIndex("social_integrations_org_provider_unique").on(table.orgId, table.provider),
}));

export type SocialIntegration = typeof socialIntegrations.$inferSelect;
export type InsertSocialIntegration = typeof socialIntegrations.$inferInsert;