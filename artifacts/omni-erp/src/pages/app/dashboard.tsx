import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  Users, ArrowUpRight, MoreHorizontal, Plus, RefreshCw,
  Bot, CheckCircle2, AlertCircle, Activity, Target, Zap,
  Download, ChevronRight, Calendar, Clock, Briefcase,
  FileText, CreditCard, BarChart3, Layers, Percent,
  Building2, Star, ArrowRight, Circle,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import KPICard from '@/components/app/KPICard';
import StatusBadge from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Data ──────────────────────────────────────────────────────────────────

const revenueData = {
  '7d':  [
    { label: 'Mon', revenue: 1.1, expenses: 0.7, profit: 0.4 },
    { label: 'Tue', revenue: 1.4, expenses: 0.9, profit: 0.5 },
    { label: 'Wed', revenue: 1.2, expenses: 0.8, profit: 0.4 },
    { label: 'Thu', revenue: 1.8, expenses: 1.0, profit: 0.8 },
    { label: 'Fri', revenue: 2.1, expenses: 1.2, profit: 0.9 },
    { label: 'Sat', revenue: 0.9, expenses: 0.5, profit: 0.4 },
    { label: 'Sun', revenue: 0.6, expenses: 0.4, profit: 0.2 },
  ],
  '30d': [
    { label: 'Jan', revenue: 4.2, expenses: 2.8, profit: 1.4 },
    { label: 'Feb', revenue: 5.1, expenses: 3.1, profit: 2.0 },
    { label: 'Mar', revenue: 4.8, expenses: 2.9, profit: 1.9 },
    { label: 'Apr', revenue: 6.3, expenses: 3.4, profit: 2.9 },
    { label: 'May', revenue: 5.9, expenses: 3.2, profit: 2.7 },
    { label: 'Jun', revenue: 7.2, expenses: 3.8, profit: 3.4 },
    { label: 'Jul', revenue: 8.1, expenses: 4.1, profit: 4.0 },
  ],
  '90d': [
    { label: 'Q1', revenue: 14.1, expenses: 8.8, profit: 5.3 },
    { label: 'Apr', revenue: 6.3,  expenses: 3.4, profit: 2.9 },
    { label: 'May', revenue: 5.9,  expenses: 3.2, profit: 2.7 },
    { label: 'Jun', revenue: 7.2,  expenses: 3.8, profit: 3.4 },
    { label: 'Jul', revenue: 8.1,  expenses: 4.1, profit: 4.0 },
  ],
  '1y':  [
    { label: 'Q1', revenue: 14.1, expenses: 8.8, profit: 5.3 },
    { label: 'Q2', revenue: 19.4, expenses: 10.4, profit: 9.0 },
    { label: 'Q3', revenue: 22.7, expenses: 12.1, profit: 10.6 },
    { label: 'Q4 (est)', revenue: 26.3, expenses: 13.5, profit: 12.8 },
  ],
};

const cashFlowData = [
  { month: 'Jan', inflow: 5.2, outflow: -3.8 },
  { month: 'Feb', inflow: 6.1, outflow: -4.2 },
  { month: 'Mar', inflow: 5.8, outflow: -3.9 },
  { month: 'Apr', inflow: 7.3, outflow: -4.5 },
  { month: 'May', inflow: 6.9, outflow: -4.1 },
  { month: 'Jun', inflow: 8.2, outflow: -5.0 },
  { month: 'Jul', inflow: 9.1, outflow: -5.3 },
];

const salesPipeline = [
  { stage: 'Lead',       count: 284, value: 8.4,  color: '#94A3B8', pct: 100 },
  { stage: 'Qualified',  count: 147, value: 5.2,  color: '#60A5FA', pct: 72  },
  { stage: 'Proposal',   count: 89,  value: 3.8,  color: '#3B82F6', pct: 54  },
  { stage: 'Negotiation',count: 41,  value: 2.4,  color: '#2563EB', pct: 34  },
  { stage: 'Closed Won', count: 18,  value: 1.1,  color: '#06B6D4', pct: 18  },
];

const moduleUsage = [
  { name: 'Finance',   value: 28, color: '#2563EB' },
  { name: 'Sales',     value: 22, color: '#06B6D4' },
  { name: 'Inventory', value: 18, color: '#22C55E' },
  { name: 'HR',        value: 15, color: '#F59E0B' },
  { name: 'Projects',  value: 17, color: '#A78BFA' },
];

const kpis = [
  {
    label: 'Total Revenue', value: '$7.2M', change: '+14.3%', up: true,
    icon: DollarSign, iconColor: 'text-[#2563EB]', gradient: 'bg-[#2563EB]/15',
    sparkline: [4.2, 5.1, 4.8, 6.3, 5.9, 7.2, 8.1], changeLabel: 'vs last period',
  },
  {
    label: 'Total Orders', value: '1,847', change: '+8.2%', up: true,
    icon: ShoppingCart, iconColor: 'text-[#06B6D4]', gradient: 'bg-[#06B6D4]/15',
    sparkline: [120, 185, 143, 210, 198, 240, 267], changeLabel: 'vs last period',
  },
  {
    label: 'Inventory Value', value: '$2.4M', change: '-1.2%', up: false,
    icon: Package, iconColor: 'text-amber-400', gradient: 'bg-amber-500/15',
    sparkline: [2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.4], changeLabel: 'vs last period',
  },
  {
    label: 'Active Employees', value: '342', change: '+4', up: true,
    icon: Users, iconColor: 'text-emerald-400', gradient: 'bg-emerald-500/15',
    sparkline: [320, 325, 330, 335, 336, 340, 342], changeLabel: 'this month',
  },
  {
    label: 'Net Profit', value: '$1.8M', change: '+21.5%', up: true,
    icon: TrendingUp, iconColor: 'text-purple-400', gradient: 'bg-purple-500/15',
    sparkline: [1.0, 1.2, 1.1, 1.4, 1.5, 1.7, 1.8], changeLabel: 'vs last period',
  },
  {
    label: 'Net Cash Flow', value: '$3.8M', change: '+9.7%', up: true,
    icon: Activity, iconColor: 'text-rose-400', gradient: 'bg-rose-500/15',
    sparkline: [2.4, 2.8, 3.0, 3.1, 3.4, 3.6, 3.8], changeLabel: 'vs last period',
  },
];

const recentActivity = [
  { id: 'INV-4821', type: 'Invoice Paid',      company: 'Stratford Industries', amount: '+$48,200', status: 'paid',       time: '2m ago',  icon: DollarSign },
  { id: 'PO-1092',  type: 'Purchase Order',    company: 'TechParts Ltd.',       amount: '$12,400',  status: 'pending',    time: '18m ago', icon: ShoppingCart },
  { id: 'SO-3341',  type: 'Sales Order',       company: 'Apex Global',          amount: '$94,500',  status: 'processing', time: '1h ago',  icon: FileText },
  { id: 'PAY-0291', type: 'Payment Received',  company: 'Meridian Corp',        amount: '+$31,500', status: 'paid',       time: '2h ago',  icon: CreditCard },
  { id: 'INV-4819', type: 'Invoice Created',   company: 'BlueSky Tech',         amount: '$7,800',   status: 'draft',      time: '3h ago',  icon: FileText },
  { id: 'SO-3340',  type: 'Quote Accepted',    company: 'Northstar LLC',        amount: '$22,150',  status: 'approved',   time: '4h ago',  icon: Star },
  { id: 'PO-1091',  type: 'PO Approved',       company: 'Vertex Supply Co.',    amount: '$9,340',   status: 'approved',   time: '5h ago',  icon: CheckCircle2 },
];

const tasks = [
  { title: 'Approve Q3 Budget Report',      due: 'Today',    priority: 'high',   done: false },
  { title: 'Review vendor contracts',        due: 'Tomorrow', priority: 'medium', done: false },
  { title: 'Monthly payroll processing',     due: 'Jul 31',   priority: 'high',   done: false },
  { title: 'Update inventory thresholds',    due: 'Aug 2',    priority: 'low',    done: true  },
  { title: 'Audit user permissions',         due: 'Aug 5',    priority: 'medium', done: false },
];

const aiInsights = [
  { icon: TrendingUp,   text: 'Revenue trending 18% above Q3 forecast. Consider accelerating capacity investment.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: AlertCircle,  text: 'SKU-2841 below reorder point — estimated 3 days of stock remaining.', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: Target,       text: 'Sales pipeline value $2.84M — 12 deals projected to close this month.', color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10' },
  { icon: Zap,          text: 'Automating 4 recurring AP invoices could save approx. 6 hours/week.', color: 'text-[#06B6D4]', bg: 'bg-[#06B6D4]/10' },
];

const projects = [
  { name: 'ERP Migration Phase 2',  progress: 72, status: 'active',   due: 'Aug 15', team: 8 },
  { name: 'Customer Portal Launch', progress: 91, status: 'review',   due: 'Jul 30', team: 5 },
  { name: 'Warehouse Expansion',    progress: 34, status: 'active',   due: 'Sep 20', team: 12 },
  { name: 'Payroll System Upgrade', progress: 58, status: 'on-hold',  due: 'Aug 5',  team: 4 },
];

const quickActions = [
  { label: 'New Invoice',         icon: FileText,  color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10', path: '/app/finance' },
  { label: 'New Sales Order',     icon: ShoppingCart, color: 'text-[#06B6D4]', bg: 'bg-[#06B6D4]/10', path: '/app/sales' },
  { label: 'Add Employee',        icon: Users,     color: 'text-purple-400', bg: 'bg-purple-500/10', path: '/app/hr' },
  { label: 'Create Purchase Order', icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', path: '/app/purchase' },
  { label: 'Run Report',          icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/app/reports' },
  { label: 'Ask AI',              icon: Bot,       color: 'text-rose-400', bg: 'bg-rose-500/10', path: '/app/ai' },
];

const calendarEvents = [
  { time: '09:00', title: 'Board Meeting',         type: 'meeting' },
  { time: '11:00', title: 'Q3 Budget Review',      type: 'finance' },
  { time: '14:00', title: 'Vendor Call – TechParts', type: 'vendor' },
  { time: '16:30', title: 'Payroll Deadline',       type: 'hr' },
];

const topCustomers = [
  { name: 'Stratford Industries', revenue: '$284K', growth: '+22%', up: true },
  { name: 'Apex Global Inc.',     revenue: '$191K', growth: '+8%',  up: true },
  { name: 'Meridian Corp',        revenue: '$147K', growth: '-3%',  up: false },
  { name: 'BlueSky Technology',   revenue: '$98K',  growth: '+41%', up: true },
];

// ─── Sub-components ────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1225] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-white/60 capitalize">{p.name}:</span>
          <span className="text-xs font-semibold text-white">${p.value}M</span>
        </div>
      ))}
    </div>
  );
};

const CashTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1225] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-white/60 capitalize">{p.name}:</span>
          <span className="text-xs font-semibold text-white">${Math.abs(p.value)}M</span>
        </div>
      ))}
    </div>
  );
};

const SectionCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-[#0a0f1e] border border-white/[0.07] rounded-xl', className)}>
    {children}
  </div>
);

const SectionHeader = ({
  title, subtitle, action, actionLabel,
}: {
  title: string; subtitle?: string; action?: () => void; actionLabel?: string;
}) => (
  <div className="flex items-center justify-between px-5 pt-5 pb-4">
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-white/35 mt-0.5">{subtitle}</p>}
    </div>
    {action && actionLabel && (
      <button
        onClick={action}
        className="text-xs text-[#2563EB] hover:text-[#60A5FA] transition-colors flex items-center gap-1"
      >
        {actionLabel} <ArrowRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────

export default function Dashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activityTab, setActivityTab] = useState('all');

  const currentRevData = revenueData[period];

  const filteredActivity = activityTab === 'all'
    ? recentActivity
    : recentActivity.filter(a => {
        if (activityTab === 'invoices') return a.id.startsWith('INV');
        if (activityTab === 'orders')   return a.id.startsWith('SO') || a.id.startsWith('PO');
        if (activityTab === 'payments') return a.id.startsWith('PAY');
        return true;
      });

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="p-6 max-w-[1800px] mx-auto space-y-5">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 border text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse" />
                Live
              </Badge>
            </div>
            <p className="text-sm text-white/40">
              Monday, July 28, 2026 &nbsp;·&nbsp; Apex Global Inc. &nbsp;·&nbsp;
              <span className="text-white/25">Last updated 2 min ago</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Selector */}
            <div className="flex bg-white/[0.04] border border-white/[0.07] rounded-lg p-0.5">
              {(['7d', '30d', '90d', '1y'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                    period === p
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Quick Add
            </Button>
          </div>
        </motion.div>

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((kpi, i) => (
            <KPICard key={kpi.label} {...kpi} index={i} />
          ))}
        </div>

        {/* ── Charts Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="xl:col-span-2"
          >
            <SectionCard className="h-full">
              <SectionHeader
                title="Revenue vs Expenses"
                subtitle={`Monthly performance · ${period === '1y' ? 'FY 2026' : 'Jul 2026'}`}
              />
              <div className="px-5 pb-2">
                <div className="flex items-center gap-5 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-white">$8.1M</p>
                    <p className="text-xs text-white/35">Revenue this period</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.07]" />
                  <div>
                    <p className="text-xl font-bold text-[#06B6D4]">$4.1M</p>
                    <p className="text-xs text-white/35">Total expenses</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.07]" />
                  <div>
                    <p className="text-xl font-bold text-emerald-400">$4.0M</p>
                    <p className="text-xs text-white/35">Net profit</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    +14.3%
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={currentRevData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#06B6D4" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#22C55E" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `$${v}M`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue"  stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)"    dot={false} activeDot={{ r: 4, fill: '#2563EB' }} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#06B6D4" strokeWidth={2} fill="url(#expGrad)"    dot={false} activeDot={{ r: 4, fill: '#06B6D4' }} />
                    <Area type="monotone" dataKey="profit"  name="Profit"   stroke="#22C55E" strokeWidth={1.5} fill="url(#profitGrad)" dot={false} activeDot={{ r: 4, fill: '#22C55E' }} strokeDasharray="5 3" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-3">
                  {[
                    { label: 'Revenue',  color: '#2563EB' },
                    { label: 'Expenses', color: '#06B6D4' },
                    { label: 'Profit',   color: '#22C55E' },
                  ].map(l => (
                    <span key={l.label} className="flex items-center gap-1.5 text-xs text-white/40">
                      <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* Sales Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionCard className="h-full">
              <SectionHeader title="Sales Pipeline" subtitle="Active deals by stage" />
              <div className="px-5 pb-5 space-y-3">
                {salesPipeline.map((stage, i) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-white/70">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/35">{stage.count} deals</span>
                        <span className="text-xs font-semibold text-white">${stage.value}M</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.pct}%` }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: stage.color }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-white/[0.06] mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Total Pipeline Value</span>
                    <span className="text-sm font-bold text-white">$20.9M</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-white/40">Win Rate</span>
                    <span className="text-sm font-semibold text-emerald-400">43.9%</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        </div>

        {/* ── Middle Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Cash Flow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <SectionCard className="h-full">
              <SectionHeader title="Cash Flow" subtitle="Monthly inflow vs outflow" />
              <div className="px-5 pb-5">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={cashFlowData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.abs(v)}M`} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CashTooltip />} />
                    <Bar dataKey="inflow"  name="Inflow"  fill="#22C55E" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="outflow" name="Outflow" fill="#EF4444" radius={[0, 0, 3, 3]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Outflow
                  </span>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* Module Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <SectionCard className="h-full">
              <SectionHeader title="Module Activity" subtitle="Usage by active transactions" />
              <div className="px-5 pb-5">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={moduleUsage}
                        cx="50%" cy="50%"
                        innerRadius={48} outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {moduleUsage.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#0d1225', border: '1px solid rgba(255,255,255,0.09)',
                          borderRadius: '12px', color: 'white', fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                  {moduleUsage.map(m => (
                    <div key={m.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <span className="text-xs text-white/50 truncate">{m.name}</span>
                      <span className="text-xs font-semibold text-white ml-auto">{m.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <SectionCard className="h-full">
              <SectionHeader title="Quick Actions" subtitle="Frequently used shortcuts" />
              <div className="px-4 pb-5 grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="flex flex-col items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group text-left"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', action.bg)}>
                      <action.icon className={cn('w-4 h-4', action.color)} />
                    </div>
                    <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>
          </motion.div>
        </div>

        {/* ── Recent Activity ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SectionCard>
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                <p className="text-xs text-white/35 mt-0.5">All transactions across modules</p>
              </div>
              <button className="text-xs text-[#2563EB] hover:text-[#60A5FA] transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {/* Tabs */}
            <div className="px-5 pt-3 pb-0">
              <Tabs value={activityTab} onValueChange={setActivityTab}>
                <TabsList className="bg-white/[0.04] border border-white/[0.07] h-8 p-0.5">
                  {[
                    { value: 'all',      label: 'All' },
                    { value: 'invoices', label: 'Invoices' },
                    { value: 'orders',   label: 'Orders' },
                    { value: 'payments', label: 'Payments' },
                  ].map(t => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="text-xs h-7 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/40"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {/* Table */}
            <div className="mt-3">
              <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr_auto] gap-x-4 px-5 py-2 border-b border-white/[0.05]">
                {['', 'Transaction', 'Company', 'Amount', 'Time', 'Status'].map((h, i) => (
                  <span key={i} className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {filteredActivity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr_auto] gap-x-4 items-center px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group last:border-b-0"
                >
                  <div className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center">
                    <item.icon className="w-3 h-3 text-white/30" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-white transition-colors">{item.type}</p>
                    <p className="text-[11px] text-white/30 font-mono">{item.id}</p>
                  </div>
                  <p className="text-sm text-white/60 truncate">{item.company}</p>
                  <p className={cn(
                    'text-sm font-semibold',
                    item.amount.startsWith('+') ? 'text-emerald-400' : 'text-white'
                  )}>
                    {item.amount}
                  </p>
                  <div className="flex items-center gap-1 text-white/30">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{item.time}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </motion.div>
              ))}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Bottom Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Projects Overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <SectionCard className="h-full">
              <SectionHeader title="Active Projects" subtitle={`${projects.filter(p => p.status === 'active').length} in progress`} actionLabel="View all" action={() => {}} />
              <div className="px-5 pb-5 space-y-4">
                {projects.map((project, i) => (
                  <div key={project.name} className="group cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors truncate">{project.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />Due {project.due}
                          </span>
                          <span className="text-white/20">·</span>
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <Users className="w-3 h-3" />{project.team} members
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={project.status} showDot={false} className="ml-2 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full',
                            project.progress > 80 ? 'bg-emerald-500' :
                            project.progress > 50 ? 'bg-[#2563EB]' : 'bg-amber-500'
                          )}
                        />
                      </div>
                      <span className="text-xs font-semibold text-white/50 w-8 text-right">{project.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Today's Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <SectionCard className="h-full">
              <SectionHeader title="Today's Schedule" subtitle="Monday, July 28" />
              <div className="px-5 pb-4 space-y-2">
                {calendarEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <div className="text-right flex-shrink-0 w-12">
                      <span className="text-[11px] font-semibold text-white/40">{event.time}</span>
                    </div>
                    <div className="w-px self-stretch bg-white/[0.07] flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{event.title}</p>
                      <p className="text-xs text-white/30 capitalize mt-0.5">{event.type}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.06]">
                  <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-white/[0.03] text-xs text-white/30 hover:text-white/60 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Add event
                  </button>
                </div>
              </div>

              {/* Pending Tasks */}
              <div className="border-t border-white/[0.06] px-5 pt-4 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Pending Tasks</h4>
                  <span className="text-xs text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">
                    {tasks.filter(t => !t.done).length} open
                  </span>
                </div>
                <div className="space-y-1.5">
                  {tasks.map((task, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group',
                        task.done && 'opacity-45'
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          task.done ? 'text-emerald-400' : 'text-white/15 group-hover:text-white/30'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-medium truncate transition-colors',
                          task.done ? 'line-through text-white/25' : 'text-white/70 group-hover:text-white/90'
                        )}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-white/25 mt-0.5">{task.due}</p>
                      </div>
                      <StatusBadge status={task.priority} showDot={false} className="text-[10px] py-0 px-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* AI Insights + Top Customers */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.41 }}
            className="space-y-4"
          >
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-[#2563EB]/12 via-[#1e3a8a]/8 to-[#06B6D4]/8 border border-[#2563EB]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/30 to-[#06B6D4]/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-[#06B6D4]" />
                </div>
                <h3 className="text-sm font-semibold text-white">AI Insights</h3>
                <Badge className="ml-auto bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/25 border text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] inline-block mr-1 animate-pulse" />
                  Live
                </Badge>
              </div>
              <div className="space-y-2.5">
                {aiInsights.map((insight, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-lg',
                      insight.bg
                    )}
                  >
                    <insight.icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', insight.color)} />
                    <p className="text-xs text-white/65 leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-[#06B6D4] hover:text-[#22D3EE] transition-colors py-2 rounded-lg hover:bg-white/[0.04]">
                Ask AI for more insights <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Top Customers */}
            <SectionCard>
              <SectionHeader title="Top Customers" subtitle="By revenue this period" />
              <div className="px-5 pb-4 space-y-2">
                {topCustomers.map((customer, i) => (
                  <div key={customer.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/75 group-hover:text-white transition-colors truncate">{customer.name}</p>
                      <p className="text-[11px] font-bold text-white/90 mt-0.5">{customer.revenue}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-semibold',
                      customer.up ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {customer.growth}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </motion.div>
        </div>

      </div>
    </AppLayout>
  );
}
