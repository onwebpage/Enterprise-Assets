import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Download, Eye, Edit, Trash2, Send,
  ChevronLeft, ChevronRight, Loader2, ShieldOff, RefreshCw,
  CheckCircle2, Clock, AlertCircle, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccountParents } from '@/hooks/useChartOfAccounts';
import {
  useJournalEntries, useGLPermissions, useDeleteJournalEntry, usePostJournalEntry,
  useJournalEntry,
  type JournalEntry,
} from '@/hooks/useGeneralLedger';
import JournalEntryFormModal from './JournalEntryFormModal';
import { formatINR } from '@/lib/currency';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 25;

const STATUS_CONFIG = {
  draft:  { label: 'Draft',  className: 'bg-white/[0.05] text-white/50 border-white/10',        icon: Clock        },
  posted: { label: 'Posted', className: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', icon: CheckCircle2 },
  void:   { label: 'Void',   className: 'bg-red-500/12 text-red-400 border-red-500/25',         icon: X            },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(s: string) {
  const n = parseFloat(s ?? '0');
  return n === 0 ? '—' : formatINR(n);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 3 ? '70%' : '55%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function JEDetailPanel({ je, onClose }: { je: JournalEntry; onClose: () => void }) {
  const { data: res, isLoading } = useJournalEntry(je.id);
  const full = res?.data;

  const st = STATUS_CONFIG[je.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = st.icon;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="w-[520px] bg-[#0d1225] border-l border-white/[0.08] flex flex-col h-full overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div>
            <p className="text-xs text-white/40 font-mono mb-0.5">{je.entryNumber}</p>
            <h2 className="text-sm font-semibold text-white">{je.memo}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-4 grid grid-cols-2 gap-y-3 border-b border-white/[0.07]">
          {[
            { label: 'Date',      value: fmtDate(je.date) },
            { label: 'Reference', value: je.reference ?? '—' },
            { label: 'Status',    value: (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border', st.className)}>
                <StatusIcon className="w-3 h-3" />{st.label}
              </span>
            )},
            { label: 'Total',     value: fmtMoney(je.totalDebit) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">{label}</p>
              <div className="text-sm text-white/80">{value}</div>
            </div>
          ))}
        </div>

        {/* Lines */}
        <div className="px-5 py-4 flex-1">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Lines</p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-white/30 py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading lines…
            </div>
          ) : (
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Account', 'Description', 'Debit', 'Credit'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-semibold text-white/30 uppercase tracking-wide px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(full?.lines ?? []).map((line) => (
                    <tr key={line.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-3 py-2">
                        <p className="text-xs font-medium text-white/80">{line.accountCode}</p>
                        <p className="text-[10px] text-white/40">{line.accountName}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-white/50">{line.description || '—'}</td>
                      <td className="px-3 py-2 text-xs tabular-nums text-emerald-400 font-medium">
                        {parseFloat(line.debit) > 0 ? `$${parseFloat(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums text-red-400 font-medium">
                        {parseFloat(line.credit) > 0 ? `$${parseFloat(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                    <td className="px-3 py-2 text-xs font-semibold text-white/40" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-xs font-semibold text-emerald-400 tabular-nums">{fmtMoney(je.totalDebit)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-red-400 tabular-nums">{fmtMoney(je.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function JournalEntriesTab() {
  // Filter state
  const [search,    setSearch]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [statusFil, setStatusFil] = useState('');
  const [page,      setPage]      = useState(1);

  // Modal / panel state
  const [createOpen,  setCreateOpen]  = useState(false);
  const [editEntry,   setEditEntry]   = useState<JournalEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Data
  const { data: list, isLoading, isFetching, refetch } = useJournalEntries({
    search:   search   || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
    status:   statusFil || undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const { data: permsRes }   = useGLPermissions();
  const deleteMut = useDeleteJournalEntry();
  const postMut   = usePostJournalEntry();

  const entries    = list?.data       ?? [];
  const total      = list?.total      ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const perms      = permsRes?.data   ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to delete');
    }
  }

  async function handlePost(je: JournalEntry) {
    setActionError(null);
    try {
      await postMut.mutateAsync(je.id);
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to post entry');
    }
  }

  // ── No permission ─────────────────────────────────────────────────────────
  if (permsRes && !perms.canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <ShieldOff className="w-8 h-8 text-white/20" />
        <p className="text-sm text-white/30">You don't have permission to view journal entries.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          {/* Search */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              placeholder="Search entry #, memo, reference…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm"
            />
          </div>

          {/* Date from */}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            title="From date"
            className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-[140px]"
          />
          <span className="text-white/20 text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            title="To date"
            className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-[140px]"
          />

          {/* Status filter */}
          <select
            value={statusFil}
            onChange={(e) => { setStatusFil(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.07] rounded-md text-sm text-white/60 px-2 h-8 focus:outline-none focus:border-[#2563EB]/60"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="void">Void</option>
          </select>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            {perms.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Entry
              </Button>
            )}
          </div>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/8 border-b border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400/60 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {['Entry #', 'Date', 'Reference', 'Memo', 'Debit', 'Credit', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-white/30">
                  No journal entries found.
                  {perms.canCreate && (
                    <button onClick={() => setCreateOpen(true)} className="ml-2 text-[#2563EB] hover:underline">
                      Create one
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              entries.map((je, idx) => {
                const st = STATUS_CONFIG[je.status] ?? STATUS_CONFIG.draft;
                const StatusIcon = st.icon;
                return (
                  <motion.tr
                    key={je.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group last:border-0"
                    onClick={() => setDetailEntry(je)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{je.entryNumber}</td>
                    <td className="px-4 py-3 text-sm text-white/50 whitespace-nowrap">{fmtDate(je.date)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{je.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/70 max-w-[260px] truncate">{je.memo}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-400 tabular-nums">{fmtMoney(je.totalDebit)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-400 tabular-nums">{fmtMoney(je.totalCredit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border',
                        st.className,
                      )}>
                        <StatusIcon className="w-3 h-3" />{st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"
                          title="View"
                          onClick={() => setDetailEntry(je)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {perms.canEdit && je.status === 'draft' && (
                          <>
                            <button
                              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"
                              title="Edit"
                              onClick={() => setEditEntry(je)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400"
                              title="Post"
                              onClick={() => handlePost(je)}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {perms.canDelete && je.status === 'draft' && (
                          <button
                            className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"
                            title="Delete"
                            onClick={() => setDeleteTarget(je)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-xs text-white/30">
            {total === 0 ? 'No entries' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-7 h-7 rounded text-xs transition-colors',
                    p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]',
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit modal */}
      <JournalEntryFormModal
        open={createOpen || editEntry !== null}
        onClose={() => { setCreateOpen(false); setEditEntry(null); }}
        editEntry={editEntry}
      />

      {/* Detail panel */}
      {detailEntry && (
        <JEDetailPanel je={detailEntry} onClose={() => setDetailEntry(null)} />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-[#0d1225] border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              <span className="font-mono text-white/70">{deleteTarget?.entryNumber}</span> will be permanently deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && (
            <p className="text-xs text-red-400 px-1">{actionError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
