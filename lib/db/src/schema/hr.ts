import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { departments } from "./departments";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const HR_EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_EMPLOYEE_STATUSES = ["active", "inactive", "on_leave", "terminated"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const HR_SALARY_TYPES = ["monthly", "annual"] as const;
export type HrSalaryType = (typeof HR_SALARY_TYPES)[number];

export const HR_GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export type HrGender = (typeof HR_GENDERS)[number];

export const HR_PAYROLL_STATUSES = ["draft", "processing", "approved", "paid"] as const;
export type HrPayrollStatus = (typeof HR_PAYROLL_STATUSES)[number];

export const HR_LEAVE_REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type HrLeaveRequestStatus = (typeof HR_LEAVE_REQUEST_STATUSES)[number];

export const HR_JOB_STATUSES = ["open", "on_hold", "closed", "filled"] as const;
export type HrJobStatus = (typeof HR_JOB_STATUSES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * hr_employees — employee master record.
 */
export const hrEmployees = pgTable("hr_employees", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  empNumber:       text("emp_number").notNull(),             // EMP-XXXX
  firstName:       text("first_name").notNull(),
  lastName:        text("last_name").notNull(),
  email:           text("email").notNull(),
  phone:           text("phone"),
  deptId:          integer("dept_id").references(() => departments.id, { onDelete: "set null" }),
  jobTitle:        text("job_title").notNull(),
  employmentType:  text("employment_type").notNull().default("full_time"), // HrEmploymentType
  status:          text("status").notNull().default("active"),              // HrEmployeeStatus
  salary:          numeric("salary", { precision: 15, scale: 2 }).notNull().default("0"),
  salaryType:      text("salary_type").notNull().default("monthly"),        // HrSalaryType
  dateOfJoining:   text("date_of_joining").notNull(),         // YYYY-MM-DD
  dateOfBirth:     text("date_of_birth"),
  gender:          text("gender"),                            // HrGender
  address:         text("address"),
  city:            text("city"),
  state:           text("state"),
  bankAccount:     text("bank_account"),
  bankName:        text("bank_name"),
  ifscCode:        text("ifsc_code"),
  managerId:       integer("manager_id"),                     // self-ref, no FK constraint to avoid cycles
  notes:           text("notes"),
  userId:          integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdBy:       integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/**
 * hr_leave_types — configurable leave type master.
 */
export const hrLeaveTypes = pgTable("hr_leave_types", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:            text("name").notNull(),              // Annual Leave, Sick Leave, etc.
  code:            text("code").notNull(),              // AL, SL, CL
  allowedDays:     integer("allowed_days").notNull().default(0),
  isCarryForward:  boolean("is_carry_forward").notNull().default(false),
  isPaid:          boolean("is_paid").notNull().default(true),
  description:     text("description"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/**
 * hr_leave_requests — employee leave applications.
 */
export const hrLeaveRequests = pgTable("hr_leave_requests", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  requestNumber:    text("request_number").notNull(),    // LR-XXXX
  employeeId:       integer("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  leaveTypeId:      integer("leave_type_id").notNull().references(() => hrLeaveTypes.id, { onDelete: "restrict" }),
  startDate:        text("start_date").notNull(),         // YYYY-MM-DD
  endDate:          text("end_date").notNull(),
  totalDays:        numeric("total_days", { precision: 5, scale: 1 }).notNull().default("1"),
  reason:           text("reason"),
  status:           text("status").notNull().default("pending"), // HrLeaveRequestStatus
  approvedById:     integer("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt:       timestamp("approved_at"),
  rejectionReason:  text("rejection_reason"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

/**
 * hr_payroll_runs — monthly payroll run header.
 */
export const hrPayrollRuns = pgTable("hr_payroll_runs", {
  id:               serial("id").primaryKey(),
  orgId:            integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  runNumber:        text("run_number").notNull(),          // PAY-XXXX
  period:           text("period").notNull(),              // YYYY-MM
  status:           text("status").notNull().default("draft"), // HrPayrollStatus
  totalGross:       numeric("total_gross", { precision: 15, scale: 2 }).notNull().default("0"),
  totalDeductions:  numeric("total_deductions", { precision: 15, scale: 2 }).notNull().default("0"),
  totalNet:         numeric("total_net", { precision: 15, scale: 2 }).notNull().default("0"),
  employeeCount:    integer("employee_count").notNull().default(0),
  approvedById:     integer("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt:       timestamp("approved_at"),
  paidAt:           timestamp("paid_at"),
  notes:            text("notes"),
  createdBy:        integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

/**
 * hr_payroll_lines — per-employee payroll detail for a run.
 */
export const hrPayrollLines = pgTable("hr_payroll_lines", {
  id:               serial("id").primaryKey(),
  runId:            integer("run_id").notNull().references(() => hrPayrollRuns.id, { onDelete: "cascade" }),
  employeeId:       integer("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "restrict" }),
  basicPay:         numeric("basic_pay",          { precision: 15, scale: 2 }).notNull().default("0"),
  hra:              numeric("hra",                { precision: 15, scale: 2 }).notNull().default("0"),
  otherAllowances:  numeric("other_allowances",   { precision: 15, scale: 2 }).notNull().default("0"),
  grossPay:         numeric("gross_pay",          { precision: 15, scale: 2 }).notNull().default("0"),
  pf:               numeric("pf",                 { precision: 15, scale: 2 }).notNull().default("0"),
  esi:              numeric("esi",                { precision: 15, scale: 2 }).notNull().default("0"),
  tds:              numeric("tds",                { precision: 15, scale: 2 }).notNull().default("0"),
  otherDeductions:  numeric("other_deductions",   { precision: 15, scale: 2 }).notNull().default("0"),
  totalDeductions:  numeric("total_deductions",   { precision: 15, scale: 2 }).notNull().default("0"),
  netPay:           numeric("net_pay",            { precision: 15, scale: 2 }).notNull().default("0"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

/**
 * hr_job_postings — open positions and recruitment.
 */
export const hrJobPostings = pgTable("hr_job_postings", {
  id:              serial("id").primaryKey(),
  orgId:           integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  jobNumber:       text("job_number").notNull(),           // JP-XXXX
  title:           text("title").notNull(),
  deptId:          integer("dept_id").references(() => departments.id, { onDelete: "set null" }),
  location:        text("location"),
  employmentType:  text("employment_type").notNull().default("full_time"),
  description:     text("description"),
  requirements:    text("requirements"),
  status:          text("status").notNull().default("open"), // HrJobStatus
  openings:        integer("openings").notNull().default(1),
  closingDate:     text("closing_date"),                    // YYYY-MM-DD
  createdBy:       integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertHrEmployeeSchema = z.object({
  firstName:       z.string().min(1).max(100),
  lastName:        z.string().min(1).max(100),
  email:           z.string().email().max(200),
  phone:           z.string().max(30).nullable().optional(),
  deptId:          z.number().int().positive().nullable().optional(),
  jobTitle:        z.string().min(1).max(200),
  employmentType:  z.enum(HR_EMPLOYMENT_TYPES).optional().default("full_time"),
  status:          z.enum(HR_EMPLOYEE_STATUSES).optional().default("active"),
  salary:          z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  salaryType:      z.enum(HR_SALARY_TYPES).optional().default("monthly"),
  dateOfJoining:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateOfBirth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  gender:          z.enum(HR_GENDERS).nullable().optional(),
  address:         z.string().max(500).nullable().optional(),
  city:            z.string().max(100).nullable().optional(),
  state:           z.string().max(100).nullable().optional(),
  bankAccount:     z.string().max(50).nullable().optional(),
  bankName:        z.string().max(100).nullable().optional(),
  ifscCode:        z.string().max(20).nullable().optional(),
  managerId:       z.number().int().positive().nullable().optional(),
  notes:           z.string().max(1000).nullable().optional(),
});
export const updateHrEmployeeSchema = insertHrEmployeeSchema.partial();

export const insertHrLeaveTypeSchema = z.object({
  name:           z.string().min(1).max(100),
  code:           z.string().min(1).max(10),
  allowedDays:    z.number().int().min(0).optional().default(0),
  isCarryForward: z.boolean().optional().default(false),
  isPaid:         z.boolean().optional().default(true),
  description:    z.string().max(500).nullable().optional(),
});
export const updateHrLeaveTypeSchema = insertHrLeaveTypeSchema.partial();

export const insertHrLeaveRequestSchema = z.object({
  employeeId:  z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalDays:   z.string().regex(/^\d+(\.\d)?$/).optional().default("1"),
  reason:      z.string().max(1000).nullable().optional(),
});
export const updateHrLeaveRequestSchema = z.object({
  status:          z.enum(HR_LEAVE_REQUEST_STATUSES),
  rejectionReason: z.string().max(500).nullable().optional(),
});

export const insertHrPayrollRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
  notes:  z.string().max(1000).nullable().optional(),
});
export const updateHrPayrollRunSchema = z.object({
  status: z.enum(HR_PAYROLL_STATUSES),
  notes:  z.string().max(1000).nullable().optional(),
});

export const insertHrPayrollLineSchema = z.object({
  employeeId:      z.number().int().positive(),
  basicPay:        z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  hra:             z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  otherAllowances: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  pf:              z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  esi:             z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  tds:             z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  otherDeductions: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  notes:           z.string().max(500).nullable().optional(),
});

export const insertHrJobPostingSchema = z.object({
  title:          z.string().min(1).max(200),
  deptId:         z.number().int().positive().nullable().optional(),
  location:       z.string().max(200).nullable().optional(),
  employmentType: z.enum(HR_EMPLOYMENT_TYPES).optional().default("full_time"),
  description:    z.string().max(5000).nullable().optional(),
  requirements:   z.string().max(5000).nullable().optional(),
  status:         z.enum(HR_JOB_STATUSES).optional().default("open"),
  openings:       z.number().int().min(1).optional().default(1),
  closingDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
export const updateHrJobPostingSchema = insertHrJobPostingSchema.partial();

// ── TS types ──────────────────────────────────────────────────────────────────

export type HrEmployee       = typeof hrEmployees.$inferSelect;
export type HrLeaveType      = typeof hrLeaveTypes.$inferSelect;
export type HrLeaveRequest   = typeof hrLeaveRequests.$inferSelect;
export type HrPayrollRun     = typeof hrPayrollRuns.$inferSelect;
export type HrPayrollLine    = typeof hrPayrollLines.$inferSelect;
export type HrJobPosting     = typeof hrJobPostings.$inferSelect;

export type InsertHrEmployee     = z.infer<typeof insertHrEmployeeSchema>;
export type InsertHrLeaveRequest = z.infer<typeof insertHrLeaveRequestSchema>;
export type InsertHrPayrollRun   = z.infer<typeof insertHrPayrollRunSchema>;
export type InsertHrJobPosting   = z.infer<typeof insertHrJobPostingSchema>;
