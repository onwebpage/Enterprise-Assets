import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Eye, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useAPBills, useAPVendors, useAPBill,
  useCreateAPBill, useUpdateAPBill, useDeleteAPBill,
  useAPPermissions, useCreateAPPayment,
  type APBill, type APBillStatus, type APBillFormValues,
} from '@/hooks/useAccountsPayable';
import BillFormModal from './BillFormModal';
import APPaymentFormModal from './APPaymentFormModal';
import APDeleteDialog from './APDeleteDialog';

const STATUS_COLORS: Record<APBillStatus, string> = {
  draft:    'bg-white/[0.06] text-white/45 border-white/[0.1]',
  received: 'bg-blue-500/12 text-blue-400 border-blue-500/25',
  partial:  'bg-amber-500/12 text-amber-400 border-amber-500/25',
  paid:     'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  overdue:  'bg-red-500/12 text-red-400 border-red-500/25',
  void:     'bg-white/[0.04] text-white/25 border-white/[0.07]',
};

const PAGE_LIMIT = 25;

function fmt(v: string) {
  return '$' + parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 1 ? '60%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function BillsTab() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [createOpen, setCreateOpen]     = useState(false);
  const [editBill, setEditBill]         = useState<APBill | null>(null);
  const [editBillId, setEditBillId]     = useState<number | null>(null);
  const [payBill, setPayBill]           = useState<APBill | null>(null);
  const [deleteBill, setDeleteBill]     = useState<APBill | null>(null);
  const [formError, setFormError]       = useState<string | null>(null);
  const [payError, setPayError]         = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useAPBills({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: vendorsRes }  = useAPVendors({ limit: 200 });
  const { data: billDetail }  = useAPBill(editBillId);
  const { data: permsRes }    = useAPPermissions();

  const createMut  = useCreateAPBill();
  const updateMut  = useUpdateAPBill();
  const deleteMut  = useDeleteAPBill();
  const paymentMut = useCreateAPPayment();

  const bills      = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const vendors    = vendorsRes?.data ?? [];
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const openBills = bills.filter((b) => !['paid', 'void', 'draft'].includes(b.status));

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  function openEdit(bill: APBill) {
    setFormError(null);
    setEditBillId(bill.id);
    setEditBill(bill);
  }

  const editWithLines = billDetail?.data ?? editBill;

  async function handleCreate(values: APBillFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create bill'); }
  }

  async function handleUpdate(values: APBillFormValues) {
    if (!editBill) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editBill.id, data: values }); setEditBill(null); setEditBillId(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update bill'); }
  }

  async function handleDelete() {
    if (!deleteBill) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteBill.id); setDeleteBill(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete bill'); }
  }

  async function handlePayment(values: any) {
    setPayError(null);
    try { await paymentMut.mutateAsync(values); setPayBill(null); }
    catch (e: any) { setPayError(e?.message ?? 'Failed to record payment'); }
  }

  const STATUSES: APBillStatus[] = ['draft', 'received', 'partial', 'paid', 'overdue', 'void'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search bill # or vendor…" value={search} onChange={(e) => handleSearch(e.target.value)}
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Bill
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Bill #', 'Vendor', 'Issue Date', 'Due Date', 'Total', 'Balance', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : bills.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">{search || statusFilter ? 'No bills match.' : 'No bills yet.'}</p>
                {!search && !statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />New Bill
                  </Button>
                )}
              </td></tr>
            ) : bills.map((bill, i) => {
              const balance = parseFloat(bill.totalAmount) - parseFloat(bill.amountPaid);
              const canPay  = perms.canCreate && !['paid', 'void', 'draft'].includes(bill.status);
              const canEdit = perms.canEdit;
              const canDel  = perms.canDelete && bill.status === 'draft';
              return (
                <motion.tr key={bill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0 cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-[#2563EB]">{bill.billNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80">{bill.vendorName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{bill.issueDate}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs', bill.status === 'overdue' ? 'text-red-400 font-medium' : 'text-white/50')}>
                      {bill.dueDate}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80 tabular-nums">{fmt(bill.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-semibold tabular-nums', balance > 0.01 ? 'text-amber-400' : 'text-white/30')}>
                      {balance > 0.01 ? fmt(balance.toFixed(2)) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[bill.status])}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canPay && (
                        <button onClick={() => { setPayError(null); setPayBill(bill); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors" title="Pay bill">
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => openEdit(bill)}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDel && (
                        <button onClick={() => { setDeleteError(null); setDeleteBill(bill); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!canEdit && !canDel && !canPay && <Eye className="w-3.5 h-3.5 text-white/20" />}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No bills' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      {/* Modals */}
      <BillFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} vendors={vendors} error={formError} />
      <BillFormModal open={!!editBill} onClose={() => { setEditBill(null); setEditBillId(null); }}
        onSubmit={handleUpdate} isSubmitting={updateMut.isPending}
        bill={editWithLines ?? null} vendors={vendors} error={formError} />
      <APPaymentFormModal open={!!payBill} onClose={() => setPayBill(null)} onSubmit={handlePayment}
        isSubmitting={paymentMut.isPending} bills={payBill ? [payBill] : openBills}
        defaultBillId={payBill?.id} error={payError} />
      <APDeleteDialog
        open={!!deleteBill} onClose={() => setDeleteBill(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Bill"
        description={`Delete bill "${deleteBill?.billNumber}"? Only draft bills can be deleted.`}
        error={deleteError}
      />
    </>
  );
}
