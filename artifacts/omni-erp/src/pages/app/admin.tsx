import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/app/AdminLayout';
import { useAdminAuth, adminFetch } from '@/contexts/adminAuth';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard, Building2, Users, Shield, CreditCard, Key, Zap,
  Palette, Briefcase, Plug, Lock, FileText, BarChart3, Database,
  Bell, HeadphonesIcon, Activity, Settings, Plus, Pencil, Trash2,
  ToggleLeft, ToggleRight, RefreshCw, CheckCircle2, XCircle,
  AlertCircle, Clock, LogIn, LogOut as LogOutIcon, Search,
  ChevronDown, Loader2, Copy, Check, Server, Globe, TrendingUp,
  DollarSign, Download, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Tenant { id: number; name: string; legal_name: string | null; status: string; country: string | null; industry: string | null; gstin: string | null; user_count: number; plan_name: string | null; sub_status: string | null; created_at: string; }
interface AdminUser { id: number; first_name: string; last_name: string; email: string; status: string; org_name: string | null; role_name: string | null; mfa_enabled: boolean; last_login_at: string | null; created_at: string; }
interface Role { id: number; name: string; description: string | null; is_system: boolean; org_name: string | null; user_count: number; created_at: string; }
interface Plan { id: number; name: string; slug: string; price_monthly: string; price_yearly: string; max_users: number | null; max_modules: number | null; max_storage_gb: number | null; is_active: boolean; sub_count: number; created_at: string; }
interface Subscription { id: number; org_name: string; plan_name: string; status: string; billing_cycle: string; mrr: string; started_at: string; expires_at: string | null; current_users: number; }
interface Invoice { id: number; invoice_number: string; org_name: string; status: string; total: string; currency: string; created_at: string; paid_at: string | null; }
interface License { id: number; license_key: string; org_id: number | null; org_name: string | null; plan_name: string; max_users: number; max_modules: number; issued_to: string | null; expires_at: string | null; status: string; notes: string | null; created_at: string; }
interface Feature { id: number; key: string; name: string; description: string | null; is_enabled: boolean; rollout_pct: number; category: string; updated_at: string; }
interface Whitelabel { id: number; org_id: number; org_name: string; is_enabled: boolean; product_name: string; primary_color: string; accent_color: string; custom_domain: string | null; support_email: string | null; hide_powered_by: boolean; logo_url: string | null; }
interface Agency { id: number; name: string; slug: string; contact_name: string | null; contact_email: string | null; country: string | null; commission_rate: number; status: string; client_count: number; total_commission: string | null; }
interface Integration { id: number; name: string; category: string; is_enabled: boolean; status: string; config: Record<string, string>; last_tested_at: string | null; }
interface Ticket { id: number; ticket_number: string; subject: string; description: string | null; org_id: number | null; org_name: string | null; reporter_name: string | null; reporter_email: string | null; priority: string; category: string; status: string; assigned_to: string | null; resolution: string | null; created_at: string; }
interface Backup { id: number; backup_name: string; type: string; status: string; initiated_by: string; size_bytes: number | null; notes: string | null; started_at: string; completed_at: string | null; }
interface Notification { id: number; user_id: number; type: string; title: string; body: string | null; is_read: boolean; created_at: string; target_email: string | null; }
interface SystemSetting { id: number; key: string; value: string; category: string; description: string | null; updated_by: string | null; updated_at: string; }

// ── Helper ─────────────────────────────────────────────────────────────────────
function useAdminQuery<T>(key: string[], path: string) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => adminFetch<{ success: boolean; data: T }>(path).then(r => r.data),
    retry: 1,
  });
}

async function adminCall(path: string, method: string, body?: unknown) {
  return adminFetch<{ success: boolean; data: unknown }>(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function fmt(n: number, prefix = '') {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toLocaleString()}`;
}
function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString() : '—'; }
function fmtDateTime(s: string | null) { return s ? new Date(s).toLocaleString() : '—'; }

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
  suspended: 'bg-red-500/15 text-red-400',
  trial: 'bg-blue-500/15 text-blue-400',
  cancelled: 'bg-orange-500/15 text-orange-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  running: 'bg-blue-500/15 text-blue-400',
  failed: 'bg-red-500/15 text-red-400',
  open: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-yellow-500/15 text-yellow-400',
  resolved: 'bg-emerald-500/15 text-emerald-400',
  closed: 'bg-zinc-500/15 text-zinc-400',
  enabled: 'bg-emerald-500/15 text-emerald-400',
  disabled: 'bg-zinc-500/15 text-zinc-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-yellow-500/15 text-yellow-400',
};
function StatusBadge({ s }: { s: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[s] ?? 'bg-white/10 text-white/60'}`}>{s.replace('_', ' ')}</span>;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400',
  high: 'bg-orange-500/15 text-orange-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-zinc-500/15 text-zinc-400',
};

// ── Shared UI atoms ─────────────────────────────────────────────────────────────
function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {desc && <p className="text-xs text-white/40 mt-0.5">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function DataTable({ cols, rows, loading, empty = 'No records found.' }: {
  cols: string[];
  rows: React.ReactNode[][];
  loading?: boolean;
  empty?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02]">
            {cols.map(c => <th key={c} className="text-left px-4 py-3 text-xs font-medium text-white/40">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={cols.length} className="text-center py-8 text-white/30">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="text-center py-8 text-white/30 text-xs">{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              {row.map((cell, j) => <td key={j} className="px-4 py-3 text-white/70">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, color = 'text-[#2563EB]' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="bg-[#0a0f1e] border-white/[0.07]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/40 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-white/[0.05] ${color}`}><Icon className="w-5 h-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 1. Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: d, isLoading } = useAdminQuery<{
    tenants: number; users: number; monthlyRevenue: number;
    activeSubscriptions: number; openTickets: number;
    recentTenants: Array<{ id: number; name: string; status: string; created_at: string }>;
    revenueChart: Array<{ month: string; revenue: string }>;
  }>(['admin-dashboard'], '/dashboard');

  const chart = (d?.revenueChart ?? []).map(r => ({ month: r.month, revenue: parseFloat(r.revenue) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI icon={Building2} label="Total Tenants" value={d?.tenants ?? 0} color="text-blue-400" />
        <KPI icon={Users} label="Total Users" value={d?.users ?? 0} color="text-purple-400" />
        <KPI icon={DollarSign} label="Monthly Revenue" value={`$${fmt(d?.monthlyRevenue ?? 0)}`} color="text-emerald-400" />
        <KPI icon={CreditCard} label="Active Subscriptions" value={d?.activeSubscriptions ?? 0} color="text-cyan-400" />
        <KPI icon={HeadphonesIcon} label="Open Tickets" value={d?.openTickets ?? 0} color="text-orange-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="bg-[#0a0f1e] border-white/[0.07]">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Revenue Trend (6 months)</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="bg-[#0a0f1e] border-white/[0.07]">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Recent Tenants</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.recentTenants ?? []).map(t => (
              <div key={t.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-white/70 truncate">{t.name}</span>
                <StatusBadge s={t.status} />
              </div>
            ))}
            {!d?.recentTenants?.length && <p className="text-xs text-white/30">No tenants yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── 2. Tenants Tab ──────────────────────────────────────────────────────────────
function TenantsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', legalName: '', country: '', industry: '', gstin: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  const q = `?${search ? `search=${encodeURIComponent(search)}&` : ''}${statusFilter !== 'all' ? `status=${statusFilter}` : ''}`;
  const { data: tenants = [], isLoading } = useAdminQuery<Tenant[]>(['admin-tenants', search, statusFilter], `/tenants${q}`);

  const openCreate = () => { setForm({ name: '', legalName: '', country: '', industry: '', gstin: '', status: 'active' }); setSelected(null); setDialog('create'); };
  const openEdit = (t: Tenant) => { setForm({ name: t.name, legalName: t.legal_name ?? '', country: t.country ?? '', industry: t.industry ?? '', gstin: t.gstin ?? '', status: t.status }); setSelected(t); setDialog('edit'); };

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: form.name, legalName: form.legalName || null, country: form.country || null, industry: form.industry || null, gstin: form.gstin || null, status: form.status };
      if (dialog === 'create') await adminCall('/tenants', 'POST', body);
      else await adminCall(`/tenants/${selected!.id}`, 'PUT', body);
      qc.invalidateQueries({ queryKey: ['admin-tenants'] });
      setDialog(null);
      toast({ title: dialog === 'create' ? 'Tenant created' : 'Tenant updated' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  const setStatus = async (t: Tenant, status: string) => {
    try { await adminCall(`/tenants/${t.id}/status`, 'PATCH', { status }); qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast({ title: 'Status updated' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  const del = async (t: Tenant) => {
    if (!confirm(`Delete tenant "${t.name}"? This cannot be undone.`)) return;
    try { await adminCall(`/tenants/${t.id}`, 'DELETE'); qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast({ title: 'Tenant deleted' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div>
      <SectionHeader title="Tenants & Companies" desc="Manage all tenant organisations on the platform" action={
        <Button size="sm" onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"><Plus className="w-4 h-4 mr-1" />Add Tenant</Button>
      } />
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…" className="pl-9 bg-white/[0.03] border-white/[0.08] text-white" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white/70"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </div>
      <DataTable loading={isLoading}
        cols={['#', 'Name', 'Country', 'Industry', 'Users', 'Plan', 'Status', 'Created', 'Actions']}
        rows={tenants.map(t => [
          t.id,
          <div><p className="text-white/80 font-medium">{t.name}</p>{t.legal_name && <p className="text-xs text-white/30">{t.legal_name}</p>}</div>,
        t.country ?? '—', t.industry ?? '—', t.user_count,
        t.plan_name ? <span className="text-xs text-white/60">{t.plan_name}</span> : <span className="text-xs text-white/30">No plan</span>,
          <StatusBadge s={t.status} />,
          fmtDate(t.created_at),
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-white/50 hover:text-white" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Select value={t.status} onValueChange={v => setStatus(t, v)}>
              <SelectTrigger className="h-7 px-2 bg-transparent border-white/[0.06] text-white/50 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400/60 hover:text-red-400" onClick={() => del(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ])}
      />
      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>{dialog === 'create' ? 'Add Tenant' : 'Edit Tenant'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-white/60 text-xs">Company Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Legal Name</Label><Input value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Industry</Label><Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div><Label className="text-white/60 text-xs">GSTIN</Label><Input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} className="text-white/50">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 3. Users, Roles & Permissions Tab ──────────────────────────────────────────
function UsersRolesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState('');
  const [sub, setSub] = useState<'users' | 'roles'>('users');

  const usersQ = `?${userSearch ? `search=${encodeURIComponent(userSearch)}` : ''}`;
  const { data: users = [], isLoading: uLoading } = useAdminQuery<AdminUser[]>(['admin-users', userSearch], `/users${usersQ}`);
  const { data: roles = [], isLoading: rLoading } = useAdminQuery<Role[]>(['admin-roles'], '/roles');

  const setUserStatus = async (u: AdminUser, status: string) => {
    try { await adminCall(`/users/${u.id}/status`, 'PATCH', { status }); qc.invalidateQueries({ queryKey: ['admin-users'] }); toast({ title: 'User status updated' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  const delUser = async (u: AdminUser) => {
    if (!confirm(`Delete user ${u.email}?`)) return;
    try { await adminCall(`/users/${u.id}`, 'DELETE'); qc.invalidateQueries({ queryKey: ['admin-users'] }); toast({ title: 'User deleted' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(['users', 'roles'] as const).map(t => (
          <button key={t} onClick={() => setSub(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${sub === t ? 'bg-[#2563EB]/20 text-[#2563EB]' : 'text-white/40 hover:text-white/70'}`}>{t === 'users' ? 'Users' : 'Roles & Permissions'}</button>
        ))}
      </div>

      {sub === 'users' && (
        <>
          <SectionHeader title="All Users" desc="View and manage all users across tenants" />
          <div className="relative max-w-xs mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9 bg-white/[0.03] border-white/[0.08] text-white" />
          </div>
          <DataTable loading={uLoading}
            cols={['User', 'Email', 'Organisation', 'Role', 'MFA', 'Status', 'Last Login', 'Actions']}
            rows={users.map(u => [
              `${u.first_name} ${u.last_name}`,
              <span className="text-xs">{u.email}</span>,
              u.org_name ?? '—', u.role_name ?? '—',
              u.mfa_enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-white/20" />,
              <StatusBadge s={u.status} />,
              fmtDateTime(u.last_login_at),
              <div className="flex gap-1">
                <Select value={u.status} onValueChange={v => setUserStatus(u, v)}>
                  <SelectTrigger className="h-7 px-2 bg-transparent border-white/[0.06] text-white/50 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
                </Select>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400/60 hover:text-red-400" onClick={() => delUser(u)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ])}
          />
        </>
      )}

      {sub === 'roles' && (
        <>
          <SectionHeader title="Roles & Permissions" desc="All roles across tenant organisations" />
          <DataTable loading={rLoading}
            cols={['#', 'Role Name', 'Organisation', 'Users', 'System Role', 'Created']}
            rows={roles.map(r => [
              r.id, <span className="font-medium text-white/80">{r.name}</span>,
              r.org_name ?? <span className="text-white/30 italic">Global</span>,
              r.user_count,
              r.is_system ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : '—',
              fmtDate(r.created_at),
            ])}
          />
        </>
      )}
    </div>
  );
}

// ── 4. Plans & Subscriptions Tab ────────────────────────────────────────────────
function PlansSubsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sub, setSub] = useState<'plans' | 'subs'>('plans');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', priceMonthly: '', priceYearly: '', maxUsers: '', maxModules: '', maxStorageGb: '' });
  const [saving, setSaving] = useState(false);
  const [statusF, setStatusF] = useState('all');

  const { data: plans = [], isLoading: pLoad } = useAdminQuery<Plan[]>(['admin-plans'], '/plans');
  const { data: subs = [], isLoading: sLoad } = useAdminQuery<Subscription[]>(['admin-subs', statusF], `/subscriptions${statusF !== 'all' ? `?status=${statusF}` : ''}`);

  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', priceMonthly: '', priceYearly: '', maxUsers: '', maxModules: '', maxStorageGb: '' }); setDialog(true); };
  const openEdit = (p: Plan) => { setEditing(p); setForm({ name: p.name, slug: p.slug, priceMonthly: p.price_monthly, priceYearly: p.price_yearly, maxUsers: String(p.max_users ?? ''), maxModules: String(p.max_modules ?? ''), maxStorageGb: String(p.max_storage_gb ?? '') }); setDialog(true); };

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: form.name, slug: form.slug, priceMonthly: parseFloat(form.priceMonthly) || 0, priceYearly: parseFloat(form.priceYearly) || 0, maxUsers: parseInt(form.maxUsers) || null, maxModules: parseInt(form.maxModules) || null, maxStorageGb: parseInt(form.maxStorageGb) || null };
      if (!editing) await adminCall('/plans', 'POST', body);
      else await adminCall(`/plans/${editing.id}`, 'PUT', { ...body, isActive: true });
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      setDialog(false);
      toast({ title: editing ? 'Plan updated' : 'Plan created' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  const delPlan = async (p: Plan) => {
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    try { await adminCall(`/plans/${p.id}`, 'DELETE'); qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast({ title: 'Plan deleted' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  const setSubStatus = async (s: Subscription, status: string) => {
    try { await adminCall(`/subscriptions/${s.id}/status`, 'PATCH', { status }); qc.invalidateQueries({ queryKey: ['admin-subs'] }); toast({ title: 'Subscription updated' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(['plans', 'subs'] as const).map(t => (
          <button key={t} onClick={() => setSub(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${sub === t ? 'bg-[#2563EB]/20 text-[#2563EB]' : 'text-white/40 hover:text-white/70'}`}>{t === 'plans' ? 'Plans' : 'Subscriptions'}</button>
        ))}
      </div>

      {sub === 'plans' && (
        <>
          <SectionHeader title="Pricing Plans" action={<Button size="sm" onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"><Plus className="w-4 h-4 mr-1" />New Plan</Button>} />
          <DataTable loading={pLoad}
            cols={['Name', 'Slug', 'Monthly', 'Yearly', 'Max Users', 'Active Subs', 'Status', 'Actions']}
            rows={plans.map(p => [
              <span className="font-medium text-white/80">{p.name}</span>,
              <span className="text-xs font-mono text-white/40">{p.slug}</span>,
              `$${parseFloat(p.price_monthly).toFixed(2)}`,
              `$${parseFloat(p.price_yearly).toFixed(2)}`,
              p.max_users ?? '∞',
              p.sub_count,
              p.is_active ? <StatusBadge s="active" /> : <StatusBadge s="inactive" />,
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-white/50 hover:text-white" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400/60 hover:text-red-400" onClick={() => delPlan(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ])}
          />
        </>
      )}

      {sub === 'subs' && (
        <>
          <SectionHeader title="Subscriptions" desc="All tenant subscriptions" action={
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white/70 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
            </Select>
          } />
          <DataTable loading={sLoad}
            cols={['Tenant', 'Plan', 'Status', 'Billing', 'MRR', 'Users', 'Started', 'Expires', 'Actions']}
            rows={subs.map(s => [
              s.org_name, s.plan_name,
              <StatusBadge s={s.status} />,
              s.billing_cycle,
              `$${parseFloat(s.mrr).toFixed(2)}`,
              s.current_users,
              fmtDate(s.started_at),
              fmtDate(s.expires_at),
              <Select value={s.status} onValueChange={v => setSubStatus(s, v)}>
                <SelectTrigger className="h-7 px-2 bg-transparent border-white/[0.06] text-white/50 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
              </Select>
            ])}
          />
        </>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>{editing ? 'Edit Plan' : 'New Plan'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Monthly Price ($)</Label><Input type="number" value={form.priceMonthly} onChange={e => setForm(f => ({ ...f, priceMonthly: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Yearly Price ($)</Label><Input type="number" value={form.priceYearly} onChange={e => setForm(f => ({ ...f, priceYearly: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-white/60 text-xs">Max Users</Label><Input type="number" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} placeholder="∞" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Max Modules</Label><Input type="number" value={form.maxModules} onChange={e => setForm(f => ({ ...f, maxModules: e.target.value }))} placeholder="∞" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Storage (GB)</Label><Input type="number" value={form.maxStorageGb} onChange={e => setForm(f => ({ ...f, maxStorageGb: e.target.value }))} placeholder="∞" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} className="text-white/50">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 5. Billing & Payments Tab ───────────────────────────────────────────────────
function BillingTab() {
  const { data: overview } = useAdminQuery<{ mrr: number; arr: number; totalInvoices: number; paidRevenue: number }>(['admin-billing-overview'], '/billing/overview');
  const { data: invoices = [], isLoading } = useAdminQuery<Invoice[]>(['admin-billing-invoices'], '/billing/invoices');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={TrendingUp} label="MRR" value={`$${fmt(overview?.mrr ?? 0)}`} color="text-emerald-400" />
        <KPI icon={BarChart3} label="ARR" value={`$${fmt(overview?.arr ?? 0)}`} color="text-blue-400" />
        <KPI icon={FileText} label="Total Invoices" value={overview?.totalInvoices ?? 0} color="text-purple-400" />
        <KPI icon={DollarSign} label="Paid Revenue" value={`$${fmt(overview?.paidRevenue ?? 0)}`} color="text-cyan-400" />
      </div>
      <SectionHeader title="Invoices" desc="All billing invoices across tenants" />
      <DataTable loading={isLoading}
        cols={['Invoice #', 'Tenant', 'Status', 'Total', 'Currency', 'Created', 'Paid At']}
        rows={invoices.map(inv => [
          <span className="font-mono text-xs text-white/60">{inv.invoice_number}</span>,
          inv.org_name,
          <StatusBadge s={inv.status} />,
          <span className="font-medium">${parseFloat(inv.total).toFixed(2)}</span>,
          inv.currency,
          fmtDate(inv.created_at),
          fmtDate(inv.paid_at),
        ])}
      />
    </div>
  );
}

// ── 6. Licenses Tab ─────────────────────────────────────────────────────────────
function LicensesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ issuedTo: '', planName: 'Professional', maxUsers: '50', maxModules: '10', expiresAt: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const { data: licenses = [], isLoading } = useAdminQuery<License[]>(['admin-licenses'], '/licenses');

  const save = async () => {
    setSaving(true);
    try {
      await adminCall('/licenses', 'POST', { ...form, maxUsers: parseInt(form.maxUsers), maxModules: parseInt(form.maxModules), expiresAt: form.expiresAt || null });
      qc.invalidateQueries({ queryKey: ['admin-licenses'] });
      setDialog(false);
      toast({ title: 'License created' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  const setStatus = async (l: License, status: string) => {
    try { await adminCall(`/licenses/${l.id}/status`, 'PATCH', { status }); qc.invalidateQueries({ queryKey: ['admin-licenses'] }); toast({ title: 'Status updated' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  const del = async (l: License) => {
    if (!confirm('Delete this license?')) return;
    try { await adminCall(`/licenses/${l.id}`, 'DELETE'); qc.invalidateQueries({ queryKey: ['admin-licenses'] }); toast({ title: 'License deleted' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  const copy = (l: License) => { navigator.clipboard.writeText(l.license_key); setCopied(l.id); setTimeout(() => setCopied(null), 2000); };

  return (
    <div>
      <SectionHeader title="License Management" desc="Issue and manage software licenses" action={
        <Button size="sm" onClick={() => setDialog(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"><Plus className="w-4 h-4 mr-1" />Issue License</Button>
      } />
      <DataTable loading={isLoading}
        cols={['License Key', 'Issued To', 'Plan', 'Max Users', 'Status', 'Expires', 'Actions']}
        rows={licenses.map(l => [
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-white/60">{l.license_key}</span>
            <Button size="sm" variant="ghost" className="h-6 px-1 text-white/30 hover:text-white" onClick={() => copy(l)}>
              {copied === l.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>,
          l.issued_to ?? '—', l.plan_name, l.max_users,
          <StatusBadge s={l.status} />,
          fmtDate(l.expires_at),
          <div className="flex gap-1">
            <Select value={l.status} onValueChange={v => setStatus(l, v)}>
              <SelectTrigger className="h-7 px-2 bg-transparent border-white/[0.06] text-white/50 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="revoked">Revoked</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400/60 hover:text-red-400" onClick={() => del(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ])}
      />
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>Issue New License</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-white/60 text-xs">Issued To</Label><Input value={form.issuedTo} onChange={e => setForm(f => ({ ...f, issuedTo: e.target.value }))} placeholder="Company or person name" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Plan Name</Label>
                <Select value={form.planName} onValueChange={v => setForm(f => ({ ...f, planName: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Starter">Starter</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/60 text-xs">Expires At</Label><Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Max Users</Label><Input type="number" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Max Modules</Label><Input type="number" value={form.maxModules} onChange={e => setForm(f => ({ ...f, maxModules: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div><Label className="text-white/60 text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1 resize-none" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} className="text-white/50">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Issue License'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 7. Feature Management Tab ───────────────────────────────────────────────────
function FeaturesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [form, setForm] = useState({ key: '', name: '', description: '', category: 'general', isEnabled: true, rolloutPct: 100 });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: features = [], isLoading } = useAdminQuery<Feature[]>(['admin-features'], '/features');
  const categories = [...new Set(features.map(f => f.category))].sort();
  const categoryOptions = [...new Set(['general', 'finance', 'hr', 'inventory', 'ai', ...categories, form.category])].sort();
  const filteredFeatures = features.filter(f => {
    const matchesSearch = !search.trim() ||
      `${f.key} ${f.name} ${f.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (categoryFilter === 'all' || f.category === categoryFilter);
  });
  const enabledCount = features.filter(f => f.is_enabled).length;
  const rolloutCount = features.filter(f => f.is_enabled && f.rollout_pct > 0).length;

  const openCreate = () => { setEditing(null); setForm({ key: '', name: '', description: '', category: 'general', isEnabled: true, rolloutPct: 100 }); setDialog(true); };
  const openEdit = (f: Feature) => { setEditing(f); setForm({ key: f.key, name: f.name, description: f.description ?? '', category: f.category, isEnabled: f.is_enabled, rolloutPct: f.rollout_pct }); setDialog(true); };

  const save = async () => {
    if (!form.name.trim() || (!editing && !form.key.trim())) {
      toast({ title: 'Name and feature key are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const rolloutPct = Math.max(0, Math.min(100, Math.round(form.rolloutPct)));
      if (!editing) await adminCall('/features', 'POST', { key: form.key.trim(), name: form.name.trim(), description: form.description.trim() || null, category: form.category, isEnabled: form.isEnabled, rolloutPct });
      else await adminCall(`/features/${editing.id}`, 'PUT', { name: form.name.trim(), description: form.description.trim() || null, category: form.category, isEnabled: form.isEnabled, rolloutPct });
      qc.invalidateQueries({ queryKey: ['admin-features'] });
      setDialog(false);
      toast({ title: editing ? 'Feature updated' : 'Feature created' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  const toggle = async (f: Feature) => {
    setToggling(f.id);
    try { await adminCall(`/features/${f.id}/toggle`, 'PATCH'); qc.invalidateQueries({ queryKey: ['admin-features'] }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setToggling(null);
  };

  const del = async (f: Feature) => {
    if (!confirm(`Delete feature "${f.name}"?`)) return;
    try { await adminCall(`/features/${f.id}`, 'DELETE'); qc.invalidateQueries({ queryKey: ['admin-features'] }); toast({ title: 'Feature deleted' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Feature Management" desc="Control platform capabilities, rollout percentages, and availability" action={
        <Button size="sm" onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"><Plus className="w-4 h-4 mr-1" />Add Feature</Button>
      } />
      <div className="grid grid-cols-3 gap-3">
        <KPI icon={Zap} label="Total Features" value={features.length} color="text-blue-400" />
        <KPI icon={CheckCircle2} label="Enabled" value={enabledCount} color="text-emerald-400" />
        <KPI icon={Activity} label="In Rollout" value={rolloutCount} color="text-cyan-400" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by key, name, or description" className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-white/[0.04] border-white/[0.08] text-white/70"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(category => <SelectItem key={category} value={category}>{category.replace(/[-_]/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable loading={isLoading}
        cols={['Key', 'Name', 'Category', 'Rollout %', 'Enabled', 'Actions']}
        rows={filteredFeatures.map(f => [
          <span className="font-mono text-xs text-white/50">{f.key}</span>,
          <div><p className="text-white/80">{f.name}</p>{f.description && <p className="text-xs text-white/30">{f.description}</p>}</div>,
          <span className="text-xs capitalize text-white/50">{f.category}</span>,
          <div className="flex items-center gap-2 min-w-[115px]"><div className="flex-1 max-w-[80px] h-1.5 bg-white/10 rounded-full"><div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${Math.max(0, Math.min(100, f.rollout_pct))}%` }} /></div><span className="text-xs text-white/40">{f.rollout_pct}%</span></div>,
          <button aria-label={`${f.is_enabled ? 'Disable' : 'Enable'} ${f.name}`} onClick={() => toggle(f)} disabled={toggling === f.id} className="relative">
            {toggling === f.id ? <Loader2 className="w-4 h-4 animate-spin text-white/30" /> : f.is_enabled ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-white/20" />}
          </button>,
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-white/50 hover:text-white" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400/60 hover:text-red-400" onClick={() => del(f)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ])}
      />
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>{editing ? 'Edit Feature' : 'New Feature Flag'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && <div><Label className="text-white/60 text-xs">Feature Key *</Label><Input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. new_dashboard_ui" className="bg-white/[0.04] border-white/[0.08] text-white mt-1 font-mono" /></div>}
            <div><Label className="text-white/60 text-xs">Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} maxLength={500} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(category => (
                      <SelectItem key={category} value={category}>{category.replace(/[-_]/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/60 text-xs">Rollout % (0–100)</Label><Input type="number" min={0} max={100} value={form.rolloutPct} onChange={e => setForm(f => ({ ...f, rolloutPct: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value) }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.isEnabled} onCheckedChange={v => setForm(f => ({ ...f, isEnabled: v }))} />
              <Label className="text-white/60 text-sm">Enabled by default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} className="text-white/50">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim() || (!editing && !form.key.trim())} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 8. White Label Tab ──────────────────────────────────────────────────────────
function WhiteLabelTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Whitelabel | null>(null);
  const [form, setForm] = useState({ isEnabled: true, productName: '', primaryColor: '#2563EB', accentColor: '#06B6D4', customDomain: '', supportEmail: '', hidePoweredBy: false, logoUrl: '' });
  const [saving, setSaving] = useState(false);

  const { data: wl = [], isLoading } = useAdminQuery<Whitelabel[]>(['admin-wl'], '/whitelabel');

  const openEdit = (w: Whitelabel) => {
    setEditing(w);
    setForm({ isEnabled: w.is_enabled, productName: w.product_name, primaryColor: w.primary_color, accentColor: w.accent_color, customDomain: w.custom_domain ?? '', supportEmail: w.support_email ?? '', hidePoweredBy: w.hide_powered_by, logoUrl: w.logo_url ?? '' });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminCall(`/whitelabel/${editing.org_id}`, 'PUT', { isEnabled: form.isEnabled, productName: form.productName, primaryColor: form.primaryColor, accentColor: form.accentColor, customDomain: form.customDomain || null, supportEmail: form.supportEmail || null, hidePoweredBy: form.hidePoweredBy, logoUrl: form.logoUrl || null });
      qc.invalidateQueries({ queryKey: ['admin-wl'] });
      setEditing(null);
      toast({ title: 'White label config saved' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader title="White Label Configuration" desc="Customize branding for each tenant" />
      <DataTable loading={isLoading}
        cols={['Organisation', 'Product Name', 'Domain', 'Colors', 'Status', 'Actions']}
        rows={wl.map(w => [
          w.org_name,
          w.product_name,
          w.custom_domain ?? <span className="text-white/30">—</span>,
          <div className="flex gap-1.5">
            <div className="w-4 h-4 rounded" style={{ background: w.primary_color }} title={w.primary_color} />
            <div className="w-4 h-4 rounded" style={{ background: w.accent_color }} title={w.accent_color} />
          </div>,
          <StatusBadge s={w.is_enabled ? 'enabled' : 'disabled'} />,
          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/50 hover:text-white" onClick={() => openEdit(w)}><Pencil className="w-3.5 h-3.5" /></Button>
        ])}
        empty="No white label configurations. Add tenants first."
      />

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white max-w-lg">
          <DialogHeader><DialogTitle>White Label — {editing?.org_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Switch checked={form.isEnabled} onCheckedChange={v => setForm(f => ({ ...f, isEnabled: v }))} /><Label className="text-white/60">Enable white labelling</Label></div>
            <div><Label className="text-white/60 text-xs">Product Name</Label><Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Custom Domain</Label><Input value={form.customDomain} onChange={e => setForm(f => ({ ...f, customDomain: e.target.value }))} placeholder="app.yourbrand.com" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Support Email</Label><Input value={form.supportEmail} onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Primary Color</Label><div className="flex gap-2 mt-1"><Input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-10 h-9 p-1 bg-white/[0.04] border-white/[0.08] rounded-lg cursor-pointer" /><Input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="flex-1 bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm" /></div></div>
              <div><Label className="text-white/60 text-xs">Accent Color</Label><div className="flex gap-2 mt-1"><Input type="color" value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} className="w-10 h-9 p-1 bg-white/[0.04] border-white/[0.08] rounded-lg cursor-pointer" /><Input value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} className="flex-1 bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm" /></div></div>
            </div>
            <div><Label className="text-white/60 text-xs">Logo URL</Label><Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div className="flex items-center gap-3"><Switch checked={form.hidePoweredBy} onCheckedChange={v => setForm(f => ({ ...f, hidePoweredBy: v }))} /><Label className="text-white/60">Hide "Powered by OmniERP"</Label></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} className="text-white/50">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 9. Agencies & Resellers Tab ─────────────────────────────────────────────────
function AgenciesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', contactName: '', contactEmail: '', country: '', commissionRate: '10' });
  const [saving, setSaving] = useState(false);

  const { data: agencies = [], isLoading } = useAdminQuery<Agency[]>(['admin-agencies'], '/agencies');

  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', contactName: '', contactEmail: '', country: '', commissionRate: '10' }); setDialog(true); };
  const openEdit = (a: Agency) => { setEditing(a); setForm({ name: a.name, slug: a.slug, contactName: a.contact_name ?? '', contactEmail: a.contact_email ?? '', country: a.country ?? '', commissionRate: String(a.commission_rate) }); setDialog(true); };

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: form.name, slug: form.slug || undefined, contactName: form.contactName || null, contactEmail: form.contactEmail || null, country: form.country || null, commissionRate: parseFloat(form.commissionRate) || 10 };
      if (!editing) await adminCall('/agencies', 'POST', body);
      else await adminCall(`/agencies/${editing.id}`, 'PUT', { ...body, status: 'active' });
      qc.invalidateQueries({ queryKey: ['admin-agencies'] });
      setDialog(false);
      toast({ title: editing ? 'Agency updated' : 'Agency created' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader title="Agencies & Resellers" desc="Manage reseller partners and commission structure" action={
        <Button size="sm" onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"><Plus className="w-4 h-4 mr-1" />Add Agency</Button>
      } />
      <DataTable loading={isLoading}
        cols={['Agency', 'Contact', 'Country', 'Commission', 'Clients', 'Total Commission', 'Status', 'Actions']}
        rows={agencies.map(a => [
          <div><p className="font-medium text-white/80">{a.name}</p><p className="text-xs text-white/30 font-mono">{a.slug}</p></div>,
          <div><p className="text-white/70">{a.contact_name ?? '—'}</p><p className="text-xs text-white/30">{a.contact_email ?? ''}</p></div>,
          a.country ?? '—',
          `${a.commission_rate}%`,
          a.client_count,
          a.total_commission ? `$${parseFloat(a.total_commission).toFixed(2)}` : '$0.00',
          <StatusBadge s={a.status} />,
          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/50 hover:text-white" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
        ])}
        empty="No agencies registered yet."
      />
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>{editing ? 'Edit Agency' : 'New Agency / Reseller'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-white/60 text-xs">Agency Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            {!editing && <div><Label className="text-white/60 text-xs">Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated if empty" className="bg-white/[0.04] border-white/[0.08] text-white mt-1 font-mono" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Contact Name</Label><Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Contact Email</Label><Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Commission Rate (%)</Label><Input type="number" min={0} max={100} value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} className="text-white/50">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 10. Integrations Tab ────────────────────────────────────────────────────────
function IntegrationsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [testing, setTesting] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const { data: integrations = [], isLoading } = useAdminQuery<Integration[]>(['admin-integrations'], '/integrations');

  const toggle = async (int: Integration) => {
    setUpdating(int.id);
    try {
      await adminCall(`/integrations/${int.id}`, 'PUT', { isEnabled: !int.is_enabled, status: !int.is_enabled ? 'active' : 'inactive', config: int.config });
      qc.invalidateQueries({ queryKey: ['admin-integrations'] });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setUpdating(null);
  };

  const test = async (int: Integration) => {
    setTesting(int.id);
    try {
      const r = await adminCall(`/integrations/${int.id}/test`, 'POST');
      toast({ title: 'Test complete', description: (r as { data: { message: string } }).data?.message ?? 'Connection tested' });
    } catch (e: unknown) { toast({ title: 'Test failed', description: (e as Error).message, variant: 'destructive' }); }
    setTesting(null);
  };

  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <div>
      <SectionHeader title="Integrations" desc="Manage third-party service connections" />
      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">{cat}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {integrations.filter(i => i.category === cat).map(int => (
                  <Card key={int.id} className="bg-[#0a0f1e] border-white/[0.07]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-white/80">{int.name}</p>
                          <StatusBadge s={int.status} />
                        </div>
                        <Switch checked={int.is_enabled} onCheckedChange={() => toggle(int)} disabled={updating === int.id} />
                      </div>
                      {int.last_tested_at && <p className="text-xs text-white/30">Last tested: {fmtDateTime(int.last_tested_at)}</p>}
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => test(int)} disabled={testing === int.id} className="text-white/50 hover:text-white text-xs h-7">
                          {testing === int.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Activity className="w-3 h-3 mr-1" />}Validate Configuration
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {!integrations.length && <p className="text-center text-white/30 text-sm py-8">No integrations configured.</p>}
        </div>
      )}
    </div>
  );
}

// ── 11. Security Settings Tab ───────────────────────────────────────────────────
function SecurityTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAdminQuery<{ settings: Record<string, string>; recentAttempts: Array<{ username: string; ip_address: string; success: boolean; attempted_at: string }> }>(['admin-security'], '/security');
  const [form, setForm] = useState({ maxLoginAttempts: 5, lockoutMinutes: 15, sessionHours: 24 });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync settings from API once loaded
  if (data?.settings && !initialized && !saving) {
    const s = data.settings;
    setForm({
      maxLoginAttempts: parseInt(s.max_login_attempts ?? '5') || 5,
      lockoutMinutes: parseInt(s.lockout_minutes ?? '15') || 15,
      sessionHours: parseInt(s.session_hours ?? '24') || 24,
    });
    setInitialized(true);
  }

  const save = async () => {
    setSaving(true);
    try { await adminCall('/security', 'PUT', form); qc.invalidateQueries({ queryKey: ['admin-security'] }); toast({ title: 'Security settings saved' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#0a0f1e] border-white/[0.07]">
        <CardHeader><CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2"><Lock className="w-4 h-4" />Security Policy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white/30" /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white/60 text-xs">Max Login Attempts</Label>
                  <Input type="number" min={1} max={20} value={form.maxLoginAttempts} onChange={e => setForm(f => ({ ...f, maxLoginAttempts: parseInt(e.target.value) || 5 }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" />
                  <p className="text-xs text-white/30 mt-1">Before lockout</p>
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Lockout Duration (minutes)</Label>
                  <Input type="number" min={1} value={form.lockoutMinutes} onChange={e => setForm(f => ({ ...f, lockoutMinutes: parseInt(e.target.value) || 15 }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Session Duration (hours)</Label>
                  <Input type="number" min={1} max={168} value={form.sessionHours} onChange={e => setForm(f => ({ ...f, sessionHours: parseInt(e.target.value) || 24 }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Policy'}</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <SectionHeader title="Recent Login Attempts" desc="Last 20 admin login attempts" />
        <DataTable
          cols={['Username', 'IP Address', 'Result', 'Time']}
          rows={(data?.recentAttempts ?? []).map(a => [
            a.username,
            <span className="font-mono text-xs">{a.ip_address}</span>,
            a.success ? <div className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Success</div> : <div className="flex items-center gap-1.5 text-red-400 text-xs"><XCircle className="w-3.5 h-3.5" />Failed</div>,
            fmtDateTime(a.attempted_at),
          ])}
          empty="No login attempts recorded."
        />
      </div>
    </div>
  );
}

// ── 12. Audit Logs Tab ──────────────────────────────────────────────────────────
function AuditLogsTab() {
  const [resource, setResource] = useState('all');
  const [view, setView] = useState<'admin' | 'app'>('admin');

  const q = resource !== 'all' ? `?resource=${resource}` : '';
  const { data, isLoading } = useAdminQuery<{ adminLogs: unknown[]; appLogs: unknown[] }>(['admin-audit', resource], `/audit-logs${q}`);

  type AdminLog = { id: number; admin_username: string; action: string; resource: string; resource_id: string | null; ip_address: string; created_at: string };
  type AppLog = { id: number; user_email: string | null; action: string; module: string; status: string; created_at: string };

  const adminLogs = (data?.adminLogs ?? []) as AdminLog[];
  const appLogs = (data?.appLogs ?? []) as AppLog[];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['admin', 'app'] as const).map(t => (
            <button key={t} onClick={() => setView(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === t ? 'bg-[#2563EB]/20 text-[#2563EB]' : 'text-white/40 hover:text-white/70'}`}>{t === 'admin' ? 'Admin Audit' : 'App Activity'}</button>
          ))}
        </div>
        {view === 'admin' && (
          <Select value={resource} onValueChange={setResource}>
            <SelectTrigger className="w-40 bg-white/[0.03] border-white/[0.08] text-white/70 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="tenant">Tenants</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="plan">Plans</SelectItem>
              <SelectItem value="license">Licenses</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {view === 'admin' && (
        <DataTable loading={isLoading}
          cols={['Admin', 'Action', 'Resource', 'Resource ID', 'IP', 'Time']}
          rows={adminLogs.map(l => [
            <span className="font-medium text-white/80">{l.admin_username}</span>,
            <span className="font-mono text-xs text-yellow-400">{l.action}</span>,
            <span className="text-xs capitalize">{l.resource}</span>,
            l.resource_id ?? '—',
            <span className="font-mono text-xs text-white/40">{l.ip_address}</span>,
            fmtDateTime(l.created_at),
          ])}
          empty="No admin audit logs."
        />
      )}

      {view === 'app' && (
        <DataTable loading={isLoading}
          cols={['User', 'Action', 'Module', 'Status', 'Time']}
          rows={appLogs.map(l => [
            l.user_email ?? <span className="text-white/30">System</span>,
            <span className="font-mono text-xs text-blue-400">{l.action}</span>,
            l.module,
            <StatusBadge s={l.status ?? 'success'} />,
            fmtDateTime(l.created_at),
          ])}
          empty="No app activity logs."
        />
      )}
    </div>
  );
}

// ── 13. Usage Analytics Tab ─────────────────────────────────────────────────────
function AnalyticsTab() {
  const [period, setPeriod] = useState<'30' | '90' | '365' | 'all'>('365');
  const { data, isLoading, isFetching, refetch } = useAdminQuery<{
    period: string;
    summary: { tenants: number; users: number; active_users: number; active_subscriptions: number; monthly_revenue: string; tracked_actions: number };
    orgStats: Array<{ status: string; count: number }>;
    userStats: Array<{ status: string; count: number }>;
    moduleStats: Array<{ action: string; count: number }>;
    subByPlan: Array<{ plan_name: string; count: number; revenue: string }>;
    revenueByMonth: Array<{ month: string; mrr: string; new_subs: number }>;
  }>(['admin-analytics', period], `/analytics?period=${period}`);

  const COLORS = ['#2563EB', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
  const revChart = (data?.revenueByMonth ?? []).map(r => ({ month: r.month, mrr: parseFloat(r.mrr), subs: r.new_subs }));
  const planChart = (data?.subByPlan ?? []).map(r => ({ ...r, revenue: parseFloat(r.revenue) }));
  const maxActionCount = Math.max(1, data?.moduleStats?.[0]?.count ?? 0);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Reporting period', period === 'all' ? 'All time' : `Last ${period} days`],
      ['Total tenants', String(data.summary.tenants)],
      ['Total users', String(data.summary.users)],
      ['Active users', String(data.summary.active_users)],
      ['Active subscriptions', String(data.summary.active_subscriptions)],
      ['Monthly revenue', data.summary.monthly_revenue],
      ['Tracked actions', String(data.summary.tracked_actions)],
      [],
      ['Top action', 'Count'],
      ...(data.moduleStats ?? []).map(action => [action.action, String(action.count)]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `omnierp-usage-analytics-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Usage Analytics" desc="Monitor platform adoption, activity, and subscription performance" action={
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={value => setPeriod(value as typeof period)}>
            <SelectTrigger className="w-36 bg-white/[0.04] border-white/[0.08] text-white/70 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="text-white/50 hover:text-white">
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!data} className="border-white/[0.1] text-white/60 hover:text-white">
            <Download className="w-4 h-4 mr-1" />Export CSV
          </Button>
        </div>
      } />
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>}
      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPI icon={Building2} label="Total Tenants" value={data.summary.tenants} color="text-blue-400" />
            <KPI icon={Users} label="Total Users" value={data.summary.users} sub={`${data.summary.active_users} active`} color="text-purple-400" />
            <KPI icon={Activity} label="Tracked Actions" value={fmt(data.summary.tracked_actions)} color="text-cyan-400" />
            <KPI icon={CreditCard} label="Active Subscriptions" value={data.summary.active_subscriptions} color="text-emerald-400" />
            <KPI icon={DollarSign} label="Monthly Revenue" value={`$${fmt(parseFloat(data.summary.monthly_revenue))}`} color="text-orange-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-[#0a0f1e] border-white/[0.07]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Tenant Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={data?.orgStats ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60} label={({ status, percent }) => `${status} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {(data?.orgStats ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-[#0a0f1e] border-white/[0.07]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">User Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={data.userStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60} label={({ status, percent }) => `${status} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.userStats.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie><Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-[#0a0f1e] border-white/[0.07]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Revenue by Plan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={planChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="plan_name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => [`$${v}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-[#0a0f1e] border-white/[0.07]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Top Module Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.moduleStats ?? []).slice(0, 6).map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-white/40 w-24 truncate">{m.action}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (m.count / maxActionCount) * 100)}%`, background: COLORS[i % COLORS.length] }} /></div>
                    <span className="text-xs text-white/40 w-8 text-right">{m.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#0a0f1e] border-white/[0.07]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">MRR & New Subscriptions ({period === 'all' ? 'all time' : period === '365' ? '12 months' : `${period} days`})</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="mrr" name="MRR ($)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="subs" name="New Subs" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── 14. Backup & Restore Tab ────────────────────────────────────────────────────
function BackupTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: 'full', notes: '' });

  const { data: backups = [], isLoading } = useAdminQuery<Backup[]>(['admin-backups'], '/backups');

  const create = async () => {
    setCreating(true);
    try {
      const r = await adminCall('/backups', 'POST', form);
      qc.invalidateQueries({ queryKey: ['admin-backups'] });
      toast({ title: 'Backup initiated', description: `Name: ${(r as { data: { name: string } }).data?.name}` });
      setTimeout(() => qc.invalidateQueries({ queryKey: ['admin-backups'] }), 4000);
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setCreating(false);
  };

  const del = async (b: Backup) => {
    if (!confirm('Delete this backup record?')) return;
    try { await adminCall(`/backups/${b.id}`, 'DELETE'); qc.invalidateQueries({ queryKey: ['admin-backups'] }); toast({ title: 'Backup deleted' }); }
    catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  };

  function fmtSize(bytes: number | null) {
    if (!bytes) return '—';
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[#0a0f1e] border-white/[0.07]">
        <CardHeader><CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2"><Download className="w-4 h-4" />Initiate Backup</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-white/60 text-xs">Backup Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="w-36 bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="full">Full</SelectItem><SelectItem value="schema">Schema Only</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-white/60 text-xs">Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for backup…" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" />
            </div>
            <Button onClick={create} disabled={creating} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Database className="w-4 h-4 mr-1" />}Start Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      <SectionHeader title="Backup History" desc="Recent backup records" />
      <DataTable loading={isLoading}
        cols={['Name', 'Type', 'Status', 'Size', 'Initiated By', 'Started', 'Completed', 'Actions']}
        rows={backups.map(b => [
          <span className="font-mono text-xs text-white/50">{b.backup_name}</span>,
          <span className="capitalize text-xs">{b.type}</span>,
          <StatusBadge s={b.status} />,
          fmtSize(b.size_bytes),
          b.initiated_by,
          fmtDateTime(b.started_at),
          fmtDateTime(b.completed_at),
          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400/60 hover:text-red-400" onClick={() => del(b)}><Trash2 className="w-3.5 h-3.5" /></Button>
        ])}
        empty="No backup records yet."
      />
    </div>
  );
}

// ── 15. Notifications Tab ───────────────────────────────────────────────────────
function NotificationsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', body: '', type: 'system' });
  const [sending, setSending] = useState(false);

  const { data: notifications = [], isLoading } = useAdminQuery<Notification[]>(['admin-notifs'], '/notifications');

  const broadcast = async () => {
    if (!form.title) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const r = await adminCall('/notifications/broadcast', 'POST', form);
      qc.invalidateQueries({ queryKey: ['admin-notifs'] });
      toast({ title: 'Broadcast sent', description: `Delivered to ${(r as { data: { sent: number } }).data?.sent ?? 0} users` });
      setForm({ title: '', body: '', type: 'system' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSending(false);
  };

  return (
    <div className="space-y-5">
      <Card className="bg-[#0a0f1e] border-white/[0.07]">
        <CardHeader><CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2"><Send className="w-4 h-4" />Broadcast Notification</CardTitle><CardDescription className="text-white/30 text-xs">Send a notification to all active users</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label className="text-white/60 text-xs">Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" placeholder="Notification title" /></div>
            <div><Label className="text-white/60 text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="system">System</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="announcement">Announcement</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-white/60 text-xs">Message</Label><Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1 resize-none" rows={2} placeholder="Optional message body" /></div>
          <div className="flex justify-end">
            <Button onClick={broadcast} disabled={sending || !form.title} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bell className="w-4 h-4 mr-1" />}Send to All Users
            </Button>
          </div>
        </CardContent>
      </Card>

      <SectionHeader title="Recent Notifications" desc="Last 100 platform notifications" />
      <DataTable loading={isLoading}
        cols={['User', 'Type', 'Title', 'Body', 'Read', 'Sent']}
        rows={notifications.map(n => [
          n.target_email ?? `User #${n.user_id}`,
          <span className="text-xs capitalize text-white/50">{n.type}</span>,
          n.title,
          n.body ? <span className="text-xs text-white/40 max-w-[200px] truncate block">{n.body}</span> : '—',
          n.is_read ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-white/30" />,
          fmtDateTime(n.created_at),
        ])}
        empty="No notifications sent yet."
      />
    </div>
  );
}

// ── 16. Support Tickets Tab ─────────────────────────────────────────────────────
function SupportTicketsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusF, setStatusF] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [upForm, setUpForm] = useState({ status: '', priority: '', assignedTo: '', resolution: '' });
  const [createForm, setCreateForm] = useState({ subject: '', description: '', reporterName: '', reporterEmail: '', priority: 'medium', category: 'general' });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDlg, setCreateDlg] = useState(false);

  const q = statusF !== 'all' ? `?status=${statusF}` : '';
  const { data: tickets = [], isLoading } = useAdminQuery<Ticket[]>(['admin-tickets', statusF], `/support-tickets${q}`);

  const openEdit = (t: Ticket) => { setEditing(t); setUpForm({ status: t.status, priority: t.priority, assignedTo: t.assigned_to ?? '', resolution: t.resolution ?? '' }); setDialog(true); };

  const update = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminCall(`/support-tickets/${editing.id}`, 'PUT', { status: upForm.status, priority: upForm.priority, assignedTo: upForm.assignedTo || null, resolution: upForm.resolution || null });
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      setDialog(false);
      toast({ title: 'Ticket updated' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  const create = async () => {
    setCreating(true);
    try {
      const r = await adminCall('/support-tickets', 'POST', createForm);
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      setCreateDlg(false);
      toast({ title: 'Ticket created', description: `#${(r as { data: { ticketNumber: string } }).data?.ticketNumber}` });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setCreating(false);
  };

  return (
    <div>
      <SectionHeader title="Support Tickets" desc="Platform-wide support requests" action={
        <div className="flex gap-2">
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white/70 text-sm h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
          </Select>
          <Button size="sm" onClick={() => setCreateDlg(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"><Plus className="w-4 h-4 mr-1" />New Ticket</Button>
        </div>
      } />
      <DataTable loading={isLoading}
        cols={['Ticket #', 'Subject', 'Tenant', 'Reporter', 'Priority', 'Status', 'Created', 'Actions']}
        rows={tickets.map(t => [
          <span className="font-mono text-xs text-white/50">{t.ticket_number}</span>,
          <span className="text-white/80 max-w-[150px] truncate block">{t.subject}</span>,
          t.org_name ?? '—',
          t.reporter_name ?? t.reporter_email ?? '—',
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[t.priority] ?? 'bg-white/10 text-white/60'}`}>{t.priority}</span>,
          <StatusBadge s={t.status} />,
          fmtDate(t.created_at),
          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/50 hover:text-white" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
        ])}
        empty="No support tickets."
      />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>Update Ticket — {editing?.ticket_number}</DialogTitle><DialogDescription className="text-white/40">{editing?.subject}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Status</Label>
                <Select value={upForm.status} onValueChange={v => setUpForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/60 text-xs">Priority</Label>
                <Select value={upForm.priority} onValueChange={v => setUpForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-white/60 text-xs">Assigned To</Label><Input value={upForm.assignedTo} onChange={e => setUpForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Username" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Resolution</Label><Textarea value={upForm.resolution} onChange={e => setUpForm(f => ({ ...f, resolution: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1 resize-none" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} className="text-white/50">Cancel</Button>
            <Button onClick={update} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDlg} onOpenChange={setCreateDlg}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-white/60 text-xs">Subject *</Label><Input value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            <div><Label className="text-white/60 text-xs">Description</Label><Textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1 resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Reporter Name</Label><Input value={createForm.reporterName} onChange={e => setCreateForm(f => ({ ...f, reporterName: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              <div><Label className="text-white/60 text-xs">Reporter Email</Label><Input value={createForm.reporterEmail} onChange={e => setCreateForm(f => ({ ...f, reporterEmail: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/60 text-xs">Priority</Label>
                <Select value={createForm.priority} onValueChange={v => setCreateForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/60 text-xs">Category</Label>
                <Select value={createForm.category} onValueChange={v => setCreateForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="feature">Feature Request</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDlg(false)} className="text-white/50">Cancel</Button>
            <Button onClick={create} disabled={creating || !createForm.subject} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 17. System Health Tab ───────────────────────────────────────────────────────
function HealthTab() {
  const { data, isLoading, refetch, isFetching } = useAdminQuery<{
    status: string; timestamp: string; dbConnected: boolean; dbLatencyMs: number;
    serverUptimeSeconds: number; memoryMb: { rss: number; heapUsed: number; heapTotal: number };
    tableStats: Array<{ tablename: string; n_live_tup: number }>;
    nodeVersion: string;
  }>(['admin-health'], '/health');

  function fmtUptime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${data?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-white font-medium capitalize">{data?.status ?? 'checking…'}</span>
          {data?.timestamp && <span className="text-xs text-white/30">{fmtDateTime(data.timestamp)}</span>}
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="text-white/50 hover:text-white">
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={Activity} label="DB Status" value={data?.dbConnected ? 'Connected' : 'Disconnected'} color={data?.dbConnected ? 'text-emerald-400' : 'text-red-400'} />
            <KPI icon={Clock} label="DB Latency" value={`${data?.dbLatencyMs ?? 0}ms`} color="text-blue-400" />
            <KPI icon={Server} label="Server Uptime" value={fmtUptime(data?.serverUptimeSeconds ?? 0)} color="text-purple-400" />
            <KPI icon={Zap} label="Node Version" value={data?.nodeVersion ?? '—'} color="text-yellow-400" />
          </div>

          <Card className="bg-[#0a0f1e] border-white/[0.07]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Memory Usage</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Heap Used', used: data?.memoryMb.heapUsed ?? 0, total: data?.memoryMb.heapTotal ?? 1 },
                  { label: 'RSS', used: data?.memoryMb.rss ?? 0, total: 512 },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs text-white/40 mb-1"><span>{m.label}</span><span>{m.used} / {m.total} MB</span></div>
                    <div className="h-2 bg-white/[0.05] rounded-full"><div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${Math.min(100, (m.used / m.total) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <SectionHeader title="Database Table Stats" desc="Row counts for top tables" />
            <DataTable
              cols={['Table Name', 'Live Rows']}
              rows={(data?.tableStats ?? []).map(t => [
                <span className="font-mono text-xs text-white/60">{t.tablename}</span>,
                <span>{t.n_live_tup.toLocaleString()}</span>
              ])}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── 18. Global Settings Tab ─────────────────────────────────────────────────────
function GlobalSettingsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { admin, logout } = useAdminAuth();
  const { data: settings = [], isLoading } = useAdminQuery<SystemSetting[]>(['admin-settings'], '/settings');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [adding, setAdding] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    currentUsername: admin?.username ?? '',
    currentPassword: '',
    newUsername: admin?.username ?? '',
    newPassword: '',
    confirmPassword: '',
  });
  const [credentialSaving, setCredentialSaving] = useState(false);

  const cats = [...new Set(settings.map(s => s.category))];

  const save = async () => {
    setSaving(true);
    try {
      const updated = Object.entries(edits).map(([key, value]) => ({ key, value }));
      if (!updated.length) { toast({ title: 'No changes to save' }); setSaving(false); return; }
      await adminCall('/settings', 'PUT', { settings: updated });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setEdits({});
      toast({ title: 'Settings saved' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  const addNew = async () => {
    if (!newKey || !newVal) return;
    setAdding(true);
    try {
      await adminCall('/settings', 'PUT', { settings: [{ key: newKey, value: newVal }] });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setNewKey(''); setNewVal('');
      toast({ title: 'Setting added' });
    } catch (e: unknown) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setAdding(false);
  };

  const changeCredentials = async () => {
    if (credentialForm.newPassword !== credentialForm.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (credentialForm.newPassword.length < 12) {
      toast({ title: 'New password must be at least 12 characters', variant: 'destructive' });
      return;
    }
    setCredentialSaving(true);
    try {
      await adminCall('/auth/credentials', 'PATCH', {
        currentUsername: credentialForm.currentUsername,
        currentPassword: credentialForm.currentPassword,
        newUsername: credentialForm.newUsername,
        newPassword: credentialForm.newPassword,
      });
      toast({ title: 'Admin credentials changed', description: 'All existing admin sessions were revoked. Sign in again with the new credentials.' });
      logout();
    } catch (e: unknown) {
      toast({ title: 'Credential change failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCredentialSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
        <>
          {cats.map(cat => (
            <Card key={cat} className="bg-[#0a0f1e] border-white/[0.07]">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-white/60 uppercase tracking-widest">{cat}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {settings.filter(s => s.category === cat).map(s => (
                  <div key={s.key} className="grid grid-cols-3 gap-3 items-start">
                    <div>
                      <p className="text-sm font-mono text-white/60">{s.key}</p>
                      {s.description && <p className="text-xs text-white/30">{s.description}</p>}
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={edits[s.key] ?? s.value}
                        onChange={e => setEdits(prev => ({ ...prev, [s.key]: e.target.value }))}
                        className={`bg-white/[0.04] border-white/[0.08] text-white text-sm ${edits[s.key] !== undefined && edits[s.key] !== s.value ? 'border-[#2563EB]/50' : ''}`}
                      />
                      {s.updated_by && <p className="text-xs text-white/20 mt-1">Last: {s.updated_by} · {fmtDate(s.updated_at)}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card className="bg-[#0a0f1e] border-white/[0.07]">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-white/60">Add New Setting</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="setting_key" className="flex-1 bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm" />
                <Input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="value" className="flex-1 bg-white/[0.04] border-white/[0.08] text-white text-sm" />
                <Button onClick={addNew} disabled={adding || !newKey || !newVal} size="sm" className="bg-white/[0.06] hover:bg-white/[0.1] text-white"><Plus className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>

          {Object.keys(edits).length > 0 && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save {Object.keys(edits).length} Change{Object.keys(edits).length !== 1 ? 's' : ''}
              </Button>
            </div>
          )}

          <Card className="bg-[#0a0f1e] border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" />Admin Credential Management</CardTitle>
              <CardDescription className="text-xs text-white/40">Re-enter the current credentials before changing the admin username or password. Every existing admin session will be revoked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label className="text-white/60 text-xs">Current Username</Label><Input value={credentialForm.currentUsername} onChange={e => setCredentialForm(f => ({ ...f, currentUsername: e.target.value }))} autoComplete="username" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
                <div><Label className="text-white/60 text-xs">Current Password</Label><Input type="password" value={credentialForm.currentPassword} onChange={e => setCredentialForm(f => ({ ...f, currentPassword: e.target.value }))} autoComplete="current-password" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
                <div><Label className="text-white/60 text-xs">New Username</Label><Input value={credentialForm.newUsername} onChange={e => setCredentialForm(f => ({ ...f, newUsername: e.target.value }))} autoComplete="username" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
                <div><Label className="text-white/60 text-xs">New Password</Label><Input type="password" value={credentialForm.newPassword} onChange={e => setCredentialForm(f => ({ ...f, newPassword: e.target.value }))} autoComplete="new-password" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
                <div><Label className="text-white/60 text-xs">Confirm New Password</Label><Input type="password" value={credentialForm.confirmPassword} onChange={e => setCredentialForm(f => ({ ...f, confirmPassword: e.target.value }))} autoComplete="new-password" className="bg-white/[0.04] border-white/[0.08] text-white mt-1" /></div>
              </div>
              <div className="flex justify-end">
                <Button onClick={changeCredentials} disabled={credentialSaving || !credentialForm.currentUsername || !credentialForm.currentPassword || !credentialForm.newUsername || !credentialForm.newPassword} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {credentialSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />}Change Admin Credentials
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Main Admin Panel ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',    label: 'Dashboard',          icon: LayoutDashboard,   comp: DashboardTab },
  { id: 'tenants',      label: 'Tenants',            icon: Building2,         comp: TenantsTab },
  { id: 'users',        label: 'Users & Roles',      icon: Users,             comp: UsersRolesTab },
  { id: 'plans',        label: 'Plans & Subs',       icon: CreditCard,        comp: PlansSubsTab },
  { id: 'billing',      label: 'Billing',            icon: DollarSign,        comp: BillingTab },
  { id: 'licenses',     label: 'Licenses',           icon: Key,               comp: LicensesTab },
  { id: 'features',     label: 'Features',           icon: Zap,               comp: FeaturesTab },
  { id: 'whitelabel',   label: 'White Label',        icon: Palette,           comp: WhiteLabelTab },
  { id: 'agencies',     label: 'Agencies',           icon: Briefcase,         comp: AgenciesTab },
  { id: 'integrations', label: 'Integrations',       icon: Plug,              comp: IntegrationsTab },
  { id: 'security',     label: 'Security',           icon: Lock,              comp: SecurityTab },
  { id: 'audit',        label: 'Audit Logs',         icon: FileText,          comp: AuditLogsTab },
  { id: 'analytics',    label: 'Analytics',          icon: BarChart3,         comp: AnalyticsTab },
  { id: 'backups',      label: 'Backups',            icon: Database,          comp: BackupTab },
  { id: 'notifications',label: 'Notifications',     icon: Bell,              comp: NotificationsTab },
  { id: 'tickets',      label: 'Support Tickets',    icon: HeadphonesIcon,    comp: SupportTicketsTab },
  { id: 'health',       label: 'System Health',      icon: Activity,          comp: HealthTab },
  { id: 'settings',     label: 'Global Settings',    icon: Settings,          comp: GlobalSettingsTab },
] as const;

export default function AdminPanel() {
  const { admin, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const ActiveComp = TABS.find(t => t.id === activeTab)?.comp ?? DashboardTab;

  return (
    <AdminLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* Admin Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin Panel</h1>
              <p className="text-xs text-white/30">Logged in as <span className="text-red-400">{admin?.username}</span></p>
            </div>
          </div>
          <Button onClick={logout} size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10">
            <LogOutIcon className="w-4 h-4 mr-1.5" />Sign Out Admin
          </Button>
        </div>

        {/* Tab layout */}
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Sidebar nav */}
          <div className="w-44 shrink-0">
            <ScrollArea className="h-full">
              <nav className="space-y-0.5 pr-2">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                      activeTab === tab.id
                        ? 'bg-red-500/10 text-red-400 font-medium'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <ActiveComp />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
