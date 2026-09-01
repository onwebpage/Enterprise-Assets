import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, ChevronLeft, ChevronRight, Loader2,
  RefreshCw, LayoutList, BookOpen, AlertCircle, TrendingUp, TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccountParents } from '@/hooks/useChartOfAccounts';
import { useAccountLedger, useLedgerSummary } from '@/hooks/useGeneralLedger';
import { formatINR } from '@/lib/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number | string | undefined | null, opts?: { sign?: boolean }): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (isNaN(v) || v === 0) return '—';
  const abs = formatINR(Math.abs(v));
  if (opts?.sign) return v >= 0 ? `+${abs}` : `(${abs})`;
  return v < 0 ? `(${abs})` : abs;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_COLOR: Record<string, string> = {
  Asset:     'bg-blue-500/12 text-blue-400 border-blue-500/25',
  Liability: 'bg-red-500/12 text-red-400 border-red-500/25',
  Equity:    'bg-purple-500/12 text-purple-400 border-purple-500/25',
  Income:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  Expense:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {[50, 60, 80, 60, 60, 70].map((w, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: `${w}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Summary View ──────────────────────────────────────────────────────────────

function SummaryView({
  dateFrom, dateTo, onSelectAccount,
}: {
  dateFrom: string;
  dateTo:   string;
  onSelectAccount: (id: string) => void;
}) {
  const [summarySearch, setSummarySearch] = useState('');
  const { data: summaryRes, isLoading, isFetching, refetch } = useLedgerSummary({
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
  });

  const rows = (summaryRes?.data ?? []).filter((r) =>
    !summarySearch || r.accountCode.toLowerCase().includes(summarySearch.toLowerCase()) ||
    r.accountName.toLowerCase().includes(summarySearch.toLowerCase()),
  );

  const grandDebit  = rows.reduce((s, r) => s + parseFloat(r.totalDebit  ?? '0'), 0);
  const grandCredit = rows.reduce((s, r) => s + parseFloat(r.totalCredit ?? '0'), 0);

  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            placeholder="Search accounts…"
            value={summarySearch}
            onChange={(e) => setSummarySearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"
          title="Refresh"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.05] bg-white/[0.02]">
            {['Code', 'Account', 'Type', 'Total Debit', 'Total Credit', 'Net Change', 'Balance', 'Entries'].map((h) => (
              <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <LedgerSkeleton />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm text-white/30">
                No activity found for the selected period.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const d = parseFloat(row.totalDebit  ?? '0');
              const c = parseFloat(row.totalCredit ?? '0');
              const net = row.normalBalance === 'Debit' ? (d - c) : (c - d);
              return (
                <motion.tr
                  key={row.accountId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] cursor-pointer group last:border-0"
                  onClick={() => onSelectAccount(String(row.accountId))}
                >
                  <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{row.accountCode}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium group-hover:text-white transition-colors">
                    {row.accountName}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border', TYPE_COLOR[row.accountType])}>
                      {row.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-emerald-400 font-medium">
                    {fmtMoney(row.totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-400 font-medium">
                    {fmtMoney(row.totalCredit)}
                  </td>
                  <td className={cn('px-4 py-3 text-sm tabular-nums font-medium',
                    net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-white/30')}>
                    {fmtMoney(net, { sign: true })}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-white">
                    {fmtMoney(parseFloat(row.currentBalance ?? '0'))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-white/[0.05] text-white/40 border-white/10 text-[10px]">
                      {row.lineCount}
                    </Badge>
                  </td>
                </motion.tr>
              );
            })
          )}

          {/* Totals */}
          {rows.length > 0 && (
            <tr className="border-t-2 border-white/[0.08] bg-white/[0.02]">
              <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-white/50">Totals</td>
              <td className="px-4 py-3 text-sm font-bold text-emerald-400 tabular-nums">{fmtMoney(grandDebit)}</td>
              <td className="px-4 py-3 text-sm font-bold text-red-400 tabular-nums">{fmtMoney(grandCredit)}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Account Ledger View ───────────────────────────────────────────────────────

function AccountLedgerView({
  accountId, dateFrom, dateTo, onBack,
}: {
  accountId: string;
  dateFrom:  string;
  dateTo:    string;
  onBack:    () => void;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useAccountLedger({
    accountId,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
    page,
    limit: 50,
  });

  const lines      = data?.data       ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const account    = data?.account;

  return (
    <div className="space-y-3">
      {/* Back + account header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All Accounts
        </button>
        {account && (
          <>
            <span className="text-white/20">·</span>
            <span className="text-xs font-mono text-[#06B6D4]">{account.code}</span>
            <span className="text-sm font-medium text-white">{account.name}</span>
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ml-1', TYPE_COLOR[account.type])}>
              {account.type}
            </span>
            <span className="text-[10px] text-white/30 ml-1">Normal: {account.normalBalance}</span>
          </>
        )}
        <button
          onClick={() => refetch()}
          className="ml-auto p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Opening Balance', value: fmtMoney(data.openingBalance),    color: 'text-white' },
            { label: 'Total Debits',    value: fmtMoney(data.totalDebitInRange),  color: 'text-emerald-400' },
            { label: 'Total Credits',   value: fmtMoney(data.totalCreditInRange), color: 'text-red-400' },
            { label: 'Closing Balance', value: fmtMoney(data.closingBalance),     color: 'text-white font-bold' },
          ].map((k) => (
            <div key={k.label} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl px-4 py-3">
              <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">{k.label}</p>
              <p className={cn('text-lg font-bold tabular-nums', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ledger table */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Opening balance row */}
        {data && (
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-semibold text-white/50">
              Opening Balance{dateFrom ? ` — ${fmtDate(dateFrom)}` : ''}
            </span>
            <span className="text-sm font-bold text-white tabular-nums">{fmtMoney(data.openingBalance)}</span>
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {['Date', 'Entry #', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LedgerSkeleton />
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">
                  No posted entries for this account in the selected period.
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => {
                const d = parseFloat(line.debit  ?? '0');
                const c = parseFloat(line.credit ?? '0');
                return (
                  <motion.tr
                    key={line.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] last:border-0"
                  >
                    <td className="px-4 py-3 text-sm text-white/50 whitespace-nowrap">{fmtDate(line.date)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[#2563EB]">{line.entryNumber}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{line.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/70 max-w-[220px] truncate">
                      {line.description || line.memo}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-emerald-400">
                      {d > 0 ? formatINR(d) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-red-400">
                      {c > 0 ? formatINR(c) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-semibold text-white">
                      {fmtMoney(line.runningBalance)}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Closing balance */}
        {data && lines.length > 0 && page === totalPages && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-semibold text-white/50">
              Closing Balance{dateTo ? ` — ${fmtDate(dateTo)}` : ''}
            </span>
            <span className="text-sm font-bold text-white tabular-nums">{fmtMoney(data.closingBalance)}</span>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <p className="text-xs text-white/30">
              {`Showing ${(page - 1) * 50 + 1}–${Math.min(page * 50, total)} of ${total} lines`}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/40 px-2">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GeneralLedgerTab() {
  const [view, setView]           = useState<'summary' | 'account'>('summary');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountSearch,   setAccountSearch]   = useState('');
  const [dateFrom,        setDateFrom]        = useState('');
  const [dateTo,          setDateTo]          = useState('');

  const { data: parentsRes } = useAccountParents();
  const accounts = parentsRes?.data ?? [];

  function handleSelectAccount(id: string) {
    setSelectedAccount(id);
    setView('account');
  }

  function handleBack() {
    setView('summary');
    setSelectedAccount('');
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-lg p-0.5">
          <button
            onClick={() => { setView('summary'); setSelectedAccount(''); }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
              view === 'summary' && !selectedAccount
                ? 'bg-[#2563EB] text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <LayoutList className="w-3.5 h-3.5" />Summary
          </button>
          <button
            onClick={() => setView('account')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
              view === 'account' ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />Account Detail
          </button>
        </div>

        {/* Account selector (shown in account detail view) */}
        {view === 'account' && (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.07] rounded-md text-sm text-white/70 px-2 h-8 focus:outline-none focus:border-[#2563EB]/60 min-w-[200px]"
          >
            <option value="">— Select account —</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)} className="bg-[#0d1225]">
                {a.code} · {a.name}
              </option>
            ))}
          </select>
        )}

        {/* Date range */}
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
          className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-[140px]"
        />
        <span className="text-white/20 text-xs">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
          className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-[140px]"
        />

        {/* Clear dates */}
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Content */}
      {view === 'summary' ? (
        <SummaryView
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSelectAccount={handleSelectAccount}
        />
      ) : selectedAccount ? (
        <AccountLedgerView
          accountId={selectedAccount}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onBack={handleBack}
        />
      ) : (
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl flex flex-col items-center justify-center py-16 text-center gap-3">
          <BookOpen className="w-8 h-8 text-white/20" />
          <p className="text-sm text-white/40">Select an account from the dropdown above to view its ledger.</p>
          <Button variant="outline" size="sm" onClick={() => setView('summary')}
            className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8 mt-1">
            <LayoutList className="w-3.5 h-3.5 mr-1.5" />View Summary Instead
          </Button>
        </div>
      )}
    </div>
  );
}
