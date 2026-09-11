import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Landmark,
  Package,
  RefreshCw,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { formatINR, formatINRCompact } from "@/lib/currency";
import { useFinanceDashboard, timeAgo } from "@/hooks/useFinanceDashboard";
import { useCrmSummary } from "@/hooks/useCrm";
import { useOrderSummary } from "@/hooks/useOrderManagement";
import { useInvSummary } from "@/hooks/useInventory";
import { useHrSummary } from "@/hooks/useHR";

type Icon = typeof Activity;

const quickActions = [
  { label: "New invoice", icon: FileText, path: "/app/ar", tone: "text-blue-300 bg-blue-500/10" },
  { label: "New sales order", icon: ShoppingCart, path: "/app/order-management", tone: "text-cyan-300 bg-cyan-500/10" },
  { label: "Add employee", icon: Users, path: "/app/hr", tone: "text-violet-300 bg-violet-500/10" },
  { label: "Create purchase order", icon: Package, path: "/app/purchase", tone: "text-amber-300 bg-amber-500/10" },
  { label: "Run report", icon: BarChart3, path: "/app/reports", tone: "text-emerald-300 bg-emerald-500/10" },
  { label: "Ask AI", icon: Bot, path: "/app/ai", tone: "text-rose-300 bg-rose-500/10" },
];

function MetricCard({
  label,
  value,
  detail,
  icon: IconComponent,
  tone,
  loading,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: Icon;
  tone: string;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"
    >
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <IconComponent className="h-4 w-4" />
      </div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-white">
        {loading ? "—" : value}
      </p>
      <p className="mt-1 text-[11px] text-white/30">{detail}</p>
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-white/[0.07] bg-[#0a0f1e] ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-white/35">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="px-5 py-10 text-center text-xs text-white/30">{message}</p>;
}

function LoadingState() {
  return <p className="px-5 py-10 text-center text-xs text-white/30">Loading live data…</p>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const finance = useFinanceDashboard();
  const crm = useCrmSummary();
  const orders = useOrderSummary();
  const inventory = useInvSummary();
  const hr = useHrSummary();

  const financeData = finance.data;
  const financeLoading = finance.isLoading;
  const revenue = financeData?.kpis.totalRevenue ?? 0;
  const expenses = financeData?.kpis.totalExpenses ?? 0;
  const netProfit = financeData?.kpis.netProfit ?? revenue - expenses;
  const cashFlow = financeData?.kpis.cashBalance ?? 0;
  const monthlyPL = financeData?.monthlyPL ?? [];
  const maxMonth = Math.max(
    1,
    ...monthlyPL.flatMap((month) => [month.revenue, month.cogs + month.opex]),
  );

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="dashboard-page mx-auto max-w-[1800px] space-y-5 p-6">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Executive dashboard</h1>
            <p className="mt-1 text-sm text-white/40">
              A live view of financial, commercial, inventory, and workforce activity.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void Promise.all([finance.refetch(), crm.refetch(), orders.refetch(), inventory.refetch(), hr.refetch()]);
            }}
            disabled={finance.isFetching || crm.isFetching || orders.isFetching || inventory.isFetching || hr.isFetching}
            className="border-white/[0.1] bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${finance.isFetching ? "animate-spin" : ""}`} />
            Refresh data
          </Button>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Revenue" value={formatINRCompact(revenue)} detail="Posted finance entries" icon={TrendingUp} tone="text-blue-300 bg-blue-500/10" loading={financeLoading} />
          <MetricCard label="Net profit" value={formatINRCompact(netProfit)} detail="Revenue less expenses" icon={CircleDollarSign} tone="text-emerald-300 bg-emerald-500/10" loading={financeLoading} />
          <MetricCard label="Cash balance" value={formatINRCompact(cashFlow)} detail={`${financeData?.treasury.activeAccounts ?? 0} active accounts`} icon={Landmark} tone="text-cyan-300 bg-cyan-500/10" loading={financeLoading} />
          <MetricCard label="Open receivables" value={formatINRCompact(financeData?.kpis.accountsReceivable ?? 0)} detail={`${financeData?.kpis.openReceivables ?? 0} open invoices`} icon={ArrowUpRight} tone="text-amber-300 bg-amber-500/10" loading={financeLoading} />
          <MetricCard label="Open payables" value={formatINRCompact(financeData?.kpis.accountsPayable ?? 0)} detail={`${financeData?.kpis.openPayables ?? 0} open bills`} icon={ArrowDownRight} tone="text-red-300 bg-red-500/10" loading={financeLoading} />
          <MetricCard label="Sales orders" value={orders.data?.data?.salesOrders ?? 0} detail={`${orders.data?.data?.openSalesOrders ?? 0} open`} icon={ShoppingCart} tone="text-violet-300 bg-violet-500/10" loading={orders.isLoading} />
          <MetricCard label="Inventory value" value={formatINRCompact(inventory.data?.data?.totalValue ?? 0)} detail={`${inventory.data?.data?.lowStockCount ?? 0} low-stock items`} icon={Package} tone="text-orange-300 bg-orange-500/10" loading={inventory.isLoading} />
          <MetricCard label="Active employees" value={hr.data?.data?.activeEmployees ?? 0} detail={`${hr.data?.data?.pendingLeaves ?? 0} pending leave requests`} icon={Users} tone="text-fuchsia-300 bg-fuchsia-500/10" loading={hr.isLoading} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {quickActions.map(({ label, icon: IconComponent, path, tone }) => (
            <a
              key={label}
              href={path}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <IconComponent className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-white/65">{label}</span>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel
            title="Revenue and expenses"
            subtitle="Monthly totals from posted finance data"
            className="xl:col-span-2"
            action={<a href="/app/reports" className="text-xs text-blue-300 hover:text-blue-200">Reports <ArrowRight className="ml-1 inline h-3 w-3" /></a>}
          >
            {financeLoading ? <LoadingState /> : monthlyPL.length === 0 ? (
              <EmptyState message="No posted finance entries are available for this period." />
            ) : (
              <div className="space-y-3 px-5 py-5">
                {monthlyPL.map((month) => (
                  <div key={month.month} className="grid grid-cols-[56px_1fr_100px] items-center gap-3">
                    {(() => {
                      const expenses = month.cogs + month.opex;
                      return (
                        <>
                    <span className="text-xs text-white/40">{month.month}</span>
                    <div className="space-y-1.5">
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${(month.revenue / maxMonth) * 100}%` }} />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-red-400/80" style={{ width: `${(expenses / maxMonth) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right text-[11px] tabular-nums">
                      <p className="text-blue-200">{formatINRCompact(month.revenue)}</p>
                      <p className="text-red-200/70">{formatINRCompact(expenses)}</p>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
                <div className="flex gap-4 pt-1 text-[10px] text-white/35">
                  <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />Revenue</span>
                  <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-400" />Expenses</span>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Commercial pipeline" subtitle="Live CRM and order-management summary">
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-white/50"><Target className="h-3.5 w-3.5 text-blue-300" />Open opportunities</span>
                <strong className="text-sm text-white">{crm.isLoading ? "—" : crm.data?.data?.openOpportunities ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-white/50"><CircleDollarSign className="h-3.5 w-3.5 text-emerald-300" />Pipeline value</span>
                <strong className="text-sm text-white">{crm.isLoading ? "—" : formatINRCompact(crm.data?.data?.pipelineValue ?? 0)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-white/50"><CalendarClock className="h-3.5 w-3.5 text-amber-300" />Pending activities</span>
                <strong className="text-sm text-white">{crm.isLoading ? "—" : crm.data?.data?.pendingActivities ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-white/50"><BriefcaseBusiness className="h-3.5 w-3.5 text-violet-300" />Active deliveries</span>
                <strong className="text-sm text-white">{orders.isLoading ? "—" : orders.data?.data?.activeDeliveries ?? 0}</strong>
              </div>
              <a href="/app/crm" className="block pt-1 text-xs text-blue-300 hover:text-blue-200">Open CRM control tower <ArrowRight className="ml-1 inline h-3 w-3" /></a>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Recent finance activity" subtitle="Latest transactions recorded in the ledger" action={<a href="/app/finance" className="text-xs text-blue-300 hover:text-blue-200">Finance <ArrowRight className="ml-1 inline h-3 w-3" /></a>}>
            {financeLoading ? <LoadingState /> : (financeData?.recentTransactions?.length ?? 0) === 0 ? (
              <EmptyState message="No recent finance activity." />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {financeData?.recentTransactions.slice(0, 6).map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${transaction.direction === "credit" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {transaction.direction === "credit" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-300" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/75">{transaction.description}</p>
                      <p className="mt-0.5 text-[10px] text-white/30">{transaction.reference ?? transaction.category} · {timeAgo(transaction.transactedAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${transaction.direction === "credit" ? "text-emerald-300" : "text-red-300"}`}>
                      {transaction.direction === "credit" ? "+" : "-"}{formatINR(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Upcoming collections and payments" subtitle="Due items from finance records">
            {financeLoading ? <LoadingState /> : (financeData?.upcoming?.length ?? 0) === 0 ? (
              <EmptyState message="No upcoming collections or payments." />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {financeData?.upcoming.slice(0, 6).map((item, index) => (
                  <div key={`${item.date}-${item.label}-${index}`} className="flex items-center gap-3 px-5 py-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${item.type === "collection" ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                      {item.type === "collection" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" /> : <ArrowDownRight className="h-3.5 w-3.5 text-amber-300" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/75">{item.label}</p>
                      <p className="mt-0.5 text-[10px] capitalize text-white/30">{formatDate(item.date)} · {item.status}</p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-white/75">{formatINR(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {financeData?.lastUpdated && (
          <p className="flex items-center justify-end gap-1.5 text-[10px] text-white/25">
            <CheckCircle2 className="h-3 w-3 text-emerald-400/70" /> Finance data updated {timeAgo(financeData.lastUpdated)}
          </p>
        )}
      </div>
    </AppLayout>
  );
}