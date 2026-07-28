import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Download, Filter, Search, Plus, FileText, Clock, Star, Play, Eye, MoreHorizontal, Zap, PieChart, Activity } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts';

const revenueByModule = [
  { name: 'Finance', value: 3.2, color: '#2563EB' }, { name: 'Sales', value: 2.8, color: '#06B6D4' },
  { name: 'Manufacturing', value: 1.4, color: '#22C55E' }, { name: 'HR', value: 0.8, color: '#F59E0B' },
];

const trendData = [
  { month: 'Jan', revenue: 4.2, profit: 1.4, expenses: 2.8 },
  { month: 'Feb', revenue: 5.1, profit: 2.0, expenses: 3.1 },
  { month: 'Mar', revenue: 4.8, profit: 1.9, expenses: 2.9 },
  { month: 'Apr', revenue: 6.3, profit: 2.9, expenses: 3.4 },
  { month: 'May', revenue: 5.9, profit: 2.7, expenses: 3.2 },
  { month: 'Jun', revenue: 7.2, profit: 3.4, expenses: 3.8 },
  { month: 'Jul', revenue: 8.1, profit: 4.0, expenses: 4.1 },
];

const savedReports = [
  { name: 'Monthly P&L Statement', category: 'Finance', lastRun: '2h ago', scheduled: true, format: 'PDF' },
  { name: 'Sales Pipeline Summary', category: 'Sales', lastRun: '1d ago', scheduled: true, format: 'Excel' },
  { name: 'Inventory Valuation Report', category: 'Inventory', lastRun: '3d ago', scheduled: false, format: 'PDF' },
  { name: 'Employee Headcount Analysis', category: 'HR', lastRun: '1w ago', scheduled: false, format: 'Excel' },
  { name: 'GST Filing Summary', category: 'Tax', lastRun: '5d ago', scheduled: true, format: 'PDF' },
  { name: 'Cash Flow Forecast', category: 'Finance', lastRun: '12h ago', scheduled: true, format: 'PDF' },
];

const reportTemplates = [
  { name: 'Balance Sheet', icon: BarChart3, category: 'Finance' },
  { name: 'Income Statement', icon: TrendingUp, category: 'Finance' },
  { name: 'Cash Flow Statement', icon: Activity, category: 'Finance' },
  { name: 'Sales Performance', icon: PieChart, category: 'Sales' },
  { name: 'Inventory Analysis', icon: BarChart3, category: 'Inventory' },
  { name: 'HR Analytics', icon: BarChart3, category: 'HR' },
  { name: 'GST Returns', icon: FileText, category: 'Tax' },
  { name: 'Custom Report', icon: Zap, category: 'Custom' },
];

const catColors: Record<string, string> = {
  Finance: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  Sales: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  Inventory: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  HR: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Tax: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Custom: 'bg-white/5 text-white/50 border-white/10',
};

export default function Reports() {
  const [tab, setTab] = useState('dashboard');
  return (
    <AppLayout breadcrumbs={[{ label: 'Intelligence' }, { label: 'Reports & Analytics' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Reports & Analytics</h1><p className="text-white/40 text-sm mt-0.5">Executive insights · Real-time data · AI-powered</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export All</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New Report</Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['dashboard', 'saved', 'templates', 'scheduled'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: '$7.2M', change: '+14.3%', up: true },
                { label: 'Net Profit', value: '$1.8M', change: '+21.5%', up: true },
                { label: 'Operating Expenses', value: '$2.4M', change: '+9.2%', up: false },
                { label: 'EBITDA', value: '$2.6M', change: '+18.4%', up: true },
              ].map((k, i) => (
                <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
                  <span className={`text-xs font-medium flex items-center gap-0.5 mt-1 ${k.up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}{k.change}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Revenue, Profit & Expenses Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                      <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                    <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2} fill="url(#rGrad)" />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#22C55E" strokeWidth={2} fill="url(#pGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Revenue by Module</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <RPieChart><Pie data={revenueByModule} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    {revenueByModule.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie><Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} /></RPieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {revenueByModule.map((m) => (
                    <div key={m.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <span className="text-xs text-white/50 flex-1">{m.name}</span>
                      <span className="text-xs font-semibold text-white">${m.value}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.07]">
                <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search reports..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" /></div>
                <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Report Name', 'Category', 'Last Run', 'Scheduled', 'Format', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {savedReports.map((r) => (
                    <tr key={r.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-white/30" /><span className="text-sm font-medium text-white">{r.name}</span></div></td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${catColors[r.category]} px-2 py-0`}>{r.category}</Badge></td>
                      <td className="px-4 py-3"><span className="text-sm text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" />{r.lastRun}</span></td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border px-2 py-0 ${r.scheduled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>{r.scheduled ? 'Active' : 'Manual'}</Badge></td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{r.format}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors"><Play className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportTemplates.map((tpl) => (
                <div key={tpl.name} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-[#2563EB]/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center mb-3 group-hover:from-[#2563EB]/30 group-hover:to-[#06B6D4]/30 transition-all">
                    <tpl.icon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-white text-sm">{tpl.name}</p>
                  <p className="text-xs text-white/40 mt-1">{tpl.category}</p>
                  <Button size="sm" className="w-full mt-3 bg-white/[0.04] hover:bg-[#2563EB]/20 text-white/60 hover:text-white border border-white/[0.07] hover:border-[#2563EB]/30 text-xs transition-all">Use Template</Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Scheduled Reports</p>
              <p className="text-white/30 text-sm mt-1">4 reports scheduled · Next run in 6 hours</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
