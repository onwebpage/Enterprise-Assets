import { Router } from "express";
import { desc, sql } from "drizzle-orm";
import { db, financeTransactions, financeMonthlySummary } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/finance/dashboard
 *
 * Returns all data required by the Finance Dashboard Overview tab:
 *  - kpis: { totalRevenue, totalExpenses, netProfit, cashBalance }
 *  - recentTransactions: last 10 transactions
 *  - monthlyPL: 7-month P&L series for the Revenue Chart
 */
router.get("/dashboard", async (_req, res) => {
  try {
    const [kpiRows, txRows, monthlyRows] = await Promise.all([
      // KPIs — aggregate from transactions
      db
        .select({
          totalRevenue: sql<string>`
            coalesce(sum(amount) filter (where direction = 'credit' and category = 'revenue'), 0)
          `,
          totalExpenses: sql<string>`
            coalesce(sum(amount) filter (where direction = 'debit'  and category = 'expense'), 0)
          `,
          cashBalance: sql<string>`
            coalesce(
              sum(amount) filter (where direction = 'credit') -
              sum(amount) filter (where direction = 'debit'),
              0
            )
          `,
        })
        .from(financeTransactions),

      // Recent transactions — newest first
      db
        .select()
        .from(financeTransactions)
        .orderBy(desc(financeTransactions.transactedAt))
        .limit(10),

      // Monthly P&L — ordered chronologically
      db
        .select()
        .from(financeMonthlySummary)
        .orderBy(financeMonthlySummary.year, financeMonthlySummary.id),
    ]);

    const agg = kpiRows[0]!;
    const totalRevenue = parseFloat(agg.totalRevenue ?? "0");
    const totalExpenses = parseFloat(agg.totalExpenses ?? "0");
    const netProfit = totalRevenue - totalExpenses;
    const cashBalance = parseFloat(agg.cashBalance ?? "0");

    res.json({
      success: true,
      data: {
        kpis: { totalRevenue, totalExpenses, netProfit, cashBalance },
        recentTransactions: txRows.map((t) => ({
          id: t.id,
          description: t.description,
          amount: parseFloat(t.amount),
          direction: t.direction,
          category: t.category,
          reference: t.reference,
          transactedAt: t.transactedAt,
        })),
        monthlyPL: monthlyRows.map((r) => ({
          month: r.month,
          revenue: parseFloat(r.revenue),
          cogs: parseFloat(r.cogs),
          gross: parseFloat(r.gross),
          opex: parseFloat(r.opex),
          net: parseFloat(r.net),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch finance dashboard data" });
  }
});

export default router;
