import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Landmark,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FinanceDashboardData } from "@/hooks/useFinanceDashboard";
import { fmtMoney, timeAgo } from "@/hooks/useFinanceDashboard";
import { formatINR } from "@/lib/currency";

type Props = {
  data?: FinanceDashboardData;
  isLoading: boolean;
  onRefresh: () => void;
  onTab: (tab: string) => void;
};

const money = (value: number) =>
  formatINR(value);

const compactMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return formatINR(value, true);
  if (Math.abs(value) >= 1_000) return formatINR(value, true);
  return money(value);
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#0d1225] p-3 shadow-2xl">
      <p className="mb-2 text-xs font-medium text-white/50">{label}</p>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="mb-1 flex items-center gap-2 last:mb-0">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="text-xs text-white/60">{item.name}</span>
          <span className="ml-auto text-xs font-semibold text-white">{compactMoney(Number(item.value))}</span>
        </div>
      ))}
    </div>
  );
};

function Panel({ title, subtitle, action, children, className }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-white/35">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex min-h-32 items-center justify-center text-center text-xs text-white/30">{text}</div>;
}

function AgingBars({ rows, tone }: {
  rows: FinanceDashboardData["receivableAging"];
  tone: "green" | "red";
}) {
  if (!rows.length) return <Empty text="No open balances in this aging schedule." />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-xs text-white/55">{row.label}</span>
            <span className="text-xs font-medium text-white">{compactMoney(row.amount)} <span className="text-white/30">· {row.count}</span></span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn("h-full rounded-full", tone === "green" ? "bg-emerald-400" : "bg-red-400")}
              style={{ width: `${Math.max(row.pct, row.amount > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FinanceCommandCenter({ data, isLoading, onRefresh, onTab }: Props) {
  const kpis = data?.kpis;
  const cashFlow = data?.cashFlow ?? [];
  const netWorkingCapital = (kpis?.accountsReceivable ?? 0) - (kpis?.accountsPayable ?? 0);
  const cashCoverage = kpis?.accountsPayable ? (kpis.cashBalance / kpis.accountsPayable).toFixed(1) : "—";
  const hasData = Boolean(data);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Panel
          title="Finance command center"
          subtitle="Live cash, working capital, earnings, and control signals from your finance modules."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 border-white/[0.1] bg-transparent text-white/55 hover:bg-white/[0.05] hover:text-white"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
            </Button>
          }
          className="overflow-hidden"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Net working capital", value: hasData ? compactMoney(netWorkingCapital) : "—", caption: "Receivables less payables", icon: Activity, tone: "text-cyan-400", bg: "bg-cyan-400/10" },
              { label: "Cash coverage", value: hasData ? `${cashCoverage}×` : "—", caption: "Cash against open payables", icon: Wallet, tone: "text-emerald-400", bg: "bg-emerald-400/10" },
              { label: "Overdue exposure", value: hasData ? compactMoney((kpis?.overdueReceivable ?? 0) + (kpis?.overduePayable ?? 0)) : "—", caption: "AR + AP overdue balance", icon: ShieldAlert, tone: "text-amber-400", bg: "bg-amber-400/10" },
              { label: "Unreconciled", value: hasData ? compactMoney(data?.reconciliation.unreconciledAmount ?? 0) : "—", caption: `${data?.reconciliation.unreconciledCount ?? 0} bank transactions`, icon: Landmark, tone: "text-purple-400", bg: "bg-purple-400/10" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-lg p-2", item.bg)}><item.icon className={cn("h-4 w-4", item.tone)} /></div>
                  <span className="text-xs text-white/45">{item.label}</span>
                </div>
                <p className="mt-3 text-xl font-bold tracking-tight text-white">{isLoading ? "…" : item.value}</p>
                <p className="mt-1 text-[11px] text-white/30">{item.caption}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Cash by account" subtitle={`${data?.treasury.activeAccounts ?? 0} active treasury accounts`}>
          {!data?.treasury.accounts.length ? <Empty text={isLoading ? "Loading cash accounts…" : "No treasury accounts configured."} /> : (
            <div className="space-y-3">
              {data.treasury.accounts.slice(0, 5).map((account) => (
                <div key={account.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10"><Landmark className="h-4 w-4 text-cyan-400" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/80">{account.name}</p>
                    <p className="text-[11px] capitalize text-white/30">{account.bankName || account.accountType}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{compactMoney(Number(account.balance))}</span>
                </div>
              ))}
              <Button variant="link" onClick={() => onTab("treasury")} className="h-auto px-0 pt-2 text-xs text-cyan-400 hover:text-cyan-300">Manage treasury accounts <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Cash movement" subtitle="Actual finance transactions for the last seven months">
          {!cashFlow.length ? <Empty text={isLoading ? "Loading cash movement…" : "No finance transactions recorded."} /> : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cashFlow} margin={{ left: -22, right: 8, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="finance-inflows" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="finance-outflows" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 11 }} tickFormatter={(value) => compactMoney(Number(value))} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="inflows" name="Inflows" stroke="#22c55e" fill="url(#finance-inflows)" strokeWidth={2} />
                <Area type="monotone" dataKey="outflows" name="Outflows" stroke="#ef4444" fill="url(#finance-outflows)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex items-center gap-5">
            {[["Inflows", "#22c55e"], ["Outflows", "#ef4444"]].map(([label, color]) => <span key={label} className="flex items-center gap-1.5 text-xs text-white/40"><span className="h-0.5 w-3 rounded-full" style={{ background: color }} />{label}</span>)}
          </div>
        </Panel>

        <Panel title="Upcoming cash commitments" subtitle="Planned payments and collections">
          {!data?.upcoming.length ? <Empty text={isLoading ? "Loading cash commitments…" : "No upcoming plans."} /> : (
            <div className="space-y-2">
              {data.upcoming.slice(0, 6).map((item, index) => (
                <div key={`${item.type}-${item.date}-${item.label}-${index}`} className="flex items-center gap-3 border-b border-white/[0.05] py-2 last:border-0">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", item.type === "collection" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                    {item.type === "collection" ? <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/75">{item.label}</p>
                    <p className="text-[10px] text-white/30">{item.date} · {item.status}</p>
                  </div>
                  <span className={cn("text-xs font-semibold", item.type === "collection" ? "text-emerald-400" : "text-red-400")}>{item.type === "collection" ? "+" : "-"}{compactMoney(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Receivables aging"
          subtitle={`${compactMoney(kpis?.accountsReceivable ?? 0)} open · ${kpis?.openReceivables ?? 0} invoices`}
          action={<Button variant="link" onClick={() => onTab("invoices")} className="h-auto p-0 text-xs text-emerald-400">View AR <ArrowRight className="ml-1 h-3 w-3" /></Button>}
        >
          <AgingBars rows={data?.receivableAging ?? []} tone="green" />
        </Panel>
        <Panel
          title="Payables aging"
          subtitle={`${compactMoney(kpis?.accountsPayable ?? 0)} open · ${kpis?.openPayables ?? 0} bills`}
          action={<Button variant="link" onClick={() => onTab("bills")} className="h-auto p-0 text-xs text-red-400">View AP <ArrowRight className="ml-1 h-3 w-3" /></Button>}
        >
          <AgingBars rows={data?.payableAging ?? []} tone="red" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Recent transactions" subtitle="Latest finance activity">
          {!data?.recentTransactions.length ? <Empty text={isLoading ? "Loading transactions…" : "No recent transactions."} /> : (
            <div className="grid gap-x-6 md:grid-cols-2">
              {data.recentTransactions.slice(0, 6).map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-0">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", transaction.direction === "credit" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                    {transaction.direction === "credit" ? <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/75">{transaction.description}</p>
                    <p className="text-[10px] text-white/30">{transaction.reference || transaction.category} · {timeAgo(transaction.transactedAt)}</p>
                  </div>
                  <span className={cn("text-xs font-semibold", transaction.direction === "credit" ? "text-emerald-400" : "text-red-400")}>{transaction.direction === "credit" ? "+" : "-"}{compactMoney(transaction.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Control checks" subtitle="Finance operations needing attention">
          <div className="space-y-3">
            {[
              { title: "Bank reconciliation", text: `${data?.reconciliation.unreconciledCount ?? 0} transactions need matching`, icon: Landmark, action: "recon", tone: "text-purple-400" },
              { title: "Overdue receivables", text: compactMoney(kpis?.overdueReceivable ?? 0) + " past due", icon: CreditCard, action: "invoices", tone: "text-amber-400" },
              { title: "Treasury approvals", text: "Review payment and transfer workflows", icon: Banknote, action: "treasury", tone: "text-cyan-400" },
              { title: "Period close", text: "Keep month-end controls and locks current", icon: CalendarClock, action: "closing", tone: "text-emerald-400" },
            ].map((check) => (
              <button key={check.title} onClick={() => onTab(check.action)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]">
                <check.icon className={cn("h-4 w-4", check.tone)} />
                <div className="min-w-0 flex-1"><p className="text-xs font-medium text-white/75">{check.title}</p><p className="mt-0.5 truncate text-[11px] text-white/35">{check.text}</p></div>
                <ArrowRight className="h-3.5 w-3.5 text-white/25" />
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}