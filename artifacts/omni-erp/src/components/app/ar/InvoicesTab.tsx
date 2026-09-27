import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Eye, CreditCard, Printer, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useARInvoices, useARCustomers, useARInvoice,
  useCreateARInvoice, useUpdateARInvoice, useDeleteARInvoice,
  useARPermissions, useCreateARPayment,
  type ARInvoice, type ARInvoiceStatus, type ARInvoiceFormValues,
} from '@/hooks/useAccountsReceivable';
import { api, type ApiResponse } from '@/lib/api';
import InvoiceFormModal from './InvoiceFormModal';
import PaymentFormModal from './PaymentFormModal';
import ARDeleteDialog from './ARDeleteDialog';

const STATUS_COLORS: Record<ARInvoiceStatus, string> = {
  draft:   'bg-white/[0.06] text-white/45 border-white/[0.1]',
  sent:    'bg-blue-500/12 text-blue-400 border-blue-500/25',
  partial: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  paid:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  overdue: 'bg-red-500/12 text-red-400 border-red-500/25',
  void:    'bg-white/[0.04] text-white/25 border-white/[0.07]',
};

const PAGE_LIMIT = 25;

function fmt(v: string) {
  return '$' + parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function printText(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

function printInvoice(invoice: ARInvoice) {
  const printFrame = document.createElement('iframe');
  printFrame.title = `Print ${invoice.invoiceNumber}`;
  printFrame.setAttribute('aria-hidden', 'true');
  printFrame.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0';
  document.body.appendChild(printFrame);

  const printWindow = printFrame.contentWindow;
  if (!printWindow) {
    printFrame.remove();
    throw new Error('Could not prepare invoice for printing');
  }
  const printDocument = printWindow.document;
  const lines = (invoice.lines ?? []).map((line) => `
    <tr>
      <td>${printText(line.description)}</td>
      <td class="number">${printText(line.quantity)}</td>
      <td class="number">${fmt(line.unitPrice)}</td>
      <td class="number">${fmt(line.amount)}</td>
    </tr>`).join('');
  const balance = (parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid)).toFixed(2);

  printDocument.open();
  printDocument.write(`<!doctype html><html><head><title>${printText(invoice.invoiceNumber)}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
      .page { max-width: 780px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; gap: 32px; padding-bottom: 26px; border-bottom: 3px solid #2563eb; }
      .brand { color: #2563eb; font-size: 24px; font-weight: 800; letter-spacing: .02em; }
      .label { color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: .02em; text-align: right; }
      .meta { color: #475569; line-height: 1.7; text-align: right; }
      .summary { display: flex; justify-content: space-between; gap: 32px; padding: 26px 0; }
      .customer { flex: 1; }
      .customer-name { margin-top: 7px; font-size: 16px; font-weight: 700; }
      .dates { min-width: 220px; }
      .date-row { display: flex; justify-content: space-between; gap: 22px; padding: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { padding: 10px 12px; color: #fff; background: #172033; font-size: 10px; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
      td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
      .number { text-align: right; white-space: nowrap; }
      .totals { display: flex; justify-content: flex-end; padding-top: 18px; }
      .totals table { width: 280px; }
      .totals td { padding: 7px 0 7px 18px; border: 0; }
      .total td { border-top: 2px solid #172033; color: #172033; font-size: 15px; font-weight: 800; }
      .balance td { color: #2563eb; font-weight: 700; }
      .notes { margin-top: 36px; padding: 14px 16px; background: #f8fafc; border-left: 3px solid #cbd5e1; white-space: pre-wrap; }
      footer { margin-top: 48px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 10px; text-align: center; }
    </style></head><body><main class="page">
      <header class="header"><div><div class="brand">INVOICE</div><div class="label" style="margin-top:8px">Accounts Receivable</div></div>
        <div><h1>${printText(invoice.invoiceNumber)}</h1><div class="meta">Status: ${printText(invoice.status.toUpperCase())}<br>Issued: ${printText(invoice.issueDate)}</div></div></header>
      <section class="summary"><div class="customer"><div class="label">Bill To</div><div class="customer-name">${printText(invoice.customerName || 'Customer')}</div></div>
        <div class="dates"><div class="date-row"><span class="label">Invoice date</span><strong>${printText(invoice.issueDate)}</strong></div><div class="date-row"><span class="label">Due date</span><strong>${printText(invoice.dueDate)}</strong></div></div></section>
      <table><thead><tr><th>Description</th><th class="number">Quantity</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead><tbody>${lines}</tbody></table>
      <section class="totals"><table><tr><td>Subtotal</td><td class="number">${fmt(invoice.subtotal)}</td></tr><tr><td>Tax</td><td class="number">${fmt(invoice.taxAmount)}</td></tr><tr class="total"><td>Total</td><td class="number">${fmt(invoice.totalAmount)}</td></tr><tr><td>Paid</td><td class="number">${fmt(invoice.amountPaid)}</td></tr><tr class="balance"><td>Balance due</td><td class="number">${fmt(balance)}</td></tr></table></section>
      ${invoice.notes ? `<div class="notes"><div class="label">Notes</div><div style="margin-top:6px">${printText(invoice.notes)}</div></div>` : ''}
      <footer>Thank you for your business.</footer>
    </main></body></html>`);
  printDocument.close();
  printWindow.addEventListener('afterprint', () => printFrame.remove(), { once: true });
  window.setTimeout(() => printFrame.remove(), 60_000);
  printWindow.focus();
  printWindow.print();
}

function downloadInvoicePdf(invoice: ARInvoice) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  let y = 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(37, 99, 235);
  pdf.text('INVOICE', margin, y);
  pdf.setTextColor(23, 32, 51);
  pdf.setFontSize(17);
  pdf.text(invoice.invoiceNumber, pageWidth - margin, y, { align: 'right' });
  y += 9;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin, y, { align: 'right' });
  y += 13;

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(23, 32, 51);
  pdf.text('Bill To', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(invoice.customerName || 'Customer', margin, y + 6);
  pdf.text(`Invoice date: ${invoice.issueDate}`, pageWidth - margin, y, { align: 'right' });
  pdf.text(`Due date: ${invoice.dueDate}`, pageWidth - margin, y + 6, { align: 'right' });
  y += 17;

  const drawTableHeader = () => {
    pdf.setFillColor(23, 32, 51);
    pdf.rect(margin, y, pageWidth - margin * 2, 9, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Description', margin + 3, y + 6);
    pdf.text('Qty', 130, y + 6, { align: 'right' });
    pdf.text('Unit price', 164, y + 6, { align: 'right' });
    pdf.text('Amount', pageWidth - margin - 3, y + 6, { align: 'right' });
    y += 9;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(23, 32, 51);
  };

  drawTableHeader();
  for (const line of invoice.lines ?? []) {
    const descriptionLines = pdf.splitTextToSize(line.description || '', 86);
    const rowHeight = Math.max(8, descriptionLines.length * 4.5 + 3);
    if (y + rowHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      drawTableHeader();
    }
    pdf.setFontSize(9);
    pdf.text(descriptionLines, margin + 3, y + 5);
    pdf.text(String(line.quantity), 130, y + 5, { align: 'right' });
    pdf.text(fmt(line.unitPrice), 164, y + 5, { align: 'right' });
    pdf.text(fmt(line.amount), pageWidth - margin - 3, y + 5, { align: 'right' });
    y += rowHeight;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, pageWidth - margin, y);
  }

  if (y + 38 > pageHeight - margin) {
    pdf.addPage();
    y = margin;
  }
  y += 8;
  const totalLabelX = pageWidth - margin - 62;
  const totalValueX = pageWidth - margin;
  const totals = [
    ['Subtotal', fmt(invoice.subtotal)],
    ['Tax', fmt(invoice.taxAmount)],
    ['Total', fmt(invoice.totalAmount)],
    ['Paid', fmt(invoice.amountPaid)],
    ['Balance due', fmt((parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid)).toFixed(2))],
  ];
  totals.forEach(([label, value], index) => {
    if (index === 2) {
      pdf.setDrawColor(23, 32, 51);
      pdf.line(totalLabelX, y - 3, totalValueX, y - 3);
      pdf.setFont('helvetica', 'bold');
    }
    if (index === 4) pdf.setTextColor(37, 99, 235);
    pdf.text(label, totalLabelX, y);
    pdf.text(value, totalValueX, y, { align: 'right' });
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(23, 32, 51);
  });

  if (invoice.notes) {
    y += 8;
    const notes = pdf.splitTextToSize(`Notes: ${invoice.notes}`, pageWidth - margin * 2);
    if (y + notes.length * 5 > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.setFontSize(9);
    pdf.text(notes, margin, y);
  }

  const safeName = invoice.invoiceNumber.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'invoice';
  const pdfUrl = URL.createObjectURL(pdf.output('blob'));
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = `${safeName}.pdf`;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
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

export default function InvoicesTab() {
  const { toast } = useToast();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editInvoice, setEditInvoice] = useState<ARInvoice | null>(null);
  const [editInvoiceId, setEditInvoiceId] = useState<number | null>(null);
  const [payInvoice, setPayInvoice]   = useState<ARInvoice | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<ARInvoice | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [payError, setPayError]       = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useARInvoices({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: customersRes } = useARCustomers({ limit: 200 });
  const { data: invoiceDetail } = useARInvoice(editInvoiceId);
  const { data: permsRes }     = useARPermissions();

  const createMut  = useCreateARInvoice();
  const updateMut  = useUpdateARInvoice();
  const deleteMut  = useDeleteARInvoice();
  const paymentMut = useCreateARPayment();

  const invoices   = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const customers  = customersRes?.data ?? [];
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  // Open invoices eligible for payment
  const openInvoices = invoices.filter((i) => !['paid', 'void', 'draft'].includes(i.status));

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  function openEdit(inv: ARInvoice) {
    setFormError(null);
    setEditInvoiceId(inv.id);
    setEditInvoice(inv);
  }

  // When detail loads, keep editInvoice updated with lines
  const editWithLines = invoiceDetail?.data ?? editInvoice;

  async function handleCreate(values: ARInvoiceFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create invoice'); }
  }

  async function handleUpdate(values: ARInvoiceFormValues) {
    if (!editInvoice) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editInvoice.id, data: values }); setEditInvoice(null); setEditInvoiceId(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update invoice'); }
  }

  async function handleDelete() {
    if (!deleteInvoice) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteInvoice.id); setDeleteInvoice(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete invoice'); }
  }

  async function handlePayment(values: any) {
    setPayError(null);
    try { await paymentMut.mutateAsync(values); setPayInvoice(null); }
    catch (e: any) { setPayError(e?.message ?? 'Failed to record payment'); }
  }

  const STATUSES: ARInvoiceStatus[] = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search invoice # or customer…" value={search} onChange={(e) => handleSearch(e.target.value)}
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
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Total', 'Balance', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : invoices.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-sm text-white/30">{search || statusFilter ? 'No invoices match.' : 'No invoices yet.'}</p>
                {!search && !statusFilter && perms.canCreate && (
                  <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />New Invoice
                  </Button>
                )}
              </td></tr>
            ) : invoices.map((inv, i) => {
              const balance = parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid);
              const canPay  = perms.canCreate && !['paid', 'void', 'draft'].includes(inv.status);
              const canEdit = perms.canEdit;
              const canDel  = perms.canDelete && inv.status === 'draft';
              return (
                <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0 cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-[#2563EB]">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80">{inv.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{inv.issueDate}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs', inv.status === 'overdue' ? 'text-red-400 font-medium' : 'text-white/50')}>
                      {inv.dueDate}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80 tabular-nums">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-semibold tabular-nums', balance > 0.01 ? 'text-amber-400' : 'text-white/30')}>
                      {balance > 0.01 ? fmt(balance.toFixed(2)) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize', STATUS_COLORS[inv.status])}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {canPay && (
                        <button onClick={() => { setPayError(null); setPayInvoice(inv); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors" title="Record payment">
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => {
                        try {
                          printInvoice(inv);
                        } catch (error) {
                          toast({ title: 'Could not open invoice for printing', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
                        }
                      }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors" title="Print Invoice">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => {
                        try {
                          downloadInvoicePdf(inv);
                        } catch (error) {
                          toast({ title: 'Could not download invoice PDF', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
                        }
                      }}
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button onClick={() => openEdit(inv)}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDel && (
                        <button onClick={() => { setDeleteError(null); setDeleteInvoice(inv); }}
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
            {isLoading ? 'Loading…' : total === 0 ? 'No invoices' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
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
      <InvoiceFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} customers={customers} error={formError} />
      <InvoiceFormModal open={!!editInvoice} onClose={() => { setEditInvoice(null); setEditInvoiceId(null); }}
        onSubmit={handleUpdate} isSubmitting={updateMut.isPending}
        invoice={editWithLines ?? null} customers={customers} error={formError} />
      <PaymentFormModal open={!!payInvoice} onClose={() => setPayInvoice(null)} onSubmit={handlePayment}
        isSubmitting={paymentMut.isPending} invoices={payInvoice ? [payInvoice] : openInvoices}
        defaultInvoiceId={payInvoice?.id} error={payError} />
      <ARDeleteDialog
        open={!!deleteInvoice} onClose={() => setDeleteInvoice(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Invoice"
        description={`Delete invoice "${deleteInvoice?.invoiceNumber}"? Only draft invoices can be deleted.`}
        error={deleteError}
      />
    </>
  );
}
