import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useAPPayments, useAPBills, useAPPermissions,
  useCreateAPPayment, useUpdateAPPayment, useDeleteAPPayment,
  type APPayment, type APPaymentFormValues, type APPaymentMethod,
} from '@/hooks/useAccountsPayable';
import APPaymentFormModal from './APPaymentFormModal';
import APDeleteDialog from './APDeleteDialog';

const PAGE_LIMIT = 25;

const METHOD_LABELS: Record<APPaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '55%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function APPaymentsTab() {
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPayment, setEditPayment]   = useState<APPayment | null>(null);
  const [deletePayment, setDeletePayment] = useState<APPayment | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useAPPayments({ page, limit: PAGE_LIMIT });
  const { data: billsRes } = useAPBills({ limit: 200 });
  const { data: permsRes } = useAPPermissions();

  const createMut = useCreateAPPayment();
  const updateMut = useUpdateAPPayment();
  const deleteMut = useDeleteAPPayment();

  const payments   = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const openBills  = (billsRes?.data ?? []).filter((b) => !['paid', 'void', 'draft'].includes(b.status));

  async function handleCreate(values: APPaymentFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to record payment'); }
  }

  async function handleUpdate(values: Partial<APPaymentFormValues>) {
    if (!editPayment) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editPayment.id, data: values }); setEditPayment(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update payment'); }
  }

  async function handleDelete() {
    if (!deletePayment) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deletePayment.id); setDeletePayment(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete payment'); }
  }

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
          <p className="text-sm text-white/40 flex-1">All recorded bill payments</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => refetch()} disabled={isFetching}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Date', 'Bill', 'Vendor', 'Amount', 'Method', 'Reference', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">No payments recorded yet.</p>
                {perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Record Payment
                  </Button>
                )}
              </td></tr>
            ) : payments.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                <td className="px-4 py-3 text-xs text-white/60">{p.paymentDate}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-[#2563EB]">{p.billNumber ?? `BILL-${p.billId}`}</span>
                </td>
                <td className="px-4 py-3 text-sm text-white/75">{p.vendorName ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-amber-400 tabular-nums">
                    ${parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded text-white/50">
                    {METHOD_LABELS[p.method]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/35">{p.reference ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {perms.canEdit && (
                      <button onClick={() => { setFormError(null); setEditPayment(p); }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.canDelete && (
                      <button onClick={() => { setDeleteError(null); setDeletePayment(p); }}
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
            {isLoading ? 'Loading…' : total === 0 ? 'No payments' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <APPaymentFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} bills={openBills} error={formError} />
      <APPaymentFormModal open={!!editPayment} onClose={() => setEditPayment(null)} onSubmit={handleUpdate as any}
        isSubmitting={updateMut.isPending} payment={editPayment} bills={openBills} error={formError} />
      <APDeleteDialog
        open={!!deletePayment} onClose={() => setDeletePayment(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Payment"
        description={`Delete this payment of $${parseFloat(deletePayment?.amount ?? '0').toLocaleString()}? The bill balance will be restored.`}
        error={deleteError}
      />
    </>
  );
}
