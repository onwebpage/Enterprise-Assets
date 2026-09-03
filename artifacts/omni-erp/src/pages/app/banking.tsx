import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ArrowUpRight, GitMerge, AlertCircle, DollarSign } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useBankingSummary, useBankingPermissions } from '@/hooks/useBanking';
import { formatINR } from '@/lib/currency';
import AccountsTab from '@/components/app/banking/AccountsTab';
import TransactionsTab from '@/components/app/banking/TransactionsTab';
import ReconciliationsTab from '@/components/app/banking/ReconciliationsTab';
import ChequesTab from '@/components/app/banking/ChequesTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'accounts' | 'transactions' | 'reconciliations' | 'cheques';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  return formatINR(v, true);
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
  const { data: summary, isLoading } = useBankingSummary();
  const s = summary?.data;

  const kpis: KpiCardProps[] = [
    {
      label: 'Total Cash Balance',
      value: fmtMoney(s?.totalBalance),
      sub:   `Across ${s?.accountCount ?? 0} active account${(s?.accountCount ?? 0) !== 1 ? 's' : ''}`,
      icon:  DollarSign,
      accent: 'bg-blue-500/20 text-blue-400',
      loading: isLoading,
    },
    {
      label: 'Unreconciled Transactions',
      value: isLoading ? '—' : String(s?.unreconciledCount ?? 0),
      sub:   'Awaiting reconciliation',
      icon:  AlertCircle,
      accent: 'bg-amber-500/15 text-amber-400',
      loading: isLoading,
    },
    {
      label: 'Completed Reconciliations',
      value: isLoading ? '—' : String(s?.completedReconciliations ?? 0),
      sub:   'All-time',
      icon:  GitMerge,
      accent: 'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
    {
      label: 'Active Accounts',
      value: isLoading ? '—' : String(s?.accountCount ?? 0),
      sub:   'Bank & cash accounts',
      icon:  Building2,
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
          <h3 className="text-sm font-semibold text-white/70 mb-3">Account Types</h3>
          <div className="space-y-3">
            {[
              { label: 'Checking Accounts',  color: 'bg-blue-500' },
              { label: 'Savings Accounts',   color: 'bg-emerald-500' },
              { label: 'Credit Accounts',    color: 'bg-amber-500' },
              { label: 'Cash Accounts',      color: 'bg-purple-500' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full shrink-0', color)} />
                <span className="text-xs text-white/50 flex-1">{label}</span>
                <span className="text-xs text-white/25">Open Accounts tab →</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Reconciliation Status</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Draft',     color: 'text-amber-400' },
              { label: 'Completed', color: 'text-emerald-400' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={cn('text-xs font-medium', color)}>{label}</span>
                <span className="text-xs text-white/25">Open Reconciliations tab →</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/20 mt-4">
            Mark statement transactions as cleared and compare against your bank statement balance.
          </p>
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add a bank account' },
              { label: 'Import bank transactions' },
              { label: 'Start a new reconciliation' },
              { label: 'View unreconciled items' },
            ].map(({ label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 cursor-default transition-colors">
                <span className="w-1 h-1 rounded-full bg-blue-500/60" />
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

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',        label: 'Overview'        },
  { id: 'accounts',        label: 'Accounts'        },
  { id: 'transactions',    label: 'Transactions'    },
  { id: 'reconciliations', label: 'Reconciliations' },
  { id: 'cheques',         label: 'Cheques'         },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Banking() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useBankingPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Bank Reconciliation' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view Banking.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Bank Reconciliation' }]}>
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Bank Reconciliation</h1>
            <p className="text-sm text-white/40 mt-1">Manage bank accounts, transactions, and statement reconciliations</p>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70')}>
              {t.label}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview'        && <OverviewTab />}
          {activeTab === 'accounts'        && <AccountsTab />}
          {activeTab === 'transactions'    && <TransactionsTab />}
          {activeTab === 'reconciliations' && <ReconciliationsTab />}
          {activeTab === 'cheques'         && <ChequesTab />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
