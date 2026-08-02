import { useState } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, FileText, Send, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useEInvInvoices, useDeleteEInvInvoice, useEInvPermissions,
  type EInvInvoice, type EInvInvoiceStatus,
  EINV_INVOICE_STATUSES, EINV_INVOICE_TYPES,
} from '@/hooks/useEInvoicing';
import InvoiceFormModal from './InvoiceFormModal';
import SubmitInvoiceModal from './SubmitInvoiceModal';
import EInvDeleteDialog from './EInvDeleteDialog';

const PAGE_LIMIT = 25;

const STATUS_STYLES: Record<EInvInvoiceStatus, string> = {
  draft:        'bg-white/[0.06]   text-white/50    border-white/[0.1]',
  submitted:    'bg-blue-500/10    text-blue-400    border-blue-500/20',
  acknowledged: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected:     'bg-red-500/10     text-red-400     border-red-500/20',
  cancelled:    'bg-orange-500/10  text-orange-400  border-orange-500/20',
};

const STATUS_LABELS: Record<EInvInvoiceStatus, string> = {
  draft:        'Draft',
  submitted:    'Submitted',
  acknowledged: 'Acknowledged',
  rejected:     'Rejected',
  cancelled:    'Cancelled',
};

function fmtAmt(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '80%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; invoice: EInvInvoice }
  | { kind: 'submit'; invoice: EInvInvoice }
  | { kind: 'acknowledge'; invoice: EInvInvoice }
  | { kind: 'cancel'; invoice: EInvInvoice }
  | { kind: 'delete'; invoice: EInvInvoice }
  | null;

export default function InvoicesTab() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [typeFilter, setType]       = useState('');
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState<ModalState>(null);

  const { data: permsRes } = useEInvPermissions();
  const perms = permsRes?.data;

  const { data: list, isLoading, isFetching, refetch } = useEInvInvoices({
    search: search || undefined,
    status: statusFilter || undefined,
    type:   typeFilter   || undefined,
    page, limit: PAGE_LIMIT,
  });
  const deleteMut = useDeleteEInvInvoice();

  const invoices = list?.data ?? [];
  const total    = list?.total ?? 0;
  const pages    = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function handleSearch(v: string) { setSearch(v); setPage(1); }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search invoices, IRN…"
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 text-sm h-8" />
        </div>

        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-8 text-xs bg-white/[0.04] border border-white/[0.08] rounded-md px-2 text-white/70 outline-none">
          <option value="">All Statuses</option>
          {EINV_INVOICE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1); }}
          className="h-8 text-xs bg-white/[0.04] border border-white/[0.08] rounded-md px-2 text-white/70 outline-none">
          <option value="">All Types</option>
          {EINV_INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}
          className="h-8 px-2 text-white/40 hover:text-white hover:bg-white/[0.06]">
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </Button>

        <div className="ml-auto">
          {perms?.canCreate && (
            <Button size="sm" onClick={() => setModal({ kind: 'create' })}
              className="h-8 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Buyer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No invoices found</p>
                  {perms?.canCreate && (
                    <button onClick={() => setModal({ kind: 'create' })}
                      className="mt-2 text-xs text-[#2563EB] hover:text-blue-400 transition-colors">
                      Create your first e-invoice →
                    </button>
                  )}
                </td>
              </tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{inv.invoiceNumber}</div>
                  {inv.irn && (
                    <div className="text-[10px] text-white/30 mt-0.5 font-mono truncate max-w-[140px]" title={inv.irn}>
                      IRN: {inv.irn.substring(0, 16)}…
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-white/80">{inv.buyerName ?? '—'}</div>
                  {inv.buyerGstin && <div className="text-[11px] text-white/30 font-mono">{inv.buyerGstin}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 font-medium">
                    {inv.invoiceType}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60 text-xs tabular-nums">{inv.issueDate}</td>
                <td className="px-4 py-3 text-right text-white font-medium tabular-nums">
                  {fmtAmt(inv.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                    STATUS_STYLES[inv.status as EInvInvoiceStatus]
                  )}>
                    {STATUS_LABELS[inv.status as EInvInvoiceStatus]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {/* Submit: draft only */}
                    {perms?.canEdit && inv.status === 'draft' && (
                      <button onClick={() => setModal({ kind: 'submit', invoice: inv })}
                        title="Submit for IRN"
                        className="p-1.5 rounded hover:bg-blue-500/10 text-white/40 hover:text-blue-400 transition-colors">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Acknowledge: submitted only */}
                    {perms?.canEdit && inv.status === 'submitted' && (
                      <button onClick={() => setModal({ kind: 'acknowledge', invoice: inv })}
                        title="Acknowledge"
                        className="p-1.5 rounded hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Cancel: submitted or acknowledged */}
                    {perms?.canEdit && ['submitted', 'acknowledged'].includes(inv.status) && (
                      <button onClick={() => setModal({ kind: 'cancel', invoice: inv })}
                        title="Cancel"
                        className="p-1.5 rounded hover:bg-orange-500/10 text-white/40 hover:text-orange-400 transition-colors">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Edit: draft only */}
                    {perms?.canEdit && inv.status === 'draft' && (
                      <button onClick={() => setModal({ kind: 'edit', invoice: inv })}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Delete: draft only */}
                    {perms?.canDelete && inv.status === 'draft' && (
                      <button onClick={() => setModal({ kind: 'delete', invoice: inv })}
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{total} invoices</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1} className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/[0.06]">
              Prev
            </Button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages} className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/[0.06]">
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.kind === 'create' && (
        <InvoiceFormModal invoice={null} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && (
        <InvoiceFormModal invoice={modal.invoice} onClose={() => setModal(null)} />
      )}
      {(modal?.kind === 'submit' || modal?.kind === 'acknowledge' || modal?.kind === 'cancel') && (
        <SubmitInvoiceModal invoice={modal.invoice} action={modal.kind} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && (
        <EInvDeleteDialog
          title={`Delete "${modal.invoice.invoiceNumber}"?`}
          description="This draft invoice and all its line items will be permanently deleted."
          onConfirm={() => deleteMut.mutateAsync(modal.invoice.id).then(() => {})}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
