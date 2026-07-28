import { useState } from 'react';
import { motion } from 'framer-motion';
import { Factory, Clock, CheckCircle, AlertCircle, Plus, Download, Filter, Search, MoreHorizontal, Zap, TrendingUp, Settings, Play, Pause } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const productionData = [
  { week: 'W1', planned: 420, actual: 398 }, { week: 'W2', planned: 450, actual: 441 },
  { week: 'W3', planned: 480, actual: 462 }, { week: 'W4', planned: 510, actual: 503 },
];

const workOrders = [
  { id: 'WO-2841', product: 'Servo Assembly X200', qty: 50, produced: 32, bom: 'BOM-142', workcenter: 'CNC-01', status: 'in_progress', due: 'Jul 30', priority: 'high' },
  { id: 'WO-2840', product: 'Hydraulic Pump HX-9', qty: 20, produced: 20, bom: 'BOM-118', workcenter: 'ASSY-02', status: 'done', due: 'Jul 28', priority: 'medium' },
  { id: 'WO-2839', product: 'Control Panel V3', qty: 15, produced: 0, bom: 'BOM-201', workcenter: 'ELEC-01', status: 'scheduled', due: 'Aug 3', priority: 'medium' },
  { id: 'WO-2838', product: 'Gear Assembly G-12', qty: 100, produced: 67, bom: 'BOM-089', workcenter: 'LATHE-01', status: 'in_progress', due: 'Aug 1', priority: 'low' },
  { id: 'WO-2837', product: 'Frame Weldment FW-4', qty: 8, produced: 0, bom: 'BOM-310', workcenter: 'WELD-03', status: 'planned', due: 'Aug 5', priority: 'low' },
];

const workcenters = [
  { id: 'CNC-01', name: 'CNC Machining Center', utilization: 84, status: 'running', operator: 'John M.' },
  { id: 'ASSY-02', name: 'Assembly Line 2', utilization: 62, status: 'running', operator: 'Maria R.' },
  { id: 'ELEC-01', name: 'Electronics Assembly', utilization: 0, status: 'idle', operator: 'David K.' },
  { id: 'LATHE-01', name: 'Lathe Station 1', utilization: 91, status: 'running', operator: 'Chris L.' },
  { id: 'WELD-03', name: 'Welding Station 3', utilization: 48, status: 'maintenance', operator: 'Sam P.' },
];

const statusStyle: Record<string, string> = {
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  scheduled: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  planned: 'bg-white/5 text-white/50 border-white/10',
  running: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  idle: 'bg-white/5 text-white/50 border-white/10',
  maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

export default function Manufacturing() {
  const [tab, setTab] = useState('work-orders');
  return (
    <AppLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Manufacturing' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Manufacturing</h1><p className="text-white/40 text-sm mt-0.5">5 work orders · 4 work centers · 92.1% OEE</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New WO</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active WOs', value: '24', sub: '8 behind schedule', icon: Factory, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'OEE Rate', value: '92.1%', sub: '+1.4% this week', icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Units Produced', value: '1,404', sub: 'This month', icon: CheckCircle, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Downtime', value: '4.2h', sub: '-28% vs last week', icon: AlertCircle, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
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
            <h3 className="font-semibold text-white mb-4">Production vs Plan</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                <Bar dataKey="planned" name="Planned" fill="rgba(255,255,255,0.08)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#2563EB" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Work Center Status</h3>
            <div className="space-y-3">
              {workcenters.map((wc) => (
                <div key={wc.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center flex-shrink-0">
                    <Factory className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">{wc.name}</span>
                      <Badge className={`text-[10px] border ${statusStyle[wc.status]} px-2 py-0 ml-2`}>{wc.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={wc.utilization} className="flex-1 h-1.5 bg-white/[0.07]" />
                      <span className="text-xs text-white/40 w-8">{wc.utilization}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['work-orders', 'bom', 'routings'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t.replace('-', ' ')}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
            </div>
          </div>
          <TabsContent value="work-orders" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['WO #', 'Product', 'Qty', 'Progress', 'Work Center', 'Status', 'Due', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{wo.id}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{wo.product}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{wo.qty}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={(wo.produced / wo.qty) * 100} className="w-20 h-1.5 bg-white/[0.07]" />
                          <span className="text-xs text-white/50">{wo.produced}/{wo.qty}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">{wo.workcenter}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[wo.status]} px-2 py-0`}>{wo.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/50">{wo.due}</td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="bom" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Settings className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Bill of Materials</p><p className="text-white/30 text-sm mt-1">48 BOMs configured</p>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><Plus className="w-3.5 h-3.5 mr-1.5" />New BOM</Button>
            </div>
          </TabsContent>
          <TabsContent value="routings" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Zap className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Production Routings</p><p className="text-white/30 text-sm mt-1">24 routing configurations</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
