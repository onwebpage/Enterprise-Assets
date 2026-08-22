/**
 * Seed demo Budget & Cost data — cost centres, profit centres, budgets, product costings, variances, forecasts.
 * Run: pnpm --filter @workspace/db run seed:budget-cost
 * Safe to re-run: cleans up existing budget & cost data for the org first.
 */
import { db, organizations } from "./index";
import {
  costCentres, profitCentres, budgets, budgetLines,
  productCostings, productCostingLines, costVariances, forecasts, forecastLines,
} from "./schema/budgetCost";
import { departments } from "./schema/departments";
import { chartOfAccounts } from "./schema/chartOfAccounts";
import { invProducts } from "./schema/inventory";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding Budget & Cost demo data...");

  // ── Find the demo org (one that owns both departments and products) ───────
  const productOrgs = await db
    .select({ orgId: invProducts.orgId, count: sql<number>`count(*)` })
    .from(invProducts)
    .groupBy(invProducts.orgId)
    .orderBy(sql`count(*) desc`)
    .limit(20);
  let orgId: number | undefined;
  for (const row of productOrgs) {
    if (row.orgId == null) continue;
    const hasDept = await db.select({ id: departments.id }).from(departments).where(eq(departments.orgId, row.orgId)).limit(1);
    if (hasDept.length) { orgId = row.orgId; break; }
  }
  orgId ??= (await db.select().from(organizations).limit(1))[0]?.id;
  console.log("Selected org:", orgId);
  if (!orgId) { console.error("No org found — run seed first"); process.exit(1); }

  // ── Clean up existing budget & cost data for this org ─────────────────────
  await db.delete(forecastLines);
  await db.delete(forecasts).where(eq(forecasts.orgId, orgId));
  await db.delete(costVariances).where(eq(costVariances.orgId, orgId));
  await db.delete(productCostingLines);
  await db.delete(productCostings).where(eq(productCostings.orgId, orgId));
  await db.delete(budgetLines);
  await db.delete(budgets).where(eq(budgets.orgId, orgId));
  await db.delete(profitCentres).where(eq(profitCentres.orgId, orgId));
  await db.delete(costCentres).where(eq(costCentres.orgId, orgId));

  // ── Reference data (must exist from seed + seed:inventory) ───────────────
  const depts = await db.select().from(departments).where(eq(departments.orgId, orgId));
  let accounts = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.orgId, orgId)).limit(20);
  const products = await db.select().from(invProducts).where(eq(invProducts.orgId, orgId));
  if (!depts.length || !products.length) {
    console.error("No departments/products found — run seed and seed:inventory first");
    process.exit(1);
  }
  // If no chart of accounts exist yet, create minimal Income/Expense accounts.
  if (!accounts.length) {
    const created = await db.insert(chartOfAccounts).values([
      { orgId, code: "4000", name: "Sales Revenue", type: "Income", normalBalance: "Credit", description: "Operating revenue", status: "active" },
      { orgId, code: "5000", name: "Operating Expenses", type: "Expense", normalBalance: "Debit", description: "General operating expenses", status: "active" },
      { orgId, code: "6000", name: "Other Income", type: "Income", normalBalance: "Credit", description: "Non-operating income", status: "active" },
    ]).returning();
    accounts = created;
  }
  const engDept = depts[0]!;
  const accRevenue = accounts.find((a) => a.type === "Income") ?? accounts[0]!;
  const accExpense = accounts.find((a) => a.type === "Expense") ?? accounts[1] ?? accounts[0]!;
  const product = products[0]!;

  // ── Cost Centres ───────────────────────────────────────────────────────────
  const ccList = await db.insert(costCentres).values([
    { orgId, code: "CC-IT", name: "Information Technology", departmentId: engDept.id, manager: "Anna Park", description: "Infrastructure and software costs", isActive: true },
    { orgId, code: "CC-MKT", name: "Marketing", departmentId: depts[1]?.id ?? null, manager: "Sarah Kim", description: "Advertising, campaigns and brand", isActive: true },
    { orgId, code: "CC-OPS", name: "Operations", departmentId: depts[3]?.id ?? null, manager: "Mike Roberts", description: "Warehouse and fulfilment costs", isActive: true },
    { orgId, code: "CC-FIN", name: "Finance & Admin", departmentId: depts[2]?.id ?? null, manager: "Linda Chen", description: "Finance, accounting and admin", isActive: true },
  ]).returning();
  console.log("✓ Cost centres seeded");

  // ── Profit Centres ─────────────────────────────────────────────────────────
  const pcList = await db.insert(profitCentres).values([
    { orgId, code: "PC-HW", name: "Hardware Products", manager: "Tom Brown", description: "Hardware product lines", isActive: true },
    { orgId, code: "PC-SW", name: "Software & Services", manager: "Anna Park", description: "Software licenses and services", isActive: true },
    { orgId, code: "PC-NA", name: "North America", parentId: null, manager: "Sarah Kim", description: "North America region", isActive: true },
    { orgId, code: "PC-EU", name: "Europe", parentId: null, manager: "James Doyle", description: "Europe region", isActive: true },
  ]).returning();
  console.log("✓ Profit centres seeded");

  // ── Budgets ────────────────────────────────────────────────────────────────
  const [budget] = await db.insert(budgets).values({
    orgId, budgetNumber: "BUD-0001", name: "FY2026 Operating Budget", fiscalYear: 2026,
    periodType: "monthly", budgetType: "operating", status: "active",
    costCentreId: ccList[0].id, profitCentreId: pcList[0].id,
    totalAmount: "2400000", notes: "Annual operating budget for FY2026",
  }).returning();

  const monthlyRevenue = 180000;
  const monthlyExpense = 20000;
  for (let i = 0; i < 12; i++) {
    await db.insert(budgetLines).values([
      { budgetId: budget.id, accountId: accRevenue.id, periodIndex: i, amount: monthlyRevenue.toString(), description: `Revenue budget month ${i + 1}` },
      { budgetId: budget.id, accountId: accExpense.id, periodIndex: i, amount: monthlyExpense.toString(), description: `Expense budget month ${i + 1}` },
    ]);
  }
  console.log("✓ Budgets seeded");

  // ── Product Costings ───────────────────────────────────────────────────────
  const [costing] = await db.insert(productCostings).values({
    orgId, productId: product.id, version: "v1", standardCost: "1250.00", lastActualCost: "1280.00",
    isActive: true, notes: "Standard cost card for demo product",
  }).returning();

  await db.insert(productCostingLines).values([
    { costingId: costing.id, componentName: "Raw materials", costType: "material", quantity: "1", unitCost: "850.00", amount: "850.00", description: "Primary material cost" },
    { costingId: costing.id, componentName: "Direct labour (2h)", costType: "labour", quantity: "2", unitCost: "100.00", amount: "200.00", description: "2 hours at $100/hr" },
    { costingId: costing.id, componentName: "Manufacturing overhead", costType: "overhead", quantity: "1", unitCost: "200.00", amount: "200.00", description: "Allocated overhead" },
  ]);
  console.log("✓ Product costings seeded");

  // ── Variances ──────────────────────────────────────────────────────────────
  await db.insert(costVariances).values([
    { orgId, varianceNumber: "VAR-0001", varianceType: "price", productId: product.id, accountId: accExpense.id, costCentreId: ccList[0].id, profitCentreId: pcList[0].id, period: "2026-07", standardAmount: "1250", actualAmount: "1280", varianceAmount: "30", variancePct: "2.40", reason: "Supplier price increase", action: "Negotiate with alternative supplier", status: "investigating" },
    { orgId, varianceNumber: "VAR-0002", varianceType: "sales_volume", productId: product.id, accountId: accRevenue.id, costCentreId: null, profitCentreId: pcList[0].id, period: "2026-07", standardAmount: "180000", actualAmount: "165000", varianceAmount: "-15000", variancePct: "-8.33", reason: "Lower than expected demand", action: "Marketing campaign planned for Q3", status: "open" },
  ]);
  console.log("✓ Variances seeded");

  // ── Forecasts ──────────────────────────────────────────────────────────────
  const [forecast] = await db.insert(forecasts).values({
    orgId, forecastNumber: "FCST-0001", name: "FY2027 Revenue & Cost Forecast", method: "manual",
    status: "approved", currency: "USD", notes: "12-month rolling forecast",
  }).returning();

  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const periodStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const seasonal = 1 + 0.1 * Math.sin((d.getMonth() + 1) / 12 * Math.PI * 2);
    await db.insert(forecastLines).values([
      { forecastId: forecast.id, accountId: accRevenue.id, period: periodStr, amount: (190000 * seasonal).toFixed(2), isActual: i === 0, notes: "Revenue forecast" },
      { forecastId: forecast.id, accountId: accExpense.id, period: periodStr, amount: "22000", isActual: i === 0, notes: "Cost forecast" },
    ]);
  }
  console.log("✓ Forecasts seeded");

  console.log("\n✅ Budget & Cost demo data seeded successfully!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });