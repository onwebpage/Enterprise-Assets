import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, DollarSign, FileText, Plus, Download, Search, Filter, MoreHorizontal, Star, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const vendors = [
  { id: 'VND-401', name: 'TechParts Ltd.', contact: 'Mark Johnson', category: 'Electronics', spend: 84200, pos: 42, onTime: 96, rating: 4.8, status: 'preferred', lastOrder: '2d ago' },
  { id: 'VND-400', name: 'SteelCore Ltd.', contact: 'Patricia Lee', category: 'Raw Materials', spend: 98700, pos: 31, onTime: 94, rating: 4.7, status: 'preferred', lastOrder: '5d ago' },
  { id: 'VND-399', name: 'Omega Supplies', contact: 'Gary White', category: 'Raw Materials', spend: 61500, pos: 38, onTime: 92, rating: 4.5, status: 'approved', lastOrder: '3d ago' },
  { id: 'VND-398', name: 'MegaDistrib Co.', contact: 'Nancy Garcia', category: 'Machinery', spend: 112400, pos: 21, onTime: 88, rating: 4.2, status: 'approved', lastOrder: '1w ago' },
  { id: 'VND-397', name: 'FastFreight Inc.', contact: 'Tom Brown', category: 'Logistics', spend: 29800, pos: 17, onTime: 84, rating: 3.9, status: 'under_review', lastOrder: '2w ago' },
];

const pendingBills = [
  { id: 'BILL-0912', vendor: 'TechParts Ltd.', amount: 12400, due: 'Jul 30, 2026', status: 'pending', po: 'PO-1092', days: 4 },
  { id: 'BILL-0911', vendor: 'Omega Supplies', amount: 8900, due: 'Aug 3, 2026', status: 'approved', po: 'PO-1091', days: 8 },
  { id: 'BILL-0910', vendor: 'SteelCore Ltd.', amount: 22100, due: 'Aug 8, 2026', status: 'pending', po: 'PO-1087', days: 13 },
  { id: 'BILL-0909', vendor: 'MegaDistrib Co.', amount: 45600, due: 'Jul 28, 2026', status: 'paid', po: 'PO-1090', days: 0 },
];

const statusStyle: Record<string, string> = {
  preferred: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  approved: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  under_review: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  blocked: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function VendorPortal() {
  const [tab, setTab] = useState('vendors');
  return (
    <AppLayout breadcrumbs={[{ label: 'Portals' }, { label: 'Vendor Portal' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Vendor Portal</h1><p className="text-white/40 text-sm mt-0.5">48 vendors · $2.8M YTD spend · 91.4% on-time delivery</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Vendor</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Vendors', value: '48', sub: '12 preferred', icon: Truck, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'YTD Spend', value: '$2.8M', sub: '+9.2% vs target', icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Pending Invoices', value: '18', sub: '$89.5K outstanding', icon: FileText, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
            { label: 'On-Time Rate', value: '91.4%', sub: '+2.1% this quarter', icon: CheckCircle, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p><p className="text-xs text-white/40 mt-0.5">{k.label}</p><p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['vendors', 'bills', 'performance'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search vendors..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="vendors" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Vendor', 'Category', 'YTD Spend', 'POs', 'On-Time %', 'Rating', 'Status', 'Last Order', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white">{v.name[0]}</div>
                          <div><p className="text-sm font-medium text-white">{v.name}</p><p className="text-xs text-white/30">{v.contact}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{v.category}</Badge></td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${v.spend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{v.pos}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={v.onTime} className="w-16 h-1.5 bg-white/[0.07]" />
                          <span className="text-xs text-white/50">{v.onTime}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-400 font-medium">★ {v.rating}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[v.status]} px-2 py-0`}>{v.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/40">{v.lastOrder}</td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 5 of 48 vendors</p>
                <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((p) => (<button key={p} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bills" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Bill #', 'Vendor', 'PO Reference', 'Amount', 'Due Date', 'Days Left', 'Status', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {pendingBills.map((b) => (
                    <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{b.id}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{b.vendor}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{b.po}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${b.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{b.due}</td>
                      <td className="px-4 py-3"><span className={`text-sm font-medium ${b.days <= 3 ? 'text-red-400' : b.days <= 7 ? 'text-amber-400' : 'text-white/50'}`}>{b.days > 0 ? `${b.days}d` : 'Paid'}</span></td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[b.status]} px-2 py-0`}>{b.status}</Badge></td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map((v) => (
                <div key={v.id} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-sm font-bold text-white">{v.name[0]}</div>
                      <div><p className="font-semibold text-white">{v.name}</p><p className="text-xs text-white/40">{v.category}</p></div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /><span className="text-sm font-semibold">{v.rating}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[{ l: 'Spend', v: `$${(v.spend / 1000).toFixed(0)}K` }, { l: 'POs', v: v.pos }, { l: 'On-Time', v: `${v.onTime}%` }].map(item => (
                      <div key={item.l} className="text-center"><p className="text-sm font-bold text-white">{item.v}</p><p className="text-xs text-white/30">{item.l}</p></div>
                    ))}
                  </div>
                  <Progress value={v.onTime} className="h-1.5 bg-white/[0.07]" />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
