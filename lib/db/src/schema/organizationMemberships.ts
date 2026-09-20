import { pgTable, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { roles } from "./roles";

export const organizationMemberships = pgTable("organization_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "set null" }),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({ userOrganizationUnique: unique().on(table.userId, table.organizationId) }));

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).omit({ id: true, createdAt: true });
export const selectOrganizationMembershipSchema = createSelectSchema(organizationMemberships);
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>;