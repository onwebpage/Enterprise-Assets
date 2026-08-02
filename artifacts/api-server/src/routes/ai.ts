/**
 * /api/ai — OmniERP AI Assistant
 *
 * A custom rule-based AI engine that understands natural language queries,
 * fetches live ERP data, and returns intelligent formatted responses.
 * No external API keys required.
 */
import { Router } from "express";
import { eq, and, sql, desc, lt, lte } from "drizzle-orm";
import {
  db,
  aiConversations,
  aiMessages,
  arInvoices,
  arCustomers,
  apBills,
  apVendors,
  hrEmployees,
  hrPayrollRuns,
  hrLeaveRequests,
  hrJobPostings,
  invProducts,
  invStockLevels,
  invCategories,
  invWarehouses,
  mfgWorkOrders,
  bankAccounts,
  bankTransactions,
  purchaseOrders,
  purchaseVendors,
  departments,
} from "@workspace/db";
import {
  insertAiConversationSchema,
  sendAiChatSchema,
  feedbackSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

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

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Intent Detection ──────────────────────────────────────────────────────────

type Intent =
  | "overview"
  | "revenue"
  | "ar_invoices"
  | "ar_overdue"
  | "ap_bills"
  | "ap_overdue"
  | "inventory_low"
  | "inventory_summary"
  | "hr_summary"
  | "hr_payroll"
  | "hr_leave"
  | "hr_jobs"
  | "manufacturing"
  | "banking"
  | "purchase"
  | "profit"
  | "customers"
  | "vendors"
  | "help"
  | "greeting"
  | "unknown";

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase();

  // Greeting
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|hola)\b/.test(m)) return "greeting";

  // Help
  if (/\b(help|what can you|what do you|capabilities|features|assist|guide)\b/.test(m)) return "help";

  // Overview / Dashboard
  if (/\b(overview|dashboard|summary|kpi|performance|status|snapshot|highlights|today|how is|how are we)\b/.test(m)) return "overview";

  // Profit / P&L
  if (/\b(profit|loss|p&l|net income|gross margin|pl report|earnings|ebitda)\b/.test(m)) return "profit";

  // Revenue / sales
  if (/\b(revenue|sales|income|turnover|earnings|receipts|collection)\b/.test(m) && !/\b(profit|loss)\b/.test(m)) return "revenue";

  // AR overdue
  if (/\b(overdue|past due|late|unpaid|outstanding)\b/.test(m) && /\b(invoice|receivable|ar|customer)\b/.test(m)) return "ar_overdue";

  // AR invoices
  if (/\b(invoice|ar |accounts receivable|receivable|billing|bill to|customer invoice)\b/.test(m)) return "ar_invoices";

  // AP overdue
  if (/\b(overdue|past due|late)\b/.test(m) && /\b(bill|payable|ap |vendor|supplier)\b/.test(m)) return "ap_overdue";

  // AP / bills
  if (/\b(ap |accounts payable|payable|bill|bills|vendor bill|supplier bill|owe)\b/.test(m)) return "ap_bills";

  // Customers
  if (/\b(customer|client|buyer)\b/.test(m) && !/\b(invoice|ar)\b/.test(m)) return "customers";

  // Vendors / suppliers
  if (/\b(vendor|supplier|partner)\b/.test(m) && !/\b(bill|ap)\b/.test(m)) return "vendors";

  // Inventory low stock / reorder
  if (/\b(reorder|low stock|below reorder|out of stock|shortage|stockout|replenish)\b/.test(m)) return "inventory_low";

  // Inventory general
  if (/\b(inventory|stock|warehouse|product|sku|item|goods)\b/.test(m)) return "inventory_summary";

  // HR payroll
  if (/\b(payroll|salary|wages|compensation|pay run|pay slip|earnings)\b/.test(m)) return "hr_payroll";

  // HR leave
  if (/\b(leave|absence|vacation|pto|time off|absent)\b/.test(m)) return "hr_leave";

  // HR jobs / recruitment
  if (/\b(job|hiring|recruit|opening|position|vacancy|candidate)\b/.test(m)) return "hr_jobs";

  // HR general
  if (/\b(hr |human resource|employee|headcount|staff|workforce|attrition|department)\b/.test(m)) return "hr_summary";

  // Manufacturing
  if (/\b(manufactur|production|work order|bom|bill of material|work center|assembly|output)\b/.test(m)) return "manufacturing";

  // Banking
  if (/\b(bank|cash|balance|transaction|reconcil|account balance|liquidity)\b/.test(m)) return "banking";

  // Purchase / procurement
  if (/\b(purchase|procurement|po |purchase order|order|grn|goods receipt)\b/.test(m)) return "purchase";

  return "unknown";
}

// ── Data Fetchers ─────────────────────────────────────────────────────────────

async function fetchOverview(orgId: number): Promise<string> {
  const todayStr = isoDate(new Date());
  const [
    arData,
    apData,
    arOverdue,
    apOverdue,
    empData,
    invData,
    bankData,
    poData,
  ] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text` })
      .from(apBills).where(and(eq(apBills.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ cnt: sql<number>`count(*)::int`, amount: sql<string>`coalesce(sum(total_amount - amount_paid),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status = 'overdue' or (status in ('sent','partial') and due_date < ${todayStr})`)),
    db.select({ cnt: sql<number>`count(*)::int` })
      .from(apBills).where(and(eq(apBills.orgId, orgId), sql`status = 'overdue' or (status in ('received','partial') and due_date < ${todayStr})`)),
    db.select({ active: sql<number>`count(*) filter (where status='active')::int`, total: sql<number>`count(*)::int` })
      .from(hrEmployees).where(eq(hrEmployees.orgId, orgId)),
    db.select({ total: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice}),0)::text`, products: sql<number>`count(distinct ${invProducts.id})::int` })
      .from(invProducts)
      .leftJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(eq(invProducts.orgId, orgId)),
    db.select({ balance: sql<string>`coalesce(sum(current_balance),0)::text`, accounts: sql<number>`count(*)::int` })
      .from(bankAccounts).where(and(eq(bankAccounts.orgId, orgId), sql`status = 'active'`)),
    db.select({ pending: sql<number>`count(*) filter (where status='pending')::int`, total: sql<number>`count(*)::int` })
      .from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId)),
  ]);

  const revenue = parseFloat(arData[0]?.total ?? "0");
  const outstanding = revenue - parseFloat(arData[0]?.paid ?? "0");
  const expenses = parseFloat(apData[0]?.total ?? "0");
  const profit = revenue - expenses;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";
  const overdueAR = arOverdue[0];
  const employees = empData[0];
  const inv = invData[0];
  const bank = bankData[0];
  const po = poData[0];

  return `📊 **OmniERP Business Overview** — ${today()}

**Financial Summary**
• Total Revenue: ${fmt(revenue)} | Collected: ${fmt(parseFloat(arData[0]?.paid ?? "0"))}
• Total Expenses: ${fmt(expenses)} | Net Profit: ${fmt(profit)} (${margin}% margin)
• Outstanding Receivables: ${fmt(outstanding)}

**Alerts & Actions Required**
${overdueAR.cnt > 0 ? `⚠️ ${overdueAR.cnt} overdue invoices totaling ${fmt(overdueAR.amount)} need follow-up` : "✅ No overdue invoices"}
${(apOverdue[0]?.cnt ?? 0) > 0 ? `⚠️ ${apOverdue[0].cnt} overdue vendor bills pending payment` : "✅ All vendor bills current"}
${po.pending > 0 ? `📦 ${po.pending} purchase orders awaiting approval` : "✅ No pending purchase orders"}

**Operations**
• Employees: ${employees.active} active (${employees.total} total)
• Inventory Value: ${fmt(inv.total)} across ${fmtN(inv.products, 0)} products
• Bank Balance: ${fmt(bank.balance)} across ${bank.accounts} active account(s)
• Purchase Orders: ${fmtN(po.total, 0)} total, ${po.pending} pending

What would you like to drill into? I can give you details on any module.`;
}

async function fetchRevenue(orgId: number): Promise<string> {
  const thisMonth = isoDate(monthStart());
  const lastMonthStart = isoDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const lastMonthEnd = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 0));

  const [allTime, thisMonthData, lastMonthData, byStatus, topCustomers] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`, sql`issue_date >= ${thisMonth}`)),
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`, sql`issue_date >= ${lastMonthStart}`, sql`issue_date <= ${lastMonthEnd}`)),
    db.select({ status: arInvoices.status, total: sql<string>`coalesce(sum(total_amount),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('void')`))
      .groupBy(arInvoices.status).orderBy(desc(sql`sum(total_amount)`)),
    db.select({ name: arCustomers.name, total: sql<string>`coalesce(sum(total_amount),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(arInvoices).innerJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
      .where(and(eq(arInvoices.orgId, orgId), sql`${arInvoices.status} not in ('draft','void')`))
      .groupBy(arCustomers.name).orderBy(desc(sql`sum(total_amount)`)).limit(5),
  ]);

  const total = parseFloat(allTime[0]?.total ?? "0");
  const monthly = parseFloat(thisMonthData[0]?.total ?? "0");
  const lastMonth = parseFloat(lastMonthData[0]?.total ?? "0");
  const growth = lastMonth > 0 ? (((monthly - lastMonth) / lastMonth) * 100).toFixed(1) : "N/A";

  const statusLines = byStatus.map(r => `  • ${cap(r.status)}: ${fmt(r.total)} (${r.cnt} invoices)`).join("\n");
  const topLines = topCustomers.map((c, i) => `  ${i + 1}. ${c.name} — ${fmt(c.total)} (${c.cnt} invoices)`).join("\n");

  return `💰 **Revenue Analysis** — ${today()}

**Overall**
• Total Revenue (all time): ${fmt(total)} across ${fmtN(allTime[0]?.cnt ?? 0, 0)} invoices

**This Month vs Last Month**
• This Month: ${fmt(monthly)} (${thisMonthData[0]?.cnt ?? 0} invoices)
• Last Month: ${fmt(lastMonth)}
• MoM Growth: ${growth === "N/A" ? "—" : `${parseFloat(growth) >= 0 ? "+" : ""}${growth}%`}

**By Invoice Status**
${statusLines || "  No data"}

**Top 5 Customers by Revenue**
${topLines || "  No customers yet"}

Want me to break this down by time period, customer segment, or generate a P&L report?`;
}

async function fetchARInvoices(orgId: number): Promise<string> {
  const [summary, recent, byStatus] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('void')`)),
    db.select({
      invoiceNumber: arInvoices.invoiceNumber, status: arInvoices.status,
      totalAmount: arInvoices.totalAmount, amountPaid: arInvoices.amountPaid,
      dueDate: arInvoices.dueDate, customerName: arCustomers.name,
    }).from(arInvoices).innerJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
      .where(and(eq(arInvoices.orgId, orgId), sql`status not in ('void','draft')`))
      .orderBy(desc(arInvoices.createdAt)).limit(8),
    db.select({ status: arInvoices.status, cnt: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(arInvoices).where(eq(arInvoices.orgId, orgId)).groupBy(arInvoices.status),
  ]);

  const outstanding = parseFloat(summary[0]?.total ?? "0") - parseFloat(summary[0]?.paid ?? "0");
  const statusMap = Object.fromEntries(byStatus.map(r => [r.status, r]));
  const recentLines = recent.map(r =>
    `  ${r.invoiceNumber} | ${r.customerName.substring(0, 20).padEnd(20)} | ${fmt(r.totalAmount)} | ${cap(r.status)} | Due: ${r.dueDate}`
  ).join("\n");

  return `📄 **Accounts Receivable — Invoice Summary** — ${today()}

**Portfolio Overview**
• Total Invoiced: ${fmt(summary[0]?.total ?? 0)} (${fmtN(summary[0]?.cnt ?? 0, 0)} invoices)
• Total Collected: ${fmt(summary[0]?.paid ?? 0)}
• Outstanding: ${fmt(outstanding)}

**By Status**
${["draft","sent","partial","paid","overdue","void"].map(s => {
  const r = statusMap[s];
  return r ? `  • ${cap(s)}: ${r.cnt} invoices — ${fmt(r.total)}` : `  • ${cap(s)}: 0`;
}).join("\n")}

**Recent Invoices**
${"Invoice No.".padEnd(12)} | ${"Customer".padEnd(20)} | Amount    | Status   | Due Date
${"-".repeat(70)}
${recentLines || "  No invoices found"}

Ask me about overdue invoices, top customers, or specific invoice details.`;
}

async function fetchAROverdue(orgId: number): Promise<string> {
  const todayStr = isoDate(new Date());
  const [overdue, aging] = await Promise.all([
    db.select({
      invoiceNumber: arInvoices.invoiceNumber,
      customerName: arCustomers.name,
      totalAmount: arInvoices.totalAmount,
      amountPaid: arInvoices.amountPaid,
      dueDate: arInvoices.dueDate,
    }).from(arInvoices).innerJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
      .where(and(
        eq(arInvoices.orgId, orgId),
        sql`${arInvoices.status} in ('overdue') or (${arInvoices.status} in ('sent','partial') and ${arInvoices.dueDate} < ${todayStr})`,
      )).orderBy(desc(arInvoices.totalAmount)).limit(10),
    db.select({
      bucket: sql<string>`case
        when due_date >= ${isoDate(daysAgo(30))} then '1-30 days'
        when due_date >= ${isoDate(daysAgo(60))} then '31-60 days'
        when due_date >= ${isoDate(daysAgo(90))} then '61-90 days'
        else '90+ days'
      end`,
      cnt: sql<number>`count(*)::int`,
      amount: sql<string>`coalesce(sum(total_amount - amount_paid),0)::text`,
    }).from(arInvoices)
      .where(and(
        eq(arInvoices.orgId, orgId),
        sql`${arInvoices.status} in ('overdue') or (${arInvoices.status} in ('sent','partial') and ${arInvoices.dueDate} < ${todayStr})`,
      )).groupBy(sql`1`),
  ]);

  if (overdue.length === 0) {
    return `✅ **Great news!** You have no overdue invoices as of ${today()}.\n\nAll receivables are current. Would you like to see the full invoice summary instead?`;
  }

  const totalOverdue = overdue.reduce((s, r) => s + parseFloat(r.totalAmount) - parseFloat(r.amountPaid), 0);
  const agingLines = aging.map(r => `  • ${r.bucket}: ${r.cnt} invoices — ${fmt(r.amount)}`).join("\n");
  const invoiceLines = overdue.map(r => {
    const outstanding = parseFloat(r.totalAmount) - parseFloat(r.amountPaid);
    return `  ${r.invoiceNumber} | ${r.customerName.substring(0, 22).padEnd(22)} | ${fmt(outstanding)} outstanding | Due: ${r.dueDate}`;
  }).join("\n");

  return `🔴 **Overdue Receivables Alert** — ${today()}

**Total Overdue: ${fmt(totalOverdue)} across ${overdue.length} invoice(s)**

**Aging Breakdown**
${agingLines || "  No aging data"}

**Overdue Invoices (Top ${overdue.length})**
${invoiceLines}

⚡ **Recommended Actions:**
• Send payment reminders to customers with 1–30 day overdue invoices
• Escalate collections for 60+ day accounts
• Review credit terms for repeat late payers

Would you like me to show vendor bills, cash flow, or customer details?`;
}

async function fetchAPBills(orgId: number): Promise<string> {
  const [summary, recent, byStatus] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text`, cnt: sql<number>`count(*)::int` })
      .from(apBills).where(and(eq(apBills.orgId, orgId), sql`status not in ('void')`)),
    db.select({
      billNumber: apBills.billNumber, status: apBills.status,
      totalAmount: apBills.totalAmount, amountPaid: apBills.amountPaid,
      dueDate: apBills.dueDate, vendorName: apVendors.name,
    }).from(apBills).innerJoin(apVendors, eq(apBills.vendorId, apVendors.id))
      .where(and(eq(apBills.orgId, orgId), sql`status not in ('void','draft')`))
      .orderBy(desc(apBills.createdAt)).limit(8),
    db.select({ status: apBills.status, cnt: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(apBills).where(eq(apBills.orgId, orgId)).groupBy(apBills.status),
  ]);

  const outstanding = parseFloat(summary[0]?.total ?? "0") - parseFloat(summary[0]?.paid ?? "0");
  const statusMap = Object.fromEntries(byStatus.map(r => [r.status, r]));
  const recentLines = recent.map(r =>
    `  ${r.billNumber} | ${r.vendorName.substring(0, 20).padEnd(20)} | ${fmt(r.totalAmount)} | ${cap(r.status)} | Due: ${r.dueDate}`
  ).join("\n");

  return `📑 **Accounts Payable — Bill Summary** — ${today()}

**Portfolio Overview**
• Total Billed: ${fmt(summary[0]?.total ?? 0)} (${fmtN(summary[0]?.cnt ?? 0, 0)} bills)
• Total Paid: ${fmt(summary[0]?.paid ?? 0)}
• Outstanding: ${fmt(outstanding)}

**By Status**
${["draft","received","partial","paid","overdue","void"].map(s => {
  const r = statusMap[s];
  return r ? `  • ${cap(s)}: ${r.cnt} bills — ${fmt(r.total)}` : `  • ${cap(s)}: 0`;
}).join("\n")}

**Recent Bills**
${"Bill No.".padEnd(12)} | ${"Vendor".padEnd(20)} | Amount    | Status   | Due Date
${"-".repeat(70)}
${recentLines || "  No bills found"}`;
}

async function fetchAPOverdue(orgId: number): Promise<string> {
  const todayStr = isoDate(new Date());
  const overdue = await db.select({
    billNumber: apBills.billNumber,
    vendorName: apVendors.name,
    totalAmount: apBills.totalAmount,
    amountPaid: apBills.amountPaid,
    dueDate: apBills.dueDate,
  }).from(apBills).innerJoin(apVendors, eq(apBills.vendorId, apVendors.id))
    .where(and(
      eq(apBills.orgId, orgId),
      sql`${apBills.status} = 'overdue' or (${apBills.status} in ('received','partial') and ${apBills.dueDate} < ${todayStr})`,
    )).orderBy(desc(apBills.totalAmount)).limit(10);

  if (overdue.length === 0) {
    return `✅ **No overdue vendor bills** as of ${today()}.\n\nAll payables are current. Would you like to see the full AP summary?`;
  }

  const totalOverdue = overdue.reduce((s, r) => s + parseFloat(r.totalAmount) - parseFloat(r.amountPaid), 0);
  const lines = overdue.map(r => {
    const outstanding = parseFloat(r.totalAmount) - parseFloat(r.amountPaid);
    return `  ${r.billNumber} | ${r.vendorName.substring(0, 22).padEnd(22)} | ${fmt(outstanding)} outstanding | Due: ${r.dueDate}`;
  }).join("\n");

  return `🔴 **Overdue Payables Alert** — ${today()}

**Total Overdue: ${fmt(totalOverdue)} across ${overdue.length} bill(s)**

**Overdue Bills**
${lines}

⚡ **Recommended Actions:**
• Prioritize payment to avoid late fees and vendor relationship damage
• Contact vendors for payment plan if cash flow is constrained
• Review AP aging weekly to prevent further escalation`;
}

async function fetchInventory(orgId: number): Promise<string> {
  const [summary, lowStock, byCategory, warehouses] = await Promise.all([
    db.select({
      products: sql<number>`count(distinct ${invProducts.id})::int`,
      totalValue: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice}),0)::text`,
      totalQty: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand}),0)::text`,
    }).from(invProducts)
      .leftJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(and(eq(invProducts.orgId, orgId), sql`${invProducts.status} = 'active'`)),
    db.select({ sku: invProducts.sku, name: invProducts.name, qtyOnHand: invStockLevels.qtyOnHand, reorderPoint: invProducts.reorderPoint })
      .from(invProducts).innerJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(and(eq(invProducts.orgId, orgId), sql`${invStockLevels.qtyOnHand} <= ${invProducts.reorderPoint}`, sql`${invProducts.status} = 'active'`))
      .orderBy(sql`${invStockLevels.qtyOnHand} - ${invProducts.reorderPoint}`).limit(8),
    db.select({ name: invCategories.name, cnt: sql<number>`count(distinct ${invProducts.id})::int`, value: sql<string>`coalesce(sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice}),0)::text` })
      .from(invCategories)
      .innerJoin(invProducts, eq(invProducts.categoryId, invCategories.id))
      .leftJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
      .where(eq(invCategories.orgId, orgId)).groupBy(invCategories.name).orderBy(desc(sql`sum(${invStockLevels.qtyOnHand} * ${invProducts.costPrice})`)).limit(5),
    db.select({ name: invWarehouses.name, status: invWarehouses.status }).from(invWarehouses).where(eq(invWarehouses.orgId, orgId)).limit(5),
  ]);

  const s = summary[0];
  const lowLines = lowStock.map(r =>
    `  ⚠️ ${r.sku} — ${r.name.substring(0, 25)} | On Hand: ${fmtN(parseFloat(String(r.qtyOnHand)), 0)} | Reorder: ${fmtN(parseFloat(String(r.reorderPoint)), 0)}`
  ).join("\n");
  const catLines = byCategory.map(c => `  • ${c.name}: ${fmtN(c.cnt, 0)} products — ${fmt(c.value)}`).join("\n");
  const whLines = warehouses.map(w => `  • ${w.name} (${cap(w.status)})`).join("\n");

  return `📦 **Inventory Summary** — ${today()}

**Overview**
• Active Products: ${fmtN(s?.products ?? 0, 0)}
• Total Stock Value: ${fmt(s?.totalValue ?? 0)}
• Total Units On Hand: ${fmtN(parseFloat(s?.totalQty ?? "0"), 0)}

${lowStock.length > 0 ? `**Low Stock / Reorder Alerts (${lowStock.length} items)**\n${lowLines}\n` : "**Stock Levels:** ✅ All products above reorder point\n"}
**By Category (Top 5)**
${catLines || "  No categories configured"}

**Warehouses**
${whLines || "  No warehouses configured"}

Ask me about specific products, stock movements, or procurement needs.`;
}

async function fetchLowStock(orgId: number): Promise<string> {
  const items = await db.select({
    sku: invProducts.sku,
    name: invProducts.name,
    qtyOnHand: invStockLevels.qtyOnHand,
    reorderPoint: invProducts.reorderPoint,
    reorderQty: invProducts.reorderQty,
    costPrice: invProducts.costPrice,
  }).from(invProducts).innerJoin(invStockLevels, eq(invStockLevels.productId, invProducts.id))
    .where(and(
      eq(invProducts.orgId, orgId),
      sql`${invStockLevels.qtyOnHand} <= ${invProducts.reorderPoint}`,
      sql`${invProducts.status} = 'active'`,
    )).orderBy(sql`${invStockLevels.qtyOnHand} - ${invProducts.reorderPoint}`).limit(15);

  if (items.length === 0) {
    return `✅ **All products are above reorder points** as of ${today()}.\n\nNo immediate restocking needed. Inventory levels are healthy!`;
  }

  const lines = items.map(r => {
    const gap = parseFloat(String(r.reorderPoint)) - parseFloat(String(r.qtyOnHand));
    const estCost = parseFloat(String(r.reorderQty ?? 0)) * parseFloat(String(r.costPrice ?? 0));
    return `  📦 ${r.sku} — ${r.name.substring(0, 28)}\n     On Hand: ${fmtN(parseFloat(String(r.qtyOnHand)), 0)} | Reorder At: ${fmtN(parseFloat(String(r.reorderPoint)), 0)} | Deficit: ${fmtN(gap, 0)} | Est. Reorder Cost: ${fmt(estCost)}`;
  }).join("\n");

  return `🚨 **Low Stock Alert — ${items.length} item(s) below reorder point** — ${today()}

${lines}

⚡ **Recommended Actions:**
• Create purchase orders for items with highest deficit first
• Review reorder quantities with your procurement team
• Check lead times with existing vendors for faster replenishment

Would you like help creating purchase orders for these items?`;
}

async function fetchHRSummary(orgId: number): Promise<string> {
  const [employees, byDept, byType, byStatus, openJobs] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status='active')::int`,
      onLeave: sql<number>`count(*) filter (where status='on_leave')::int`,
      terminated: sql<number>`count(*) filter (where status='terminated')::int`,
      avgSalary: sql<string>`coalesce(avg(salary) filter (where salary_type='monthly'),0)::text`,
    }).from(hrEmployees).where(eq(hrEmployees.orgId, orgId)),
    db.select({ dept: departments.name, cnt: sql<number>`count(*)::int` })
      .from(hrEmployees).leftJoin(departments, eq(hrEmployees.deptId, departments.id))
      .where(and(eq(hrEmployees.orgId, orgId), sql`${hrEmployees.status} = 'active'`))
      .groupBy(departments.name).orderBy(desc(sql`count(*)`)).limit(6),
    db.select({ type: hrEmployees.employmentType, cnt: sql<number>`count(*)::int` })
      .from(hrEmployees).where(and(eq(hrEmployees.orgId, orgId), sql`status = 'active'`))
      .groupBy(hrEmployees.employmentType),
    db.select({ status: hrEmployees.status, cnt: sql<number>`count(*)::int` })
      .from(hrEmployees).where(eq(hrEmployees.orgId, orgId)).groupBy(hrEmployees.status),
    db.select({ cnt: sql<number>`count(*)::int` })
      .from(hrJobPostings).where(and(eq(hrJobPostings.orgId, orgId), sql`status = 'open'`)),
  ]);

  const e = employees[0];
  const deptLines = byDept.map(d => `  • ${d.dept ?? "Unassigned"}: ${d.cnt} employees`).join("\n");
  const typeLines = byType.map(t => `  • ${cap(t.type)}: ${t.cnt}`).join("\n");

  return `👥 **HR Summary** — ${today()}

**Headcount**
• Total Employees: ${e.total} (${e.active} active, ${e.onLeave} on leave, ${e.terminated} terminated)
• Average Monthly Salary: ${fmt(e.avgSalary)}
• Open Job Positions: ${openJobs[0]?.cnt ?? 0}

**By Department**
${deptLines || "  No department data"}

**By Employment Type**
${typeLines || "  No type data"}

${openJobs[0]?.cnt > 0 ? `\n🔍 **${openJobs[0].cnt} open position(s)** need to be filled. Ask me about recruiting details.` : ""}

Ask me about payroll, leave requests, job postings, or specific department details.`;
}

async function fetchPayroll(orgId: number): Promise<string> {
  const [runs, latest] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      totalPaid: sql<string>`coalesce(sum(${hrPayrollRuns.totalNet}) filter (where ${hrPayrollRuns.status}='paid'),0)::text`,
      pending: sql<number>`count(*) filter (where ${hrPayrollRuns.status} in ('draft','processing'))::int`,
    }).from(hrPayrollRuns).where(eq(hrPayrollRuns.orgId, orgId)),
    db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.orgId, orgId))
      .orderBy(desc(hrPayrollRuns.createdAt)).limit(5),
  ]);

  const r = runs[0];
  const recentLines = latest.map(run =>
    `  • ${run.runNumber} | ${run.period} | ${fmt(run.totalNet)} | ${cap(run.status)}`
  ).join("\n");

  return `💵 **Payroll Summary** — ${today()}

**Overview**
• Total Payroll Runs: ${r?.total ?? 0}
• Total Disbursed (paid runs): ${fmt(r?.totalPaid ?? 0)}
• Pending Runs: ${r?.pending ?? 0}

**Recent Payroll Runs**
${recentLines || "  No payroll runs found"}

${(r?.pending ?? 0) > 0 ? `⚠️ You have ${r.pending} payroll run(s) pending approval.` : "✅ All payroll runs are processed."}

Ask me about employee salary details, payroll by department, or leave balances.`;
}

async function fetchLeave(orgId: number): Promise<string> {
  const [summary, recent] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${hrLeaveRequests.status}='pending')::int`,
      approved: sql<number>`count(*) filter (where ${hrLeaveRequests.status}='approved')::int`,
      rejected: sql<number>`count(*) filter (where ${hrLeaveRequests.status}='rejected')::int`,
    }).from(hrLeaveRequests)
      .innerJoin(hrEmployees, eq(hrLeaveRequests.employeeId, hrEmployees.id))
      .where(eq(hrEmployees.orgId, orgId)),
    db.select({
      requestNumber: hrLeaveRequests.requestNumber,
      startDate: hrLeaveRequests.startDate,
      endDate: hrLeaveRequests.endDate,
      status: hrLeaveRequests.status,
      firstName: hrEmployees.firstName,
      lastName: hrEmployees.lastName,
    }).from(hrLeaveRequests)
      .innerJoin(hrEmployees, eq(hrLeaveRequests.employeeId, hrEmployees.id))
      .where(and(eq(hrEmployees.orgId, orgId), sql`${hrLeaveRequests.status} = 'pending'`))
      .orderBy(desc(hrLeaveRequests.createdAt)).limit(8),
  ]);

  const s = summary[0];
  const pendingLines = recent.map(r =>
    `  ${r.requestNumber} | ${r.firstName} ${r.lastName} | ${r.startDate} → ${r.endDate} | ${cap(r.status)}`
  ).join("\n");

  return `🗓️ **Leave Requests Summary** — ${today()}

**Overview**
• Total Requests: ${s?.total ?? 0}
• Pending Approval: ${s?.pending ?? 0}
• Approved: ${s?.approved ?? 0}
• Rejected: ${s?.rejected ?? 0}

${(s?.pending ?? 0) > 0 ? `**Pending Leave Requests (${s.pending})**\n${pendingLines}` : "✅ No pending leave requests"}

${(s?.pending ?? 0) > 0 ? "\n⚡ Action needed: Review and approve/reject pending leave requests in HR > Leave Management." : ""}`;
}

async function fetchJobs(orgId: number): Promise<string> {
  const jobs = await db.select({
    jobNumber: hrJobPostings.jobNumber,
    title: hrJobPostings.title,
    status: hrJobPostings.status,
    employmentType: hrJobPostings.employmentType,
    openings: hrJobPostings.openings,
    closingDate: hrJobPostings.closingDate,
  }).from(hrJobPostings).where(eq(hrJobPostings.orgId, orgId))
    .orderBy(sql`case when ${hrJobPostings.status}='open' then 0 when ${hrJobPostings.status}='on_hold' then 1 else 2 end`, desc(hrJobPostings.createdAt))
    .limit(10);

  const [statusSummary] = await Promise.all([
    db.select({ status: hrJobPostings.status, cnt: sql<number>`count(*)::int` })
      .from(hrJobPostings).where(eq(hrJobPostings.orgId, orgId)).groupBy(hrJobPostings.status),
  ]);

  const statusMap = Object.fromEntries(statusSummary.map(r => [r.status, r.cnt]));
  const jobLines = jobs.map(j =>
    `  ${j.jobNumber} | ${j.title.substring(0, 30).padEnd(30)} | ${cap(j.status)} | ${cap(j.employmentType)} | ${j.openings} opening(s) | Closes: ${j.closingDate ?? "—"}`
  ).join("\n");

  return `💼 **Job Postings & Recruitment** — ${today()}

**Summary**
• Open: ${statusMap["open"] ?? 0} | On Hold: ${statusMap["on_hold"] ?? 0} | Filled: ${statusMap["filled"] ?? 0} | Closed: ${statusMap["closed"] ?? 0}

**Job Postings**
${jobLines || "  No job postings found"}

${(statusMap["open"] ?? 0) > 0 ? `\n🔍 ${statusMap["open"]} open role(s) currently accepting candidates.` : ""}`;
}

async function fetchManufacturing(orgId: number): Promise<string> {
  const [summary, recent] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      planned: sql<number>`count(*) filter (where status='planned')::int`,
      inProgress: sql<number>`count(*) filter (where status='in_progress')::int`,
      done: sql<number>`count(*) filter (where status='done')::int`,
      cancelled: sql<number>`count(*) filter (where status='cancelled')::int`,
      urgent: sql<number>`count(*) filter (where priority='urgent' and status not in ('done','cancelled'))::int`,
    }).from(mfgWorkOrders).where(eq(mfgWorkOrders.orgId, orgId)),
    db.select({ woNumber: mfgWorkOrders.woNumber, status: mfgWorkOrders.status, priority: mfgWorkOrders.priority, plannedQty: mfgWorkOrders.plannedQty, scheduledStart: mfgWorkOrders.scheduledStart, scheduledEnd: mfgWorkOrders.scheduledEnd })
      .from(mfgWorkOrders).where(and(eq(mfgWorkOrders.orgId, orgId), sql`status in ('planned','scheduled','in_progress')`))
      .orderBy(sql`case when priority='urgent' then 0 when priority='high' then 1 else 2 end`, desc(mfgWorkOrders.scheduledStart)).limit(8),
  ]);

  const s = summary[0];
  const lines = recent.map(r =>
    `  ${r.woNumber} | ${cap(r.status)} | Priority: ${cap(r.priority)} | Qty: ${fmtN(parseFloat(String(r.plannedQty)), 0)} | ${r.scheduledStart ?? "—"} → ${r.scheduledEnd ?? "—"}`
  ).join("\n");

  return `🏭 **Manufacturing Summary** — ${today()}

**Work Orders**
• Total: ${s?.total ?? 0} | Planned: ${s?.planned ?? 0} | In Progress: ${s?.inProgress ?? 0} | Done: ${s?.done ?? 0}
${(s?.urgent ?? 0) > 0 ? `⚠️ ${s.urgent} URGENT work order(s) require immediate attention!` : "✅ No urgent work orders"}

**Active Work Orders**
${lines || "  No active work orders"}

Ask me about production schedules, work centers, or BOM details.`;
}

async function fetchBanking(orgId: number): Promise<string> {
  const [accounts, recentTx] = await Promise.all([
    db.select({
      name: bankAccounts.name, bankName: bankAccounts.bankName,
      currentBalance: bankAccounts.currentBalance, currency: bankAccounts.currency,
      accountType: bankAccounts.accountType, status: bankAccounts.status,
    }).from(bankAccounts).where(and(eq(bankAccounts.orgId, orgId), sql`status = 'active'`))
      .orderBy(desc(bankAccounts.currentBalance)),
    db.select({
      transactionDate: bankTransactions.transactionDate, description: bankTransactions.description,
      amount: bankTransactions.amount, type: bankTransactions.type, status: bankTransactions.status,
    }).from(bankTransactions).where(eq(bankTransactions.orgId, orgId))
      .orderBy(desc(bankTransactions.transactionDate)).limit(6),
  ]);

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.currentBalance), 0);
  const accountLines = accounts.map(a =>
    `  • ${a.name} (${a.bankName ?? "—"}) | ${cap(a.accountType)} | Balance: ${fmt(a.currentBalance)} ${a.currency}`
  ).join("\n");
  const txLines = recentTx.map(t =>
    `  ${t.transactionDate} | ${t.type === "credit" ? "+" : "-"}${fmt(t.amount)} | ${t.description.substring(0, 40)} | ${cap(t.status)}`
  ).join("\n");

  return `🏦 **Banking & Cash Position** — ${today()}

**Total Cash Position: ${fmt(totalBalance)}**

**Active Bank Accounts**
${accountLines || "  No active bank accounts"}

**Recent Transactions**
${txLines || "  No recent transactions"}

Ask me about reconciliation status, cash flow trends, or specific account details.`;
}

async function fetchPurchase(orgId: number): Promise<string> {
  const [summary, recent, byVendor] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status='pending')::int`,
      approved: sql<number>`count(*) filter (where status='approved')::int`,
      totalValue: sql<string>`coalesce(sum(total_amount),0)::text`,
      pendingValue: sql<string>`coalesce(sum(total_amount) filter (where status='pending'),0)::text`,
    }).from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId)),
    db.select({ poNumber: purchaseOrders.poNumber, status: purchaseOrders.status, totalAmount: purchaseOrders.totalAmount, vendorName: purchaseVendors.name, orderDate: purchaseOrders.orderDate })
      .from(purchaseOrders).innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
      .where(eq(purchaseOrders.orgId, orgId)).orderBy(desc(purchaseOrders.createdAt)).limit(6),
    db.select({ vendorName: purchaseVendors.name, cnt: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(total_amount),0)::text` })
      .from(purchaseOrders).innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
      .where(and(eq(purchaseOrders.orgId, orgId), sql`${purchaseOrders.status} not in ('cancelled','draft')`))
      .groupBy(purchaseVendors.name).orderBy(desc(sql`sum(total_amount)`)).limit(5),
  ]);

  const s = summary[0];
  const recentLines = recent.map(r =>
    `  ${r.poNumber} | ${r.vendorName.substring(0, 20).padEnd(20)} | ${fmt(r.totalAmount)} | ${cap(r.status)} | ${r.orderDate}`
  ).join("\n");
  const vendorLines = byVendor.map(v => `  • ${v.vendorName}: ${v.cnt} POs — ${fmt(v.total)}`).join("\n");

  return `🛒 **Purchase & Procurement Summary** — ${today()}

**Overview**
• Total Orders: ${s?.total ?? 0} | Total Value: ${fmt(s?.totalValue ?? 0)}
• Pending Approval: ${s?.pending ?? 0} (${fmt(s?.pendingValue ?? 0)})

${(s?.pending ?? 0) > 0 ? `⚠️ ${s.pending} purchase order(s) awaiting approval.\n` : ""}
**Recent Purchase Orders**
${recentLines || "  No purchase orders"}

**Top Vendors by Spend**
${vendorLines || "  No vendor data"}`;
}

async function fetchProfit(orgId: number): Promise<string> {
  const [revenue, expenses, outstanding] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ total: sql<string>`coalesce(sum(total_amount),0)::text`, paid: sql<string>`coalesce(sum(amount_paid),0)::text` })
      .from(apBills).where(and(eq(apBills.orgId, orgId), sql`status not in ('draft','void')`)),
    db.select({ arOut: sql<string>`coalesce(sum(total_amount - amount_paid),0)::text` })
      .from(arInvoices).where(and(eq(arInvoices.orgId, orgId), sql`status in ('sent','partial','overdue')`)),
  ]);

  const rev = parseFloat(revenue[0]?.total ?? "0");
  const collected = parseFloat(revenue[0]?.paid ?? "0");
  const exp = parseFloat(expenses[0]?.total ?? "0");
  const expPaid = parseFloat(expenses[0]?.paid ?? "0");
  const grossProfit = rev - exp;
  const netCash = collected - expPaid;
  const margin = rev > 0 ? ((grossProfit / rev) * 100).toFixed(1) : "0";
  const arOut = parseFloat(outstanding[0]?.arOut ?? "0");

  return `📊 **Profit & Loss Summary** — ${today()}

**Revenue**
• Total Invoiced:  ${fmt(rev)}
• Collected:       ${fmt(collected)}
• Outstanding AR:  ${fmt(arOut)}

**Expenses**
• Total Billed:    ${fmt(exp)}
• Paid to Vendors: ${fmt(expPaid)}

**Profitability**
• Gross Profit:    ${fmt(grossProfit)} (${margin}% margin)
• Net Cash Profit: ${fmt(netCash)} (based on cash collected vs paid)

${grossProfit >= 0 ? "✅ Profitable" : "⚠️ Currently operating at a loss"} — ${grossProfit >= 0 ? "Strong financial health." : "Review expense categories and collections."}

For detailed breakdown by period or category, ask me about specific modules.`;
}

async function fetchCustomers(orgId: number): Promise<string> {
  const [summary, top] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status='active')::int`,
      blocked: sql<number>`count(*) filter (where status='blocked')::int`,
      avgCredit: sql<string>`coalesce(avg(credit_limit),0)::text`,
    }).from(arCustomers).where(eq(arCustomers.orgId, orgId)),
    db.select({ name: arCustomers.name, status: arCustomers.status, creditLimit: arCustomers.creditLimit, city: arCustomers.city, country: arCustomers.country, invCount: sql<number>`count(ar_invoices.id)::int`, invTotal: sql<string>`coalesce(sum(ar_invoices.total_amount),0)::text` })
      .from(arCustomers)
      .leftJoin(arInvoices, and(eq(arInvoices.customerId, arCustomers.id), sql`${arInvoices.status} not in ('void','draft')`))
      .where(eq(arCustomers.orgId, orgId))
      .groupBy(arCustomers.id, arCustomers.name, arCustomers.status, arCustomers.creditLimit, arCustomers.city, arCustomers.country)
      .orderBy(desc(sql`sum(ar_invoices.total_amount)`)).limit(8),
  ]);

  const s = summary[0];
  const topLines = top.map((c, i) =>
    `  ${i + 1}. ${c.name.substring(0, 28).padEnd(28)} | ${cap(c.status)} | ${fmt(c.invTotal)} revenue | Credit: ${fmt(c.creditLimit)}`
  ).join("\n");

  return `🤝 **Customer Summary** — ${today()}

**Overview**
• Total Customers: ${s?.total ?? 0} (${s?.active ?? 0} active, ${s?.blocked ?? 0} blocked)
• Avg Credit Limit: ${fmt(s?.avgCredit ?? 0)}

**Top Customers by Revenue**
${topLines || "  No customers found"}`;
}

async function fetchVendors(orgId: number): Promise<string> {
  const [arVendors, apVends] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where status='active')::int` })
      .from(apVendors).where(eq(apVendors.orgId, orgId)),
    db.select({ name: apVendors.name, status: apVendors.status, city: apVendors.city, country: apVendors.country, billCount: sql<number>`count(ap_bills.id)::int`, billTotal: sql<string>`coalesce(sum(ap_bills.total_amount),0)::text` })
      .from(apVendors)
      .leftJoin(apBills, and(eq(apBills.vendorId, apVendors.id), sql`${apBills.status} not in ('void','draft')`))
      .where(eq(apVendors.orgId, orgId))
      .groupBy(apVendors.id, apVendors.name, apVendors.status, apVendors.city, apVendors.country)
      .orderBy(desc(sql`sum(ap_bills.total_amount)`)).limit(8),
  ]);

  const s = arVendors[0];
  const vendorLines = apVends.map((v, i) =>
    `  ${i + 1}. ${v.name.substring(0, 28).padEnd(28)} | ${cap(v.status)} | ${fmt(v.billTotal)} total spend | ${v.billCount} bills`
  ).join("\n");

  return `🏢 **Vendor Summary** — ${today()}

**Overview**
• Total Vendors: ${s?.total ?? 0} (${s?.active ?? 0} active)

**Top Vendors by Spend**
${vendorLines || "  No vendors found"}

Ask me about vendor bills, payment schedules, or purchase orders for specific vendors.`;
}

function helpResponse(): string {
  return `🤖 **OmniERP AI Assistant** — Here's what I can help you with:

**📊 Finance & Accounting**
• "Show me the P&L summary" — Profit & Loss overview
• "What's our revenue this month?" — Revenue analysis
• "Show overdue invoices" — AR aging & overdue tracking
• "What vendor bills are overdue?" — AP status

**👥 Human Resources**
• "HR summary" — Headcount, departments, employment types
• "Show payroll overview" — Payroll runs and disbursements
• "Any pending leave requests?" — Leave management
• "Open job positions" — Recruitment pipeline

**📦 Inventory & Operations**
• "Which products need reordering?" — Low stock alerts
• "Inventory summary" — Stock levels and values
• "Manufacturing overview" — Work orders and production
• "Purchase order status" — Procurement pipeline

**🏦 Banking**
• "Bank balance" — Cash position across accounts
• "Recent transactions" — Transaction history

**📈 Analytics**
• "Business overview" — Full KPI dashboard
• "Show me top customers" — Customer analysis
• "Vendor summary" — Supplier overview

Just type your question in natural language — I'll fetch the live data for you!`;
}

function greetResponse(): string {
  return `👋 **Hello! I'm OmniERP AI Assistant.**

I'm connected to your live ERP data and ready to help you get insights instantly.

**Quick starts:**
• "Show business overview" — full KPI snapshot
• "Any overdue invoices?" — AR alerts
• "HR summary" — headcount & payroll
• "Inventory low stock" — reorder alerts

What would you like to know today?`;
}

function unknownResponse(msg: string): string {
  return `I wasn't quite sure how to answer **"${msg}"** from the live ERP data.

Here are some things I can help with:
• Financial overview, revenue, profit & loss
• Overdue invoices (AR) or vendor bills (AP)
• Inventory levels and low stock alerts
• HR headcount, payroll, leave requests
• Manufacturing work orders
• Banking balances and transactions
• Purchase orders and procurement

Try asking something like _"Show overdue invoices"_ or _"What's our revenue this month?"_

Type **"help"** to see all my capabilities.`;
}

// ── Main AI Engine ────────────────────────────────────────────────────────────

async function generateResponse(message: string, orgId: number): Promise<string> {
  const intent = detectIntent(message);

  switch (intent) {
    case "greeting":    return greetResponse();
    case "help":        return helpResponse();
    case "overview":    return fetchOverview(orgId);
    case "revenue":     return fetchRevenue(orgId);
    case "profit":      return fetchProfit(orgId);
    case "ar_invoices": return fetchARInvoices(orgId);
    case "ar_overdue":  return fetchAROverdue(orgId);
    case "ap_bills":    return fetchAPBills(orgId);
    case "ap_overdue":  return fetchAPOverdue(orgId);
    case "inventory_summary": return fetchInventory(orgId);
    case "inventory_low":     return fetchLowStock(orgId);
    case "hr_summary":  return fetchHRSummary(orgId);
    case "hr_payroll":  return fetchPayroll(orgId);
    case "hr_leave":    return fetchLeave(orgId);
    case "hr_jobs":     return fetchJobs(orgId);
    case "manufacturing": return fetchManufacturing(orgId);
    case "banking":     return fetchBanking(orgId);
    case "purchase":    return fetchPurchase(orgId);
    case "customers":   return fetchCustomers(orgId);
    case "vendors":     return fetchVendors(orgId);
    default:            return unknownResponse(message);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/ai/conversations
router.get("/conversations", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.orgId!;
    const convs = await db.select()
      .from(aiConversations)
      .where(and(eq(aiConversations.orgId, orgId), eq(aiConversations.userId, userId)))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(50);
    res.json({ success: true, data: convs });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch conversations" });
  }
});

// POST /api/ai/conversations
router.post("/conversations", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.orgId!;
    const parsed = insertAiConversationSchema.safeParse(req.body);
    const title = (parsed.success && parsed.data.title) ? parsed.data.title : "New Conversation";
    const [conv] = await db.insert(aiConversations).values({ orgId, userId, title }).returning();
    res.json({ success: true, data: conv });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create conversation" });
  }
});

// DELETE /api/ai/conversations/:id
router.delete("/conversations/:id", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid ID" }); return; }
    const [conv] = await db.select().from(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId))).limit(1);
    if (!conv) { res.status(404).json({ success: false, error: "Not found" }); return; }
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete conversation" });
  }
});

// GET /api/ai/conversations/:id/messages
router.get("/conversations/:id/messages", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid ID" }); return; }
    const [conv] = await db.select().from(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId))).limit(1);
    if (!conv) { res.status(404).json({ success: false, error: "Not found" }); return; }
    const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(aiMessages.createdAt);
    res.json({ success: true, data: msgs });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

// POST /api/ai/chat — main AI endpoint
router.post("/chat", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.orgId!;
    const parsed = sendAiChatSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, error: "Invalid request" }); return; }

    const { message, conversationId } = parsed.data;

    // Resolve or create conversation
    let convId: number;
    if (conversationId) {
      const [existing] = await db.select().from(aiConversations)
        .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId))).limit(1);
      if (!existing) { res.status(404).json({ success: false, error: "Conversation not found" }); return; }
      convId = existing.id;
    } else {
      // Auto-title from first message (truncate to 60 chars)
      const title = message.length > 60 ? message.substring(0, 57) + "..." : message;
      const [newConv] = await db.insert(aiConversations).values({ orgId, userId, title }).returning();
      convId = newConv.id;
    }

    // Save user message
    await db.insert(aiMessages).values({ conversationId: convId, role: "user", content: message });

    // Generate AI response
    const responseText = await generateResponse(message, orgId);

    // Save assistant message
    const [savedMsg] = await db.insert(aiMessages).values({ conversationId: convId, role: "assistant", content: responseText }).returning();

    // Update conversation timestamp and title if it was the first message
    await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, convId));

    res.json({ success: true, data: { conversationId: convId, message: savedMsg } });
  } catch (err) {
    console.error("[AI] chat error", err);
    res.status(500).json({ success: false, error: "Failed to process message" });
  }
});

// PATCH /api/ai/messages/:id/feedback
router.patch("/messages/:id/feedback", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid ID" }); return; }
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, error: "Invalid request" }); return; }
    const [msg] = await db.update(aiMessages).set({ liked: parsed.data.liked }).where(eq(aiMessages.id, id)).returning();
    res.json({ success: true, data: msg });
  } catch {
    res.status(500).json({ success: false, error: "Failed to save feedback" });
  }
});

export default router;
