/**
 * Workflow Automation schema
 *
 * Tables:
 *  wf_definitions    – workflow templates (trigger, steps, status)
 *  wf_steps          – ordered steps within a workflow
 *  wf_instances      – each execution run of a workflow
 *  wf_instance_logs  – per-step execution log for an instance
 */
import {
  pgTable, serial, text, integer, timestamp, boolean, jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const WF_TRIGGER_TYPES = ["manual", "schedule", "event"] as const;
export type WfTriggerType = (typeof WF_TRIGGER_TYPES)[number];

export const WF_STATUSES = ["draft", "active", "paused"] as const;
export type WfStatus = (typeof WF_STATUSES)[number];

export const WF_ACTION_TYPES = [
  "send_notification",
  "send_email",
  "update_record",
  "create_record",
  "approve_reject",
  "condition",
  "delay",
  "webhook",
] as const;
export type WfActionType = (typeof WF_ACTION_TYPES)[number];

export const WF_INSTANCE_STATUSES = ["running", "completed", "failed", "cancelled"] as const;
export type WfInstanceStatus = (typeof WF_INSTANCE_STATUSES)[number];

export const WF_STEP_STATUSES = ["pending", "running", "completed", "failed", "skipped"] as const;
export type WfStepStatus = (typeof WF_STEP_STATUSES)[number];

export const WF_CATEGORIES = [
  "Finance", "Inventory", "Sales", "HR", "Tax", "Purchase",
  "Manufacturing", "Reports", "General",
] as const;
export type WfCategory = (typeof WF_CATEGORIES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/** Workflow definition (the template / blueprint) */
export const wfDefinitions = pgTable("wf_definitions", {
  id:            serial("id").primaryKey(),
  orgId:         integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  description:   text("description"),
  category:      text("category").notNull().default("General"),
  triggerType:   text("trigger_type").notNull().default("manual"),   // WfTriggerType
  triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>().default({}),
  status:        text("status").notNull().default("draft"),           // WfStatus
  runCount:      integer("run_count").notNull().default(0),
  successCount:  integer("success_count").notNull().default(0),
  lastRunAt:     timestamp("last_run_at"),
  createdBy:     integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

/** Ordered steps inside a workflow definition */
export const wfSteps = pgTable("wf_steps", {
  id:              serial("id").primaryKey(),
  workflowId:      integer("workflow_id").notNull().references(() => wfDefinitions.id, { onDelete: "cascade" }),
  stepOrder:       integer("step_order").notNull().default(1),
  name:            text("name").notNull(),
  actionType:      text("action_type").notNull().default("send_notification"), // WfActionType
  actionConfig:    jsonb("action_config").$type<Record<string, unknown>>().default({}),
  conditionConfig: jsonb("condition_config").$type<Record<string, unknown>>().default({}),
  isEnabled:       boolean("is_enabled").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

/** One execution run of a workflow */
export const wfInstances = pgTable("wf_instances", {
  id:           serial("id").primaryKey(),
  workflowId:   integer("workflow_id").notNull().references(() => wfDefinitions.id, { onDelete: "cascade" }),
  orgId:        integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  status:       text("status").notNull().default("running"),    // WfInstanceStatus
  triggerType:  text("trigger_type").notNull().default("manual"),
  triggerData:  jsonb("trigger_data").$type<Record<string, unknown>>().default({}),
  startedAt:    timestamp("started_at").notNull().defaultNow(),
  completedAt:  timestamp("completed_at"),
  durationMs:   integer("duration_ms"),
  errorMessage: text("error_message"),
  triggeredBy:  integer("triggered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

/** Per-step execution log for an instance */
export const wfInstanceLogs = pgTable("wf_instance_logs", {
  id:           serial("id").primaryKey(),
  instanceId:   integer("instance_id").notNull().references(() => wfInstances.id, { onDelete: "cascade" }),
  stepId:       integer("step_id").references(() => wfSteps.id, { onDelete: "set null" }),
  stepName:     text("step_name").notNull(),
  stepOrder:    integer("step_order").notNull(),
  status:       text("status").notNull().default("pending"), // WfStepStatus
  startedAt:    timestamp("started_at"),
  completedAt:  timestamp("completed_at"),
  output:       jsonb("output").$type<Record<string, unknown>>().default({}),
  errorMessage: text("error_message"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const wfStepInputSchema = z.object({
  id:              z.number().int().positive().optional(), // present when editing
  name:            z.string().min(1).max(200),
  actionType:      z.enum(WF_ACTION_TYPES).default("send_notification"),
  actionConfig:    z.record(z.string(), z.unknown()).optional().default({}),
  conditionConfig: z.record(z.string(), z.unknown()).optional().default({}),
  isEnabled:       z.boolean().optional().default(true),
  stepOrder:       z.number().int().min(1).optional(),
});

export const insertWfDefinitionSchema = z.object({
  name:          z.string().min(1).max(200),
  description:   z.string().max(1000).nullable().optional(),
  category:      z.enum(WF_CATEGORIES).optional().default("General"),
  triggerType:   z.enum(WF_TRIGGER_TYPES).optional().default("manual"),
  triggerConfig: z.record(z.string(), z.unknown()).optional().default({}),
  status:        z.enum(WF_STATUSES).optional().default("draft"),
  steps:         z.array(wfStepInputSchema).optional().default([]),
});

export const updateWfDefinitionSchema = insertWfDefinitionSchema.partial();

// ── TS types ──────────────────────────────────────────────────────────────────

export type WfDefinition      = typeof wfDefinitions.$inferSelect;
export type WfStep            = typeof wfSteps.$inferSelect;
export type WfInstance        = typeof wfInstances.$inferSelect;
export type WfInstanceLog     = typeof wfInstanceLogs.$inferSelect;

export type InsertWfDefinition = z.infer<typeof insertWfDefinitionSchema>;
export type UpdateWfDefinition = z.infer<typeof updateWfDefinitionSchema>;
export type WfStepInput        = z.infer<typeof wfStepInputSchema>;
