import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useCreateEInvInvoice, useUpdateEInvInvoice, useEInvBuyers,
  type EInvInvoice, type EInvInvoiceFormValues, type EInvLineFormValues,
  EINV_INVOICE_TYPES, EINV_SUPPLY_TYPES,
} from '@/hooks/useEInvoicing';

interface Props {
  invoice: EInvInvoice | null;
  onClose: () => void;
}

const EMPTY_LINE: EInvLineFormValues = {
  description: '', hsnCode: '', quantity: '1', unitPrice: '0',
  discount: '0', cgstRate: '0', sgstRate: '0', igstRate: '0', cessRate: '0',
};

function computeLine(l: EInvLineFormValues) {
  const qty     = parseFloat(l.quantity  || '1');
  const price   = parseFloat(l.unitPrice || '0');
  const disc    = parseFloat(l.discount  || '0');
  const taxable = Math.max(0, qty * price - disc);
  const cgst    = taxable * parseFloat(l.cgstRate || '0') / 100;
  const sgst    = taxable * parseFloat(l.sgstRate || '0') / 100;
  const igst    = taxable * parseFloat(l.igstRate || '0') / 100;
  const cess    = taxable * parseFloat(l.cessRate || '0') / 100;
  return { taxable, cgst, sgst, igst, cess, total: taxable + cgst + sgst + igst + cess };
}

const SUPPLY_LABELS: Record<string, string> = {
  regular: 'Regular', deemed_export: 'Deemed Export',
  sez_supplies: 'SEZ Supplies', reverse_charge: 'Reverse Charge',
};

export default function InvoiceFormModal({ invoice, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const isEdit = !!invoice;

  const [invoiceType, setInvoiceType]   = useState<string>(invoice?.invoiceType ?? 'B2B');
  const [supplyType, setSupplyType]     = useState<string>(invoice?.supplyType  ?? 'regular');
  const [buyerId, setBuyerId]           = useState<string>(invoice?.buyerId ? String(invoice.buyerId) : '');
  const [issueDate, setIssueDate]       = useState(invoice?.issueDate ?? today);
  const [placeOfSupply, setPlaceOfSupply] = useState(invoice?.placeOfSupply ?? '');
  const [notes, setNotes]               = useState(invoice?.notes ?? '');
  const [lines, setLines]               = useState<EInvLineFormValues[]>(
    invoice?.lines?.map(l => ({
      description: l.description,
      hsnCode:     l.hsnCode ?? '',
      quantity:    l.quantity,
      unitPrice:   l.unitPrice,
      discount:    l.discount,
      cgstRate:    l.cgstRate,
      sgstRate:    l.sgstRate,
      igstRate:    l.igstRate,
      cessRate:    l.cessRate,
    })) ?? [{ ...EMPTY_LINE }]
  );
  const [error, setError] = useState<string | null>(null);

  const { data: buyersRes } = useEInvBuyers({ limit: 100 });
  const buyers = buyersRes?.data?.filter(b => b.isActive) ?? [];

  const create = useCreateEInvInvoice();
  const update = useUpdateEInvInvoice();
  const loading = create.isPending || update.isPending;

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]); }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)); }
  function setLineField(i: number, field: keyof EInvLineFormValues, value: string) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  // Totals
  const computed = lines.map(computeLine);
  const totalTaxable = computed.reduce((s, l) => s + l.taxable, 0);
  const totalCgst    = computed.reduce((s, l) => s + l.cgst, 0);
  const totalSgst    = computed.reduce((s, l) => s + l.sgst, 0);
  const totalIgst    = computed.reduce((s, l) => s + l.igst, 0);
  const totalCess    = computed.reduce((s, l) => s + l.cess, 0);
  const grandTotal   = computed.reduce((s, l) => s + l.total, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!issueDate) { setError('Issue date is required'); return; }
    if (lines.length === 0 || lines.every(l => !l.description.trim())) {
      setError('At least one line item is required'); return;
    }
    const validLines = lines.filter(l => l.description.trim());
    const payload: EInvInvoiceFormValues = {
      invoiceType: invoiceType as any,
      supplyType:  supplyType as any,
      buyerId:     buyerId ? parseInt(buyerId) : null,
      issueDate,
      placeOfSupply: placeOfSupply || undefined,
      notes: notes || undefined,
      lines: validLines,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: invoice.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save invoice');
    }
  }

  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-3xl mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">{isEdit ? 'Edit E-Invoice' : 'New E-Invoice'}</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

            {/* Row 1: Type / Supply / Buyer */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Invoice Type</label>
                <select value={invoiceType} onChange={e => setInvoiceType(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[#2563EB]/50">
                  {EINV_INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Supply Type</label>
                <select value={supplyType} onChange={e => setSupplyType(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[#2563EB]/50">
                  {EINV_SUPPLY_TYPES.map(t => <option key={t} value={t}>{SUPPLY_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Buyer</label>
                <select value={buyerId} onChange={e => setBuyerId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[#2563EB]/50">
                  <option value="">— Select buyer —</option>
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Date / Place of Supply */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Issue Date <span className="text-red-400">*</span></label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Place of Supply</label>
                <Input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Maharashtra (27)"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/50">Line Items</span>
                <button type="button" onClick={addLine}
                  className="text-xs text-[#2563EB] hover:text-blue-400 flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>

              <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.07]">
                      <th className="px-3 py-2 text-left text-white/40 font-medium w-[30%]">Description</th>
                      <th className="px-3 py-2 text-left text-white/40 font-medium">HSN</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">Qty</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">Rate</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">Disc</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">CGST%</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">SGST%</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">IGST%</th>
                      <th className="px-3 py-2 text-right text-white/40 font-medium">Total</th>
                      <th className="px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const c = computed[i];
                      return (
                        <tr key={i} className="border-b border-white/[0.04] last:border-0">
                          <td className="px-2 py-1.5">
                            <input value={line.description}
                              onChange={e => setLineField(i, 'description', e.target.value)}
                              placeholder="Item description"
                              className="w-full bg-transparent text-white placeholder:text-white/20 outline-none" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={line.hsnCode} onChange={e => setLineField(i, 'hsnCode', e.target.value)}
                              placeholder="0000" className="w-16 bg-transparent text-white/70 placeholder:text-white/20 outline-none text-right" />
                          </td>
                          {(['quantity','unitPrice','discount','cgstRate','sgstRate','igstRate'] as const).map(field => (
                            <td key={field} className="px-2 py-1.5">
                              <input type="number" min="0" step="any" value={line[field]}
                                onChange={e => setLineField(i, field, e.target.value)}
                                className="w-16 bg-transparent text-white/70 placeholder:text-white/20 outline-none text-right" />
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right text-white/70 tabular-nums">{fmt(c?.total ?? 0)}</td>
                          <td className="px-1 py-1.5">
                            {lines.length > 1 && (
                              <button type="button" onClick={() => removeLine(i)}
                                className="text-white/20 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-xs">
                <div className="flex justify-between text-white/50">
                  <span>Taxable Amount</span><span className="tabular-nums">{fmt(totalTaxable)}</span>
                </div>
                {totalCgst > 0 && <div className="flex justify-between text-white/50"><span>CGST</span><span className="tabular-nums">{fmt(totalCgst)}</span></div>}
                {totalSgst > 0 && <div className="flex justify-between text-white/50"><span>SGST</span><span className="tabular-nums">{fmt(totalSgst)}</span></div>}
                {totalIgst > 0 && <div className="flex justify-between text-white/50"><span>IGST</span><span className="tabular-nums">{fmt(totalIgst)}</span></div>}
                {totalCess > 0 && <div className="flex justify-between text-white/50"><span>Cess</span><span className="tabular-nums">{fmt(totalCess)}</span></div>}
                <div className="flex justify-between text-white font-semibold border-t border-white/[0.07] pt-1 mt-1">
                  <span>Total</span><span className="tabular-nums">{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Optional notes…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563EB]/50 resize-none" />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
            )}
          </div>

          <div className="flex gap-2 justify-end px-6 py-4 border-t border-white/[0.07] shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
