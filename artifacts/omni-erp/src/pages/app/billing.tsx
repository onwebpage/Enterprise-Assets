import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, TrendingUp, Users, CheckCircle, Download, MoreHorizontal, Zap, Shield, BarChart3, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const plans = [
  {
    name: 'Starter', price: 299, per: 'month', users: 10, modules: 5, storage: '10 GB',
    features: ['5 Core Modules', 'Basic Reports', 'Email Support', 'API Access'],
    current: false, color: 'border-white/[0.07]', badge: ''
  },
  {
    name: 'Professional', price: 799, per: 'month', users: 50, modules: 15, storage: '100 GB',
    features: ['15 Modules', 'Advanced Reports', 'Priority Support', 'Workflow Automation', 'AI Insights (Basic)'],
    current: false, color: 'border-[#2563EB]/30', badge: 'Popular'
  },
  {
    name: 'Enterprise', price: 2499, per: 'month', users: 'Unlimited', modules: 'All', storage: '1 TB',
    features: ['All Modules', 'Executive Reports', '24/7 Dedicated Support', 'Unlimited Workflows', 'Full AI Suite', 'White Label', 'SLA 99.99%'],
    current: true, color: 'border-[#06B6D4]/30', badge: 'Current Plan'
  },
];

const invoices = [
  { id: 'INV-B-024', period: 'Jul 2026', amount: 2499, status: 'paid', date: 'Jul 1, 2026' },
  { id: 'INV-B-023', period: 'Jun 2026', amount: 2499, status: 'paid', date: 'Jun 1, 2026' },
  { id: 'INV-B-022', period: 'May 2026', amount: 2499, status: 'paid', date: 'May 1, 2026' },
  { id: 'INV-B-021', period: 'Apr 2026', amount: 2499, status: 'paid', date: 'Apr 1, 2026' },
  { id: 'INV-B-020', period: 'Mar 2026', amount: 2499, status: 'paid', date: 'Mar 1, 2026' },
];

const addOns = [
  { name: 'Additional Users (50)', price: 400, active: true },
  { name: 'Extra Storage (500 GB)', price: 150, active: true },
  { name: 'Advanced Security Pack', price: 299, active: false },
  { name: 'Custom Domain & Branding', price: 199, active: true },
];

export default function Billing() {
  const [tab, setTab] = useState('overview');
  const totalMRR = 2499 + 400 + 150 + 199;

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Subscription & Billing' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Subscription & Billing</h1><p className="text-white/40 text-sm mt-0.5">Enterprise Plan · Billed monthly · Next renewal Aug 1, 2026</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Download Invoice</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">Manage Plan</Button>
          </div>
        </div>

        {/* Current Plan Banner */}
        <div className="bg-gradient-to-r from-[#2563EB]/15 to-[#06B6D4]/10 border border-[#2563EB]/20 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2"><h3 className="text-xl font-bold text-white">Enterprise Plan</h3><Badge className="bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/30 text-xs">Active</Badge></div>
              <p className="text-white/50 text-sm mt-0.5">All modules · Unlimited users · 1 TB storage · Full AI Suite</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">${totalMRR.toLocaleString()}<span className="text-base font-normal text-white/40">/mo</span></p>
            <p className="text-xs text-white/40 mt-1">Next billing: Aug 1, 2026</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Users', value: '342', limit: '∞', icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5', pct: 68 },
            { label: 'Storage Used', value: '284 GB', limit: '1 TB', icon: BarChart3, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', pct: 28 },
            { label: 'API Calls', value: '1.2M', limit: '5M/mo', icon: Zap, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5', pct: 24 },
            { label: 'Uptime (30d)', value: '99.98%', limit: 'SLA 99.99%', icon: Shield, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', pct: 100 },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label} <span className="text-white/20">/ {k.limit}</span></p>
              <Progress value={k.pct} className="h-1 bg-white/[0.07] mt-2" />
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {['overview', 'plans', 'add-ons', 'invoices', 'payment'].map(t => (
              <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t.replace('-', ' ')}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Plan Features</h3>
              <div className="space-y-2.5">
                {['All 20+ ERP Modules', 'Unlimited Users', '1 TB Cloud Storage', '24/7 Dedicated Support', 'Full AI Assistant Suite', 'Unlimited Workflow Automation', 'Custom Branding & White Label', 'SLA 99.99% Uptime', 'Advanced Security & Audit Logs', 'Dedicated Account Manager'].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-white/70">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Active Add-ons</h3>
              <div className="space-y-2">
                {addOns.filter(a => a.active).map((a) => (
                  <div key={a.name} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-sm text-white/70">{a.name}</span></div>
                    <span className="text-sm font-semibold text-white">+${a.price}/mo</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-1">
                  <span className="text-sm font-semibold text-white">Total Monthly</span>
                  <span className="text-lg font-bold text-white">${totalMRR.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plans" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.name} className={`bg-[#0a0f1e] border rounded-xl p-5 relative ${plan.color} ${plan.current ? 'ring-1 ring-[#06B6D4]/30' : ''}`}>
                  {plan.badge && <Badge className={`absolute top-3 right-3 text-xs ${plan.current ? 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/30' : 'bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]/30'}`}>{plan.badge}</Badge>}
                  <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                  <p className="text-3xl font-bold text-white mt-2">${plan.price}<span className="text-sm font-normal text-white/40">/mo</span></p>
                  <p className="text-xs text-white/40 mt-1">{typeof plan.users === 'number' ? `Up to ${plan.users}` : plan.users} users · {plan.modules} modules · {plan.storage}</p>
                  <div className="space-y-1.5 mt-4 mb-4">
                    {plan.features.map((f) => (<div key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /><span className="text-xs text-white/60">{f}</span></div>))}
                  </div>
                  <Button size="sm" className={`w-full text-sm ${plan.current ? 'bg-white/[0.07] text-white/50 cursor-default' : 'bg-[#2563EB] hover:bg-[#1d4ed8]'}`} disabled={plan.current}>
                    {plan.current ? 'Current Plan' : plan.price > 2499 ? 'Contact Sales' : 'Downgrade'}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Invoice', 'Period', 'Amount', 'Date', 'Status', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{inv.id}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{inv.period}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${inv.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{inv.date}</td>
                      <td className="px-4 py-3"><Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">{inv.status}</Badge></td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Download className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {['add-ons', 'payment'].map(t => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
                <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 font-medium capitalize">{t.replace('-', ' ')} Management</p>
                <p className="text-white/30 text-sm mt-1">{t === 'add-ons' ? '3 active add-ons · Manage your extras' : 'Visa ****4821 · Next charge Aug 1, 2026'}</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
