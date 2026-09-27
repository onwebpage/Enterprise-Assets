import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, RefreshCw, ArrowUpRight, ArrowDownLeft, FileUp, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useBankTransactions, useBankAccounts, useCreateBankTransaction, useDeleteBankTransaction,
  useBankingPermissions,
  type BankTransaction, type BankTransactionStatus, type BankTransactionFormValues,
  useImportBankStatement, useAutoMatchBankStatement,
} from '@/hooks/useBanking';
import TransactionFormModal from './TransactionFormModal';
import BankingDeleteDialog from './BankingDeleteDialog';
import StatementImportModal from './StatementImportModal';

const STATUS_COLORS: Record<BankTransactionStatus, string> = {
  unreconciled: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  reconciled:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  excluded:     'bg-white/[0.06] text-white/35 border-white/[0.1]',
};

function fmt(v: string) {
  return '₹' + parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableSkeleton() {
  return (
    <>{Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-white/[0.04]">
        {Array.from({ length: 8 }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 1 ? '60%' : '80%' }} />
          </td>
        ))}
      </tr>
    ))}</>
  );
}

const PAGE_LIMIT = 25;

export default function TransactionsTab() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [typeFilter, setType]       = useState('');
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTxn, setDeleteTxn]   = useState<BankTransaction | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useBankTransactions({
    search: search || undefined, status: statusFilter || undefined, type: typeFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: accountsRes } = useBankAccounts({ limit: 200 });
  const { data: permsRes }    = useBankingPermissions();
  const createMut = useCreateBankTransaction();
  const deleteMut = useDeleteBankTransaction();
  const importMut = useImportBankStatement();
  const autoMatchMut = useAutoMatchBankStatement();

  const transactions = list?.data ?? [];
  const total        = list?.total ?? 0;
  const totalPages   = list?.totalPages ?? 1;
  const accounts     = accountsRes?.data ?? [];
  const perms        = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: BankTransactionFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create transaction'); }
  }

  async function handleDelete() {
    if (!deleteTxn) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteTxn.id); setDeleteTxn(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete transaction'); }
  }

  async function handleImport(data: { bankAccountId: number; fileName: string; rows: Array<Record<string, string>> }) {
    setFormError(null);
    try { await importMut.mutateAsync(data); setImportOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to import statement'); }
  }

  async function handleAutoMatch() {
    setFormError(null);
    try { for (const account of accounts) await autoMatchMut.mutateAsync(account.id); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to match statement transactions'); }
  }

  const STATUSES: BankTransactionStatus[] = ['unreconciled', 'reconciled', 'excluded'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search description or ref…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => { setStatus(statusFilter === s ? '' : s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                  statusFilter === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {s}
              </button>
            ))}
            {['credit', 'debit'].map((t) => (
              <button key={t} onClick={() => { setType(typeFilter === t ? '' : t); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                  typeFilter === t
                    ? t === 'credit' ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25' : 'bg-red-500/12 text-red-400 border-red-500/25'
                    : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {t}
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Transaction
              </Button>
            )}
            {perms.canCreate && accounts.length > 0 && <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-8 border-white/[0.1] bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white"><FileUp className="mr-1.5 h-3.5 w-3.5" />Import Statement</Button>}
            {perms.canEdit && accounts.length > 0 && <Button variant="outline" size="sm" onClick={() => void handleAutoMatch()} disabled={autoMatchMut.isPending} className="h-8 border-white/[0.1] bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white"><WandSparkles className="mr-1.5 h-3.5 w-3.5" />Auto-match</Button>}
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Date', 'Account', 'Description', 'Reference', 'Type', 'Amount', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : transactions.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">{search || statusFilter ? 'No transactions match.' : 'No transactions yet.'}</p>
                {!search && !statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Transaction
                  </Button>
                )}
              </td></tr>
            ) : transactions.map((txn, i) => (
              <motion.tr key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{txn.transactionDate}</td>
                <td className="px-4 py-3 text-xs text-white/50">{txn.accountName ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-white/80 max-w-[200px]">
                  <div className="truncate">{txn.description}</div>
                  {txn.source === 'statement_import' && <div className={cn('mt-0.5 text-[10px]', txn.matchedJournalEntryId ? 'text-emerald-400' : 'text-amber-400')}>{txn.matchedJournalEntryId ? `ERP matched (${txn.matchConfidence ?? '100'}%)` : 'Imported • unmatched'}</div>}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-white/40">{txn.reference ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium', txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                    {txn.type === 'credit' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    {txn.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-sm font-semibold tabular-nums', txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                    {txn.type === 'debit' ? '-' : '+'}{fmt(txn.amount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[txn.status as BankTransactionStatus])}>
                    {txn.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {perms.canDelete && txn.status !== 'reconciled' && (
                      <button onClick={() => { setDeleteError(null); setDeleteTxn(txn); }}
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

        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No transactions' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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

      <TransactionFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} accounts={accounts} error={formError} />
      <BankingDeleteDialog open={!!deleteTxn} onClose={() => setDeleteTxn(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Transaction"
        description={`Delete "${deleteTxn?.description}"? Reconciled transactions cannot be deleted.`}
        error={deleteError} />
      <StatementImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport}
        accounts={accounts} isSubmitting={importMut.isPending} error={formError} />
    </>
  );
}
