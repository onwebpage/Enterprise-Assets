import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/app/StatusBadge';
import AccountFormModal from './AccountFormModal';
import DeleteAccountDialog from './DeleteAccountDialog';
import {
  useAccounts, useAccountParents, useFinancePermissions,
  useCreateAccount, useUpdateAccount, useDeleteAccount,
  type Account, type AccountFormValues, type AccountType,
} from '@/hooks/useChartOfAccounts';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

const TYPE_COLOR: Record<string, string> = {
  Asset:     'bg-blue-500/12 text-blue-400 border-blue-500/25',
  Liability: 'bg-red-500/12 text-red-400 border-red-500/25',
  Equity:    'bg-purple-500/12 text-purple-400 border-purple-500/25',
  Income:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  Expense:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
};

const PAGE_LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n < 0
    ? `(${Math.abs(n).toLocaleString()})`
    : `$${n.toLocaleString()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 1 ? '60%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChartOfAccountsTab() {
  // ── Filter / pagination state ─────────────────────────────────────────────
  const [search,   setSearch]   = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [formError,   setFormError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: list, isLoading, isFetching, refetch } = useAccounts({
    search:  search  || undefined,
    type:    typeFilter   || undefined,
    status:  statusFilter || undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const { data: parentsRes } = useAccountParents();
  const { data: permsRes }   = useFinancePermissions();

  const createMut = useCreateAccount();
  const updateMut = useUpdateAccount();
  const deleteMut = useDeleteAccount();

  const accounts   = list?.data       ?? [];
  const total      = list?.total      ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const parents    = parentsRes?.data ?? [];
  const perms      = permsRes?.data   ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const handleTypeFilter = useCallback((v: string) => {
    setTypeFilter(v === typeFilter ? '' : v);
    setPage(1);
  }, [typeFilter]);

  const handleStatusFilter = useCallback((v: string) => {
    setStatusFilter(v === statusFilter ? '' : v);
    setPage(1);
  }, [statusFilter]);

  async function handleCreate(values: AccountFormValues) {
    setFormError(null);
    try {
      await createMut.mutateAsync(values);
      setCreateOpen(false);
    } catch (e: any) {
      setFormError(e?.message ?? 'Failed to create account');
    }
  }

  async function handleUpdate(values: AccountFormValues) {
    if (!editAccount) return;
    setFormError(null);
    try {
      await updateMut.mutateAsync({ id: editAccount.id, data: values });
      setEditAccount(null);
    } catch (e: any) {
      setFormError(e?.message ?? 'Failed to update account');
    }
  }

  async function handleDelete() {
    if (!deleteAccount) return;
    setDeleteError(null);
    try {
      await deleteMut.mutateAsync(deleteAccount.id);
      setDeleteAccount(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Failed to delete account');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Main table card */}
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              placeholder="Search by code or name…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm"
            />
          </div>

          {/* Type filter chips */}
          <div className="flex items-center gap-1">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => handleTypeFilter(t)}
                className={cn(
                  'px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                  typeFilter === t
                    ? TYPE_COLOR[t]
                    : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {['active', 'inactive'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusFilter(s)}
                className={cn(
                  'px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                  statusFilter === s
                    ? s === 'active'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/[0.12] bg-white/[0.06] text-white/50'
                    : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            {perms.canCreate && (
              <Button
                size="sm"
                onClick={() => { setFormError(null); setCreateOpen(true); }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Account
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Code', 'Account Name', 'Type', 'Normal Bal.', 'Balance', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm text-white/30">
                    {search || typeFilter || statusFilter
                      ? 'No accounts match your filters.'
                      : 'No accounts yet. Add your first account to get started.'}
                  </p>
                  {!search && !typeFilter && !statusFilter && perms.canCreate && (
                    <Button
                      size="sm"
                      onClick={() => { setFormError(null); setCreateOpen(true); }}
                      className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add Account
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              accounts.map((acc, i) => {
                const isChild = acc.parentId !== null;
                return (
                  <motion.tr
                    key={acc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group last:border-0"
                  >
                    {/* Code */}
                    <td className="px-4 py-3 w-24">
                      <span className={cn(
                        'text-sm font-mono font-semibold',
                        isChild ? 'text-[#06B6D4]' : 'text-[#2563EB]',
                      )}>
                        {isChild && <ChevronRight className="w-3 h-3 inline -mt-0.5 mr-0.5 text-white/20" />}
                        {acc.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className={cn('text-sm font-medium', isChild ? 'text-white/70 pl-3' : 'text-white/85')}>
                        {acc.name}
                      </div>
                      {acc.description && (
                        <p className="text-[11px] text-white/30 mt-0.5 truncate max-w-xs pl-3">{acc.description}</p>
                      )}
                      {acc.childCount > 0 && (
                        <span className="text-[10px] text-white/25 ml-0">
                          {acc.childCount} sub-account{acc.childCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
                        TYPE_COLOR[acc.type],
                      )}>
                        {acc.type}
                      </span>
                    </td>

                    {/* Normal Balance */}
                    <td className="px-4 py-3 text-sm text-white/40">{acc.normalBalance}</td>

                    {/* Balance */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-sm font-semibold tabular-nums flex items-center gap-1',
                        parseFloat(acc.balance) >= 0 ? 'text-white' : 'text-red-400',
                      )}>
                        {parseFloat(acc.balance) > 0 && acc.normalBalance === 'Credit'
                          ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          : parseFloat(acc.balance) > 0
                          ? <ArrowUpRight className="w-3 h-3 text-white/30" />
                          : null}
                        {fmt(parseFloat(acc.balance))}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={acc.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {perms.canEdit && (
                          <button
                            onClick={() => { setFormError(null); setEditAccount(acc); }}
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {perms.canDelete && (
                          <button
                            onClick={() => { setDeleteError(null); setDeleteAccount(acc); }}
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!perms.canEdit && !perms.canDelete && (
                          <span title="Read-only access">
                            <Eye className="w-3.5 h-3.5 text-white/20" />
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading
              ? 'Loading…'
              : total === 0
              ? 'No accounts'
              : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total} accounts`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2"
            >
              ← Prev
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-7 h-7 rounded text-xs transition-colors',
                    p === page
                      ? 'bg-[#2563EB] text-white'
                      : 'text-white/40 hover:bg-white/[0.07]',
                  )}
                >
                  {p}
                </button>
              );
            })}
            {totalPages > 7 && <span className="text-white/25 text-xs px-1">…</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2"
            >
              Next →
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AccountFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMut.isPending}
        parents={parents}
        error={formError}
      />

      <AccountFormModal
        open={!!editAccount}
        onClose={() => setEditAccount(null)}
        onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending}
        account={editAccount}
        parents={parents}
        error={formError}
      />

      <DeleteAccountDialog
        open={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        account={deleteAccount}
        error={deleteError}
      />
    </>
  );
}
