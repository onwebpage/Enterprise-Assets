import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, FileText, CheckCircle, XCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useEWayBillSummary, useEWayBillPermissions } from '@/hooks/useEWayBill';
import EWayBillsTab from '@/components/app/eway-bill/EWayBillsTab';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'bills';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, accent, loading }: KpiCardProps) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/40 font-medium">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-white/[0.04] rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-white mt-0.5 tabular-nums">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bills',    label: 'All Bills' },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: summaryRes, isLoading } = useEWayBillSummary();
  const s = summaryRes?.data;

  const kpis: KpiCardProps[] = [
    {
      label:   'Total Bills',
      value:   isLoading ? '—' : String(s?.total ?? 0),
      sub:     'All time',
      icon:    FileText,
      accent:  'bg-[#2563EB]/20 text-[#60a5fa]',
      loading: isLoading,
    },
    {
      label:   'Active (Generated)',
      value:   isLoading ? '—' : String(s?.generated ?? 0),
      sub:     'Currently valid',
      icon:    CheckCircle,
      accent:  'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
    {
      label:   'Total Goods Value',
      value:   fmtMoney(s?.totalValue),
      sub:     'Draft + Generated',
      icon:    Truck,
      accent:  'bg-cyan-500/15 text-cyan-400',
      loading: isLoading,
    },
    {
      label:   'Expiring in 24h',
      value:   isLoading ? '—' : String(s?.expiringSoon ?? 0),
      sub:     s?.expiringSoon ? 'Extend to avoid expiry' : 'No bills expiring soon',
      icon:    Clock,
      accent:  (s?.expiringSoon ?? 0) > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.05] text-white/30',
      loading: isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
            <KpiCard {...k} />
          </motion.div>
        ))}
      </div>

      {/* Status & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status breakdown */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Bill Status Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Draft',     value: s?.draft ?? 0,     color: 'text-white/50',    dot: 'bg-white/30' },
              { label: 'Generated', value: s?.generated ?? 0,  color: 'text-emerald-400', dot: 'bg-emerald-500' },
              { label: 'Cancelled', value: s?.cancelled ?? 0,  color: 'text-red-400',     dot: 'bg-red-500' },
              { label: 'Expired',   value: s?.expired ?? 0,    color: 'text-amber-400',   dot: 'bg-amber-500' },
            ].map(({ label, value, color, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
                <span className={cn('text-sm font-bold tabular-nums', color)}>
                  {isLoading ? '—' : value}
                </span>
              </div>
            ))}
          </div>
          {(s?.expiringSoon ?? 0) > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400/80">
                  {s!.expiringSoon} bill{s!.expiringSoon !== 1 ? 's' : ''} expiring in the next 24 hours. Extend to avoid disruption.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tax summary */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Tax on Goods in Transit</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Total Tax Amount</span>
              {isLoading
                ? <div className="h-4 w-20 bg-white/[0.04] rounded animate-pulse" />
                : <span className="text-sm font-bold text-white/80 tabular-nums">{fmtMoney(s?.totalTax)}</span>
              }
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Goods Value</span>
              {isLoading
                ? <div className="h-4 w-20 bg-white/[0.04] rounded animate-pulse" />
                : <span className="text-sm font-bold text-white/80 tabular-nums">{fmtMoney(s?.totalValue)}</span>
              }
            </div>
          </div>
          <div className="mt-4 text-[11px] text-white/25 leading-relaxed">
            Values include all active and draft bills. Generated bills are legally valid for goods movement.
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Create a new E-Way Bill',       tab: 'bills' as Tab },
              { label: 'View all generated bills',       tab: 'bills' as Tab },
              { label: 'Check expiring bills',           tab: 'bills' as Tab },
              { label: 'Manage cancelled bills',         tab: 'bills' as Tab },
            ].map(({ label, tab }) => (
              <button key={label} onClick={() => onNavigate(tab)}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 cursor-pointer transition-colors w-full text-left">
                <span className="w-1 h-1 rounded-full bg-[#2563EB]/60 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB]/15 flex items-center justify-center shrink-0 mt-0.5">
            <Truck className="w-4.5 h-4.5 text-[#60a5fa]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-1.5">About E-Way Bills</h3>
            <p className="text-xs text-white/40 leading-relaxed max-w-3xl">
              An E-Way Bill is a mandatory electronic document required for movement of goods worth more than ₹50,000
              under GST. Generate a bill from a draft to assign it an EWB number and validity period. Bills can be cancelled
              within 24 hours of generation, or extended if the goods are still in transit at expiry.
              Transport mode, vehicle number, and distance determine the validity window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EWayBillPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useEWayBillPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'E-Way Bill' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view E-Way Bills.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'E-Way Bill' }]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">E-Way Bill</h1>
            <p className="text-sm text-white/40 mt-1">Generate, track, and manage electronic waybills for goods movement</p>
          </div>
          {perms?.canCreate && (
            <button
              onClick={() => setActiveTab('bills')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-xs text-white font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Bill
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === t.id
                  ? 'border-[#2563EB] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
          {activeTab === 'bills'    && <EWayBillsTab />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
