import { and, eq, sql } from "drizzle-orm";
import { db, permissions, roles, saasFeatures } from "@workspace/db";

export type PermissionFlags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const ALL: PermissionFlags = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const NONE: PermissionFlags = { canView: false, canCreate: false, canEdit: false, canDelete: false };

/**
 * Canonical RBAC module keys.
 *
 * These are intended to match:
 * - SaaS `saas_features.key` (feature gating)
 * - Frontend `featureKey` (ProtectedRoute + nav filtering)
 * - RBAC `permissions.module` (role permissions)
 *
 * We still accept legacy/human-readable module names via alias matching.
 */
const MODULE_ALIASES: Record<string, string[]> = {
  // Finance & Tax
  accounts_receivable: ["Accounts Receivable", "AR", "accounts-receivable"],
  accounts_payable: ["Accounts Payable", "AP", "accounts-payable"],
  banking: ["Banking", "Bank Reconciliation", "Bank Reconciliations", "bank-reconciliation"],
  fixed_assets: ["Fixed Assets", "Assets", "fixed-assets"],
  asset_depreciation: ["Asset Depreciation", "Depreciation", "asset-depreciation"],
  gst: ["GST", "GST & Tax", "GST and Tax", "GST Tax", "gst_tax", "gst-returns", "GST Returns", "gst_returns"],
  tds: ["TDS", "TDS & TCS", "TDS and TCS", "TDS/TCS", "tds_tcs", "tds-tcs"],
  einvoicing: ["E-Invoicing", "E Invoicing", "EInvoice", "E-Invoice", "e-invoicing", "e_invoicing"],
  eway_bill: ["E-Way Bill", "E Way Bill", "EWay Bill", "e-way-bill", "e_way_bill"],
  budget_cost: [
    "Budget & Cost Accounting",
    "Advanced Budget & Forecasting",
    "Budget Cost",
    "budget-cost",
    "budget_cost_accounting",
    "advanced_budget_forecasting",
    "Budget & Forecasting",
  ],
  cash_treasury: [
    "Cash & Treasury Management",
    "Advanced Treasury Management",
    "Cash Treasury",
    "cash-treasury",
    "cash_treasury_management",
    "Advanced Treasury",
  ],
  finance: ["Finance", "Financial Accounting", "finance", "financial-accounting"],

  // Operations / common ERP modules
  purchase: ["Purchase", "Purchase & Procurement", "Purchase and Procurement", "purchase-procurement"],
  purchase_source_to_pay: ["Source To Pay", "Purchase Source To Pay", "Source-to-Pay", "purchase_source_to_pay"],
  inventory: ["Inventory", "inventory"],
  manufacturing: ["Manufacturing", "manufacturing"],
  wms: ["WMS", "Advanced WMS", "Warehouse", "warehouse_management", "advanced_wms", "warehouse"],
  crm: ["CRM", "Advanced CRM", "crm"],
  quality: ["Quality", "Quality Management", "quality", "quality_management"],
  maintenance: ["Maintenance", "Maintenance Management", "maintenance", "maintenance_management"],
  expense: ["Expense", "Expense Management", "expense", "expense_management"],
  order_management: ["Order Management", "Sales", "sales", "order-management"],
  projects: ["Projects", "projects"],
  hr: ["HR", "HR & Payroll", "HR and Payroll", "hr-payroll"],
  reports: ["Reports", "Reports & Analytics", "Analytics", "reports-analytics"],
  ai: ["AI", "AI Assistant", "ai_assistant"],
  ai_bi: ["AI BI", "AI Business Intelligence", "ai_bi", "ai-bi"],
  documents: ["Documents", "documents"],
  workflow: ["Workflow", "Workflow Automation", "workflow-automation"],
  notifications: ["Notifications", "Notification & Communication Center", "notifications"],
  master_data: ["Master Data", "Master Data Management", "master-data"],
  multi_entity: ["Multi-Entity", "Multi-Entity Control", "Multi Entity", "multi-entity"],
  settings: ["Settings", "settings"],

  // Platform/admin
  saas: ["SaaS Platform", "SaaS", "saas"],
  roles: ["Roles", "Roles & Permissions", "roles"],
  users: ["Users", "User Management", "users"],
  audit: ["Audit", "Audit Logs", "Audit Logs Module", "audit-logs"],
  billing: ["Billing", "Subscription & Billing", "Subscription and Billing", "billing"],
  social_media: ["Social Media", "Social Media Integration", "Integrations", "integrations"],
};

const CANONICAL_KEYS = new Set(Object.keys(MODULE_ALIASES));

function slugifyLoose(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalizeModuleKey(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (CANONICAL_KEYS.has(lower)) return lower;

  // Direct alias match in MODULE_ALIASES
  for (const [key, aliases] of Object.entries(MODULE_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === lower)) {
      return key;
    }
  }

  const slug = slugifyLoose(raw);
  // Common key normalizations for historical naming
  if (slug === "e_invoicing" || slug === "e_invoice") return "einvoicing";
  if (slug === "e_way_bill" || slug === "eway_bill") return "eway_bill";
  if (slug === "bank_reconciliation" || slug === "bank_reconciliations") return "banking";
  if (slug === "gst_tax" || slug === "gst_and_tax" || slug === "gst__tax" || slug === "gst_returns" || slug === "gst_return") return "gst";
  if (slug === "tds_tcs" || slug === "tds_and_tcs" || slug === "tds_tcs_management") return "tds";
  if (slug === "cash_treasury_management" || slug === "cash_and_treasury_management" || slug === "advanced_treasury_management" || slug === "advanced_treasury") return "cash_treasury";
  if (slug === "budget_cost_accounting" || slug === "budget_and_cost_accounting" || slug === "advanced_budget_forecasting" || slug === "advanced_budget_and_forecasting") return "budget_cost";
  if (slug === "financial_accounting") return "finance";
  if (slug === "quality_management") return "quality";
  if (slug === "maintenance_management") return "maintenance";
  if (slug === "expense_management") return "expense";
  if (slug === "ar") return "accounts_receivable";
  if (slug === "ap") return "accounts_payable";

  if (CANONICAL_KEYS.has(slug)) return slug;

  // Try slug with 'and' removed
  const noAndSlug = slug.replace(/_and_/g, "_");
  if (CANONICAL_KEYS.has(noAndSlug)) return noAndSlug;

  // Last-resort: compare "collapsed" keys (remove underscores) for close matches.
  const collapsed = slug.replace(/_/g, "");
  for (const key of CANONICAL_KEYS) {
    if (key.replace(/_/g, "") === collapsed) return key;
  }

  return slug || lower;
}

function moduleAliasCandidates(moduleKeyOrLabel: string): string[] {
  const canonical = canonicalizeModuleKey(moduleKeyOrLabel);
  const base = MODULE_ALIASES[canonical] ?? [];

  const candidates = new Set<string>([
    moduleKeyOrLabel,
    canonical,
    canonical.replace(/_/g, "-"),
    slugifyLoose(moduleKeyOrLabel),
    ...base,
  ]);

  // Expand aliases into common slug variants.
  for (const alias of base) {
    candidates.add(alias);
    candidates.add(slugifyLoose(alias));
    candidates.add(slugifyLoose(alias).replace(/_/g, "-"));
  }

  // Remove empties
  return Array.from(candidates).map((v) => String(v).trim()).filter(Boolean);
}

export async function resolveRoleModulePermissions(
  roleId: number | null,
  moduleKeyOrLabel: string,
): Promise<PermissionFlags> {
  if (roleId === null) return NONE;

  const [role] = await db
    .select({
      id: roles.id,
      orgId: roles.orgId,
      name: roles.name,
      isSystem: roles.isSystem,
    })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  // Unknown role id -> unprivileged.
  if (!role) return NONE;

  // Global platform super admin
  if (role.isSystem) return ALL;

  const canonical = canonicalizeModuleKey(moduleKeyOrLabel);
  const candidates = moduleAliasCandidates(moduleKeyOrLabel);
  if (candidates.length === 0) return NONE;

  const orgId = role.orgId;

  // Check subscription feature gating for the organization if orgId is present
  if (orgId) {
    const featureKey = canonical === "asset_depreciation" ? "fixed_assets" : canonical;

    const [feature] = await db
      .select({ id: saasFeatures.id, isActive: saasFeatures.isActive })
      .from(saasFeatures)
      .where(eq(saasFeatures.key, featureKey))
      .limit(1);

    if (feature) {
      const accessResult = await db.execute(sql`
        SELECT f.is_active,
          COALESCE(tf.enabled, pf.enabled, NULL) AS enabled
        FROM saas_features f
        LEFT JOIN saas_tenant_features tf
          ON tf.feature_id = f.id AND tf.org_id = ${orgId}
        LEFT JOIN LATERAL (
          SELECT plan_id
          FROM saas_subscriptions
          WHERE org_id = ${orgId}
            AND status IN ('active', 'trial')
            AND (expires_at IS NULL OR expires_at > now())
            AND (status <> 'trial' OR trial_ends_at IS NULL OR trial_ends_at > now())
          ORDER BY started_at DESC NULLS LAST, id DESC
          LIMIT 1
        ) subscription ON true
        LEFT JOIN saas_plan_features pf
          ON pf.feature_id = f.id AND pf.plan_id = subscription.plan_id
        WHERE f.id = ${feature.id}
        LIMIT 1
      `);
      const access = ((accessResult as any).rows ?? accessResult)[0] as { enabled?: boolean | null; is_active?: boolean | null } | undefined;

      const explicitlyBlocked = !feature.isActive || access?.enabled === false;
      if (explicitlyBlocked) {
        return NONE;
      }
    }
  }

  // If role is an authorized Administrator for the organization:
  const roleNameLower = (role.name ?? "").trim().toLowerCase();
  const isAdminRole = ["admin", "administrator", "company admin", "owner"].includes(roleNameLower);
  if (isAdminRole) {
    return ALL;
  }

  // For non-admin roles, query granular permissions from permissions table:
  const lowerCandidates = Array.from(new Set(candidates.map((c) => c.toLowerCase())));

  const moduleMatch = sql`lower(${permissions.module}) in (${sql.join(
    lowerCandidates.map((c) => sql`${c}`),
    sql`, `,
  )})`;

  const [perm] = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.roleId, roleId), moduleMatch))
    .limit(1);

  if (!perm) return NONE;

  return {
    canView: Boolean(perm.canView),
    canCreate: Boolean(perm.canCreate),
    canEdit: Boolean(perm.canEdit),
    canDelete: Boolean(perm.canDelete),
  };
}

export function canonicalModuleKey(moduleKeyOrLabel: string): string {
  return canonicalizeModuleKey(moduleKeyOrLabel);
}

export function getAllCanonicalModuleKeys(): string[] {
  return Array.from(CANONICAL_KEYS);
}
