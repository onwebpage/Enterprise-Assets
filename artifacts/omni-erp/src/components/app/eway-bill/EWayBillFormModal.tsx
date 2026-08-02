import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  type EWayBill, type EWayBillFormValues,
  SUPPLY_TYPES, SUPPLY_TYPE_LABELS,
  SUPPLY_SUB_TYPES, SUPPLY_SUB_TYPE_LABELS,
  DOC_TYPES, DOC_TYPE_LABELS,
  TRANSPORT_MODES, TRANSPORT_MODE_LABELS,
} from '@/hooks/useEWayBill';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EWayBillFormValues) => Promise<void>;
  isSubmitting?: boolean;
  bill?: EWayBill | null;
  error?: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

const BLANK: EWayBillFormValues = {
  supplyType:    'outward',
  supplySubType: 'supply',
  docType:       'tax_invoice',
  docNumber:     '',
  docDate:       today(),
  fromTradeName: '',
  toTradeName:   '',
  productName:   '',
  quantity:      '1',
  totalValue:    '',
  taxableValue:  '',
  cgstRate:      '0',
  sgstRate:      '0',
  igstRate:      '0',
  cessRate:      '0',
  transportMode: 'road',
};

function fromBill(b: EWayBill): EWayBillFormValues {
  return {
    supplyType:      b.supplyType,
    supplySubType:   b.supplySubType,
    docType:         b.docType,
    docNumber:       b.docNumber,
    docDate:         b.docDate,
    fromGstin:       b.fromGstin,
    fromTradeName:   b.fromTradeName,
    fromAddress1:    b.fromAddress1,
    fromAddress2:    b.fromAddress2,
    fromPlace:       b.fromPlace,
    fromPincode:     b.fromPincode,
    fromState:       b.fromState,
    toGstin:         b.toGstin,
    toTradeName:     b.toTradeName,
    toAddress1:      b.toAddress1,
    toAddress2:      b.toAddress2,
    toPlace:         b.toPlace,
    toPincode:       b.toPincode,
    toState:         b.toState,
    placeOfDelivery: b.placeOfDelivery,
    productName:     b.productName,
    productDesc:     b.productDesc,
    hsnCode:         b.hsnCode,
    quantity:        b.quantity,
    unit:            b.unit,
    totalValue:      b.totalValue,
    taxableValue:    b.taxableValue,
    cgstRate:        b.cgstRate,
    sgstRate:        b.sgstRate,
    igstRate:        b.igstRate,
    cessRate:        b.cessRate,
    transportMode:   b.transportMode,
    transporterId:   b.transporterId,
    transporterName: b.transporterName,
    vehicleNumber:   b.vehicleNumber,
    vehicleType:     (b.vehicleType ?? 'regular') as any,
    distance:        b.distance,
    notes:           b.notes,
  };
}

// ── Section heading ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest border-b border-white/[0.06] pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
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

const inputCls = "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 h-8 text-sm focus:border-[#2563EB]/50";

function SelectField({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-md px-3 h-8 focus:outline-none focus:border-[#2563EB]/50 [&>option]:bg-[#0a0f1e]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function EWayBillFormModal({ open, onClose, onSubmit, isSubmitting, bill, error }: Props) {
  const [form, setForm] = useState<EWayBillFormValues>(BLANK);

  useEffect(() => {
    if (open) setForm(bill ? fromBill(bill) : BLANK);
  }, [open, bill]);

  if (!open) return null;

  const set = (key: keyof EWayBillFormValues, value: any) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  const isEdit = !!bill;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit E-Way Bill' : 'New E-Way Bill'}</h2>
            <p className="text-xs text-white/35 mt-0.5">Fill in goods movement details</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Supply Details */}
          <Section title="Supply Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Supply Type" required>
                <SelectField value={form.supplyType ?? 'outward'} onChange={(v) => set('supplyType', v)}
                  options={SUPPLY_TYPES.map((t) => ({ value: t, label: SUPPLY_TYPE_LABELS[t] }))} />
              </Field>
              <Field label="Sub Type" required>
                <SelectField value={form.supplySubType ?? 'supply'} onChange={(v) => set('supplySubType', v)}
                  options={SUPPLY_SUB_TYPES.map((t) => ({ value: t, label: SUPPLY_SUB_TYPE_LABELS[t] }))} />
              </Field>
              <Field label="Document Type" required>
                <SelectField value={form.docType ?? 'tax_invoice'} onChange={(v) => set('docType', v)}
                  options={DOC_TYPES.map((t) => ({ value: t, label: DOC_TYPE_LABELS[t] }))} />
              </Field>
              <Field label="Document Number" required>
                <Input value={form.docNumber} onChange={(e) => set('docNumber', e.target.value)}
                  placeholder="INV-001" required className={inputCls} />
              </Field>
              <Field label="Document Date" required>
                <Input type="date" value={form.docDate} onChange={(e) => set('docDate', e.target.value)}
                  required className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* From / Consignor */}
          <Section title="From Party (Consignor / Shipper)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Trade Name" required>
                <Input value={form.fromTradeName} onChange={(e) => set('fromTradeName', e.target.value)}
                  placeholder="Company Name" required className={inputCls} />
              </Field>
              <Field label="GSTIN">
                <Input value={form.fromGstin ?? ''} onChange={(e) => set('fromGstin', e.target.value || null)}
                  placeholder="29AAAAA0000A1Z5" className={inputCls} />
              </Field>
              <Field label="Address Line 1">
                <Input value={form.fromAddress1 ?? ''} onChange={(e) => set('fromAddress1', e.target.value || null)}
                  placeholder="Street / Plot" className={inputCls} />
              </Field>
              <Field label="Address Line 2">
                <Input value={form.fromAddress2 ?? ''} onChange={(e) => set('fromAddress2', e.target.value || null)}
                  placeholder="Area / Landmark" className={inputCls} />
              </Field>
              <Field label="Place">
                <Input value={form.fromPlace ?? ''} onChange={(e) => set('fromPlace', e.target.value || null)}
                  placeholder="City / Town" className={inputCls} />
              </Field>
              <Field label="State">
                <Input value={form.fromState ?? ''} onChange={(e) => set('fromState', e.target.value || null)}
                  placeholder="Maharashtra" className={inputCls} />
              </Field>
              <Field label="Pincode">
                <Input value={form.fromPincode ?? ''} onChange={(e) => set('fromPincode', e.target.value || null)}
                  placeholder="400001" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* To / Consignee */}
          <Section title="To Party (Consignee / Recipient)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Trade Name" required>
                <Input value={form.toTradeName} onChange={(e) => set('toTradeName', e.target.value)}
                  placeholder="Company Name" required className={inputCls} />
              </Field>
              <Field label="GSTIN">
                <Input value={form.toGstin ?? ''} onChange={(e) => set('toGstin', e.target.value || null)}
                  placeholder="29AAAAA0000A1Z5" className={inputCls} />
              </Field>
              <Field label="Address Line 1">
                <Input value={form.toAddress1 ?? ''} onChange={(e) => set('toAddress1', e.target.value || null)}
                  placeholder="Street / Plot" className={inputCls} />
              </Field>
              <Field label="Address Line 2">
                <Input value={form.toAddress2 ?? ''} onChange={(e) => set('toAddress2', e.target.value || null)}
                  placeholder="Area / Landmark" className={inputCls} />
              </Field>
              <Field label="Place">
                <Input value={form.toPlace ?? ''} onChange={(e) => set('toPlace', e.target.value || null)}
                  placeholder="City / Town" className={inputCls} />
              </Field>
              <Field label="State">
                <Input value={form.toState ?? ''} onChange={(e) => set('toState', e.target.value || null)}
                  placeholder="Karnataka" className={inputCls} />
              </Field>
              <Field label="Pincode">
                <Input value={form.toPincode ?? ''} onChange={(e) => set('toPincode', e.target.value || null)}
                  placeholder="560001" className={inputCls} />
              </Field>
              <Field label="Place of Delivery">
                <Input value={form.placeOfDelivery ?? ''} onChange={(e) => set('placeOfDelivery', e.target.value || null)}
                  placeholder="Final delivery location" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Goods */}
          <Section title="Goods Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Product Name" required>
                <Input value={form.productName} onChange={(e) => set('productName', e.target.value)}
                  placeholder="Product / commodity name" required className={inputCls} />
              </Field>
              <Field label="HSN Code">
                <Input value={form.hsnCode ?? ''} onChange={(e) => set('hsnCode', e.target.value || null)}
                  placeholder="e.g. 8471" className={inputCls} />
              </Field>
              <Field label="Description">
                <Input value={form.productDesc ?? ''} onChange={(e) => set('productDesc', e.target.value || null)}
                  placeholder="Brief description" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Quantity">
                  <Input type="number" step="0.0001" min="0" value={form.quantity ?? '1'}
                    onChange={(e) => set('quantity', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Unit">
                  <Input value={form.unit ?? ''} onChange={(e) => set('unit', e.target.value || null)}
                    placeholder="NOS / KGS" className={inputCls} />
                </Field>
              </div>
            </div>
          </Section>

          {/* Values */}
          <Section title="Values & Tax">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Total Value (₹)" required>
                <Input type="number" step="0.01" min="0" value={form.totalValue}
                  onChange={(e) => set('totalValue', e.target.value)} required placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="Taxable Value (₹)" required>
                <Input type="number" step="0.01" min="0" value={form.taxableValue}
                  onChange={(e) => set('taxableValue', e.target.value)} required placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="CGST Rate (%)">
                <Input type="number" step="0.01" min="0" value={form.cgstRate ?? '0'}
                  onChange={(e) => set('cgstRate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="SGST Rate (%)">
                <Input type="number" step="0.01" min="0" value={form.sgstRate ?? '0'}
                  onChange={(e) => set('sgstRate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="IGST Rate (%)">
                <Input type="number" step="0.01" min="0" value={form.igstRate ?? '0'}
                  onChange={(e) => set('igstRate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Cess Rate (%)">
                <Input type="number" step="0.01" min="0" value={form.cessRate ?? '0'}
                  onChange={(e) => set('cessRate', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Transport */}
          <Section title="Transport Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Transport Mode">
                <SelectField value={form.transportMode ?? 'road'} onChange={(v) => set('transportMode', v)}
                  options={TRANSPORT_MODES.map((t) => ({ value: t, label: TRANSPORT_MODE_LABELS[t] }))} />
              </Field>
              <Field label="Vehicle Number">
                <Input value={form.vehicleNumber ?? ''} onChange={(e) => set('vehicleNumber', e.target.value || null)}
                  placeholder="MH01AB1234" className={inputCls} />
              </Field>
              <Field label="Distance (km)">
                <Input type="number" min="0" value={form.distance ?? ''}
                  onChange={(e) => set('distance', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="500" className={inputCls} />
              </Field>
              <Field label="Transporter Name">
                <Input value={form.transporterName ?? ''} onChange={(e) => set('transporterName', e.target.value || null)}
                  placeholder="Transporter company" className={inputCls} />
              </Field>
              <Field label="Transporter ID (GSTIN)">
                <Input value={form.transporterId ?? ''} onChange={(e) => set('transporterId', e.target.value || null)}
                  placeholder="29AAAAA0000A1Z5" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Notes */}
          <Section title="Additional Notes">
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || null)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]/50 placeholder:text-white/25 resize-none"
            />
          </Section>

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
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 text-sm">
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Bill'}
          </Button>
        </div>
      </div>
    </div>
  );
}
