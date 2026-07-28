import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Play, Pause, Plus, Download, Search, MoreHorizontal, CheckCircle, Clock, AlertCircle, ArrowRight, Settings, Activity, TrendingUp, Bot, Filter } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const workflows = [
  { id: 'WF-041', name: 'Invoice Auto-Approval', trigger: 'New Invoice Created', actions: 3, runs: 284, lastRun: '2m ago', status: 'active', category: 'Finance', success: 99.2 },
  { id: 'WF-040', name: 'Low Stock Alert & Reorder', trigger: 'Inventory below threshold', actions: 4, runs: 47, lastRun: '18m ago', status: 'active', category: 'Inventory', success: 97.8 },
  { id: 'WF-039', name: 'New Customer Onboarding', trigger: 'Deal marked Closed Won', actions: 7, runs: 12, lastRun: '2h ago', status: 'active', category: 'Sales', success: 100 },
  { id: 'WF-038', name: 'Payroll Processing', trigger: 'Monthly schedule (25th)', actions: 5, runs: 7, lastRun: '3d ago', status: 'active', category: 'HR', success: 100 },
  { id: 'WF-037', name: 'GST Return Reminder', trigger: '10 days before due date', actions: 2, runs: 6, lastRun: '1w ago', status: 'active', category: 'Tax', success: 100 },
  { id: 'WF-036', name: 'Overdue Invoice Follow-up', trigger: 'Invoice overdue > 7 days', actions: 3, runs: 19, lastRun: '1d ago', status: 'paused', category: 'Finance', success: 84.2 },
  { id: 'WF-035', name: 'Employee Onboarding', trigger: 'New hire added', actions: 12, runs: 4, lastRun: '1w ago', status: 'draft', category: 'HR', success: 0 },
];

const templates = [
  { name: 'AP Invoice Auto-Approval', desc: 'Automatically approve invoices under $5,000', category: 'Finance', steps: 3, icon: CheckCircle },
  { name: 'CRM Lead Qualification', desc: 'Score and route inbound leads', category: 'Sales', steps: 5, icon: Activity },
  { name: 'Inventory Reorder', desc: 'Create PO when stock hits reorder point', category: 'Inventory', steps: 4, icon: Zap },
  { name: 'Monthly Reports', desc: 'Auto-generate and email monthly reports', category: 'Reports', steps: 3, icon: TrendingUp },
  { name: 'HR Leave Approval', desc: 'Route leave requests to managers', category: 'HR', steps: 4, icon: CheckCircle },
  { name: 'Customer Follow-up', desc: 'Email sequence after deal closed', category: 'Sales', steps: 6, icon: Bot },
];

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  draft: 'bg-white/5 text-white/50 border-white/10',
  error: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function Workflow() {
  const [tab, setTab] = useState('automations');
  return (
    <AppLayout breadcrumbs={[{ label: 'Intelligence' }, { label: 'Workflow Automation' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Workflow Automation</h1><p className="text-white/40 text-sm mt-0.5">7 workflows · 384 runs today · 98.4% success rate</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New Workflow</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Workflows', value: '5', sub: '2 paused / draft', icon: Zap, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Runs Today', value: '384', sub: '1,240 this week', icon: Activity, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Success Rate', value: '98.4%', sub: '+0.8% this week', icon: CheckCircle, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Hours Saved', value: '42h', sub: 'Estimated this month', icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
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
              {['automations', 'templates', 'logs'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="automations" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Workflow', 'Trigger', 'Actions', 'Runs', 'Success', 'Last Run', 'Status', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center flex-shrink-0"><Zap className="w-3.5 h-3.5 text-[#2563EB]" /></div>
                          <div><p className="text-sm font-medium text-white">{wf.name}</p><p className="text-xs text-white/30">{wf.id} · {wf.category}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50 max-w-[160px] truncate">{wf.trigger}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{wf.actions}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{wf.runs.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${wf.success >= 95 ? 'text-emerald-400' : wf.success > 0 ? 'text-amber-400' : 'text-white/30'}`}>{wf.success > 0 ? `${wf.success}%` : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/40">{wf.lastRun}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[wf.status]} px-2 py-0`}>{wf.status}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors">{wf.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Settings className="w-3.5 h-3.5" /></button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.name} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-[#2563EB]/30 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center">
                      <tpl.icon className="w-5 h-5 text-[#2563EB]" />
                    </div>
                    <Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{tpl.category}</Badge>
                  </div>
                  <h4 className="font-semibold text-white mb-1">{tpl.name}</h4>
                  <p className="text-xs text-white/40 mb-3">{tpl.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">{tpl.steps} steps</span>
                    <Button size="sm" className="bg-[#2563EB]/20 hover:bg-[#2563EB]/40 text-[#2563EB] border border-[#2563EB]/20 text-xs h-7">
                      Use Template <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Execution Logs</p>
              <p className="text-white/30 text-sm mt-1">384 runs today · All logs available for 90 days</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
