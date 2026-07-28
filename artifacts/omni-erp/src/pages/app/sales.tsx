import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from 'recharts';
import {
  Users, TrendingUp, DollarSign, Target, Plus, Download, Filter,
  Search, MoreHorizontal, Eye, Edit, Phone, Mail, MessageSquare,
  Star, ArrowUpRight, ChevronDown, Zap, Award, Clock
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

const salesTrend = [
  { month: 'Jan', deals: 24, revenue: 1.2 }, { month: 'Feb', deals: 31, revenue: 1.8 },
  { month: 'Mar', deals: 28, revenue: 1.6 }, { month: 'Apr', deals: 42, revenue: 2.4 },
  { month: 'May', deals: 38, revenue: 2.1 }, { month: 'Jun', deals: 51, revenue: 3.1 },
  { month: 'Jul', deals: 47, revenue: 2.8 },
];

const pipeline = [
  { stage: 'Prospecting', count: 84, value: 4.2, color: '#2563EB', pct: 100 },
  { stage: 'Qualified', count: 56, value: 3.1, color: '#06B6D4', pct: 74 },
  { stage: 'Proposal', count: 32, value: 2.4, color: '#A78BFA', pct: 57 },
  { stage: 'Negotiation', count: 18, value: 1.8, color: '#F59E0B', pct: 43 },
  { stage: 'Closed Won', count: 12, value: 1.2, color: '#22C55E', pct: 29 },
];

const deals = [
  { id: 'DL-1041', name: 'Enterprise ERP Implementation', company: 'Stratford Industries', value: 248000, stage: 'Negotiation', rep: 'Sarah K.', initials: 'SK', prob: 75, due: 'Aug 12' },
  { id: 'DL-1040', name: 'Cloud Migration Suite', company: 'Apex Global', value: 185000, stage: 'Proposal', rep: 'Mike R.', initials: 'MR', prob: 55, due: 'Aug 20' },
  { id: 'DL-1039', name: 'HRMS Annual Subscription', company: 'BlueSky Tech', value: 94500, stage: 'Qualified', rep: 'James D.', initials: 'JD', prob: 40, due: 'Sep 1' },
  { id: 'DL-1038', name: 'Manufacturing Module', company: 'Meridian Corp', value: 67200, stage: 'Closed Won', rep: 'Anna P.', initials: 'AP', prob: 100, due: 'Jul 31' },
  { id: 'DL-1037', name: 'Supply Chain Analytics', company: 'Nexus Logistics', value: 312000, stage: 'Prospecting', rep: 'Tom B.', initials: 'TB', prob: 20, due: 'Sep 15' },
];

const customers = [
  { name: 'Stratford Industries', contact: 'Robert Shaw', email: 'r.shaw@stratford.com', phone: '+1 (555) 481-2200', revenue: '$248K', status: 'active', rating: 5 },
  { name: 'Apex Global Ltd.', contact: 'Jennifer Wu', email: 'j.wu@apexglobal.io', phone: '+1 (555) 319-4401', revenue: '$185K', status: 'active', rating: 5 },
  { name: 'BlueSky Technologies', contact: 'David Park', email: 'd.park@bluesky.tech', phone: '+1 (555) 229-8820', revenue: '$94.5K', status: 'active', rating: 4 },
  { name: 'Meridian Corp', contact: 'Lisa Chen', email: 'l.chen@meridian.com', phone: '+1 (555) 774-3310', revenue: '$67.2K', status: 'inactive', rating: 3 },
  { name: 'Nexus Logistics', contact: 'Chris Morgan', email: 'c.morgan@nexus.io', phone: '+1 (555) 112-6698', revenue: '$312K', status: 'lead', rating: 4 },
];

const stageColors: Record<string, string> = {
  Prospecting: 'bg-white/5 text-white/50 border-white/10',
  Qualified: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  Proposal: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Negotiation: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Closed Won': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

export default function Sales() {
  const [tab, setTab] = useState('pipeline');

  return (
    <AppLayout breadcrumbs={[{ label: 'Sales & CRM' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Sales & CRM</h1>
            <p className="text-white/40 text-sm mt-0.5">Pipeline · 47 active deals · $2.84M pipeline value</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Deal
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pipeline Value', value: '$2.84M', sub: '47 deals', icon: Target, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Closed This Month', value: '$892K', sub: '12 deals won', icon: Award, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Win Rate', value: '38.4%', sub: '+4.2% vs last month', icon: TrendingUp, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Avg. Deal Size', value: '$61.2K', sub: '+8.1% growth', icon: DollarSign, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
              <p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Sales Pipeline</h3>
          <div className="space-y-3">
            {pipeline.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <div className="w-28 text-sm text-white/60 flex-shrink-0">{stage.stage}</div>
                <div className="flex-1">
                  <div className="h-8 rounded-lg overflow-hidden bg-white/[0.04] relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stage.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="h-full rounded-lg flex items-center px-3"
                      style={{ background: `${stage.color}30`, borderRight: `2px solid ${stage.color}` }}
                    >
                      <span className="text-xs font-semibold text-white">{stage.count} deals</span>
                    </motion.div>
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-semibold text-white">${stage.value}M</div>
                <div className="w-10 text-right text-xs text-white/30">{stage.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['pipeline', 'customers', 'activity'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" />
              </div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
                <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter
              </Button>
            </div>
          </div>

          <TabsContent value="pipeline" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Deal', 'Company', 'Value', 'Stage', 'Rep', 'Probability', 'Close Date', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{deal.name}</p>
                        <p className="text-xs text-white/30">{deal.id}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">{deal.company}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${deal.value.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] border ${stageColors[deal.stage]} px-2 py-0`}>{deal.stage}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-[9px] font-bold">{deal.initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white/60">{deal.rep}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={deal.prob} className="w-16 h-1.5 bg-white/[0.07]" />
                          <span className="text-xs text-white/50">{deal.prob}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">{deal.due}</td>
                      <td className="px-4 py-3">
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Company', 'Contact', 'Revenue', 'Status', 'Rating', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white">
                            {c.name[0]}
                          </div>
                          <span className="text-sm font-medium text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white/80">{c.contact}</p>
                        <p className="text-xs text-white/40">{c.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{c.revenue}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] border px-2 py-0 ${c.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : c.status === 'lead' ? 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < c.rating ? 'text-amber-400 fill-amber-400' : 'text-white/15'}`} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors"><Phone className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#06B6D4] transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Sales Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                    <Area type="monotone" dataKey="deals" name="Deals" stroke="#2563EB" strokeWidth={2} fill="url(#sGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Top Representatives</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Kim', deals: 18, revenue: '$892K', rate: 72, initials: 'SK' },
                    { name: 'Mike Roberts', deals: 14, revenue: '$641K', rate: 65, initials: 'MR' },
                    { name: 'James Doyle', deals: 11, revenue: '$510K', rate: 58, initials: 'JD' },
                    { name: 'Anna Park', deals: 9, revenue: '$398K', rate: 50, initials: 'AP' },
                  ].map((rep) => (
                    <div key={rep.name} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-xs font-bold">{rep.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{rep.name}</span>
                          <span className="text-xs text-white/50">{rep.revenue}</span>
                        </div>
                        <Progress value={rep.rate} className="h-1.5 bg-white/[0.07]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
