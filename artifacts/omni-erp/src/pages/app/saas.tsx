import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, DollarSign, TrendingUp, Zap, Shield, Server,
  Plus, Search, MoreHorizontal, CheckCircle, AlertCircle, Clock,
  XCircle, ChevronDown, ArrowUpRight, Edit2, Ban, RefreshCw,
  BarChart3, Package, Globe, CreditCard, Trash2, X, PieChart,
  Activity, Star, Download, Palette, Eye, EyeOff, Link2, Mail,
  Monitor, Brush, Type, Code2, ToggleLeft, ToggleRight, ExternalLink,
  Check, Loader2, Save, Bell, LayoutDashboard, HardDrive,
  ArrowLeft, Calendar, Cpu, Database, Layers, Info, Settings2
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

function useWhitelabels() {
  return useQuery({
    queryKey: ['saas-whitelabel'],
    queryFn: async () => {
      const r = await fetch(api('/saas/whitelabel'), { credentials: 'include' });
      const j = await r.json();
      return j.data as WhitelabelRow[];
    },
  });
}

function useTrials() {
  return useQuery({
    queryKey: ['saas-trials'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const r = await fetch(api('/saas/trials'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await r.json();
      return j.data as TrialRow[];
    },
    refetchInterval: 30000,
  });
}

function useTrialStats() {
  return useQuery({
    queryKey: ['saas-trial-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const r = await fetch(api('/saas/trials/stats'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await r.json();
      return j.data as TrialStats;
    },
  });
}

function useTrialConfig() {
  return useQuery({
    queryKey: ['saas-trial-config'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const r = await fetch(api('/saas/trial-config'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await r.json();
      return j.data as TrialConfig | null;
    },
  });
}

function useTrialEvents(subId: number | null) {
  return useQuery({
    queryKey: ['saas-trial-events', subId],
    queryFn: async () => {
      if (!subId) return [];
      const token = localStorage.getItem('auth_token');
      const r = await fetch(api(`/saas/trials/${subId}/events`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await r.json();
      return j.data as TrialEvent[];
    },
    enabled: !!subId,
  });
}

function useTenantDashboard(id: number | null) {
  return useQuery({
    queryKey: ['saas-tenant-dashboard', id],
    queryFn: async () => {
      const r = await fetch(api(`/saas/tenants/${id}/dashboard`), { credentials: 'include' });
      const j = await r.json();
      return j.data as TenantDashboardData;
    },
    enabled: !!id,
    refetchInterval: 30000,
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
interface WhitelabelRow {
  id: number; orgId: number; orgName: string | null;
  isEnabled: boolean; productName: string;
  logoUrl: string | null; faviconUrl: string | null;
  primaryColor: string; accentColor: string;
  customDomain: string | null; domainStatus: string;
  supportEmail: string | null; supportUrl: string | null;
  loginHeadline: string | null; loginSubline: string | null;
  loginBackgroundColor: string | null;
  footerText: string | null; hidePoweredBy: boolean;
  customCss: string | null; emailSenderName: string | null;
  emailReplyTo: string | null; navTheme: string; fontFamily: string | null;
  notes: string | null; createdAt: string; updatedAt: string;
}
interface TrialRow {
  subId: number; orgId: number; orgName: string; industry: string | null;
  country: string | null; planId: number; planName: string; planSlug: string;
  priceMonthly: string; billingCycle: string;
  startedAt: string; trialEndsAt: string | null; status: string;
  currentUsers: number | null; notes: string | null; createdAt: string;
  eventCount: number; extensionCount: number; lastEvent: string | null;
  daysRemaining: number | null;
}
interface TrialEvent {
  id: number; subscriptionId: number; eventType: string;
  daysAdded: number | null; note: string | null;
  createdBy: string | null; createdAt: string;
}
interface TrialStats {
  activeTrials: number; expiringIn7Days: number;
  conversionRate: number; avgTrialDays: number; totalConverted: number;
}
interface TrialConfig {
  id: number; defaultTrialDays: number; maxExtensions: number;
  autoExpireAction: string; reminderDaysBefore: number[];
  requireCreditCard: boolean; updatedAt: string;
}
interface TenantDashboardData {
  id: number; name: string; legalName: string | null;
  industry: string | null; country: string | null;
  status: string; currency: string; employeeCount: number;
  taxId: string | null; gstin: string | null;
  createdAt: string; updatedAt: string;
  subId: number | null; subStatus: string | null;
  billingCycle: string | null; startedAt: string | null;
  expiresAt: string | null; trialEndsAt: string | null;
  cancelledAt: string | null; notes: string | null;
  currentUsers: number | null; currentStorageGb: string | null;
  currentApiCalls: number | null; mrr: string | null;
  planId: number | null; planName: string | null; planSlug: string | null;
  maxUsers: number | null; maxStorageGb: number | null;
  maxModules: number | null; maxApiCallsMonthly: number | null;
  priceMonthly: string | null; priceYearly: string | null;
  features: string[];
  recentEvents: TrialEvent[];
  whitelabel: WhitelabelRow | null;
  daysToRenewal: number | null; daysInTrial: number | null;
  usersPct: number; storagePct: number; apiPct: number;
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
function TenantsTab({ onAdd, onViewDashboard }: { onAdd: () => void; onViewDashboard?: (id: number) => void }) {
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
                      <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-48">
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => setSelected(t)}>
                          <ArrowUpRight className="w-3.5 h-3.5 mr-2" />View Details
                        </DropdownMenuItem>
                        {onViewDashboard && (
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => onViewDashboard(t.id)}>
                            <LayoutDashboard className="w-3.5 h-3.5 mr-2" />View Dashboard
                          </DropdownMenuItem>
                        )}
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

// ── White Label Tab ────────────────────────────────────────────────────────
const DOMAIN_STATUS: Record<string, { label: string; cls: string }> = {
  unverified: { label: 'Unverified', cls: 'bg-white/10 text-white/40 border-white/10' },
  verifying:  { label: 'Verifying…', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  verified:   { label: 'Verified',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  failed:     { label: 'Failed',     cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

const EMPTY_FORM = {
  productName: '', logoUrl: '', faviconUrl: '',
  primaryColor: '#2563EB', accentColor: '#06B6D4',
  customDomain: '', supportEmail: '', supportUrl: '',
  loginHeadline: '', loginSubline: '', loginBackgroundColor: '#050816',
  footerText: '', hidePoweredBy: false, customCss: '',
  emailSenderName: '', emailReplyTo: '',
  navTheme: 'dark', fontFamily: 'Inter', notes: '',
};

type WLForm = typeof EMPTY_FORM;

function WhiteLabelPreview({ form, orgName }: { form: WLForm; orgName: string }) {
  const pc = form.primaryColor || '#2563EB';
  const ac = form.accentColor || '#06B6D4';
  const bg = form.loginBackgroundColor || '#050816';
  const name = form.productName || orgName || 'OmniERP';

  return (
    <div className="space-y-4 sticky top-0">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Live Preview</p>

      {/* Sidebar preview */}
      <div className="bg-[#07091a] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="p-2 border-b border-white/[0.07] bg-[#050816]/50">
          <p className="text-[10px] text-white/30 text-center">Sidebar</p>
        </div>
        <div className="flex" style={{ height: 180 }}>
          <div className="w-14 flex flex-col items-center py-3 gap-2 border-r border-white/[0.05]"
            style={{ background: form.navTheme === 'light' ? '#f8fafc' : '#07091a' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: `linear-gradient(135deg, ${pc}, ${ac})` }}>
              {name.slice(0, 1)}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-6 h-1.5 rounded-full ${i === 0 ? '' : 'opacity-30'}`}
                style={{ background: i === 0 ? pc : (form.navTheme === 'light' ? '#94a3b8' : '#ffffff40') }} />
            ))}
          </div>
          <div className="flex-1 p-3" style={{ background: form.navTheme === 'light' ? '#f1f5f9' : '#050816' }}>
            <p className="text-[9px] font-bold mb-2" style={{ color: form.navTheme === 'light' ? '#0f172a' : '#ffffff' }}>
              {name}
            </p>
            {['Dashboard', 'Finance', 'HR', 'Reports'].map((item, i) => (
              <div key={item} className="flex items-center gap-1.5 px-2 py-1 rounded mb-0.5"
                style={{
                  background: i === 0 ? `${pc}25` : 'transparent',
                  borderLeft: i === 0 ? `2px solid ${pc}` : '2px solid transparent',
                }}>
                <div className="w-2 h-2 rounded-sm opacity-60"
                  style={{ background: i === 0 ? pc : (form.navTheme === 'light' ? '#64748b' : '#ffffff50') }} />
                <span className="text-[8px]" style={{ color: i === 0 ? pc : (form.navTheme === 'light' ? '#64748b' : '#ffffff60') }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login page preview */}
      <div className="bg-[#07091a] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="p-2 border-b border-white/[0.07] bg-[#050816]/50">
          <p className="text-[10px] text-white/30 text-center">Login Page</p>
        </div>
        <div className="p-5 rounded-b-xl" style={{ background: bg }}>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white"
              style={{ background: `linear-gradient(135deg, ${pc}, ${ac})` }}>
              {name.slice(0, 1)}
            </div>
            <span className="text-[10px] font-bold" style={{ color: form.navTheme === 'light' ? '#0f172a' : '#ffffff' }}>
              {name}
            </span>
          </div>
          <p className="text-[11px] font-bold text-white mb-0.5">{form.loginHeadline || 'Sign in to ' + name}</p>
          <p className="text-[9px] text-white/40 mb-3">{form.loginSubline || 'Your enterprise platform, unified.'}</p>
          <div className="space-y-1.5">
            <div className="h-6 bg-white/[0.06] border border-white/[0.08] rounded text-[8px] px-2 flex items-center text-white/30">Email address</div>
            <div className="h-6 bg-white/[0.06] border border-white/[0.08] rounded text-[8px] px-2 flex items-center text-white/30">Password</div>
            <div className="h-6 rounded flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${pc}, ${ac})` }}>
              Sign In →
            </div>
          </div>
          {!form.hidePoweredBy && (
            <p className="text-[8px] text-white/20 text-center mt-2">Powered by OmniERP</p>
          )}
        </div>
      </div>

      {/* Color palette */}
      <div className="bg-[#07091a] border border-white/[0.07] rounded-xl p-4">
        <p className="text-[10px] text-white/30 mb-3">Brand Colors</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="h-10 rounded-lg mb-1.5" style={{ background: pc }} />
            <p className="text-[10px] text-white/50 text-center font-mono">{pc}</p>
            <p className="text-[9px] text-white/30 text-center">Primary</p>
          </div>
          <div className="flex-1">
            <div className="h-10 rounded-lg mb-1.5" style={{ background: ac }} />
            <p className="text-[10px] text-white/50 text-center font-mono">{ac}</p>
            <p className="text-[9px] text-white/30 text-center">Accent</p>
          </div>
          <div className="flex-1">
            <div className="h-10 rounded-lg mb-1.5 border border-white/[0.07]" style={{ background: bg }} />
            <p className="text-[10px] text-white/50 text-center font-mono">{bg}</p>
            <p className="text-[9px] text-white/30 text-center">Login BG</p>
          </div>
        </div>
      </div>

      {/* Domain status */}
      {form.customDomain && (
        <div className="bg-[#07091a] border border-white/[0.07] rounded-xl p-4">
          <p className="text-[10px] text-white/30 mb-2">Custom Domain</p>
          <div className="flex items-center gap-2">
            <Link2 className="w-3 h-3 text-white/40" />
            <span className="text-xs font-mono text-white/70">{form.customDomain}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WhiteLabelTab() {
  const { data: configs = [], isLoading: listLoading } = useWhitelabels();
  const { data: tenants = [] } = useTenants();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [form, setForm] = useState<WLForm>({ ...EMPTY_FORM });
  const [activeSection, setActiveSection] = useState('identity');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newOrgId, setNewOrgId] = useState('');

  // Current config for selected tenant
  const currentConfig = configs.find(c => c.orgId === selectedOrgId) ?? null;

  // When selection changes, sync form
  useEffect(() => {
    if (currentConfig) {
      setForm({
        productName: currentConfig.productName ?? '',
        logoUrl: currentConfig.logoUrl ?? '',
        faviconUrl: currentConfig.faviconUrl ?? '',
        primaryColor: currentConfig.primaryColor ?? '#2563EB',
        accentColor: currentConfig.accentColor ?? '#06B6D4',
        customDomain: currentConfig.customDomain ?? '',
        supportEmail: currentConfig.supportEmail ?? '',
        supportUrl: currentConfig.supportUrl ?? '',
        loginHeadline: currentConfig.loginHeadline ?? '',
        loginSubline: currentConfig.loginSubline ?? '',
        loginBackgroundColor: currentConfig.loginBackgroundColor ?? '#050816',
        footerText: currentConfig.footerText ?? '',
        hidePoweredBy: currentConfig.hidePoweredBy ?? false,
        customCss: currentConfig.customCss ?? '',
        emailSenderName: currentConfig.emailSenderName ?? '',
        emailReplyTo: currentConfig.emailReplyTo ?? '',
        navTheme: currentConfig.navTheme ?? 'dark',
        fontFamily: currentConfig.fontFamily ?? 'Inter',
        notes: currentConfig.notes ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [selectedOrgId, configs.length]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) throw new Error('No tenant selected');
      const isNew = !currentConfig;
      const url = isNew ? api('/saas/whitelabel') : api(`/saas/whitelabel/${selectedOrgId}`);
      const body = isNew ? { ...form, orgId: selectedOrgId } : form;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('Save failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-whitelabel'] });
      toast({ title: 'White label config saved ✓' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to save config', variant: 'destructive' }),
  });

  const toggleEnabled = useMutation({
    mutationFn: async (orgId: number) => {
      const r = await fetch(api(`/saas/whitelabel/${orgId}/toggle`), {
        method: 'PATCH', credentials: 'include',
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-whitelabel'] });
      toast({ title: 'White label toggled' });
    },
  });

  const verifyDomain = useMutation({
    mutationFn: async (orgId: number) => {
      const r = await fetch(api(`/saas/whitelabel/${orgId}/domain-verify`), {
        method: 'PATCH', credentials: 'include',
      });
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['saas-whitelabel'] });
      toast({ title: `Domain status: ${data.data?.domainStatus ?? 'updated'}` });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (orgId: number) => {
      const r = await fetch(api(`/saas/whitelabel/${orgId}`), {
        method: 'DELETE', credentials: 'include',
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-whitelabel'] });
      setSelectedOrgId(null);
      toast({ title: 'White label config removed' });
    },
  });

  const selectedTenant = tenants.find(t => t.id === selectedOrgId);
  const tenantsWithoutConfig = tenants.filter(t => !configs.find(c => c.orgId === t.id));

  const sections = [
    { id: 'identity', label: 'Brand Identity', icon: Brush },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'domain', label: 'Custom Domain', icon: Globe },
    { id: 'login', label: 'Login Page', icon: Monitor },
    { id: 'email', label: 'Email Branding', icon: Mail },
    { id: 'ui', label: 'UI Options', icon: Type },
    { id: 'css', label: 'Custom CSS', icon: Code2 },
  ];

  const F = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div>
      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/25 mt-1">{hint}</p>}
    </div>
  );

  const TextIn = ({ field, placeholder, type = 'text' }: { field: keyof WLForm; placeholder?: string; type?: string }) => (
    <Input
      type={type}
      value={form[field] as string}
      onChange={e => setForm(x => ({ ...x, [field]: e.target.value }))}
      placeholder={placeholder}
      className="bg-[#050816] border-white/[0.08] text-white placeholder:text-white/20 h-9 text-sm focus:border-[#2563EB]/50"
    />
  );

  const ColorIn = ({ field, label }: { field: keyof WLForm; label: string }) => (
    <F label={label}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={form[field] as string}
            onChange={e => setForm(x => ({ ...x, [field]: e.target.value }))}
            className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>
        <Input
          value={form[field] as string}
          onChange={e => setForm(x => ({ ...x, [field]: e.target.value }))}
          className="flex-1 bg-[#050816] border-white/[0.08] text-white h-9 text-sm font-mono focus:border-[#2563EB]/50"
          maxLength={7}
        />
        <div className="w-9 h-9 rounded-lg border border-white/[0.1] flex-shrink-0"
          style={{ background: form[field] as string }} />
      </div>
    </F>
  );

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-white/50">{configs.length} tenants configured</p>
          {configs.filter(c => c.isEnabled).length > 0 && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
              {configs.filter(c => c.isEnabled).length} active
            </Badge>
          )}
        </div>
        <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          onClick={() => setShowNewForm(true)} disabled={tenantsWithoutConfig.length === 0}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add White Label
        </Button>
      </div>

      {/* New config form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-[#0a0f1e] border border-[#2563EB]/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <p className="text-sm text-white font-medium">Select tenant to configure:</p>
            <select value={newOrgId} onChange={e => setNewOrgId(e.target.value)}
              className="flex-1 min-w-[200px] bg-[#050816] border border-white/[0.08] text-white text-sm rounded-md px-3 h-9 outline-none focus:border-[#2563EB]/50">
              <option value="">— Choose tenant —</option>
              {tenantsWithoutConfig.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"
              disabled={!newOrgId}
              onClick={() => { setSelectedOrgId(parseInt(newOrgId)); setShowNewForm(false); setNewOrgId(''); }}>
              Configure
            </Button>
            <button onClick={() => setShowNewForm(false)} className="p-1.5 text-white/30 hover:text-white/70">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configured tenants list */}
      {!selectedOrgId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {listLoading ? (
            <div className="col-span-3 text-center py-12 text-white/30 text-sm">Loading…</div>
          ) : configs.length === 0 ? (
            <div className="col-span-3 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-10 text-center">
              <Palette className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 font-medium">No white label configs yet</p>
              <p className="text-white/25 text-sm mt-1">Click "Add White Label" to configure branding for a tenant</p>
            </div>
          ) : configs.map((cfg, i) => {
            const ds = DOMAIN_STATUS[cfg.domainStatus] ?? DOMAIN_STATUS.unverified;
            return (
              <motion.div key={cfg.orgId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.12] transition-colors cursor-pointer group"
                onClick={() => setSelectedOrgId(cfg.orgId)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${cfg.primaryColor}, ${cfg.accentColor})` }}>
                      {(cfg.productName ?? cfg.orgName ?? '?').slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm leading-tight">{cfg.productName}</p>
                      <p className="text-[10px] text-white/40">{cfg.orgName}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <button className="p-1 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-40">
                      <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer"
                        onClick={e => { e.stopPropagation(); setSelectedOrgId(cfg.orgId); }}>
                        <Edit2 className="w-3.5 h-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer"
                        onClick={e => { e.stopPropagation(); toggleEnabled.mutate(cfg.orgId); }}>
                        {cfg.isEnabled
                          ? <><EyeOff className="w-3.5 h-3.5 mr-2" />Disable</>
                          : <><Eye className="w-3.5 h-3.5 mr-2" />Enable</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.07]" />
                      <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-red-400"
                        onClick={e => { e.stopPropagation(); deleteConfig.mutate(cfg.orgId); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Color strip */}
                <div className="flex gap-1 mb-3">
                  {[cfg.primaryColor, cfg.accentColor, cfg.loginBackgroundColor ?? '#050816'].map((c, ci) => (
                    <div key={ci} className="h-1.5 flex-1 rounded-full" style={{ background: c ?? '#333' }} />
                  ))}
                </div>

                <div className="space-y-1.5">
                  {cfg.customDomain && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <Link2 className="w-3 h-3" />
                        <span className="font-mono truncate max-w-[130px]">{cfg.customDomain}</span>
                      </div>
                      <Badge className={`${ds.cls} text-[9px]`}>{ds.label}</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">
                      {cfg.hidePoweredBy ? 'Branding hidden' : 'Powered by OmniERP'}
                    </span>
                    <Badge className={`${cfg.isEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-white/10 text-white/30 border-white/10'} text-[9px]`}>
                      {cfg.isEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <AnimatePresence>
        {selectedOrgId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Editor header */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedOrgId(null)}
                  className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 rotate-90" />Back
                </button>
                <div className="w-px h-4 bg-white/[0.07]" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})` }}>
                    {(form.productName || selectedTenant?.name || '?').slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{form.productName || selectedTenant?.name}</p>
                    <p className="text-[10px] text-white/40">{selectedTenant?.name}</p>
                  </div>
                </div>
                {currentConfig && (
                  <Badge className={`${currentConfig.isEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-white/10 text-white/30 border-white/10'} text-[10px] ml-2`}>
                    {currentConfig.isEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentConfig && (
                  <>
                    <Button size="sm" variant="outline"
                      className={`border-white/[0.08] text-white/60 hover:text-white ${currentConfig.isEnabled ? 'hover:border-red-500/30 hover:text-red-400' : 'hover:border-emerald-500/30 hover:text-emerald-400'}`}
                      onClick={() => toggleEnabled.mutate(selectedOrgId)}>
                      {currentConfig.isEnabled
                        ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" />Disable</>
                        : <><Eye className="w-3.5 h-3.5 mr-1.5" />Enable</>}
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      onClick={() => deleteConfig.mutate(selectedOrgId)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />Remove
                    </Button>
                  </>
                )}
                <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                  onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
                  {saveConfig.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                    : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Config</>}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
              {/* Left: form */}
              <div className="space-y-0">
                {/* Section nav */}
                <div className="flex items-center gap-1 mb-5 flex-wrap">
                  {sections.map(s => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSection === s.id ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07]'}`}>
                      <s.icon className="w-3 h-3" />{s.label}
                    </button>
                  ))}
                </div>

                <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                  {/* Identity */}
                  {activeSection === 'identity' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Brush className="w-4 h-4 text-white/40" />Brand Identity</h4>
                      <F label="Product Name" hint="The name users see throughout the app">
                        <TextIn field="productName" placeholder="Acme ERP" />
                      </F>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Logo URL" hint="Hosted image URL (PNG/SVG, transparent bg)">
                          <TextIn field="logoUrl" placeholder="https://cdn.acme.com/logo.png" />
                        </F>
                        <F label="Favicon URL" hint="32×32 ICO or PNG">
                          <TextIn field="faviconUrl" placeholder="https://cdn.acme.com/favicon.ico" />
                        </F>
                      </div>
                      {form.logoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg">
                          <img src={form.logoUrl} alt="Logo preview" className="h-8 object-contain max-w-[120px]"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <p className="text-xs text-white/40">Logo preview</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Colors */}
                  {activeSection === 'colors' && (
                    <div className="space-y-5">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-white/40" />Brand Colors</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <ColorIn field="primaryColor" label="Primary Color" />
                        <ColorIn field="accentColor" label="Accent Color" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <ColorIn field="loginBackgroundColor" label="Login Background" />
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-3">Color Presets</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'Ocean Blue', p: '#2563EB', a: '#06B6D4' },
                            { name: 'Violet',     p: '#7C3AED', a: '#A78BFA' },
                            { name: 'Emerald',    p: '#059669', a: '#34D399' },
                            { name: 'Rose',       p: '#E11D48', a: '#FB7185' },
                            { name: 'Amber',      p: '#D97706', a: '#FCD34D' },
                            { name: 'Slate',      p: '#475569', a: '#94A3B8' },
                            { name: 'Fuchsia',    p: '#A21CAF', a: '#E879F9' },
                            { name: 'Teal',       p: '#0F766E', a: '#2DD4BF' },
                          ].map(preset => (
                            <button key={preset.name} onClick={() => setForm(x => ({ ...x, primaryColor: preset.p, accentColor: preset.a }))}
                              className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-lg transition-colors">
                              <div className="w-3.5 h-3.5 rounded-full" style={{ background: `linear-gradient(135deg, ${preset.p}, ${preset.a})` }} />
                              <span className="text-[10px] text-white/60">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Domain */}
                  {activeSection === 'domain' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-white/40" />Custom Domain</h4>
                      <F label="Custom Domain" hint="Point your DNS CNAME to erp.omnierp.io">
                        <div className="flex items-center gap-2">
                          <TextIn field="customDomain" placeholder="erp.yourcompany.com" />
                          {currentConfig?.customDomain && (
                            <Button size="sm" variant="outline"
                              className="border-white/[0.08] text-white/60 hover:text-white whitespace-nowrap"
                              onClick={() => verifyDomain.mutate(selectedOrgId)}
                              disabled={verifyDomain.isPending}>
                              {verifyDomain.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify DNS'}
                            </Button>
                          )}
                        </div>
                      </F>
                      {currentConfig?.customDomain && (
                        <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.05] space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-white">Domain Status</p>
                            <Badge className={`${DOMAIN_STATUS[currentConfig.domainStatus]?.cls} text-[10px]`}>
                              {DOMAIN_STATUS[currentConfig.domainStatus]?.label}
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-white/40">DNS Configuration</p>
                            <div className="bg-[#050816] rounded p-3 font-mono text-[10px] text-white/60 space-y-1">
                              <p><span className="text-white/30">Type:</span> CNAME</p>
                              <p><span className="text-white/30">Name:</span> {currentConfig.customDomain.split('.')[0]}</p>
                              <p><span className="text-white/30">Value:</span> erp.omnierp.io</p>
                              <p><span className="text-white/30">TTL:</span> 3600</p>
                            </div>
                          </div>
                          {currentConfig.domainStatus === 'verified' && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>SSL certificate active · HTTPS enabled</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Support Email" hint="Shown on error and help pages">
                          <TextIn field="supportEmail" placeholder="support@yourcompany.com" type="email" />
                        </F>
                        <F label="Support URL" hint="Link to your help center">
                          <TextIn field="supportUrl" placeholder="https://help.yourcompany.com" />
                        </F>
                      </div>
                    </div>
                  )}

                  {/* Login */}
                  {activeSection === 'login' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Monitor className="w-4 h-4 text-white/40" />Login Page</h4>
                      <F label="Headline" hint="Main heading on the login screen">
                        <TextIn field="loginHeadline" placeholder="Sign in to Acme ERP" />
                      </F>
                      <F label="Sub-heading" hint="Supporting line below the headline">
                        <TextIn field="loginSubline" placeholder="Your enterprise platform, all in one place." />
                      </F>
                      <ColorIn field="loginBackgroundColor" label="Background Color" />
                    </div>
                  )}

                  {/* Email */}
                  {activeSection === 'email' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Mail className="w-4 h-4 text-white/40" />Email Branding</h4>
                      <F label="Sender Name" hint="Appears as the 'From' name in all system emails">
                        <TextIn field="emailSenderName" placeholder="Acme ERP Notifications" />
                      </F>
                      <F label="Reply-To Address" hint="Where replies go when users respond to system emails">
                        <TextIn field="emailReplyTo" placeholder="noreply@yourcompany.com" type="email" />
                      </F>
                      <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                        <p className="text-xs text-white/50 mb-2 font-medium">Email Preview</p>
                        <div className="bg-[#050816] rounded p-3 space-y-1">
                          <p className="text-[11px] text-white/70">
                            <span className="text-white/30">From: </span>
                            {form.emailSenderName || 'OmniERP'} &lt;{form.emailReplyTo || 'noreply@omnierp.io'}&gt;
                          </p>
                          <p className="text-[11px] text-white/70">
                            <span className="text-white/30">Subject: </span>Invoice INV-1042 from {form.productName || 'OmniERP'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UI Options */}
                  {activeSection === 'ui' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Type className="w-4 h-4 text-white/40" />UI Options</h4>
                      <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                        <div>
                          <p className="text-sm font-medium text-white">Hide "Powered by OmniERP"</p>
                          <p className="text-xs text-white/40 mt-0.5">Remove OmniERP attribution from login and footer</p>
                        </div>
                        <button onClick={() => setForm(x => ({ ...x, hidePoweredBy: !x.hidePoweredBy }))}
                          className={`transition-colors ${form.hidePoweredBy ? 'text-[#2563EB]' : 'text-white/30'}`}>
                          {form.hidePoweredBy
                            ? <ToggleRight className="w-8 h-8" />
                            : <ToggleLeft className="w-8 h-8" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Navigation Theme">
                          <select value={form.navTheme} onChange={e => setForm(x => ({ ...x, navTheme: e.target.value }))}
                            className="w-full bg-[#050816] border border-white/[0.08] text-white text-sm rounded-md px-3 h-9 outline-none focus:border-[#2563EB]/50">
                            <option value="dark">Dark (default)</option>
                            <option value="light">Light</option>
                          </select>
                        </F>
                        <F label="Font Family">
                          <select value={form.fontFamily ?? 'Inter'} onChange={e => setForm(x => ({ ...x, fontFamily: e.target.value }))}
                            className="w-full bg-[#050816] border border-white/[0.08] text-white text-sm rounded-md px-3 h-9 outline-none focus:border-[#2563EB]/50">
                            {['Inter', 'Plus Jakarta Sans', 'DM Sans', 'Geist', 'Manrope', 'Nunito'].map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </F>
                      </div>
                      <F label="Footer Text" hint="Shown at the bottom of the app">
                        <TextIn field="footerText" placeholder="© 2026 Acme Corp. All rights reserved." />
                      </F>
                      <F label="Internal Notes" hint="Admin notes, not shown to tenants">
                        <Input value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                          placeholder="Notes about this config..." className="bg-[#050816] border-white/[0.08] text-white h-9 text-sm" />
                      </F>
                    </div>
                  )}

                  {/* CSS */}
                  {activeSection === 'css' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Code2 className="w-4 h-4 text-white/40" />Custom CSS</h4>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">Custom CSS is injected into the tenant's app. Use with care — invalid CSS may break the UI.</p>
                      </div>
                      <F label="Custom CSS" hint="Injected into :root scope for this tenant">
                        <textarea value={form.customCss ?? ''}
                          onChange={e => setForm(x => ({ ...x, customCss: e.target.value }))}
                          rows={12} placeholder={`:root {\n  --radius: 0.75rem;\n}\n\n.sidebar {\n  backdrop-filter: blur(20px);\n}`}
                          className="w-full bg-[#050816] border border-white/[0.08] text-white text-xs font-mono rounded-md px-3 py-2.5 resize-none outline-none focus:border-[#2563EB]/50 leading-relaxed" />
                      </F>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: preview */}
              <WhiteLabelPreview
                form={form}
                orgName={selectedTenant?.name ?? ''}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Trial Management Tab ───────────────────────────────────────────────────
const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  created:        { label: 'Trial Started',    color: 'text-[#2563EB]' },
  extended:       { label: 'Trial Extended',   color: 'text-amber-400' },
  reminder_sent:  { label: 'Reminder Sent',    color: 'text-[#06B6D4]' },
  converted:      { label: 'Converted',        color: 'text-emerald-400' },
  cancelled:      { label: 'Cancelled',        color: 'text-red-400' },
  expired:        { label: 'Expired',          color: 'text-white/40' },
};

function daysColor(days: number | null) {
  if (days === null) return 'text-white/40';
  if (days <= 2) return 'text-red-400';
  if (days <= 7) return 'text-amber-400';
  return 'text-emerald-400';
}

function TrialEventLog({ subId, onClose }: { subId: number; onClose: () => void }) {
  const { data: events = [], isLoading } = useTrialEvents(subId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="bg-[#07091a] border-l border-white/[0.07] w-80 h-full overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07] sticky top-0 bg-[#07091a]">
          <h3 className="font-semibold text-white text-sm">Trial Event Log</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          {isLoading
            ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /></div>
            : events.length === 0
            ? <p className="text-white/30 text-sm text-center py-8">No events recorded.</p>
            : (
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-white/[0.07]" />
                {events.map((ev, i) => {
                  const meta = EVENT_LABELS[ev.eventType] ?? { label: ev.eventType, color: 'text-white/60' };
                  return (
                    <div key={ev.id} className="relative mb-5 last:mb-0">
                      <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-[#07091a] border border-white/20" />
                      <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                      {ev.daysAdded && <p className="text-[10px] text-white/40 mt-0.5">+{ev.daysAdded} days added</p>}
                      {ev.note && <p className="text-xs text-white/50 mt-1 leading-relaxed">{ev.note}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-white/25">{new Date(ev.createdAt).toLocaleString()}</p>
                        {ev.createdBy && <p className="text-[10px] text-white/20">· {ev.createdBy}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </motion.div>
    </div>
  );
}

function ExtendDialog({ trial, onClose, onSubmit, loading }: {
  trial: TrialRow; onClose: () => void;
  onSubmit: (days: number, note: string) => void; loading: boolean;
}) {
  const [days, setDays] = useState('7');
  const [note, setNote] = useState('');
  const newDate = trial.trialEndsAt
    ? new Date(new Date(trial.trialEndsAt).getTime() + parseInt(days || '0') * 86400000)
    : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div>
            <h3 className="font-bold text-white">Extend Trial</h3>
            <p className="text-xs text-white/40 mt-0.5">{trial.orgName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Days to Add</label>
            <div className="flex gap-2 mb-2">
              {[3, 7, 14, 30].map(d => (
                <button key={d} onClick={() => setDays(String(d))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${days === String(d) ? 'border-[#2563EB] bg-[#2563EB]/10 text-white' : 'border-white/[0.07] text-white/50 hover:border-white/20 hover:text-white'}`}>
                  +{d}d
                </button>
              ))}
            </div>
            <Input value={days} onChange={e => setDays(e.target.value)} type="number" min="1" max="90"
              className="bg-white/[0.04] border-white/[0.1] text-white focus:border-[#2563EB]" />
          </div>
          {newDate && (
            <div className="bg-white/[0.03] rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-white/40">New end date</span>
              <span className="text-sm font-semibold text-white">
                {newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Reason (optional)</label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Sales team request"
              className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-white/[0.07]">
          <Button variant="outline" className="flex-1 border-white/[0.1] text-white/60 bg-transparent hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => onSubmit(parseInt(days) || 7, note)} disabled={loading || !days || parseInt(days) < 1}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extend Trial'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ConvertDialog({ trial, plans, onClose, onSubmit, loading }: {
  trial: TrialRow; plans: Plan[]; onClose: () => void;
  onSubmit: (planId: number, cycle: string) => void; loading: boolean;
}) {
  const [planId, setPlanId] = useState(trial.planId);
  const [cycle, setCycle] = useState('monthly');
  const selectedPlan = plans.find(p => p.id === planId);
  const mrr = cycle === 'yearly'
    ? Number(selectedPlan?.priceYearly ?? 0) / 12
    : Number(selectedPlan?.priceMonthly ?? 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div>
            <h3 className="font-bold text-white">Convert to Paid</h3>
            <p className="text-xs text-white/40 mt-0.5">{trial.orgName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-2 block">Select Plan</label>
            <div className="grid grid-cols-1 gap-2">
              {plans.filter(p => p.isActive).map(p => (
                <button key={p.id} onClick={() => setPlanId(p.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${planId === p.id ? 'border-[#2563EB]/50 bg-[#2563EB]/8 ring-1 ring-[#2563EB]/20' : 'border-white/[0.07] hover:border-white/20'}`}>
                  <div>
                    <p className={`text-sm font-semibold ${PLAN_COLORS[p.slug] ?? 'text-white'}`}>{p.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{(p.features as string[]).slice(0, 2).join(' · ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">${Number(p.priceMonthly).toLocaleString()}/mo</p>
                    {planId === p.id && <CheckCircle className="w-4 h-4 text-[#2563EB] ml-auto mt-1" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-2 block">Billing Cycle</label>
            <div className="flex gap-2">
              {(['monthly', 'yearly'] as const).map(c => (
                <button key={c} onClick={() => setCycle(c)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${cycle === c ? 'border-[#2563EB] bg-[#2563EB]/10 text-white' : 'border-white/[0.07] text-white/50 hover:border-white/20 hover:text-white'}`}>
                  {c === 'monthly' ? 'Monthly' : 'Yearly'}
                  {c === 'yearly' && <span className="ml-1 text-xs text-emerald-400">Save ~20%</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 flex items-center justify-between border border-white/[0.05]">
            <div>
              <p className="text-xs text-white/40">New MRR</p>
              <p className="text-sm font-semibold text-white mt-0.5">{selectedPlan?.name} · {cycle}</p>
            </div>
            <p className="text-xl font-bold text-emerald-400">
              ${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}<span className="text-xs font-normal text-white/40">/mo</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-white/[0.07]">
          <Button variant="outline" className="flex-1 border-white/[0.1] text-white/60 bg-transparent hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onSubmit(planId, cycle)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convert to Paid'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ReminderDialog({ trial, onClose, onSubmit, loading }: {
  trial: TrialRow; onClose: () => void;
  onSubmit: (note: string) => void; loading: boolean;
}) {
  const [note, setNote] = useState(`Hi ${trial.orgName}, your trial ends in ${trial.daysRemaining ?? '?'} days. Upgrade now to keep access to all features.`);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div>
            <h3 className="font-bold text-white">Send Reminder</h3>
            <p className="text-xs text-white/40 mt-0.5">{trial.orgName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">This logs a reminder event. In production, this would send an email to the tenant admin.</p>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Reminder Message</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm rounded-xl px-3 py-2.5 resize-none outline-none focus:border-[#2563EB] placeholder:text-white/20" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-white/[0.07]">
          <Button variant="outline" className="flex-1 border-white/[0.1] text-white/60 bg-transparent hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-[#06B6D4] hover:bg-[#0891b2]" onClick={() => onSubmit(note)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reminder'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function TrialConfigPanel({ config, onSave, loading }: {
  config: TrialConfig | null | undefined;
  onSave: (data: Partial<TrialConfig>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    defaultTrialDays: String(config?.defaultTrialDays ?? 14),
    maxExtensions: String(config?.maxExtensions ?? 2),
    autoExpireAction: config?.autoExpireAction ?? 'suspend',
    reminderDaysBefore: (config?.reminderDaysBefore ?? [7, 3, 1]).join(', '),
    requireCreditCard: config?.requireCreditCard ?? false,
  });
  useEffect(() => {
    if (config) setForm({
      defaultTrialDays: String(config.defaultTrialDays),
      maxExtensions: String(config.maxExtensions),
      autoExpireAction: config.autoExpireAction,
      reminderDaysBefore: (config.reminderDaysBefore ?? [7, 3, 1]).join(', '),
      requireCreditCard: config.requireCreditCard,
    });
  }, [config]);

  const handleSave = () => {
    const days = form.reminderDaysBefore
      .split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    onSave({
      defaultTrialDays: parseInt(form.defaultTrialDays) || 14,
      maxExtensions: parseInt(form.maxExtensions) || 2,
      autoExpireAction: form.autoExpireAction as TrialConfig['autoExpireAction'],
      reminderDaysBefore: days,
      requireCreditCard: form.requireCreditCard,
    });
  };

  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <Zap className="w-4 h-4 text-white/40" />Trial Settings
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Default Trial Duration (days)</label>
          <Input value={form.defaultTrialDays} onChange={e => setForm(f => ({ ...f, defaultTrialDays: e.target.value }))}
            type="number" min="1" max="90"
            className="bg-[#050816] border-white/[0.08] text-white h-9 text-sm focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Max Extensions Allowed</label>
          <Input value={form.maxExtensions} onChange={e => setForm(f => ({ ...f, maxExtensions: e.target.value }))}
            type="number" min="0" max="10"
            className="bg-[#050816] border-white/[0.08] text-white h-9 text-sm focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">On Trial Expiry</label>
          <select value={form.autoExpireAction} onChange={e => setForm(f => ({ ...f, autoExpireAction: e.target.value }))}
            className="w-full bg-[#050816] border border-white/[0.08] text-white text-sm rounded-md px-3 h-9 outline-none focus:border-[#2563EB]/50">
            <option value="suspend">Suspend account</option>
            <option value="cancel">Cancel subscription</option>
            <option value="notify">Send notification only</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Auto-Reminder Days Before Expiry</label>
          <Input value={form.reminderDaysBefore} onChange={e => setForm(f => ({ ...f, reminderDaysBefore: e.target.value }))}
            placeholder="7, 3, 1"
            className="bg-[#050816] border-white/[0.08] text-white h-9 text-sm placeholder:text-white/20 focus:border-[#2563EB]" />
          <p className="text-[10px] text-white/25 mt-1">Comma-separated days before expiry</p>
        </div>
      </div>
      <div className="flex items-center justify-between py-3 border-t border-white/[0.05]">
        <div>
          <p className="text-sm font-medium text-white">Require Credit Card for Trial</p>
          <p className="text-xs text-white/30 mt-0.5">Collect payment info before starting a trial</p>
        </div>
        <button onClick={() => setForm(f => ({ ...f, requireCreditCard: !f.requireCreditCard }))}
          className={`w-11 h-6 rounded-full transition-all relative ${form.requireCreditCard ? 'bg-[#2563EB]' : 'bg-white/[0.12]'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.requireCreditCard ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      <div className="flex justify-end pt-2">
        <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function TrialManagementTab() {
  const { data: trials = [], isLoading } = useTrials();
  const { data: stats } = useTrialStats();
  const { data: config } = useTrialConfig();
  const { data: plans = [] } = usePlans();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [filter, setFilter] = useState<'all' | 'expiring' | 'healthy'>('all');
  const [search, setSearch] = useState('');
  const [eventLogSub, setEventLogSub] = useState<number | null>(null);
  const [extendTarget, setExtendTarget] = useState<TrialRow | null>(null);
  const [convertTarget, setConvertTarget] = useState<TrialRow | null>(null);
  const [reminderTarget, setReminderTarget] = useState<TrialRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TrialRow | null>(null);

  const filtered = trials.filter(t => {
    const matchSearch = !search || t.orgName.toLowerCase().includes(search.toLowerCase()) || t.planName.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'expiring' ? (t.daysRemaining !== null && t.daysRemaining <= 7) :
      (t.daysRemaining === null || t.daysRemaining > 7);
    return matchSearch && matchFilter;
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['saas-trials'] });
    qc.invalidateQueries({ queryKey: ['saas-trial-stats'] });
    qc.invalidateQueries({ queryKey: ['saas-metrics'] });
    qc.invalidateQueries({ queryKey: ['saas-tenants'] });
  };

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('auth_token');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const extendMut = useMutation({
    mutationFn: async ({ subId, days, note }: { subId: number; days: number; note: string }) => {
      const r = await fetch(api(`/saas/trials/${subId}/extend`), {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ days, note }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      invalidate(); setExtendTarget(null);
      toast({ title: 'Trial extended successfully' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const convertMut = useMutation({
    mutationFn: async ({ subId, planId, cycle }: { subId: number; planId: number; cycle: string }) => {
      const r = await fetch(api(`/saas/trials/${subId}/convert`), {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      invalidate(); setConvertTarget(null);
      toast({ title: 'Trial converted to paid 🎉' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const reminderMut = useMutation({
    mutationFn: async ({ subId, note }: { subId: number; note: string }) => {
      const r = await fetch(api(`/saas/trials/${subId}/reminder`), {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ note }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      if (reminderTarget) qc.invalidateQueries({ queryKey: ['saas-trial-events', reminderTarget.subId] });
      qc.invalidateQueries({ queryKey: ['saas-trials'] });
      setReminderTarget(null);
      toast({ title: 'Reminder logged' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const cancelMut = useMutation({
    mutationFn: async (subId: number) => {
      const r = await fetch(api(`/saas/trials/${subId}/cancel`), {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({}),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      invalidate(); setCancelTarget(null);
      toast({ title: 'Trial cancelled' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const configMut = useMutation({
    mutationFn: async (data: Partial<TrialConfig>) => {
      const r = await fetch(api('/saas/trial-config'), {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-trial-config'] });
      toast({ title: 'Trial settings saved' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const kpis = [
    { label: 'Active Trials', value: stats?.activeTrials ?? trials.length, icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
    { label: 'Expiring in 7 Days', value: stats?.expiringIn7Days ?? 0, icon: AlertCircle, color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5' },
    { label: 'Conversion Rate', value: `${stats?.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Avg Trial Duration', value: `${stats?.avgTrialDays ?? 14}d`, icon: BarChart3, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Conversion funnel bar */}
      {(stats?.totalConverted ?? 0) > 0 && (
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-white/40" />Conversion Funnel</p>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">{stats?.conversionRate ?? 0}% conversion</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-xs text-amber-400 font-medium border border-amber-500/20">
              {(stats?.activeTrials ?? 0) + (stats?.totalConverted ?? 0)} Trials Started
            </div>
            <ChevronDown className="w-4 h-4 text-white/20 rotate-[-90deg] shrink-0" />
            <div className="flex-1 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-xs text-emerald-400 font-medium border border-emerald-500/20">
              {stats?.totalConverted ?? 0} Converted
            </div>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trials…"
            className="pl-9 bg-[#0a0f1e] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" />
        </div>
        {([
          { v: 'all', l: 'All Trials' },
          { v: 'expiring', l: '⚠️ Expiring ≤7d' },
          { v: 'healthy', l: 'Healthy' },
        ] as const).map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.v ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07]'}`}>
            {f.l}
          </button>
        ))}
        <p className="ml-auto text-xs text-white/30">{filtered.length} trials</p>
      </div>

      {/* Trials table */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {['Tenant', 'Plan', 'Days Left', 'Progress', 'Extensions', 'Last Event', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3 first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">
                {trials.length === 0 ? 'No active trials' : 'No trials match this filter'}
              </td></tr>
            ) : filtered.map((t, i) => {
              const startedTs = new Date(t.startedAt).getTime();
              const endTs = t.trialEndsAt ? new Date(t.trialEndsAt).getTime() : startedTs + 14 * 86400000;
              const totalDuration = (endTs - startedTs) / 86400000;
              const elapsed = (Date.now() - startedTs) / 86400000;
              const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
              const lastEv = EVENT_LABELS[t.lastEvent ?? ''];
              const maxExt = config?.maxExtensions ?? 2;

              return (
                <motion.tr key={t.subId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 pl-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                        {t.orgName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.orgName}</p>
                        <p className="text-[10px] text-white/30">{t.industry ?? t.country ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${PLAN_COLORS[t.planSlug] ?? 'text-white/60'}`}>{t.planName}</span>
                    <p className="text-[10px] text-white/25 capitalize">{t.billingCycle}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${daysColor(t.daysRemaining)}`} />
                      <span className={`text-sm font-bold ${daysColor(t.daysRemaining)}`}>
                        {t.daysRemaining !== null ? `${t.daysRemaining}d` : '—'}
                      </span>
                    </div>
                    {t.daysRemaining !== null && t.daysRemaining <= 3 && (
                      <p className="text-[10px] text-red-400 mt-0.5">Urgent</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-28">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/30">{Math.round(elapsed)}d elapsed</span>
                        <span className="text-[10px] text-white/30">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: maxExt }).map((_, idx) => (
                        <div key={idx} className={`w-2.5 h-2.5 rounded-sm ${idx < t.extensionCount ? 'bg-amber-400' : 'bg-white/[0.08]'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-white/25 mt-0.5">{t.extensionCount}/{maxExt} used</p>
                  </td>
                  <td className="px-4 py-3">
                    {lastEv
                      ? <span className={`text-xs ${lastEv.color}`}>{lastEv.label}</span>
                      : <span className="text-xs text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-48">
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-xs"
                          onClick={() => setEventLogSub(t.subId)}>
                          <Activity className="w-3.5 h-3.5 mr-2 text-white/40" />View Event Log
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/[0.07]" />
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-xs text-emerald-400"
                          onClick={() => setConvertTarget(t)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-2" />Convert to Paid
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={`hover:bg-white/[0.05] cursor-pointer text-xs ${t.extensionCount >= maxExt ? 'text-white/20 pointer-events-none' : 'text-amber-400'}`}
                          onClick={() => t.extensionCount < maxExt && setExtendTarget(t)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" />Extend Trial
                          {t.extensionCount >= maxExt && <span className="ml-auto text-white/20">(limit reached)</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-xs text-[#06B6D4]"
                          onClick={() => setReminderTarget(t)}>
                          <Bell className="w-3.5 h-3.5 mr-2" />Send Reminder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/[0.07]" />
                        <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-xs text-red-400"
                          onClick={() => setCancelTarget(t)}>
                          <XCircle className="w-3.5 h-3.5 mr-2" />Cancel Trial
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

      {/* Trial Config */}
      <TrialConfigPanel config={config} onSave={(data) => configMut.mutate(data)} loading={configMut.isPending} />

      {/* Dialogs */}
      <AnimatePresence>
        {extendTarget && (
          <ExtendDialog trial={extendTarget} onClose={() => setExtendTarget(null)}
            onSubmit={(days, note) => extendMut.mutate({ subId: extendTarget.subId, days, note })}
            loading={extendMut.isPending} />
        )}
        {convertTarget && (
          <ConvertDialog trial={convertTarget} plans={plans} onClose={() => setConvertTarget(null)}
            onSubmit={(planId, cycle) => convertMut.mutate({ subId: convertTarget.subId, planId, cycle })}
            loading={convertMut.isPending} />
        )}
        {reminderTarget && (
          <ReminderDialog trial={reminderTarget} onClose={() => setReminderTarget(null)}
            onSubmit={(note) => reminderMut.mutate({ subId: reminderTarget.subId, note })}
            loading={reminderMut.isPending} />
        )}
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-white">Cancel Trial?</h3>
                <p className="text-sm text-white/40 mt-1">This will cancel the trial for <span className="text-white">{cancelTarget.orgName}</span> and suspend their account.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/[0.1] text-white/60 bg-transparent hover:text-white" onClick={() => setCancelTarget(null)}>Keep Trial</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => cancelMut.mutate(cancelTarget.subId)} disabled={cancelMut.isPending}>
                  {cancelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Trial'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
        {eventLogSub !== null && (
          <TrialEventLog subId={eventLogSub} onClose={() => setEventLogSub(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tenant Dashboard Tab ───────────────────────────────────────────────────
function TenantDashboardTab({ id, onBack }: { id: number | null; onBack: () => void }) {
  const { data, isLoading, refetch } = useTenantDashboard(id);
  const { data: plans = [] } = usePlans();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', legalName: '', industry: '', country: '', currency: 'USD',
    planId: '', billingCycle: 'monthly', notes: '',
    currentUsers: '', currentStorageGb: '',
  });

  useEffect(() => {
    if (data && !showEdit) {
      setEditForm({
        name: data.name ?? '',
        legalName: data.legalName ?? '',
        industry: data.industry ?? '',
        country: data.country ?? '',
        currency: data.currency ?? 'USD',
        planId: String(data.planId ?? ''),
        billingCycle: data.billingCycle ?? 'monthly',
        notes: data.notes ?? '',
        currentUsers: String(data.currentUsers ?? ''),
        currentStorageGb: data.currentStorageGb ? Number(data.currentStorageGb).toFixed(1) : '',
      });
    }
  }, [data, showEdit]);

  const changeStatus = useMutation({
    mutationFn: async (status: string) => {
      const r = await fetch(api(`/saas/tenants/${id}/status`), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-tenant-dashboard', id] });
      qc.invalidateQueries({ queryKey: ['saas-tenants'] });
      qc.invalidateQueries({ queryKey: ['saas-metrics'] });
      toast({ title: 'Tenant status updated' });
      refetch();
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }),
  });

  const updateTenant = useMutation({
    mutationFn: async () => {
      const body = {
        ...editForm,
        planId: editForm.planId ? parseInt(editForm.planId) : undefined,
        currentUsers: editForm.currentUsers ? parseInt(editForm.currentUsers) : undefined,
        currentStorageGb: editForm.currentStorageGb ? editForm.currentStorageGb : undefined,
      };
      const r = await fetch(api(`/saas/tenants/${id}`), {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return r.json();
    },
    onSuccess: (res) => {
      if (!res.success) { toast({ title: 'Error', description: res.error ?? 'Failed to update', variant: 'destructive' }); return; }
      qc.invalidateQueries({ queryKey: ['saas-tenant-dashboard', id] });
      qc.invalidateQueries({ queryKey: ['saas-tenants'] });
      qc.invalidateQueries({ queryKey: ['saas-metrics'] });
      setShowEdit(false);
      toast({ title: 'Tenant updated successfully' });
      refetch();
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update tenant', variant: 'destructive' }),
  });

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Tenants
        </button>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Tenants
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-white/30">
          <AlertCircle className="w-10 h-10 mb-3 text-red-400/50" />
          <p className="text-sm">Tenant not found or failed to load.</p>
          <button onClick={() => refetch()} className="mt-3 text-xs text-[#2563EB] hover:text-blue-400">Retry</button>
        </div>
      </div>
    );
  }

  const d = data;
  const statusKey = d.subStatus ?? d.status ?? 'active';
  const SI = STATUS_ICON[statusKey] ?? CheckCircle;
  const isTrial = statusKey === 'trial';
  const isSuspended = statusKey === 'suspended';
  const isCancelled = statusKey === 'cancelled';

  const usersLimit = d.maxUsers && d.maxUsers > 0 ? `/ ${d.maxUsers}` : '';
  const storageUsed = d.currentStorageGb ? Number(d.currentStorageGb).toFixed(1) : '0';
  const storageLimit = d.maxStorageGb && d.maxStorageGb > 0 ? `/ ${d.maxStorageGb} GB` : '';

  const kpis = [
    {
      label: 'Monthly Revenue', value: d.mrr ? fmt(Number(d.mrr)) : '—',
      sub: d.billingCycle ? `Billed ${d.billingCycle}` : 'No subscription',
      icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      label: 'Users', value: `${d.currentUsers ?? 0}${usersLimit}`,
      sub: d.maxUsers && d.maxUsers > 0 ? `${d.usersPct}% of limit` : 'Unlimited',
      icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5',
      pct: d.usersPct,
    },
    {
      label: 'Storage', value: `${storageUsed} GB${storageLimit ? ' ' + storageLimit : ''}`,
      sub: d.maxStorageGb && d.maxStorageGb > 0 ? `${d.storagePct}% of limit` : 'Unlimited',
      icon: Database, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5',
      pct: d.storagePct,
    },
    {
      label: 'API Calls / Month', value: fmtNum(d.currentApiCalls ?? 0),
      sub: d.maxApiCallsMonthly && d.maxApiCallsMonthly > 0 ? `${d.apiPct}% of limit` : 'Unlimited',
      icon: Cpu, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5',
      pct: d.apiPct,
    },
  ];

  const eventTypeColors: Record<string, string> = {
    created: 'text-emerald-400 bg-emerald-500/10',
    extended: 'text-[#2563EB] bg-[#2563EB]/10',
    reminder_sent: 'text-amber-400 bg-amber-500/10',
    converted: 'text-[#06B6D4] bg-[#06B6D4]/10',
    cancelled: 'text-red-400 bg-red-500/10',
    expired: 'text-white/30 bg-white/[0.05]',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to Tenants
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"
            onClick={() => setShowEdit(true)}>
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />Edit Tenant
          </Button>
          {!isSuspended && !isCancelled && (
            <Button size="sm" variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent"
              onClick={() => changeStatus.mutate('suspended')}
              disabled={changeStatus.isPending}>
              <Ban className="w-3.5 h-3.5 mr-1.5" />Suspend
            </Button>
          )}
          {isSuspended && (
            <Button size="sm" variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
              onClick={() => changeStatus.mutate('active')}
              disabled={changeStatus.isPending}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Reactivate
            </Button>
          )}
          {!isCancelled && (
            <Button size="sm" variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
              onClick={() => changeStatus.mutate('cancelled')}
              disabled={changeStatus.isPending}>
              <XCircle className="w-3.5 h-3.5 mr-1.5" />Cancel
            </Button>
          )}
          {isCancelled && (
            <Button size="sm" variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
              onClick={() => changeStatus.mutate('active')}
              disabled={changeStatus.isPending}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Restore
            </Button>
          )}
        </div>
      </div>

      {/* Tenant Identity Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 flex items-center gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
          {d.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">{d.name}</h2>
            <Badge className={`${STATUS_STYLES[statusKey] ?? STATUS_STYLES.active} text-[10px] capitalize`}>
              <SI className="w-2.5 h-2.5 mr-1" />{statusKey}
            </Badge>
            {d.planName && (
              <span className={`text-xs font-semibold ${PLAN_COLORS[d.planSlug ?? ''] ?? 'text-white/40'}`}>
                {d.planName} Plan
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {d.legalName && <span className="text-xs text-white/40">{d.legalName}</span>}
            {d.industry && <span className="text-xs text-white/30">{d.industry}</span>}
            {d.country && <span className="text-xs text-white/30">{d.country}</span>}
            {d.employeeCount > 0 && <span className="text-xs text-white/30">{d.employeeCount} employees</span>}
            <span className="text-xs text-white/25">Joined {timeAgo(d.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {d.daysToRenewal !== null && !isTrial && (
            <div className={`flex items-center gap-1.5 text-xs ${d.daysToRenewal <= 7 ? 'text-red-400' : d.daysToRenewal <= 30 ? 'text-amber-400' : 'text-white/40'}`}>
              <Calendar className="w-3 h-3" />
              {d.daysToRenewal === 0 ? 'Renews today' : `Renews in ${d.daysToRenewal}d`}
            </div>
          )}
          {isTrial && d.daysInTrial !== null && (
            <div className={`flex items-center gap-1.5 text-xs ${d.daysInTrial <= 3 ? 'text-red-400' : d.daysInTrial <= 7 ? 'text-amber-400' : 'text-[#06B6D4]'}`}>
              <Clock className="w-3 h-3" />
              {d.daysInTrial === 0 ? 'Trial expires today' : `${d.daysInTrial}d left in trial`}
            </div>
          )}
          {d.gstin && <span className="text-[10px] text-white/20">GSTIN: {d.gstin}</span>}
          {d.taxId && <span className="text-[10px] text-white/20">Tax ID: {d.taxId}</span>}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{k.sub}</p>
            {'pct' in k && typeof k.pct === 'number' && k.pct > 0 && (
              <Progress value={k.pct}
                className={`h-1 mt-2 bg-white/[0.06] ${k.pct >= 90 ? '[&>div]:bg-red-500' : k.pct >= 70 ? '[&>div]:bg-amber-500' : ''}`} />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Subscription Details */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-white/40" />Subscription
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Plan', value: d.planName ?? '—', colored: true },
              { label: 'Status', value: statusKey, capitalize: true },
              { label: 'Billing', value: d.billingCycle ?? '—', capitalize: true },
              { label: 'Price', value: d.billingCycle === 'yearly' && d.priceYearly ? `$${Number(d.priceYearly).toLocaleString()}/yr` : d.priceMonthly ? `$${Number(d.priceMonthly).toLocaleString()}/mo` : '—' },
              { label: 'Started', value: d.startedAt ? new Date(d.startedAt).toLocaleDateString() : '—' },
              { label: 'Expires', value: d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—' },
              ...(isTrial && d.trialEndsAt ? [{ label: 'Trial Ends', value: new Date(d.trialEndsAt).toLocaleDateString(), colored: false, capitalize: false }] : []),
              ...(d.cancelledAt ? [{ label: 'Cancelled', value: new Date(d.cancelledAt).toLocaleDateString(), colored: false, capitalize: false }] : []),
              { label: 'Currency', value: d.currency },
              ...(d.notes ? [{ label: 'Notes', value: d.notes, colored: false, capitalize: false }] : []),
            ].map(row => (
              <div key={row.label} className="flex items-start justify-between py-1.5 border-b border-white/[0.04] last:border-0 gap-2">
                <span className="text-xs text-white/40 flex-shrink-0">{row.label}</span>
                <span className={`text-xs font-medium text-right ${(row as any).colored ? (PLAN_COLORS[d.planSlug ?? ''] ?? 'text-white') : 'text-white'} ${(row as any).capitalize ? 'capitalize' : ''}`}>
                  {String(row.value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Resource Usage */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-white/40" />Resource Usage
          </h3>
          <div className="space-y-5">
            {[
              {
                label: 'Users', icon: Users, color: 'text-[#2563EB]', pct: d.usersPct,
                used: String(d.currentUsers ?? 0),
                limit: d.maxUsers && d.maxUsers > 0 ? String(d.maxUsers) : 'Unlimited',
                barColor: d.usersPct >= 90 ? 'bg-red-500' : d.usersPct >= 70 ? 'bg-amber-500' : 'bg-[#2563EB]',
              },
              {
                label: 'Storage', icon: Database, color: 'text-[#06B6D4]', pct: d.storagePct,
                used: `${storageUsed} GB`,
                limit: d.maxStorageGb && d.maxStorageGb > 0 ? `${d.maxStorageGb} GB` : 'Unlimited',
                barColor: d.storagePct >= 90 ? 'bg-red-500' : d.storagePct >= 70 ? 'bg-amber-500' : 'bg-[#06B6D4]',
              },
              {
                label: 'API Calls / Month', icon: Cpu, color: 'text-purple-400', pct: d.apiPct,
                used: fmtNum(d.currentApiCalls ?? 0),
                limit: d.maxApiCallsMonthly && d.maxApiCallsMonthly > 0 ? fmtNum(d.maxApiCallsMonthly) : 'Unlimited',
                barColor: d.apiPct >= 90 ? 'bg-red-500' : d.apiPct >= 70 ? 'bg-amber-500' : 'bg-purple-500',
              },
              {
                label: 'Modules', icon: Layers, color: 'text-amber-400', pct: 0,
                used: '—',
                limit: d.maxModules && d.maxModules > 0 ? String(d.maxModules) : 'Unlimited',
                barColor: 'bg-amber-500',
              },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                    <span className="text-xs text-white/60">{r.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-white">{r.used}</span>
                    <span className="text-[10px] text-white/30"> / {r.limit}</span>
                  </div>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.6, delay: 0.2 }}
                    className={`h-full rounded-full ${r.barColor}`} />
                </div>
                {r.pct >= 90 && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />Near limit — consider upgrading
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Plan features */}
          {d.features && d.features.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/[0.05]">
              <h4 className="text-xs text-white/40 mb-2.5 flex items-center gap-1.5"><Star className="w-3 h-3" />Plan Features</h4>
              <div className="space-y-1.5">
                {d.features.map((f: string) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-[10px] text-white/50">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right column: Events + Whitelabel */}
        <div className="space-y-4">
          {/* Recent Events */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-white/40" />Recent Events
            </h3>
            {d.recentEvents && d.recentEvents.length > 0 ? (
              <div className="space-y-2.5">
                {d.recentEvents.map((ev: TrialEvent) => (
                  <div key={ev.id} className="flex items-start gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize flex-shrink-0 mt-0.5 ${eventTypeColors[ev.eventType] ?? 'text-white/30 bg-white/[0.05]'}`}>
                      {ev.eventType.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      {ev.daysAdded ? <p className="text-[10px] text-white/40">+{ev.daysAdded} days added</p> : null}
                      {ev.note && <p className="text-[10px] text-white/30 truncate">{ev.note}</p>}
                      {ev.createdBy && <p className="text-[10px] text-white/20">by {ev.createdBy}</p>}
                    </div>
                    <span className="text-[10px] text-white/20 flex-shrink-0">{timeAgo(String(ev.createdAt))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/20 text-xs">No events yet</div>
            )}
          </motion.div>

          {/* Whitelabel Summary */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-white/40" />White Label
              </h3>
              {d.whitelabel && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${d.whitelabel.isEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.06] text-white/30'}`}>
                  {d.whitelabel.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </div>
            {d.whitelabel ? (
              <div className="space-y-2">
                {[
                  { label: 'Product Name', value: d.whitelabel.productName },
                  { label: 'Custom Domain', value: d.whitelabel.customDomain ?? '—' },
                  { label: 'Domain Status', value: d.whitelabel.domainStatus, capitalize: true },
                  { label: 'Nav Theme', value: d.whitelabel.navTheme, capitalize: true },
                  { label: 'Font', value: d.whitelabel.fontFamily ?? 'Inter' },
                  { label: 'Support Email', value: d.whitelabel.supportEmail ?? '—' },
                  { label: 'Hide Powered By', value: d.whitelabel.hidePoweredBy ? 'Yes' : 'No' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0 gap-2">
                    <span className="text-[10px] text-white/30 flex-shrink-0">{row.label}</span>
                    <span className={`text-[10px] font-medium text-white/60 text-right ${(row as any).capitalize ? 'capitalize' : ''}`}>{String(row.value)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: d.whitelabel.primaryColor }} />
                    <span className="text-[10px] text-white/30">Primary</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: d.whitelabel.accentColor }} />
                    <span className="text-[10px] text-white/30">Accent</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-white/20 text-xs">No white label config</div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#07091a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white text-lg">Edit Tenant</h3>
                <button onClick={() => setShowEdit(false)} className="p-1.5 rounded hover:bg-white/[0.07] text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { f: 'name', l: 'Company Name', required: true },
                    { f: 'legalName', l: 'Legal Name' },
                  ].map(({ f, l, required }) => (
                    <div key={f}>
                      <label className="text-xs text-white/40 mb-1 block">{l}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
                      <Input value={(editForm as any)[f]} onChange={e => setEditForm(x => ({ ...x, [f]: e.target.value }))}
                        className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { f: 'industry', l: 'Industry' },
                    { f: 'country', l: 'Country' },
                  ].map(({ f, l }) => (
                    <div key={f}>
                      <label className="text-xs text-white/40 mb-1 block">{l}</label>
                      <Input value={(editForm as any)[f]} onChange={e => setEditForm(x => ({ ...x, [f]: e.target.value }))}
                        className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Currency</label>
                    <Input value={editForm.currency} onChange={e => setEditForm(x => ({ ...x, currency: e.target.value }))}
                      className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" placeholder="USD" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Billing Cycle</label>
                    <select value={editForm.billingCycle} onChange={e => setEditForm(x => ({ ...x, billingCycle: e.target.value }))}
                      className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white h-8 text-sm rounded-md px-2">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Plan</label>
                  <select value={editForm.planId} onChange={e => setEditForm(x => ({ ...x, planId: e.target.value }))}
                    className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white h-8 text-sm rounded-md px-2">
                    <option value="">— No change —</option>
                    {plans.filter(p => p.isActive).map(p => (
                      <option key={p.id} value={String(p.id)}>{p.name} (${Number(p.priceMonthly)}/mo)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Current Users</label>
                    <Input type="number" value={editForm.currentUsers} onChange={e => setEditForm(x => ({ ...x, currentUsers: e.target.value }))}
                      className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Storage Used (GB)</label>
                    <Input type="number" step="0.1" value={editForm.currentStorageGb} onChange={e => setEditForm(x => ({ ...x, currentStorageGb: e.target.value }))}
                      className="bg-[#0a0f1e] border-white/[0.08] text-white h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(x => ({ ...x, notes: e.target.value }))} rows={3}
                    className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 resize-none outline-none focus:border-[#2563EB]/50" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" className="flex-1 border-white/[0.08] text-white/60 bg-transparent"
                  onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
                  onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending || !editForm.name.trim()}>
                  {updateTenant.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Changes</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SaasPlatform() {
  const [tab, setTab] = useState('overview');
  const [showOnboard, setShowOnboard] = useState(false);
  const [tenantDashboardId, setTenantDashboardId] = useState<number | null>(null);

  const openTenantDashboard = (id: number) => {
    setTenantDashboardId(id);
    setTab('tenant-dashboard');
  };

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
          <TabsList className="bg-white/[0.04] border border-white/[0.07] flex-wrap h-auto gap-0.5">
            {[
              { v: 'overview',     l: 'Overview',         icon: BarChart3 },
              { v: 'tenants',      l: 'Tenants',          icon: Building2 },
              { v: 'plans',        l: 'Plans',            icon: Star },
              { v: 'subscriptions',l: 'Subscriptions',    icon: CreditCard },
              { v: 'trials',       l: 'Trial Management', icon: Clock },
              { v: 'onboarding',   l: 'Onboarding',       icon: Zap },
              { v: 'whitelabel',   l: 'White Label',      icon: Palette },
              ...(tab === 'tenant-dashboard' ? [{ v: 'tenant-dashboard', l: 'Tenant Dashboard', icon: LayoutDashboard }] : []),
            ].map(({ v, l, icon: Icon }) => (
              <TabsTrigger key={v} value={v} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />{l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"          className="mt-5"><OverviewTab /></TabsContent>
          <TabsContent value="tenants"           className="mt-5"><TenantsTab onAdd={() => { setTab('onboarding'); }} onViewDashboard={openTenantDashboard} /></TabsContent>
          <TabsContent value="plans"             className="mt-5"><PlansTab /></TabsContent>
          <TabsContent value="subscriptions"     className="mt-5"><SubscriptionsTab /></TabsContent>
          <TabsContent value="trials"            className="mt-5"><TrialManagementTab /></TabsContent>
          <TabsContent value="onboarding"        className="mt-5"><OnboardingTab /></TabsContent>
          <TabsContent value="whitelabel"        className="mt-5"><WhiteLabelTab /></TabsContent>
          <TabsContent value="tenant-dashboard"  className="mt-5">
            <TenantDashboardTab id={tenantDashboardId} onBack={() => setTab('tenants')} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
