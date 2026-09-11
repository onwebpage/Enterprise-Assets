import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, TrendingDown, TrendingUp, Clock, CheckCircle, DollarSign, BookOpen, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useTDSSummary, useTDSPermissions } from '@/hooks/useTDS';
import TDSEntriesTab    from '@/components/app/tds/TDSEntriesTab';
import TDSPaymentsTab   from '@/components/app/tds/TDSPaymentsTab';
import TDSSectionsGuide from '@/components/app/tds/TDSSectionsGuide';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'tds' | 'tcs' | 'payments' | 'sections';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 10_00_000)   return `₹${(n / 10_00_000).toFixed(2)}L`;
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

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data: summaryRes, isLoading } = useTDSSummary();
  const s = summaryRes?.data;

  const kpis: KpiCardProps[] = [
    {
      label:  'TDS Deducted',
      value:  fmtMoney(s?.tds.totalDeducted),
      sub:    s ? `${s.tds.count} entries` : '',
      icon:   TrendingDown,
      accent: 'bg-[#2563EB]/20 text-[#60a5fa]',
      loading: isLoading,
    },
    {
      label:  'TCS Collected',
      value:  fmtMoney(s?.tcs.totalCollected),
      sub:    s ? `${s.tcs.count} entries` : '',
      icon:   TrendingUp,
      accent: 'bg-violet-500/15 text-violet-400',
      loading: isLoading,
    },
    {
      label:  'Pending Deposit',
      value:  fmtMoney(s?.pendingDeposit.amount),
      sub:    s ? `${s.pendingDeposit.count} entries pending` : '',
      icon:   Clock,
      accent: 'bg-amber-500/15 text-amber-400',
      loading: isLoading,
    },
    {
      label:  'YTD Paid',
      value:  fmtMoney(s?.ytdPaid.amount),
      sub:    s ? `${s.ytdPaid.count} challan payments` : '',
      icon:   CheckCircle,
      accent: 'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
  ];

  const statusBreakdown = s?.statusBreakdown ?? [];
  const topSections     = s?.topSections ?? [];
  const recentEntries   = s?.recentEntries ?? [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Breakdown */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Status Breakdown</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/[0.04] rounded animate-pulse" />)}
            </div>
          ) : statusBreakdown.length === 0 ? (
            <p className="text-white/25 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {statusBreakdown.map((row) => {
                const colors: Record<string, string> = {
                  deducted:  'bg-[#2563EB]',
                  deposited: 'bg-amber-500',
                  filed:     'bg-emerald-500',
                  pending:   'bg-white/30',
                };
                const total = statusBreakdown.reduce((a, b) => a + b.count, 0);
                const pct   = total > 0 ? (row.count / total) * 100 : 0;
                return (
                  <div key={row.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-white/60">{row.status}</span>
                      <span className="text-white/40">{row.count} • {fmtMoney(row.amount)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', colors[row.status] ?? 'bg-white/30')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Sections */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Top Sections by Amount</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-7 bg-white/[0.04] rounded animate-pulse" />)}
            </div>
          ) : topSections.length === 0 ? (
            <p className="text-white/25 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topSections.map((row) => (
                <div key={`${row.section}-${row.entryType}`} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border',
                      row.entryType === 'tds'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                        : 'border-violet-500/30 bg-violet-500/10 text-violet-400')}>
                      {row.section}
                    </span>
                    <span className="text-xs text-white/40 tabular-nums">{row.count} entries</span>
                  </div>
                  <span className="text-xs font-semibold text-white/70 tabular-nums shrink-0">
                    {fmtMoney(row.totalTax)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Entries */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/70">Recent Entries</h3>
            <button onClick={() => onNavigate('tds')}
              className="text-[11px] text-[#60a5fa] hover:text-[#93c5fd] transition-colors">
              View all →
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded animate-pulse" />)}
            </div>
          ) : recentEntries.length === 0 ? (
            <p className="text-white/25 text-sm">No entries yet</p>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-white/70 truncate font-medium">{e.partyName}</p>
                    <p className="text-[11px] text-white/35">
                      <span className="font-mono">{e.section}</span> · {e.transactionDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[#60a5fa] tabular-nums">{fmtMoney(e.taxAmount)}</p>
                    <p className="text-[10px] capitalize text-white/30">{e.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Add TDS Entry', sub: 'Record deduction at source', tab: 'tds' as Tab, color: 'text-[#60a5fa]', bg: 'bg-[#2563EB]/10 hover:bg-[#2563EB]/15' },
          { label: 'Add TCS Entry', sub: 'Record collection at source', tab: 'tcs' as Tab, color: 'text-violet-400', bg: 'bg-violet-500/10 hover:bg-violet-500/15' },
          { label: 'Record Challan', sub: 'Log government deposit', tab: 'payments' as Tab, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/15' },
        ].map((a) => (
          <button key={a.label} onClick={() => onNavigate(a.tab)}
            className={cn('rounded-xl p-4 text-left border border-white/[0.07] transition-colors', a.bg)}>
            <p className={cn('text-sm font-semibold', a.color)}>{a.label}</p>
            <p className="text-xs text-white/35 mt-0.5">{a.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'       },
  { id: 'tds',       label: 'TDS Entries'    },
  { id: 'tcs',       label: 'TCS Entries'    },
  { id: 'payments',  label: 'Challan Payments' },
  { id: 'sections',  label: 'Sections Guide' },
];

export default function TDSPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useTDSPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'TDS & TCS' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view TDS & TCS.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'TDS & TCS' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">TDS & TCS Management</h1>
            <p className="text-sm text-white/40 mt-1">
              Manage Tax Deducted at Source, Tax Collected at Source, and challan deposits
            </p>
          </div>
          <button onClick={() => setActiveTab('sections')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-transparent text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors">
            <BookOpen className="w-3.5 h-3.5" />
            Sections Guide
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === t.id
                  ? 'border-[#2563EB] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70',
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview'  && <OverviewTab onNavigate={setActiveTab} />}
          {activeTab === 'tds'       && <TDSEntriesTab entryType="tds" />}
          {activeTab === 'tcs'       && <TDSEntriesTab entryType="tcs" />}
          {activeTab === 'payments'  && <TDSPaymentsTab />}
          {activeTab === 'sections'  && <TDSSectionsGuide />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
