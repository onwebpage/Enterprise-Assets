import { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, TrendingUp, DollarSign, CheckCircle, AlertCircle, Clock, Settings } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useGSTSummary, useGSTPermissions } from '@/hooks/useGST';
import TaxRatesTab    from '@/components/app/gst/TaxRatesTab';
import GSTReturnsTab  from '@/components/app/gst/GSTReturnsTab';
import TDSEntriesTab  from '@/components/app/gst/TDSEntriesTab';
import TaxPaymentsTab from '@/components/app/gst/TaxPaymentsTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'returns' | 'tds' | 'payments' | 'rates';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
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
  { id: 'overview',  label: 'Overview'      },
  { id: 'returns',   label: 'GST Returns'   },
  { id: 'tds',       label: 'TDS / TCS'     },
  { id: 'payments',  label: 'Tax Payments'  },
  { id: 'rates',     label: 'Tax Rate Master' },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────

interface OverviewTabProps {
  onNavigate: (tab: Tab) => void;
}

function OverviewTab({ onNavigate }: OverviewTabProps) {
  const { data: summaryRes, isLoading } = useGSTSummary();
  const s = summaryRes?.data;

  const kpis: KpiCardProps[] = [
    {
      label: 'GST Collected',
      value: fmtMoney(s?.totalGstCollected),
      sub:   s ? `Period: ${s.currentPeriod}` : '',
      icon:  DollarSign,
      accent: 'bg-[#2563EB]/20 text-[#60a5fa]',
      loading: isLoading,
    },
    {
      label: 'Input Tax Credit',
      value: fmtMoney(s?.totalItc),
      sub:   'Available ITC this period',
      icon:  TrendingUp,
      accent: 'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
    {
      label: 'Net Tax Payable',
      value: fmtMoney(s?.netPayable),
      sub:   'After ITC adjustment',
      icon:  Receipt,
      accent: 'bg-amber-500/15 text-amber-400',
      loading: isLoading,
    },
    {
      label: 'YTD Tax Paid',
      value: fmtMoney(s?.ytdPaid),
      sub:   'Total payments made',
      icon:  CheckCircle,
      accent: 'bg-cyan-500/15 text-cyan-400',
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
        {/* Filing Status */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Filing Status</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Pending Filings',
                value: isLoading ? '—' : String(s?.pendingFilings ?? 0),
                color: (s?.pendingFilings ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400',
                dot: (s?.pendingFilings ?? 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500',
              },
              {
                label: 'Overdue Returns',
                value: isLoading ? '—' : String(s?.overdueFilings ?? 0),
                color: (s?.overdueFilings ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400',
                dot: (s?.overdueFilings ?? 0) > 0 ? 'bg-red-500' : 'bg-emerald-500',
              },
              {
                label: 'Active Tax Rates',
                value: isLoading ? '—' : String(s?.activeTaxRates ?? 0),
                color: 'text-white/70',
                dot: 'bg-blue-500',
              },
            ].map(({ label, value, color, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
                <span className={cn('text-sm font-bold tabular-nums', color)}>{value}</span>
              </div>
            ))}
          </div>
          {(s?.overdueFilings ?? 0) > 0 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-400/80">
                  {s!.overdueFilings} overdue return{s!.overdueFilings !== 1 ? 's' : ''} require immediate attention.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* TDS Summary */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">TDS / TCS Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs text-white/50">Pending TDS/TCS</span>
              </div>
              {isLoading
                ? <div className="h-4 w-16 bg-white/[0.04] rounded animate-pulse" />
                : <span className="text-sm font-bold tabular-nums text-amber-400">{fmtMoney(s?.pendingTds)}</span>
              }
            </div>
            <div className="text-[11px] text-white/25 mt-2 leading-relaxed">
              TDS entries with status "deducted" or "pending" are awaiting deposit. Deposit by the 7th of next month to avoid interest.
            </div>
          </div>
          <button onClick={() => onNavigate('tds')}
            className="mt-4 w-full text-xs text-[#60a5fa] hover:text-white/80 transition-colors text-left">
            View TDS entries →
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'File a new GST return',    tab: 'returns'  as Tab },
              { label: 'Add a TDS entry',           tab: 'tds'      as Tab },
              { label: 'Record a tax payment',      tab: 'payments' as Tab },
              { label: 'Manage tax rate master',    tab: 'rates'    as Tab },
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

      {/* ITC Breakdown placeholder */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/70">Tax Component Breakdown</h3>
          <span className="text-[11px] text-white/25">Current period — add returns to populate</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'CGST', color: 'text-blue-400',   bar: 'bg-blue-500' },
            { label: 'SGST', color: 'text-indigo-400', bar: 'bg-indigo-500' },
            { label: 'IGST', color: 'text-cyan-400',   bar: 'bg-cyan-500' },
            { label: 'Cess', color: 'text-amber-400',  bar: 'bg-amber-500' },
          ].map(({ label, color, bar }) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-semibold', color)}>{label}</span>
                <span className="text-xs text-white/25">—</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full">
                <div className={cn('h-full rounded-full', bar)} style={{ width: '0%' }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/20 mt-4">Add GST Returns in the "GST Returns" tab to see component-wise breakdown.</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GSTPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useGSTPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'GST & Tax' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view GST & Tax.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'GST & Tax' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">GST & Tax Management</h1>
            <p className="text-sm text-white/40 mt-1">Manage tax rates, GST returns, TDS/TCS, and government payments</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('rates')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-transparent text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors">
              <Settings className="w-3.5 h-3.5" />
              Tax Rates
            </button>
          </div>
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
          {activeTab === 'overview'  && <OverviewTab onNavigate={setActiveTab} />}
          {activeTab === 'returns'   && <GSTReturnsTab />}
          {activeTab === 'tds'       && <TDSEntriesTab />}
          {activeTab === 'payments'  && <TaxPaymentsTab />}
          {activeTab === 'rates'     && <TaxRatesTab />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
