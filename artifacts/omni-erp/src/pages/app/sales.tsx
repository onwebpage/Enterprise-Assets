import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  Users, TrendingUp, DollarSign, Target, Plus, Download, Filter,
  Search, MoreHorizontal, Eye, Edit, Trash2, Phone, Mail,
  Star, ArrowUpRight, ArrowDownRight, Award, Clock, Calendar,
  MessageSquare, Activity, ChevronRight, ArrowRight, Zap,
  FileText, ShoppingCart, CheckCircle2, XCircle, Send,
  Kanban, BarChart3, UserPlus, Building2, Globe,
  Linkedin, RefreshCw, AlertCircle,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import KPICard from '@/components/app/KPICard';
import StatusBadge from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ─── Shared tooltip ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1225] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-white/60">{p.name}:</span>
          <span className="text-xs font-semibold text-white">{typeof p.value === 'number' && p.value > 100 ? `$${(p.value/1000).toFixed(1)}K` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const revTrend = [
  { month: 'Jan', revenue: 1200, deals: 24, lost: 8  },
  { month: 'Feb', revenue: 1800, deals: 31, lost: 11 },
  { month: 'Mar', revenue: 1600, deals: 28, lost: 9  },
  { month: 'Apr', revenue: 2400, deals: 42, lost: 14 },
  { month: 'May', revenue: 2100, deals: 38, lost: 12 },
  { month: 'Jun', revenue: 3100, deals: 51, lost: 16 },
  { month: 'Jul', revenue: 2800, deals: 47, lost: 13 },
];

const sourceData = [
  { name: 'Referral',   value: 32, color: '#2563EB' },
  { name: 'Website',    value: 28, color: '#06B6D4' },
  { name: 'Cold Outreach', value: 18, color: '#A78BFA' },
  { name: 'Partner',    value: 14, color: '#F59E0B' },
  { name: 'Event',      value: 8,  color: '#22C55E' },
];

const repData = [
  { name: 'S. Kim',    revenue: 892, deals: 18, rate: 72 },
  { name: 'M. Roberts',revenue: 641, deals: 14, rate: 65 },
  { name: 'J. Doyle',  revenue: 510, deals: 11, rate: 58 },
  { name: 'A. Park',   revenue: 398, deals:  9, rate: 50 },
  { name: 'T. Brown',  revenue: 281, deals:  7, rate: 43 },
];

const kanbanStages = [
  {
    id: 'prospecting', label: 'Prospecting', color: '#64748B', count: 12, value: 1.4,
    cards: [
      { id: 'DL-1052', name: 'Supply Chain Platform', company: 'Nexus Logistics', value: 312000, rep: 'TB', prob: 15, due: 'Sep 15' },
      { id: 'DL-1051', name: 'Cloud ERP Migration',    company: 'RedLine Corp',    value: 185000, rep: 'MR', prob: 20, due: 'Sep 20' },
      { id: 'DL-1050', name: 'HR Module Add-on',        company: 'CoreTech Ltd',   value: 48000,  rep: 'AP', prob: 25, due: 'Oct 1'  },
    ],
  },
  {
    id: 'qualified', label: 'Qualified', color: '#2563EB', count: 9, value: 2.1,
    cards: [
      { id: 'DL-1049', name: 'Finance Suite License',  company: 'BlueSky Tech',    value: 94500,  rep: 'JD', prob: 40, due: 'Sep 1' },
      { id: 'DL-1048', name: 'Inventory Module',        company: 'WestMfg Inc.',   value: 67000,  rep: 'SK', prob: 45, due: 'Aug 28' },
    ],
  },
  {
    id: 'proposal', label: 'Proposal', color: '#A78BFA', count: 7, value: 1.8,
    cards: [
      { id: 'DL-1047', name: 'Enterprise Suite (Full)', company: 'MegaCorp',       value: 840000, rep: 'SK', prob: 55, due: 'Aug 25' },
      { id: 'DL-1046', name: 'Cloud Migration Suite',   company: 'Apex Global',    value: 185000, rep: 'MR', prob: 55, due: 'Aug 20' },
    ],
  },
  {
    id: 'negotiation', label: 'Negotiation', color: '#F59E0B', count: 5, value: 1.2,
    cards: [
      { id: 'DL-1045', name: 'Enterprise ERP Impl.',   company: 'Stratford Ind.',  value: 248000, rep: 'SK', prob: 75, due: 'Aug 12' },
      { id: 'DL-1044', name: 'HRMS Subscription',       company: 'BlueSky Tech',   value: 94500,  rep: 'JD', prob: 70, due: 'Aug 18' },
    ],
  },
  {
    id: 'closed', label: 'Closed Won', color: '#22C55E', count: 4, value: 0.9,
    cards: [
      { id: 'DL-1043', name: 'Manufacturing Module',    company: 'Meridian Corp',  value: 67200,  rep: 'AP', prob: 100, due: 'Jul 31' },
      { id: 'DL-1042', name: 'Analytics Platform',      company: 'TechVentures',   value: 42800,  rep: 'MR', prob: 100, due: 'Jul 28' },
    ],
  },
];

const leads = [
  { id: 'LD-0891', name: 'Marcus Bennett',     company: 'Orbital Systems',    source: 'Website',  score: 87, status: 'hot',      rep: 'SK', lastContact: '2h ago',  email: 'm.bennett@orbital.io'    },
  { id: 'LD-0890', name: 'Priya Sharma',       company: 'Quantum Dynamics',   source: 'Referral', score: 74, status: 'warm',     rep: 'MR', lastContact: '1d ago',  email: 'p.sharma@qdynamics.com'  },
  { id: 'LD-0889', name: 'Daniel Frost',       company: 'Glacier Logistics',  source: 'Event',    score: 61, status: 'warm',     rep: 'JD', lastContact: '2d ago',  email: 'd.frost@glacier.co'      },
  { id: 'LD-0888', name: 'Aisha Nwosu',        company: 'NovaBuild Inc.',     source: 'Referral', score: 92, status: 'hot',      rep: 'AP', lastContact: '30m ago', email: 'a.nwosu@novabuild.com'   },
  { id: 'LD-0887', name: 'James Holden',       company: 'Stellar Materials',  source: 'Cold',     score: 38, status: 'cold',     rep: 'TB', lastContact: '5d ago',  email: 'j.holden@stellar.net'    },
  { id: 'LD-0886', name: 'Sofia Reyes',        company: 'Meridian AI Labs',   source: 'LinkedIn', score: 69, status: 'warm',     rep: 'SK', lastContact: '3d ago',  email: 's.reyes@meridianai.com'  },
  { id: 'LD-0885', name: 'Kevin Park',         company: 'Dynamo Supply Co.',  source: 'Partner',  score: 55, status: 'warm',     rep: 'MR', lastContact: '4d ago',  email: 'k.park@dynamo.io'        },
];

const customers = [
  { name: 'Stratford Industries',   contact: 'Robert Shaw',      email: 'r.shaw@stratford.com',    phone: '+1 (555) 481-2200', revenue: '$284K', ltv: '$1.2M', status: 'active',   rating: 5, deals: 8 },
  { name: 'Apex Global Ltd.',       contact: 'Jennifer Wu',      email: 'j.wu@apexglobal.io',      phone: '+1 (555) 319-4401', revenue: '$185K', ltv: '$740K', status: 'active',   rating: 5, deals: 5 },
  { name: 'BlueSky Technologies',   contact: 'David Park',       email: 'd.park@bluesky.tech',     phone: '+1 (555) 229-8820', revenue: '$94.5K',ltv: '$310K', status: 'active',   rating: 4, deals: 4 },
  { name: 'Meridian Corp',          contact: 'Lisa Chen',        email: 'l.chen@meridian.com',     phone: '+1 (555) 774-3310', revenue: '$67.2K',ltv: '$201K', status: 'inactive', rating: 3, deals: 3 },
  { name: 'Nexus Logistics',        contact: 'Chris Morgan',     email: 'c.morgan@nexus.io',       phone: '+1 (555) 112-6698', revenue: '$312K', ltv: '$312K', status: 'lead',     rating: 4, deals: 1 },
  { name: 'Global Ventures Inc.',   contact: 'Sandra Lee',       email: 's.lee@globalvent.com',    phone: '+1 (555) 384-9910', revenue: '$156K', ltv: '$520K', status: 'active',   rating: 4, deals: 6 },
  { name: 'NovaBuild Inc.',         contact: 'Aisha Nwosu',      email: 'a.nwosu@novabuild.com',   phone: '+1 (555) 601-3320', revenue: '$0',    ltv: '$0',    status: 'lead',     rating: 5, deals: 0 },
];

const quotations = [
  { id: 'QT-0284', customer: 'Stratford Industries',   items: 12, total: 248000, expires: 'Aug 15, 2026', created: 'Jul 20, 2026', status: 'sent',     rep: 'SK' },
  { id: 'QT-0283', customer: 'Apex Global Ltd.',        items: 8,  total: 185000, expires: 'Aug 20, 2026', created: 'Jul 22, 2026', status: 'draft',    rep: 'MR' },
  { id: 'QT-0282', customer: 'BlueSky Technologies',    items: 5,  total: 94500,  expires: 'Aug 10, 2026', created: 'Jul 18, 2026', status: 'accepted', rep: 'JD' },
  { id: 'QT-0281', customer: 'Nexus Logistics',         items: 20, total: 312000, expires: 'Jul 30, 2026', created: 'Jul 10, 2026', status: 'expired',  rep: 'TB' },
  { id: 'QT-0280', customer: 'Global Ventures Inc.',    items: 7,  total: 156000, expires: 'Aug 25, 2026', created: 'Jul 24, 2026', status: 'sent',     rep: 'SK' },
  { id: 'QT-0279', customer: 'Meridian Corp',           items: 4,  total: 67200,  expires: 'Aug 5, 2026',  created: 'Jul 15, 2026', status: 'accepted', rep: 'AP' },
];

const salesOrders = [
  { id: 'SO-3341', customer: 'Apex Global',          total: 185000, delivery: 'delivered',  payment: 'paid',    date: 'Jul 18, 2026', fulfillment: 100 },
  { id: 'SO-3340', customer: 'Northstar LLC',         total: 94500,  delivery: 'in-transit', payment: 'partial', date: 'Jul 20, 2026', fulfillment: 60  },
  { id: 'SO-3339', customer: 'Stratford Industries',  total: 248000, delivery: 'processing', payment: 'pending', date: 'Jul 22, 2026', fulfillment: 20  },
  { id: 'SO-3338', customer: 'BlueSky Tech',          total: 67200,  delivery: 'delivered',  payment: 'paid',    date: 'Jul 15, 2026', fulfillment: 100 },
  { id: 'SO-3337', customer: 'Global Ventures',       total: 156000, delivery: 'processing', payment: 'pending', date: 'Jul 24, 2026', fulfillment: 5   },
  { id: 'SO-3336', customer: 'Meridian Corp',         total: 42800,  delivery: 'delivered',  payment: 'paid',    date: 'Jul 12, 2026', fulfillment: 100 },
];

const salesInvoices = [
  { id: 'INV-4821', so: 'SO-3341', customer: 'Apex Global',         total: 185000, due: 'Jul 28, 2026', status: 'paid'     },
  { id: 'INV-4820', so: 'SO-3340', customer: 'Northstar LLC',        total: 94500,  due: 'Aug 5, 2026',  status: 'partial'  },
  { id: 'INV-4819', so: 'SO-3339', customer: 'Stratford Industries', total: 248000, due: 'Aug 12, 2026', status: 'pending'  },
  { id: 'INV-4818', so: 'SO-3338', customer: 'BlueSky Tech',         total: 67200,  due: 'Jul 30, 2026', status: 'paid'     },
  { id: 'INV-4817', so: 'SO-3337', customer: 'Global Ventures',      total: 156000, due: 'Aug 15, 2026', status: 'draft'    },
  { id: 'INV-4816', so: 'SO-3336', customer: 'Meridian Corp',        total: 42800,  due: 'Jul 25, 2026', status: 'paid'     },
];

const repColors: Record<string, string> = {
  SK: 'from-[#2563EB]/40 to-[#06B6D4]/40',
  MR: 'from-purple-500/40 to-pink-500/40',
  JD: 'from-emerald-500/40 to-teal-500/40',
  AP: 'from-amber-500/40 to-orange-500/40',
  TB: 'from-red-500/40 to-rose-500/40',
};

const repNames: Record<string, string> = {
  SK: 'Sarah Kim',
  MR: 'Mike Roberts',
  JD: 'James Doyle',
  AP: 'Anna Park',
  TB: 'Tom Brown',
};

const sourceIcon: Record<string, any> = {
  Website: Globe,
  Referral: Users,
  Cold: Phone,
  Event: Calendar,
  LinkedIn: Linkedin,
  Partner: Building2,
};

const scoreColor = (s: number) =>
  s >= 80 ? 'text-emerald-400 bg-emerald-500/10' :
  s >= 60 ? 'text-amber-400 bg-amber-500/10' :
  'text-red-400 bg-red-500/10';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function FilterBar({ placeholder, children }: { placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input placeholder={placeholder} className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
      </div>
      <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
        <Filter className="w-3.5 h-3.5 mr-1.5" />Filter
      </Button>
      <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
        <Download className="w-3.5 h-3.5 mr-1.5" />Export
      </Button>
      {children}
    </div>
  );
}

function TableShell({ headers, children, footer }: {
  headers: string[]; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {headers.map(h => (
              <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {footer && <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">{footer}</div>}
    </div>
  );
}

function TR({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group last:border-0">
      {children}
    </tr>
  );
}

function RowActions() {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </td>
  );
}

function Pagination({ total, shown }: { total: string; shown: number }) {
  return (
    <>
      <p className="text-xs text-white/30">Showing {shown} of {total} records</p>
      <div className="flex items-center gap-1">
        {[1,2,3,'…',12].map((p,i)=>(
          <button key={i} className={cn('w-7 h-7 rounded text-xs transition-colors', p===1?'bg-[#2563EB] text-white':'text-white/40 hover:bg-white/[0.07]')}>{p}</button>
        ))}
      </div>
    </>
  );
}

function RepAvatar({ initials }: { initials: string }) {
  return (
    <Avatar className="w-6 h-6 flex-shrink-0">
      <AvatarFallback className={cn('bg-gradient-to-br text-white text-[9px] font-bold', repColors[initials] ?? 'from-white/20 to-white/10')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Sales() {
  const [tab, setTab] = useState('dashboard');

  const kpis = [
    { label: 'Pipeline Value',    value: '$2.84M', change: '+12.4%', up: true,  icon: Target,    iconColor: 'text-[#2563EB]',  gradient: 'bg-[#2563EB]/15',  sparkline: [1.8,2.0,1.9,2.3,2.2,2.6,2.84], changeLabel: '47 active deals' },
    { label: 'Closed This Month', value: '$892K',  change: '+18.2%', up: true,  icon: Award,     iconColor: 'text-emerald-400',gradient: 'bg-emerald-500/15', sparkline: [620,680,710,780,800,850,892], changeLabel: '12 deals won' },
    { label: 'Win Rate',          value: '38.4%',  change: '+4.2%',  up: true,  icon: TrendingUp,iconColor: 'text-[#06B6D4]',  gradient: 'bg-[#06B6D4]/15',  sparkline: [31,33,34,35,36,37,38.4], changeLabel: 'vs 34.2% last month' },
    { label: 'Avg. Deal Size',    value: '$61.2K', change: '+8.1%',  up: true,  icon: DollarSign,iconColor: 'text-amber-400',  gradient: 'bg-amber-500/15',  sparkline: [52,54,56,58,58,60,61.2], changeLabel: '+$4.6K vs target' },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Sales & CRM' }]}>
      <div className="p-6 max-w-[1800px] mx-auto space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sales & CRM</h1>
            <p className="text-sm text-white/40 mt-0.5">
              47 active deals &nbsp;·&nbsp; $2.84M pipeline &nbsp;·&nbsp; FY 2026 Q3
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Lead
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Deal
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto">
            <TabsList className="bg-white/[0.04] border border-white/[0.07] h-9 p-0.5 inline-flex min-w-max">
              {[
                { value: 'dashboard',  label: 'Dashboard',     icon: BarChart3      },
                { value: 'kanban',     label: 'Pipeline',      icon: Kanban         },
                { value: 'leads',      label: 'Leads',         icon: UserPlus       },
                { value: 'customers',  label: 'Customers',     icon: Building2      },
                { value: 'quotations', label: 'Quotations',    icon: FileText       },
                { value: 'orders',     label: 'Sales Orders',  icon: ShoppingCart   },
                { value: 'invoices',   label: 'Invoices',      icon: ArrowUpRight   },
                { value: 'analytics',  label: 'Analytics',     icon: TrendingUp     },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value}
                  className="text-xs h-8 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/40 gap-1.5 whitespace-nowrap">
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── DASHBOARD ──────────────────────────────────────────────────── */}
          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Revenue trend */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Revenue Trend</h3>
                    <p className="text-xs text-white/35 mt-0.5">Monthly closed revenue · FY 2026</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4" />+18.2% MoM
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revTrend} margin={{ left: -20, right: 5, top: 5 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r:4, fill:'#2563EB' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Deal source */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Deal Source</h3>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={3} dataKey="value">
                        {sourceData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip contentStyle={{ background:'#0d1225', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'12px', color:'white', fontSize:'12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {sourceData.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-white/50 flex-1">{s.name}</span>
                      <span className="text-xs font-semibold text-white">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Top deals */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl">
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-sm font-semibold text-white">Top Open Deals</h3>
                  <button className="text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {['Deal','Company','Value','Stage','Rep','Close'].map(h=>(
                        <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kanbanStages.flatMap(s=>s.cards).slice(0,6).map(deal=>(
                      <TR key={deal.id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white/85 truncate max-w-[180px]">{deal.name}</p>
                          <p className="text-[11px] text-white/30 font-mono">{deal.id}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/55">{deal.company}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">${deal.value.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={deal.prob === 100 ? 'completed' : deal.prob >= 70 ? 'processing' : deal.prob >= 40 ? 'pending' : 'draft'}
                            showDot={false}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <RepAvatar initials={deal.rep} />
                            <span className="text-xs text-white/50">{deal.rep}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/40">{deal.due}</td>
                      </TR>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rep leaderboard */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Rep Leaderboard</h3>
                <div className="space-y-4">
                  {repData.map((rep, i) => (
                    <div key={rep.name} className="flex items-center gap-3">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0',
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-white/20' : 'bg-white/10')}>
                        {i + 1}
                      </div>
                      <RepAvatar initials={rep.name.split(' ').map(n=>n[0]).join('')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white/80">{rep.name}</span>
                          <span className="text-xs font-semibold text-white">${(rep.revenue/1000).toFixed(0)}K</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width:`${rep.rate}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-white/30">{rep.deals} deals</span>
                          <span className="text-[10px] text-white/30">{rep.rate}% win rate</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── KANBAN PIPELINE ───────────────────────────────────────────── */}
          <TabsContent value="kanban" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input placeholder="Search deals..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-52" />
                </div>
                <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />Filter
                </Button>
              </div>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Deal
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {kanbanStages.map(stage => (
                <div key={stage.id} className="flex-shrink-0 w-72">
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                      <span className="text-sm font-semibold text-white">{stage.label}</span>
                      <span className="text-xs text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded-full">{stage.count}</span>
                    </div>
                    <span className="text-xs font-semibold text-white/50">${stage.value}M</span>
                  </div>
                  {/* Cards */}
                  <div className="space-y-2.5">
                    {stage.cards.map((card, ci) => (
                      <motion.div key={card.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: ci*0.05 }}
                        className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-3.5 hover:border-white/[0.14] hover:bg-[#0d1225] transition-all cursor-pointer group">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-white/85 group-hover:text-white leading-snug pr-2">{card.name}</p>
                          <button className="p-0.5 rounded hover:bg-white/[0.07] text-white/20 hover:text-white/50 flex-shrink-0">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-white/40 mb-3 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{card.company}
                        </p>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white">${card.value.toLocaleString()}</span>
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{ background: `${stage.color}20`, color: stage.color }}>
                            {card.prob}%
                          </span>
                        </div>
                        {/* Probability bar */}
                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full transition-all" style={{ width:`${card.prob}%`, background: stage.color }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <RepAvatar initials={card.rep} />
                            <span className="text-xs text-white/40">{repNames[card.rep]?.split(' ')[0]}</span>
                          </div>
                          <span className="text-[11px] text-white/30 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{card.due}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    {/* Add card button */}
                    <button className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.08] text-xs text-white/25 hover:text-white/50 hover:border-white/[0.15] transition-all flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />Add deal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── LEADS ─────────────────────────────────────────────────────── */}
          <TabsContent value="leads" className="mt-4">
            {/* Score legend */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Hot Leads', count: 2, desc: 'Score 80+', color: 'border-emerald-500/25 text-emerald-400' },
                { label: 'Warm Leads', count: 4, desc: 'Score 50–79', color: 'border-amber-500/25 text-amber-400' },
                { label: 'Cold Leads', count: 1, desc: 'Score < 50', color: 'border-red-500/25 text-red-400' },
              ].map(b => (
                <div key={b.label} className={cn('bg-[#0a0f1e] border rounded-xl p-4', b.color.split(' ')[0])}>
                  <p className={cn('text-2xl font-bold mb-0.5', b.color.split(' ')[1])}>{b.count}</p>
                  <p className="text-sm font-medium text-white/70">{b.label}</p>
                  <p className="text-xs text-white/35 mt-0.5">{b.desc}</p>
                </div>
              ))}
            </div>
            <TableShell
              headers={['Lead','Company','Source','Score','Status','Rep','Last Contact','']}
              footer={<Pagination total="284" shown={leads.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search leads...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Lead
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {leads.map(lead => {
                const SrcIcon = sourceIcon[lead.source] ?? Globe;
                return (
                  <TR key={lead.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white/85">{lead.name}</p>
                      <p className="text-xs text-white/35">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">{lead.company}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-white/50">
                        <SrcIcon className="w-3.5 h-3.5" />{lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-bold px-2 py-0.5 rounded-md', scoreColor(lead.score))}>
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status === 'hot' ? 'active' : lead.status === 'warm' ? 'pending' : 'draft'} showDot />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <RepAvatar initials={lead.rep} />
                        <span className="text-xs text-white/50">{repNames[lead.rep]?.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{lead.lastContact}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors"><Phone className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#06B6D4] transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors" title="Convert to Opportunity"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </TR>
                );
              })}
            </TableShell>
          </TabsContent>

          {/* ── CUSTOMERS ─────────────────────────────────────────────────── */}
          <TabsContent value="customers" className="mt-4">
            <TableShell
              headers={['Company','Contact','Revenue','LTV','Deals','Status','Rating','']}
              footer={<Pagination total="186" shown={customers.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search customers, contacts...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add Customer
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {customers.map(c => (
                <TR key={c.name}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <span className="text-sm font-medium text-white/85">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white/70">{c.contact}</p>
                    <p className="text-xs text-white/35">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{c.revenue}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{c.ltv}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{c.deals}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      {Array.from({length:5}).map((_,i)=>(
                        <Star key={i} className={cn('w-3 h-3', i < c.rating ? 'text-amber-400 fill-amber-400' : 'text-white/15')} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors"><Phone className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#06B6D4] transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── QUOTATIONS ────────────────────────────────────────────────── */}
          <TabsContent value="quotations" className="mt-4">
            <TableShell
              headers={['Quote #','Customer','Items','Total','Expires','Rep','Status','']}
              footer={<Pagination total="94" shown={quotations.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search quotations...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />New Quote
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {quotations.map(q => (
                <TR key={q.id}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{q.id}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{q.customer}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{q.items} items</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">${q.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{q.expires}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <RepAvatar initials={q.rep} />
                      <span className="text-xs text-white/50">{repNames[q.rep]?.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {q.status === 'draft' && (
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors" title="Send"><Send className="w-3.5 h-3.5" /></button>
                      )}
                      {q.status === 'accepted' && (
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors" title="Convert to Order"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                      )}
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── SALES ORDERS ──────────────────────────────────────────────── */}
          <TabsContent value="orders" className="mt-4">
            <TableShell
              headers={['Order #','Customer','Date','Total','Fulfillment','Delivery','Payment','']}
              footer={<Pagination total="312" shown={salesOrders.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search sales orders...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />New Order
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {salesOrders.map(so => (
                <TR key={so.id}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{so.id}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{so.customer}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{so.date}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">${so.total.toLocaleString()}</td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#2563EB]" style={{ width:`${so.fulfillment}%` }} />
                      </div>
                      <span className="text-xs text-white/40 w-8 text-right">{so.fulfillment}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={so.delivery === 'delivered' ? 'completed' : so.delivery === 'in-transit' ? 'processing' : 'pending'} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={so.payment === 'paid' ? 'paid' : so.payment === 'partial' ? 'pending' : 'draft'} />
                  </td>
                  <RowActions />
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── INVOICES ──────────────────────────────────────────────────── */}
          <TabsContent value="invoices" className="mt-4">
            <TableShell
              headers={['Invoice #','Sales Order','Customer','Total','Due Date','Status','']}
              footer={<Pagination total="248" shown={salesInvoices.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={7} className="p-0">
                  <FilterBar placeholder="Search invoices...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Create Invoice
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {salesInvoices.map(inv => (
                <TR key={inv.id}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{inv.id}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{inv.so}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{inv.customer}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">${inv.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{inv.due}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {inv.status !== 'paid' && (
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors" title="Mark Paid">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Send className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Revenue by rep */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Revenue by Rep</h3>
                <p className="text-xs text-white/35 mb-4">Closed revenue · FY 2026</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={repData} margin={{ left:-20, right:5, top:5 }} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" horizontal={false} />
                    <XAxis type="number" tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fill:'rgba(255,255,255,0.5)', fontSize:11 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Win/Loss trend */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Win / Loss Trend</h3>
                <p className="text-xs text-white/35 mb-4">Deals closed vs lost · Monthly</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revTrend} margin={{ left:-20, right:5, top:5 }} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="deals" name="Won" fill="#22C55E" radius={[3,3,0,0]} />
                    <Bar dataKey="lost"  name="Lost" fill="#EF4444" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conversion funnel */}
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Conversion Funnel</h3>
              <p className="text-xs text-white/35 mb-5">Lead → Close · This quarter</p>
              <div className="space-y-3">
                {[
                  { stage:'Leads Generated', count:284, pct:100, color:'#64748B' },
                  { stage:'Leads Qualified',  count:147, pct:52,  color:'#2563EB' },
                  { stage:'Proposals Sent',   count:89,  pct:31,  color:'#A78BFA' },
                  { stage:'Negotiation',      count:41,  pct:14,  color:'#F59E0B' },
                  { stage:'Closed Won',       count:18,  pct:6,   color:'#22C55E' },
                ].map((s, i) => (
                  <div key={s.stage} className="flex items-center gap-4">
                    <span className="text-sm text-white/60 w-40 flex-shrink-0">{s.stage}</span>
                    <div className="flex-1 h-7 bg-white/[0.04] rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ delay: 0.1 + i*0.08, duration: 0.5, ease:'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-lg flex items-center px-3"
                        style={{ background: `${s.color}25`, borderRight: `2px solid ${s.color}` }}
                      >
                        <span className="text-xs font-semibold text-white">{s.count}</span>
                      </motion.div>
                    </div>
                    <span className="text-sm font-semibold text-white/50 w-12 text-right">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
