import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GST_ENTRY_TYPES, type GSTReturnEntryFormValues } from '@/hooks/useGSTReturns';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  b2b:         'B2B — Business to Business',
  b2c_large:   'B2C Large — Consumer > ₹2.5L',
  b2c_small:   'B2C Small — Consumer ≤ ₹2.5L',
  export:      'Export',
  import:      'Import',
  rcm:         'RCM — Reverse Charge',
  nil_exempt:  'Nil / Exempt / Non-GST',
  other:       'Other',
};

interface Props {
  open: boolean;
  returnId: number;
  returnType: string;
  onClose: () => void;
  onSubmit: (values: Omit<GSTReturnEntryFormValues, 'returnId'>) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

const inputCls = 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 h-8 text-sm focus:border-[#2563EB]/50';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-white/50">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const BLANK = {
  entryType: 'b2b' as const,
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyGstin: '',
  partyName: '',
  placeOfSupply: '',
  taxableValue: '',
  cgstAmount: '',
  sgstAmount: '',
  igstAmount: '',
  cessAmount: '',
  notes: '',
};

export default function EntryFormModal({ open, returnId, returnType, onClose, onSubmit, isSubmitting, error }: Props) {
  const [form, setForm] = useState({ ...BLANK });

  useEffect(() => {
    if (open) setForm({ ...BLANK });
  }, [open, returnId]);

  if (!open) return null;

  const set = (k: keyof typeof BLANK, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      entryType: form.entryType,
      invoiceNumber:  form.invoiceNumber  || null,
      invoiceDate:    form.invoiceDate    || null,
      partyGstin:     form.partyGstin     || null,
      partyName:      form.partyName      || null,
      placeOfSupply:  form.placeOfSupply  || null,
      taxableValue:   form.taxableValue   || '0',
      cgstAmount:     form.cgstAmount     || '0',
      sgstAmount:     form.sgstAmount     || '0',
      igstAmount:     form.igstAmount     || '0',
      cessAmount:     form.cessAmount     || '0',
      notes:          form.notes          || null,
    });
  }

  const RETURN_LABELS: Record<string, string> = {
    gstr1: 'GSTR-1', gstr3b: 'GSTR-3B', gstr9: 'GSTR-9',
    gstr2a: 'GSTR-2A', gstr4: 'GSTR-4', gstr6: 'GSTR-6',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Add Entry</h2>
            <p className="text-xs text-white/35 mt-0.5">
              Return #{returnId} · {RETURN_LABELS[returnType] ?? returnType.toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Entry type */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/50">Entry Type<span className="text-red-400 ml-0.5">*</span></label>
            <div className="flex flex-wrap gap-1.5">
              {GST_ENTRY_TYPES.map((t) => (
                <button key={t} type="button"
                  onClick={() => set('entryType', t)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all ${
                    form.entryType === t
                      ? 'border-[#2563EB]/50 bg-[#2563EB]/15 text-[#60a5fa]'
                      : 'border-white/[0.08] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}>
                  {t === 'b2b' ? 'B2B' : t === 'b2c_large' ? 'B2C Large' : t === 'b2c_small' ? 'B2C Small' :
                   t === 'nil_exempt' ? 'Nil/Exempt' : t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice details */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Invoice Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice Number">
                <Input value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)}
                  placeholder="INV-001" className={inputCls} />
              </Field>
              <Field label="Invoice Date">
                <Input type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)}
                  className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Party details */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Party Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Party Name">
                <Input value={form.partyName} onChange={(e) => set('partyName', e.target.value)}
                  placeholder="Customer / Vendor Name" className={inputCls} />
              </Field>
              <Field label="Party GSTIN">
                <Input value={form.partyGstin} onChange={(e) => set('partyGstin', e.target.value)}
                  placeholder="29AAAAA0000A1Z5" className={inputCls} />
              </Field>
              <Field label="Place of Supply">
                <Input value={form.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)}
                  placeholder="Karnataka (29)" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Tax amounts */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Tax Amounts (₹)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Taxable Value" required>
                <Input type="number" step="0.01" min="0" value={form.taxableValue}
                  onChange={(e) => set('taxableValue', e.target.value)}
                  placeholder="0.00" required className={inputCls} />
              </Field>
              <Field label="CGST Amount">
                <Input type="number" step="0.01" min="0" value={form.cgstAmount}
                  onChange={(e) => set('cgstAmount', e.target.value)}
                  placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="SGST Amount">
                <Input type="number" step="0.01" min="0" value={form.sgstAmount}
                  onChange={(e) => set('sgstAmount', e.target.value)}
                  placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="IGST Amount">
                <Input type="number" step="0.01" min="0" value={form.igstAmount}
                  onChange={(e) => set('igstAmount', e.target.value)}
                  placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="Cess Amount">
                <Input type="number" step="0.01" min="0" value={form.cessAmount}
                  onChange={(e) => set('cessAmount', e.target.value)}
                  placeholder="0.00" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              rows={2} placeholder="Optional notes…"
              className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]/50 placeholder:text-white/25 resize-none" />
          </Field>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.07] flex-shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}
            className="text-white/50 hover:text-white hover:bg-white/[0.05] h-8 text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 text-sm">
            {isSubmitting ? 'Adding…' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </div>
  );
}
