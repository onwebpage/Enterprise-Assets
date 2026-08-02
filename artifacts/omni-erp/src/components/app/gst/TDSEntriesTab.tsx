import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useTDSEntries, useCreateTDSEntry, useUpdateTDSEntry, useDeleteTDSEntry,
  useGSTPermissions, type TDSEntry, type TDSEntryFormValues, type TDSStatus,
} from '@/hooks/useGST';
import TDSEntryFormModal from './TDSEntryFormModal';
import GSTDeleteDialog from './GSTDeleteDialog';

const STATUS_COLORS: Record<TDSStatus, string> = {
  deducted:  'bg-blue-500/12 text-blue-400 border-blue-500/25',
  deposited: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  filed:     'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  pending:   'bg-white/[0.06] text-white/40 border-white/[0.1]',
};

const PAGE_LIMIT = 25;

function fmtINR(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TDSEntriesTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editEntry, setEditEntry]     = useState<TDSEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TDSEntry | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useTDSEntries({
    search: search || undefined, status: statusFilter || undefined,
    entryType: typeFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useGSTPermissions();
  const createMut = useCreateTDSEntry();
  const updateMut = useUpdateTDSEntry();
  const deleteMut = useDeleteTDSEntry();

  const entries    = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: TDSEntryFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create entry'); }
  }

  async function handleUpdate(values: TDSEntryFormValues) {
    if (!editEntry) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editEntry.id, data: values }); setEditEntry(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update entry'); }
  }

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteEntry.id); setDeleteEntry(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete entry'); }
  }

  const STATUSES: TDSStatus[] = ['deducted', 'deposited', 'filed', 'pending'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search party, PAN, challan…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex items-center gap-1">
            {(['tds', 'tcs'] as const).map((t) => (
              <button key={t} onClick={() => { setTypeFilter(typeFilter === t ? '' : t); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold uppercase transition-all',
                  typeFilter === t
                    ? 'border-[#2563EB]/40 bg-[#2563EB]/12 text-[#60a5fa]'
                    : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                  statusFilter === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => refetch()} disabled={isFetching}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Entry
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Type / Section', 'Party', 'Date', 'Gross Amount', 'Rate', 'Tax Amount', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : entries.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">
                  {search || statusFilter || typeFilter ? 'No entries match your filters.' : 'No TDS/TCS entries yet. Add your first entry.'}
                </p>
                {!search && !statusFilter && !typeFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Entry
                  </Button>
                )}
              </td></tr>
            ) : entries.map((e, i) => (
              <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-white/80 uppercase">{e.entryType.toUpperCase()} — {e.section}</div>
                  {e.assessmentYear && <div className="text-[11px] text-white/30">AY {e.assessmentYear}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-white/80">{e.partyName}</div>
                  {e.partyPan && <div className="text-[11px] text-white/35 font-mono">{e.partyPan}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-white/60">{e.transactionDate}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-white/70">{fmtINR(e.grossAmount)}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-white/60">{parseFloat(e.taxRate).toFixed(2)}%</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold tabular-nums text-amber-400">{fmtINR(e.taxAmount)}</div>
                  <div className="text-[11px] text-white/30">Net: {fmtINR(e.netAmount)}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[e.status as TDSStatus])}>
                    {e.status}
                  </span>
                  {e.challanNumber && <div className="text-[10px] text-white/25 mt-0.5">{e.challanNumber}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {perms.canEdit && (
                      <button onClick={() => { setFormError(null); setEditEntry(e); }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.canDelete && (
                      <button onClick={() => { setDeleteError(null); setDeleteEntry(e); }}
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

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No entries' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded text-xs transition-colors', p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>
                {p}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">Next →</Button>
          </div>
        </div>
      </div>

      <TDSEntryFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <TDSEntryFormModal open={!!editEntry} onClose={() => setEditEntry(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} entry={editEntry} error={formError} />
      <GSTDeleteDialog
        open={!!deleteEntry} onClose={() => setDeleteEntry(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete TDS/TCS Entry"
        description={`Delete this entry for "${deleteEntry?.partyName}"? This cannot be undone.`}
        error={deleteError}
      />
    </>
  );
}
