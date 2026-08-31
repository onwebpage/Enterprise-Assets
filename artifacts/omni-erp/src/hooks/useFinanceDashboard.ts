import { useQuery } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinanceKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  overdueReceivable: number;
  overduePayable: number;
  openReceivables: number;
  openPayables: number;
}

export interface FinanceTransaction {
  id: number;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  category: string;
  reference: string | null;
  transactedAt: string;
}

export interface MonthlyPL {
  month: string;
  revenue: number;
  cogs: number;
  gross: number;
  opex: number;
  net: number;
}

export interface FinanceDashboardData {
  kpis: FinanceKPIs;
  recentTransactions: FinanceTransaction[];
  monthlyPL: MonthlyPL[];
  cashFlow: { month: string; inflows: number; outflows: number; net: number }[];
  receivableAging: { label: string; amount: number; count: number; pct: number }[];
  payableAging: { label: string; amount: number; count: number; pct: number }[];
  treasury: {
    activeAccounts: number;
    accounts: {
      id: number;
      name: string;
      bankName: string | null;
      currency: string;
      balance: string;
      accountType: string;
    }[];
  };
  upcoming: {
    date: string;
    type: "payment" | "collection";
    label: string;
    amount: number;
    status: string;
  }[];
  reconciliation: {
    bookBalance: number;
    unreconciledAmount: number;
    unreconciledCount: number;
  };
  lastUpdated: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFinanceDashboard() {
  return useQuery({
    queryKey: ["finance", "dashboard"],
    queryFn: () =>
      api.get<ApiResponse<FinanceDashboardData>>("/finance/dashboard").then(
        (r) => r.data,
      ),
    staleTime: 30_000,
    retry: 1,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a dollar amount as "$1.2M", "$48.2K", or "$1,234" */
export function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)
    return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/** Relative time from ISO string: "2m ago", "3h ago", "2d ago" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
