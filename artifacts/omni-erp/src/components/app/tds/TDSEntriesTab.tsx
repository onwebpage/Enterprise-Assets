import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useTDSEntries, useCreateTDSEntry, useUpdateTDSEntry, useDeleteTDSEntry, useTDSPermissions,
  type TDSEntry, type TDSEntryFormValues, type TDSStatus, type TDSEntryType,
} from '@/hooks/useTDS';
import TDSEntryFormModal from './TDSEntryFormModal';
import TDSDeleteDialog from './TDSDeleteDialog';

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

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface Props {
  entryType: TDSEntryType;
}

export default function TDSEntriesTab({ entryType }: Props) {
  const label = entryType === 'tds' ? 'TDS' : 'TCS';
  const accentColor = entryType === 'tds' ? '[#2563EB]' : 'violet-500';

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [createOpen, setCreateOpen]     = useState(false);
  const [editEntry, setEditEntry]       = useState<TDSEntry | null>(null);
  const [deleteEntry, setDeleteEntry]   = useState<TDSEntry | null>(null);
  const [formError, setFormError]       = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useTDSEntries({
    search: search || undefined,
    status: statusFilter || undefined,
    entryType,
    section: sectionFilter || undefined,
    page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useTDSPermissions();
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
    try { await createMut.mutateAsync({ ...values, entryType }); setCreateOpen(false); }
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
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search ${label} entries…`}
              className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {(['', ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                  statusFilter === s ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/60')}>
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => refetch()}
              className={cn('p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/60 transition-colors', isFetching && 'animate-spin')}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New {label} Entry
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Party Name', 'PAN', 'Section', 'Txn Date', 'Gross Amount', `${label} Amount`, 'Deposit Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={9} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-white/25 text-sm">No {label} entries found</p>
                    {perms.canCreate && (
                      <button onClick={() => setCreateOpen(true)}
                        className="mt-2 text-xs text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2">
                        Create your first entry
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] group transition-colors">
                    <td className="px-4 py-3 text-white/80 font-medium max-w-[180px] truncate">{e.partyName}</td>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{e.partyPan || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.05] text-white/60 border border-white/[0.08]">
                        {e.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{e.transactionDate}</td>
                    <td className="px-4 py-3 text-white/70 tabular-nums text-right">{fmtINR(e.grossAmount)}</td>
                    <td className="px-4 py-3 text-[#60a5fa] tabular-nums text-right font-semibold">{fmtINR(e.taxAmount)}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{e.depositDate || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', STATUS_COLORS[e.status])}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? `No ${label} entries` : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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
        isSubmitting={createMut.isPending} defaultType={entryType} error={formError} />
      <TDSEntryFormModal open={!!editEntry} onClose={() => setEditEntry(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} entry={editEntry} error={formError} />
      <TDSDeleteDialog
        open={!!deleteEntry} onClose={() => setDeleteEntry(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title={`Delete ${label} Entry`}
        description={`Delete this entry for "${deleteEntry?.partyName}"? This cannot be undone.`}
        error={deleteError}
      />
    </>
  );
}
