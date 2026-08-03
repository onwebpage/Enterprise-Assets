import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, DollarSign, TrendingUp, Zap, Shield, Server,
  Plus, Search, MoreHorizontal, CheckCircle, AlertCircle, Clock,
  XCircle, ChevronDown, ArrowUpRight, Edit2, Ban, RefreshCw,
  BarChart3, Package, Globe, CreditCard, Trash2, X, PieChart,
  Activity, Star, Download
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const api = (path: string) => `${BASE}/api${path}`;

// ── API hooks ──────────────────────────────────────────────────────────────

function useMetrics() {
  return useQuery({
    queryKey: ['saas-metrics'],
    queryFn: async () => {
      const r = await fetch(api('/saas/metrics'), { credentials: 'include' });
      const j = await r.json();
      return j.data as {
        totalTenants: number; activeTenants: number; trialTenants: number;
        suspendedTenants: number; mrr: number; arr: number; totalUsers: number;
        planBreakdown: { plan: string; slug: string; count: number; mrr: number }[];
      };
    },
  });
}

function useTenants() {
  return useQuery({
    queryKey: ['saas-tenants'],
    queryFn: async () => {
      const r = await fetch(api('/saas/tenants'), { credentials: 'include' });
      const j = await r.json();
      return j.data as TenantRow[];
    },
  });
}

function usePlans() {
  return useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => {
      const r = await fetch(api('/saas/plans'), { credentials: 'include' });
      const j = await r.json();
      return j.data as Plan[];
    },
  });
}

function useSubscriptions() {
  return useQuery({
    queryKey: ['saas-subscriptions'],
    queryFn: async () => {
      const r = await fetch(api('/saas/subscriptions'), { credentials: 'include' });
      const j = await r.json();
      return j.data as SubRow[];
    },
  });
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Plan {
  id: number; name: string; slug: string;
  priceMonthly: string; priceYearly: string;
  maxUsers: number; maxModules: number; maxStorageGb: number; maxApiCallsMonthly: number;
  features: string[]; isActive: boolean; sortOrder: number;
}
interface TenantRow {
  id: number; name: string; legalName: string | null; industry: string | null;
  country: string | null; status: string; currency: string; employeeCount: number;
  createdAt: string;
  subId: number | null; subStatus: string | null; billingCycle: string | null;
  startedAt: string | null; expiresAt: string | null; trialEndsAt: string | null;
  currentUsers: number | null; currentStorageGb: string | null; currentApiCalls: number | null;
  mrr: string | null;
  planId: number | null; planName: string | null; planSlug: string | null;
  maxUsers: number | null; maxStorageGb: number | null;
}
interface SubRow {
  id: number; orgId: number; orgName: string; planId: number; planName: string;
  status: string; billingCycle: string; startedAt: string; expiresAt: string | null;
  trialEndsAt: string | null; currentUsers: number; currentStorageGb: string;
  currentApiCalls: number; mrr: string; notes: string | null; createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/20',
  cancelled: 'bg-white/10 text-white/40 border-white/10',
};
const STATUS_ICON: Record<string, typeof CheckCircle> = {
  active: CheckCircle, trial: Clock, suspended: AlertCircle, cancelled: XCircle,
};
const PLAN_COLORS: Record<string, string> = {
  starter: 'text-white/60', professional: 'text-[#2563EB]', enterprise: 'text-[#06B6D4]', custom: 'text-purple-400',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: metrics, isLoading } = useMetrics();
  const { data: tenants } = useTenants();

  const kpis = [
    { label: 'Total Tenants', value: metrics?.totalTenants ?? 0, sub: `${metrics?.activeTenants ?? 0} active`, icon: Building2, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
    { label: 'Monthly Revenue', value: fmt(metrics?.mrr ?? 0), sub: `ARR ${fmt(metrics?.arr ?? 0)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Active Users', value: fmtNum(metrics?.totalUsers ?? 0), sub: 'Across all tenants', icon: Users, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
    { label: 'Trial Tenants', value: metrics?.trialTenants ?? 0, sub: `${metrics?.suspendedTenants ?? 0} suspended`, icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
  ];

  const recentTenants = tenants?.slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4.5 h-4.5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{isLoading ? '—' : k.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Plan Breakdown */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-white/40" />Plan Distribution</h3>
          <div className="space-y-3">
            {(metrics?.planBreakdown ?? []).map((p) => {
              const total = metrics?.activeTenants || 1;
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={p.slug}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${PLAN_COLORS[p.slug] ?? 'text-white/60'}`}>{p.plan}</span>
                    <span className="text-xs text-white/40">{p.count} tenants · {fmt(Number(p.mrr))}/mo</span>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-white/[0.07]" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-white/40" />Revenue by Plan</h3>
          <div className="space-y-2.5">
            {(metrics?.planBreakdown ?? []).map((p) => {
              const totalMrr = metrics?.mrr || 1;
              const pct = Math.round((Number(p.mrr) / totalMrr) * 100);
              return (
                <div key={p.slug} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-white/60">{p.plan}</span>
                      <span className="text-xs font-semibold text-white">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1 bg-white/[0.07]" />
                  </div>
                  <span className="text-sm font-bold text-white w-20 text-right">{fmt(Number(p.mrr))}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-xs text-white/40">Total MRR</span>
              <span className="text-base font-bold text-emerald-400">{fmt(metrics?.mrr ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Recent Tenants */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-white/40" />Recent Tenants</h3>
          <div className="space-y-2">
            {recentTenants.map((t) => {
              const SI = STATUS_ICON[t.subStatus ?? 'active'] ?? CheckCircle;
              return (
                <div key={t.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/30 to-[#06B6D4]/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {(t.name ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-white/30">{t.planName ?? 'No plan'} · {timeAgo(t.createdAt)}</p>
                  </div>
                  <SI className={`w-3.5 h-3.5 flex-shrink-0 ${t.subStatus === 'active' ? 'text-emerald-400' : t.subStatus === 'trial' ? 'text-amber-400' : 'text-red-400'}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tenants Tab ────────────────────────────────────────────────────────────
function TenantsTab({ onAdd }: { onAdd: () => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: tenants = [], isLoading } = useTenants();
  const { data: plans = [] } = usePlans();
  const [selected, setSelected] = useState<TenantRow | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const filtered = tenants.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.industry?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.subStatus === statusFilter || (!t.subStatus && statusFilter === 'active');
    return matchSearch && matchStatus;
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(api(`/saas/tenants/${id}/status`), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-tenants'] }); qc.invalidateQueries({ queryKey: ['saas-metrics'] }); toast({ title: 'Tenant status updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants..."
            className="pl-9 bg-[#0a0f1e] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" />
        </div>
        {(['all', 'active', 'trial', 'suspended', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07]'}`}>
            {s}
          </button>
        ))}
        <Button onClick={onAdd} size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] ml-auto">
          <Plus className="w-3.5 h-3.5 mr-1.5" />New Tenant
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {['Tenant', 'Plan', 'Status', 'Users', 'MRR', 'Started', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3 first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">Loading tenants…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">No tenants found</td></tr>
            ) : filtered.map((t, i) => {
              const SI = STATUS_ICON[t.subStatus ?? 'active'] ?? CheckCircle;
              const statusKey = t.subStatus ?? 'active';
              const userPct = t.maxUsers && t.maxUsers > 0 && t.currentUsers
                ? Math.min(Math.round((t.currentUsers / t.maxUsers) * 100), 100) : 0;
              return (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelected(t)}>
                  <td className="px-4 pl-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/30 to-[#06B6D4]/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.name}</p>
                        <p className="text-[10px] text-white/30">{t.industry ?? t.country ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${PLAN_COLORS[t.planSlug ?? ''] ?? 'text-white/40'}`}>
                      {t.planName ?? <span className="text-white/30">—</span>}
                    </span>
                    {t.billingCycle && <p className="text-[10px] text-white/25">{t.billingCycle}</p>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Badge className={`${STATUS_STYLES[statusKey]} text-[10px] capitalize`}>
                      <SI className="w-2.5 h-2.5 mr-1" />{statusKey}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm text-white/70">{t.currentUsers ?? 0}</span>
                      {t.maxUsers && t.maxUsers > 0 && <span className="text-[10px] text-white/30"> / {t.maxUsers}</span>}
                      {userPct > 0 && <Progress value={userPct} className="h-0.5 bg-white/[0.06] mt-1 w-16" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-white">{t.mrr ? fmt(Number(t.mrr)) : '—'}</span>
                    <span className="text-[10px] text-white/30 block">/mo</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{t.startedAt ? timeAgo(t.startedAt) : timeAgo(t.createdAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-44">
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => setSelected(t)}>
                          <ArrowUpRight className="w-3.5 h-3.5 mr-2" />View Details
                        </DropdownMenuItem>
                        {statusKey !== 'suspended' && (
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-amber-400"
                            onClick={() => changeStatus.mutate({ id: t.id, status: 'suspended' })}>
                            <Ban className="w-3.5 h-3.5 mr-2" />Suspend
                          </DropdownMenuItem>
                        )}
                        {statusKey === 'suspended' && (
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-emerald-400"
                            onClick={() => changeStatus.mutate({ id: t.id, status: 'active' })}>
                            <RefreshCw className="w-3.5 h-3.5 mr-2" />Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-white/[0.07]" />
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-red-400"
                          onClick={() => changeStatus.mutate({ id: t.id, status: 'cancelled' })}>
                          <XCircle className="w-3.5 h-3.5 mr-2" />Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-[#07091a] border-l border-white/[0.07] z-50 overflow-y-auto">
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white">Tenant Details</h3>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 flex items-center justify-center text-base font-bold text-white">
                    {selected.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-base">{selected.name}</p>
                    <p className="text-xs text-white/40">{selected.legalName ?? selected.industry ?? '—'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Plan', value: selected.planName ?? '—' },
                    { label: 'Status', value: selected.subStatus ?? selected.status },
                    { label: 'Billing', value: selected.billingCycle ?? '—' },
                    { label: 'MRR', value: selected.mrr ? fmt(Number(selected.mrr)) : '—' },
                    { label: 'Current Users', value: selected.currentUsers ?? 0 },
                    { label: 'Storage Used', value: selected.currentStorageGb ? `${Number(selected.currentStorageGb).toFixed(1)} GB` : '—' },
                    { label: 'API Calls', value: selected.currentApiCalls ? fmtNum(selected.currentApiCalls) : '—' },
                    { label: 'Industry', value: selected.industry ?? '—' },
                    { label: 'Country', value: selected.country ?? '—' },
                    { label: 'Currency', value: selected.currency ?? '—' },
                    { label: 'Joined', value: timeAgo(selected.createdAt) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                      <span className="text-xs text-white/40">{row.label}</span>
                      <span className="text-sm text-white font-medium capitalize">{String(row.value)}</span>
                    </div>
                  ))}
                </div>
                {selected.maxUsers && selected.maxUsers > 0 && (
                  <div className="mt-4 p-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/40">User Capacity</span>
                      <span className="text-xs text-white/60">{selected.currentUsers ?? 0} / {selected.maxUsers}</span>
                    </div>
                    <Progress value={Math.min(Math.round(((selected.currentUsers ?? 0) / selected.maxUsers) * 100), 100)} className="h-1.5 bg-white/[0.07]" />
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  {(selected.subStatus ?? selected.status) !== 'suspended' ? (
                    <Button size="sm" variant="outline" className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => { changeStatus.mutate({ id: selected.id, status: 'suspended' }); setSelected(null); }}>
                      <Ban className="w-3.5 h-3.5 mr-1.5" />Suspend
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => { changeStatus.mutate({ id: selected.id, status: 'active' }); setSelected(null); }}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Reactivate
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => { changeStatus.mutate({ id: selected.id, status: 'cancelled' }); setSelected(null); }}>
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Plans Tab ──────────────────────────────────────────────────────────────
function PlansTab() {
  const { data: plans = [], isLoading } = usePlans();
  const { data: metrics } = useMetrics();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', priceMonthly: '', priceYearly: '', maxUsers: '', maxModules: '', maxStorageGb: '', maxApiCallsMonthly: '', features: '' });

  const upsert = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const body = {
        ...form,
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
        priceMonthly: parseFloat(form.priceMonthly) || 0,
        priceYearly: parseFloat(form.priceYearly) || 0,
        maxUsers: parseInt(form.maxUsers) || -1,
        maxModules: parseInt(form.maxModules) || -1,
        maxStorageGb: parseInt(form.maxStorageGb) || -1,
        maxApiCallsMonthly: parseInt(form.maxApiCallsMonthly) || -1,
      };
      const url = isEdit && editPlan ? api(`/saas/plans/${editPlan.id}`) : api('/saas/plans');
      const r = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-plans'] }); qc.invalidateQueries({ queryKey: ['saas-metrics'] });
      setEditPlan(null); setShowNew(false);
      toast({ title: 'Plan saved successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to save plan', variant: 'destructive' }),
  });

  const openEdit = (p: Plan) => {
    setForm({
      name: p.name, slug: p.slug,
      priceMonthly: String(p.priceMonthly), priceYearly: String(p.priceYearly),
      maxUsers: String(p.maxUsers), maxModules: String(p.maxModules),
      maxStorageGb: String(p.maxStorageGb), maxApiCallsMonthly: String(p.maxApiCallsMonthly),
      features: (p.features ?? []).join('\n'),
    });
    setEditPlan(p);
  };

  const planBreakdown = Object.fromEntries((metrics?.planBreakdown ?? []).map(p => [p.slug, p.count]));

  const PlanForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#07091a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white text-lg">{isEdit ? 'Edit Plan' : 'New Plan'}</h3>
          <button onClick={() => { setEditPlan(null); setShowNew(false); }} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[{ f: 'name', l: 'Plan Name' }, { f: 'slug', l: 'Slug (unique)' }].map(({ f, l }) => (
              <div key={f}>
                <label className="text-xs text-white/40 mb-1 block">{l}</label>
                <Input value={(form as any)[f]} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))}
                  className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ f: 'priceMonthly', l: 'Monthly Price ($)' }, { f: 'priceYearly', l: 'Yearly Price ($)' }].map(({ f, l }) => (
              <div key={f}>
                <label className="text-xs text-white/40 mb-1 block">{l}</label>
                <Input value={(form as any)[f]} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))}
                  type="number" className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ f: 'maxUsers', l: 'Max Users (-1=∞)' }, { f: 'maxModules', l: 'Max Modules (-1=∞)' }].map(({ f, l }) => (
              <div key={f}>
                <label className="text-xs text-white/40 mb-1 block">{l}</label>
                <Input value={(form as any)[f]} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))}
                  type="number" className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ f: 'maxStorageGb', l: 'Storage GB (-1=∞)' }, { f: 'maxApiCallsMonthly', l: 'API Calls/mo (-1=∞)' }].map(({ f, l }) => (
              <div key={f}>
                <label className="text-xs text-white/40 mb-1 block">{l}</label>
                <Input value={(form as any)[f]} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))}
                  type="number" className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Features (one per line)</label>
            <textarea value={form.features} onChange={e => setForm(x => ({ ...x, features: e.target.value }))} rows={4}
              className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 resize-none outline-none focus:border-[#2563EB]/50" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 border-white/[0.08] text-white/60" onClick={() => { setEditPlan(null); setShowNew(false); }}>Cancel</Button>
          <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => upsert.mutate(isEdit)} disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{plans.filter(p => p.isActive).length} active plans</p>
        <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => { setForm({ name: '', slug: '', priceMonthly: '', priceYearly: '', maxUsers: '', maxModules: '', maxStorageGb: '', maxApiCallsMonthly: '', features: '' }); setShowNew(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />New Plan
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? null : plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`bg-[#0a0f1e] border rounded-xl p-5 relative ${plan.isActive ? 'border-white/[0.07]' : 'border-white/[0.03] opacity-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold text-lg ${PLAN_COLORS[plan.slug] ?? 'text-white'}`}>{plan.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-36">
                  <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => openEdit(plan)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-2xl font-bold text-white">${Number(plan.priceMonthly).toLocaleString()}<span className="text-xs font-normal text-white/40">/mo</span></p>
            <p className="text-xs text-white/30 mt-0.5">${Number(plan.priceYearly).toLocaleString()}/yr</p>
            <div className="mt-3 space-y-1.5 mb-4">
              {[
                { label: 'Users', val: plan.maxUsers === -1 ? 'Unlimited' : String(plan.maxUsers) },
                { label: 'Modules', val: plan.maxModules === -1 ? 'All' : String(plan.maxModules) },
                { label: 'Storage', val: plan.maxStorageGb === -1 ? 'Unlimited' : `${plan.maxStorageGb} GB` },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{r.label}</span>
                  <span className="text-white/70 font-medium">{r.val}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.05] pt-3 space-y-1">
              {(plan.features ?? []).slice(0, 4).map(f => (
                <div key={f} className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span className="text-[10px] text-white/50">{f}</span></div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-[10px] text-white/30">{planBreakdown[plan.slug] ?? 0} tenants</span>
              <Badge className={`${plan.isActive ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-white/10 text-white/30 border-white/10'} text-[9px]`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
      {(editPlan || showNew) && <PlanForm isEdit={!!editPlan} />}
    </div>
  );
}

// ── Subscriptions Tab ──────────────────────────────────────────────────────
function SubscriptionsTab() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const [search, setSearch] = useState('');
  const filtered = subs.filter(s => !search || s.orgName?.toLowerCase().includes(search.toLowerCase()) || s.planName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subscriptions..."
            className="pl-9 bg-[#0a0f1e] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" />
        </div>
        <p className="text-xs text-white/30 ml-auto">{filtered.length} subscriptions</p>
      </div>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {['Tenant', 'Plan', 'Status', 'Billing', 'Users', 'Storage', 'API Calls', 'MRR', 'Since'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3 first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-12 text-white/30 text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-white/30 text-sm">No subscriptions found</td></tr>
            ) : filtered.map((s, i) => {
              const SI = STATUS_ICON[s.status] ?? CheckCircle;
              return (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 pl-5 py-3 text-sm font-medium text-white">{s.orgName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium capitalize ${PLAN_COLORS[s.planName?.toLowerCase() ?? ''] ?? 'text-white/60'}`}>{s.planName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${STATUS_STYLES[s.status]} text-[10px] capitalize`}>
                      <SI className="w-2.5 h-2.5 mr-1" />{s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50 capitalize">{s.billingCycle}</td>
                  <td className="px-4 py-3 text-sm text-white/70">{s.currentUsers}</td>
                  <td className="px-4 py-3 text-sm text-white/70">{Number(s.currentStorageGb).toFixed(0)} GB</td>
                  <td className="px-4 py-3 text-sm text-white/70">{fmtNum(s.currentApiCalls)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{fmt(Number(s.mrr))}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{timeAgo(s.startedAt)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onboarding Tab ─────────────────────────────────────────────────────────
function OnboardingTab() {
  const { data: plans = [] } = usePlans();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '', legalName: '', industry: '', country: '', currency: 'USD',
    planId: '', billingCycle: 'monthly', trialDays: '', notes: '',
  });
  const [step, setStep] = useState(1);

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch(api('/saas/tenants'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-tenants'] }); qc.invalidateQueries({ queryKey: ['saas-metrics'] });
      toast({ title: 'Tenant onboarded successfully! 🎉' });
      setForm({ name: '', legalName: '', industry: '', country: '', currency: 'USD', planId: '', billingCycle: 'monthly', trialDays: '', notes: '' });
      setStep(1);
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create tenant', variant: 'destructive' }),
  });

  const activePlans = plans.filter(p => p.isActive);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[{ n: 1, l: 'Company Info' }, { n: 2, l: 'Plan Selection' }, { n: 3, l: 'Review & Launch' }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${step >= s.n ? 'bg-[#2563EB] text-white' : 'bg-white/[0.07] text-white/30'}`}>{s.n}</div>
            <span className={`text-xs font-medium ${step >= s.n ? 'text-white/70' : 'text-white/25'}`}>{s.l}</span>
            {i < 2 && <div className={`flex-1 h-px ${step > s.n ? 'bg-[#2563EB]/50' : 'bg-white/[0.07]'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white text-base mb-4">Company Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { f: 'name', l: 'Company Name *', ph: 'Acme Corp' },
              { f: 'legalName', l: 'Legal Name', ph: 'Acme Corporation Ltd.' },
              { f: 'industry', l: 'Industry', ph: 'Technology' },
              { f: 'country', l: 'Country', ph: 'United States' },
            ].map(({ f, l, ph }) => (
              <div key={f}>
                <label className="text-xs text-white/40 mb-1.5 block">{l}</label>
                <Input value={(form as any)[f]} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))}
                  placeholder={ph} className="bg-[#050816] border-white/[0.08] text-white placeholder:text-white/20 h-9 text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Currency</label>
              <select value={form.currency} onChange={e => setForm(x => ({ ...x, currency: e.target.value }))}
                className="w-full bg-[#050816] border border-white/[0.08] text-white text-sm rounded-md px-3 h-9 outline-none focus:border-[#2563EB]/50">
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setStep(2)} disabled={!form.name}>
              Next: Plan Selection →
            </Button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activePlans.map(plan => (
              <div key={plan.id} onClick={() => setForm(x => ({ ...x, planId: String(plan.id) }))}
                className={`bg-[#0a0f1e] border rounded-xl p-5 cursor-pointer transition-all ${form.planId === String(plan.id) ? 'border-[#2563EB]/50 ring-1 ring-[#2563EB]/30' : 'border-white/[0.07] hover:border-white/[0.15]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold ${PLAN_COLORS[plan.slug] ?? 'text-white'}`}>{plan.name}</h4>
                  {form.planId === String(plan.id) && <CheckCircle className="w-4 h-4 text-[#2563EB]" />}
                </div>
                <p className="text-xl font-bold text-white">${Number(plan.priceMonthly).toLocaleString()}<span className="text-xs font-normal text-white/40">/mo</span></p>
                <div className="mt-3 space-y-1">
                  {(plan.features ?? []).slice(0, 3).map(f => (
                    <div key={f} className="flex items-center gap-1.5"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" /><span className="text-[10px] text-white/50">{f}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 space-y-3">
            <h4 className="text-sm font-semibold text-white">Billing Options</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Billing Cycle</label>
                <select value={form.billingCycle} onChange={e => setForm(x => ({ ...x, billingCycle: e.target.value }))}
                  className="w-full bg-[#050816] border border-white/[0.08] text-white text-sm rounded-md px-3 h-9 outline-none focus:border-[#2563EB]/50">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly (save ~20%)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Trial Days (0 = none)</label>
                <Input value={form.trialDays} onChange={e => setForm(x => ({ ...x, trialDays: e.target.value }))}
                  type="number" placeholder="0" className="bg-[#050816] border-white/[0.08] text-white h-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Notes (optional)</label>
              <Input value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                placeholder="Any notes about this tenant..." className="bg-[#050816] border-white/[0.08] text-white placeholder:text-white/20 h-9 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-between">
            <Button variant="outline" className="border-white/[0.08] text-white/60" onClick={() => setStep(1)}>← Back</Button>
            <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setStep(3)} disabled={!form.planId}>Next: Review →</Button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6">
          <h3 className="font-semibold text-white text-base mb-5">Review & Launch</h3>
          {(() => {
            const plan = activePlans.find(p => String(p.id) === form.planId);
            return (
              <div className="space-y-3 mb-6">
                {[
                  { l: 'Company Name', v: form.name },
                  { l: 'Legal Name', v: form.legalName || '—' },
                  { l: 'Industry', v: form.industry || '—' },
                  { l: 'Country', v: form.country || '—' },
                  { l: 'Currency', v: form.currency },
                  { l: 'Plan', v: plan?.name ?? '—' },
                  { l: 'Billing', v: form.billingCycle },
                  { l: 'MRR', v: form.billingCycle === 'yearly' ? fmt(Number(plan?.priceYearly ?? 0) / 12) : fmt(Number(plan?.priceMonthly ?? 0)) },
                  { l: 'Trial', v: form.trialDays ? `${form.trialDays} days` : 'None' },
                ].map(r => (
                  <div key={r.l} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-xs text-white/40">{r.l}</span>
                    <span className="text-sm font-medium text-white capitalize">{r.v}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-white/[0.08] text-white/60" onClick={() => setStep(2)}>← Back</Button>
            <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? 'Launching…' : '🚀 Launch Tenant'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SaasPlatform() {
  const [tab, setTab] = useState('overview');
  const [showOnboard, setShowOnboard] = useState(false);

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'SaaS Platform' }]}>
      <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">SaaS Platform</h1>
            <p className="text-white/40 text-sm mt-0.5">Multi-tenant management · Plans · Subscriptions · Onboarding</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => { setTab('onboarding'); setShowOnboard(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Onboard Tenant
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {[
              { v: 'overview', l: 'Overview', icon: BarChart3 },
              { v: 'tenants', l: 'Tenants', icon: Building2 },
              { v: 'plans', l: 'Plans', icon: Star },
              { v: 'subscriptions', l: 'Subscriptions', icon: CreditCard },
              { v: 'onboarding', l: 'Onboarding', icon: Zap },
            ].map(({ v, l, icon: Icon }) => (
              <TabsTrigger key={v} value={v} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />{l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-5"><OverviewTab /></TabsContent>
          <TabsContent value="tenants" className="mt-5"><TenantsTab onAdd={() => { setTab('onboarding'); }} /></TabsContent>
          <TabsContent value="plans" className="mt-5"><PlansTab /></TabsContent>
          <TabsContent value="subscriptions" className="mt-5"><SubscriptionsTab /></TabsContent>
          <TabsContent value="onboarding" className="mt-5"><OnboardingTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
