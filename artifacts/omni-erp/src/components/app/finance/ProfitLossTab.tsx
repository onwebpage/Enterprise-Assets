import { useState } from 'react';
import { RefreshCw, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProfitLoss, type PLAccountRow } from '@/hooks/useGeneralLedger';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | number, parens = false): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (parens && n < 0) return `(${abs})`;
  return `$${abs}`;
}

// ── Row components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-white/[0.015]">
      <td className="px-5 py-2 text-[11px] font-bold text-white/50 uppercase tracking-widest" colSpan={2}>
        {label}
      </td>
    </tr>
  );
}

function AccountRow({ row, negate }: { row: PLAccountRow; negate?: boolean }) {
  const amount = parseFloat(row.amount);
  const display = negate ? -amount : amount;
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-5 py-2 pl-9 text-sm text-white/60">{row.accountName}</td>
      <td className="px-5 py-2 text-sm text-right tabular-nums text-white/75">
        {fmtMoney(display, true)}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <tr className={cn(highlight ? 'bg-[#2563EB]/8' : '')}>
      <td className={cn('px-5 py-2.5 text-sm font-semibold', highlight ? 'text-white' : 'text-white/80')}>
        {label}
      </td>
      <td className={cn('px-5 py-2.5 text-sm font-semibold text-right tabular-nums', highlight ? 'text-white' : 'text-white/80')}>
        {fmtMoney(value, true)}
      </td>
    </tr>
  );
}

function Divider() {
  return (
    <tr>
      <td colSpan={2} className="px-5 py-1">
        <div className="h-px bg-white/[0.06]" />
      </td>
    </tr>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-2.5 pl-9">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: `${40 + (i % 3) * 15}%` }} />
          </td>
          <td className="px-5 py-2.5">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse w-20 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProfitLossTab() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const { data, isLoading, isFetching, refetch } = useProfitLoss(
    dateFrom || dateTo ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } : {},
  );

  const income       = data?.data?.income   ?? [];
  const expenses     = data?.data?.expenses ?? [];
  const totalIncome  = parseFloat(data?.totalIncome   ?? '0');
  const totalExpenses= parseFloat(data?.totalExpenses ?? '0');
  const netProfit    = parseFloat(data?.netProfit     ?? '0');
  const hasData      = income.length > 0 || expenses.length > 0;

  const netColor = netProfit > 0
    ? 'text-emerald-400'
    : netProfit < 0
      ? 'text-red-400'
      : 'text-white/50';

  const NetIcon = netProfit > 0 ? TrendingUp : netProfit < 0 ? TrendingDown : Minus;

  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Profit &amp; Loss Statement</h3>
          <p className="text-xs text-white/35 mt-0.5">
            {dateFrom || dateTo
              ? `${dateFrom || 'Start'} → ${dateTo || 'Today'}`
              : 'All posted entries · income vs expenses'}
          </p>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50"
          />
          <span className="text-white/25 text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {!isLoading && hasData && (
            <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold', netColor)}>
              <NetIcon className="w-4 h-4" />
              {fmtMoney(Math.abs(netProfit))} {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
            </span>
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

      {/* Statement table */}
      {!hasData && !isLoading ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-white/30">No income or expense entries found.</p>
          <p className="text-xs text-white/20 mt-1">Post journal entries to Income or Expense accounts to see the P&amp;L here.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05] bg-white/[0.01]">
              <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-5 py-3">Description</th>
              <th className="text-right text-[11px] font-semibold text-white/30 uppercase tracking-wide px-5 py-3 w-40">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Income section */}
            <SectionHeader label="Revenue / Income" />
            {isLoading ? (
              <SkeletonRows count={3} />
            ) : income.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-2 pl-9 text-xs text-white/25 italic">No income accounts with activity</td>
              </tr>
            ) : (
              income.map((row: PLAccountRow) => <AccountRow key={row.accountId} row={row} />)
            )}
            <Divider />
            <SubtotalRow label="Total Revenue" value={totalIncome} highlight />
            <Divider />

            {/* Expenses section */}
            <SectionHeader label="Operating Expenses" />
            {isLoading ? (
              <SkeletonRows count={4} />
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-2 pl-9 text-xs text-white/25 italic">No expense accounts with activity</td>
              </tr>
            ) : (
              expenses.map((row: PLAccountRow) => <AccountRow key={row.accountId} row={row} />)
            )}
            <Divider />
            <SubtotalRow label="Total Expenses" value={totalExpenses} />
            <Divider />

            {/* Net Profit / Loss */}
            <tr className={cn(
              netProfit > 0 ? 'bg-emerald-500/[0.06]' : netProfit < 0 ? 'bg-red-500/[0.06]' : 'bg-white/[0.02]',
            )}>
              <td className={cn('px-5 py-3.5 text-sm font-bold', netColor)}>
                {netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
              </td>
              <td className={cn('px-5 py-3.5 text-sm font-bold text-right tabular-nums', netColor)}>
                {fmtMoney(Math.abs(netProfit))}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
