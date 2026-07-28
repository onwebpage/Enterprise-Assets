import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, MapPin, Globe, Plus, Download, Edit, MoreHorizontal, Settings, TrendingUp, DollarSign, Award, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const companies = [
  { id: 'ORG-001', name: 'Apex Global Inc.', type: 'Parent', country: 'USA', employees: 342, revenue: '$7.2M', status: 'active', currency: 'USD', gstin: 'N/A', fiscal: 'Jan–Dec' },
  { id: 'ORG-002', name: 'Apex India Pvt. Ltd.', type: 'Subsidiary', country: 'India', employees: 128, revenue: '$1.4M', status: 'active', currency: 'INR', gstin: '27AABCA1234B1Z5', fiscal: 'Apr–Mar' },
  { id: 'ORG-003', name: 'Apex Europe GmbH', type: 'Subsidiary', country: 'Germany', employees: 64, revenue: '$2.1M', status: 'active', currency: 'EUR', gstin: 'N/A', fiscal: 'Jan–Dec' },
];

const departments = [
  { name: 'Engineering', head: 'Anna Park', count: 84, budget: '$9.8M', costCenter: 'CC-ENG' },
  { name: 'Sales & Marketing', head: 'Sarah Kim', count: 93, budget: '$7.6M', costCenter: 'CC-SALES' },
  { name: 'Finance & Accounts', head: 'Linda Chen', count: 28, budget: '$2.8M', costCenter: 'CC-FIN' },
  { name: 'Operations', head: 'Mike Roberts', count: 94, budget: '$6.4M', costCenter: 'CC-OPS' },
  { name: 'HR & Admin', head: 'James Doyle', count: 24, budget: '$1.9M', costCenter: 'CC-HR' },
  { name: 'Customer Success', head: 'Tom Brown', count: 19, budget: '$1.6M', costCenter: 'CC-CS' },
];

const locations = [
  { name: 'Chicago HQ', address: '123 Enterprise Blvd, Chicago, IL 60601', type: 'Headquarters', employees: 218, phone: '+1 (312) 555-0100' },
  { name: 'New York Office', address: '456 Commerce St, New York, NY 10001', type: 'Branch', employees: 84, phone: '+1 (212) 555-0200' },
  { name: 'Austin R&D Center', address: '789 Innovation Dr, Austin, TX 78701', type: 'R&D', employees: 40, phone: '+1 (512) 555-0300' },
  { name: 'Mumbai Office', address: 'Business Bay, Andheri East, Mumbai 400069', type: 'Branch', employees: 128, phone: '+91 22 5555-0400' },
  { name: 'Berlin Office', address: 'Unter den Linden 10, Berlin 10117', type: 'Branch', employees: 64, phone: '+49 30 5555-0500' },
];

export default function Organization() {
  const [tab, setTab] = useState('companies');
  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Organization' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Organization Management</h1><p className="text-white/40 text-sm mt-0.5">3 companies · 534 employees · 5 locations</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Company</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Companies', value: '3', sub: '1 parent · 2 subsidiaries', icon: Building2, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Total Employees', value: '534', sub: 'Across all entities', icon: Users, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Countries', value: '3', sub: 'USA · India · Germany', icon: Globe, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Locations', value: '5', sub: '2 HQs · 3 branches', icon: MapPin, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p><p className="text-xs text-white/40 mt-0.5">{k.label}</p><p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {['companies', 'departments', 'locations'].map(t => (
              <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="companies" className="mt-4 space-y-3">
            {companies.map((c) => (
              <div key={c.id} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-lg font-bold text-white">
                      {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg">{c.name}</h3>
                        <Badge className={`text-xs border px-2 py-0 ${c.type === 'Parent' ? 'bg-purple-500/15 text-purple-400 border-purple-500/20' : 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20'}`}>{c.type}</Badge>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs px-2 py-0">{c.status}</Badge>
                      </div>
                      <p className="text-sm text-white/40 mt-0.5 flex items-center gap-2"><MapPin className="w-3 h-3" />{c.country} · {c.currency} · FY {c.fiscal}</p>
                      {c.gstin !== 'N/A' && <p className="text-xs text-white/30 mt-0.5">GSTIN: {c.gstin}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mr-4">
                    <div className="text-center"><p className="text-xl font-bold text-white">{c.employees}</p><p className="text-xs text-white/40">Employees</p></div>
                    <div className="text-center"><p className="text-xl font-bold text-white">{c.revenue}</p><p className="text-xs text-white/40">Revenue</p></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Department', 'Head', 'Headcount', 'Budget', 'Cost Center', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-white">{d.name[0]}</div><span className="text-sm font-medium text-white">{d.name}</span></div></td>
                      <td className="px-4 py-3 text-sm text-white/60">{d.head}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{d.count}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{d.budget}</td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs font-mono">{d.costCenter}</Badge></td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="locations" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.name} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin className="w-4 h-4 text-[#2563EB]" /></div>
                    <div>
                      <div className="flex items-center gap-2"><p className="font-semibold text-white">{loc.name}</p><Badge className="bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20 text-xs px-2 py-0">{loc.type}</Badge></div>
                      <p className="text-xs text-white/40 mt-0.5">{loc.address}</p>
                    </div>
                  </div>
                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-xs text-white/40"><Users className="w-3.5 h-3.5" />{loc.employees} employees</div>
                  <div className="text-xs text-white/40">{loc.phone}</div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
