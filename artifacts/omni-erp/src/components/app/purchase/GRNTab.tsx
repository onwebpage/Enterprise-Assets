import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, RefreshCw, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useGRNs, useUpdateGRN, useDeleteGRN, usePurchasePermissions,
  type GoodsReceiptNote, type GRNStatus,
} from '@/hooks/usePurchase';
import PurchaseDeleteDialog from './PurchaseDeleteDialog';

const STATUS_COLORS: Record<GRNStatus, string> = {
  draft:    'bg-white/[0.06] text-white/40 border-white/[0.1]',
  received: 'bg-blue-500/12 text-blue-400 border-blue-500/25',
  accepted: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  rejected: 'bg-red-500/12 text-red-400 border-red-500/25',
};

const PAGE_LIMIT = 25;

function TableSkeleton() {
  return <>{Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-white/[0.04]">
      {Array.from({ length: 6 }).map((_, j) => (
        <td key={j} className="px-4 py-3"><div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '60%' : '70%' }} /></td>
      ))}
    </tr>
  ))}</>;
}

export default function GRNTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [editGrn, setEditGrn]         = useState<GoodsReceiptNote | null>(null);
  const [deleteGrn, setDeleteGrn]     = useState<GoodsReceiptNote | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useGRNs({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = usePurchasePermissions();
  const updateMut = useUpdateGRN();
  const deleteMut = useDeleteGRN();

  const grns       = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleStatusUpdate(grn: GoodsReceiptNote, status: GRNStatus) {
    try { await updateMut.mutateAsync({ id: grn.id, data: { status } }); }
    catch {}
  }

  async function handleDelete() {
    if (!deleteGrn) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteGrn.id); setDeleteGrn(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete GRN'); }
  }

  const STATUSES: GRNStatus[] = ['draft', 'received', 'accepted', 'rejected'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search GRN, vendor…"
              className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-1">
            {(['', ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                  statusFilter === s ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/60')}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button onClick={() => refetch()}
              className={cn('p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/60 transition-colors', isFetching && 'animate-spin')}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['GRN Number', 'PO Reference', 'Vendor', 'Receipt Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : grns.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <p className="text-white/25 text-sm">No goods receipts found</p>
                  <p className="text-xs text-white/20 mt-1">Use the Receive Goods action on a purchase order to create a GRN</p>
                </td></tr>
              ) : grns.map((g) => (
                <motion.tr key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] group transition-colors">
                  <td className="px-4 py-3 text-[#60a5fa] font-mono text-sm font-semibold">{g.grnNumber}</td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs">{g.poNumber}</td>
                  <td className="px-4 py-3 text-white/80 font-medium truncate max-w-[160px]">{g.vendorName}</td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{g.receiptDate}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', STATUS_COLORS[g.status as GRNStatus])}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canEdit && g.status === 'received' && (
                        <button onClick={() => handleStatusUpdate(g, 'accepted')}
                          className="px-2 py-1 rounded text-[11px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Accept</button>
                      )}
                      {perms.canEdit && g.status === 'received' && (
                        <button onClick={() => handleStatusUpdate(g, 'rejected')}
                          className="px-2 py-1 rounded text-[11px] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Reject</button>
                      )}
                      {perms.canDelete && g.status !== 'accepted' && (
                        <button onClick={() => { setDeleteError(null); setDeleteGrn(g); }}
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
            {isLoading ? 'Loading…' : total === 0 ? 'No GRNs' : `${(page-1)*PAGE_LIMIT+1}–${Math.min(page*PAGE_LIMIT, total)} of ${total}`}
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

      <PurchaseDeleteDialog open={!!deleteGrn} onClose={() => setDeleteGrn(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete GRN"
        description={`Delete GRN "${deleteGrn?.grnNumber}"? Accepted GRNs cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
