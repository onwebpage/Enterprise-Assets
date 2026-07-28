import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Package, Warehouse, ArrowLeftRight, TrendingDown, TrendingUp,
  Plus, Download, Filter, Search, MoreHorizontal, Eye, Edit,
  Trash2, ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2,
  BarChart3, RefreshCw, Layers, QrCode, Truck, MapPin,
  Clock, Hash, Box, Archive, ArrowRight, Activity, Zap,
  RotateCcw, ScanLine, CircleDot, Grip,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import KPICard from '@/components/app/KPICard';
import StatusBadge from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1225] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-white/60">{p.name}:</span>
          <span className="text-xs font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const stockTrend = [
  { month: 'Jan', inbound: 420, outbound: 380, onHand: 2100 },
  { month: 'Feb', inbound: 380, outbound: 410, onHand: 2070 },
  { month: 'Mar', inbound: 520, outbound: 440, onHand: 2150 },
  { month: 'Apr', inbound: 490, outbound: 470, onHand: 2170 },
  { month: 'May', inbound: 610, outbound: 540, onHand: 2240 },
  { month: 'Jun', inbound: 580, outbound: 510, onHand: 2310 },
  { month: 'Jul', inbound: 540, outbound: 490, onHand: 2360 },
];

const products = [
  { sku: 'PRD-0441', name: 'Enterprise ERP License (Annual)',  category: 'Software',    qty: 0,    reserved: 0,   reorder: 0,   cost: 24800, status: 'active',      warehouse: 'WH-01' },
  { sku: 'PRD-0440', name: 'Cloud Connector Module',           category: 'Software',    qty: 0,    reserved: 0,   reorder: 0,   cost: 4200,  status: 'active',      warehouse: 'WH-01' },
  { sku: 'PRD-0439', name: 'Industrial RFID Scanner Pro',      category: 'Hardware',    qty: 84,   reserved: 12,  reorder: 20,  cost: 1280,  status: 'active',      warehouse: 'WH-02' },
  { sku: 'PRD-0438', name: 'Portable Barcode Terminal 3K',     category: 'Hardware',    qty: 156,  reserved: 24,  reorder: 40,  cost: 890,   status: 'active',      warehouse: 'WH-02' },
  { sku: 'PRD-0437', name: 'Network Switch 48P Managed',       category: 'Hardware',    qty: 18,   reserved: 8,   reorder: 25,  cost: 3400,  status: 'low-stock',   warehouse: 'WH-02' },
  { sku: 'PRD-0436', name: 'UPS Battery Module 3KVA',          category: 'Hardware',    qty: 7,    reserved: 2,   reorder: 15,  cost: 2100,  status: 'low-stock',   warehouse: 'WH-03' },
  { sku: 'PRD-0435', name: 'Implementation Services — SME',    category: 'Service',     qty: 0,    reserved: 0,   reorder: 0,   cost: 12000, status: 'active',      warehouse: 'WH-01' },
  { sku: 'PRD-0434', name: 'Server Rack 42U Cabinet',          category: 'Hardware',    qty: 0,    reserved: 0,   reorder: 5,   cost: 1840,  status: 'out-of-stock',warehouse: 'WH-03' },
  { sku: 'PRD-0433', name: 'Wireless AP Industrial Dual-Band', category: 'Hardware',    qty: 43,   reserved: 0,   reorder: 10,  cost: 640,   status: 'active',      warehouse: 'WH-02' },
  { sku: 'PRD-0432', name: 'Training Package (5 Users)',       category: 'Service',     qty: 0,    reserved: 0,   reorder: 0,   cost: 2800,  status: 'active',      warehouse: 'WH-01' },
];

const warehouses = [
  { id: 'WH-01', name: 'Main Office / Digital',  location: 'Toronto, ON',    skus: 420,  capacity: 100, used: 42,  manager: 'Sarah Kim',   status: 'active' },
  { id: 'WH-02', name: 'HW Distribution Centre', location: 'Mississauga, ON',skus: 1840, capacity: 5000,used: 3100,manager: 'Tom Brown',   status: 'active' },
  { id: 'WH-03', name: 'East Coast Hub',          location: 'Halifax, NS',    skus: 620,  capacity: 2000,used: 940, manager: 'Anna Park',   status: 'active' },
  { id: 'WH-04', name: 'West Coast Staging',      location: 'Vancouver, BC',  skus: 280,  capacity: 1500,used: 280, manager: 'James Doyle', status: 'maintenance'},
];

const stockLevels = [
  { sku: 'PRD-0439', name: 'RFID Scanner Pro',     onHand: 84,  reserved: 12, available: 72, reorder: 20,  value: 107520, status: 'ok'       },
  { sku: 'PRD-0438', name: 'Barcode Terminal 3K',  onHand: 156, reserved: 24, available: 132,reorder: 40,  value: 138840, status: 'ok'       },
  { sku: 'PRD-0437', name: 'Network Switch 48P',   onHand: 18,  reserved: 8,  available: 10, reorder: 25,  value: 61200,  status: 'low'      },
  { sku: 'PRD-0436', name: 'UPS Battery 3KVA',     onHand: 7,   reserved: 2,  available: 5,  reorder: 15,  value: 14700,  status: 'critical' },
  { sku: 'PRD-0434', name: 'Server Rack 42U',      onHand: 0,   reserved: 0,  available: 0,  reorder: 5,   value: 0,      status: 'oos'      },
  { sku: 'PRD-0433', name: 'Wireless AP Industrial',onHand: 43, reserved: 0,  available: 43, reorder: 10,  value: 27520,  status: 'ok'       },
];

const transfers = [
  { id: 'TF-0821', from: 'WH-02', to: 'WH-03', items: 24, status: 'in-transit', date: 'Jul 26, 2026', notes: 'Barcode terminals batch' },
  { id: 'TF-0820', from: 'WH-03', to: 'WH-02', items: 12, status: 'completed',  date: 'Jul 24, 2026', notes: 'RFID scanner return' },
  { id: 'TF-0819', from: 'WH-02', to: 'WH-04', items: 48, status: 'pending',    date: 'Jul 28, 2026', notes: 'West coast re-stock' },
  { id: 'TF-0818', from: 'WH-01', to: 'WH-03', items: 6,  status: 'completed',  date: 'Jul 21, 2026', notes: 'Hardware samples' },
  { id: 'TF-0817', from: 'WH-04', to: 'WH-02', items: 30, status: 'on-hold',    date: 'Jul 19, 2026', notes: 'Maintenance delay' },
];

const movements = [
  { id: 'MV-4241', type: 'receipt',  sku: 'PRD-0439', product: 'RFID Scanner Pro',    qty: 50,  warehouse: 'WH-02', ref: 'PO-1120', date: 'Jul 27, 2026', by: 'System' },
  { id: 'MV-4240', type: 'dispatch', sku: 'PRD-0438', product: 'Barcode Terminal 3K', qty: -12, warehouse: 'WH-02', ref: 'SO-3341', date: 'Jul 27, 2026', by: 'T. Brown' },
  { id: 'MV-4239', type: 'transfer', sku: 'PRD-0437', product: 'Network Switch 48P',  qty: -8,  warehouse: 'WH-02', ref: 'TF-0820', date: 'Jul 24, 2026', by: 'A. Park' },
  { id: 'MV-4238', type: 'receipt',  sku: 'PRD-0433', product: 'Wireless AP Industrial',qty:20, warehouse: 'WH-02', ref: 'PO-1119', date: 'Jul 23, 2026', by: 'System' },
  { id: 'MV-4237', type: 'dispatch', sku: 'PRD-0439', product: 'RFID Scanner Pro',    qty: -6,  warehouse: 'WH-03', ref: 'SO-3339', date: 'Jul 22, 2026', by: 'J. Doyle' },
  { id: 'MV-4236', type: 'adjustment',sku: 'PRD-0436',product: 'UPS Battery 3KVA',   qty: -2,  warehouse: 'WH-03', ref: 'ADJ-041', date: 'Jul 20, 2026', by: 'A. Park' },
];

const batchSerial = [
  { id: 'LOT-2824', sku: 'PRD-0439', product: 'RFID Scanner Pro',    type: 'lot',    qty: 50,  expiry: 'Dec 2027', warehouse: 'WH-02', status: 'active'   },
  { id: 'LOT-2823', sku: 'PRD-0438', product: 'Barcode Terminal 3K', type: 'lot',    qty: 80,  expiry: 'Mar 2028', warehouse: 'WH-02', status: 'active'   },
  { id: 'SN-004821',sku: 'PRD-0437', product: 'Network Switch 48P',  type: 'serial', qty: 1,   expiry: '—',        warehouse: 'WH-02', status: 'active'   },
  { id: 'SN-004822',sku: 'PRD-0437', product: 'Network Switch 48P',  type: 'serial', qty: 1,   expiry: '—',        warehouse: 'WH-02', status: 'reserved' },
  { id: 'LOT-2822', sku: 'PRD-0433', product: 'Wireless AP Industrial',type:'lot',   qty: 43,  expiry: 'Jun 2028', warehouse: 'WH-02', status: 'active'   },
  { id: 'LOT-2821', sku: 'PRD-0436', product: 'UPS Battery 3KVA',    type: 'lot',    qty: 7,   expiry: 'Sep 2026', warehouse: 'WH-03', status: 'expiring' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const stockStatusStyles: Record<string, string> = {
  ok:       'text-emerald-400 bg-emerald-500/10',
  low:      'text-amber-400 bg-amber-500/10',
  critical: 'text-red-400 bg-red-500/10',
  oos:      'text-white/30 bg-white/[0.05]',
};
const stockStatusLabel: Record<string, string> = {
  ok:'In Stock', low:'Low Stock', critical:'Critical', oos:'Out of Stock',
};

const movTypeIcon: Record<string, any>    = { receipt: ArrowDownLeft, dispatch: ArrowUpRight, transfer: ArrowLeftRight, adjustment: RefreshCw };
const movTypeColor: Record<string, string> = { receipt: 'text-emerald-400', dispatch: 'text-red-400', transfer: 'text-[#2563EB]', adjustment: 'text-amber-400' };

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [tab, setTab] = useState('dashboard');

  const kpis = [
    { label: 'Total SKUs',       value: '3,160',  change: '+84',     up: true,  icon: Package,       iconColor: 'text-[#2563EB]',  gradient: 'bg-[#2563EB]/15',  sparkline:[2900,2980,3020,3060,3090,3130,3160], changeLabel: 'across 4 warehouses' },
    { label: 'Inventory Value',  value: '$2.18M', change: '+6.4%',   up: true,  icon: Archive,       iconColor: 'text-[#06B6D4]',  gradient: 'bg-[#06B6D4]/15',  sparkline:[1.8,1.9,1.95,2.0,2.1,2.15,2.18],    changeLabel: 'at cost price' },
    { label: 'Low Stock Alerts', value: '14',     change: '+3',      up: false, icon: AlertTriangle, iconColor: 'text-amber-400',  gradient: 'bg-amber-500/15',  sparkline:[8,9,10,11,12,11,14],                  changeLabel: 'need reorder action' },
    { label: 'Pending Transfers',value: '7',      change: '-2',      up: true,  icon: Truck,         iconColor: 'text-purple-400', gradient: 'bg-purple-500/15', sparkline:[12,10,9,8,9,8,7],                     changeLabel: '3 in transit today' },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Inventory & Warehouse' }]}>
      <div className="p-6 max-w-[1800px] mx-auto space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Inventory & Warehouse</h1>
            <p className="text-sm text-white/40 mt-0.5">
              4 warehouses &nbsp;·&nbsp; 3,160 SKUs &nbsp;·&nbsp; $2.18M on-hand value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <ScanLine className="w-3.5 h-3.5 mr-1.5" />Scan Item
            </Button>
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />Transfer
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add Product
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
                { value: 'dashboard',   label: 'Dashboard',     icon: BarChart3      },
                { value: 'products',    label: 'Products',      icon: Package        },
                { value: 'warehouses',  label: 'Warehouses',    icon: Warehouse      },
                { value: 'stock',       label: 'Stock Levels',  icon: Layers         },
                { value: 'transfers',   label: 'Transfers',     icon: ArrowLeftRight },
                { value: 'movements',   label: 'Movements',     icon: Activity       },
                { value: 'batch',       label: 'Batch & Serial',icon: Hash           },
                { value: 'analytics',   label: 'Analytics',     icon: TrendingUp     },
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
              {/* Stock flow */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Stock Flow</h3>
                    <p className="text-xs text-white/35 mt-0.5">Inbound vs outbound units · FY 2026</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stockTrend} margin={{ left:-20, right:5, top:5 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="inbound"  name="Inbound"  fill="#22C55E" radius={[3,3,0,0]} />
                    <Bar dataKey="outbound" name="Outbound" fill="#EF4444" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Alerts panel */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Stock Alerts</h3>
                <div className="space-y-2.5">
                  {stockLevels.filter(s => s.status !== 'ok').map(item => (
                    <div key={item.sku} className={cn('rounded-lg p-3 border', item.status === 'critical' || item.status === 'oos' ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-amber-500/[0.06] border-amber-500/20')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white/80 truncate">{item.name}</p>
                          <p className="text-[11px] text-white/35 mt-0.5 font-mono">{item.sku}</p>
                        </div>
                        <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0', stockStatusStyles[item.status])}>
                          {stockStatusLabel[item.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-white/40">
                        <span>On hand: <span className="text-white/70 font-medium">{item.onHand}</span></span>
                        <span>Reorder: <span className="text-white/70 font-medium">{item.reorder}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center justify-center gap-1 py-2">
                  View all alerts <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Warehouse utilisation */}
              <div className="xl:col-span-1 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Warehouse Utilisation</h3>
                <div className="space-y-4">
                  {warehouses.map(wh => {
                    const pct = Math.round((wh.used / wh.capacity) * 100);
                    return (
                      <div key={wh.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <span className="text-sm font-medium text-white/80">{wh.id}</span>
                            <span className="text-xs text-white/35 ml-2">{wh.location}</span>
                          </div>
                          <span className={cn('text-xs font-semibold', pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-amber-400' : 'text-emerald-400')}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400')}
                          />
                        </div>
                        <p className="text-[11px] text-white/30 mt-1">{wh.used.toLocaleString()} / {wh.capacity.toLocaleString()} units</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent movements */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl">
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-sm font-semibold text-white">Recent Movements</h3>
                  <button className="text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {['ID','Type','Product','Qty','Warehouse','Date'].map(h=>(
                        <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movements.slice(0,5).map(mv => {
                      const Icon = movTypeIcon[mv.type];
                      return (
                        <TR key={mv.id}>
                          <td className="px-4 py-3 text-xs font-mono text-white/40">{mv.id}</td>
                          <td className="px-4 py-3">
                            <span className={cn('flex items-center gap-1.5 text-xs font-medium capitalize', movTypeColor[mv.type])}>
                              <Icon className="w-3.5 h-3.5" />{mv.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white/80 truncate max-w-[180px]">{mv.product}</p>
                            <p className="text-[11px] text-white/30 font-mono">{mv.sku}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-sm font-semibold', mv.qty > 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {mv.qty > 0 ? '+' : ''}{mv.qty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/50">{mv.warehouse}</td>
                          <td className="px-4 py-3 text-xs text-white/40">{mv.date}</td>
                        </TR>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── PRODUCTS ──────────────────────────────────────────────────── */}
          <TabsContent value="products" className="mt-4">
            <TableShell
              headers={['SKU','Product','Category','On Hand','Reserved','Reorder Pt.','Cost','Warehouse','Status','']}
              footer={<Pagination total="3,160" shown={products.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={10} className="p-0">
                  <FilterBar placeholder="Search products, SKU...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add Product
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {products.map(p => (
                <TR key={p.sku}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{p.sku}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        {p.category === 'Software' ? <Zap className="w-3.5 h-3.5 text-[#2563EB]" /> :
                         p.category === 'Hardware' ? <Box className="w-3.5 h-3.5 text-amber-400" /> :
                         <Grip className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <span className="text-sm text-white/80 font-medium truncate max-w-[220px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-[11px] border-0 font-medium',
                      p.category === 'Software' ? 'bg-[#2563EB]/15 text-[#2563EB]' :
                      p.category === 'Hardware' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-purple-500/15 text-purple-400')}>
                      {p.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{p.qty}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{p.reserved}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{p.reorder}</td>
                  <td className="px-4 py-3 text-sm text-white/70">${p.cost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-white/40 font-mono">{p.warehouse}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status === 'low-stock' ? 'pending' : p.status === 'out-of-stock' ? 'overdue' : 'active'} /></td>
                  <RowActions />
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── WAREHOUSES ────────────────────────────────────────────────── */}
          <TabsContent value="warehouses" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouses.map((wh, i) => {
                const pct = Math.round((wh.used / wh.capacity) * 100);
                return (
                  <motion.div key={wh.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}
                    className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.14] transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center">
                          <Warehouse className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-[#60A5FA] transition-colors">{wh.name}</p>
                          <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{wh.location}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={wh.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'SKUs', value: wh.skus.toLocaleString() },
                        { label: 'Capacity', value: wh.capacity.toLocaleString() },
                        { label: 'Manager', value: wh.manager.split(' ')[0] },
                      ].map(m => (
                        <div key={m.label} className="bg-white/[0.03] rounded-lg px-3 py-2.5">
                          <p className="text-[11px] text-white/30 mb-1">{m.label}</p>
                          <p className="text-sm font-semibold text-white">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/40">Utilisation</span>
                        <span className={cn('text-xs font-semibold', pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-amber-400' : 'text-emerald-400')}>
                          {pct}% ({wh.used.toLocaleString()} / {wh.capacity.toLocaleString()})
                        </span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400')}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── STOCK LEVELS ──────────────────────────────────────────────── */}
          <TabsContent value="stock" className="mt-4">
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'In Stock',    count: 4, color: 'border-emerald-500/25 text-emerald-400' },
                { label: 'Low Stock',   count: 1, color: 'border-amber-500/25 text-amber-400'    },
                { label: 'Critical',    count: 1, color: 'border-red-500/25 text-red-400'         },
                { label: 'Out of Stock',count: 1, color: 'border-white/10 text-white/40'          },
              ].map(b => (
                <div key={b.label} className={cn('bg-[#0a0f1e] border rounded-xl p-4', b.color.split(' ')[0])}>
                  <p className={cn('text-2xl font-bold mb-0.5', b.color.split(' ')[1])}>{b.count}</p>
                  <p className="text-sm text-white/50">{b.label}</p>
                </div>
              ))}
            </div>
            <TableShell
              headers={['SKU','Product','On Hand','Reserved','Available','Reorder Pt.','Stock Value','Status','']}
              footer={<Pagination total="3,160" shown={stockLevels.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={9} className="p-0">
                  <FilterBar placeholder="Search SKU, product...">
                    <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {stockLevels.map(item => (
                <TR key={item.sku}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{item.sku}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{item.onHand}</td>
                  <td className="px-4 py-3 text-sm text-amber-400">{item.reserved}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">{item.available}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{item.reorder}</td>
                  <td className="px-4 py-3 text-sm text-white/70">${item.value.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md', stockStatusStyles[item.status])}>
                      {stockStatusLabel[item.status]}
                    </span>
                  </td>
                  <RowActions />
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── TRANSFERS ─────────────────────────────────────────────────── */}
          <TabsContent value="transfers" className="mt-4">
            <TableShell
              headers={['Transfer #','From','To','Items','Notes','Status','Date','']}
              footer={<Pagination total="148" shown={transfers.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search transfers...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />New Transfer
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {transfers.map(tf => (
                <TR key={tf.id}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{tf.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-white/[0.05] px-2 py-1 rounded text-white/60">{tf.from}</span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-white/20" />
                    <span className="text-xs font-mono bg-white/[0.05] px-2 py-1 rounded text-white/60">{tf.to}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{tf.items}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{tf.notes}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tf.status === 'in-transit' ? 'processing' : tf.status === 'completed' ? 'completed' : tf.status === 'on-hold' ? 'inactive' : 'pending'} />
                  </td>
                  <td className="px-4 py-3 text-sm text-white/40">{tf.date}</td>
                  <RowActions />
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── MOVEMENTS ─────────────────────────────────────────────────── */}
          <TabsContent value="movements" className="mt-4">
            <TableShell
              headers={['ID','Type','SKU','Product','Qty Change','Warehouse','Ref','Date','By','']}
              footer={<Pagination total="8,420" shown={movements.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={10} className="p-0">
                  <FilterBar placeholder="Search movements, SKU, ref...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Record Movement
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {movements.map(mv => {
                const Icon = movTypeIcon[mv.type];
                return (
                  <TR key={mv.id}>
                    <td className="px-4 py-3 text-xs font-mono text-white/40">{mv.id}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-medium capitalize', movTypeColor[mv.type])}>
                        <Icon className="w-3.5 h-3.5" />{mv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#2563EB]">{mv.sku}</td>
                    <td className="px-4 py-3 text-sm text-white/80 truncate max-w-[160px]">{mv.product}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-bold', mv.qty > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {mv.qty > 0 ? '+' : ''}{mv.qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-white/40">{mv.warehouse}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#06B6D4]">{mv.ref}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{mv.date}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{mv.by}</td>
                    <RowActions />
                  </TR>
                );
              })}
            </TableShell>
          </TabsContent>

          {/* ── BATCH & SERIAL ────────────────────────────────────────────── */}
          <TabsContent value="batch" className="mt-4">
            <TableShell
              headers={['Lot / Serial #','SKU','Product','Type','Qty','Expiry','Warehouse','Status','']}
              footer={<Pagination total="2,840" shown={batchSerial.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={9} className="p-0">
                  <FilterBar placeholder="Search lot number, serial, SKU...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <QrCode className="w-3.5 h-3.5 mr-1.5" />Assign Lot/SN
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {batchSerial.map(b => (
                <TR key={b.id}>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-[#2563EB]">{b.id}</td>
                  <td className="px-4 py-3 text-xs font-mono text-white/40">{b.sku}</td>
                  <td className="px-4 py-3 text-sm text-white/80">{b.product}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-[11px] border-0', b.type === 'lot' ? 'bg-[#2563EB]/15 text-[#2563EB]' : 'bg-purple-500/15 text-purple-400')}>
                      {b.type === 'lot' ? 'Lot' : 'Serial'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{b.qty}</td>
                  <td className={cn('px-4 py-3 text-sm', b.status === 'expiring' ? 'text-red-400 font-semibold' : 'text-white/50')}>{b.expiry}</td>
                  <td className="px-4 py-3 text-xs font-mono text-white/40">{b.warehouse}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status === 'expiring' ? 'overdue' : b.status === 'reserved' ? 'pending' : 'active'} />
                  </td>
                  <RowActions />
                </TR>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* On-hand trend */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">On-Hand Inventory Trend</h3>
                <p className="text-xs text-white/35 mb-4">Total units on hand · FY 2026</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stockTrend} margin={{ left:-20, right:5, top:5 }}>
                    <defs>
                      <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="onHand" name="On Hand" stroke="#06B6D4" strokeWidth={2} fill="url(#stockGrad)" dot={false} activeDot={{ r:4, fill:'#06B6D4' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Inbound vs Outbound */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Inbound vs Outbound</h3>
                <p className="text-xs text-white/35 mb-4">Units received and dispatched · Monthly</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stockTrend} margin={{ left:-20, right:5, top:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.28)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="inbound"  name="Inbound"  stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r:4, fill:'#22C55E' }} />
                    <Line type="monotone" dataKey="outbound" name="Outbound" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r:4, fill:'#EF4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Inventory Value by Category</h3>
              <p className="text-xs text-white/35 mb-5">At cost price · Current snapshot</p>
              <div className="space-y-3">
                {[
                  { cat: 'Hardware',  value: 1480000, pct: 68, color: '#F59E0B' },
                  { cat: 'Software',  value: 520000,  pct: 24, color: '#2563EB' },
                  { cat: 'Services',  value: 180000,  pct: 8,  color: '#A78BFA' },
                ].map((c, i) => (
                  <div key={c.cat} className="flex items-center gap-4">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-sm text-white/60 w-24 flex-shrink-0">{c.cat}</span>
                    <div className="flex-1 h-7 bg-white/[0.04] rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.pct}%` }}
                        transition={{ delay: 0.1 + i*0.08, duration: 0.5, ease:'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-lg flex items-center px-3"
                        style={{ background: `${c.color}20`, borderRight: `2px solid ${c.color}` }}
                      >
                        <span className="text-xs font-semibold text-white">${(c.value/1000).toFixed(0)}K</span>
                      </motion.div>
                    </div>
                    <span className="text-sm font-semibold text-white/50 w-10 text-right">{c.pct}%</span>
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
