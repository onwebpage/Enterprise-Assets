import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useARCustomers, useCreateARCustomer, useUpdateARCustomer, useDeleteARCustomer,
  useARPermissions, type ARCustomer, type ARCustomerFormValues, type ARCustomerStatus,
} from '@/hooks/useAccountsReceivable';
import CustomerFormModal from './CustomerFormModal';
import ARDeleteDialog from './ARDeleteDialog';

const STATUS_COLORS: Record<ARCustomerStatus, string> = {
  active:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  inactive: 'bg-white/[0.06] text-white/40 border-white/[0.1]',
  blocked:  'bg-red-500/12 text-red-400 border-red-500/25',
};

const PAGE_LIMIT = 25;

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function CustomersTab() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer]   = useState<ARCustomer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<ARCustomer | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useARCustomers({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useARPermissions();
  const createMut = useCreateARCustomer();
  const updateMut = useUpdateARCustomer();
  const deleteMut = useDeleteARCustomer();

  const customers  = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: ARCustomerFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create customer'); }
  }

  async function handleUpdate(values: ARCustomerFormValues) {
    if (!editCustomer) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editCustomer.id, data: values }); setEditCustomer(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update customer'); }
  }

  async function handleDelete() {
    if (!deleteCustomer) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteCustomer.id); setDeleteCustomer(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete customer'); }
  }

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search name or email…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex items-center gap-1">
            {(['active', 'inactive', 'blocked'] as ARCustomerStatus[]).map((s) => (
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Customer
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Name', 'Contact', 'Location', 'Credit Limit', 'Outstanding', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : customers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">
                  {search || statusFilter ? 'No customers match your filters.' : 'No customers yet. Add your first customer.'}
                </p>
                {!search && !statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Customer
                  </Button>
                )}
              </td></tr>
            ) : customers.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-white/90">{c.name}</div>
                  {c.taxId && <div className="text-[11px] text-white/30">TIN: {c.taxId}</div>}
                </td>
                <td className="px-4 py-3">
                  {c.email && <div className="text-xs text-white/60">{c.email}</div>}
                  {c.phone && <div className="text-xs text-white/35">{c.phone}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-white/60 tabular-nums">
                  {c.currency} {parseFloat(c.creditLimit).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-sm font-semibold tabular-nums',
                    parseFloat(c.totalOutstanding ?? '0') > 0 ? 'text-amber-400' : 'text-white/40')}>
                    ₹{parseFloat(c.totalOutstanding ?? '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {(c.invoiceCount ?? 0) > 0 && <div className="text-[11px] text-white/25">{c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[c.status])}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {perms.canEdit && (
                      <button onClick={() => { setFormError(null); setEditCustomer(c); }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.canDelete && (
                      <button onClick={() => { setDeleteError(null); setDeleteCustomer(c); }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!perms.canEdit && !perms.canDelete && <Eye className="w-3.5 h-3.5 text-white/20" />}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No customers' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">
              ← Prev
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded text-xs transition-colors', p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>
                {p}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">
              Next →
            </Button>
          </div>
        </div>
      </div>

      <CustomerFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <CustomerFormModal open={!!editCustomer} onClose={() => setEditCustomer(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} customer={editCustomer} error={formError} />
      <ARDeleteDialog
        open={!!deleteCustomer} onClose={() => setDeleteCustomer(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Customer"
        description={`Delete "${deleteCustomer?.name}"? This cannot be undone. All invoices must be removed first.`}
        error={deleteError}
      />
    </>
  );
}
