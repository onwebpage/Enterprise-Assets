import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, MapPin, Globe, Plus, Download, Edit, MoreHorizontal, Settings, TrendingUp, DollarSign, Award, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, type ApiListResponse } from '@/lib/api';
import { CardSkeleton } from '@/components/app/LoadingSkeleton';

interface OrgRow {
  id: number; name: string; legalName: string | null; type: string | null;
  country: string | null; employeeCount: number | null; status: string;
  currency: string | null; gstin: string | null; fiscalYearStart: string | null;
}
interface BranchRow {
  id: number; orgId: number; name: string; address: string | null; city: string | null;
  state: string | null; country: string | null; phone: string | null;
  type: string; isHeadquarters: boolean; employeeCount: number | null;
}
interface DeptRow {
  id: number; orgId: number; name: string; headName: string | null;
  budget: string | null; costCenter: string | null; employeeCount: number | null;
}

export default function Organization() {
  const [tab, setTab] = useState('companies');

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<ApiListResponse<OrgRow>>('/organizations'),
    select: r => r.data,
  });

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<ApiListResponse<BranchRow>>('/organizations/branches'),
    select: r => r.data,
  });

  const { data: deptsData, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<ApiListResponse<DeptRow>>('/organizations/departments'),
    select: r => r.data,
  });

  const orgs = orgsData ?? [];
  const branches = branchesData ?? [];
  const depts = deptsData ?? [];

  const totalEmps = orgs.reduce((s, o) => s + (o.employeeCount ?? 0), 0);
  const countries = [...new Set(orgs.map(o => o.country).filter(Boolean))];

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Organization' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Organization Management</h1>
            <p className="text-white/40 text-sm mt-0.5">{orgs.length} companies · {totalEmps} employees · {branches.length} locations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add Company
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Companies',        value: String(orgs.length),    sub: `${orgs.filter(o => o.type === 'Parent').length} parent · ${orgs.filter(o => o.type === 'Subsidiary').length} subsidiaries`, icon: Building2, color: 'text-[#2563EB]',   bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Total Employees',  value: String(totalEmps),      sub: 'Across all entities',    icon: Users,    color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Countries',        value: String(countries.length), sub: countries.slice(0, 3).join(' · '), icon: Globe, color: 'text-[#06B6D4]',   bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Locations',        value: String(branches.length), sub: `${branches.filter(b => b.isHeadquarters).length} HQ · ${branches.filter(b => !b.isHeadquarters).length} branches`, icon: MapPin, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`w-4.5 h-4.5 ${k.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.sub}</p>
              <p className="text-xs text-white/60 font-medium mt-1">{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            <TabsTrigger value="companies" className="text-xs data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">Companies</TabsTrigger>
            <TabsTrigger value="departments" className="text-xs data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">Departments</TabsTrigger>
            <TabsTrigger value="locations" className="text-xs data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">Locations</TabsTrigger>
          </TabsList>

          {/* Companies tab */}
          <TabsContent value="companies" className="mt-4 space-y-3">
            {orgsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orgs.map((org) => (
                  <motion.div key={org.id} whileHover={{ y: -2 }}
                    className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.12] transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#2563EB]/5 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{org.name}</p>
                          <p className="text-xs text-white/40">{org.legalName ?? org.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[11px] border ${org.type === 'Parent' ? 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20' : 'bg-white/5 text-white/50 border-white/10'}`}>
                          {org.type ?? 'Subsidiary'}
                        </Badge>
                        <button className="p-1 rounded hover:bg-white/[0.07] text-white/30"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Country',    value: org.country ?? '—' },
                        { label: 'Employees',  value: String(org.employeeCount ?? 0) },
                        { label: 'Currency',   value: org.currency ?? 'USD' },
                      ].map(s => (
                        <div key={s.label} className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                          <p className="text-sm font-semibold text-white">{s.value}</p>
                          <p className="text-[11px] text-white/35 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <div className="flex items-center gap-3 text-[11px] text-white/30">
                        <span>GSTIN: {org.gstin ?? 'N/A'}</span>
                        <span>Fiscal: {org.fiscalYearStart ? `${org.fiscalYearStart}–${String(parseInt(org.fiscalYearStart || '1') + 11)}` : 'Jan–Dec'}</span>
                      </div>
                      <button className="text-[11px] text-[#2563EB] hover:text-[#2563EB]/80 flex items-center gap-0.5">
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Departments tab */}
          <TabsContent value="departments" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    {['Department', 'Head', 'Employees', 'Budget', 'Cost Centre'].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-white/[0.04] rounded animate-pulse" /></td></tr>
                    ))
                  ) : depts.map((d) => (
                    <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm font-medium text-white">{d.name}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{d.headName ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{d.employeeCount ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{d.budget ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-white/40 font-mono text-xs">{d.costCenter ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Locations tab */}
          <TabsContent value="locations" className="mt-4 space-y-3">
            {branchesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {branches.map((b) => (
                  <div key={b.id} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.12] transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-[#06B6D4]/5 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-[#06B6D4]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{b.name}</p>
                          <p className="text-xs text-white/40">{b.city ? `${b.city}, ${b.country}` : b.country ?? '—'}</p>
                        </div>
                      </div>
                      <Badge className={`text-[11px] border ${b.isHeadquarters ? 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20' : 'bg-white/5 text-white/50 border-white/10'}`}>
                        {b.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/30 mb-2">{b.address ?? '—'}</p>
                    <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/[0.05]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.employeeCount ?? 0} employees</span>
                      <span>{b.phone ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
