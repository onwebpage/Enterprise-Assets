import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckSquare, Trash2, RefreshCw, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  useDepreciationEntries, useRunDepreciation, usePostDepreciation, useDeleteDepreciationEntry,
  useAssetsPermissions,
  type AssetDepreciationEntry,
} from '@/hooks/useFixedAssets';

function fmt(v: string) {
  return '₹' + parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableSkeleton() {
  return (
    <>{Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-white/[0.04]">
        {Array.from({ length: 8 }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '50%' : '80%' }} />
          </td>
        ))}
      </tr>
    ))}</>
  );
}

const PAGE_LIMIT = 50;
const today = new Date();
const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

export default function DepreciationTab() {
  const [postedFilter, setPostedFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage]                 = useState(1);
  const [runPeriod, setRunPeriod]       = useState(defaultPeriod);
  const [selectedIds, setSelectedIds]   = useState<number[]>([]);
  const [runResult, setRunResult]       = useState<{ created: number; skipped: number } | null>(null);
  const [runError, setRunError]         = useState<string | null>(null);
  const [postError, setPostError]       = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useDepreciationEntries({
    posted: postedFilter, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useAssetsPermissions();
  const runMut  = useRunDepreciation();
  const postMut = usePostDepreciation();
  const delMut  = useDeleteDepreciationEntry();

  const entries    = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data?.depreciation ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const unposted = entries.filter((e) => !e.posted);
  const allUnpostedSelected = unposted.length > 0 && unposted.every((e) => selectedIds.includes(e.id));

  function toggleSelect(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (allUnpostedSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unposted.map((e) => e.id));
    }
  }

  async function handleRun() {
    setRunError(null);
    setRunResult(null);
    try {
      const res = await runMut.mutateAsync({ periodDate: runPeriod });
      const r = res.data;
      setRunResult({ created: r.created.length, skipped: r.skipped.length });
      setSelectedIds([]);
    } catch (e: any) {
      setRunError(e?.message ?? 'Failed to run depreciation');
    }
  }

  async function handlePost() {
    setPostError(null);
    const ids = selectedIds.filter((id) => entries.find((e) => e.id === id && !e.posted));
    if (ids.length === 0) return;
    try {
      await postMut.mutateAsync(ids);
      setSelectedIds([]);
    } catch (e: any) {
      setPostError(e?.message ?? 'Failed to post entries');
    }
  }

  async function handleDelete(entry: AssetDepreciationEntry) {
    try { await delMut.mutateAsync(entry.id); setSelectedIds((prev) => prev.filter((id) => id !== entry.id)); }
    catch { /* silently ignore – UI stays open */ }
  }

  return (
    <div className="space-y-4">
      {/* Run panel */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/70 mb-4">Run Depreciation</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-white/50 mb-1 block">Period (YYYY-MM)</Label>
            <Input value={runPeriod} onChange={(e) => setRunPeriod(e.target.value)} placeholder="YYYY-MM"
              className="bg-white/[0.04] border-white/[0.1] text-white font-mono w-36 h-9" />
          </div>
          {perms.canCreate && (
            <Button onClick={handleRun} disabled={runMut.isPending || !runPeriod.match(/^\d{4}-\d{2}$/)} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-9">
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {runMut.isPending ? 'Running…' : 'Run for All Active Assets'}
            </Button>
          )}
        </div>
        {runError  && <p className="text-xs text-red-400 mt-2">{runError}</p>}
        {runResult && (
          <p className="text-xs text-emerald-400 mt-2">
            ✓ {runResult.created} entr{runResult.created !== 1 ? 'ies' : 'y'} created
            {runResult.skipped > 0 ? `, ${runResult.skipped} skipped` : ''}.
          </p>
        )}
        <p className="text-[11px] text-white/20 mt-3">
          Calculates depreciation for every active asset that doesn't yet have an entry for the selected period.
          Review the entries below, then post to lock them in.
        </p>
      </div>

      {/* Entries table */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
            {[undefined, false, true].map((v, idx) => (
              <button key={idx}
                onClick={() => { setPostedFilter(v); setPage(1); setSelectedIds([]); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                  postedFilter === v
                    ? v === undefined ? 'bg-white/[0.08] text-white border-white/[0.15]'
                      : v ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
                           : 'bg-amber-500/12 text-amber-400 border-amber-500/25'
                    : 'border-white/[0.06] text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {v === undefined ? 'All' : v ? 'Posted' : 'Unposted'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => refetch()} disabled={isFetching}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            {selectedIds.length > 0 && perms.canEdit && (
              <Button size="sm" onClick={handlePost} disabled={postMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                {postMut.isPending ? 'Posting…' : `Post ${selectedIds.length} Entr${selectedIds.length !== 1 ? 'ies' : 'y'}`}
              </Button>
            )}
          </div>
        </div>

        {postError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{postError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 w-8">
                  <button onClick={toggleSelectAll}
                    className={cn('w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      allUnpostedSelected ? 'bg-[#2563EB] border-[#2563EB]' : 'border-white/[0.2] hover:border-white/[0.4]')}>
                    {allUnpostedSelected && <span className="text-white text-[9px] font-bold">✓</span>}
                  </button>
                </th>
                {['Asset', 'Asset #', 'Period', 'Depr. Amount', 'Accum. Depr.', 'Book Value', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9}><TableSkeleton /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center">
                  <TrendingDown className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No depreciation entries yet.</p>
                  <p className="text-xs text-white/20 mt-1">Use the Run Depreciation panel above to generate entries.</p>
                </td></tr>
              ) : entries.map((entry, i) => (
                <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                  <td className="px-4 py-3">
                    {!entry.posted && (
                      <button onClick={() => toggleSelect(entry.id)}
                        className={cn('w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          selectedIds.includes(entry.id) ? 'bg-[#2563EB] border-[#2563EB]' : 'border-white/[0.2] hover:border-white/[0.4]')}>
                        {selectedIds.includes(entry.id) && <span className="text-white text-[9px] font-bold">✓</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80 max-w-[180px] truncate">{entry.assetName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#2563EB]">{entry.assetNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/50 font-mono">{entry.periodDate}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white/80 tabular-nums">{fmt(entry.depreciationAmount)}</td>
                  <td className="px-4 py-3 text-sm text-white/60 tabular-nums">{fmt(entry.accumulatedDepreciation)}</td>
                  <td className="px-4 py-3 text-sm text-white/60 tabular-nums">{fmt(entry.bookValue)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
                      entry.posted
                        ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
                        : 'bg-amber-500/12 text-amber-400 border-amber-500/25')}>
                      {entry.posted ? 'Posted' : 'Unposted'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canDelete && !entry.posted && (
                        <button onClick={() => handleDelete(entry)}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No entries' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded text-xs transition-colors', p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>{p}</button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">Next →</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
