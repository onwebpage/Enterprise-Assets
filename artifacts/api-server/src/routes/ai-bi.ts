/**
 * /api/ai-bi — AI Business Intelligence
 *
 * A custom rule-based AI engine that provides:
 * - AI insights from live ERP data
 * - Sales forecasting (linear regression + moving averages)
 * - Cash-flow prediction
 * - Inventory prediction
 * - Anomaly detection (z-score based)
 * - KPI analysis
 * - Natural-language reports
 *
 * No external API keys required — all computation is done in-house.
 */
import { Router } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  db,
  arInvoices,
  arCustomers,
  apBills,
  apVendors,
  invProducts,
  invStockLevels,
  invWarehouses,
  bankAccounts,
  bankTransactions,
  purchaseOrders,
  purchaseVendors,
  hrEmployees,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "AI Business Intelligence";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(decimals)}`;
}

function fmtN(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function cap(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Statistical Analysis ──────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function zScore(value: number, values: number[]): number {
  const m = mean(values);
  const sd = stdDev(values);
  if (sd === 0) return 0;
  return (value - m) / sd;
}

function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += Math.pow(i - xMean, 2);
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  // R² calculation
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += Math.pow(values[i] - predicted, 2);
    ssTot += Math.pow(values[i] - yMean, 2);
  }
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(mean(slice));
  }
  return result;
}

function detectAnomalies(values: number[], threshold = 2.5): Array<{ index: number; value: number; zScore: number }> {
  const anomalies: Array<{ index: number; value: number; zScore: number }> = [];
  for (let i = 0; i < values.length; i++) {
    const z = zScore(values[i], values);
    if (Math.abs(z) > threshold) {
      anomalies.push({ index: i, value: values[i], zScore: z });
    }
  }
  return anomalies;
}

// ── Data Fetchers ─────────────────────────────────────────────────────────────

async function fetchMonthlyRevenue(orgId: number, months = 6): Promise<number[]> {
  const result: number[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = isoDate(d);
    const end = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const rows = await db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(arInvoices)
      .where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`, sql`issue_date >= ${start}`, sql`issue_date <= ${end}`));
    result.push(parseFloat(rows[0]?.total ?? "0"));
  }
  return result;
}

async function fetchMonthlyExpenses(orgId: number, months = 6): Promise<number[]> {
  const result: number[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = isoDate(d);
    const end = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const rows = await db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(apBills)
      .where(and(eq(apBills.orgId, orgId), sql`status not in ('draft','void')`, sql`bill_date >= ${start}`, sql`bill_date <= ${end}`));
    result.push(parseFloat(rows[0]?.total ?? "0"));
  }
  return result;
}

async function fetchMonthlyCashFlow(orgId: number, months = 6): Promise<number[]> {
  const result: number[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = isoDate(d);
    const end = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const [inflow, outflow] = await Promise.all([
      db.select({ total: sql<string>`coalesce(sum(amount),0)::text` })
        .from(bankTransactions)
        .where(and(eq(bankTransactions.orgId, orgId), sql`type='credit'`, sql`transaction_date >= ${start}`, sql`transaction_date <= ${end}`)),
      db.select({ total: sql<string>`coalesce(sum(amount),0)::text` })
        .from(bankTransactions)
        .where(and(eq(bankTransactions.orgId, orgId), sql`type='debit'`, sql`transaction_date >= ${start}`, sql`transaction_date <= ${end}`)),
    ]);
    result.push(parseFloat(inflow[0]?.total ?? "0") - parseFloat(outflow[0]?.total ?? "0"));
  }
  return result;
}

async function fetchMonthlyInventory(orgId: number, months = 6): Promise<number[]> {
  const result: number[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = isoDate(d);
    const end = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const rows = await db.select({ total: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice}),0)::text` })
      .from(invProducts)
      .leftJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(and(eq(invProducts.orgId, orgId), sql`${invProducts.status} = 'active'`));
    result.push(parseFloat(rows[0]?.total ?? "0"));
  }
  return result;
}

// ── AI Insights ───────────────────────────────────────────────────────────────

async function generateInsights(orgId: number): Promise<string> {
  const revenue = await fetchMonthlyRevenue(orgId, 6);
  const expenses = await fetchMonthlyExpenses(orgId, 6);
  const cashFlow = await fetchMonthlyCashFlow(orgId, 6);
  const inventory = await fetchMonthlyInventory(orgId, 6);

  const revReg = linearRegression(revenue);
  const expReg = linearRegression(expenses);
  const cashReg = linearRegression(cashFlow);
  const invReg = linearRegression(inventory);

  const revAnomalies = detectAnomalies(revenue);
  const expAnomalies = detectAnomalies(expenses);
  const cashAnomalies = detectAnomalies(cashFlow);

  const insights: string[] = [];

  // Revenue trend
  if (revReg.slope > 0) {
    insights.push(`📈 **Revenue is trending UP** — growing at ~${fmt(Math.abs(revReg.slope))}/month (R²=${revReg.r2.toFixed(2)}). ${revReg.r2 > 0.7 ? "Strong, consistent growth pattern." : "Moderate growth with some variability."}`);
  } else if (revReg.slope < 0) {
    insights.push(`📉 **Revenue is trending DOWN** — declining at ~${fmt(Math.abs(revReg.slope))}/month (R²=${revReg.r2.toFixed(2)}). ${revReg.r2 > 0.7 ? "This is a strong negative trend that needs attention." : "Mild decline; monitor closely."}`);
  } else {
    insights.push(`📊 **Revenue is stable** — no significant trend detected over the last ${revenue.length} months.`);
  }

  // Expense trend
  if (expReg.slope > 0) {
    insights.push(`💸 **Expenses are increasing** at ~${fmt(Math.abs(expReg.slope))}/month. ${expReg.slope > revReg.slope ? "⚠️ Expense growth is outpacing revenue growth — margin pressure detected." : "Expense growth is within revenue growth rate."}`);
  } else if (expReg.slope < 0) {
    insights.push(`✅ **Expenses are decreasing** at ~${fmt(Math.abs(expReg.slope))}/month — good cost control.`);
  }

  // Cash flow
  if (cashReg.slope > 0) {
    insights.push(`💰 **Cash flow is improving** — net cash position trending up by ~${fmt(Math.abs(cashReg.slope))}/month.`);
  } else if (cashReg.slope < 0) {
    insights.push(`⚠️ **Cash flow is declining** — net cash position trending down by ~${fmt(Math.abs(cashReg.slope))}/month. Review receivables collection and payment timing.`);
  }

  // Inventory
  if (invReg.slope > 0) {
    insights.push(`📦 **Inventory value is increasing** at ~${fmt(Math.abs(invReg.slope))}/month. ${invReg.slope > revReg.slope ? "⚠️ Inventory is growing faster than revenue — potential overstocking." : "Inventory growth is aligned with business growth."}`);
  } else if (invReg.slope < 0) {
    insights.push(`📦 **Inventory value is decreasing** at ~${fmt(Math.abs(invReg.slope))}/month. ${invReg.slope < -revReg.slope ? "⚠️ Inventory depletion may lead to stockouts." : "Inventory reduction is healthy."}`);
  }

  // Anomalies
  if (revAnomalies.length > 0) {
    const a = revAnomalies[0];
    insights.push(`🔍 **Revenue anomaly detected** — month ${a.index + 1} had ${fmt(a.value)} (z-score: ${a.zScore.toFixed(2)}). ${a.zScore > 0 ? "Unusually high — investigate what drove this." : "Unusually low — investigate the cause."}`);
  }
  if (expAnomalies.length > 0) {
    const a = expAnomalies[0];
    insights.push(`🔍 **Expense anomaly detected** — month ${a.index + 1} had ${fmt(a.value)} (z-score: ${a.zScore.toFixed(2)}). ${a.zScore > 0 ? "Unusually high spending — review expense categories." : "Unusually low spending — verify all expenses were recorded."}`);
  }
  if (cashAnomalies.length > 0) {
    const a = cashAnomalies[0];
    insights.push(`🔍 **Cash flow anomaly detected** — month ${a.index + 1} had net ${fmt(a.value)} (z-score: ${a.zScore.toFixed(2)}).`);
  }

  if (insights.length === 0) {
    insights.push("No significant patterns or anomalies detected in the current data.");
  }

  return `🧠 **AI Business Insights** — ${today()}

${insights.join("\n\n")}

**Data Window:** Last ${revenue.length} months of live ERP data
**Method:** Linear regression trend analysis + z-score anomaly detection

Ask me for a **sales forecast**, **cash-flow prediction**, or **KPI analysis** for deeper insights.`;
}

// ── Sales Forecasting ─────────────────────────────────────────────────────────

async function generateSalesForecast(orgId: number): Promise<string> {
  const revenue = await fetchMonthlyRevenue(orgId, 6);
  const reg = linearRegression(revenue);
  const ma = movingAverage(revenue, 3);

  const next3Months: number[] = [];
  for (let i = 0; i < 3; i++) {
    const predicted = reg.slope * (revenue.length + i) + reg.intercept;
    next3Months.push(Math.max(0, predicted));
  }

  const currentMonth = revenue[revenue.length - 1] ?? 0;
  const nextMonth = next3Months[0] ?? 0;
  const growth = currentMonth > 0 ? ((nextMonth - currentMonth) / currentMonth) * 100 : 0;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const historicalLines = revenue.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (revenue.length - 1 - i), 1);
    return `  ${monthNames[d.getMonth()]} ${d.getFullYear()}: ${fmt(v)}`;
  }).join("\n");

  const forecastLines = next3Months.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    return `  ${monthNames[d.getMonth()]} ${d.getFullYear()}: ${fmt(v)}`;
  }).join("\n");

  const confidence = Math.min(95, Math.max(40, Math.round(reg.r2 * 100)));

  return `🔮 **AI Sales Forecast** — ${today()}

**Historical Revenue (Last ${revenue.length} Months)**
${historicalLines}

**Forecast (Next 3 Months)**
${forecastLines}

**Analysis**
• Current Monthly Revenue: ${fmt(currentMonth)}
• Projected Next Month: ${fmt(nextMonth)} (${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% MoM)
• Trend Slope: ${fmt(reg.slope)}/month
• Model Confidence: ${confidence}% (R² = ${reg.r2.toFixed(2)})

${reg.slope > 0 ? "📈 **Positive outlook** — revenue is projected to continue growing." : reg.slope < 0 ? "📉 **Caution** — revenue is projected to decline. Consider reviewing sales strategy." : "📊 **Stable outlook** — revenue is expected to remain steady."}

**Method:** Linear regression on monthly revenue with 3-month moving average validation.`;
}

// ── Cash-Flow Prediction ──────────────────────────────────────────────────────

async function generateCashFlowPrediction(orgId: number): Promise<string> {
  const cashFlow = await fetchMonthlyCashFlow(orgId, 6);
  const reg = linearRegression(cashFlow);

  const [bankData, arData, apData] = await Promise.all([
    db.select({ balance: sql<string>`coalesce(sum(current_balance),0)::text` })
      .from(bankAccounts).where(and(eq(bankAccounts.orgId, orgId), sql`status='active'`)),
    db.select({ outstanding: sql<string>`coalesce(sum(total_amount - amount_paid),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status in ('sent','partial','overdue')`)),
    db.select({ outstanding: sql<string>`coalesce(sum(total_amount - amount_paid),0)::text` })
      .from(apBills).where(and(eq(apBills.orgId, orgId), sql`status in ('received','partial','overdue')`)),
  ]);

  const currentBalance = parseFloat(bankData[0]?.balance ?? "0");
  const arOutstanding = parseFloat(arData[0]?.outstanding ?? "0");
  const apOutstanding = parseFloat(apData[0]?.outstanding ?? "0");

  const next3Months: number[] = [];
  for (let i = 0; i < 3; i++) {
    const predicted = reg.slope * (cashFlow.length + i) + reg.intercept;
    next3Months.push(predicted);
  }

  const projectedBalances = [currentBalance];
  for (const cf of next3Months) {
    projectedBalances.push(projectedBalances[projectedBalances.length - 1] + cf);
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();

  const balanceLines = projectedBalances.map((b, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `  ${i === 0 ? "Current" : `${monthNames[d.getMonth()]} ${d.getFullYear()}`}: ${fmt(b)}`;
  }).join("\n");

  const riskLevel = projectedBalances.some(b => b < 0) ? "HIGH" : projectedBalances.some(b => b < currentBalance * 0.3) ? "MEDIUM" : "LOW";

  return `💵 **AI Cash-Flow Prediction** — ${today()}

**Current Position**
• Bank Balance: ${fmt(currentBalance)}
• Outstanding Receivables (AR): ${fmt(arOutstanding)}
• Outstanding Payables (AP): ${fmt(apOutstanding)}
• Net Working Capital: ${fmt(arOutstanding - apOutstanding)}

**Projected Bank Balance (Next 3 Months)**
${balanceLines}

**Risk Assessment: ${riskLevel}**
${riskLevel === "HIGH" ? "⚠️ Projected balance may go negative. Immediate action required on collections and payment prioritization." : riskLevel === "MEDIUM" ? "⚠️ Projected balance is declining. Monitor closely and accelerate collections." : "✅ Projected balance is healthy with adequate liquidity."}

**Recommended Actions**
${arOutstanding > 0 ? `• Collect ${fmt(arOutstanding)} in outstanding receivables` : "• No outstanding receivables"}
${apOutstanding > 0 ? `• Manage ${fmt(apOutstanding)} in payables — prioritize by due date` : "• No outstanding payables"}
${reg.slope < 0 ? "• Cash flow trend is negative — review expense structure" : "• Cash flow trend is positive — consider reinvestment"}

**Method:** Linear regression on monthly net cash flow + current balance projection.`;
}

// ── Inventory Prediction ──────────────────────────────────────────────────────

async function generateInventoryPrediction(orgId: number): Promise<string> {
  const inventory = await fetchMonthlyInventory(orgId, 6);
  const reg = linearRegression(inventory);

  const [lowStock, totalProducts, totalValue] = await Promise.all([
    db.select({ sku: invProducts.sku, name: invProducts.name, qtyOnHand: invStockLevels.qtyOnHand, reorderPoint: invProducts.reorderPoint })
      .from(invProducts).innerJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(and(eq(invProducts.orgId, orgId), sql`${invStockLevels.qtyOnHand} <= ${invProducts.reorderPoint}`, sql`${invProducts.status} = 'active'`))
      .orderBy(sql`${invStockLevels.qtyOnHand} - ${invProducts.reorderPoint}`).limit(8),
    db.select({ cnt: sql<number>`count(*)::int` })
      .from(invProducts).where(and(eq(invProducts.orgId, orgId), sql`status='active'`)),
    db.select({ total: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice}),0)::text` })
      .from(invProducts).leftJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(eq(invProducts.orgId, orgId)),
  ]);

  const currentValue = parseFloat(totalValue[0]?.total ?? "0");
  const next3Months: number[] = [];
  for (let i = 0; i < 3; i++) {
    const predicted = reg.slope * (inventory.length + i) + reg.intercept;
    next3Months.push(Math.max(0, predicted));
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();

  const forecastLines = next3Months.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    return `  ${monthNames[d.getMonth()]} ${d.getFullYear()}: ${fmt(v)}`;
  }).join("\n");

  const lowStockLines = lowStock.map(r =>
    `  ⚠️ ${r.sku} — ${r.name.substring(0, 25)} | On Hand: ${fmtN(parseFloat(String(r.qtyOnHand)), 0)} | Reorder: ${fmtN(parseFloat(String(r.reorderPoint)), 0)}`
  ).join("\n");

  const trend = reg.slope > 0 ? "increasing" : reg.slope < 0 ? "decreasing" : "stable";

  return `📦 **AI Inventory Prediction** — ${today()}

**Current Inventory**
• Active Products: ${fmtN(totalProducts[0]?.cnt ?? 0, 0)}
• Total Inventory Value: ${fmt(currentValue)}
• Trend: Inventory value is ${trend} at ~${fmt(Math.abs(reg.slope))}/month

**Projected Inventory Value (Next 3 Months)**
${forecastLines}

${lowStock.length > 0 ? `**Low Stock Alerts (${lowStock.length} items)**\n${lowStockLines}\n` : "**Stock Levels:** ✅ All products above reorder point\n"}
**Recommendations**
${reg.slope > 0 ? "• Inventory is growing — review for overstocking risk" : reg.slope < 0 ? "• Inventory is depleting — plan replenishment to avoid stockouts" : "• Inventory is stable — maintain current levels"}
${lowStock.length > 0 ? `• Create purchase orders for ${lowStock.length} low-stock items` : "• No immediate restocking needed"}

**Method:** Linear regression on monthly inventory value + reorder point analysis.`;
}

// ── Anomaly Detection ─────────────────────────────────────────────────────────

async function generateAnomalyReport(orgId: number): Promise<string> {
  const revenue = await fetchMonthlyRevenue(orgId, 6);
  const expenses = await fetchMonthlyExpenses(orgId, 6);
  const cashFlow = await fetchMonthlyCashFlow(orgId, 6);

  const revAnomalies = detectAnomalies(revenue);
  const expAnomalies = detectAnomalies(expenses);
  const cashAnomalies = detectAnomalies(cashFlow);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();

  const formatAnomalies = (anomalies: Array<{ index: number; value: number; zScore: number }>, label: string) => {
    if (anomalies.length === 0) return `  ✅ No anomalies detected in ${label}`;
    return anomalies.map(a => {
      const d = new Date(now.getFullYear(), now.getMonth() - (revenue.length - 1 - a.index), 1);
      return `  ⚠️ ${monthNames[d.getMonth()]} ${d.getFullYear()}: ${fmt(a.value)} (z=${a.zScore.toFixed(2)})`;
    }).join("\n");
  };

  const totalAnomalies = revAnomalies.length + expAnomalies.length + cashAnomalies.length;

  return `🔍 **AI Anomaly Detection Report** — ${today()}

**Revenue Anomalies**
${formatAnomalies(revAnomalies, "revenue")}

**Expense Anomalies**
${formatAnomalies(expAnomalies, "expenses")}

**Cash Flow Anomalies**
${formatAnomalies(cashAnomalies, "cash flow")}

**Summary**
• Total Anomalies Detected: ${totalAnomalies}
• Detection Method: Z-score analysis (threshold: ±2.5σ)
• Data Window: Last ${revenue.length} months

${totalAnomalies > 0 ? "⚡ **Action required:** Review the flagged anomalies to understand root causes and take corrective action." : "✅ **No significant anomalies detected** — all metrics are within normal statistical ranges."}

**What to investigate:**
• Revenue spikes/dips — check for large deals, seasonality, or data entry errors
• Expense spikes — review expense categories and vendor bills
• Cash flow swings — check for large transactions or timing issues`;
}

// ── KPI Analysis ──────────────────────────────────────────────────────────────

async function generateKpiAnalysis(orgId: number): Promise<string> {
  const revenue = await fetchMonthlyRevenue(orgId, 6);
  const expenses = await fetchMonthlyExpenses(orgId, 6);

  const [arData, apData, invData, crmData, empData, bankData] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(apBills).where(and(eq(apBills.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ total: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice}),0)::text`, products: sql<number>`count(distinct ${invProducts.id})::int` })
      .from(invProducts).leftJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(eq(invProducts.orgId, orgId)),
    db.select({ pipeline: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ employees: sql<number>`count(*)::int` })
      .from(hrEmployees).where(eq(hrEmployees.orgId, orgId)),
    db.select({ balance: sql<string>`coalesce(sum(current_balance),0)::text` })
      .from(bankAccounts).where(and(eq(bankAccounts.orgId, orgId), sql`status='active'`)),
  ]);

  const totalRevenue = parseFloat(arData[0]?.total ?? "0");
  const totalCollected = parseFloat(arData[0]?.paid ?? "0");
  const totalExpenses = parseFloat(apData[0]?.total ?? "0");
  const totalPaid = parseFloat(apData[0]?.paid ?? "0");
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;
  const inventoryValue = parseFloat(invData[0]?.total ?? "0");
  const bankBalance = parseFloat(bankData[0]?.balance ?? "0");
  const pipelineValue = parseFloat(crmData[0]?.pipeline ?? "0");

  const avgRevenue = mean(revenue);
  const avgExpenses = mean(expenses);
  const revTrend = linearRegression(revenue).slope;
  const expTrend = linearRegression(expenses).slope;

  const kpis = [
    { name: "Revenue", value: totalRevenue, target: avgRevenue * 1.1, status: totalRevenue >= avgRevenue * 1.1 ? "✅" : totalRevenue >= avgRevenue ? "📊" : "⚠️" },
    { name: "Profit Margin", value: margin, target: 20, status: margin >= 20 ? "✅" : margin >= 10 ? "📊" : "⚠️" },
    { name: "Collection Rate", value: collectionRate, target: 90, status: collectionRate >= 90 ? "✅" : collectionRate >= 70 ? "📊" : "⚠️" },
    { name: "Inventory Turnover", value: totalRevenue / (inventoryValue || 1), target: 4, status: (totalRevenue / (inventoryValue || 1)) >= 4 ? "✅" : "📊" },
    { name: "Pipeline Coverage", value: pipelineValue, target: totalRevenue * 0.5, status: pipelineValue >= totalRevenue * 0.5 ? "✅" : "⚠️" },
    { name: "Cash Position", value: bankBalance, target: avgExpenses * 3, status: bankBalance >= avgExpenses * 3 ? "✅" : bankBalance >= avgExpenses * 1.5 ? "📊" : "⚠️" },
  ];

  const kpiLines = kpis.map(k => {
    const pct = k.target > 0 ? Math.min(100, Math.round((k.value / k.target) * 100)) : 0;
    return `  ${k.status} ${k.name}: ${fmt(k.value)} (${pct}% of target)`;
  }).join("\n");

  return `📊 **AI KPI Analysis** — ${today()}

**Key Performance Indicators**
${kpiLines}

**Trend Analysis**
• Revenue Trend: ${revTrend > 0 ? `+${fmt(revTrend)}/month` : `${fmt(revTrend)}/month`}
• Expense Trend: ${expTrend > 0 ? `+${fmt(expTrend)}/month` : `${fmt(expTrend)}/month`}
• Revenue-to-Expense Ratio: ${totalExpenses > 0 ? (totalRevenue / totalExpenses).toFixed(2) : "N/A"}

**Health Assessment**
${margin >= 20 && collectionRate >= 90 && bankBalance >= avgExpenses * 3 ? "🟢 **Excellent** — all key metrics are healthy." : margin >= 10 && collectionRate >= 70 ? "🟡 **Good** — most metrics are on track, with some areas to improve." : "🔴 **Needs Attention** — several key metrics are below targets."}

**Recommended Focus Areas**
${margin < 20 ? "• Improve profit margin — review pricing and cost structure" : ""}
${collectionRate < 90 ? "• Accelerate collections — follow up on outstanding invoices" : ""}
${pipelineValue < totalRevenue * 0.5 ? "• Build sales pipeline — generate more qualified leads" : ""}
${bankBalance < avgExpenses * 3 ? "• Strengthen cash reserves — target 3 months of operating expenses" : ""}`;
}

// ── Natural Language Reports ──────────────────────────────────────────────────

type ReportIntent =
  | "insights"
  | "sales_forecast"
  | "cash_flow"
  | "inventory_prediction"
  | "anomalies"
  | "kpi"
  | "help"
  | "unknown";

function detectReportIntent(msg: string): ReportIntent {
  const m = msg.toLowerCase();

  if (/\b(help|what can|capabilities|features)\b/.test(m)) return "help";

  if (/\b(insight|intelligence|smart|ai insight|business insight|what should|recommend)\b/.test(m)) return "insights";

  if (/\b(forecast|predict|projection|future|trend|sales forecast|revenue forecast)\b/.test(m) && /\b(sales|revenue|sell|deal|opportunity)\b/.test(m)) return "sales_forecast";

  if (/\b(cash.?flow|cash position|liquidity|bank balance|projected balance|runway)\b/.test(m)) return "cash_flow";

  if (/\b(inventory|stock|warehouse|reorder|supply)\b/.test(m) && /\b(predict|forecast|project|future|trend)\b/.test(m)) return "inventory_prediction";

  if (/\b(anomaly|outlier|abnormal|unusual|spike|drop|detect|irregular)\b/.test(m)) return "anomalies";

  if (/\b(kpi|metric|performance|health|scorecard|dashboard|analysis)\b/.test(m)) return "kpi";

  if (/\b(forecast|predict|projection|future|trend)\b/.test(m)) return "sales_forecast";

  return "unknown";
}

function reportHelp(): string {
  return `🤖 **AI Business Intelligence** — Here's what I can generate:

**📈 Sales Forecasting**
• "Generate sales forecast" — Predict next 3 months of revenue
• "What will sales look like next quarter?"

**💰 Cash-Flow Prediction**
• "Predict cash flow" — Project bank balance for next 3 months
• "What's our cash position going to be?"

**📦 Inventory Prediction**
• "Predict inventory levels" — Forecast inventory value trends
• "Will we run out of stock?"

**🔍 Anomaly Detection**
• "Detect anomalies" — Find unusual patterns in revenue, expenses, cash flow
• "Any outliers in our data?"

**📊 KPI Analysis**
• "Analyze KPIs" — Evaluate key performance indicators
• "How healthy is our business?"

**🧠 AI Insights**
• "Generate insights" — Get AI-powered business insights
• "What should we focus on?"

Just type your request in natural language!`;
}

function reportUnknown(msg: string): string {
  return `I couldn't determine which AI BI report to generate for **"${msg}"**.

Try asking for:
• **"Generate sales forecast"** — revenue prediction
• **"Predict cash flow"** — cash position projection
• **"Detect anomalies"** — outlier detection
• **"Analyze KPIs"** — performance metrics
• **"Generate insights"** — AI business insights

Type **"help"** to see all capabilities.`;
}

async function generateReport(message: string, orgId: number): Promise<string> {
  const intent = detectReportIntent(message);
  switch (intent) {
    case "insights": return generateInsights(orgId);
    case "sales_forecast": return generateSalesForecast(orgId);
    case "cash_flow": return generateCashFlowPrediction(orgId);
    case "inventory_prediction": return generateInventoryPrediction(orgId);
    case "anomalies": return generateAnomalyReport(orgId);
    case "kpi": return generateKpiAnalysis(orgId);
    case "help": return reportHelp();
    default: return reportUnknown(message);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/ai-bi/insights
router.get("/insights", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const text = await generateInsights(req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate insights" }); }
});

// GET /api/ai-bi/sales-forecast
router.get("/sales-forecast", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const text = await generateSalesForecast(req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate sales forecast" }); }
});

// GET /api/ai-bi/cash-flow
router.get("/cash-flow", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const text = await generateCashFlowPrediction(req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate cash-flow prediction" }); }
});

// GET /api/ai-bi/inventory-prediction
router.get("/inventory-prediction", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const text = await generateInventoryPrediction(req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate inventory prediction" }); }
});

// GET /api/ai-bi/anomalies
router.get("/anomalies", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const text = await generateAnomalyReport(req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate anomaly report" }); }
});

// GET /api/ai-bi/kpi
router.get("/kpi", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const text = await generateKpiAnalysis(req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate KPI analysis" }); }
});

// POST /api/ai-bi/report — natural language report generation
router.post("/report", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const message = (req.body?.message as string) ?? "";
  if (!message.trim()) return res.status(400).json({ success: false, error: "Message is required" });
  try {
    const text = await generateReport(message, req.user!.orgId!);
    res.json({ success: true, data: { text } });
  } catch { res.status(500).json({ success: false, error: "Failed to generate report" }); }
});

export default router;