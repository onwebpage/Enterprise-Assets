import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Send, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useGSTReturns, useCreateGSTReturn, useUpdateGSTReturn, useDeleteGSTReturn, useSubmitGSTReturn,
  useGSTPermissions, useGSTReturnEntries, useCreateGSTReturnEntry, useDeleteGSTReturnEntry,
  type GSTReturn, type GSTReturnFormValues, type GSTReturnStatus, type GSTReturnType,
  type GSTReturnEntry,
} from '@/hooks/useGST';
import GSTReturnFormModal from './GSTReturnFormModal';
import GSTDeleteDialog from './GSTDeleteDialog';

const STATUS_COLORS: Record<GSTReturnStatus, string> = {
  draft:   'bg-blue-500/12 text-blue-400 border-blue-500/25',
  pending: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  filed:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  overdue: 'bg-red-500/12 text-red-400 border-red-500/25',
  revised: 'bg-purple-500/12 text-purple-400 border-purple-500/25',
};

const RETURN_LABELS: Record<GSTReturnType, string> = {
  gstr1: 'GSTR-1', gstr3b: 'GSTR-3B', gstr9: 'GSTR-9', gstr2a: 'GSTR-2A', gstr4: 'GSTR-4', gstr6: 'GSTR-6',
};

const PAGE_LIMIT = 25;

function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EntriesRow({ gstReturn }: { gstReturn: GSTReturn }) {
  const { data: entriesData, isLoading } = useGSTReturnEntries(gstReturn.id);
  const createEntry = useCreateGSTReturnEntry();
  const deleteEntry = useDeleteGSTReturnEntry();
  const entries = entriesData?.data ?? [];

  const handleDeleteEntry = async (entry: GSTReturnEntry) => {
    try { await deleteEntry.mutateAsync({ id: entry.id, returnId: gstReturn.id }); }
    catch {}
  };

  return (
    <tr className="bg-[#06090f]">
      <td colSpan={7} className="px-6 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Transaction Entries</p>
            {gstReturn.status !== 'filed' && (
              <span className="text-[11px] text-white/25">Entries auto-update return totals</span>
            )}
          </div>
          {isLoading ? (
            <div className="h-8 bg-white/[0.03] rounded animate-pulse" />
          ) : entries.length === 0 ? (
            <p className="text-xs text-white/25 italic">No entries added yet for this return.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Type', 'Invoice #', 'Party', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', ''].map((h) => (
                      <th key={h} className="text-left text-[10px] font-semibold text-white/25 uppercase tracking-wide px-2 py-1.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-white/[0.03] group hover:bg-white/[0.02]">
                      <td className="px-2 py-2">
                        <span className="text-[10px] font-semibold text-white/50 uppercase">{e.entryType.replace('_', ' ')}</span>
                      </td>
                      <td className="px-2 py-2 text-white/60">{e.invoiceNumber ?? '—'}</td>
                      <td className="px-2 py-2 text-white/70">{e.partyName ?? '—'}</td>
                      <td className="px-2 py-2 tabular-nums text-white/70">{fmtMoney(e.taxableValue)}</td>
                      <td className="px-2 py-2 tabular-nums text-blue-400/70">{fmtMoney(e.cgstAmount)}</td>
                      <td className="px-2 py-2 tabular-nums text-indigo-400/70">{fmtMoney(e.sgstAmount)}</td>
                      <td className="px-2 py-2 tabular-nums text-cyan-400/70">{fmtMoney(e.igstAmount)}</td>
                      <td className="px-2 py-2 tabular-nums font-semibold text-white/80">{fmtMoney(e.totalTax)}</td>
                      <td className="px-2 py-2">
                        {gstReturn.status !== 'filed' && (
                          <button onClick={() => handleDeleteEntry(e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/20 hover:text-red-400 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function GSTReturnsTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editReturn, setEditReturn]   = useState<GSTReturn | null>(null);
  const [deleteReturn, setDeleteReturn] = useState<GSTReturn | null>(null);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useGSTReturns({
    search: search || undefined, status: statusFilter || undefined,
    returnType: typeFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useGSTPermissions();
  const createMut = useCreateGSTReturn();
  const updateMut = useUpdateGSTReturn();
  const deleteMut = useDeleteGSTReturn();
  const submitMut = useSubmitGSTReturn();

  const returns    = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: GSTReturnFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create return'); }
  }

  async function handleUpdate(values: GSTReturnFormValues) {
    if (!editReturn) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editReturn.id, data: values }); setEditReturn(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update return'); }
  }

  async function handleDelete() {
    if (!deleteReturn) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteReturn.id); setDeleteReturn(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete return'); }
  }

  async function handleSubmit(r: GSTReturn) {
    try { await submitMut.mutateAsync(r.id); }
    catch {}
  }

  const STATUSES: GSTReturnStatus[] = ['draft', 'pending', 'filed', 'overdue', 'revised'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search GSTIN…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Return
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Return', 'Period', 'Due Date', 'Tax Liability', 'ITC', 'Net Payable', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : returns.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/30">
                  {search || statusFilter ? 'No returns match your filters.' : 'No GST returns yet. Create your first return.'}
                </p>
                {!search && !statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />New Return
                  </Button>
                )}
              </td></tr>
            ) : returns.flatMap((r, i) => {
              const rows = [
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                  <td className="px-4 py-3">
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white transition-colors">
                      {RETURN_LABELS[r.returnType as GSTReturnType] ?? r.returnType.toUpperCase()}
                      {expandedId === r.id ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
                    </button>
                    {r.gstin && <div className="text-[11px] text-white/30 mt-0.5">{r.gstin}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/70">{r.period}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{r.dueDate}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white/80 tabular-nums">{fmtMoney(r.totalTaxLiability)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400 tabular-nums">{fmtMoney(r.totalItc)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-white tabular-nums">{fmtMoney(r.netPayable)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[r.status as GSTReturnStatus])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canEdit && r.status !== 'filed' && (
                        <button onClick={() => handleSubmit(r)} disabled={submitMut.isPending}
                          className="p-1.5 rounded hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors" title="File Return">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canEdit && (
                        <button onClick={() => { setFormError(null); setEditReturn(r); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canDelete && (
                        <button onClick={() => { setDeleteError(null); setDeleteReturn(r); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>,
              ];
              if (expandedId === r.id) rows.push(<EntriesRow key={`entries-${r.id}`} gstReturn={r} />);
              return rows;
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No returns' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <GSTReturnFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <GSTReturnFormModal open={!!editReturn} onClose={() => setEditReturn(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} gstReturn={editReturn} error={formError} />
      <GSTDeleteDialog
        open={!!deleteReturn} onClose={() => setDeleteReturn(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete GST Return"
        description={`Delete ${deleteReturn ? (deleteReturn.returnType.toUpperCase() + ' — ' + deleteReturn.period) : ''}? This will also delete all entries. Filed returns cannot be deleted.`}
        error={deleteError}
      />
    </>
  );
}
