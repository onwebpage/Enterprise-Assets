import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCashFlow, type CFLineItem } from '@/hooks/useGeneralLedger';
import { formatINR } from '@/lib/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmt(v: string | number, showSign = false): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (n < 0) return `(${formatINR(Math.abs(n))})`;
  if (showSign && n > 0) return `+${formatINR(n)}`;
  return formatINR(n);
}

function amtColor(v: string) {
  const n = parseFloat(v);
  if (n > 0)  return 'text-emerald-400';
  if (n < 0)  return 'text-red-400';
  return 'text-white/40';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, total, color }: { label: string; total: string; color?: string }) {
  return (
    <tr className="bg-white/[0.015]">
      <td className="px-5 py-2.5 text-[11px] font-bold text-white/50 uppercase tracking-widest">{label}</td>
      <td className={cn('px-5 py-2.5 text-xs font-semibold text-right tabular-nums', color ?? amtColor(total))}>
        {fmtAmt(total, true)}
      </td>
    </tr>
  );
}

function LineItem({ row, i, flip = false }: { row: CFLineItem; i: number; flip?: boolean }) {
  const display = flip ? (-parseFloat(row.amount)).toFixed(2) : row.amount;
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(i, 10) * 0.025 }}
      className="hover:bg-white/[0.02] transition-colors"
    >
      <td className="px-5 py-1.5 pl-9 text-sm text-white/55">{row.accountName}</td>
      <td className={cn('px-5 py-1.5 text-sm text-right tabular-nums', amtColor(display))}>
        {fmtAmt(display, true)}
      </td>
    </motion.tr>
  );
}

function SubtotalRow({ label, value, highlight, border }: { label: string; value: string; highlight?: boolean; border?: boolean }) {
  return (
    <tr className={cn(highlight ? 'bg-[#2563EB]/8' : '', border ? 'border-t border-white/[0.08]' : '')}>
      <td className={cn('px-5 py-2.5 text-sm font-semibold', highlight ? 'text-white' : 'text-white/80')}>{label}</td>
      <td className={cn('px-5 py-2.5 text-sm font-semibold text-right tabular-nums', highlight ? amtColor(value) : amtColor(value))}>
        {fmtAmt(value, true)}
      </td>
    </tr>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-5 py-1.5 pl-9 text-sm text-white/55">{label}</td>
      <td className={cn('px-5 py-1.5 text-sm text-right tabular-nums', amtColor(value))}>
        {fmtAmt(value, true)}
      </td>
    </tr>
  );
}

function Divider() {
  return <tr><td colSpan={2} className="px-5 py-1"><div className="h-px bg-white/[0.06]" /></td></tr>;
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-2 pl-9">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: `${35 + (i % 4) * 12}%` }} />
          </td>
          <td className="px-5 py-2">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse w-16 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CashFlowTab() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const { data, isLoading, isFetching, refetch } = useCashFlow(
    dateFrom || dateTo ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } : {},
  );

  const op  = data?.operating;
  const inv = data?.investing;
  const fin = data?.financing;

  const netCash    = data?.netCashChange ?? '0';
  const opening    = data?.openingCash  ?? '0';
  const closing    = data?.closingCash  ?? '0';
  const hasData    = !!(op || inv || fin);

  const netCashN = parseFloat(netCash);
  const NetIcon  = netCashN > 0 ? TrendingUp : netCashN < 0 ? TrendingDown : Minus;
  const netColor = netCashN > 0 ? 'text-emerald-400' : netCashN < 0 ? 'text-red-400' : 'text-white/40';

  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Cash Flow Statement</h3>
          <p className="text-xs text-white/35 mt-0.5">
            Indirect method ·{' '}
            {dateFrom || dateTo ? `${dateFrom || 'Start'} → ${dateTo || 'Today'}` : 'all posted entries'}
          </p>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50" />
          <span className="text-white/25 text-xs">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50" />
        </div>

        <div className="flex items-center gap-2">
          {!isLoading && hasData && (
            <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold', netColor)}>
              <NetIcon className="w-4 h-4" />
              {fmtAmt(Math.abs(netCashN))} {netCashN >= 0 ? 'net inflow' : 'net outflow'}
            </span>
          )}
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40">
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          </button>
          <Button variant="outline" size="sm"
            className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />Export
          </Button>
        </div>
      </div>

      {/* Statement */}
      {!hasData && !isLoading ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-white/30">No posted entries found for this period.</p>
          <p className="text-xs text-white/20 mt-1">Post journal entries to generate a cash flow statement.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05] bg-white/[0.01]">
              <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-5 py-3">Description</th>
              <th className="text-right text-[11px] font-semibold text-white/30 uppercase tracking-wide px-5 py-3 w-36">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* ── OPERATING ─────────────────────────────────── */}
            <SectionHeader label="Operating Activities" total={op?.total ?? '0'} />

            {isLoading ? <SkeletonRows n={5} /> : (
              <>
                <NoteRow label="Net Income" value={op?.netIncome ?? '0'} />

                {(op?.depreciation?.length ?? 0) > 0 && (
                  <>
                    <tr><td colSpan={2} className="px-5 pt-2 pb-0.5 text-[10px] text-white/25 pl-9 uppercase tracking-wider">Add back: non-cash items</td></tr>
                    {(op?.depreciation ?? []).map((r: CFLineItem, i: number) => (
                      <LineItem key={r.accountId} row={r} i={i} />
                    ))}
                  </>
                )}

                {(op?.wcAssets?.length ?? 0) > 0 && (
                  <>
                    <tr><td colSpan={2} className="px-5 pt-2 pb-0.5 text-[10px] text-white/25 pl-9 uppercase tracking-wider">Changes in working capital — assets</td></tr>
                    {(op?.wcAssets ?? []).map((r: CFLineItem, i: number) => (
                      <LineItem key={r.accountId} row={r} i={i} />
                    ))}
                  </>
                )}

                {(op?.wcLiabilities?.length ?? 0) > 0 && (
                  <>
                    <tr><td colSpan={2} className="px-5 pt-2 pb-0.5 text-[10px] text-white/25 pl-9 uppercase tracking-wider">Changes in working capital — liabilities</td></tr>
                    {(op?.wcLiabilities ?? []).map((r: CFLineItem, i: number) => (
                      <LineItem key={r.accountId} row={r} i={i} />
                    ))}
                  </>
                )}
              </>
            )}
            <Divider />
            <SubtotalRow label="Net Cash from Operating Activities" value={op?.total ?? '0'} highlight border />
            <Divider />

            {/* ── INVESTING ─────────────────────────────────── */}
            <SectionHeader label="Investing Activities" total={inv?.total ?? '0'} />
            {isLoading ? <SkeletonRows n={2} /> : (inv?.items?.length ?? 0) === 0 ? (
              <tr><td colSpan={2} className="px-5 py-1.5 pl-9 text-xs text-white/25 italic">No investing account movements in period</td></tr>
            ) : (
              (inv?.items ?? []).map((r: CFLineItem, i: number) => <LineItem key={r.accountId} row={r} i={i} />)
            )}
            <Divider />
            <SubtotalRow label="Net Cash from Investing Activities" value={inv?.total ?? '0'} border />
            <Divider />

            {/* ── FINANCING ─────────────────────────────────── */}
            <SectionHeader label="Financing Activities" total={fin?.total ?? '0'} />
            {isLoading ? <SkeletonRows n={2} /> : (fin?.items?.length ?? 0) === 0 ? (
              <tr><td colSpan={2} className="px-5 py-1.5 pl-9 text-xs text-white/25 italic">No financing account movements in period</td></tr>
            ) : (
              (fin?.items ?? []).map((r: CFLineItem, i: number) => <LineItem key={r.accountId} row={r} i={i} />)
            )}
            <Divider />
            <SubtotalRow label="Net Cash from Financing Activities" value={fin?.total ?? '0'} border />
            <Divider />

            {/* ── CASH SUMMARY ──────────────────────────────── */}
            {!isLoading && (
              <>
                <tr className={cn(parseFloat(netCash) >= 0 ? 'bg-emerald-500/[0.06]' : 'bg-red-500/[0.06]')}>
                  <td className={cn('px-5 py-3 text-sm font-bold', netColor)}>
                    Net Increase / (Decrease) in Cash
                  </td>
                  <td className={cn('px-5 py-3 text-sm font-bold text-right tabular-nums', netColor)}>
                    {fmtAmt(netCash, true)}
                  </td>
                </tr>
                <NoteRow label="Opening Cash Balance" value={opening} />
                <tr className="bg-white/[0.02] border-t border-white/[0.06]">
                  <td className="px-5 py-2.5 text-sm font-semibold text-white">Closing Cash Balance</td>
                  <td className="px-5 py-2.5 text-sm font-semibold text-right tabular-nums text-white">
                    {fmtAmt(closing)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      )}

      {/* Disclosure */}
      <div className="px-5 py-3 border-t border-white/[0.04]">
        <p className="text-[11px] text-white/20">
          Prepared using the indirect method. Account classification is based on account type and name.
          Opening cash is estimated as closing cash less net period change.
        </p>
      </div>
    </div>
  );
}
