import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, FileText, DollarSign, MessageSquare, Plus, Download, Search, Filter, MoreHorizontal, Eye, Star, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const customers = [
  { id: 'CUS-841', name: 'Stratford Industries', contact: 'Robert Shaw', email: 'r.shaw@stratford.com', balance: 48200, orders: 28, status: 'active', tier: 'Enterprise', lastLogin: '2h ago', initials: 'SI' },
  { id: 'CUS-840', name: 'Apex Global Ltd.', contact: 'Jennifer Wu', email: 'j.wu@apexglobal.io', balance: 0, orders: 42, status: 'active', tier: 'Enterprise', lastLogin: '1d ago', initials: 'AG' },
  { id: 'CUS-839', name: 'BlueSky Technologies', contact: 'David Park', email: 'd.park@bluesky.tech', balance: 31500, orders: 14, status: 'active', tier: 'Professional', lastLogin: '3d ago', initials: 'BT' },
  { id: 'CUS-838', name: 'Meridian Corp', contact: 'Lisa Chen', email: 'l.chen@meridian.com', balance: 92750, orders: 9, status: 'overdue', tier: 'Professional', lastLogin: '2w ago', initials: 'MC' },
  { id: 'CUS-837', name: 'Nexus Logistics', contact: 'Chris Morgan', email: 'c.morgan@nexus.io', balance: 0, orders: 5, status: 'new', tier: 'Starter', lastLogin: '4h ago', initials: 'NL' },
];

const tickets = [
  { id: 'TKT-2841', customer: 'Stratford Industries', subject: 'Invoice discrepancy on INV-4820', priority: 'high', status: 'open', created: 'Jul 27', assignee: 'Support' },
  { id: 'TKT-2840', customer: 'BlueSky Tech', subject: 'Portal access issue', priority: 'medium', status: 'in_progress', created: 'Jul 26', assignee: 'Tech' },
  { id: 'TKT-2839', customer: 'Apex Global', subject: 'Custom report request', priority: 'low', status: 'resolved', created: 'Jul 24', assignee: 'Support' },
  { id: 'TKT-2838', customer: 'Meridian Corp', subject: 'Payment plan request', priority: 'high', status: 'open', created: 'Jul 23', assignee: 'Finance' },
];

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/20',
  new: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  open: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

const tierStyle: Record<string, string> = {
  Enterprise: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Professional: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  Starter: 'bg-white/5 text-white/50 border-white/10',
};

export default function CustomerPortal() {
  const [tab, setTab] = useState('customers');
  return (
    <AppLayout breadcrumbs={[{ label: 'Portals' }, { label: 'Customer Portal' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Customer Portal</h1><p className="text-white/40 text-sm mt-0.5">248 customers · 12 open tickets · 94.2% satisfaction</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Eye className="w-3.5 h-3.5 mr-1.5" />Preview Portal</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />Invite Customer</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Customers', value: '248', sub: '+12 this month', icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Outstanding AR', value: '$172K', sub: '4 overdue accounts', icon: DollarSign, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
            { label: 'Open Tickets', value: '12', sub: '3 high priority', icon: MessageSquare, color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5' },
            { label: 'Satisfaction', value: '94.2%', sub: 'NPS score: 72', icon: Star, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
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
              {['customers', 'tickets', 'settings'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search customers..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="customers" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Customer', 'Contact', 'Balance Due', 'Orders', 'Tier', 'Status', 'Last Login', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{c.initials}</div>
                          <div><p className="text-sm font-medium text-white">{c.name}</p><p className="text-xs text-white/30">{c.id}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-sm text-white/80">{c.contact}</p><p className="text-xs text-white/40">{c.email}</p></td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{c.balance > 0 ? `$${c.balance.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{c.orders}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${tierStyle[c.tier]} px-2 py-0`}>{c.tier}</Badge></td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[c.status]} px-2 py-0`}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/40">{c.lastLogin}</td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 5 of 248 customers</p>
                <div className="flex items-center gap-1">{[1, 2, 3, '...', 50].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Ticket', 'Customer', 'Subject', 'Priority', 'Status', 'Created', 'Assigned To', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{t.id}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{t.customer}</td>
                      <td className="px-4 py-3 text-sm text-white/70 max-w-[200px] truncate">{t.subject}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border px-2 py-0 ${t.priority === 'high' ? 'bg-red-500/15 text-red-400 border-red-500/20' : t.priority === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-white/5 text-white/50 border-white/10'}`}>{t.priority}</Badge></td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[t.status]} px-2 py-0`}>{t.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/40">{t.created}</td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{t.assignee}</Badge></td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-white">Portal Configuration</h3>
              {[
                { label: 'Allow invoice downloads', desc: 'Customers can download PDF invoices', enabled: true },
                { label: 'Enable online payments', desc: 'Customers can pay invoices directly', enabled: true },
                { label: 'Show order history', desc: 'Display full order history to customers', enabled: true },
                { label: 'Allow ticket creation', desc: 'Customers can create support tickets', enabled: true },
                { label: 'Show account statement', desc: 'Display running account balance', enabled: false },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
                  <div><p className="text-sm font-medium text-white">{s.label}</p><p className="text-xs text-white/40 mt-0.5">{s.desc}</p></div>
                  <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${s.enabled ? 'bg-[#2563EB]' : 'bg-white/[0.1]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${s.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
