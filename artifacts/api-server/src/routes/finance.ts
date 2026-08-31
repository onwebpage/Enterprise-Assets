import { Router } from "express";
import { desc, sql } from "drizzle-orm";
import { db, financeTransactions, financeMonthlySummary, pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "finance";

const numberValue = (value: unknown) => Number(value ?? 0);
const money = (value: unknown) => Number(value ?? 0);

/**
 * GET /api/finance/dashboard
 *
 * The dashboard is a read model assembled from the existing finance, AR, AP,
 * banking and treasury modules. It deliberately does not create a second
 * source of truth for balances or documents.
 */
router.get("/dashboard", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const orgId = req.user?.orgId;
  if (!orgId) {
    res.status(400).json({ success: false, error: "User is not assigned to an organization" });
    return;
  }

  try {
    const [
      [kpi],
      txRows,
      monthlyRows,
      arResult,
      apResult,
      agingRows,
      apAgingRows,
      cashRows,
      cashFlowRows,
      upcomingRows,
      reconciliationResult,
    ] = await Promise.all([
      db
        .select({
          totalRevenue: sql<string>`coalesce(sum(amount) filter (where direction = 'credit' and category = 'revenue'), 0)`,
          totalExpenses: sql<string>`coalesce(sum(amount) filter (where direction = 'debit' and category = 'expense'), 0)`,
          cashMovement: sql<string>`coalesce(sum(amount) filter (where direction = 'credit') - sum(amount) filter (where direction = 'debit'), 0)`,
        })
        .from(financeTransactions)
        .where(sql`${financeTransactions.orgId} = ${orgId}`),
      db
        .select()
        .from(financeTransactions)
        .where(sql`${financeTransactions.orgId} = ${orgId}`)
        .orderBy(desc(financeTransactions.transactedAt))
        .limit(10),
      db
        .select()
        .from(financeMonthlySummary)
        .where(sql`${financeMonthlySummary.orgId} = ${orgId}`)
        .orderBy(financeMonthlySummary.year, financeMonthlySummary.id),
      pool.query(
        `select
           coalesce(sum(total_amount - amount_paid) filter (where status not in ('paid','void','draft')), 0)::numeric as balance,
           coalesce(sum(total_amount - amount_paid) filter (where status = 'overdue'), 0)::numeric as overdue,
           count(*) filter (where status not in ('paid','void','draft'))::int as open_count
         from ar_invoices where org_id=$1`,
        [orgId],
      ),
      pool.query(
        `select
           coalesce(sum(total_amount - amount_paid) filter (where status not in ('paid','void','draft')), 0)::numeric as balance,
           coalesce(sum(total_amount - amount_paid) filter (where status = 'overdue'), 0)::numeric as overdue,
           count(*) filter (where status not in ('paid','void','draft'))::int as open_count
         from ap_bills where org_id=$1`,
        [orgId],
      ),
      pool.query(
        `select
           case
             when due_date::date >= current_date then 'Current'
             when current_date - due_date::date between 1 and 30 then '1-30 days'
             when current_date - due_date::date between 31 and 60 then '31-60 days'
             when current_date - due_date::date between 61 and 90 then '61-90 days'
             else '90+ days'
           end as label,
           coalesce(sum(total_amount - amount_paid), 0)::numeric as amount,
           count(*)::int as count
         from ar_invoices
         where org_id=$1 and status not in ('paid','void','draft')
         group by 1
         order by case min(
           case
             when due_date::date >= current_date then 0
             when current_date - due_date::date between 1 and 30 then 1
             when current_date - due_date::date between 31 and 60 then 2
             when current_date - due_date::date between 61 and 90 then 3
             else 4
           end
         ) when 0 then 0 when 1 then 1 when 2 then 2 when 3 then 3 else 4 end`,
        [orgId],
      ),
      pool.query(
        `select
           case
             when due_date::date >= current_date then 'Current'
             when current_date - due_date::date between 1 and 30 then '1-30 days'
             when current_date - due_date::date between 31 and 60 then '31-60 days'
             when current_date - due_date::date between 61 and 90 then '61-90 days'
             else '90+ days'
           end as label,
           coalesce(sum(total_amount - amount_paid), 0)::numeric as amount,
           count(*)::int as count
         from ap_bills
         where org_id=$1 and status not in ('paid','void','draft')
         group by 1
         order by min(due_date::date)`,
        [orgId],
      ),
      pool.query(
        `select
           coalesce(sum(available_balance), 0)::numeric as balance,
           count(*) filter (where status='active')::int as active_accounts,
           coalesce(json_agg(json_build_object(
             'id', id, 'name', name, 'bankName', bank_name, 'currency', currency,
             'balance', available_balance, 'accountType', account_type
           ) order by is_primary desc, name) filter (where status='active'), '[]'::json) as accounts
         from treasury_accounts where org_id=$1`,
        [orgId],
      ),
      pool.query(
        `select to_char(date_trunc('month', transacted_at), 'Mon') as month,
           coalesce(sum(amount) filter (where direction='credit'), 0)::numeric as inflows,
           coalesce(sum(amount) filter (where direction='debit'), 0)::numeric as outflows
         from finance_transactions
         where org_id=$1
           and transacted_at >= date_trunc('month', current_date) - interval '6 months'
         group by date_trunc('month', transacted_at)
         order by date_trunc('month', transacted_at)`,
        [orgId],
      ),
      pool.query(
        `select * from (
           select payment_date as date, 'payment' as type, payee_name as label, amount, status
           from treasury_payment_plans
           where org_id=$1 and status not in ('paid','cancelled')
           union all
           select collection_date as date, 'collection' as type, payer_name as label, amount, status
           from treasury_collection_plans
           where org_id=$1 and status not in ('received','cancelled')
         ) items order by date asc limit 8`,
        [orgId],
      ),
      pool.query(
        `select
           coalesce(sum(current_balance), 0)::numeric as book_balance,
           coalesce(sum(bt.amount) filter (where bt.status='unreconciled'), 0)::numeric as unreconciled_amount,
           count(*) filter (where bt.status='unreconciled')::int as unreconciled_count
         from bank_accounts ba
         left join bank_transactions bt on bt.bank_account_id=ba.id and bt.org_id=$1
         where ba.org_id=$1 and ba.status='active'`,
        [orgId],
      ),
    ]);

    const totalRevenue = numberValue(kpi?.totalRevenue);
    const totalExpenses = numberValue(kpi?.totalExpenses);
    const cashAccounts = cashRows.rows[0];
    const arData = arResult.rows[0] ?? {};
    const apData = apResult.rows[0] ?? {};
    const reconciliation = reconciliationResult.rows[0] ?? {};
    const cashBalance = money(cashAccounts?.balance);
    const aging = (rows: Array<{ label: string; amount: string; count: number }>) => {
      const total = rows.reduce((sum, row) => sum + money(row.amount), 0);
      return rows.map((row) => ({
        label: row.label,
        amount: money(row.amount),
        count: Number(row.count ?? 0),
        pct: total ? Math.round((money(row.amount) / total) * 100) : 0,
      }));
    };

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          cashBalance,
          accountsReceivable: money(arData.balance),
          accountsPayable: money(apData.balance),
          overdueReceivable: money(arData.overdue),
          overduePayable: money(apData.overdue),
          openReceivables: Number(arData.open_count ?? 0),
          openPayables: Number(apData.open_count ?? 0),
        },
        recentTransactions: txRows.map((t) => ({
          id: t.id,
          description: t.description,
          amount: numberValue(t.amount),
          direction: t.direction,
          category: t.category,
          reference: t.reference,
          transactedAt: t.transactedAt,
        })),
        monthlyPL: monthlyRows.map((r) => ({
          month: r.month,
          revenue: numberValue(r.revenue),
          cogs: numberValue(r.cogs),
          gross: numberValue(r.gross),
          opex: numberValue(r.opex),
          net: numberValue(r.net),
        })),
        cashFlow: cashFlowRows.rows.map((row) => ({
          month: row.month,
          inflows: money(row.inflows),
          outflows: money(row.outflows),
          net: money(row.inflows) - money(row.outflows),
        })),
        receivableAging: aging(agingRows.rows),
        payableAging: aging(apAgingRows.rows),
        treasury: {
          activeAccounts: Number(cashAccounts?.active_accounts ?? 0),
          accounts: cashAccounts?.accounts ?? [],
        },
        upcoming: upcomingRows.rows.map((row) => ({
          date: row.date,
          type: row.type,
          label: row.label,
          amount: money(row.amount),
          status: row.status,
        })),
        reconciliation: {
          bookBalance: money(reconciliation?.book_balance),
          unreconciledAmount: money(reconciliation?.unreconciled_amount),
          unreconciledCount: Number(reconciliation?.unreconciled_count ?? 0),
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Finance dashboard query failed", err);
    res.status(500).json({ success: false, error: "Failed to fetch finance dashboard data" });
  }
});

export default router;
