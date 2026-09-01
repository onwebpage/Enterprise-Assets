import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTrialBalance, type TrialBalanceRow } from '@/hooks/useGeneralLedger';
import { formatINR } from '@/lib/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string) {
  const n = parseFloat(v);
  if (n === 0) return null;
  return formatINR(n);
}

const TYPE_COLORS: Record<string, string> = {
  Asset:     'bg-blue-500/12 text-blue-400 border-blue-500/25',
  Liability: 'bg-red-500/12 text-red-400 border-red-500/25',
  Equity:    'bg-purple-500/12 text-purple-400 border-purple-500/25',
  Income:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  Expense:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {[40, 55, 14, 18, 18].map((w, j) => (
            <td key={j} className="px-4 py-2.5">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: `${w}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrialBalanceTab() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const { data, isLoading, isFetching, refetch } = useTrialBalance(
    dateFrom || dateTo ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } : {},
  );

  const rows        = data?.data ?? [];
  const totalDebit  = data?.totalDebit  ?? '0';
  const totalCredit = data?.totalCredit ?? '0';
  const balanced    = data?.balanced ?? false;
  const hasData     = rows.length > 0;

  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Trial Balance</h3>
          <p className="text-xs text-white/35 mt-0.5">
            {dateFrom || dateTo
              ? `${dateFrom || 'Start'} → ${dateTo || 'Today'}`
              : 'All posted entries · current balances'}
          </p>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50"
            placeholder="From"
          />
          <span className="text-white/25 text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50"
            placeholder="To"
          />
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2">
          {!isLoading && hasData && (
            balanced ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3" />Balanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                <AlertCircle className="w-3 h-3" />Out of balance
              </span>
            )
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          </button>
          <Button variant="outline" size="sm"
            className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.05] bg-white/[0.015]">
            {['Code', 'Account Name', 'Type', 'Debit', 'Credit'].map((h, i) => (
              <th key={h}
                className={cn(
                  'text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3',
                  i >= 3 ? 'text-right' : 'text-left',
                )}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <Skeleton />
          ) : !hasData ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">No posted entries found.</p>
                <p className="text-xs text-white/20 mt-1">Post journal entries to see account balances here.</p>
              </td>
            </tr>
          ) : (
            rows.map((row: TrialBalanceRow, i: number) => {
              const debit  = fmt(row.debitBalance);
              const credit = fmt(row.creditBalance);
              return (
                <motion.tr
                  key={row.accountId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i, 15) * 0.02 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-0"
                >
                  <td className="px-4 py-2.5 text-sm font-mono text-[#06B6D4]">{row.accountCode}</td>
                  <td className="px-4 py-2.5 text-sm text-white/75">{row.accountName}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                      TYPE_COLORS[row.accountType] ?? 'bg-white/[0.05] text-white/40 border-white/[0.08]',
                    )}>
                      {row.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-right">
                    {debit
                      ? <span className="text-white font-medium">{debit}</span>
                      : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-right">
                    {credit
                      ? <span className="text-white font-medium">{credit}</span>
                      : <span className="text-white/15">—</span>}
                  </td>
                </motion.tr>
              );
            })
          )}
        </tbody>

        {/* Totals footer */}
        {hasData && !isLoading && (
          <tfoot>
            <tr className={cn(
              'border-t-2',
              balanced ? 'border-white/[0.1] bg-white/[0.025]' : 'border-red-500/30 bg-red-500/[0.04]',
            )}>
              <td className="px-4 py-3 text-sm font-bold text-white" colSpan={3}>Totals</td>
              <td className="px-4 py-3 text-sm font-bold text-white tabular-nums text-right">
                ${parseFloat(totalDebit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-white tabular-nums text-right">
                ${parseFloat(totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
            {!balanced && (
              <tr className="bg-red-500/[0.04]">
                <td colSpan={5} className="px-4 pb-3 text-xs text-red-400 text-right">
                  Difference: ${Math.abs(parseFloat(totalDebit) - parseFloat(totalCredit)).toFixed(2)} — check for unbalanced journal entries
                </td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}
