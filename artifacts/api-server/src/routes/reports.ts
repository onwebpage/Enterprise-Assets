/**
 * /api/reports — Reports & Analytics module
 *
 * Aggregates data from AR, AP, Inventory, HR, and Purchase modules
 * to produce cross-module analytics endpoints.
 */
import { Router } from "express";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import {
  db, roles, permissions,
  arInvoices, arCustomers,
  apBills, apVendors,
  hrEmployees, hrPayrollRuns, departments,
  invProducts, invStockLevels, invCategories,
  purchaseOrders, purchaseVendors,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Reports";

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Return last N month labels in "MMM YYYY" format */
function lastNMonths(n: number): { label: string; year: number; month: number }[] {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return result;
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [perm] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
      .limit(1);
    res.json({
      success: true,
      data: perm
        ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
        : { canView: true, canCreate: false, canEdit: false, canDelete: false },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Overview (KPIs + Monthly Trend) ──────────────────────────────────────────

router.get("/overview", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const monthsBack = parseInt(String(req.query.months ?? 12));
    const clampedMonths = Math.min(24, Math.max(3, monthsBack));
    const since = isoDate(monthsAgo(clampedMonths));

    // --- KPIs ---
    const [
      arResult,
      apResult,
      arOutstandingResult,
      apOutstandingResult,
      employeeResult,
      inventoryResult,
      payrollResult,
    ] = await Promise.all([
      // Total revenue = sum of all paid/partial AR invoices (total_amount)
      db.select({ total: sql<string>`coalesce(sum(total_amount), 0)::text` })
        .from(arInvoices)
        .where(and(
          eq(arInvoices.orgId, orgId),
          sql`${arInvoices.status} not in ('draft','void')`,
        )),
      // Total expenses = sum of all received/partial AP bills
      db.select({ total: sql<string>`coalesce(sum(total_amount), 0)::text` })
        .from(apBills)
        .where(and(
          eq(apBills.orgId, orgId),
          sql`${apBills.status} not in ('draft','void')`,
        )),
      // Outstanding AR = total_amount - amount_paid for open invoices
      db.select({ total: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text` })
        .from(arInvoices)
        .where(and(
          eq(arInvoices.orgId, orgId),
          sql`${arInvoices.status} in ('sent','partial','overdue')`,
        )),
      // Outstanding AP
      db.select({ total: sql<string>`coalesce(sum(total_amount - amount_paid), 0)::text` })
        .from(apBills)
        .where(and(
          eq(apBills.orgId, orgId),
          sql`${apBills.status} in ('received','partial','overdue')`,
        )),
      // Active employees
      db.select({ count: sql<number>`count(*)::int` })
        .from(hrEmployees)
        .where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active"))),
      // Inventory value (cost_price * qty_on_hand)
      db.select({ total: sql<string>`coalesce(sum(p.cost_price * sl.qty_on_hand), 0)::text` })
        .from(sql`inv_products p`)
        .innerJoin(
          sql`inv_stock_levels sl`,
          sql`sl.product_id = p.id and sl.org_id = ${orgId}`,
        )
        .where(sql`p.org_id = ${orgId}`),
      // Latest payroll run net
      db.select({ totalNet: hrPayrollRuns.totalNet })
        .from(hrPayrollRuns)
        .where(and(eq(hrPayrollRuns.orgId, orgId), sql`status in ('approved','paid')`))
        .orderBy(desc(hrPayrollRuns.createdAt))
        .limit(1),
    ]);

    const totalRevenue = parseFloat(arResult[0]?.total ?? "0");
    const totalExpenses = parseFloat(apResult[0]?.total ?? "0");
    const outstandingAR = parseFloat(arOutstandingResult[0]?.total ?? "0");
    const outstandingAP = parseFloat(apOutstandingResult[0]?.total ?? "0");
    const inventoryValue = parseFloat(inventoryResult[0]?.total ?? "0");
    const totalEmployees = employeeResult[0]?.count ?? 0;
    const latestPayroll = parseFloat(payrollResult[0]?.totalNet ?? "0");

    // --- Monthly Trend ---
    const months = lastNMonths(clampedMonths);

    const [arMonthly, apMonthly] = await Promise.all([
      db.select({
        yr: sql<number>`extract(year from created_at)::int`,
        mo: sql<number>`extract(month from created_at)::int`,
        total: sql<string>`coalesce(sum(total_amount), 0)::text`,
      })
        .from(arInvoices)
        .where(and(
          eq(arInvoices.orgId, orgId),
          sql`status not in ('draft','void')`,
          sql`created_at >= ${since}`,
        ))
        .groupBy(sql`extract(year from created_at), extract(month from created_at)`)
        .orderBy(sql`extract(year from created_at), extract(month from created_at)`),

      db.select({
        yr: sql<number>`extract(year from created_at)::int`,
        mo: sql<number>`extract(month from created_at)::int`,
        total: sql<string>`coalesce(sum(total_amount), 0)::text`,
      })
        .from(apBills)
        .where(and(
          eq(apBills.orgId, orgId),
          sql`status not in ('draft','void')`,
          sql`created_at >= ${since}`,
        ))
        .groupBy(sql`extract(year from created_at), extract(month from created_at)`)
        .orderBy(sql`extract(year from created_at), extract(month from created_at)`),
    ]);

    const arMap = new Map(arMonthly.map(r => [`${r.yr}-${r.mo}`, parseFloat(r.total)]));
    const apMap = new Map(apMonthly.map(r => [`${r.yr}-${r.mo}`, parseFloat(r.total)]));

    const monthlyTrend = months.map(m => {
      const key = `${m.year}-${m.month}`;
      const revenue = arMap.get(key) ?? 0;
      const expenses = apMap.get(key) ?? 0;
      return { month: m.label, revenue, expenses, profit: revenue - expenses };
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          outstandingAR,
          outstandingAP,
          inventoryValue,
          totalEmployees,
          latestPayroll,
          grossMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        },
        monthlyTrend,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch overview" });
  }
});

// ── AR Aging ──────────────────────────────────────────────────────────────────

router.get("/ar-aging", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const today = isoDate(new Date());

    const invoices = await db
      .select({
        id: arInvoices.id,
        customerName: arCustomers.name,
        invoiceNumber: arInvoices.invoiceNumber,
        dueDate: arInvoices.dueDate,
        totalAmount: arInvoices.totalAmount,
        amountPaid: arInvoices.amountPaid,
        status: arInvoices.status,
      })
      .from(arInvoices)
      .innerJoin(arCustomers, eq(arInvoices.customerId, arCustomers.id))
      .where(and(
        eq(arInvoices.orgId, orgId),
        sql`${arInvoices.status} in ('sent','partial','overdue')`,
      ))
      .orderBy(desc(arInvoices.dueDate));

    // Compute aging buckets
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
    const bucketCounts = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
    const todayMs = new Date(today).getTime();

    invoices.forEach(inv => {
      const outstanding = parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid);
      if (outstanding <= 0) return;
      const dueMs = new Date(inv.dueDate).getTime();
      const daysOverdue = Math.floor((todayMs - dueMs) / 86_400_000);
      if (daysOverdue <= 0) { buckets.current += outstanding; bucketCounts.current++; }
      else if (daysOverdue <= 30) { buckets.d30 += outstanding; bucketCounts.d30++; }
      else if (daysOverdue <= 60) { buckets.d60 += outstanding; bucketCounts.d60++; }
      else if (daysOverdue <= 90) { buckets.d90 += outstanding; bucketCounts.d90++; }
      else { buckets.over90 += outstanding; bucketCounts.over90++; }
    });

    // Top customers by outstanding
    const customerMap = new Map<string, number>();
    invoices.forEach(inv => {
      const outstanding = parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid);
      if (outstanding > 0) {
        customerMap.set(inv.customerName, (customerMap.get(inv.customerName) ?? 0) + outstanding);
      }
    });
    const topCustomers = Array.from(customerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    res.json({
      success: true,
      data: {
        aging: [
          { label: "Current", days: "Not due", amount: buckets.current, count: bucketCounts.current },
          { label: "1–30 days", days: "1-30", amount: buckets.d30, count: bucketCounts.d30 },
          { label: "31–60 days", days: "31-60", amount: buckets.d60, count: bucketCounts.d60 },
          { label: "61–90 days", days: "61-90", amount: buckets.d90, count: bucketCounts.d90 },
          { label: "90+ days", days: "90+", amount: buckets.over90, count: bucketCounts.over90 },
        ],
        topCustomers,
        totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0),
        invoiceCount: invoices.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch AR aging" });
  }
});

// ── AP Aging ──────────────────────────────────────────────────────────────────

router.get("/ap-aging", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const today = isoDate(new Date());

    const bills = await db
      .select({
        id: apBills.id,
        vendorName: apVendors.name,
        billNumber: apBills.billNumber,
        dueDate: apBills.dueDate,
        totalAmount: apBills.totalAmount,
        amountPaid: apBills.amountPaid,
        status: apBills.status,
      })
      .from(apBills)
      .innerJoin(apVendors, eq(apBills.vendorId, apVendors.id))
      .where(and(
        eq(apBills.orgId, orgId),
        sql`${apBills.status} in ('received','partial','overdue')`,
      ))
      .orderBy(desc(apBills.dueDate));

    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
    const bucketCounts = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
    const todayMs = new Date(today).getTime();

    bills.forEach(bill => {
      const outstanding = parseFloat(bill.totalAmount) - parseFloat(bill.amountPaid);
      if (outstanding <= 0) return;
      const dueMs = new Date(bill.dueDate).getTime();
      const daysOverdue = Math.floor((todayMs - dueMs) / 86_400_000);
      if (daysOverdue <= 0) { buckets.current += outstanding; bucketCounts.current++; }
      else if (daysOverdue <= 30) { buckets.d30 += outstanding; bucketCounts.d30++; }
      else if (daysOverdue <= 60) { buckets.d60 += outstanding; bucketCounts.d60++; }
      else if (daysOverdue <= 90) { buckets.d90 += outstanding; bucketCounts.d90++; }
      else { buckets.over90 += outstanding; bucketCounts.over90++; }
    });

    const vendorMap = new Map<string, number>();
    bills.forEach(bill => {
      const outstanding = parseFloat(bill.totalAmount) - parseFloat(bill.amountPaid);
      if (outstanding > 0) {
        vendorMap.set(bill.vendorName, (vendorMap.get(bill.vendorName) ?? 0) + outstanding);
      }
    });
    const topVendors = Array.from(vendorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    res.json({
      success: true,
      data: {
        aging: [
          { label: "Current", days: "Not due", amount: buckets.current, count: bucketCounts.current },
          { label: "1–30 days", days: "1-30", amount: buckets.d30, count: bucketCounts.d30 },
          { label: "31–60 days", days: "31-60", amount: buckets.d60, count: bucketCounts.d60 },
          { label: "61–90 days", days: "61-90", amount: buckets.d90, count: bucketCounts.d90 },
          { label: "90+ days", days: "90+", amount: buckets.over90, count: bucketCounts.over90 },
        ],
        topVendors,
        totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0),
        billCount: bills.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch AP aging" });
  }
});

// ── Inventory Analytics ───────────────────────────────────────────────────────

router.get("/inventory", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [byCategory, statusSummary, lowStock] = await Promise.all([
      // Inventory value by category — pure raw SQL to avoid Drizzle alias confusion
      db.execute<{ category_name: string | null; product_count: number; total_value: string; total_qty: string }>(sql`
        select
          cat.name                                                      as category_name,
          count(distinct p.id)::int                                     as product_count,
          coalesce(sum(p.cost_price * coalesce(sl.qty_on_hand, 0)), 0)::text as total_value,
          coalesce(sum(coalesce(sl.qty_on_hand, 0)), 0)::text           as total_qty
        from inv_products p
        left join inv_categories cat on cat.id = p.category_id
        left join inv_stock_levels sl on sl.product_id = p.id and sl.org_id = ${orgId}
        where p.org_id = ${orgId}
        group by cat.name
        order by sum(p.cost_price * coalesce(sl.qty_on_hand, 0)) desc
      `),

      // Status summary
      db.select({
        status: invProducts.status,
        count: sql<number>`count(*)::int`,
      })
        .from(invProducts)
        .where(eq(invProducts.orgId, orgId))
        .groupBy(invProducts.status),

      // Low-stock products (on_hand <= reorder_point)
      db.execute<{ sku: string; name: string; reorder_point: number; on_hand: string }>(sql`
        select
          p.sku,
          p.name,
          p.reorder_point,
          coalesce(sum(sl.qty_on_hand), 0)::text as on_hand
        from inv_products p
        left join inv_stock_levels sl on sl.product_id = p.id and sl.org_id = ${orgId}
        where p.org_id = ${orgId} and p.status = 'active'
        group by p.id
        having coalesce(sum(sl.qty_on_hand), 0) <= p.reorder_point
        order by coalesce(sum(sl.qty_on_hand), 0) asc
        limit 10
      `),
    ]);

    res.json({
      success: true,
      data: {
        byCategory: ((byCategory.rows ?? byCategory) as unknown as any[]).map((r: any) => ({
          category: r.category_name ?? "Uncategorised",
          productCount: Number(r.product_count),
          totalValue: parseFloat(r.total_value),
          totalQty: parseFloat(r.total_qty),
        })),
        statusSummary: statusSummary.map(r => ({ status: r.status, count: r.count })),
        lowStock: ((lowStock.rows ?? lowStock) as unknown as any[]).map((r: any) => ({
          sku: r.sku,
          name: r.name,
          reorderPoint: Number(r.reorder_point),
          onHand: parseFloat(r.on_hand),
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch inventory analytics" });
  }
});

// ── HR Analytics ──────────────────────────────────────────────────────────────

router.get("/hr", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const monthsBack = 6;
    const since = isoDate(monthsAgo(monthsBack));
    const months = lastNMonths(monthsBack);

    const [byDept, byStatus, byType, payrollMonthly] = await Promise.all([
      // Headcount by department
      db.select({
        deptName: departments.name,
        count: sql<number>`count(*)::int`,
        totalSalary: sql<string>`coalesce(sum(${hrEmployees.salary}::numeric), 0)::text`,
      })
        .from(hrEmployees)
        .leftJoin(departments, eq(hrEmployees.deptId, departments.id))
        .where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active")))
        .groupBy(departments.name)
        .orderBy(sql`count(*) desc`)
        .limit(8),

      // By status
      db.select({
        status: hrEmployees.status,
        count: sql<number>`count(*)::int`,
      })
        .from(hrEmployees)
        .where(eq(hrEmployees.orgId, orgId))
        .groupBy(hrEmployees.status),

      // By employment type
      db.select({
        employmentType: hrEmployees.employmentType,
        count: sql<number>`count(*)::int`,
      })
        .from(hrEmployees)
        .where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active")))
        .groupBy(hrEmployees.employmentType),

      // Monthly payroll net (paid/approved runs)
      db.select({
        yr: sql<number>`extract(year from created_at)::int`,
        mo: sql<number>`extract(month from created_at)::int`,
        totalNet: sql<string>`coalesce(sum(total_net::numeric), 0)::text`,
        runCount: sql<number>`count(*)::int`,
      })
        .from(hrPayrollRuns)
        .where(and(
          eq(hrPayrollRuns.orgId, orgId),
          sql`status in ('approved','paid')`,
          sql`created_at >= ${since}`,
        ))
        .groupBy(sql`extract(year from created_at), extract(month from created_at)`)
        .orderBy(sql`extract(year from created_at), extract(month from created_at)`),
    ]);

    const payrollMap = new Map(payrollMonthly.map(r => [`${r.yr}-${r.mo}`, parseFloat(r.totalNet)]));
    const payrollTrend = months.map(m => ({
      month: m.label,
      totalNet: payrollMap.get(`${m.year}-${m.month}`) ?? 0,
    }));

    res.json({
      success: true,
      data: {
        byDept: byDept.map(r => ({
          deptName: r.deptName ?? "Unassigned",
          count: r.count,
          totalSalary: parseFloat(r.totalSalary),
        })),
        byStatus: byStatus.map(r => ({ status: r.status, count: r.count })),
        byType: byType.map(r => ({ type: r.employmentType, count: r.count })),
        payrollTrend,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch HR analytics" });
  }
});

// ── Purchase Analytics ────────────────────────────────────────────────────────

router.get("/purchase", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const monthsBack = 6;
    const since = isoDate(monthsAgo(monthsBack));
    const months = lastNMonths(monthsBack);

    const [byVendor, byStatus, monthlySpend] = await Promise.all([
      // Top vendors by spend
      db.select({
        vendorName: purchaseVendors.name,
        orderCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(po.total_amount), 0)::text`,
      })
        .from(sql`purchase_orders po`)
        .innerJoin(purchaseVendors, sql`po.vendor_id = ${purchaseVendors.id}`)
        .where(sql`po.org_id = ${orgId} and po.status not in ('draft','cancelled')`)
        .groupBy(purchaseVendors.name)
        .orderBy(sql`sum(po.total_amount) desc`)
        .limit(8),

      // By status
      db.select({
        status: purchaseOrders.status,
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(total_amount), 0)::text`,
      })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.orgId, orgId))
        .groupBy(purchaseOrders.status),

      // Monthly spend
      db.select({
        yr: sql<number>`extract(year from created_at)::int`,
        mo: sql<number>`extract(month from created_at)::int`,
        total: sql<string>`coalesce(sum(total_amount), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.orgId, orgId),
          sql`status not in ('draft','cancelled')`,
          sql`created_at >= ${since}`,
        ))
        .groupBy(sql`extract(year from created_at), extract(month from created_at)`)
        .orderBy(sql`extract(year from created_at), extract(month from created_at)`),
    ]);

    const spendMap = new Map(monthlySpend.map(r => [`${r.yr}-${r.mo}`, parseFloat(r.total)]));
    const monthlyTrend = months.map(m => ({
      month: m.label,
      amount: spendMap.get(`${m.year}-${m.month}`) ?? 0,
    }));

    res.json({
      success: true,
      data: {
        byVendor: byVendor.map(r => ({
          vendorName: r.vendorName,
          orderCount: r.orderCount,
          totalAmount: parseFloat(r.totalAmount),
        })),
        byStatus: byStatus.map(r => ({
          status: r.status,
          count: r.count,
          total: parseFloat(r.total),
        })),
        monthlyTrend,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch purchase analytics" });
  }
});

export default router;
