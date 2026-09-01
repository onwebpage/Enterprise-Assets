import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Download, Search, Plus,
  FileText, Clock, Star, Play, MoreHorizontal, Loader2,
  DollarSign, Users, Package, ShoppingCart, AlertTriangle,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  useReportsOverview, useReportsARaging, useReportsAPaging,
  useReportsInventory, useReportsHR, useReportsPurchase,
} from '@/hooks/useReports';
import { formatINR } from '@/lib/currency';

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtCurrency(v: number, compact = true): string {
  return formatINR(v, compact);
}

function fmtPct(v: number): string { return `${v.toFixed(1)}%`; }

// ── Chart tooltip style ───────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: '#0a0f1e',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    color: 'white',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

const COLORS = ['#2563EB', '#06B6D4', '#22C55E', '#F59E0B', '#A855F7', '#EF4444', '#F97316', '#14B8A6'];
const AGING_COLORS = ['#22C55E', '#F59E0B', '#F97316', '#EF4444', '#991B1B'];

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.06] animate-pulse rounded-lg ${className}`} />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  up?: boolean | null;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

function KPICard({ label, value, sub, up, icon: Icon, color, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {up !== null && up !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 ${className}`}>
      <h3 className="font-semibold text-white mb-4 text-sm">{title}</h3>
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-white/25">
      <BarChart3 className="w-8 h-8 mb-2" />
      <p className="text-xs">{msg}</p>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ months, setMonths }: { months: number; setMonths: (m: number) => void }) {
  const { data, isLoading } = useReportsOverview(months);

  const kpis = data?.kpis;
  const trend = data?.monthlyTrend ?? [];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/40">Period:</span>
        {[
          { label: '3M', val: 3 }, { label: '6M', val: 6 },
          { label: '12M', val: 12 }, { label: '24M', val: 24 },
        ].map(opt => (
          <button
            key={opt.val}
            onClick={() => setMonths(opt.val)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${months === opt.val ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Total Revenue" value={fmtCurrency(kpis?.totalRevenue ?? 0)} icon={TrendingUp} color="#22C55E" up={true} delay={0} />
          <KPICard label="Total Expenses" value={fmtCurrency(kpis?.totalExpenses ?? 0)} icon={TrendingDown} color="#EF4444" up={false} delay={0.05} />
          <KPICard label="Net Profit" value={fmtCurrency(kpis?.netProfit ?? 0)} sub={`${fmtPct(kpis?.grossMargin ?? 0)} margin`} icon={DollarSign} color="#2563EB" up={(kpis?.netProfit ?? 0) > 0} delay={0.1} />
          <KPICard label="Outstanding AR" value={fmtCurrency(kpis?.outstandingAR ?? 0)} sub="Receivable" icon={FileText} color="#F59E0B" delay={0.15} />
          <KPICard label="Outstanding AP" value={fmtCurrency(kpis?.outstandingAP ?? 0)} sub="Payable" icon={FileText} color="#F97316" delay={0.2} />
          <KPICard label="Inventory Value" value={fmtCurrency(kpis?.inventoryValue ?? 0)} icon={Package} color="#06B6D4" delay={0.25} />
          <KPICard label="Active Employees" value={String(kpis?.totalEmployees ?? 0)} icon={Users} color="#A855F7" delay={0.3} />
          <KPICard label="Latest Payroll" value={fmtCurrency(kpis?.latestPayroll ?? 0)} icon={DollarSign} color="#14B8A6" delay={0.35} />
        </div>
      )}

      {/* Revenue vs Expenses chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Revenue vs Expenses Trend" className="xl:col-span-2">
          {isLoading ? <Skeleton className="h-52" /> : trend.length === 0 ? <EmptyChart msg="No transaction data yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} />
                <Tooltip {...tooltipStyle} formatter={(val: number, name: string) => [fmtCurrency(val, false), name]} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22C55E" strokeWidth={2} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2} fill="url(#expGrad)" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#2563EB" strokeWidth={2} fill="url(#profGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Profit Breakdown">
          {isLoading ? <Skeleton className="h-52" /> : trend.length === 0 ? <EmptyChart msg="No data" /> : (() => {
            const totalRev = trend.reduce((s, m) => s + m.revenue, 0);
            const totalExp = trend.reduce((s, m) => s + m.expenses, 0);
            const totalPro = trend.reduce((s, m) => s + m.profit, 0);
            const pieData = [
              { name: 'Net Profit', value: Math.max(0, totalPro) },
              { name: 'Expenses', value: totalExp },
            ].filter(d => d.value > 0);
            return (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={['#2563EB', '#EF4444'][i]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => fmtCurrency(v, false)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {[
                    { l: 'Revenue', v: totalRev, c: '#22C55E' },
                    { l: 'Expenses', v: totalExp, c: '#EF4444' },
                    { l: 'Net Profit', v: totalPro, c: '#2563EB' },
                  ].map(item => (
                    <div key={item.l} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: item.c }} />
                        <span className="text-xs text-white/50">{item.l}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">{fmtCurrency(item.v)}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}

// ── Finance Tab (AR + AP Aging) ───────────────────────────────────────────────

function FinanceTab() {
  const { data: ar, isLoading: arLoading } = useReportsARaging();
  const { data: ap, isLoading: apLoading } = useReportsAPaging();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* AR Aging */}
        <Card title="Accounts Receivable Aging">
          {arLoading ? <Skeleton className="h-52" /> : !ar || ar.invoiceCount === 0 ? <EmptyChart msg="No open AR invoices" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ar.aging} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, _n: string, p: any) => [`${fmtCurrency(v, false)} · ${p.payload.count} inv`, 'Outstanding']} />
                  <Bar dataKey="amount" name="Outstanding" radius={[4, 4, 0, 0]}>
                    {ar.aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40">Total Outstanding</p>
                  <p className="text-lg font-bold text-white">{fmtCurrency(ar.totalOutstanding, false)}</p>
                </div>
                <p className="text-xs text-white/30">{ar.invoiceCount} open invoice{ar.invoiceCount !== 1 ? 's' : ''}</p>
              </div>
              {ar.topCustomers.length > 0 && (
                <div className="mt-3 border-t border-white/[0.05] pt-3 space-y-2">
                  <p className="text-xs text-white/30 font-medium">Top by outstanding</p>
                  {ar.topCustomers.map(c => (
                    <div key={c.name} className="flex items-center justify-between">
                      <span className="text-xs text-white/60 truncate max-w-[60%]">{c.name}</span>
                      <span className="text-xs font-semibold text-amber-400">{fmtCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        {/* AP Aging */}
        <Card title="Accounts Payable Aging">
          {apLoading ? <Skeleton className="h-52" /> : !ap || ap.billCount === 0 ? <EmptyChart msg="No open AP bills" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ap.aging} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, _n: string, p: any) => [`${fmtCurrency(v, false)} · ${p.payload.count} bills`, 'Payable']} />
                  <Bar dataKey="amount" name="Payable" radius={[4, 4, 0, 0]}>
                    {ap.aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40">Total Payable</p>
                  <p className="text-lg font-bold text-white">{fmtCurrency(ap.totalOutstanding, false)}</p>
                </div>
                <p className="text-xs text-white/30">{ap.billCount} open bill{ap.billCount !== 1 ? 's' : ''}</p>
              </div>
              {ap.topVendors.length > 0 && (
                <div className="mt-3 border-t border-white/[0.05] pt-3 space-y-2">
                  <p className="text-xs text-white/30 font-medium">Top by payable</p>
                  {ap.topVendors.map(v => (
                    <div key={v.name} className="flex items-center justify-between">
                      <span className="text-xs text-white/60 truncate max-w-[60%]">{v.name}</span>
                      <span className="text-xs font-semibold text-orange-400">{fmtCurrency(v.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Operations Tab (Inventory + Purchase) ─────────────────────────────────────

function OperationsTab() {
  const { data: inv, isLoading: invLoading } = useReportsInventory();
  const { data: po, isLoading: poLoading } = useReportsPurchase();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Inventory by category */}
        <Card title="Inventory Value by Category">
          {invLoading ? <Skeleton className="h-52" /> : !inv || inv.byCategory.length === 0 ? <EmptyChart msg="No inventory data" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={inv.byCategory.slice(0, 6)} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} />
                  <YAxis dataKey="category" type="category" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtCurrency(v, false), 'Value']} />
                  <Bar dataKey="totalValue" name="Value" radius={[0, 4, 4, 0]}>
                    {inv.byCategory.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </Card>

        {/* Low stock alert */}
        <Card title="Low Stock Alerts">
          {invLoading ? <Skeleton className="h-52" /> : !inv || inv.lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/25">
              <Package className="w-8 h-8 mb-2 text-emerald-500/40" />
              <p className="text-xs text-emerald-400/60">All stock levels healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inv.lowStock.map(item => (
                <div key={item.sku} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{item.name}</p>
                    <p className="text-[10px] text-white/30">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-400 font-semibold">{item.onHand} on hand</p>
                    <p className="text-[10px] text-white/30">reorder @ {item.reorderPoint}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Purchase spend */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Purchase Spend Trend (6M)">
          {poLoading ? <Skeleton className="h-52" /> : !po || po.monthlyTrend.every(m => m.amount === 0) ? <EmptyChart msg="No purchase orders" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={po.monthlyTrend}>
                <defs>
                  <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtCurrency(v, false), 'Spend']} />
                <Area type="monotone" dataKey="amount" name="Spend" stroke="#06B6D4" strokeWidth={2} fill="url(#poGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Top Vendors by Spend">
          {poLoading ? <Skeleton className="h-52" /> : !po || po.byVendor.length === 0 ? <EmptyChart msg="No vendor data" /> : (
            <div className="space-y-3">
              {po.byVendor.slice(0, 6).map((v, i) => {
                const max = po.byVendor[0]?.totalAmount ?? 1;
                const pct = (v.totalAmount / max) * 100;
                return (
                  <div key={v.vendorName}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/70 truncate max-w-[60%]">{v.vendorName}</span>
                      <span className="text-xs font-semibold text-white">{fmtCurrency(v.totalAmount)}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <p className="text-[10px] text-white/25 mt-0.5">{v.orderCount} order{v.orderCount !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── HR Tab ────────────────────────────────────────────────────────────────────

function HRTab() {
  const { data, isLoading } = useReportsHR();

  const statusColors: Record<string, string> = {
    active: '#22C55E', inactive: '#6B7280', on_leave: '#F59E0B', terminated: '#EF4444',
  };
  const typeColors: Record<string, string> = {
    full_time: '#2563EB', part_time: '#06B6D4', contract: '#F59E0B', intern: '#A855F7',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Headcount by dept */}
        <Card title="Headcount by Department" className="xl:col-span-2">
          {isLoading ? <Skeleton className="h-52" /> : !data || data.byDept.length === 0 ? <EmptyChart msg="No employee data" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byDept} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="deptName" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number, _n: string, p: any) => [`${v} employees · ${fmtCurrency(p.payload.totalSalary)} salary`, '']} />
                <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                  {data.byDept.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Status + Type breakdown */}
        <div className="space-y-4">
          <Card title="By Status">
            {isLoading ? <Skeleton className="h-24" /> : !data ? null : (
              <div className="space-y-2">
                {data.byStatus.map(s => (
                  <div key={s.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: statusColors[s.status] ?? '#666' }} />
                      <span className="text-xs text-white/60 capitalize">{s.status.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="By Employment Type">
            {isLoading ? <Skeleton className="h-24" /> : !data ? null : (
              <div className="space-y-2">
                {data.byType.map(t => (
                  <div key={t.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: typeColors[t.type] ?? '#666' }} />
                      <span className="text-xs text-white/60 capitalize">{t.type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Payroll trend */}
      <Card title="Payroll Trend — Last 6 Months">
        {isLoading ? <Skeleton className="h-48" /> : !data || data.payrollTrend.every(m => m.totalNet === 0) ? <EmptyChart msg="No payroll runs yet" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.payrollTrend} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtCurrency(v, false), 'Net Pay']} />
              <Bar dataKey="totalNet" name="Net Pay" fill="#A855F7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function SavedTab() {
  const [search, setSearch] = useState('');
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.07]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm"
          />
        </div>
      </div>
      <div className="px-6 py-16 text-center">
        <FileText className="mx-auto mb-3 h-9 w-9 text-white/20" />
        <p className="text-sm font-medium text-white/60">
          {search ? 'No saved reports match your search.' : 'No saved reports are configured.'}
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/30">
          Saved reports will appear here after a report definition and schedule are created.
          The application does not display placeholder report records.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [tab, setTab] = useState('overview');
  const [months, setMonths] = useState(12);

  return (
    <AppLayout breadcrumbs={[{ label: 'Intelligence' }, { label: 'Reports & Analytics' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
            <p className="text-white/40 text-sm mt-0.5">Real-time data across all modules</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Report
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {[
              { val: 'overview',    label: 'Overview' },
              { val: 'finance',     label: 'Finance' },
              { val: 'operations',  label: 'Operations' },
              { val: 'hr',          label: 'HR' },
              { val: 'saved',       label: 'Saved Reports' },
            ].map(t => (
              <TabsTrigger
                key={t.val} value={t.val}
                className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"   className="mt-4"><OverviewTab months={months} setMonths={setMonths} /></TabsContent>
          <TabsContent value="finance"    className="mt-4"><FinanceTab /></TabsContent>
          <TabsContent value="operations" className="mt-4"><OperationsTab /></TabsContent>
          <TabsContent value="hr"         className="mt-4"><HRTab /></TabsContent>
          <TabsContent value="saved"      className="mt-4"><SavedTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
