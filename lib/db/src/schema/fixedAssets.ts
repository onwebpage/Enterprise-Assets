import {
  pgTable, serial, text, integer, timestamp, numeric, boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { users } from "./users";

// ── Constants ─────────────────────────────────────────────────────────────────

export const ASSET_STATUSES = ["active", "fully_depreciated", "disposed", "under_maintenance"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const DEPRECIATION_METHODS = ["straight_line", "declining_balance", "sum_of_years_digits"] as const;
export type DepreciationMethod = (typeof DEPRECIATION_METHODS)[number];

export const ASSET_CATEGORIES = ["land", "buildings", "machinery", "vehicles", "furniture", "computers", "other"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * fixed_assets — asset register: one row per physical asset.
 * currentBookValue is updated whenever depreciation is posted.
 */
export const fixedAssets = pgTable("fixed_assets", {
  id:                       serial("id").primaryKey(),
  orgId:                    integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  assetNumber:              text("asset_number").notNull(),
  name:                     text("name").notNull(),
  category:                 text("category").notNull().default("other"),          // AssetCategory
  description:              text("description"),
  purchaseDate:             text("purchase_date").notNull(),                      // YYYY-MM-DD
  purchaseCost:             numeric("purchase_cost",              { precision: 15, scale: 2 }).notNull().default("0"),
  salvageValue:             numeric("salvage_value",              { precision: 15, scale: 2 }).notNull().default("0"),
  usefulLifeMonths:         integer("useful_life_months").notNull().default(60),
  depreciationMethod:       text("depreciation_method").notNull().default("straight_line"), // DepreciationMethod
  accumulatedDepreciation:  numeric("accumulated_depreciation",   { precision: 15, scale: 2 }).notNull().default("0"),
  currentBookValue:         numeric("current_book_value",         { precision: 15, scale: 2 }).notNull().default("0"),
  status:                   text("status").notNull().default("active"),           // AssetStatus
  location:                 text("location"),
  serialNumber:             text("serial_number"),
  notes:                    text("notes"),
  createdBy:                integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:                timestamp("created_at").notNull().defaultNow(),
  updatedAt:                timestamp("updated_at").notNull().defaultNow(),
});

/**
 * asset_depreciation_entries — one row per asset per period.
 * posted=true means the amount has been recognised in the GL (or marked final).
 */
export const assetDepreciationEntries = pgTable("asset_depreciation_entries", {
  id:                      serial("id").primaryKey(),
  assetId:                 integer("asset_id").notNull().references(() => fixedAssets.id, { onDelete: "cascade" }),
  orgId:                   integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  periodDate:              text("period_date").notNull(),  // YYYY-MM
  depreciationAmount:      numeric("depreciation_amount",      { precision: 15, scale: 2 }).notNull(),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).notNull(),
  bookValue:               numeric("book_value",               { precision: 15, scale: 2 }).notNull(),
  posted:                  boolean("posted").notNull().default(false),
  notes:                   text("notes"),
  createdBy:               integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:               timestamp("created_at").notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const posAmountStr = z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative number");

export const insertFixedAssetSchema = z.object({
  name:               z.string().min(1).max(300),
  assetNumber:        z.string().min(1).max(50).optional(),
  category:           z.enum(ASSET_CATEGORIES).optional().default("other"),
  description:        z.string().max(1000).nullable().optional(),
  purchaseDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purchaseCost:       posAmountStr,
  salvageValue:       posAmountStr.optional().default("0"),
  usefulLifeMonths:   z.number().int().min(1).max(999).optional().default(60),
  depreciationMethod: z.enum(DEPRECIATION_METHODS).optional().default("straight_line"),
  status:             z.enum(ASSET_STATUSES).optional().default("active"),
  location:           z.string().max(200).nullable().optional(),
  serialNumber:       z.string().max(100).nullable().optional(),
  notes:              z.string().max(1000).nullable().optional(),
});

export const updateFixedAssetSchema = insertFixedAssetSchema.partial();

export const runDepreciationSchema = z.object({
  assetId:    z.number().int().positive().optional(),
  periodDate: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
});

export const postDepreciationSchema = z.object({
  entryIds: z.array(z.number().int().positive()).min(1),
});

// ── TS types ──────────────────────────────────────────────────────────────────

export type FixedAsset               = typeof fixedAssets.$inferSelect;
export type AssetDepreciationEntry   = typeof assetDepreciationEntries.$inferSelect;
export type InsertFixedAsset         = z.infer<typeof insertFixedAssetSchema>;
export type RunDepreciation          = z.infer<typeof runDepreciationSchema>;
