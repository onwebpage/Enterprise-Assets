import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, DollarSign, TrendingUp, Users, CheckCircle, Download,
  Zap, Shield, BarChart3, AlertCircle, ArrowUpRight, Plus, Trash2,
  Star, RefreshCw, X, Loader2, Check, Building2, Calendar, Receipt,
  Package, ChevronRight, ToggleLeft, ToggleRight, Clock,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/currency';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const apiFetch = (path: string, init?: RequestInit) => {
  const token = localStorage.getItem('auth_token');
  return fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface BillingPlan {
  id: number; name: string; slug: string; description: string;
  priceMonthly: string; priceYearly: string;
  maxUsers: number | null; maxModules: number | null;
  maxStorageGb: number | null; maxApiCallsMonthly: number | null;
  features: string[]; isPopular: boolean; sortOrder: number;
}

interface AddOn {
  id: number; name: string; slug: string; description: string;
  priceMonthly: string; isActive: boolean; sortOrder: number;
}

interface PaymentMethod {
  id: number; type: string; brand: string | null; last4: string | null;
  expiryMonth: number | null; expiryYear: number | null;
  cardholderName: string | null; bankName: string | null;
  accountLast4: string | null; upiId: string | null;
  isDefault: boolean; createdAt: string;
}

interface Invoice {
  id: number; invoiceNumber: string; status: string;
  billingPeriodStart: string; billingPeriodEnd: string;
  subtotal: string; tax: string; total: string; currency: string;
  paidAt: string | null; createdAt: string;
  lineItems: { description: string; amount: number }[];
}

interface Summary {
  subId: number; status: string; billingCycle: string;
  currentPeriodStart: string; currentPeriodEnd: string;
  trialEndsAt: string | null; cancelAtPeriodEnd: boolean;
  currentUsers: number; currentStorageGb: string; currentApiCalls: number;
  uptime30d: string; planId: number; planName: string; planSlug: string;
  priceMonthly: string; priceYearly: string;
  maxUsers: number | null; maxModules: number | null; maxStorageGb: number | null; maxApiCallsMonthly: number | null;
  features: string[];
  activeAddOns: { id: number; name: string; slug: string; priceMonthly: string; quantity: number }[];
  mrr: number; addOnTotal: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
const useSummary = () =>
  useQuery<Summary>({
    queryKey: ['billing-summary'],
    queryFn: async () => {
      const r = await apiFetch('/billing/summary');
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    refetchInterval: 30000,
  });

const usePlans = () =>
  useQuery<BillingPlan[]>({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const r = await apiFetch('/billing/plans');
      const j = await r.json();
      return j.data ?? [];
    },
  });

const useAddOns = () =>
  useQuery<AddOn[]>({
    queryKey: ['billing-add-ons'],
    queryFn: async () => {
      const r = await apiFetch('/billing/add-ons');
      const j = await r.json();
      return j.data ?? [];
    },
  });

const useInvoices = () =>
  useQuery<Invoice[]>({
    queryKey: ['billing-invoices'],
    queryFn: async () => {
      const r = await apiFetch('/billing/invoices');
      const j = await r.json();
      return j.data ?? [];
    },
  });

const usePaymentMethods = () =>
  useQuery<PaymentMethod[]>({
    queryKey: ['billing-payment-methods'],
    queryFn: async () => {
      const r = await apiFetch('/billing/payment-methods');
      const j = await r.json();
      return j.data ?? [];
    },
  });

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtMoney(n: number | string) {
  return formatINR(n);
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/20',
  cancelled: 'bg-white/10 text-white/40 border-white/10',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  open: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  void: 'bg-white/10 text-white/40 border-white/10',
};

// ── Plan Change Dialog ────────────────────────────────────────────────────────
function ChangePlanDialog({
  plans, currentPlanId, onClose, onConfirm, loading,
}: {
  plans: BillingPlan[];
  currentPlanId: number;
  onClose: () => void;
  onConfirm: (planId: number, cycle: string) => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState(currentPlanId);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plan = plans.find(p => p.id === selected);
  const price = cycle === 'yearly' ? Number(plan?.priceYearly) / 12 : Number(plan?.priceMonthly);
  const savings = cycle === 'yearly'
    ? Math.round((1 - Number(plan?.priceYearly) / (Number(plan?.priceMonthly) * 12)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
          <div>
            <h2 className="text-lg font-bold text-white">Change Plan</h2>
            <p className="text-sm text-white/40 mt-0.5">Select a new plan and billing cycle</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Billing cycle toggle */}
          <div className="flex items-center gap-3 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07] w-fit">
            {(['monthly', 'yearly'] as const).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${cycle === c ? 'bg-[#2563EB] text-white' : 'text-white/50 hover:text-white'}`}>
                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                {c === 'yearly' && <span className="ml-1.5 text-emerald-400 text-xs">Save up to 20%</span>}
              </button>
            ))}
          </div>
          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-3">
            {plans.map(plan => {
              const monthly = cycle === 'yearly' ? Number(plan.priceYearly) / 12 : Number(plan.priceMonthly);
              const isCurrent = plan.id === currentPlanId;
              const isSelected = plan.id === selected;
              return (
                <button key={plan.id} onClick={() => setSelected(plan.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${isSelected ? 'border-[#2563EB] bg-[#2563EB]/10 ring-1 ring-[#2563EB]/30' : 'border-white/[0.07] hover:border-white/[0.15] bg-white/[0.02]'}`}>
                  {plan.isPopular && <span className="text-[10px] font-semibold text-[#2563EB] uppercase tracking-wider">Popular</span>}
                  <p className="font-bold text-white text-sm mt-1">{plan.name}</p>
                  <p className="text-xl font-bold text-white mt-2">{fmtMoney(monthly)}<span className="text-xs font-normal text-white/40">/mo</span></p>
                  {cycle === 'yearly' && <p className="text-[10px] text-emerald-400 mt-0.5">billed annually</p>}
                  {isCurrent && <p className="text-[10px] text-white/30 mt-2">Current plan</p>}
                </button>
              );
            })}
          </div>
          {/* Summary */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{plan?.name} · {cycle}</p>
              <p className="text-xs text-white/40 mt-0.5">{savings > 0 ? `Saving ${savings}% vs monthly` : 'Billed each month'}</p>
            </div>
            <p className="text-xl font-bold text-white">{fmtMoney(price)}<span className="text-sm font-normal text-white/40">/mo</span></p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.07]">
          <Button variant="outline" size="sm" onClick={onClose}
            className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(selected, cycle)} disabled={loading || selected === currentPlanId}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] min-w-[120px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Change'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Add Payment Method Dialog ─────────────────────────────────────────────────
function AddPaymentDialog({ onClose, onAdd, loading }: {
  onClose: () => void;
  onAdd: (data: Record<string, string | boolean>) => void;
  loading: boolean;
}) {
  const [type, setType] = useState<'card' | 'bank_account' | 'upi'>('card');
  const [form, setForm] = useState({ brand: 'Visa', last4: '', expiryMonth: '', expiryYear: '', cardholderName: '', bankName: '', accountLast4: '', upiId: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const valid = type === 'card'
    ? form.last4.length === 4 && form.expiryMonth && form.expiryYear && form.cardholderName
    : type === 'bank_account'
    ? form.bankName && form.accountLast4.length === 4
    : form.upiId.includes('@');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
          <h2 className="text-lg font-bold text-white">Add Payment Method</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {(['card', 'bank_account', 'upi'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${type === t ? 'border-[#2563EB] bg-[#2563EB]/10 text-white' : 'border-white/[0.07] text-white/40 hover:text-white hover:border-white/20'}`}>
                {t === 'card' ? 'Credit / Debit Card' : t === 'bank_account' ? 'Bank Account' : 'UPI'}
              </button>
            ))}
          </div>
          {type === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Card Brand</label>
                <select value={form.brand} onChange={set('brand')}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]">
                  {['Visa', 'Mastercard', 'Amex', 'Rupay', 'Discover'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Cardholder Name</label>
                <Input value={form.cardholderName} onChange={set('cardholderName')} placeholder="John Smith"
                  className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Last 4 Digits</label>
                  <Input value={form.last4} onChange={set('last4')} placeholder="4821" maxLength={4}
                    className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Month</label>
                    <Input value={form.expiryMonth} onChange={set('expiryMonth')} placeholder="12" maxLength={2}
                      className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Year</label>
                    <Input value={form.expiryYear} onChange={set('expiryYear')} placeholder="2027" maxLength={4}
                      className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {type === 'bank_account' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Bank Name</label>
                <Input value={form.bankName} onChange={set('bankName')} placeholder="HDFC Bank"
                  className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Last 4 digits of account</label>
                <Input value={form.accountLast4} onChange={set('accountLast4')} placeholder="7890" maxLength={4}
                  className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
              </div>
            </div>
          )}
          {type === 'upi' && (
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">UPI ID</label>
              <Input value={form.upiId} onChange={set('upiId')} placeholder="company@hdfc"
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus:border-[#2563EB]" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.07]">
          <Button variant="outline" size="sm" onClick={onClose}
            className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
          <Button size="sm" onClick={() => onAdd({ type, ...form })} disabled={loading || !valid}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] min-w-[120px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Method'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Invoice Detail Drawer ─────────────────────────────────────────────────────
function InvoiceDrawer({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="bg-[#0a0f1e] border border-white/[0.1] rounded-t-2xl md:rounded-2xl w-full md:w-[420px] md:h-full md:rounded-none md:border-r-0 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.07] sticky top-0 bg-[#0a0f1e] z-10">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Invoice</p>
            <h2 className="text-lg font-bold text-white">{invoice.invoiceNumber}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <Badge className={`${STATUS_COLORS[invoice.status] ?? STATUS_COLORS.paid} text-xs capitalize`}>{invoice.status}</Badge>
            <p className="text-xs text-white/40">{fmtDate(invoice.createdAt)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-white/40 mb-1">Billing Period</p>
              <p className="text-sm text-white">{fmtDate(invoice.billingPeriodStart)}</p>
              <p className="text-xs text-white/40">to {fmtDate(invoice.billingPeriodEnd)}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-white/40 mb-1">Paid On</p>
              <p className="text-sm text-white">{fmtDate(invoice.paidAt)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Line Items</p>
            <div className="space-y-2">
              {(invoice.lineItems ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-sm text-white/70">{item.description}</span>
                  <span className="text-sm font-semibold text-white">{fmtMoney(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-white/60">
              <span>Subtotal</span><span>{fmtMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>Tax</span><span>{fmtMoney(invoice.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white border-t border-white/[0.07] pt-2 mt-2">
              <span>Total</span><span>{fmtMoney(invoice.total)} {invoice.currency}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full border-white/[0.1] bg-transparent text-white/60 hover:text-white">
            <Download className="w-3.5 h-3.5 mr-2" />Download PDF
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Billing() {
  const [tab, setTab] = useState('overview');
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary, isLoading: loadingSummary } = useSummary();
  const { data: plans = [] } = usePlans();
  const { data: addOns = [], isLoading: loadingAddOns } = useAddOns();
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: paymentMethods = [], isLoading: loadingPMs } = usePaymentMethods();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['billing-summary'] });
    qc.invalidateQueries({ queryKey: ['billing-add-ons'] });
    qc.invalidateQueries({ queryKey: ['billing-payment-methods'] });
    qc.invalidateQueries({ queryKey: ['billing-invoices'] });
  };

  // Change plan
  const changePlanMut = useMutation({
    mutationFn: async ({ planId, cycle }: { planId: number; cycle: string }) => {
      const r = await apiFetch('/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      invalidate();
      setShowChangePlan(false);
      toast({ title: 'Plan updated', description: 'Your subscription has been changed.' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Toggle add-on
  const toggleAddOnMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/billing/add-ons/${id}/toggle`, { method: 'PATCH', body: '{}' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: (data) => {
      invalidate();
      toast({ title: data.active ? 'Add-on enabled' : 'Add-on removed', description: data.active ? 'Add-on is now active.' : 'Add-on has been removed.' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Add payment method
  const addPMMut = useMutation({
    mutationFn: async (data: Record<string, string | boolean>) => {
      const r = await apiFetch('/billing/payment-methods', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      invalidate();
      setShowAddPayment(false);
      toast({ title: 'Payment method added' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Set default PM
  const setDefaultPMMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/billing/payment-methods/${id}/default`, { method: 'PATCH', body: '{}' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-payment-methods'] });
      toast({ title: 'Default payment method updated' });
    },
  });

  // Delete PM
  const deletePMMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/billing/payment-methods/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-payment-methods'] });
      toast({ title: 'Payment method removed' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Cancel toggle
  const cancelMut = useMutation({
    mutationFn: async (cancelAtPeriodEnd: boolean) => {
      const r = await apiFetch('/billing/cancel', {
        method: 'PATCH',
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      toast({ title: v ? 'Cancellation scheduled' : 'Cancellation reversed', description: v ? 'Plan will cancel at period end.' : 'Your plan will continue.' });
    },
  });

  if (loadingSummary) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Subscription & Billing' }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        </div>
      </AppLayout>
    );
  }

  if (!summary) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Subscription & Billing' }]}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-white/50">No billing subscription found for this organization.</p>
        </div>
      </AppLayout>
    );
  }

  const baseMrr = summary.billingCycle === 'yearly'
    ? Number(summary.priceYearly) / 12
    : Number(summary.priceMonthly);

  const usageStats = [
    {
      label: 'Active Users', value: summary.currentUsers.toString(),
      limit: summary.maxUsers ? `${summary.maxUsers}` : '∞',
      pct: summary.maxUsers ? Math.min(100, (summary.currentUsers / summary.maxUsers) * 100) : 68,
      icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5',
    },
    {
      label: 'Storage Used', value: `${Number(summary.currentStorageGb).toFixed(0)} GB`,
      limit: summary.maxStorageGb ? `${summary.maxStorageGb} GB` : '∞',
      pct: summary.maxStorageGb ? Math.min(100, (Number(summary.currentStorageGb) / summary.maxStorageGb) * 100) : 28,
      icon: BarChart3, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5',
    },
    {
      label: 'API Calls', value: summary.currentApiCalls >= 1000000
        ? `${(summary.currentApiCalls / 1000000).toFixed(1)}M`
        : `${(summary.currentApiCalls / 1000).toFixed(0)}K`,
      limit: summary.maxApiCallsMonthly
        ? summary.maxApiCallsMonthly >= 1000000 ? `${summary.maxApiCallsMonthly / 1000000}M/mo` : `${summary.maxApiCallsMonthly / 1000}K/mo`
        : '∞',
      pct: summary.maxApiCallsMonthly ? Math.min(100, (summary.currentApiCalls / summary.maxApiCallsMonthly) * 100) : 24,
      icon: Zap, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5',
    },
    {
      label: 'Uptime (30d)', value: `${Number(summary.uptime30d).toFixed(2)}%`,
      limit: 'SLA 99.99%',
      pct: Number(summary.uptime30d),
      icon: Shield, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5',
    },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Subscription & Billing' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription & Billing</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {summary.planName} Plan · Billed {summary.billingCycle} · Next renewal {fmtDate(summary.currentPeriodEnd)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"
              onClick={() => setTab('invoices')}>
              <Receipt className="w-3.5 h-3.5 mr-1.5" />View Invoices
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setShowChangePlan(true)}>
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />Manage Plan
            </Button>
          </div>
        </div>

        {/* Cancellation warning */}
        {summary.cancelAtPeriodEnd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Cancellation Scheduled</p>
                <p className="text-xs text-white/50">Your plan will be cancelled on {fmtDate(summary.currentPeriodEnd)}. You'll retain access until then.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(false)}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs">
              Undo Cancellation
            </Button>
          </motion.div>
        )}

        {/* Plan Banner */}
        <div className="bg-gradient-to-r from-[#2563EB]/15 to-[#06B6D4]/10 border border-[#2563EB]/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-white">{summary.planName} Plan</h3>
                <Badge className={`${STATUS_COLORS[summary.status] ?? ''} text-xs capitalize`}>{summary.status}</Badge>
                {summary.billingCycle === 'yearly' && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">Annual</Badge>}
              </div>
              <p className="text-white/50 text-sm mt-0.5">
                {summary.maxModules ? `${summary.maxModules} modules` : 'All modules'} · {summary.maxUsers ? `Up to ${summary.maxUsers} users` : 'Unlimited users'} · {summary.maxStorageGb ? `${summary.maxStorageGb} GB storage` : '1 TB storage'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{fmtMoney(summary.mrr)}<span className="text-base font-normal text-white/40">/mo</span></p>
            <p className="text-xs text-white/40 mt-1">Next billing: {fmtDate(summary.currentPeriodEnd)}</p>
          </div>
        </div>

        {/* Usage stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {usageStats.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label} <span className="text-white/20">/ {k.limit}</span></p>
              <Progress value={k.pct} className="h-1 bg-white/[0.07] mt-2" />
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {[
              { value: 'overview', label: 'Overview' },
              { value: 'plans', label: 'Plans' },
              { value: 'add-ons', label: 'Add-ons' },
              { value: 'invoices', label: 'Invoices' },
              { value: 'payment', label: 'Payment' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Plan Features</h3>
              <div className="space-y-2.5">
                {(summary.features ?? []).map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-white/70">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Active Add-ons</h3>
                {summary.activeAddOns.length === 0
                  ? <p className="text-sm text-white/30">No add-ons active.</p>
                  : (
                    <div className="space-y-2">
                      {summary.activeAddOns.map(a => (
                        <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-sm text-white/70">{a.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-white">+{fmtMoney(a.priceMonthly)}/mo</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 mt-1">
                        <span className="text-sm font-semibold text-white">Total Monthly</span>
                        <span className="text-lg font-bold text-white">{fmtMoney(summary.mrr)}</span>
                      </div>
                    </div>
                  )}
              </div>
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Billing Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/60">
                    <span>{summary.planName} Plan ({summary.billingCycle})</span>
                    <span>{fmtMoney(baseMrr)}/mo</span>
                  </div>
                  {summary.activeAddOns.map(a => (
                    <div key={a.id} className="flex justify-between text-sm text-white/60">
                      <span>{a.name}</span>
                      <span>+{fmtMoney(a.priceMonthly)}/mo</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-bold text-white border-t border-white/[0.07] pt-2 mt-2">
                    <span>Monthly Total</span>
                    <span>{fmtMoney(summary.mrr)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/40">
                    <span>Annual ARR</span>
                    <span>{fmtMoney(summary.mrr * 12)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Plans */}
          <TabsContent value="plans" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrent = plan.id === summary.planId;
                const monthlyPrice = Number(plan.priceMonthly);
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`bg-[#0a0f1e] border rounded-xl p-5 relative flex flex-col ${isCurrent ? 'border-[#06B6D4]/30 ring-1 ring-[#06B6D4]/20' : plan.isPopular ? 'border-[#2563EB]/30' : 'border-white/[0.07]'}`}>
                    {plan.isPopular && !isCurrent && (
                      <Badge className="absolute top-3 right-3 bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]/30 text-xs">Popular</Badge>
                    )}
                    {isCurrent && (
                      <Badge className="absolute top-3 right-3 bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/30 text-xs">Current Plan</Badge>
                    )}
                    <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                    <p className="text-xs text-white/40 mt-1">{plan.description}</p>
                    <p className="text-3xl font-bold text-white mt-3">{fmtMoney(monthlyPrice)}<span className="text-sm font-normal text-white/40">/mo</span></p>
                    <p className="text-xs text-white/30 mt-1">or {fmtMoney(Number(plan.priceYearly))}/year</p>
                    <p className="text-xs text-white/40 mt-2">
                      {plan.maxUsers ? `Up to ${plan.maxUsers}` : 'Unlimited'} users · {plan.maxModules ? plan.maxModules : 'All'} modules · {plan.maxStorageGb ? `${plan.maxStorageGb} GB` : '1 TB'}
                    </p>
                    <div className="space-y-1.5 mt-4 mb-5 flex-1">
                      {(plan.features as string[]).map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs text-white/60">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button size="sm"
                      className={`w-full text-sm mt-auto ${isCurrent ? 'bg-white/[0.07] text-white/50 cursor-default' : 'bg-[#2563EB] hover:bg-[#1d4ed8]'}`}
                      disabled={isCurrent}
                      onClick={() => !isCurrent && setShowChangePlan(true)}>
                      {isCurrent ? 'Current Plan' : monthlyPrice > Number(summary.priceMonthly) ? 'Upgrade' : 'Downgrade'}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-4 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Cancel Subscription</p>
                <p className="text-xs text-white/40 mt-0.5">Your plan will remain active until the end of the current period.</p>
              </div>
              <Button size="sm" variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40"
                onClick={() => cancelMut.mutate(!summary.cancelAtPeriodEnd)}>
                {cancelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : summary.cancelAtPeriodEnd ? 'Undo Cancel' : 'Cancel Plan'}
              </Button>
            </div>
          </TabsContent>

          {/* Add-ons */}
          <TabsContent value="add-ons" className="mt-4">
            {loadingAddOns
              ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {addOns.map(addon => (
                    <motion.div key={addon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`bg-[#0a0f1e] border rounded-xl p-5 flex flex-col gap-3 transition-colors ${addon.isActive ? 'border-emerald-500/20' : 'border-white/[0.07]'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white text-sm">{addon.name}</p>
                          <p className="text-xs text-white/40 mt-1">{addon.description}</p>
                        </div>
                        {addon.isActive && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-lg font-bold text-white">+{fmtMoney(addon.priceMonthly)}<span className="text-xs font-normal text-white/40">/mo</span></span>
                        <Button size="sm" variant="outline"
                          onClick={() => toggleAddOnMut.mutate(addon.id)}
                          disabled={toggleAddOnMut.isPending}
                          className={addon.isActive
                            ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs'}>
                          {toggleAddOnMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : addon.isActive ? 'Remove' : 'Add'}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices" className="mt-4">
            {loadingInvoices
              ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
              : invoices.length === 0
              ? (
                <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
                  <Receipt className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40">No invoices yet.</p>
                </div>
              )
              : (
                <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Invoice', 'Period', 'Amount', 'Date', 'Status', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => setSelectedInvoice(inv)}>
                          <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm text-white/70">{fmtDate(inv.billingPeriodStart)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-white">{fmtMoney(inv.total)}</td>
                          <td className="px-4 py-3 text-sm text-white/50">{fmtDate(inv.paidAt ?? inv.createdAt)}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${STATUS_COLORS[inv.status] ?? ''} text-[10px] capitalize`}>{inv.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"
                              onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); }}>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Payment Methods</h3>
                <p className="text-xs text-white/40 mt-0.5">Manage cards and bank accounts for billing.</p>
              </div>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setShowAddPayment(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Method
              </Button>
            </div>
            {loadingPMs
              ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
              : paymentMethods.length === 0
              ? (
                <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
                  <CreditCard className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40">No payment methods added.</p>
                  <Button size="sm" className="mt-4 bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setShowAddPayment(true)}>
                    Add your first method
                  </Button>
                </div>
              )
              : (
                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className={`bg-[#0a0f1e] border rounded-xl p-4 flex items-center justify-between gap-4 ${pm.isDefault ? 'border-[#2563EB]/30' : 'border-white/[0.07]'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-white/50" />
                        </div>
                        <div>
                          {pm.type === 'card' && (
                            <>
                              <p className="text-sm font-semibold text-white">{pm.brand} ···· {pm.last4}</p>
                              <p className="text-xs text-white/40">Expires {pm.expiryMonth}/{pm.expiryYear} · {pm.cardholderName}</p>
                            </>
                          )}
                          {pm.type === 'bank_account' && (
                            <>
                              <p className="text-sm font-semibold text-white">{pm.bankName} ···· {pm.accountLast4}</p>
                              <p className="text-xs text-white/40">Bank Account</p>
                            </>
                          )}
                          {pm.type === 'upi' && (
                            <>
                              <p className="text-sm font-semibold text-white">{pm.upiId}</p>
                              <p className="text-xs text-white/40">UPI</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pm.isDefault
                          ? <Badge className="bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]/30 text-xs">Default</Badge>
                          : (
                            <Button size="sm" variant="outline" onClick={() => setDefaultPMMut.mutate(pm.id)}
                              disabled={setDefaultPMMut.isPending}
                              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white text-xs h-7">
                              Set Default
                            </Button>
                          )}
                        <button onClick={() => deletePMMut.mutate(pm.id)} disabled={deletePMMut.isPending}
                          className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {showChangePlan && plans.length > 0 && (
          <ChangePlanDialog
            plans={plans}
            currentPlanId={summary.planId}
            onClose={() => setShowChangePlan(false)}
            onConfirm={(planId, cycle) => changePlanMut.mutate({ planId, cycle })}
            loading={changePlanMut.isPending}
          />
        )}
        {showAddPayment && (
          <AddPaymentDialog
            onClose={() => setShowAddPayment(false)}
            onAdd={(data) => addPMMut.mutate(data)}
            loading={addPMMut.isPending}
          />
        )}
        {selectedInvoice && (
          <InvoiceDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
