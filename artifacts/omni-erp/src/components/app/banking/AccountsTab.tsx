import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount,
  useBankingPermissions,
  type BankAccount, type BankAccountStatus, type BankAccountFormValues,
} from '@/hooks/useBanking';
import AccountFormModal from './AccountFormModal';
import BankingDeleteDialog from './BankingDeleteDialog';

const STATUS_COLORS: Record<BankAccountStatus, string> = {
  active:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  inactive: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  closed:   'bg-white/[0.06] text-white/40 border-white/[0.1]',
};

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking', savings: 'Savings', credit: 'Credit', cash: 'Cash',
};

function fmt(v: string) {
  const n = parseFloat(v);
  return (n < 0 ? '-₹' : '₹') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableSkeleton() {
  return (
    <>{Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-b border-white/[0.04]">
        {Array.from({ length: 7 }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '55%' : '75%' }} />
          </td>
        ))}
      </tr>
    ))}</>
  );
}

const PAGE_LIMIT = 25;

export default function AccountsTab() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAcc, setEditAcc]       = useState<BankAccount | null>(null);
  const [deleteAcc, setDeleteAcc]   = useState<BankAccount | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useBankAccounts({ search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT });
  const { data: permsRes } = useBankingPermissions();
  const createMut = useCreateBankAccount();
  const updateMut = useUpdateBankAccount();
  const deleteMut = useDeleteBankAccount();

  const accounts   = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: BankAccountFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create account'); }
  }

  async function handleUpdate(values: BankAccountFormValues) {
    if (!editAcc) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editAcc.id, data: values }); setEditAcc(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update account'); }
  }

  async function handleDelete() {
    if (!deleteAcc) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteAcc.id); setDeleteAcc(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete account'); }
  }

  const STATUSES: BankAccountStatus[] = ['active', 'inactive', 'closed'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search accounts…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Account
              </Button>
            )}
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Account Name', 'Bank', 'Type', 'Account #', 'Currency', 'Balance', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : accounts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <Building2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">{search || statusFilter ? 'No accounts match.' : 'No bank accounts yet.'}</p>
                {!search && !statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Account
                  </Button>
                )}
              </td></tr>
            ) : accounts.map((acc, i) => (
              <motion.tr key={acc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-white">{acc.name}</td>
                <td className="px-4 py-3 text-sm text-white/60">{acc.bankName ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-white/50">{TYPE_LABELS[acc.accountType] ?? acc.accountType}</td>
                <td className="px-4 py-3 text-xs font-mono text-white/50">{acc.accountNumber ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-white/50">{acc.currency}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-sm font-semibold tabular-nums', parseFloat(acc.currentBalance) >= 0 ? 'text-white/80' : 'text-red-400')}>
                    {fmt(acc.currentBalance)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[acc.status])}>
                    {acc.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {perms.canEdit && (
                      <button onClick={() => { setFormError(null); setEditAcc(acc); }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.canDelete && (
                      <button onClick={() => { setDeleteError(null); setDeleteAcc(acc); }}
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
            {isLoading ? 'Loading…' : total === 0 ? 'No accounts' : `${total} account${total !== 1 ? 's' : ''}`}
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

      <AccountFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} error={formError} />
      <AccountFormModal open={!!editAcc} onClose={() => setEditAcc(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} account={editAcc} error={formError} />
      <BankingDeleteDialog open={!!deleteAcc} onClose={() => setDeleteAcc(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Bank Account"
        description={`Delete "${deleteAcc?.name}"? This cannot be undone. Accounts with transactions cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
