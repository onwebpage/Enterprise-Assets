import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useFixedAssets, useCreateFixedAsset, useUpdateFixedAsset, useDeleteFixedAsset,
  useAssetsPermissions,
  ASSET_CATEGORIES, ASSET_STATUSES,
  type FixedAsset, type AssetStatus, type FixedAssetFormValues,
} from '@/hooks/useFixedAssets';
import AssetFormModal from './AssetFormModal';
import AssetsDeleteDialog from './AssetsDeleteDialog';

const STATUS_COLORS: Record<AssetStatus, string> = {
  active:              'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  fully_depreciated:   'bg-white/[0.06] text-white/40 border-white/[0.1]',
  disposed:            'bg-red-500/12 text-red-400 border-red-500/25',
  under_maintenance:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Active', fully_depreciated: 'Fully Depr.', disposed: 'Disposed', under_maintenance: 'Maintenance',
};

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight Line', declining_balance: 'Declining Bal.', sum_of_years_digits: 'SYD',
};

function fmt(v: string) {
  return '₹' + parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableSkeleton() {
  return (
    <>{Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-white/[0.04]">
        {Array.from({ length: 9 }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 1 ? '60%' : '80%' }} />
          </td>
        ))}
      </tr>
    ))}</>
  );
}

const PAGE_LIMIT = 25;

export default function AssetsTab() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [categoryFilter, setCategory] = useState('');
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset]   = useState<FixedAsset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<FixedAsset | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useFixedAssets({
    search: search || undefined, status: statusFilter || undefined, category: categoryFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useAssetsPermissions();
  const createMut = useCreateFixedAsset();
  const updateMut = useUpdateFixedAsset();
  const deleteMut = useDeleteFixedAsset();

  const assets     = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data?.assets ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: FixedAssetFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create asset'); }
  }

  async function handleUpdate(values: FixedAssetFormValues) {
    if (!editAsset) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editAsset.id, data: values }); setEditAsset(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update asset'); }
  }

  async function handleDelete() {
    if (!deleteAsset) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteAsset.id); setDeleteAsset(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete asset'); }
  }

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search assets…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {ASSET_STATUSES.map((s) => (
              <button key={s} onClick={() => { setStatus(statusFilter === s ? '' : s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                  statusFilter === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => refetch()} disabled={isFetching}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Asset
              </Button>
            )}
          </div>
        </div>

        {/* Category filter row */}
        <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-white/[0.04]">
          <button onClick={() => { setCategory(''); setPage(1); }}
            className={cn('px-2.5 py-0.5 rounded-md border text-[11px] font-semibold transition-all capitalize',
              categoryFilter === '' ? 'bg-white/[0.08] text-white border-white/[0.15]' : 'border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.04]')}>
            All
          </button>
          {ASSET_CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCategory(categoryFilter === c ? '' : c); setPage(1); }}
              className={cn('px-2.5 py-0.5 rounded-md border text-[11px] font-semibold transition-all capitalize',
                categoryFilter === c ? 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/30' : 'border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.04]')}>
              {c}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Asset #', 'Name', 'Category', 'Purchase Date', 'Cost', 'Book Value', 'Accum. Depr.', 'Method', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : assets.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center">
                  <Package className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">{search || statusFilter || categoryFilter ? 'No assets match.' : 'No fixed assets yet.'}</p>
                  {!search && !statusFilter && !categoryFilter && perms.canCreate && (
                    <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add Asset
                    </Button>
                  )}
                </td></tr>
              ) : assets.map((asset, i) => (
                <motion.tr key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-[#2563EB]">{asset.assetNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80 max-w-[180px] truncate">{asset.name}</td>
                  <td className="px-4 py-3 text-xs text-white/50 capitalize">{asset.category}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{asset.purchaseDate}</td>
                  <td className="px-4 py-3 text-sm text-white/70 tabular-nums">{fmt(asset.purchaseCost)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-semibold tabular-nums', parseFloat(asset.currentBookValue) > 0 ? 'text-white/80' : 'text-white/30')}>
                      {fmt(asset.currentBookValue)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/50 tabular-nums">{fmt(asset.accumulatedDepreciation)}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{METHOD_LABELS[asset.depreciationMethod] ?? asset.depreciationMethod}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border', STATUS_COLORS[asset.status])}>
                      {STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canEdit && (
                        <button onClick={() => { setFormError(null); setEditAsset(asset); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canDelete && (
                        <button onClick={() => { setDeleteError(null); setDeleteAsset(asset); }}
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
            {isLoading ? 'Loading…' : total === 0 ? 'No assets' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <AssetFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <AssetFormModal open={!!editAsset} onClose={() => setEditAsset(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} asset={editAsset} error={formError} />
      <AssetsDeleteDialog open={!!deleteAsset} onClose={() => setDeleteAsset(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Asset"
        description={`Delete "${deleteAsset?.name}"? Assets with posted depreciation entries cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
