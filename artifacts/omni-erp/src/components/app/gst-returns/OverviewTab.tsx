import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, AlertCircle, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGSTReturnsSummary, type GSTReturnsByType } from '@/hooks/useGSTReturns';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (isNaN(n)) return '₹0';
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

const RETURN_LABELS: Record<string, string> = {
  gstr1: 'GSTR-1', gstr3b: 'GSTR-3B', gstr9: 'GSTR-9',
  gstr2a: 'GSTR-2A', gstr4: 'GSTR-4', gstr6: 'GSTR-6',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent, loading }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string; loading?: boolean;
}) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/40 font-medium">{label}</p>
        {loading
          ? <div className="h-6 w-24 bg-white/[0.04] rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-white mt-0.5 tabular-nums">{value}</p>
        }
        {sub && !loading && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ value, color }: { value: number | string; color: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', color)}>
      {value}
    </span>
  );
}

// ── Tax component bar ─────────────────────────────────────────────────────────

function TaxBar({ label, amount, color, barColor, max }: {
  label: string; amount: string; color: string; barColor: string; max: number;
}) {
  const n   = parseFloat(amount ?? '0');
  const pct = max > 0 ? Math.min(100, (n / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-semibold', color)}>{label}</span>
        <span className="text-xs text-white/50 tabular-nums">{fmtMoney(amount)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  onNavigate: () => void;
}

export default function OverviewTab({ onNavigate }: OverviewTabProps) {
  const { data: summaryRes, isLoading } = useGSTReturnsSummary();
  const s = summaryRes?.data;

  const taxComponents = [
    { label: 'CGST',  amount: s?.totalCgst ?? '0', color: 'text-blue-400',   barColor: 'bg-blue-500' },
    { label: 'SGST',  amount: s?.totalSgst ?? '0', color: 'text-indigo-400', barColor: 'bg-indigo-500' },
    { label: 'IGST',  amount: s?.totalIgst ?? '0', color: 'text-cyan-400',   barColor: 'bg-cyan-500' },
    { label: 'Cess',  amount: s?.totalCess ?? '0', color: 'text-amber-400',  barColor: 'bg-amber-500' },
  ];
  const maxTax = Math.max(...taxComponents.map((c) => parseFloat(c.amount ?? '0')), 1);

  const kpis = [
    {
      label: 'Total Returns',
      value: isLoading ? '—' : String(s?.totalReturns ?? 0),
      sub: `${s?.filedCount ?? 0} filed`,
      icon: FileText,
      accent: 'bg-[#2563EB]/20 text-[#60a5fa]',
    },
    {
      label: 'Filed',
      value: isLoading ? '—' : String(s?.filedCount ?? 0),
      sub: 'Successfully submitted',
      icon: CheckCircle,
      accent: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      label: 'Pending / Draft',
      value: isLoading ? '—' : String((s?.pendingCount ?? 0) + (s?.draftCount ?? 0)),
      sub: `${s?.overdueCount ?? 0} overdue`,
      icon: (s?.overdueCount ?? 0) > 0 ? AlertCircle : Clock,
      accent: (s?.overdueCount ?? 0) > 0 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400',
    },
    {
      label: 'Net Tax Payable',
      value: fmtMoney(s?.netPayable),
      sub: `ITC: ${fmtMoney(s?.totalItc)}`,
      icon: DollarSign,
      accent: 'bg-cyan-500/15 text-cyan-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.07 }}>
            <KpiCard {...k} loading={isLoading} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By return type */}
        <div className="lg:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white/70">Returns by Type</h3>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-white/[0.03] rounded animate-pulse" />
              ))}
            </div>
          ) : !s?.byType?.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-white/30">No returns created yet.</p>
              <button onClick={onNavigate} className="mt-2 text-xs text-[#60a5fa] hover:underline">
                Create your first return →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Return Type', 'Total', 'Filed', 'Pending', 'Overdue', 'Tax Liability'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-white/30 uppercase tracking-wide px-5 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.byType.map((row: GSTReturnsByType, i) => (
                  <motion.tr key={row.returnType}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-white/80">
                        {RETURN_LABELS[row.returnType] ?? row.returnType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-white/50 tabular-nums">{row.count}</td>
                    <td className="px-5 py-3">
                      <StatusPill value={row.filed} color={row.filed > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-white/25'} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill value={row.pending} color={row.pending > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-white/25'} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill value={row.overdue} color={row.overdue > 0 ? 'bg-red-500/15 text-red-400' : 'bg-white/[0.04] text-white/25'} />
                    </td>
                    <td className="px-5 py-3 text-sm tabular-nums text-white/70">{fmtMoney(row.totalTax)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Tax component breakdown */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <h3 className="text-sm font-semibold text-white/70">Tax Components</h3>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 bg-white/[0.03] rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {taxComponents.map((c) => (
                  <TaxBar key={c.label} {...c} max={maxTax} />
                ))}
                <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
                  <span className="text-xs text-white/40">Total Liability</span>
                  <span className="text-sm font-bold text-white tabular-nums">{fmtMoney(s?.totalTaxLiability)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Input Tax Credit</span>
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">− {fmtMoney(s?.totalItc)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-xs font-semibold text-white/60">Net Payable</span>
                  <span className="text-sm font-bold text-white tabular-nums">{fmtMoney(s?.netPayable)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Due soon */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white/70">Due in 7 Days</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-white/[0.03] rounded animate-pulse" />)}
              </div>
            ) : !s?.dueSoon?.length ? (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
                <p className="text-xs text-white/30">No returns due in the next 7 days.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.dueSoon.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <span className="text-xs font-semibold text-white/80">
                        {RETURN_LABELS[d.returnType] ?? d.returnType.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-white/35 ml-2">{d.period}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-amber-400 font-medium">{d.dueDate}</p>
                      <p className="text-[10px] text-white/30 capitalize">{d.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue alert */}
          {(s?.overdueCount ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">
                    {s!.overdueCount} overdue return{s!.overdueCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-red-400/70 mt-0.5">
                    Late filing attracts interest at 18% p.a. and ₹50/day penalty.
                  </p>
                  <button onClick={onNavigate}
                    className="mt-2 flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors">
                    View overdue returns <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
