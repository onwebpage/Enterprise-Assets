import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useTDSPayments, useCreateTDSPayment, useUpdateTDSPayment, useDeleteTDSPayment, useTDSPermissions,
  type TDSPayment, type TDSPaymentFormValues, type TaxPaymentStatus,
} from '@/hooks/useTDS';
import TDSPaymentFormModal from './TDSPaymentFormModal';
import TDSDeleteDialog from './TDSDeleteDialog';

const STATUS_COLORS: Record<TaxPaymentStatus, string> = {
  pending: 'bg-white/[0.06] text-white/40 border-white/[0.1]',
  paid:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  failed:  'bg-red-500/12 text-red-400 border-red-500/25',
};

const PAGE_LIMIT = 25;

function fmtINR(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TDSPaymentsTab() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [page, setPage]                 = useState(1);
  const [createOpen, setCreateOpen]     = useState(false);
  const [editPayment, setEditPayment]   = useState<TDSPayment | null>(null);
  const [deletePayment, setDeletePayment] = useState<TDSPayment | null>(null);
  const [formError, setFormError]       = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useTDSPayments({
    search: search || undefined,
    status: statusFilter || undefined,
    paymentType: typeFilter || undefined,
    page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useTDSPermissions();
  const createMut = useCreateTDSPayment();
  const updateMut = useUpdateTDSPayment();
  const deleteMut = useDeleteTDSPayment();

  const payments   = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: TDSPaymentFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to record payment'); }
  }

  async function handleUpdate(values: TDSPaymentFormValues) {
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

  const STATUSES: TaxPaymentStatus[] = ['pending', 'paid', 'failed'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search challan, period…"
              className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1">
            {(['', 'tds', 'tcs'] as const).map((t) => (
              <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                className={cn('px-2.5 py-1 rounded text-xs font-medium uppercase transition-colors',
                  typeFilter === t ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/60')}>
                {t || 'All'}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {(['', ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                  statusFilter === s ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/60')}>
                {s || 'All Status'}
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
                <Plus className="w-3.5 h-3.5" />
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Type', 'Period', 'Payment Date', 'Amount', 'Interest', 'Penalty', 'Challan', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-white/25 text-sm">No challan payments recorded</p>
                    {perms.canCreate && (
                      <button onClick={() => setCreateOpen(true)}
                        className="mt-2 text-xs text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2">
                        Record first payment
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] group transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase border',
                        p.paymentType === 'tds'
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                          : 'border-violet-500/30 bg-violet-500/10 text-violet-400')}>
                        {p.paymentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 font-mono text-xs">{p.period}</td>
                    <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{p.paymentDate}</td>
                    <td className="px-4 py-3 text-white/80 tabular-nums font-semibold text-right">{fmtINR(p.amount)}</td>
                    <td className="px-4 py-3 text-white/40 tabular-nums text-right text-xs">{fmtINR(p.interest)}</td>
                    <td className="px-4 py-3 text-white/40 tabular-nums text-right text-xs">{fmtINR(p.penalty)}</td>
                    <td className="px-4 py-3 text-white/40 text-xs font-mono">{p.challanNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', STATUS_COLORS[p.status])}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No payments' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <TDSPaymentFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <TDSPaymentFormModal open={!!editPayment} onClose={() => setEditPayment(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} payment={editPayment} error={formError} />
      <TDSDeleteDialog
        open={!!deletePayment} onClose={() => setDeletePayment(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Payment"
        description={`Delete the challan payment of ₹${deletePayment?.amount} for period ${deletePayment?.period}? This cannot be undone.`}
        error={deleteError}
      />
    </>
  );
}
