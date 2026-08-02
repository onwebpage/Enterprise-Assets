import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  usePurchaseVendors, useCreatePurchaseVendor, useUpdatePurchaseVendor, useDeletePurchaseVendor,
  usePurchasePermissions,
  type PurchaseVendor, type PurchaseVendorFormValues,
  type PurchaseVendorStatus, type PurchaseVendorCategory,
} from '@/hooks/usePurchase';
import PurchaseVendorFormModal from './PurchaseVendorFormModal';
import PurchaseDeleteDialog from './PurchaseDeleteDialog';

const STATUS_COLORS: Record<PurchaseVendorStatus, string> = {
  active:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  inactive: 'bg-white/[0.06] text-white/40 border-white/[0.1]',
  blocked:  'bg-red-500/12 text-red-400 border-red-500/25',
};
const CAT_COLORS: Record<PurchaseVendorCategory, string> = {
  goods:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  services: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  both:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const PAGE_LIMIT = 25;

function TableSkeleton() {
  return <>{Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="border-b border-white/[0.04]">
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
        </td>
      ))}
    </tr>
  ))}</>;
}

export default function VendorsTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editVendor, setEditVendor]   = useState<PurchaseVendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<PurchaseVendor | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = usePurchaseVendors({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = usePurchasePermissions();
  const createMut = useCreatePurchaseVendor();
  const updateMut = useUpdatePurchaseVendor();
  const deleteMut = useDeletePurchaseVendor();

  const vendors    = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: PurchaseVendorFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create vendor'); }
  }
  async function handleUpdate(values: PurchaseVendorFormValues) {
    if (!editVendor) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editVendor.id, data: values }); setEditVendor(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update vendor'); }
  }
  async function handleDelete() {
    if (!deleteVendor) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteVendor.id); setDeleteVendor(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete vendor'); }
  }

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search vendors…"
              className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-1">
            {(['', 'active', 'inactive', 'blocked'] as const).map((s) => (
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
                <Plus className="w-3.5 h-3.5" /> New Vendor
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Code', 'Vendor Name', 'Category', 'GSTIN', 'Contact', 'Payment Terms', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : vendors.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <p className="text-white/25 text-sm">No vendors found</p>
                  {perms.canCreate && (
                    <button onClick={() => setCreateOpen(true)} className="mt-2 text-xs text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2">Add first vendor</button>
                  )}
                </td></tr>
              ) : vendors.map((v) => (
                <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] group transition-colors">
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">{v.code || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-white/80 font-medium truncate max-w-[160px]">{v.name}</p>
                    {v.email && <p className="text-[11px] text-white/35 truncate">{v.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold capitalize border', CAT_COLORS[v.category as PurchaseVendorCategory])}>
                      {v.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs">{v.gstin || '—'}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{v.phone || '—'}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{v.paymentTerms || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', STATUS_COLORS[v.status as PurchaseVendorStatus])}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canEdit && (
                        <button onClick={() => { setFormError(null); setEditVendor(v); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      )}
                      {perms.canDelete && (
                        <button onClick={() => { setDeleteError(null); setDeleteVendor(v); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
            {isLoading ? 'Loading…' : total === 0 ? 'No vendors' : `${(page-1)*PAGE_LIMIT+1}–${Math.min(page*PAGE_LIMIT, total)} of ${total}`}
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

      <PurchaseVendorFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <PurchaseVendorFormModal open={!!editVendor} onClose={() => setEditVendor(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} vendor={editVendor} error={formError} />
      <PurchaseDeleteDialog open={!!deleteVendor} onClose={() => setDeleteVendor(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Vendor"
        description={`Delete vendor "${deleteVendor?.name}"? This cannot be undone. Vendors with existing purchase orders cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
