import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Package, TrendingUp, Clock, Plus, Download, Filter,
  Search, MoreHorizontal, Eye, Edit, Truck, CheckCircle, AlertCircle,
  XCircle, ArrowUpRight, FileText, Zap, DollarSign
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const spendData = [
  { month: 'Jan', spend: 1.8 }, { month: 'Feb', spend: 2.1 }, { month: 'Mar', spend: 1.9 },
  { month: 'Apr', spend: 2.6 }, { month: 'May', spend: 2.4 }, { month: 'Jun', spend: 3.0 }, { month: 'Jul', spend: 2.8 },
];

const orders = [
  { id: 'PO-1092', vendor: 'TechParts Ltd.', items: 8, amount: 12400, status: 'pending', date: 'Jul 26, 2026', delivery: 'Aug 3', category: 'Electronics' },
  { id: 'PO-1091', vendor: 'Omega Supplies', items: 24, amount: 8900, status: 'approved', date: 'Jul 24, 2026', delivery: 'Jul 31', category: 'Raw Materials' },
  { id: 'PO-1090', vendor: 'MegaDistrib Co.', items: 3, amount: 45600, status: 'received', date: 'Jul 20, 2026', delivery: 'Jul 28', category: 'Machinery' },
  { id: 'PO-1089', vendor: 'FastFreight Inc.', items: 12, amount: 6200, status: 'approved', date: 'Jul 18, 2026', delivery: 'Jul 30', category: 'Packaging' },
  { id: 'PO-1088', vendor: 'Global Sourcing', items: 6, amount: 31800, status: 'cancelled', date: 'Jul 15, 2026', delivery: 'N/A', category: 'Equipment' },
  { id: 'PO-1087', vendor: 'SteelCore Ltd.', items: 50, amount: 22100, status: 'received', date: 'Jul 12, 2026', delivery: 'Jul 25', category: 'Raw Materials' },
];

const vendors = [
  { name: 'TechParts Ltd.', category: 'Electronics', spend: '$84,200', rating: 4.8, onTime: 96, orders: 42, status: 'preferred' },
  { name: 'Omega Supplies', category: 'Raw Materials', spend: '$61,500', rating: 4.5, onTime: 92, orders: 38, status: 'approved' },
  { name: 'MegaDistrib Co.', category: 'Machinery', spend: '$112,400', rating: 4.2, onTime: 88, orders: 21, status: 'preferred' },
  { name: 'FastFreight Inc.', category: 'Packaging', spend: '$29,800', rating: 3.9, onTime: 84, orders: 17, status: 'approved' },
  { name: 'SteelCore Ltd.', category: 'Raw Materials', spend: '$98,700', rating: 4.7, onTime: 94, orders: 31, status: 'preferred' },
];

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  approved: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  received: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function Purchase() {
  const [tab, setTab] = useState('orders');
  return (
    <AppLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Purchase & Procurement' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase & Procurement</h1>
            <p className="text-white/40 text-sm mt-0.5">6 active purchase orders · $2.8M YTD spend</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New PO</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'YTD Spend', value: '$2.8M', change: '+9.2%', icon: DollarSign, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Open Orders', value: '24', change: '8 pending approval', icon: ShoppingCart, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
            { label: 'On-Time Delivery', value: '91.4%', change: '+2.1% vs target', icon: Truck, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Active Vendors', value: '48', change: '5 preferred', icon: Package, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
              <p className="text-xs text-white/25 mt-0.5">{k.change}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Monthly Procurement Spend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={spendData} barSize={28}>
                <defs><linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.8} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0.4} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} formatter={(v: any) => [`$${v}M`, 'Spend']} />
                <Bar dataKey="spend" fill="url(#spendGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Vendor Performance</h3>
            <div className="space-y-3">
              {vendors.slice(0, 4).map((v) => (
                <div key={v.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{v.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">{v.name}</span>
                      <span className="text-xs text-white/50">{v.onTime}% on-time</span>
                    </div>
                    <Progress value={v.onTime} className="h-1.5 bg-white/[0.07]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['orders', 'vendors', 'rfq'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t === 'rfq' ? 'RFQ' : t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="orders" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['PO #', 'Vendor', 'Category', 'Items', 'Amount', 'Status', 'Expected Delivery', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{o.id}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{o.vendor}</td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{o.category}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/60">{o.items}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${o.amount.toLocaleString()}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[o.status]} px-2 py-0`}>{o.status}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/50">{o.delivery}</td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 6 of 124 records</p>
                <div className="flex items-center gap-1">{[1, 2, 3, '...', 21].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Vendor', 'Category', 'Total Spend', 'Rating', 'On-Time %', 'Orders', 'Status', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white">{v.name[0]}</div><span className="text-sm font-medium text-white">{v.name}</span></div></td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{v.category}</Badge></td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{v.spend}</td>
                      <td className="px-4 py-3 text-sm text-amber-400 font-medium">★ {v.rating}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Progress value={v.onTime} className="w-16 h-1.5 bg-white/[0.07]" /><span className="text-xs text-white/50">{v.onTime}%</span></div></td>
                      <td className="px-4 py-3 text-sm text-white/60">{v.orders}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border px-2 py-0 ${v.status === 'preferred' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20'}`}>{v.status}</Badge></td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="rfq" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 font-medium">Request for Quotations</p>
              <p className="text-white/30 text-sm mt-1">3 active RFQs awaiting vendor responses</p>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><Plus className="w-3.5 h-3.5 mr-1.5" />New RFQ</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
