import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { APBill, APBillFormValues, APBillStatus, APVendor } from '@/hooks/useAccountsPayable';
import { AP_BILL_STATUSES } from '@/hooks/useAccountsPayable';

const lineSchema = z.object({
  description: z.string().min(1, 'Description required').max(500),
  quantity:    z.string().regex(/^\d+(\.\d{1,4})?$/, 'Valid qty'),
  unitPrice:   z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid price'),
  sequence:    z.number().int().optional(),
});

const schema = z.object({
  vendorId:   z.number().int().positive('Vendor is required'),
  billNumber: z.string().max(50).optional().or(z.literal('')),
  issueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
  status:     z.enum(AP_BILL_STATUSES as unknown as [string, ...string[]]).optional(),
  taxAmount:  z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid amount').optional(),
  notes:      z.string().max(1000).nullable().optional(),
  lines:      z.array(lineSchema).min(1, 'At least 1 line required'),
});

type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<string, string> = {
  draft:    'border-white/[0.12] bg-white/[0.06] text-white/50',
  received: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  partial:  'border-amber-500/30 bg-amber-500/10 text-amber-400',
  paid:     'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  overdue:  'border-red-500/30 bg-red-500/10 text-red-400',
  void:     'border-white/[0.08] bg-transparent text-white/25',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: APBillFormValues) => Promise<void>;
  isSubmitting: boolean;
  bill?: APBill | null;
  vendors: APVendor[];
  error?: string | null;
}

export default function BillFormModal({ open, onClose, onSubmit, isSubmitting, bill, vendors, error }: Props) {
  const isEdit = !!bill;
  const today  = new Date().toISOString().slice(0, 10);
  const due30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorId: vendors[0]?.id ?? 0,
      billNumber: '',
      issueDate: today, dueDate: due30, status: 'draft', taxAmount: '0', notes: '',
      lines: [{ description: '', quantity: '1', unitPrice: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const watchedLines  = watch('lines');
  const watchedTax    = watch('taxAmount');
  const watchedStatus = watch('status');

  const subtotal    = (watchedLines ?? []).reduce((s, l) => s + (parseFloat(l.quantity || '0') * parseFloat(l.unitPrice || '0')), 0);
  const taxAmt      = parseFloat(watchedTax || '0');
  const totalAmount = subtotal + taxAmt;

  useEffect(() => {
    if (open) {
      if (bill) {
        reset({
          vendorId:   bill.vendorId,
          billNumber: bill.billNumber,
          issueDate:  bill.issueDate,
          dueDate:    bill.dueDate,
          status:     bill.status,
          taxAmount:  bill.taxAmount,
          notes:      bill.notes ?? '',
          lines: (bill.lines && bill.lines.length > 0)
            ? bill.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, sequence: l.sequence }))
            : [{ description: '', quantity: '1', unitPrice: '0' }],
        });
      } else {
        reset({
          vendorId: vendors[0]?.id ?? 0, billNumber: '', issueDate: today, dueDate: due30,
          status: 'draft', taxAmount: '0', notes: '',
          lines: [{ description: '', quantity: '1', unitPrice: '0' }],
        });
      }
    }
  }, [open, bill, vendors, reset, today, due30]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      vendorId:   Number(values.vendorId),
      billNumber: values.billNumber || undefined,
      status:     (values.status as APBillStatus) ?? 'draft',
      taxAmount:  values.taxAmount ?? '0',
      notes:      values.notes || null,
      lines:      values.lines.map((l, i) => ({ ...l, sequence: i })),
    });
  }

  const canEditLines = !isEdit || bill?.status === 'draft' || bill?.status === 'received';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? `Edit Bill ${bill!.billNumber}` : 'New Vendor Bill'}
          </DialogTitle>
          <DialogClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>}

          {/* Vendor + Bill # */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Vendor *</label>
              <select
                value={watch('vendorId')}
                onChange={(e) => setValue('vendorId', parseInt(e.target.value))}
                className={cn('w-full rounded-md border px-3 h-9 text-sm appearance-none', inputCls)}
              >
                <option value={0} className="bg-[#0d1225]">— Select vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#0d1225]">{v.name}</option>
                ))}
              </select>
              {errors.vendorId && <p className={errorCls}>{errors.vendorId.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Bill # <span className="text-white/25 normal-case font-normal">(auto if blank)</span></label>
              <Input {...register('billNumber')} placeholder="BILL-0001" className={inputCls} />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Issue Date *</label>
              <Input type="date" {...register('issueDate')} className={inputCls} />
              {errors.issueDate && <p className={errorCls}>{errors.issueDate.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Due Date *</label>
              <Input type="date" {...register('dueDate')} className={inputCls} />
              {errors.dueDate && <p className={errorCls}>{errors.dueDate.message}</p>}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <div className="flex flex-wrap gap-1.5">
              {(isEdit ? AP_BILL_STATUSES : (['draft', 'received'] as APBillStatus[])).map((s) => (
                <button key={s} type="button" onClick={() => setValue('status', s)}
                  className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                    watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Lines */}
          <div>
            <label className={labelCls}>Line Items</label>
            <div className="border border-white/[0.07] rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                {['Description', 'Qty', 'Unit Price', 'Amount', ''].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-white/30 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {fields.map((field, idx) => {
                const qty   = parseFloat(watchedLines?.[idx]?.quantity || '0');
                const price = parseFloat(watchedLines?.[idx]?.unitPrice || '0');
                const amt   = (qty * price).toFixed(2);
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 px-3 py-2 border-b border-white/[0.04] last:border-0 items-center">
                    <Input {...register(`lines.${idx}.description`)} placeholder="Item / service…"
                      disabled={!canEditLines}
                      className={cn(inputCls, 'h-8 text-xs', !canEditLines && 'opacity-50')} />
                    <Input {...register(`lines.${idx}.quantity`)} placeholder="1"
                      disabled={!canEditLines}
                      className={cn(inputCls, 'h-8 text-xs text-center', !canEditLines && 'opacity-50')} />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">₹</span>
                      <Input {...register(`lines.${idx}.unitPrice`)} placeholder="0.00"
                        disabled={!canEditLines}
                        className={cn(inputCls, 'h-8 text-xs pl-5', !canEditLines && 'opacity-50')} />
                    </div>
                    <span className="text-xs text-white/60 tabular-nums text-right">₹{amt}</span>
                    {canEditLines && fields.length > 1 ? (
                      <button type="button" onClick={() => remove(idx)}
                        className="p-1 rounded hover:bg-white/[0.07] text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : <span />}
                  </div>
                );
              })}
            </div>
            {errors.lines && <p className={errorCls}>{(errors.lines as any)?.message ?? 'Line item error'}</p>}
            {canEditLines && (
              <button type="button" onClick={() => append({ description: '', quantity: '1', unitPrice: '0' })}
                className="mt-2 flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-blue-400 transition-colors">
                <Plus className="w-3.5 h-3.5" />Add line
              </button>
            )}
          </div>

          {/* Tax + Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tax Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                <Input {...register('taxAmount')} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
              </div>
              {errors.taxAmount && <p className={errorCls}>{errors.taxAmount.message}</p>}
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-xs text-white/40">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>Tax</span>
                <span className="tabular-nums">₹{taxAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-white border-t border-white/[0.06] pt-1.5">
                <span>Total</span>
                <span className="tabular-nums">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes <span className="text-white/25 normal-case font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} placeholder="Payment terms, PO reference…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inputCls)} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[110px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Bill'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
