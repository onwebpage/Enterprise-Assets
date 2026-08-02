import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Send, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useGSTReturns, useCreateGSTReturn, useUpdateGSTReturn, useDeleteGSTReturn,
  useSubmitGSTReturn, useGSTPermissions,
  type GSTReturn, type GSTReturnFormValues, type GSTReturnStatus, type GSTReturnType,
} from '@/hooks/useGSTReturns';
import GSTReturnFormModal from '@/components/app/gst/GSTReturnFormModal';
import GSTDeleteDialog from '@/components/app/gst/GSTDeleteDialog';
import ReturnDetailSheet from './ReturnDetailSheet';

// ── Constants ─────────────────────────────────────────────────────────────────

const RETURN_TABS: { id: string; label: string; full: string }[] = [
  { id: '',       label: 'All',      full: 'All Returns' },
  { id: 'gstr1',  label: 'GSTR-1',  full: 'GSTR-1 — Outward Supplies' },
  { id: 'gstr3b', label: 'GSTR-3B', full: 'GSTR-3B — Monthly' },
  { id: 'gstr9',  label: 'GSTR-9',  full: 'GSTR-9 — Annual' },
  { id: 'gstr2a', label: 'GSTR-2A', full: 'GSTR-2A — Inward Supplies' },
  { id: 'gstr4',  label: 'GSTR-4',  full: 'GSTR-4 — Composition' },
  { id: 'gstr6',  label: 'GSTR-6',  full: 'GSTR-6 — ISD' },
];

const RETURN_LABELS: Record<string, string> = {
  gstr1: 'GSTR-1', gstr3b: 'GSTR-3B', gstr9: 'GSTR-9',
  gstr2a: 'GSTR-2A', gstr4: 'GSTR-4', gstr6: 'GSTR-6',
};

const STATUS_STYLES: Record<GSTReturnStatus, string> = {
  draft:   'bg-blue-500/12 text-blue-400 border-blue-500/25',
  pending: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  filed:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  overdue: 'bg-red-500/12 text-red-400 border-red-500/25',
  revised: 'bg-purple-500/12 text-purple-400 border-purple-500/25',
};

const STATUSES: GSTReturnStatus[] = ['draft', 'pending', 'filed', 'overdue', 'revised'];

const PAGE_LIMIT = 25;

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

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '60%' : '55%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReturnsTable() {
  const [typeTab,       setTypeTab]       = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editReturn,    setEditReturn]    = useState<GSTReturn | null>(null);
  const [deleteReturn,  setDeleteReturn]  = useState<GSTReturn | null>(null);
  const [detailReturn,  setDetailReturn]  = useState<GSTReturn | null>(null);
  const [formError,     setFormError]     = useState<string | null>(null);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useGSTReturns({
    search:     search     || undefined,
    status:     statusFilter || undefined,
    returnType: typeTab    || undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const { data: permsRes }  = useGSTPermissions();
  const perms = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const createMut  = useCreateGSTReturn();
  const updateMut  = useUpdateGSTReturn();
  const deleteMut  = useDeleteGSTReturn();
  const submitMut  = useSubmitGSTReturn();

  const returns    = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;

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

  async function handleSubmitReturn(r: GSTReturn) {
    try { await submitMut.mutateAsync(r.id); }
    catch {}
  }

  // When editing from detail sheet, open the modal and close the sheet
  function handleEditFromSheet() {
    if (!detailReturn) return;
    setFormError(null);
    setEditReturn(detailReturn);
    setDetailReturn(null);
  }

  return (
    <>
      <div className="space-y-4">
        {/* Return type tabs */}
        <div className="flex items-center gap-0 border-b border-white/[0.06]">
          {RETURN_TABS.map((t) => (
            <button key={t.id}
              onClick={() => { setTypeTab(t.id); setPage(1); }}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                typeTab === t.id
                  ? 'border-[#2563EB] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70',
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input placeholder="Search GSTIN, period…" value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
                  className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                    statusFilter === s ? STATUS_STYLES[s] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Return Type', 'Period', 'Due Date', 'Taxable Value', 'Tax Liability', 'ITC', 'Net Payable', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? <TableSkeleton /> : returns.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-sm text-white/30">
                      {search || statusFilter || typeTab ? 'No returns match your filters.' : 'No GST returns yet. Create your first one.'}
                    </p>
                    {!search && !statusFilter && perms.canCreate && (
                      <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />New Return
                      </Button>
                    )}
                  </td></tr>
                ) : returns.map((r, i) => (
                  <motion.tr key={r.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">

                    {/* Return type */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white/80">
                        {RETURN_LABELS[r.returnType as GSTReturnType] ?? r.returnType.toUpperCase()}
                      </div>
                      {r.gstin && <div className="text-[11px] text-white/30 font-mono mt-0.5">{r.gstin}</div>}
                    </td>

                    {/* Period */}
                    <td className="px-4 py-3 text-sm text-white/70 tabular-nums">{r.period}</td>

                    {/* Due date */}
                    <td className="px-4 py-3">
                      <span className={cn('text-sm tabular-nums',
                        r.status === 'overdue' ? 'text-red-400' : 'text-white/60')}>
                        {r.dueDate}
                      </span>
                    </td>

                    {/* Taxable value */}
                    <td className="px-4 py-3 text-sm text-white/60 tabular-nums">{fmtMoney(r.totalTaxableValue)}</td>

                    {/* Tax liability */}
                    <td className="px-4 py-3 text-sm font-semibold text-white/80 tabular-nums">{fmtMoney(r.totalTaxLiability)}</td>

                    {/* ITC */}
                    <td className="px-4 py-3 text-sm text-emerald-400 tabular-nums">{fmtMoney(r.totalItc)}</td>

                    {/* Net payable */}
                    <td className="px-4 py-3 text-sm font-bold text-white tabular-nums">{fmtMoney(r.netPayable)}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize', STATUS_STYLES[r.status as GSTReturnStatus])}>
                        {r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDetailReturn(r)} title="View details"
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {perms.canEdit && r.status !== 'filed' && (
                          <>
                            <button onClick={() => submitMut.mutateAsync(r.id)} title="File return"
                              disabled={submitMut.isPending}
                              className="p-1.5 rounded hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors disabled:opacity-40">
                              {submitMut.isPending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => { setFormError(null); setEditReturn(r); }} title="Edit"
                              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {perms.canDelete && r.status !== 'filed' && (
                          <button onClick={() => { setDeleteError(null); setDeleteReturn(r); }} title="Delete"
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors">
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

          {/* Pagination */}
          <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-white/30">
              {isLoading ? 'Loading…' : total === 0 ? 'No returns'
                : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
                className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">
                ← Prev
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('w-7 h-7 rounded text-xs transition-colors',
                    p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>
                  {p}
                </button>
              ))}
              <Button variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
                className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">
                Next →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GSTReturnFormModal open={createOpen} onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate} isSubmitting={createMut.isPending} error={formError} />
      <GSTReturnFormModal open={!!editReturn} onClose={() => setEditReturn(null)}
        onSubmit={handleUpdate} isSubmitting={updateMut.isPending} gstReturn={editReturn} error={formError} />
      <GSTDeleteDialog
        open={!!deleteReturn} onClose={() => setDeleteReturn(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete GST Return"
        description={`Delete ${deleteReturn ? (RETURN_LABELS[deleteReturn.returnType] + ' — ' + deleteReturn.period) : ''}? All entries will also be deleted. Filed returns cannot be deleted.`}
        error={deleteError}
      />

      {/* Detail sheet */}
      <AnimatePresence>
        {detailReturn && (
          <ReturnDetailSheet
            gstReturn={detailReturn}
            onClose={() => setDetailReturn(null)}
            onEdit={handleEditFromSheet}
            canEdit={perms.canEdit}
            canDelete={perms.canDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
}
