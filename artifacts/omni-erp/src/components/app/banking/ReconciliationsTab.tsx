import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Trash2, RefreshCw, GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useBankReconciliations, useBankAccounts,
  useCreateBankReconciliation, useCompleteBankReconciliation, useDeleteBankReconciliation,
  useBankingPermissions,
  type BankReconciliation, type ReconciliationStatus, type BankReconciliationFormValues,
  useBankReconciliationReport,
} from '@/hooks/useBanking';
import ReconciliationFormModal from './ReconciliationFormModal';
import BankingDeleteDialog from './BankingDeleteDialog';

const STATUS_COLORS: Record<ReconciliationStatus, string> = {
  draft:     'bg-amber-500/12 text-amber-400 border-amber-500/25',
  completed: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
};

function fmt(v: string) {
  const n = parseFloat(v);
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableSkeleton() {
  return (
    <>{Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-b border-white/[0.04]">
        {Array.from({ length: 8 }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '55%' : '75%' }} />
          </td>
        ))}
      </tr>
    ))}</>
  );
}

const PAGE_LIMIT = 25;

export default function ReconciliationsTab() {
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [deleteRec, setDeleteRec]     = useState<BankReconciliation | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completingId, setCompletingId]   = useState<number | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useBankReconciliations({ status: statusFilter || undefined, page, limit: PAGE_LIMIT });
  const { data: accountsRes } = useBankAccounts({ limit: 200 });
  const { data: permsRes }    = useBankingPermissions();
  const { data: reportRes }   = useBankReconciliationReport();
  const createMut   = useCreateBankReconciliation();
  const completeMut = useCompleteBankReconciliation();
  const deleteMut   = useDeleteBankReconciliation();

  const reconciliations = list?.data ?? [];
  const total           = list?.total ?? 0;
  const totalPages      = list?.totalPages ?? 1;
  const accounts        = accountsRes?.data ?? [];
  const perms           = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const report           = reportRes?.data;

  async function handleCreate(values: BankReconciliationFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create reconciliation'); }
  }

  async function handleComplete(id: number) {
    setCompleteError(null);
    setCompletingId(id);
    try { await completeMut.mutateAsync(id); }
    catch (e: any) { setCompleteError(e?.message ?? 'Failed to complete reconciliation'); }
    finally { setCompletingId(null); }
  }

  async function handleDelete() {
    if (!deleteRec) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteRec.id); setDeleteRec(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete reconciliation'); }
  }

  const STATUSES: ReconciliationStatus[] = ['draft', 'completed'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 gap-3 border-b border-white/[0.06] p-4 md:grid-cols-5">
          {[
            ['Statement transactions', report?.total ?? 0, 'text-white'],
            ['ERP matched', report?.matched ?? 0, 'text-emerald-400'],
            ['Unmatched', report?.unreconciled ?? 0, 'text-amber-400'],
            ['Credits', fmt(report?.credits ?? '0'), 'text-emerald-400'],
            ['Debits', fmt(report?.debits ?? '0'), 'text-red-400'],
          ].map(([label, value, color]) => <div key={String(label)}><p className="text-[10px] uppercase tracking-wide text-white/30">{label}</p><p className={cn('mt-1 text-lg font-semibold tabular-nums', color)}>{value}</p></div>)}
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => { setStatus(statusFilter === s ? '' : s); setPage(1); }}
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
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Reconciliation
              </Button>
            )}
          </div>
        </div>

        {completeError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{completeError}</div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Account', 'Statement Date', 'Opening Balance', 'Closing Balance', 'Reconciled', 'Difference', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : reconciliations.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <GitMerge className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">{statusFilter ? 'No reconciliations match.' : 'No reconciliations yet.'}</p>
                {!statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />New Reconciliation
                  </Button>
                )}
              </td></tr>
            ) : reconciliations.map((rec, i) => {
              const diff = parseFloat(rec.difference);
              const balanced = Math.abs(diff) < 0.01;
              return (
                <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                  <td className="px-4 py-3 text-sm text-white/80">{rec.accountName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{rec.statementDate}</td>
                  <td className="px-4 py-3 text-sm text-white/60 tabular-nums">{fmt(rec.openingBalance)}</td>
                  <td className="px-4 py-3 text-sm text-white/60 tabular-nums">{fmt(rec.closingBalance)}</td>
                  <td className="px-4 py-3 text-sm text-white/60 tabular-nums">{fmt(rec.reconciledBalance)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-semibold tabular-nums', balanced ? 'text-emerald-400' : 'text-red-400')}>
                      {balanced ? '✓ Balanced' : fmt(rec.difference)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[rec.status])}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canEdit && rec.status === 'draft' && balanced && (
                        <button onClick={() => handleComplete(rec.id)} disabled={completingId === rec.id}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors disabled:opacity-40" title="Complete reconciliation">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canDelete && rec.status === 'draft' && (
                        <button onClick={() => { setDeleteError(null); setDeleteRec(rec); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No reconciliations' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <ReconciliationFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} accounts={accounts} error={formError} />
      <BankingDeleteDialog open={!!deleteRec} onClose={() => setDeleteRec(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Reconciliation"
        description={`Delete this reconciliation? Matched transactions will revert to unreconciled. Completed reconciliations cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
