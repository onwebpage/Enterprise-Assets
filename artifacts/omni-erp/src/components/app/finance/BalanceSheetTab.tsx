import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBalanceSheet, type BSRow } from '@/hooks/useGeneralLedger';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmt(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${abs})` : `$${abs}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <tr className="bg-white/[0.015]">
      <td colSpan={2} className="px-5 py-2 text-[11px] font-bold text-white/50 uppercase tracking-widest">
        {label}
      </td>
    </tr>
  );
}

function AccountRow({ row, i }: { row: BSRow; i: number }) {
  const n = parseFloat(row.balance);
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(i, 12) * 0.02 }}
      className="hover:bg-white/[0.02] transition-colors"
    >
      <td className="px-5 py-2 pl-9 text-sm text-white/60">{row.accountName}</td>
      <td className={cn('px-5 py-2 text-sm text-right tabular-nums', n < 0 ? 'text-red-400' : 'text-white/75')}>
        {fmtAmt(row.balance)}
      </td>
    </motion.tr>
  );
}

function TotalRow({ label, value, highlight, border }: { label: string; value: string; highlight?: boolean; border?: boolean }) {
  return (
    <tr className={cn(highlight ? 'bg-[#2563EB]/8' : '', border ? 'border-t border-white/[0.08]' : '')}>
      <td className={cn('px-5 py-2.5 text-sm font-semibold', highlight ? 'text-white' : 'text-white/80')}>{label}</td>
      <td className={cn('px-5 py-2.5 text-sm font-semibold text-right tabular-nums', highlight ? 'text-white' : 'text-white/80')}>
        {fmtAmt(value)}
      </td>
    </tr>
  );
}

function Divider() {
  return (
    <tr><td colSpan={2} className="px-5 py-1"><div className="h-px bg-white/[0.06]" /></td></tr>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-2.5 pl-9">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: `${35 + (i % 4) * 12}%` }} />
          </td>
          <td className="px-5 py-2.5">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse w-20 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 border-r border-white/[0.05] last:border-r-0 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.05] bg-white/[0.01]">
            <th colSpan={2} className="text-left text-[11px] font-bold text-white/40 uppercase tracking-widest px-5 py-3">
              {head}
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BalanceSheetTab() {
  const [asOf, setAsOf] = useState('');
  const { data, isLoading, isFetching, refetch } = useBalanceSheet(asOf ? { asOf } : {});

  const assets      = data?.data?.assets      ?? [];
  const liabilities = data?.data?.liabilities ?? [];
  const equity      = data?.data?.equity      ?? [];

  const totalAssets  = data?.totalAssets            ?? '0';
  const totalLiab    = data?.totalLiabilities       ?? '0';
  const totalEq      = data?.totalEquity            ?? '0';
  const totalLE      = data?.totalLiabilitiesEquity ?? '0';
  const netIncome    = data?.netIncome              ?? '0';
  const balanced     = data?.balanced               ?? false;
  const hasData      = assets.length > 0 || liabilities.length > 0 || equity.length > 0;

  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Balance Sheet</h3>
          <p className="text-xs text-white/35 mt-0.5">
            {asOf ? `As at ${asOf}` : 'Current balances — all posted entries'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-white/40">As of</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-[#2563EB]/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {!isLoading && hasData && (
            balanced ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3" />Balanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                <AlertCircle className="w-3 h-3" />Review equation
              </span>
            )
          )}
          <button
            onClick={() => refetch()} disabled={isFetching}
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

      {/* Two-column layout */}
      {!hasData && !isLoading ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-white/30">No account balances found.</p>
          <p className="text-xs text-white/20 mt-1">Post journal entries to see the balance sheet.</p>
        </div>
      ) : (
        <div className="flex divide-x divide-white/[0.05]">
          {/* ASSETS */}
          <Column head="Assets">
            <SectionHead label="Assets" />
            {isLoading ? <SkeletonRows n={5} /> : assets.map((r, i) => <AccountRow key={r.accountId} row={r} i={i} />)}
            <Divider />
            <TotalRow label="TOTAL ASSETS" value={totalAssets} highlight border />
          </Column>

          {/* LIABILITIES + EQUITY */}
          <Column head="Liabilities &amp; Equity">
            <SectionHead label="Liabilities" />
            {isLoading ? <SkeletonRows n={3} /> : liabilities.map((r, i) => <AccountRow key={r.accountId} row={r} i={i} />)}
            <Divider />
            <TotalRow label="Total Liabilities" value={totalLiab} />
            <Divider />

            <SectionHead label="Equity" />
            {isLoading ? <SkeletonRows n={2} /> : equity.map((r, i) => <AccountRow key={r.accountId} row={r} i={i} />)}

            {/* Net Income as equity component */}
            {!isLoading && (
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-2 pl-9 text-sm text-white/60">
                  Current Period Net Income
                  <span className="text-[10px] text-white/30 ml-1">(P&amp;L)</span>
                </td>
                <td className={cn('px-5 py-2 text-sm text-right tabular-nums',
                  parseFloat(netIncome) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {fmtAmt(netIncome)}
                </td>
              </tr>
            )}

            <Divider />
            <TotalRow label="Total Equity" value={totalEq} />
            <Divider />
            <TotalRow label="TOTAL LIABILITIES + EQUITY" value={totalLE} highlight border />
          </Column>
        </div>
      )}
    </div>
  );
}
