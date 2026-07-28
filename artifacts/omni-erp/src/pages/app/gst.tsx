import { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, CheckCircle, AlertCircle, Clock, Plus, Download, FileText, Search, Filter, MoreHorizontal, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const gstData = [
  { month: 'Jan', gstCollected: 84000, gstPaid: 36000, liability: 48000 },
  { month: 'Feb', gstCollected: 102000, gstPaid: 42000, liability: 60000 },
  { month: 'Mar', gstCollected: 96000, gstPaid: 38000, liability: 58000 },
  { month: 'Apr', gstCollected: 126000, gstPaid: 51000, liability: 75000 },
  { month: 'May', gstCollected: 118000, gstPaid: 47000, liability: 71000 },
  { month: 'Jun', gstCollected: 144000, gstPaid: 58000, liability: 86000 },
  { month: 'Jul', gstCollected: 162000, gstPaid: 65000, liability: 97000 },
];

const filings = [
  { id: 'GSTR-1', period: 'Jun 2026', dueDate: 'Jul 11, 2026', amount: 144000, status: 'filed', type: 'Outward Supplies' },
  { id: 'GSTR-3B', period: 'Jun 2026', dueDate: 'Jul 20, 2026', amount: 86000, status: 'filed', type: 'Monthly Return' },
  { id: 'GSTR-1', period: 'Jul 2026', dueDate: 'Aug 11, 2026', amount: 162000, status: 'pending', type: 'Outward Supplies' },
  { id: 'GSTR-3B', period: 'Jul 2026', dueDate: 'Aug 20, 2026', amount: 97000, status: 'draft', type: 'Monthly Return' },
  { id: 'GSTR-9', period: 'FY 2025-26', dueDate: 'Dec 31, 2026', amount: 892000, status: 'not_started', type: 'Annual Return' },
];

const statusStyle: Record<string, string> = {
  filed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  draft: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  not_started: 'bg-white/5 text-white/50 border-white/10',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function GST() {
  const [tab, setTab] = useState('overview');
  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'GST & Tax' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">GST & Tax</h1><p className="text-white/40 text-sm mt-0.5">FY 2026-27 · GSTIN: 27AABCA1234B1Z5</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />File Return</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'GST Collected', value: '$162K', sub: 'July 2026', icon: DollarSign, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Input Tax Credit', value: '$65K', sub: 'Available ITC', icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Net Liability', value: '$97K', sub: 'Due Aug 20', icon: Receipt, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
            { label: 'YTD Paid', value: '$494K', sub: 'FY 2026-27', icon: CheckCircle, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p><p className="text-xs text-white/40 mt-0.5">{k.label}</p><p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">GST Collection vs Payment</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gstData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} formatter={(v: any) => [`$${(v/1000).toFixed(0)}K`]} />
                <Bar dataKey="gstCollected" name="Collected" fill="#2563EB" radius={[3, 3, 0, 0]} opacity={0.85} />
                <Bar dataKey="gstPaid" name="Paid" fill="#06B6D4" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Filing Calendar</h3>
            <div className="space-y-2">
              {filings.map((f) => (
                <div key={`${f.id}-${f.period}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{f.id} — {f.period}</p>
                    <p className="text-xs text-white/40">{f.type} · Due {f.dueDate}</p>
                  </div>
                  <div className="text-right mr-3">
                    <p className="text-sm font-semibold text-white">${f.amount.toLocaleString()}</p>
                  </div>
                  <Badge className={`text-[10px] border ${statusStyle[f.status]} px-2 py-0`}>{f.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {['overview', 'gstr1', 'gstr3b', 'itc', 'tds'].map(t => (
              <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 uppercase text-xs">{t}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'GSTR-1 Status', sub: 'Jul 2026 — Due Aug 11', status: 'pending', action: 'Prepare & File' },
                { title: 'GSTR-3B Status', sub: 'Jul 2026 — Due Aug 20', status: 'draft', action: 'Continue Draft' },
                { title: 'GSTR-9 Annual', sub: 'FY 2025-26 — Due Dec 31', status: 'not_started', action: 'Start Filing' },
              ].map((item) => (
                <div key={item.title} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                    <Badge className={`text-[10px] border ${statusStyle[item.status]} px-2 py-0`}>{item.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-white/40 mb-4">{item.sub}</p>
                  <Button size="sm" className="w-full bg-[#2563EB]/20 hover:bg-[#2563EB]/40 text-[#2563EB] border border-[#2563EB]/20 text-xs">{item.action}</Button>
                </div>
              ))}
            </div>
          </TabsContent>
          {['gstr1', 'gstr3b', 'itc', 'tds'].map(t => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 font-medium">{t.toUpperCase()} Details</p>
                <p className="text-white/30 text-sm mt-1">Detailed breakdown for current period</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
