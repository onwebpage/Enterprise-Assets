/**
 * Normalize permission module keys to match canonical RBAC keys.
 *
 * This script updates existing permissions.module values to use the canonical
 * keys defined in rbac.ts MODULE_ALIASES, ensuring consistent permission matching.
 *
 * Run with: node scripts/normalize-permission-modules.mjs
 */
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simplified version of canonicalizeModuleKey from rbac.ts
const MODULE_ALIASES = {
  accounts_receivable: ["Accounts Receivable", "AR", "accounts-receivable"],
  accounts_payable: ["Accounts Payable", "AP", "accounts-payable"],
  banking: ["Banking", "Bank Reconciliation", "Bank Reconciliations"],
  fixed_assets: ["Fixed Assets", "Assets", "fixed-assets"],
  asset_depreciation: ["Asset Depreciation", "Depreciation"],
  gst: ["GST", "GST & Tax", "GST and Tax", "GST Tax", "gst_tax"],
  tds: ["TDS", "TDS & TCS", "TDS and TCS", "TDS/TCS", "tds_tcs"],
  einvoicing: ["E-Invoicing", "E Invoicing", "EInvoice", "E-Invoice", "e-invoicing", "e_invoicing"],
  eway_bill: ["E-Way Bill", "E Way Bill", "EWay Bill", "e-way-bill", "e_way_bill"],
  budget_cost: ["Budget & Cost Accounting", "Advanced Budget & Forecasting", "Budget Cost", "budget-cost"],
  cash_treasury: ["Cash & Treasury Management", "Advanced Treasury Management", "Cash Treasury", "cash-treasury"],
  finance: ["Finance", "Financial Accounting", "finance"],
  purchase: ["Purchase", "Purchase & Procurement", "Purchase and Procurement", "purchase-procurement"],
  inventory: ["Inventory"],
  manufacturing: ["Manufacturing"],
  hr: ["HR", "HR & Payroll", "HR and Payroll"],
  reports: ["Reports", "Reports & Analytics", "Analytics"],
  documents: ["Documents"],
  workflow: ["Workflow", "Workflow Automation"],
  master_data: ["Master Data", "Master Data Management"],
  projects: ["Projects"],
  order_management: ["Order Management", "Sales", "sales", "order-management"],
  customer_portal: ["Customer Portal"],
  vendor_portal: ["Vendor Portal"],
};

function slugifyLoose(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalizeModuleKey(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  const CANONICAL_KEYS = new Set(Object.keys(MODULE_ALIASES));
  if (CANONICAL_KEYS.has(lower)) return lower;

  const slug = slugifyLoose(raw);
  // Common key normalizations
  if (slug === "e_invoicing") return "einvoicing";
  if (slug === "e_way_bill") return "eway_bill";
  if (slug === "bank_reconciliation") return "banking";
  if (slug === "gst_tax" || slug === "gst_and_tax" || slug === "gst__tax") return "gst";
  if (slug === "tds_tcs" || slug === "tds_and_tcs" || slug === "tds_tcs_management") return "tds";
  if (slug === "cash_treasury_management") return "cash_treasury";
  if (slug === "budget_cost_accounting" || slug === "advanced_budget_forecasting") return "budget_cost";

  if (CANONICAL_KEYS.has(slug)) return slug;

  // Last-resort: compare collapsed keys
  const collapsed = slug.replace(/_/g, "");
  for (const key of CANONICAL_KEYS) {
    if (key.replace(/_/g, "") === collapsed) return key;
  }

  return slug || lower;
}

async function main() {
  console.log("🔍 Checking permissions table for module key mismatches...\n");

  try {
    // Get all distinct module values from permissions
    const result = await pool.query(
      `SELECT module, COUNT(*)::int as count 
       FROM permissions 
       WHERE module IS NOT NULL 
       GROUP BY module 
       ORDER BY module`
    );

    const modules = result.rows;
    console.log(`Found ${modules.length} distinct module keys in permissions table:\n`);

    const updates = [];

    for (const { module, count } of modules) {
      const canonical = canonicalizeModuleKey(module);
      
      if (canonical !== module.toLowerCase()) {
        console.log(`  ⚠️  "${module}" → "${canonical}" (${count} rows)`);
        updates.push({ oldKey: module, newKey: canonical, count });
      } else {
        console.log(`  ✓  "${module}" is already canonical (${count} rows)`);
      }
    }

    if (updates.length === 0) {
      console.log("\n✅ All permission module keys are already canonical. No updates needed.");
      await pool.end();
      return;
    }

    console.log(`\n📝 Found ${updates.length} module keys that need normalization.`);
    console.log("   Total rows to update:", updates.reduce((sum, u) => sum + u.count, 0));
    
    // Perform updates
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      for (const { oldKey, newKey, count } of updates) {
        const result = await client.query(
          `UPDATE permissions SET module = $1 WHERE module = $2`,
          [newKey, oldKey]
        );
        console.log(`  ✓ Updated "${oldKey}" → "${newKey}" (${result.rowCount} rows)`);
      }
      
      await client.query("COMMIT");
      console.log("\n✅ Successfully normalized all permission module keys!");
      
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("\n❌ Failed to update permissions:", error);
      throw error;
    } finally {
      client.release();
    }

    // Show final state
    console.log("\n📊 Final module keys in permissions table:");
    const finalResult = await pool.query(
      `SELECT module, COUNT(*)::int as count 
       FROM permissions 
       WHERE module IS NOT NULL 
       GROUP BY module 
       ORDER BY module`
    );
    
    for (const { module, count } of finalResult.rows) {
      console.log(`  • ${module}: ${count} rows`);
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
