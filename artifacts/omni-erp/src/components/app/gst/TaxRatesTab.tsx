import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useTaxRates, useCreateTaxRate, useUpdateTaxRate, useDeleteTaxRate,
  useGSTPermissions, type TaxRate, type TaxRateFormValues, type TaxRateType,
} from '@/hooks/useGST';
import TaxRateFormModal from './TaxRateFormModal';
import GSTDeleteDialog from './GSTDeleteDialog';

const TYPE_COLORS: Record<TaxRateType, string> = {
  cgst:        'bg-blue-500/12 text-blue-400 border-blue-500/25',
  sgst:        'bg-indigo-500/12 text-indigo-400 border-indigo-500/25',
  igst:        'bg-cyan-500/12 text-cyan-400 border-cyan-500/25',
  utgst:       'bg-purple-500/12 text-purple-400 border-purple-500/25',
  cess:        'bg-amber-500/12 text-amber-400 border-amber-500/25',
  vat:         'bg-orange-500/12 text-orange-400 border-orange-500/25',
  service_tax: 'bg-pink-500/12 text-pink-400 border-pink-500/25',
  other:       'bg-white/[0.06] text-white/40 border-white/[0.1]',
};

const TYPE_LABELS: Record<TaxRateType, string> = {
  cgst: 'CGST', sgst: 'SGST', igst: 'IGST', utgst: 'UTGST',
  cess: 'Cess', vat: 'VAT', service_tax: 'Service Tax', other: 'Other',
};

const PAGE_LIMIT = 25;

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TaxRatesTab() {
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRate, setEditRate]     = useState<TaxRate | null>(null);
  const [deleteRate, setDeleteRate] = useState<TaxRate | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useTaxRates({
    search: search || undefined, type: typeFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useGSTPermissions();
  const createMut = useCreateTaxRate();
  const updateMut = useUpdateTaxRate();
  const deleteMut = useDeleteTaxRate();
  const toggleMut = useUpdateTaxRate();

  const rates      = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: TaxRateFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create tax rate'); }
  }

  async function handleUpdate(values: TaxRateFormValues) {
    if (!editRate) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editRate.id, data: values }); setEditRate(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update tax rate'); }
  }

  async function handleDelete() {
    if (!deleteRate) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteRate.id); setDeleteRate(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete tax rate'); }
  }

  async function handleToggleActive(rate: TaxRate) {
    if (!perms.canEdit) return;
    try { await toggleMut.mutateAsync({ id: rate.id, data: { isActive: !rate.isActive } }); }
    catch {}
  }

  const TYPES_TO_FILTER: TaxRateType[] = ['cgst', 'sgst', 'igst', 'utgst', 'cess', 'vat', 'service_tax', 'other'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search name or HSN/SAC…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {TYPES_TO_FILTER.map((t) => (
              <button key={t} onClick={() => { setTypeFilter(typeFilter === t ? '' : t); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                  typeFilter === t ? TYPE_COLORS[t] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {TYPE_LABELS[t]}
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Rate
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Name', 'Type', 'Rate (%)', 'HSN / SAC', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : rates.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">
                  {search || typeFilter ? 'No rates match your filters.' : 'No tax rates yet. Add your first rate.'}
                </p>
                {!search && !typeFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Tax Rate
                  </Button>
                )}
              </td></tr>
            ) : rates.map((r, i) => (
              <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-white/90">{r.name}</div>
                  {r.description && <div className="text-[11px] text-white/30 truncate max-w-[200px]">{r.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border', TYPE_COLORS[r.type as TaxRateType])}>
                    {TYPE_LABELS[r.type as TaxRateType]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-white/80 tabular-nums">{parseFloat(r.rate).toFixed(2)}%</span>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {r.hsnSacCode ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleActive(r)} disabled={!perms.canEdit}
                    className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors',
                      r.isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/30 hover:text-white/60',
                      !perms.canEdit && 'cursor-default')}>
                    {r.isActive
                      ? <ToggleRight className="w-4 h-4" />
                      : <ToggleLeft className="w-4 h-4" />}
                    {r.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {perms.canEdit && (
                      <button onClick={() => { setFormError(null); setEditRate(r); }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.canDelete && (
                      <button onClick={() => { setDeleteError(null); setDeleteRate(r); }}
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
            {isLoading ? 'Loading…' : total === 0 ? 'No tax rates' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <TaxRateFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <TaxRateFormModal open={!!editRate} onClose={() => setEditRate(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} taxRate={editRate} error={formError} />
      <GSTDeleteDialog
        open={!!deleteRate} onClose={() => setDeleteRate(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Tax Rate"
        description={`Delete "${deleteRate?.name}"? This cannot be undone.`}
        error={deleteError}
      />
    </>
  );
}
