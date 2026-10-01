import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, DollarSign, TrendingUp, Plus, Search, MoreHorizontal,
  CheckCircle, AlertCircle, XCircle, Edit2, Ban, X, Loader2,
  Globe, Phone, AtSign, ArrowUpRight, ChevronDown, Percent,
  ShoppingBag, Trophy, Medal, Award, Star, Layers, BarChart3,
  Check, Clock, FileText, Building2, Tag, Filter, Target, Handshake,
  Briefcase, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

import { API_ORIGIN } from '@/lib/api';

// API_ORIGIN is empty on the web (same-origin API) and the backend origin in the Android app.
const BASE = API_ORIGIN || import.meta.env.BASE_URL.replace(/\/$/, '');
const api = (path: string) => `${BASE}/api${path}`;

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...init, headers });
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ResellerTier {
  id: number; name: string; slug: string; color: string;
  min_mrr_required: string; commission_rate: string; discount_rate: string;
  max_clients: number | null; benefits: string[]; sort_order: number;
  created_at: string; updated_at: string;
}
interface ResellerRow {
  id: number; company_name: string; contact_name: string | null;
  contact_email: string | null; phone: string | null;
  country: string | null; website: string | null;
  tier_id: number | null; status: string; total_revenue: string;
  notes: string | null; joined_at: string; created_at: string;
  tier_name: string | null; tier_slug: string | null; tier_color: string | null;
  tier_commission_rate: string | null; tier_discount_rate: string | null;
  deal_count: number; pending_deals: number; approved_deals: number; won_deals: number;
  pipeline_mrr: string; won_mrr: string;
}
interface DealRow {
  id: number; reseller_id: number; prospect_name: string;
  prospect_email: string | null; prospect_phone: string | null;
  industry: string | null; country: string | null;
  estimated_mrr: string; plan_id: number | null;
  status: string; expires_at: string | null; closed_at: string | null;
  notes: string | null; rejection_reason: string | null;
  created_at: string; updated_at: string;
  reseller_name: string | null; tier_name: string | null; tier_slug: string | null; tier_color: string | null;
  plan_name: string | null; plan_slug: string | null;
}
interface ResellerMetrics {
  totalResellers: number; activeResellers: number; totalRevenue: number;
  totalDeals: number; pendingDeals: number; wonDeals: number;
  pipelineMrr: number; wonMrr: number;
  tierBreakdown: { tier: string; slug: string; color: string; count: number }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
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
function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const RESELLER_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/20',
  inactive: 'bg-white/10 text-white/40 border-white/10',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};
const DEAL_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  approved: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  won:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  lost:     'bg-white/10 text-white/40 border-white/10',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
};
const DEAL_STATUS_ICON: Record<string, typeof CheckCircle> = {
  pending: Clock, approved: CheckCircle, won: Trophy, lost: XCircle, rejected: Ban,
};
const TIER_ICON: Record<string, typeof Medal> = {
  bronze: Medal, silver: Award, gold: Trophy, platinum: Star,
};

// ── API Hooks ──────────────────────────────────────────────────────────────
function useResellerMetrics() {
  return useQuery({
    queryKey: ['reseller-metrics'],
    queryFn: async () => {
      const r = await authFetch(api('/saas/reseller-metrics'));
      const j = await r.json();
      return j.data as ResellerMetrics;
    },
  });
}
function useResellerTiers() {
  return useQuery({
    queryKey: ['reseller-tiers'],
    queryFn: async () => {
      const r = await authFetch(api('/saas/reseller-tiers'));
      const j = await r.json();
      return j.data as ResellerTier[];
    },
  });
}
function useResellers() {
  return useQuery({
    queryKey: ['resellers'],
    queryFn: async () => {
      const r = await authFetch(api('/saas/resellers'));
      const j = await r.json();
      return j.data as ResellerRow[];
    },
  });
}
function useDealRegistrations() {
  return useQuery({
    queryKey: ['deal-registrations'],
    queryFn: async () => {
      const r = await authFetch(api('/saas/deal-registrations'));
      const j = await r.json();
      return j.data as DealRow[];
    },
  });
}
function useResellerDeals(resellerId: number | null) {
  return useQuery({
    queryKey: ['reseller-deals', resellerId],
    queryFn: async () => {
      const r = await authFetch(api(`/saas/resellers/${resellerId}/deals`));
      const j = await r.json();
      return j.data as DealRow[];
    },
    enabled: !!resellerId,
  });
}

// ── Tier Badge ─────────────────────────────────────────────────────────────
function TierBadge({ tier, color, slug }: { tier: string | null; color: string | null; slug: string | null }) {
  if (!tier) return <span className="text-xs text-white/30">—</span>;
  const Icon = TIER_ICON[slug ?? ''] ?? Medal;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" style={{ color: color ?? '#6B7280' }} />
      <span className="text-xs font-semibold" style={{ color: color ?? '#6B7280' }}>{tier}</span>
    </div>
  );
}

// ── Reseller Drawer ────────────────────────────────────────────────────────
function ResellerDrawer({ reseller, onClose, onStatusChange }: {
  reseller: ResellerRow;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const { data: deals = [], isLoading } = useResellerDeals(reseller.id);
  const qc = useQueryClient();
  const { toast } = useToast();

  const updateDeal = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: number; status: string; rejectionReason?: string }) => {
      const r = await authFetch(api(`/saas/deal-registrations/${id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reseller-deals', reseller.id] });
      qc.invalidateQueries({ queryKey: ['deal-registrations'] });
      qc.invalidateQueries({ queryKey: ['resellers'] });
      qc.invalidateQueries({ queryKey: ['reseller-metrics'] });
      toast({ title: 'Deal updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-[500px] bg-[#07091a] border-l border-white/[0.07] z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600/40 to-[#2563EB]/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {reseller.company_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-base">{reseller.company_name}</h3>
                  <Badge className={`${RESELLER_STATUS_STYLES[reseller.status] ?? RESELLER_STATUS_STYLES.inactive} text-[10px] capitalize`}>
                    {reseller.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <TierBadge tier={reseller.tier_name} color={reseller.tier_color} slug={reseller.tier_slug} />
                  {reseller.country && <span className="text-[10px] text-white/30">· {reseller.country}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Contact info */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {reseller.contact_email && (
              <a href={`mailto:${reseller.contact_email}`} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#2563EB] transition-colors">
                <AtSign className="w-3 h-3" />{reseller.contact_email}
              </a>
            )}
            {reseller.phone && (
              <span className="flex items-center gap-1.5 text-xs text-white/40">
                <Phone className="w-3 h-3" />{reseller.phone}
              </span>
            )}
            {reseller.website && (
              <a href={reseller.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#2563EB] transition-colors">
                <Globe className="w-3 h-3" />{reseller.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          {/* KPIs */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: 'Deals', value: String(reseller.deal_count), color: 'text-[#2563EB]' },
              { label: 'Won MRR', value: fmt(Number(reseller.won_mrr)), color: 'text-emerald-400' },
              { label: 'Pipeline', value: fmt(Number(reseller.pipeline_mrr)), color: 'text-amber-400' },
              { label: 'Revenue', value: fmt(Number(reseller.total_revenue)), color: 'text-violet-400' },
            ].map(k => (
              <div key={k.label} className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          {/* Status actions */}
          <div className="mt-3 flex gap-2">
            {reseller.status !== 'active' && (
              <Button size="sm" variant="outline" className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent text-xs"
                onClick={() => onStatusChange('active')}>
                <CheckCircle className="w-3 h-3 mr-1" />Activate
              </Button>
            )}
            {reseller.status === 'active' && (
              <Button size="sm" variant="outline" className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent text-xs"
                onClick={() => onStatusChange('suspended')}>
                <Ban className="w-3 h-3 mr-1" />Suspend
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex-1 border-white/[0.08] text-white/40 hover:text-white/70 bg-transparent text-xs"
              onClick={() => onStatusChange('inactive')}>
              <XCircle className="w-3 h-3 mr-1" />Deactivate
            </Button>
          </div>
        </div>

        {/* Deals list */}
        <div className="flex-1 overflow-y-auto p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-white/30" />Deal Registrations
            <span className="bg-white/[0.07] text-white/40 text-[10px] px-1.5 py-0.5 rounded-full">{deals.length}</span>
          </h4>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />No deals yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {deals.map(deal => {
                const Icon = DEAL_STATUS_ICON[deal.status] ?? Clock;
                const expiring = deal.expires_at && deal.status === 'pending' ? daysUntil(deal.expires_at) : null;
                return (
                  <div key={deal.id} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{deal.prospect_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {deal.prospect_email && <span className="text-[10px] text-white/30 truncate">{deal.prospect_email}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {deal.industry && <span className="text-[10px] bg-white/[0.05] text-white/40 px-1.5 py-0.5 rounded">{deal.industry}</span>}
                          {deal.country && <span className="text-[10px] bg-white/[0.05] text-white/40 px-1.5 py-0.5 rounded">{deal.country}</span>}
                          {deal.plan_name && <span className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] px-1.5 py-0.5 rounded">{deal.plan_name}</span>}
                          {expiring !== null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${expiring <= 7 ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.05] text-white/40'}`}>
                              {expiring > 0 ? `Expires in ${expiring}d` : 'Expired'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-white">{fmt(Number(deal.estimated_mrr))}</p>
                        <p className="text-[10px] text-white/30">/mo</p>
                        <Badge className={`${DEAL_STATUS_STYLES[deal.status] ?? DEAL_STATUS_STYLES.pending} text-[10px] capitalize mt-1`}>
                          <Icon className="w-2.5 h-2.5 mr-1" />{deal.status}
                        </Badge>
                      </div>
                    </div>
                    {deal.status === 'pending' && (
                      <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-white/[0.04]">
                        <Button size="sm" className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] h-7 text-[11px]"
                          onClick={() => updateDeal.mutate({ id: deal.id, status: 'approved' })}
                          disabled={updateDeal.isPending}>
                          <Check className="w-3 h-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-[11px]"
                          onClick={() => updateDeal.mutate({ id: deal.id, status: 'won' })}
                          disabled={updateDeal.isPending}>
                          <Trophy className="w-3 h-3 mr-1" />Mark Won
                        </Button>
                        <Button size="sm" variant="outline" className="border-white/[0.08] text-white/40 hover:text-red-400 bg-transparent h-7 text-[11px] px-2"
                          onClick={() => updateDeal.mutate({ id: deal.id, status: 'rejected' })}
                          disabled={updateDeal.isPending}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {deal.status === 'approved' && (
                      <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-white/[0.04]">
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-[11px]"
                          onClick={() => updateDeal.mutate({ id: deal.id, status: 'won' })}
                          disabled={updateDeal.isPending}>
                          <Trophy className="w-3 h-3 mr-1" />Mark Won
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 border-white/[0.08] text-white/40 hover:text-white/70 bg-transparent h-7 text-[11px]"
                          onClick={() => updateDeal.mutate({ id: deal.id, status: 'lost' })}
                          disabled={updateDeal.isPending}>
                          Mark Lost
                        </Button>
                      </div>
                    )}
                    {deal.rejection_reason && (
                      <p className="text-[10px] text-red-400/60 mt-2 italic">Reason: {deal.rejection_reason}</p>
                    )}
                    {deal.notes && (
                      <p className="text-[10px] text-white/25 mt-1 italic">{deal.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Reseller Form ──────────────────────────────────────────────────────────
function ResellerForm({ initial, tiers, onClose, onSave }: {
  initial: ResellerRow | null;
  tiers: ResellerTier[];
  onClose: () => void;
  onSave: (data: Record<string, string | number | null>) => void;
}) {
  const [form, setForm] = useState({
    companyName: initial?.company_name ?? '',
    contactName: initial?.contact_name ?? '',
    contactEmail: initial?.contact_email ?? '',
    phone: initial?.phone ?? '',
    country: initial?.country ?? '',
    website: initial?.website ?? '',
    tierId: initial?.tier_id ? String(initial.tier_id) : '',
    notes: initial?.notes ?? '',
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(x => ({ ...x, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#07091a] border border-white/[0.1] rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-semibold text-white">{initial ? 'Edit Reseller' : 'New Reseller'}</h4>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Company Name <span className="text-red-400">*</span></label>
            <Input value={form.companyName} onChange={f('companyName')}
              className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="Acme Partners Inc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Contact Name</label>
              <Input value={form.contactName} onChange={f('contactName')}
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <Input value={form.contactEmail} onChange={f('contactEmail')} type="email"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="jane@acme.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Phone</label>
              <Input value={form.phone} onChange={f('phone')}
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="+1-555-0100" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Country</label>
              <Input value={form.country} onChange={f('country')}
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="United States" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Website</label>
            <Input value={form.website} onChange={f('website')}
              className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="https://acme.com" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Tier</label>
            <select value={form.tierId} onChange={f('tierId')}
              className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white h-9 text-sm rounded-md px-3">
              <option value="">— No tier assigned —</option>
              {tiers.map(t => <option key={t.id} value={String(t.id)}>{t.name} ({Number(t.commission_rate).toFixed(0)}% commission)</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2}
              className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 resize-none"
              placeholder="Internal notes…" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 border-white/[0.08] text-white/60 bg-transparent" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
            disabled={!form.companyName.trim()}
            onClick={() => onSave({
              companyName: form.companyName, contactName: form.contactName || null,
              contactEmail: form.contactEmail || null, phone: form.phone || null,
              country: form.country || null, website: form.website || null,
              tierId: form.tierId ? parseInt(form.tierId) : null, notes: form.notes || null,
            })}>
            {initial ? 'Save Changes' : 'Create Reseller'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Deal Form ──────────────────────────────────────────────────────────────
function DealForm({ resellers, onClose, onSave }: {
  resellers: ResellerRow[];
  onClose: () => void;
  onSave: (data: Record<string, string | number | null>) => void;
}) {
  const [form, setForm] = useState({
    resellerId: '', prospectName: '', prospectEmail: '', prospectPhone: '',
    industry: '', country: '', estimatedMrr: '', planId: '', notes: '',
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(x => ({ ...x, [k]: e.target.value }));

  const industries = ['Finance', 'Manufacturing', 'Retail', 'Healthcare', 'Logistics', 'Technology', 'Construction', 'Education', 'Other'];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#07091a] border border-white/[0.1] rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-semibold text-white">Register Deal</h4>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Reseller <span className="text-red-400">*</span></label>
            <select value={form.resellerId} onChange={f('resellerId')}
              className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white h-9 text-sm rounded-md px-3">
              <option value="">— Select reseller —</option>
              {resellers.filter(r => r.status === 'active').map(r => (
                <option key={r.id} value={String(r.id)}>{r.company_name}{r.tier_name ? ` (${r.tier_name})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Prospect Name <span className="text-red-400">*</span></label>
            <Input value={form.prospectName} onChange={f('prospectName')}
              className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="Company or contact name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Prospect Email</label>
              <Input value={form.prospectEmail} onChange={f('prospectEmail')} type="email"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="cto@prospect.com" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Est. MRR (₹)</label>
              <Input value={form.estimatedMrr} onChange={f('estimatedMrr')} type="number"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="2500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Industry</label>
              <select value={form.industry} onChange={f('industry')}
                className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white h-9 text-sm rounded-md px-3">
                <option value="">— Select —</option>
                {industries.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Country</label>
              <Input value={form.country} onChange={f('country')}
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="United States" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Notes</label>
            <Input value={form.notes} onChange={f('notes')}
              className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="e.g. Warm lead, demo scheduled" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 border-white/[0.08] text-white/60 bg-transparent" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
            disabled={!form.resellerId || !form.prospectName.trim()}
            onClick={() => onSave({
              resellerId: parseInt(form.resellerId), prospectName: form.prospectName,
              prospectEmail: form.prospectEmail || null, prospectPhone: form.prospectPhone || null,
              industry: form.industry || null, country: form.country || null,
              estimatedMrr: parseFloat(form.estimatedMrr) || 0,
              planId: form.planId ? parseInt(form.planId) : null, notes: form.notes || null,
            })}>
            Register Deal
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Tier Editor ────────────────────────────────────────────────────────────
function TierForm({ initial, onClose, onSave }: {
  initial: ResellerTier | null;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    color: initial?.color ?? '#6B7280',
    minMrrRequired: initial?.min_mrr_required ? String(initial.min_mrr_required) : '0',
    commissionRate: initial?.commission_rate ? String(initial.commission_rate) : '10',
    discountRate: initial?.discount_rate ? String(initial.discount_rate) : '0',
    maxClients: initial?.max_clients ? String(initial.max_clients) : '',
    benefits: initial?.benefits?.join('\n') ?? '',
    sortOrder: initial?.sort_order ? String(initial.sort_order) : '0',
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(x => ({ ...x, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#07091a] border border-white/[0.1] rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-semibold text-white">{initial ? 'Edit Tier' : 'New Tier'}</h4>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Name <span className="text-red-400">*</span></label>
              <Input value={form.name} onChange={f('name')}
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="Gold" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Slug <span className="text-red-400">*</span></label>
              <Input value={form.slug} onChange={f('slug')}
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="gold" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Commission %</label>
              <Input value={form.commissionRate} onChange={f('commissionRate')} type="number"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="20" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Discount %</label>
              <Input value={form.discountRate} onChange={f('discountRate')} type="number"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="15" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Max Clients</label>
              <Input value={form.maxClients} onChange={f('maxClients')} type="number"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="∞" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Min MRR (₹)</label>
              <Input value={form.minMrrRequired} onChange={f('minMrrRequired')} type="number"
                className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm" placeholder="15000" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={e => setForm(x => ({ ...x, color: e.target.value }))}
                  className="w-9 h-9 rounded bg-transparent border border-white/[0.08] cursor-pointer p-0.5" />
                <Input value={form.color} onChange={f('color')}
                  className="bg-[#0a0f1e] border-white/[0.08] text-white h-9 text-sm font-mono" placeholder="#F59E0B" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Benefits (one per line)</label>
            <textarea value={form.benefits} onChange={f('benefits')} rows={3}
              className="w-full bg-[#0a0f1e] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 resize-none"
              placeholder="Dedicated manager&#10;15% client discount&#10;Training & certification" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 border-white/[0.08] text-white/60 bg-transparent" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
            disabled={!form.name.trim() || !form.slug.trim()}
            onClick={() => onSave({
              name: form.name, slug: form.slug.toLowerCase().replace(/\s+/g, '-'), color: form.color,
              minMrrRequired: parseFloat(form.minMrrRequired) || 0,
              commissionRate: parseFloat(form.commissionRate) || 10,
              discountRate: parseFloat(form.discountRate) || 0,
              maxClients: form.maxClients ? parseInt(form.maxClients) : null,
              benefits: form.benefits.split('\n').map(b => b.trim()).filter(Boolean),
              sortOrder: parseInt(form.sortOrder) || 0,
            })}>
            {initial ? 'Save Changes' : 'Create Tier'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Reseller Panel Tab ────────────────────────────────────────────────
export default function ResellerPanelTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<'overview' | 'resellers' | 'deals' | 'tiers'>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dealStatusFilter, setDealStatusFilter] = useState('all');
  const [selectedReseller, setSelectedReseller] = useState<ResellerRow | null>(null);
  const [showResellerForm, setShowResellerForm] = useState(false);
  const [editReseller, setEditReseller] = useState<ResellerRow | null>(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showTierForm, setShowTierForm] = useState(false);
  const [editTier, setEditTier] = useState<ResellerTier | null>(null);

  const { data: metrics, isLoading: metricsLoading } = useResellerMetrics();
  const { data: resellers = [], isLoading: resellersLoading, refetch } = useResellers();
  const { data: deals = [], isLoading: dealsLoading } = useDealRegistrations();
  const { data: tiers = [], isLoading: tiersLoading } = useResellerTiers();

  const filteredResellers = resellers.filter(r => {
    const matchSearch = !search || r.company_name.toLowerCase().includes(search.toLowerCase()) ||
      r.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.country?.toLowerCase().includes(search.toLowerCase()) ||
      r.tier_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredDeals = deals.filter(d => {
    const matchSearch = !search || d.prospect_name.toLowerCase().includes(search.toLowerCase()) ||
      d.reseller_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.industry?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = dealStatusFilter === 'all' || d.status === dealStatusFilter;
    return matchSearch && matchStatus;
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const saveReseller = useMutation({
    mutationFn: async (data: Record<string, string | number | null>) => {
      const url = editReseller ? api(`/saas/resellers/${editReseller.id}`) : api('/saas/resellers');
      const method = editReseller ? 'PUT' : 'POST';
      const r = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resellers'] });
      qc.invalidateQueries({ queryKey: ['reseller-metrics'] });
      setShowResellerForm(false); setEditReseller(null);
      toast({ title: editReseller ? 'Reseller updated' : 'Reseller created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const changeResellerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await authFetch(api(`/saas/resellers/${id}/status`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['resellers'] });
      qc.invalidateQueries({ queryKey: ['reseller-metrics'] });
      if (selectedReseller?.id === id) {
        refetch().then(r => { const up = r.data?.find(x => x.id === id); if (up) setSelectedReseller(up); });
      }
      toast({ title: 'Reseller status updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }),
  });

  const registerDeal = useMutation({
    mutationFn: async (data: Record<string, string | number | null>) => {
      const r = await authFetch(api('/saas/deal-registrations'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-registrations'] });
      qc.invalidateQueries({ queryKey: ['resellers'] });
      qc.invalidateQueries({ queryKey: ['reseller-metrics'] });
      setShowDealForm(false);
      toast({ title: 'Deal registered' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDealStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await authFetch(api(`/saas/deal-registrations/${id}/status`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-registrations'] });
      qc.invalidateQueries({ queryKey: ['resellers'] });
      qc.invalidateQueries({ queryKey: ['reseller-metrics'] });
      toast({ title: 'Deal updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveTier = useMutation({
    mutationFn: async (data: Record<string, string | number | null>) => {
      const url = editTier ? api(`/saas/reseller-tiers/${editTier.id}`) : api('/saas/reseller-tiers');
      const method = editTier ? 'PUT' : 'POST';
      const r = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reseller-tiers'] });
      qc.invalidateQueries({ queryKey: ['resellers'] });
      qc.invalidateQueries({ queryKey: ['reseller-metrics'] });
      setShowTierForm(false); setEditTier(null);
      toast({ title: editTier ? 'Tier updated' : 'Tier created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(api(`/saas/reseller-tiers/${id}`), { method: 'DELETE' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reseller-tiers'] });
      qc.invalidateQueries({ queryKey: ['resellers'] });
      toast({ title: 'Tier deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── KPI cards ──────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total Resellers', value: metrics?.totalResellers ?? 0, sub: `${metrics?.activeResellers ?? 0} active`, icon: Handshake, color: 'text-violet-400', bg: 'from-violet-500/20 to-violet-500/5' },
    { label: 'Total Revenue', value: fmt(metrics?.totalRevenue ?? 0), sub: 'Across all resellers', icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Pipeline MRR', value: fmt(metrics?.pipelineMrr ?? 0), sub: `${metrics?.pendingDeals ?? 0} pending deals`, icon: Target, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
    { label: 'Won Revenue', value: fmt(metrics?.wonMrr ?? 0), sub: `${metrics?.wonDeals ?? 0} deals closed`, icon: Trophy, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
  ];

  // ── View Navigation ────────────────────────────────────────────────────
  const views = [
    { v: 'overview' as const, l: 'Overview', icon: BarChart3 },
    { v: 'resellers' as const, l: 'Resellers', icon: Building2 },
    { v: 'deals' as const, l: 'Deal Pipeline', icon: FileText },
    { v: 'tiers' as const, l: 'Partner Tiers', icon: Layers },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 w-fit border border-white/[0.06]">
        {views.map(({ v, l, icon: Icon }) => (
          <button key={v} onClick={() => { setView(v); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-[#2563EB] text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'}`}>
            <Icon className="w-3.5 h-3.5" />{l}
          </button>
        ))}
      </div>

      {/* KPI Cards — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{metricsLoading ? '—' : k.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {view === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Tier Breakdown */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-white/30" />Partner Tiers</h3>
            <div className="space-y-3">
              {tiersLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-8 bg-white/[0.03] rounded animate-pulse" />) :
                tiers.map(t => {
                  const bd = metrics?.tierBreakdown?.find(b => b.slug === t.slug);
                  const count = bd?.count ?? 0;
                  const total = metrics?.totalResellers || 1;
                  const pct = Math.round((count / total) * 100);
                  const TIcon = TIER_ICON[t.slug] ?? Medal;
                  return (
                    <div key={t.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <TIcon className="w-3.5 h-3.5" style={{ color: t.color }} />
                          <span className="text-sm font-medium" style={{ color: t.color }}>{t.name}</span>
                        </div>
                        <span className="text-xs text-white/40">{count} reseller{count !== 1 ? 's' : ''} · {Number(t.commission_rate).toFixed(0)}% commission</span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-white/[0.07]" />
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Top Resellers */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-white/30" />Top Resellers</h3>
            <div className="space-y-2">
              {resellersLoading ? [...Array(5)].map((_, i) => <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />) :
                [...resellers].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue)).slice(0, 6).map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-xs text-white/20 w-4 text-right font-mono">{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-[#2563EB]/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {r.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.company_name}</p>
                      <TierBadge tier={r.tier_name} color={r.tier_color} slug={r.tier_slug} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{fmt(Number(r.total_revenue))}</p>
                      <p className="text-[10px] text-white/30">{r.won_deals} won</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Recent Deals */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-white/30" />Recent Deals</h3>
            <div className="space-y-2">
              {dealsLoading ? [...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/[0.03] rounded animate-pulse" />) :
                deals.slice(0, 6).map(d => {
                  const Icon = DEAL_STATUS_ICON[d.status] ?? Clock;
                  return (
                    <div key={d.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${DEAL_STATUS_STYLES[d.status]?.split(' ')[0] ?? 'bg-white/[0.05]'}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{d.prospect_name}</p>
                        <p className="text-[10px] text-white/30 truncate">{d.reseller_name} · {timeAgo(d.created_at)}</p>
                      </div>
                      <span className="text-xs font-bold text-white">{fmt(Number(d.estimated_mrr))}</span>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ── RESELLERS ─────────────────────────────────────────────────────── */}
      {view === 'resellers' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resellers…"
                className="pl-9 bg-[#0a0f1e] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" />
            </div>
            {(['all', 'active', 'suspended', 'inactive', 'pending'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07]'}`}>
                {s}
              </button>
            ))}
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 ml-auto" onClick={() => { setEditReseller(null); setShowResellerForm(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Reseller
            </Button>
          </div>

          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Company', 'Tier', 'Contact', 'Country', 'Deals', 'Pipeline', 'Won Revenue', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3 first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resellersLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-white/30 text-sm">Loading…</td></tr>
                ) : filteredResellers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-white/30 text-sm">
                    {search || statusFilter !== 'all' ? 'No resellers match your filters' : 'No resellers yet — add your first one'}
                  </td></tr>
                ) : filteredResellers.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedReseller(r)}>
                    <td className="px-4 pl-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-[#2563EB]/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {r.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{r.company_name}</p>
                          <p className="text-[10px] text-white/30">{timeAgo(r.joined_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={r.tier_name} color={r.tier_color} slug={r.tier_slug} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white/60 truncate max-w-[140px]">{r.contact_name ?? '—'}</p>
                      {r.contact_email && <p className="text-[10px] text-white/30 truncate max-w-[140px]">{r.contact_email}</p>}
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-white/50">{r.country ?? '—'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/70">{r.deal_count}</span>
                        {r.pending_deals > 0 && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 rounded">{r.pending_deals} pending</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${Number(r.pipeline_mrr) > 0 ? 'text-amber-400' : 'text-white/30'}`}>
                        {Number(r.pipeline_mrr) > 0 ? fmt(Number(r.pipeline_mrr)) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${Number(r.won_mrr) > 0 ? 'text-emerald-400' : 'text-white/30'}`}>
                        {Number(r.total_revenue) > 0 ? fmt(Number(r.total_revenue)) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Badge className={`${RESELLER_STATUS_STYLES[r.status] ?? RESELLER_STATUS_STYLES.inactive} text-[10px] capitalize`}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-44">
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => setSelectedReseller(r)}>
                            <ArrowUpRight className="w-3.5 h-3.5 mr-2" />View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => { setEditReseller(r); setShowResellerForm(true); }}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.07]" />
                          {r.status !== 'active' && (
                            <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-emerald-400"
                              onClick={() => changeResellerStatus.mutate({ id: r.id, status: 'active' })}>
                              <CheckCircle className="w-3.5 h-3.5 mr-2" />Activate
                            </DropdownMenuItem>
                          )}
                          {r.status === 'active' && (
                            <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-amber-400"
                              onClick={() => changeResellerStatus.mutate({ id: r.id, status: 'suspended' })}>
                              <Ban className="w-3.5 h-3.5 mr-2" />Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-white/40"
                            onClick={() => changeResellerStatus.mutate({ id: r.id, status: 'inactive' })}>
                            <XCircle className="w-3.5 h-3.5 mr-2" />Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── DEAL PIPELINE ──────────────────────────────────────────────────── */}
      {view === 'deals' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals…"
                className="pl-9 bg-[#0a0f1e] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" />
            </div>
            {(['all', 'pending', 'approved', 'won', 'lost', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setDealStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${dealStatusFilter === s ? 'bg-[#2563EB] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07]'}`}>
                {s === 'all' ? `All (${deals.length})` : `${s} (${deals.filter(d => d.status === s).length})`}
              </button>
            ))}
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 ml-auto" onClick={() => setShowDealForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Register Deal
            </Button>
          </div>

          {/* Pipeline summary bar */}
          <div className="grid grid-cols-5 gap-3">
            {(['pending', 'approved', 'won', 'lost', 'rejected'] as const).map(s => {
              const count = deals.filter(d => d.status === s).length;
              const mrr = deals.filter(d => d.status === s).reduce((sum, d) => sum + Number(d.estimated_mrr), 0);
              const Icon = DEAL_STATUS_ICON[s] ?? Clock;
              return (
                <div key={s} className={`bg-[#0a0f1e] border rounded-xl p-3 cursor-pointer transition-colors ${dealStatusFilter === s ? 'border-[#2563EB]/40' : 'border-white/[0.07] hover:border-white/[0.12]'}`}
                  onClick={() => setDealStatusFilter(dealStatusFilter === s ? 'all' : s)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className={`w-3.5 h-3.5 ${DEAL_STATUS_STYLES[s]?.split(' ')[1] ?? 'text-white/40'}`} />
                    <span className="text-xs font-medium text-white/60 capitalize">{s}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{count}</p>
                  {mrr > 0 && <p className="text-[10px] text-white/30">{fmt(mrr)}/mo</p>}
                </div>
              );
            })}
          </div>

          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Prospect', 'Reseller', 'Tier', 'Industry', 'Est. MRR', 'Status', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3 first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dealsLoading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-white/30 text-sm">Loading…</td></tr>
                ) : filteredDeals.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-white/30 text-sm">
                    {search || dealStatusFilter !== 'all' ? 'No deals match your filters' : 'No deals yet — register your first one'}
                  </td></tr>
                ) : filteredDeals.map((d, i) => {
                  const Icon = DEAL_STATUS_ICON[d.status] ?? Clock;
                  const expiring = d.expires_at && d.status === 'pending' ? daysUntil(d.expires_at) : null;
                  return (
                    <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 pl-5 py-3">
                        <p className="text-sm font-medium text-white">{d.prospect_name}</p>
                        {d.prospect_email && <p className="text-[10px] text-white/30 truncate max-w-[160px]">{d.prospect_email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-white/60 truncate max-w-[140px]">{d.reseller_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={d.tier_name} color={d.tier_color} slug={d.tier_slug} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/50">{d.industry ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-white">{fmt(Number(d.estimated_mrr))}</span>
                        <span className="text-[10px] text-white/30 block">/mo</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${DEAL_STATUS_STYLES[d.status] ?? DEAL_STATUS_STYLES.pending} text-[10px] capitalize`}>
                          <Icon className="w-2.5 h-2.5 mr-1" />{d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {expiring !== null ? (
                          <span className={`text-xs ${expiring <= 7 ? 'text-red-400' : expiring <= 0 ? 'text-red-500' : 'text-white/40'}`}>
                            {expiring > 0 ? `${expiring}d` : 'Expired'}
                          </span>
                        ) : d.closed_at ? (
                          <span className="text-[10px] text-white/30">{timeAgo(d.closed_at)}</span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {d.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-6 text-[10px] px-2"
                              onClick={() => updateDealStatus.mutate({ id: d.id, status: 'approved' })}
                              disabled={updateDealStatus.isPending}>
                              <Check className="w-2.5 h-2.5 mr-1" />Approve
                            </Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-6 text-[10px] px-2"
                              onClick={() => updateDealStatus.mutate({ id: d.id, status: 'won' })}
                              disabled={updateDealStatus.isPending}>
                              Won
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/[0.08] text-white/30 hover:text-red-400 bg-transparent h-6 text-[10px] px-1.5"
                              onClick={() => updateDealStatus.mutate({ id: d.id, status: 'rejected' })}
                              disabled={updateDealStatus.isPending}>
                              Reject
                            </Button>
                          </div>
                        )}
                        {d.status === 'approved' && (
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-6 text-[10px] px-2"
                              onClick={() => updateDealStatus.mutate({ id: d.id, status: 'won' })}
                              disabled={updateDealStatus.isPending}>
                              <Trophy className="w-2.5 h-2.5 mr-1" />Won
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/[0.08] text-white/30 hover:text-white/60 bg-transparent h-6 text-[10px] px-1.5"
                              onClick={() => updateDealStatus.mutate({ id: d.id, status: 'lost' })}
                              disabled={updateDealStatus.isPending}>
                              Lost
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── PARTNER TIERS ──────────────────────────────────────────────────── */}
      {view === 'tiers' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Define commission rates, discount levels, and benefits for each partner tier.</p>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { setEditTier(null); setShowTierForm(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Tier
            </Button>
          </div>

          {tiersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : tiers.length === 0 ? (
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-16 text-center">
              <Layers className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No tiers defined yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {tiers.map((t, i) => {
                const TIcon = TIER_ICON[t.slug] ?? Medal;
                const resellerCount = metrics?.tierBreakdown?.find(b => b.slug === t.slug)?.count ?? 0;
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 flex flex-col">
                    {/* Tier header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${t.color}20` }}>
                          <TIcon className="w-5 h-5" style={{ color: t.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">{t.name}</p>
                          <p className="text-[10px] text-white/30">{resellerCount} reseller{resellerCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0a0f1e] border-white/[0.07] text-white w-40">
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer" onClick={() => { setEditTier(t); setShowTierForm(true); }}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.07]" />
                          <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer text-red-400"
                            onClick={() => { if (window.confirm(`Delete ${t.name} tier?`)) deleteTier.mutate(t.id); }}>
                            <XCircle className="w-3.5 h-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                        <p className="text-base font-bold" style={{ color: t.color }}>{Number(t.commission_rate).toFixed(0)}%</p>
                        <p className="text-[10px] text-white/30 mt-0.5">Commission</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                        <p className="text-base font-bold text-white">{Number(t.discount_rate).toFixed(0)}%</p>
                        <p className="text-[10px] text-white/30 mt-0.5">Client Discount</p>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="flex items-center gap-3 mb-4 text-[10px] text-white/40">
                      <span>Min MRR: <span className="text-white/60 font-medium">{Number(t.min_mrr_required) > 0 ? fmt(Number(t.min_mrr_required)) : 'None'}</span></span>
                      <span>Max clients: <span className="text-white/60 font-medium">{t.max_clients ?? '∞'}</span></span>
                    </div>

                    {/* Benefits */}
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Benefits</p>
                      <ul className="space-y-1.5">
                        {(t.benefits ?? []).map((b: string, bi: number) => (
                          <li key={bi} className="flex items-center gap-1.5 text-xs text-white/60">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: t.color }} />{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modals & Drawers ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedReseller && (
          <ResellerDrawer
            key={selectedReseller.id}
            reseller={selectedReseller}
            onClose={() => setSelectedReseller(null)}
            onStatusChange={(status) => changeResellerStatus.mutate({ id: selectedReseller.id, status })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResellerForm && (
          <ResellerForm
            initial={editReseller}
            tiers={tiers}
            onClose={() => { setShowResellerForm(false); setEditReseller(null); }}
            onSave={(data) => saveReseller.mutate(data)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDealForm && (
          <DealForm
            resellers={resellers}
            onClose={() => setShowDealForm(false)}
            onSave={(data) => registerDeal.mutate(data)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTierForm && (
          <TierForm
            initial={editTier}
            onClose={() => { setShowTierForm(false); setEditTier(null); }}
            onSave={(data) => saveTier.mutate(data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
