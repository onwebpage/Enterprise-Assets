/**
 * Document Management schema
 *
 * Tables:
 *  doc_folders    – folder hierarchy (supports nesting via parent_id)
 *  doc_documents  – document metadata + base64 file content
 *  doc_versions   – version history per document
 *  doc_shares     – per-document sharing records
 */
import {
  pgTable, serial, text, integer, timestamp, boolean, bigint,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DOC_STATUSES = ["active", "archived"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const DOC_SHARE_PERMISSIONS = ["view", "edit"] as const;
export type DocSharePermission = (typeof DOC_SHARE_PERMISSIONS)[number];

export const DOC_FOLDER_COLORS = [
  "blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "slate",
] as const;
export type DocFolderColor = (typeof DOC_FOLDER_COLORS)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/** Folder hierarchy — supports unlimited nesting via parent_id */
export const docFolders = pgTable("doc_folders", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  description: text("description"),
  parentId:    integer("parent_id"),               // self-ref — no FK to avoid cycle issues
  color:       text("color").notNull().default("blue"),  // DocFolderColor
  icon:        text("icon").notNull().default("folder"),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/** Document metadata + optional inline base64 file content */
export const docDocuments = pgTable("doc_documents", {
  id:          serial("id").primaryKey(),
  orgId:       integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  folderId:    integer("folder_id").references(() => docFolders.id, { onDelete: "set null" }),
  docNumber:   text("doc_number").notNull(),                 // DOC-XXXX
  name:        text("name").notNull(),
  description: text("description"),
  fileType:    text("file_type").notNull().default("other"), // pdf|excel|word|image|csv|other
  mimeType:    text("mime_type"),
  fileSize:    bigint("file_size", { mode: "number" }).notNull().default(0), // bytes
  fileContent: text("file_content"),                         // base64-encoded file data
  tags:        text("tags"),                                 // comma-separated
  isStarred:   boolean("is_starred").notNull().default(false),
  isShared:    boolean("is_shared").notNull().default(false),
  version:     integer("version").notNull().default(1),
  status:      text("status").notNull().default("active"),   // DocStatus
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy:   integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

/** Full version history — each upload/update creates a row */
export const docVersions = pgTable("doc_versions", {
  id:          serial("id").primaryKey(),
  documentId:  integer("document_id").notNull().references(() => docDocuments.id, { onDelete: "cascade" }),
  version:     integer("version").notNull(),
  changeNote:  text("change_note"),
  fileContent: text("file_content"),   // base64 snapshot of this version
  fileSize:    bigint("file_size", { mode: "number" }).notNull().default(0),
  createdBy:   integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

/** Document sharing records */
export const docShares = pgTable("doc_shares", {
  id:           serial("id").primaryKey(),
  documentId:   integer("document_id").notNull().references(() => docDocuments.id, { onDelete: "cascade" }),
  sharedWithEmail: text("shared_with_email").notNull(),
  sharedBy:     integer("shared_by").references(() => users.id, { onDelete: "set null" }),
  permission:   text("permission").notNull().default("view"), // DocSharePermission
  expiresAt:    timestamp("expires_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertDocFolderSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  parentId:    z.number().int().positive().nullable().optional(),
  color:       z.enum(DOC_FOLDER_COLORS).optional().default("blue"),
  icon:        z.string().max(50).optional().default("folder"),
});
export const updateDocFolderSchema = insertDocFolderSchema.partial();

export const insertDocDocumentSchema = z.object({
  name:        z.string().min(1).max(500),
  description: z.string().max(1000).nullable().optional(),
  folderId:    z.number().int().positive().nullable().optional(),
  fileType:    z.enum(["pdf", "excel", "word", "image", "csv", "text", "other"]).optional().default("other"),
  mimeType:    z.string().max(200).nullable().optional(),
  fileSize:    z.number().int().min(0).optional().default(0),
  fileContent: z.string().nullable().optional(),  // base64
  tags:        z.string().max(500).nullable().optional(),
  isStarred:   z.boolean().optional().default(false),
});
export const updateDocDocumentSchema = z.object({
  name:        z.string().min(1).max(500).optional(),
  description: z.string().max(1000).nullable().optional(),
  folderId:    z.number().int().positive().nullable().optional(),
  tags:        z.string().max(500).nullable().optional(),
  fileContent: z.string().nullable().optional(),
  fileSize:    z.number().int().min(0).optional(),
  fileType:    z.enum(["pdf", "excel", "word", "image", "csv", "text", "other"]).optional(),
  mimeType:    z.string().max(200).nullable().optional(),
  changeNote:  z.string().max(500).nullable().optional(),
});

export const insertDocShareSchema = z.object({
  sharedWithEmail: z.string().email(),
  permission:      z.enum(DOC_SHARE_PERMISSIONS).optional().default("view"),
  expiresAt:       z.string().datetime().nullable().optional(),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type DocFolder    = typeof docFolders.$inferSelect;
export type DocDocument  = typeof docDocuments.$inferSelect;
export type DocVersion   = typeof docVersions.$inferSelect;
export type DocShare     = typeof docShares.$inferSelect;

export type InsertDocFolder   = z.infer<typeof insertDocFolderSchema>;
export type UpdateDocFolder   = z.infer<typeof updateDocFolderSchema>;
export type InsertDocDocument = z.infer<typeof insertDocDocumentSchema>;
export type UpdateDocDocument = z.infer<typeof updateDocDocumentSchema>;
export type InsertDocShare    = z.infer<typeof insertDocShareSchema>;
