import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock, Check, Clipboard, Edit2, KeyRound, Loader2, Plus,
  RefreshCw, Search, ShieldCheck, Trash2, Users, XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const api = (path: string) => `${BASE}/api${path}`;

function authFetch(url: string, init: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...init, headers });
}

type LicenseStatus = 'active' | 'suspended' | 'revoked' | 'expired';
type LicenseType = 'subscription' | 'perpetual' | 'trial';

interface License {
  id: number;
  licenseKey: string;
  orgId: number;
  orgName: string | null;
  planId: number;
  planName: string | null;
  planSlug: string | null;
  licenseType: LicenseType;
  status: LicenseStatus;
  issuedAt: string;
  expiresAt: string | null;
  maxSeats: number;
  usedSeats: number;
  activationLimit: number;
  activationCount: number;
  lastActivatedAt: string | null;
  features: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Metrics {
  total: number;
  active: number;
  expiring: number;
  revoked: number;
  assignedSeats: number;
  seatCapacity: number;
}

interface TenantOption { id: number; name: string; }
interface PlanOption { id: number; name: string; slug: string; }

const STATUS_STYLES: Record<LicenseStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  revoked: 'bg-red-500/15 text-red-400 border-red-500/20',
  expired: 'bg-white/10 text-white/40 border-white/10',
};

const EMPTY_FORM = {
  orgId: '',
  planId: '',
  licenseType: 'subscription' as LicenseType,
  durationDays: '365',
  maxSeats: '10',
  activationLimit: '1',
  notes: '',
};

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpiring(license: License) {
  if (!license.expiresAt || license.status !== 'active') return false;
  const days = (new Date(license.expiresAt).getTime() - Date.now()) / 86400000;
  return days >= 0 && days <= 30;
}

function useLicenses() {
  return useQuery({
    queryKey: ['saas-licenses'],
    queryFn: async () => {
      const response = await authFetch(api('/saas/licenses'));
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to load licenses');
      return json.data as License[];
    },
  });
}

function useLicenseMetrics() {
  return useQuery({
    queryKey: ['saas-license-metrics'],
    queryFn: async () => {
      const response = await authFetch(api('/saas/licenses/metrics'));
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to load license metrics');
      return json.data as Metrics;
    },
  });
}

function LicenseForm({
  initial,
  tenants,
  plans,
  onClose,
  onSave,
  saving,
}: {
  initial: License | null;
  tenants: TenantOption[];
  plans: PlanOption[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => initial ? {
    orgId: String(initial.orgId),
    planId: String(initial.planId),
    licenseType: initial.licenseType,
    durationDays: '',
    maxSeats: String(initial.maxSeats),
    activationLimit: String(initial.activationLimit),
    notes: initial.notes ?? '',
  } : EMPTY_FORM);
  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="w-full max-w-xl bg-[#0b1120] border border-white/[0.1] rounded-2xl shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div>
            <h2 className="text-lg font-semibold text-white">{initial ? 'Edit license' : 'Issue new license'}</h2>
            <p className="text-xs text-white/40 mt-1">{initial ? 'Update entitlements and lifecycle settings.' : 'Create a license key for a subscribed tenant.'}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <label className="col-span-2 text-xs text-white/50">Tenant
            <select disabled={!!initial} value={form.orgId} onChange={(e) => set('orgId', e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white disabled:opacity-50">
              <option value="">Select tenant</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs text-white/50">Plan
            <select value={form.planId} onChange={(e) => set('planId', e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white">
              <option value="">Select plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">License type
            <select value={form.licenseType} onChange={(e) => set('licenseType', e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white">
              <option value="subscription">Subscription</option>
              <option value="perpetual">Perpetual</option>
              <option value="trial">Trial</option>
            </select>
          </label>
          <label className="text-xs text-white/50">Duration (days)
            <Input type="number" min="1" placeholder={initial ? 'Leave unchanged' : '365'} value={form.durationDays}
              onChange={(e) => set('durationDays', e.target.value)} disabled={!!initial}
              className="mt-1 h-9 bg-white/[0.04] border-white/[0.1] text-white disabled:opacity-50" />
          </label>
          <label className="text-xs text-white/50">Seat capacity
            <Input type="number" min="1" value={form.maxSeats} onChange={(e) => set('maxSeats', e.target.value)}
              className="mt-1 h-9 bg-white/[0.04] border-white/[0.1] text-white" />
          </label>
          <label className="text-xs text-white/50">Activation limit
            <Input type="number" min="1" value={form.activationLimit} onChange={(e) => set('activationLimit', e.target.value)}
              className="mt-1 h-9 bg-white/[0.04] border-white/[0.1] text-white" />
          </label>
          <label className="col-span-2 text-xs text-white/50">Notes
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
              className="mt-1 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563EB]"
              placeholder="Internal notes about this entitlement…" />
          </label>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-white/[0.07]">
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60">Cancel</Button>
          <Button disabled={saving || !form.orgId || !form.planId} onClick={() => onSave({
            orgId: Number(form.orgId), planId: Number(form.planId), licenseType: form.licenseType,
            ...(form.durationDays ? { durationDays: Number(form.durationDays) } : {}),
            maxSeats: Number(form.maxSeats), activationLimit: Number(form.activationLimit), notes: form.notes,
          })} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}{initial ? 'Save changes' : 'Issue license'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LicenseManagementTab() {
  const { data: licenses = [], isLoading, isError } = useLicenses();
  const { data: metrics } = useLicenseMetrics();
  const { data: tenants = [] } = useQuery({
    queryKey: ['saas-tenants'],
    queryFn: async () => (await (await authFetch(api('/saas/tenants'))).json()).data as TenantOption[],
  });
  const { data: plans = [] } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => (await (await authFetch(api('/saas/plans'))).json()).data as PlanOption[],
  });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | LicenseStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [editLicense, setEditLicense] = useState<License | null>(null);

  const filtered = useMemo(() => licenses.filter((license) => {
    const text = `${license.licenseKey} ${license.orgName ?? ''} ${license.planName ?? ''}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (status === 'all' || license.status === status);
  }), [licenses, search, status]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['saas-licenses'] });
    qc.invalidateQueries({ queryKey: ['saas-license-metrics'] });
  };
  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editLicense ? api(`/saas/licenses/${editLicense.id}`) : api('/saas/licenses');
      const response = await authFetch(url, { method: editLicense ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save license');
      return json;
    },
    onSuccess: () => { setShowForm(false); setEditLicense(null); refresh(); toast({ title: editLicense ? 'License updated' : 'License issued' }); },
    onError: (error: Error) => toast({ title: 'Could not save license', description: error.message, variant: 'destructive' }),
  });
  const action = useMutation({
    mutationFn: async ({ id, action: actionName, nextStatus }: { id: number; action: 'renew' | 'status'; nextStatus?: LicenseStatus }) => {
      const url = actionName === 'renew' ? `/saas/licenses/${id}/renew` : `/saas/licenses/${id}/status`;
      const body = actionName === 'renew' ? { days: 30 } : { status: nextStatus ?? 'revoked' };
      const response = await authFetch(api(url), { method: actionName === 'renew' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'License action failed');
      return actionName;
    },
    onSuccess: (actionName, variables) => {
      refresh();
      toast({ title: actionName === 'renew' ? 'License renewed for 30 days' : `License ${variables.nextStatus ?? 'revoked'}` });
    },
    onError: (error: Error) => toast({ title: 'License action failed', description: error.message, variant: 'destructive' }),
  });

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast({ title: 'License key copied' });
  };

  const cards = [
    { label: 'Total licenses', value: metrics?.total ?? 0, icon: KeyRound, color: 'text-[#60a5fa]' },
    { label: 'Active licenses', value: metrics?.active ?? 0, icon: ShieldCheck, color: 'text-emerald-400' },
    { label: 'Expiring in 30 days', value: metrics?.expiring ?? 0, icon: CalendarClock, color: 'text-amber-400' },
    { label: 'Seats assigned', value: `${metrics?.assignedSeats ?? 0} / ${metrics?.seatCapacity ?? 0}`, icon: Users, color: 'text-[#06B6D4]' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
            <card.icon className={`w-4.5 h-4.5 ${card.color} mb-3`} />
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key, tenant, or plan…"
            className="pl-9 h-9 bg-[#0a0f1e] border-white/[0.08] text-white placeholder:text-white/30" />
        </div>
        {(['all', 'active', 'suspended', 'revoked', 'expired'] as const).map((item) => (
          <button key={item} onClick={() => setStatus(item)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${status === item ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white'}`}>
            {item}
          </button>
        ))}
        <Button onClick={() => { setEditLicense(null); setShowForm(true); }} size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] ml-auto">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Issue license
        </Button>
      </div>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div><h3 className="font-semibold text-white">License inventory</h3><p className="text-xs text-white/35 mt-0.5">{filtered.length} of {licenses.length} keys</p></div>
          <button onClick={refresh} className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.05]" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead><tr className="border-b border-white/[0.05]">
              {['License key', 'Tenant / plan', 'Status', 'Seats', 'Activations', 'Expires', 'Actions'].map((heading) => <th key={heading} className="text-left text-xs font-medium text-white/30 px-4 py-3 first:pl-5">{heading}</th>)}
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="py-14 text-center text-sm text-white/30">Loading licenses…</td></tr> :
                isError ? <tr><td colSpan={7} className="py-14 text-center text-sm text-red-400">Could not load licenses. Refresh and try again.</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={7} className="py-14 text-center text-sm text-white/30">No licenses match your filters.</td></tr> :
                filtered.map((license) => (
                  <tr key={license.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 pl-5 py-3"><button onClick={() => copyKey(license.licenseKey)} className="group flex items-center gap-2 text-left"><KeyRound className="w-3.5 h-3.5 text-[#60a5fa]" /><span className="text-xs font-mono text-white/75 group-hover:text-white">{license.licenseKey}</span><Clipboard className="w-3 h-3 text-white/20 group-hover:text-white/60" /></button><p className="text-[10px] text-white/25 ml-5 capitalize">{license.licenseType}</p></td>
                    <td className="px-4 py-3"><p className="text-sm text-white">{license.orgName ?? 'Unknown tenant'}</p><p className="text-[10px] text-white/35">{license.planName ?? 'Unknown plan'}</p></td>
                    <td className="px-4 py-3"><Badge className={`${STATUS_STYLES[license.status]} text-[10px] capitalize`}>{license.status}</Badge>{isExpiring(license) && <p className="text-[10px] text-amber-400 mt-1">Expiring soon</p>}</td>
                    <td className="px-4 py-3"><span className="text-sm text-white/75">{license.usedSeats}</span><span className="text-xs text-white/30"> / {license.maxSeats}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-white/75">{license.activationCount}</span><span className="text-xs text-white/30"> / {license.activationLimit}</span></td>
                    <td className="px-4 py-3 text-xs text-white/50">{formatDate(license.expiresAt)}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1">
                      <button onClick={() => { setEditLicense(license); setShowForm(true); }} className="p-1.5 rounded text-white/35 hover:text-white hover:bg-white/[0.07]" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      {license.status !== 'revoked' && <button onClick={() => action.mutate({ id: license.id, action: 'renew' })} className="p-1.5 rounded text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/10" title="Renew 30 days"><RefreshCw className="w-3.5 h-3.5" /></button>}
                      {license.status === 'active' && <button onClick={() => action.mutate({ id: license.id, action: 'status', nextStatus: 'suspended' })} className="p-1.5 rounded text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10" title="Suspend"><XCircle className="w-3.5 h-3.5" /></button>}
                      {license.status === 'suspended' && <button onClick={() => action.mutate({ id: license.id, action: 'status', nextStatus: 'active' })} className="p-1.5 rounded text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/10" title="Reactivate"><Check className="w-3.5 h-3.5" /></button>}
                      {license.status !== 'revoked' && <button onClick={() => action.mutate({ id: license.id, action: 'status', nextStatus: 'revoked' })} className="p-1.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10" title="Revoke"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <LicenseForm initial={editLicense} tenants={tenants} plans={plans} saving={save.isPending} onClose={() => { setShowForm(false); setEditLicense(null); }} onSave={(payload) => save.mutate(payload)} />}
    </div>
  );
}