import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  Users, ArrowUpRight, ArrowDownRight, MoreHorizontal, Plus,
  Calendar, Bell, Zap, Bot, Clock, CheckCircle2, AlertCircle,
  Activity, Target, Layers, RefreshCw
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const revenueData = [
  { month: 'Jan', revenue: 4.2, expenses: 2.8, profit: 1.4 },
  { month: 'Feb', revenue: 5.1, expenses: 3.1, profit: 2.0 },
  { month: 'Mar', revenue: 4.8, expenses: 2.9, profit: 1.9 },
  { month: 'Apr', revenue: 6.3, expenses: 3.4, profit: 2.9 },
  { month: 'May', revenue: 5.9, expenses: 3.2, profit: 2.7 },
  { month: 'Jun', revenue: 7.2, expenses: 3.8, profit: 3.4 },
  { month: 'Jul', revenue: 8.1, expenses: 4.1, profit: 4.0 },
];

const salesData = [
  { day: 'Mon', sales: 120 }, { day: 'Tue', sales: 185 }, { day: 'Wed', sales: 143 },
  { day: 'Thu', sales: 210 }, { day: 'Fri', sales: 198 }, { day: 'Sat', sales: 87 }, { day: 'Sun', sales: 62 },
];

const cashFlowData = [
  { month: 'Jan', inflow: 5.2, outflow: 3.8 }, { month: 'Feb', inflow: 6.1, outflow: 4.2 },
  { month: 'Mar', inflow: 5.8, outflow: 3.9 }, { month: 'Apr', inflow: 7.3, outflow: 4.5 },
  { month: 'May', inflow: 6.9, outflow: 4.1 }, { month: 'Jun', inflow: 8.2, outflow: 5.0 },
  { month: 'Jul', inflow: 9.1, outflow: 5.3 },
];

const moduleData = [
  { name: 'Finance', value: 28, color: '#2563EB' },
  { name: 'Sales', value: 22, color: '#06B6D4' },
  { name: 'Inventory', value: 18, color: '#22C55E' },
  { name: 'HR', value: 15, color: '#F59E0B' },
  { name: 'Projects', value: 17, color: '#A78BFA' },
];

const kpis = [
  { label: 'Total Revenue', value: '$7.2M', change: '+14.3%', up: true, icon: DollarSign, color: 'from-[#2563EB]/20 to-[#2563EB]/5', iconColor: 'text-[#2563EB]' },
  { label: 'Total Orders', value: '1,847', change: '+8.2%', up: true, icon: ShoppingCart, color: 'from-[#06B6D4]/20 to-[#06B6D4]/5', iconColor: 'text-[#06B6D4]' },
  { label: 'Inventory Value', value: '$2.4M', change: '-1.2%', up: false, icon: Package, color: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-400' },
  { label: 'Active Employees', value: '342', change: '+4', up: true, icon: Users, color: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400' },
  { label: 'Net Profit', value: '$1.8M', change: '+21.5%', up: true, icon: TrendingUp, color: 'from-purple-500/20 to-purple-500/5', iconColor: 'text-purple-400' },
  { label: 'Cash Flow', value: '$3.8M', change: '+9.7%', up: true, icon: Activity, color: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-400' },
];

const recentActivity = [
  { id: 'INV-4821', type: 'Invoice Paid', company: 'Stratford Industries', amount: '$48,200', status: 'paid', time: '2m ago' },
  { id: 'PO-1092', type: 'Purchase Order', company: 'TechParts Ltd.', amount: '$12,400', status: 'pending', time: '18m ago' },
  { id: 'SO-3341', type: 'Sales Order', company: 'Apex Global', amount: '$94,500', status: 'processing', time: '1h ago' },
  { id: 'PAY-0291', type: 'Payment Received', company: 'Meridian Corp', amount: '$31,500', status: 'paid', time: '2h ago' },
  { id: 'INV-4819', type: 'Invoice Created', company: 'BlueSky Tech', amount: '$7,800', status: 'draft', time: '3h ago' },
];

const tasks = [
  { title: 'Approve Q3 Budget Report', due: 'Today', priority: 'high', done: false },
  { title: 'Review vendor contracts', due: 'Tomorrow', priority: 'medium', done: false },
  { title: 'Monthly payroll processing', due: 'Jul 31', priority: 'high', done: false },
  { title: 'Update inventory thresholds', due: 'Aug 2', priority: 'low', done: true },
  { title: 'Audit user permissions', due: 'Aug 5', priority: 'medium', done: false },
];

const aiInsights = [
  { icon: TrendingUp, text: 'Revenue trending 18% above forecast for Q3', color: 'text-emerald-400' },
  { icon: AlertCircle, text: 'SKU-2841 inventory below reorder point — 3 days stock', color: 'text-amber-400' },
  { icon: Target, text: 'Sales pipeline value $2.84M — 12 deals closing this month', color: 'text-[#2563EB]' },
  { icon: Zap, text: 'Automate 4 recurring AP invoices to save 6 hours/week', color: 'text-[#06B6D4]' },
];

const statusStyle: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  processing: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  draft: 'bg-white/5 text-white/50 border-white/10',
};

const priorityStyle: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-3 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: ${p.value}M
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
            <p className="text-white/40 text-sm mt-0.5">Monday, July 28, 2026 · Apex Global Inc.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/[0.04] border border-white/[0.07] rounded-lg p-1 gap-0.5">
              {(['7d', '30d', '90d', '1y'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Quick Add
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.change}
                </span>
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white">Revenue vs Expenses</h3>
                <p className="text-xs text-white/40 mt-0.5">Monthly performance · 2026</p>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#06B6D4" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-white/50"><span className="w-3 h-0.5 bg-[#2563EB] rounded-full inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5 text-xs text-white/50"><span className="w-3 h-0.5 bg-[#06B6D4] rounded-full inline-block" />Expenses</span>
            </div>
          </div>

          {/* Module Distribution */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white">Module Usage</h3>
                <p className="text-xs text-white/40 mt-0.5">By active transactions</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={moduleData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {moduleData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {moduleData.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-xs text-white/50 truncate">{m.name}</span>
                  <span className="text-xs text-white/70 ml-auto">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Activity */}
          <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Recent Activity</h3>
              <button className="text-xs text-[#2563EB] hover:underline">View all</button>
            </div>
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{item.type}</span>
                      <span className="text-xs text-white/30">·</span>
                      <span className="text-xs text-white/40">{item.id}</span>
                    </div>
                    <p className="text-xs text-white/40 truncate">{item.company}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{item.amount}</p>
                    <p className="text-xs text-white/30">{item.time}</p>
                  </div>
                  <Badge className={`text-[10px] border ${statusStyle[item.status]} px-2 py-0`}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks + AI Insights */}
          <div className="space-y-4">
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-[#2563EB]/10 to-[#06B6D4]/5 border border-[#2563EB]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-[#06B6D4]" />
                <h3 className="font-semibold text-white text-sm">AI Insights</h3>
                <Badge className="bg-[#06B6D4]/15 text-[#06B6D4] border-0 text-[10px] ml-auto">Live</Badge>
              </div>
              <div className="space-y-2.5">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <insight.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${insight.color}`} />
                    <p className="text-xs text-white/60 leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Pending Tasks</h3>
                <span className="text-xs text-white/30">{tasks.filter(t => !t.done).length} remaining</span>
              </div>
              <div className="space-y-2">
                {tasks.map((task, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors ${task.done ? 'opacity-50' : ''}`}>
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${task.done ? 'text-emerald-400' : 'text-white/20'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${task.done ? 'line-through text-white/30' : 'text-white/80'} truncate`}>{task.title}</p>
                      <p className="text-[10px] text-white/30">{task.due}</p>
                    </div>
                    <Badge className={`text-[10px] border px-1.5 py-0 ${priorityStyle[task.priority]}`}>{task.priority}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sales Trend */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-white">Weekly Sales Trend</h3>
              <p className="text-xs text-white/40 mt-0.5">This week vs last week</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
              <TrendingUp className="w-4 h-4" /> +12.4%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={salesData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
              <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
