import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, TrendingDown, TrendingUp, AlertCircle, Plus, Download,
  Filter, Search, MoreHorizontal, RefreshCw, Layers, Truck,
  ArrowUpRight, BarChart2, MapPin, Tag, QrCode
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const stockMovement = [
  { day: 'Mon', in: 240, out: 185 }, { day: 'Tue', in: 180, out: 210 },
  { day: 'Wed', in: 320, out: 190 }, { day: 'Thu', in: 210, out: 240 },
  { day: 'Fri', in: 290, out: 270 }, { day: 'Sat', in: 120, out: 80 }, { day: 'Sun', in: 60, out: 40 },
];

const products = [
  { sku: 'SKU-2841', name: 'Industrial Servo Motor X200', category: 'Electronics', stock: 12, min: 50, value: 28400, warehouse: 'WH-A', status: 'low' },
  { sku: 'SKU-1204', name: 'Steel Rod Grade A (100kg)', category: 'Raw Materials', stock: 842, min: 200, value: 42100, warehouse: 'WH-B', status: 'optimal' },
  { sku: 'SKU-3812', name: 'Hydraulic Pump HX-9', category: 'Machinery', stock: 28, min: 30, value: 112400, warehouse: 'WH-A', status: 'low' },
  { sku: 'SKU-0920', name: 'Packing Foam 2m Roll', category: 'Packaging', stock: 2104, min: 500, value: 8420, warehouse: 'WH-C', status: 'optimal' },
  { sku: 'SKU-5501', name: 'Circuit Board PCB-V3', category: 'Electronics', stock: 341, min: 100, value: 68200, warehouse: 'WH-A', status: 'optimal' },
  { sku: 'SKU-2210', name: 'Aluminum Sheet 4x8', category: 'Raw Materials', stock: 0, min: 80, value: 0, warehouse: 'WH-B', status: 'out' },
  { sku: 'SKU-4401', name: 'Bearing Assembly M12', category: 'Mechanical', stock: 1284, min: 200, value: 38520, warehouse: 'WH-A', status: 'optimal' },
];

const warehouses = [
  { id: 'WH-A', name: 'Main Warehouse — Chicago', capacity: 78, items: 1842, value: '$1.2M' },
  { id: 'WH-B', name: 'Secondary — Detroit', capacity: 54, items: 924, value: '$640K' },
  { id: 'WH-C', name: 'Distribution — Atlanta', capacity: 31, items: 421, value: '$280K' },
];

const statusStyle: Record<string, string> = {
  optimal: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  low: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  out: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function Inventory() {
  const [tab, setTab] = useState('products');
  return (
    <AppLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Inventory & Warehouse' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Inventory & Warehouse</h1>
            <p className="text-white/40 text-sm mt-0.5">3,187 SKUs · 3 warehouses · $2.1M total value</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Product</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total SKUs', value: '3,187', sub: '12 below reorder', icon: Package, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Inventory Value', value: '$2.1M', sub: '-1.2% this week', icon: BarChart2, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
            { label: 'Low Stock Alerts', value: '12', sub: '2 out of stock', icon: AlertCircle, color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5' },
            { label: 'Turnover Rate', value: '4.2x', sub: '+0.3 vs target', icon: RefreshCw, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
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

        {/* Warehouse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <div key={wh.id} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#06B6D4]" />
                <div>
                  <p className="text-sm font-semibold text-white">{wh.id}</p>
                  <p className="text-xs text-white/40">{wh.name}</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/40">Capacity used</span>
                  <span className="text-xs font-semibold text-white">{wh.capacity}%</span>
                </div>
                <Progress value={wh.capacity} className="h-2 bg-white/[0.07]" />
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.05]">
                <div><p className="text-lg font-bold text-white">{wh.items.toLocaleString()}</p><p className="text-xs text-white/40">Items</p></div>
                <div className="text-right"><p className="text-lg font-bold text-white">{wh.value}</p><p className="text-xs text-white/40">Value</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Stock Movement (This Week)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stockMovement}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                <Bar dataKey="in" name="Inbound" fill="#22C55E" radius={[3, 3, 0, 0]} opacity={0.8} />
                <Bar dataKey="out" name="Outbound" fill="#EF4444" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Low Stock Alerts</h3>
            <div className="space-y-2">
              {products.filter(p => p.status !== 'optimal').map((p) => (
                <div key={p.sku} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 ${p.status === 'out' ? 'text-red-400' : 'text-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{p.name}</p>
                    <p className="text-xs text-white/40">{p.sku} · {p.warehouse}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{p.stock}</p>
                    <p className="text-xs text-white/30">min {p.min}</p>
                  </div>
                  <Badge className={`text-[10px] border ${statusStyle[p.status]} px-2 py-0`}>{p.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['products', 'movements', 'adjustments'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search SKU, product..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-52" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="products" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['SKU', 'Product', 'Category', 'Stock', 'Min Stock', 'Value', 'Warehouse', 'Status', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.sku} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{p.sku}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white max-w-[220px] truncate">{p.name}</td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{p.category}</Badge></td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{p.stock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-white/40">{p.min}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{p.value > 0 ? `$${p.value.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/40 border-white/10 text-xs">{p.warehouse}</Badge></td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[p.status]} px-2 py-0`}>{p.status}</Badge></td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 7 of 3,187 records</p>
                <div className="flex items-center gap-1">{[1, 2, 3, '...', 319].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="movements" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Layers className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Stock Movements</p><p className="text-white/30 text-sm mt-1">284 movements this week</p>
            </div>
          </TabsContent>
          <TabsContent value="adjustments" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <RefreshCw className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Stock Adjustments</p><p className="text-white/30 text-sm mt-1">7 pending adjustments require approval</p>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><Plus className="w-3.5 h-3.5 mr-1.5" />New Adjustment</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
