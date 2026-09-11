import { boolean, date, integer, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"),
  managerId: integer("manager_id").references(() => users.id, { onDelete: "set null" }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 15, scale: 2 }).notNull().default("0"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ orgCodeUnique: uniqueIndex("projects_org_code_unique").on(table.orgId, table.code) }));

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;