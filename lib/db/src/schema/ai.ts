import {
  pgTable, serial, text, integer, timestamp, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * ai_conversations — chat session container.
 */
export const aiConversations = pgTable("ai_conversations", {
  id:        serial("id").primaryKey(),
  orgId:     integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId:    integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title:     text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ai_messages — individual messages within a conversation.
 */
export const aiMessages = pgTable("ai_messages", {
  id:             serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role:           text("role").notNull(),   // "user" | "assistant"
  content:        text("content").notNull(),
  liked:          boolean("liked"),         // null = no feedback, true = 👍, false = 👎
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertAiConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const insertAiMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const sendAiChatSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().min(1).max(4000),
});

export const feedbackSchema = z.object({
  liked: z.boolean(),
});

// ── TypeScript types ──────────────────────────────────────────────────────────

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = typeof aiMessages.$inferInsert;
