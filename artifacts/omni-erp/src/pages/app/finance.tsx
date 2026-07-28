import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Download, Upload,
  Filter, Search, MoreHorizontal, Eye, Edit, Trash2, CheckCircle,
  Clock, AlertCircle, FileText, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, PieChart, ChevronDown, RefreshCw
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const plData = [
  { month: 'Jan', income: 4.2, cogs: 2.1, gross: 2.1 },
  { month: 'Feb', income: 5.1, cogs: 2.6, gross: 2.5 },
  { month: 'Mar', income: 4.8, cogs: 2.4, gross: 2.4 },
  { month: 'Apr', income: 6.3, cogs: 3.1, gross: 3.2 },
  { month: 'May', income: 5.9, cogs: 2.9, gross: 3.0 },
  { month: 'Jun', income: 7.2, cogs: 3.5, gross: 3.7 },
  { month: 'Jul', income: 8.1, cogs: 3.9, gross: 4.2 },
];

const invoices = [
  { id: 'INV-4821', customer: 'Stratford Industries', amount: 48200, due: 'Jul 25, 2026', status: 'paid', type: 'Sales Invoice' },
  { id: 'INV-4820', customer: 'Apex Global Ltd.', amount: 31500, due: 'Jul 28, 2026', status: 'pending', type: 'Sales Invoice' },
  { id: 'INV-4819', customer: 'Meridian Corp', amount: 92750, due: 'Aug 1, 2026', status: 'overdue', type: 'Sales Invoice' },
  { id: 'INV-4818', customer: 'BlueSky Technologies', amount: 7800, due: 'Aug 5, 2026', status: 'draft', type: 'Sales Invoice' },
  { id: 'INV-4817', customer: 'Global Ventures Inc.', amount: 156000, due: 'Aug 10, 2026', status: 'sent', type: 'Sales Invoice' },
  { id: 'BILL-0912', customer: 'TechParts Ltd.', amount: 12400, due: 'Jul 30, 2026', status: 'pending', type: 'Vendor Bill' },
  { id: 'BILL-0911', customer: 'Omega Suppliers', amount: 8900, due: 'Aug 3, 2026', status: 'paid', type: 'Vendor Bill' },
];

const accounts = [
  { code: '1000', name: 'Cash & Cash Equivalents', type: 'Asset', balance: 1842000, change: +12.4 },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 3241000, change: +8.1 },
  { code: '1200', name: 'Inventory', type: 'Asset', balance: 2408000, change: -1.2 },
  { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 892000, change: +3.5 },
  { code: '3000', name: 'Retained Earnings', type: 'Equity', balance: 5120000, change: +21.5 },
  { code: '4000', name: 'Revenue', type: 'Income', balance: 7200000, change: +14.3 },
  { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 3180000, change: +11.2 },
];

const statusStyle: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/20',
  draft: 'bg-white/5 text-white/50 border-white/10',
  sent: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
};

export default function Finance() {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');

  const kpis = [
    { label: 'Total Revenue', value: '$7.2M', change: '+14.3%', up: true, icon: TrendingUp },
    { label: 'Gross Profit', value: '$4.2M', change: '+18.7%', up: true, icon: DollarSign },
    { label: 'Net Profit', value: '$1.8M', change: '+21.5%', up: true, icon: ArrowUpRight },
    { label: 'Outstanding AR', value: '$3.2M', change: '-5.1%', up: false, icon: CreditCard },
    { label: 'Accounts Payable', value: '$892K', change: '+3.5%', up: false, icon: Banknote },
    { label: 'Operating Expenses', value: '$2.4M', change: '+9.2%', up: false, icon: TrendingDown },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Financial Accounting' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Accounting</h1>
            <p className="text-white/40 text-sm mt-0.5">General Ledger · FY 2026 · Q3</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Import
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Invoice
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className="flex items-center justify-between mb-2">
                <k.icon className={`w-4 h-4 ${k.up ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className={`text-xs font-medium ${k.up ? 'text-emerald-400' : 'text-red-400'}`}>{k.change}</span>
              </div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {['overview', 'invoices', 'accounts', 'journal'].map(t => (
              <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">P&L Statement</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={plData}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                  <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                  <Bar dataKey="income" name="Revenue" fill="url(#incomeGrad)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="gross" name="Gross Profit" fill="url(#grossGrad)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Cash Flow Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={plData}>
                  <defs>
                    <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                  <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#06B6D4" strokeWidth={2} fill="url(#cfGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.07]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..."
                    className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
                </div>
                <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
                  <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                </Button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Invoice #', 'Customer / Vendor', 'Type', 'Amount', 'Due Date', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{inv.id}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{inv.customer}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{inv.type}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${inv.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{inv.due}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] border ${statusStyle[inv.status]} px-2 py-0`}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 7 of 248 records</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, '...', 24].map((p, i) => (
                    <button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.07]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input placeholder="Search accounts..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
                </div>
                <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] ml-auto"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Account</Button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Code', 'Account Name', 'Type', 'Balance', 'Change', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.code} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{acc.code}</td>
                      <td className="px-4 py-3 text-sm text-white/80 font-medium">{acc.name}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{acc.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${acc.balance.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium flex items-center gap-1 ${acc.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {acc.change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {Math.abs(acc.change)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="journal" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 text-center">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 font-medium">Journal Entries</p>
              <p className="text-white/30 text-sm mt-1">248 journal entries · FY 2026</p>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Entry</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
