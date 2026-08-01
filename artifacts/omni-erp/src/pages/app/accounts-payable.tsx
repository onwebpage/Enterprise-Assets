import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Clock, Users, AlertCircle, DollarSign } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useAPSummary, useAPPermissions } from '@/hooks/useAccountsPayable';
import VendorsTab from '@/components/app/ap/VendorsTab';
import BillsTab from '@/components/app/ap/BillsTab';
import APPaymentsTab from '@/components/app/ap/APPaymentsTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'vendors' | 'bills' | 'payments';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  if (!v) return '$0';
  const n = parseFloat(v);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
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
  { id: 'overview',  label: 'Overview'  },
  { id: 'vendors',   label: 'Vendors'   },
  { id: 'bills',     label: 'Bills'     },
  { id: 'payments',  label: 'Payments'  },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: summary, isLoading } = useAPSummary();
  const s = summary?.data;

  const kpis: KpiCardProps[] = [
    {
      label: 'Total Payable',
      value: fmtMoney(s?.totalPayable),
      sub:   'Outstanding across all bills',
      icon:  DollarSign,
      accent: 'bg-amber-500/20 text-amber-400',
      loading: isLoading,
    },
    {
      label: 'Overdue',
      value: fmtMoney(s?.totalOverdue),
      sub:   s ? `${s.overdueCount} bill${s.overdueCount !== 1 ? 's' : ''} past due` : '',
      icon:  AlertCircle,
      accent: 'bg-red-500/15 text-red-400',
      loading: isLoading,
    },
    {
      label: 'Paid This Month',
      value: fmtMoney(s?.paidThisMonth),
      sub:   'Payments disbursed in current month',
      icon:  TrendingDown,
      accent: 'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
    {
      label: 'Active Vendors',
      value: isLoading ? '—' : String(s?.vendorCount ?? 0),
      sub:   `${s?.draftCount ?? 0} draft bill${(s?.draftCount ?? 0) !== 1 ? 's' : ''} pending`,
      icon:  Users,
      accent: 'bg-purple-500/15 text-purple-400',
      loading: isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <KpiCard {...k} />
          </motion.div>
        ))}
      </div>

      {/* Quick-access cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Aging Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Current (0–30 days)',  color: 'bg-emerald-500' },
              { label: '31–60 days',           color: 'bg-amber-500' },
              { label: '61–90 days',           color: 'bg-orange-500' },
              { label: '90+ days',             color: 'bg-red-500' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full shrink-0', color)} />
                <span className="text-xs text-white/50 flex-1">{label}</span>
                <span className="text-xs text-white/25">—</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/20 mt-4">Open the Bills tab for full aging details.</p>
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Bill Status Breakdown</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Draft',    color: 'text-white/40' },
              { label: 'Received', color: 'text-blue-400'  },
              { label: 'Partial',  color: 'text-amber-400' },
              { label: 'Paid',     color: 'text-emerald-400' },
              { label: 'Overdue',  color: 'text-red-400'   },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={cn('text-xs font-medium', color)}>{label}</span>
                <span className="text-xs text-white/25">Open Bills tab →</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Create new vendor bill'   },
              { label: 'Record a payment'          },
              { label: 'Add a vendor'              },
              { label: 'View overdue bills'        },
            ].map(({ label }) => (
              <div key={label}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 cursor-default transition-colors">
                <span className="w-1 h-1 rounded-full bg-amber-500/60" />
                {label}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/20 mt-4">Use the tabs above to navigate.</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountsPayable() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useAPPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Accounts Payable' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view Accounts Payable.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Accounts Payable' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Accounts Payable</h1>
            <p className="text-sm text-white/40 mt-1">Manage vendors, bills, and outgoing payments</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview'  && <OverviewTab />}
          {activeTab === 'vendors'   && <VendorsTab />}
          {activeTab === 'bills'     && <BillsTab />}
          {activeTab === 'payments'  && <APPaymentsTab />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
