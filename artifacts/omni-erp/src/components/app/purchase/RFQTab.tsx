import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  usePurchaseRFQs, usePurchaseVendors, useCreateRFQ, useUpdateRFQ, useDeleteRFQ,
  usePurchasePermissions,
  type PurchaseRFQ, type RFQFormValues, type RFQStatus,
} from '@/hooks/usePurchase';
import PurchaseRFQFormModal from './PurchaseRFQFormModal';
import PurchaseDeleteDialog from './PurchaseDeleteDialog';

const STATUS_COLORS: Record<RFQStatus, string> = {
  draft:     'bg-white/[0.06] text-white/40 border-white/[0.1]',
  sent:      'bg-blue-500/12 text-blue-400 border-blue-500/25',
  responded: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  converted: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  cancelled: 'bg-red-500/12 text-red-400 border-red-500/25',
};

const PAGE_LIMIT = 25;

function fmtINR(v: string | null | undefined) {
  if (!v) return '—';
  const n = parseFloat(v);
  if (n >= 10_00_000) return `₹${(n/10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${(n/1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return <>{Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-white/[0.04]">
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} className="px-4 py-3"><div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '60%' : '70%' }} /></td>
      ))}
    </tr>
  ))}</>;
}

export default function RFQTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editRFQ, setEditRFQ]         = useState<PurchaseRFQ | null>(null);
  const [deleteRFQ, setDeleteRFQ]     = useState<PurchaseRFQ | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = usePurchaseRFQs({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: vendorsRes } = usePurchaseVendors({ limit: 200 });
  const { data: permsRes }   = usePurchasePermissions();
  const createMut = useCreateRFQ();
  const updateMut = useUpdateRFQ();
  const deleteMut = useDeleteRFQ();

  const rfqs       = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const vendors    = vendorsRes?.data ?? [];
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: RFQFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create RFQ'); }
  }
  async function handleUpdate(values: RFQFormValues) {
    if (!editRFQ) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editRFQ.id, data: values }); setEditRFQ(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update RFQ'); }
  }
  async function handleDelete() {
    if (!deleteRFQ) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteRFQ.id); setDeleteRFQ(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete RFQ'); }
  }

  const STATUSES: RFQStatus[] = ['draft', 'sent', 'responded', 'converted', 'cancelled'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search RFQ, vendor, items…"
              className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(['', ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
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
                <Plus className="w-3.5 h-3.5" /> New RFQ
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['RFQ Number', 'Vendor', 'RFQ Date', 'Due Date', 'Est. Value', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : rfqs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <p className="text-white/25 text-sm">No RFQs found</p>
                  {perms.canCreate && (
                    <button onClick={() => setCreateOpen(true)} className="mt-2 text-xs text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2">Create first RFQ</button>
                  )}
                </td></tr>
              ) : rfqs.map((r) => (
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] group transition-colors">
                  <td className="px-4 py-3 text-[#60a5fa] font-mono text-sm font-semibold">{r.rfqNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-white/80 font-medium">{r.vendorName ?? '—'}</p>
                    {r.itemsDescription && (
                      <p className="text-[11px] text-white/35 truncate max-w-[200px]">{r.itemsDescription}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{r.rfqDate}</td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{r.dueDate || '—'}</td>
                  <td className="px-4 py-3 text-white/70 tabular-nums font-semibold">{fmtINR(r.estimatedValue)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', STATUS_COLORS[r.status as RFQStatus])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canEdit && r.status !== 'converted' && (
                        <button onClick={() => { setFormError(null); setEditRFQ(r); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      )}
                      {perms.canDelete && r.status !== 'converted' && (
                        <button onClick={() => { setDeleteError(null); setDeleteRFQ(r); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
            {isLoading ? 'Loading…' : total === 0 ? 'No RFQs' : `${(page-1)*PAGE_LIMIT+1}–${Math.min(page*PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i+1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded text-xs transition-colors', p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>{p}</button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">Next →</Button>
          </div>
        </div>
      </div>

      <PurchaseRFQFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} vendors={vendors} error={formError} />
      <PurchaseRFQFormModal open={!!editRFQ} onClose={() => setEditRFQ(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} rfq={editRFQ} vendors={vendors} error={formError} />
      <PurchaseDeleteDialog open={!!deleteRFQ} onClose={() => setDeleteRFQ(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete RFQ"
        description={`Delete RFQ "${deleteRFQ?.rfqNumber}"? Converted RFQs cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
