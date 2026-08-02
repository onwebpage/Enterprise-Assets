import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useTaxPayments, useCreateTaxPayment, useUpdateTaxPayment, useDeleteTaxPayment,
  useGSTPermissions, type TaxPayment, type TaxPaymentFormValues, type TaxPaymentStatus,
} from '@/hooks/useGST';
import TaxPaymentFormModal from './TaxPaymentFormModal';
import GSTDeleteDialog from './GSTDeleteDialog';

const STATUS_COLORS: Record<TaxPaymentStatus, string> = {
  pending: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  paid:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  failed:  'bg-red-500/12 text-red-400 border-red-500/25',
};

const TYPE_LABELS: Record<string, string> = {
  gst: 'GST', tds: 'TDS', tcs: 'TCS', advance_tax: 'Advance Tax', self_assessment: 'Self Assessment',
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
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TaxPaymentsTab() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [page, setPage]                 = useState(1);
  const [createOpen, setCreateOpen]     = useState(false);
  const [editPayment, setEditPayment]   = useState<TaxPayment | null>(null);
  const [deletePayment, setDeletePayment] = useState<TaxPayment | null>(null);
  const [formError, setFormError]       = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useTaxPayments({
    search: search || undefined, status: statusFilter || undefined,
    paymentType: typeFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useGSTPermissions();
  const createMut = useCreateTaxPayment();
  const updateMut = useUpdateTaxPayment();
  const deleteMut = useDeleteTaxPayment();

  const payments   = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: TaxPaymentFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create payment'); }
  }

  async function handleUpdate(values: TaxPaymentFormValues) {
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
  const TYPES = ['gst', 'tds', 'tcs', 'advance_tax', 'self_assessment'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search challan or reference…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {TYPES.map((t) => (
              <button key={t} onClick={() => { setTypeFilter(typeFilter === t ? '' : t); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                  typeFilter === t
                    ? 'border-[#2563EB]/40 bg-[#2563EB]/12 text-[#60a5fa]'
                    : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Type', 'Period', 'Payment Date', 'Amount', 'Breakdown', 'Challan / Ref', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : payments.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">
                  {search || statusFilter || typeFilter ? 'No payments match your filters.' : 'No tax payments yet. Record your first payment.'}
                </p>
                {!search && !statusFilter && !typeFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Record Payment
                  </Button>
                )}
              </td></tr>
            ) : payments.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-white/70 uppercase">{TYPE_LABELS[p.paymentType] ?? p.paymentType}</span>
                </td>
                <td className="px-4 py-3 text-sm text-white/70">{p.period}</td>
                <td className="px-4 py-3 text-sm text-white/60">{p.paymentDate}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-bold tabular-nums text-white">{fmtINR(p.amount)}</div>
                  {(parseFloat(p.interest) > 0 || parseFloat(p.penalty) > 0) && (
                    <div className="text-[11px] text-red-400/70">
                      {parseFloat(p.interest) > 0 && `Int: ${fmtINR(p.interest)}`}
                      {parseFloat(p.penalty) > 0 && ` Pen: ${fmtINR(p.penalty)}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.paymentType === 'gst' ? (
                    <div className="space-y-0.5">
                      {parseFloat(p.cgst) > 0 && <div className="text-[11px] text-blue-400/70">CGST: {fmtINR(p.cgst)}</div>}
                      {parseFloat(p.sgst) > 0 && <div className="text-[11px] text-indigo-400/70">SGST: {fmtINR(p.sgst)}</div>}
                      {parseFloat(p.igst) > 0 && <div className="text-[11px] text-cyan-400/70">IGST: {fmtINR(p.igst)}</div>}
                      {parseFloat(p.cess) > 0 && <div className="text-[11px] text-amber-400/70">Cess: {fmtINR(p.cess)}</div>}
                      {parseFloat(p.cgst) === 0 && parseFloat(p.sgst) === 0 && parseFloat(p.igst) === 0 && (
                        <span className="text-[11px] text-white/25">—</span>
                      )}
                    </div>
                  ) : <span className="text-xs text-white/25">—</span>}
                </td>
                <td className="px-4 py-3">
                  {p.challanNumber && <div className="text-xs font-mono text-white/60">{p.challanNumber}</div>}
                  {p.bankReference && <div className="text-[11px] text-white/35">{p.bankReference}</div>}
                  {!p.challanNumber && !p.bankReference && <span className="text-xs text-white/25">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[p.status as TaxPaymentStatus])}>
                    {p.status}
                  </span>
                </td>
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

      <TaxPaymentFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <TaxPaymentFormModal open={!!editPayment} onClose={() => setEditPayment(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} payment={editPayment} error={formError} />
      <GSTDeleteDialog
        open={!!deletePayment} onClose={() => setDeletePayment(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Tax Payment"
        description={`Delete this ${deletePayment ? TYPE_LABELS[deletePayment.paymentType] : ''} payment? Paid payments cannot be deleted.`}
        error={deleteError}
      />
    </>
  );
}
