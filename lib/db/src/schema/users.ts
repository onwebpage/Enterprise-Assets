import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { departments } from "./departments";
import { roles } from "./roles";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  deptId: integer("dept_id").references(() => departments.id),
  roleId: integer("role_id").references(() => roles.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("active"), // active, inactive, on_leave, pending
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, overdue
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  sessionVersion: integer("session_version").notNull().default(0),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Safe user type (no password hash)
export type SafeUser = Omit<User, "passwordHash"> & {
  roleName?: string;
  deptName?: string;
};
