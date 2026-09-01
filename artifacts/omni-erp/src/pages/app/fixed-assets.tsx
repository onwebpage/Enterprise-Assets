import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingDown, AlertCircle, DollarSign, BarChart3 } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/currency';
import { useAssetsSummary, useAssetsPermissions } from '@/hooks/useFixedAssets';
import AssetsTab from '@/components/app/assets/AssetsTab';
import DepreciationTab from '@/components/app/assets/DepreciationTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'assets' | 'depreciation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  return formatINR(v);
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
        {sub && !loading && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: summary, isLoading } = useAssetsSummary();
  const s = summary?.data;

  const kpis: KpiCardProps[] = [
    {
      label: 'Total Asset Cost',
      value: fmtMoney(s?.totalCost),
      sub:   'Original purchase cost (active)',
      icon:  DollarSign,
      accent: 'bg-blue-500/20 text-blue-400',
      loading: isLoading,
    },
    {
      label: 'Net Book Value',
      value: fmtMoney(s?.totalBookValue),
      sub:   'After accumulated depreciation',
      icon:  BarChart3,
      accent: 'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
    {
      label: 'Accumulated Depreciation',
      value: fmtMoney(s?.totalAccumulated),
      sub:   'Total depreciation charged',
      icon:  TrendingDown,
      accent: 'bg-amber-500/15 text-amber-400',
      loading: isLoading,
    },
    {
      label: 'Active Assets',
      value: isLoading ? '—' : String(s?.activeCount ?? 0),
      sub:   `${s?.fullyDepreciatedCount ?? 0} fully depreciated · ${s?.unpostedCount ?? 0} unposted entries`,
      icon:  Package,
      accent: 'bg-purple-500/15 text-purple-400',
      loading: isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <KpiCard {...k} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Depreciation Methods</h3>
          <div className="space-y-3">
            {[
              { label: 'Straight Line',       color: 'bg-blue-500',    desc: 'Equal charge each period' },
              { label: 'Declining Balance',    color: 'bg-emerald-500', desc: 'Accelerated front-loaded' },
              { label: 'Sum of Years Digits',  color: 'bg-amber-500',   desc: 'Accelerated, year-weighted' },
            ].map(({ label, color, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', color)} />
                <div>
                  <p className="text-xs text-white/60 font-medium">{label}</p>
                  <p className="text-[11px] text-white/30">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Asset Categories</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {['Land', 'Buildings', 'Machinery', 'Vehicles', 'Furniture', 'Computers', 'Other'].map((c) => (
              <div key={c} className="flex items-center gap-1.5 text-xs text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]/50" />
                {c}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/20 mt-4">Categorize assets for reporting and policy grouping.</p>
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Depreciation Workflow</h3>
          <ol className="space-y-2.5">
            {[
              { step: '1', label: 'Add assets in the Assets tab', color: 'bg-[#2563EB]' },
              { step: '2', label: 'Run depreciation for a period', color: 'bg-amber-500' },
              { step: '3', label: 'Review unposted entries', color: 'bg-amber-500' },
              { step: '4', label: 'Post to lock in the amounts', color: 'bg-emerald-500' },
            ].map(({ step, label, color }) => (
              <li key={step} className="flex items-center gap-2.5">
                <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', color)}>
                  {step}
                </span>
                <span className="text-xs text-white/50">{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',     label: 'Overview'     },
  { id: 'assets',       label: 'Assets'       },
  { id: 'depreciation', label: 'Depreciation' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FixedAssets() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useAssetsPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.assets.canView && !perms.depreciation.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Fixed Assets' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view Fixed Assets.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Fixed Assets & Depreciation' }]}>
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Fixed Assets & Depreciation</h1>
            <p className="text-sm text-white/40 mt-1">Track physical assets, calculate and post depreciation schedules</p>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-[#2563EB] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70')}>
              {t.label}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview'     && <OverviewTab />}
          {activeTab === 'assets'       && <AssetsTab />}
          {activeTab === 'depreciation' && <DepreciationTab />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
