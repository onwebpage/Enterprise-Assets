import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  PURCHASE_ORDER_STATUSES,
  type PurchaseVendor, type PurchaseOrder, type PurchaseOrderFormValues,
  type PurchaseOrderStatus,
} from '@/hooks/usePurchase';

const lineSchema = z.object({
  itemCode:    z.string().max(100).optional(),
  description: z.string().min(1, 'Required'),
  unit:        z.string().max(50).optional(),
  quantity:    z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid qty'),
  unitPrice:   z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price'),
  taxRate:     z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
});

const schema = z.object({
  vendorId:         z.number({ required_error: 'Vendor is required' }).int().positive(),
  orderDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  expectedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('')),
  deliveryAddress:  z.string().max(500).nullable().optional(),
  currency:         z.string().max(10).optional(),
  status:           z.enum(PURCHASE_ORDER_STATUSES),
  taxAmount:        z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes:            z.string().max(1000).nullable().optional(),
  lines:            z.array(lineSchema).min(1, 'At least 1 line required'),
});
type FormValues = z.infer<typeof schema>;

const lbl = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inp = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const err = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft:     'border-white/[0.12] bg-white/[0.04] text-white/40',
  sent:      'border-blue-500/30 bg-blue-500/10 text-blue-400',
  confirmed: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  partial:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
  received:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  cancelled: 'border-red-500/30 bg-red-500/10 text-red-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: PurchaseOrderFormValues) => Promise<void>;
  isSubmitting: boolean;
  order?: PurchaseOrder | null;
  vendors: PurchaseVendor[];
  error?: string | null;
}

export default function PurchaseOrderFormModal({ open, onClose, onSubmit, isSubmitting, order, vendors, error }: Props) {
  const isEdit = !!order;
  const today  = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorId: undefined, orderDate: today, expectedDelivery: '', deliveryAddress: '',
      currency: 'INR', status: 'draft', taxAmount: '0', notes: '',
      lines: [{ itemCode: '', description: '', unit: 'pcs', quantity: '1', unitPrice: '0', taxRate: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedStatus = watch('status');
  const watchedLines  = watch('lines');

  // Live totals
  const subtotal = watchedLines?.reduce((sum, l) => {
    const qty = parseFloat(l.quantity || '0');
    const price = parseFloat(l.unitPrice || '0');
    return sum + qty * price;
  }, 0) ?? 0;
  const taxAmt = parseFloat(watch('taxAmount') || '0');
  const total  = subtotal + taxAmt;

  useEffect(() => {
    if (!open) return;
    if (order) {
      reset({
        vendorId: order.vendorId, orderDate: order.orderDate,
        expectedDelivery: order.expectedDelivery ?? '',
        deliveryAddress: order.deliveryAddress ?? '',
        currency: order.currency ?? 'INR',
        status: order.status as PurchaseOrderStatus,
        taxAmount: order.taxAmount ?? '0',
        notes: order.notes ?? '',
        lines: (order.lines ?? []).map((l) => ({
          itemCode: l.itemCode ?? '', description: l.description,
          unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate ?? '0',
        })),
      });
    } else {
      reset({
        vendorId: undefined, orderDate: today, expectedDelivery: '', deliveryAddress: '',
        currency: 'INR', status: 'draft', taxAmount: '0', notes: '',
        lines: [{ itemCode: '', description: '', unit: 'pcs', quantity: '1', unitPrice: '0', taxRate: '0' }],
      });
    }
  }, [open, order]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1424] border border-white/[0.08] text-white max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">{isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
            <DialogClose className="text-white/30 hover:text-white/70"><X className="w-4 h-4" /></DialogClose>
          </div>
        </DialogHeader>

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 pt-2">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Vendor <span className="text-red-400">*</span></label>
              <select
                value={watch('vendorId') ?? ''}
                onChange={(e) => setValue('vendorId', parseInt(e.target.value))}
                className={cn('w-full rounded-md border px-3 h-9 text-sm', inp, 'bg-[#0a0f1e]')}>
                <option value="" className="bg-[#0d1424]">— Select vendor —</option>
                {vendors.map((v) => <option key={v.id} value={v.id} className="bg-[#0d1424]">{v.name}</option>)}
              </select>
              {errors.vendorId && <p className={err}>{errors.vendorId.message}</p>}
            </div>
            <div>
              <label className={lbl}>Order Date <span className="text-red-400">*</span></label>
              <Input {...register('orderDate')} type="date" className={inp} />
              {errors.orderDate && <p className={err}>{errors.orderDate.message}</p>}
            </div>
            <div>
              <label className={lbl}>Expected Delivery</label>
              <Input {...register('expectedDelivery')} type="date" className={inp} />
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <Input {...register('currency')} placeholder="INR" className={inp} />
            </div>
            <div>
              <label className={lbl}>Delivery Address</label>
              <Input {...register('deliveryAddress')} placeholder="Delivery location" className={inp} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <div className="flex flex-wrap gap-2">
              {PURCHASE_ORDER_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setValue('status', s)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                    watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl}>Line Items <span className="text-red-400">*</span></label>
              <button type="button" onClick={() => append({ itemCode: '', description: '', unit: 'pcs', quantity: '1', unitPrice: '0', taxRate: '0' })}
                className="flex items-center gap-1 text-xs text-[#60a5fa] hover:text-[#93c5fd] transition-colors">
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>
            <div className="rounded-xl border border-white/[0.07] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    {['Description', 'Unit', 'Qty', 'Unit Price', 'Tax %', 'Amount', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const qty   = parseFloat(watchedLines?.[idx]?.quantity  || '0');
                    const price = parseFloat(watchedLines?.[idx]?.unitPrice || '0');
                    const lineAmt = (qty * price).toFixed(2);
                    return (
                      <tr key={field.id} className="border-b border-white/[0.04]">
                        <td className="px-2 py-2 min-w-[180px]">
                          <Input {...register(`lines.${idx}.description`)} placeholder="Description" className={cn(inp, 'h-7 text-xs')} />
                          {errors.lines?.[idx]?.description && <p className={err}>{errors.lines?.[idx]?.description?.message}</p>}
                        </td>
                        <td className="px-2 py-2 w-16">
                          <Input {...register(`lines.${idx}.unit`)} placeholder="pcs" className={cn(inp, 'h-7 text-xs')} />
                        </td>
                        <td className="px-2 py-2 w-20">
                          <Input {...register(`lines.${idx}.quantity`)} placeholder="1" className={cn(inp, 'h-7 text-xs')} />
                          {errors.lines?.[idx]?.quantity && <p className={err}>{errors.lines?.[idx]?.quantity?.message}</p>}
                        </td>
                        <td className="px-2 py-2 w-28">
                          <Input {...register(`lines.${idx}.unitPrice`)} placeholder="0.00" className={cn(inp, 'h-7 text-xs')} />
                          {errors.lines?.[idx]?.unitPrice && <p className={err}>{errors.lines?.[idx]?.unitPrice?.message}</p>}
                        </td>
                        <td className="px-2 py-2 w-16">
                          <Input {...register(`lines.${idx}.taxRate`)} placeholder="0" className={cn(inp, 'h-7 text-xs')} />
                        </td>
                        <td className="px-2 py-2 w-24 text-right text-white/60 tabular-nums">₹{lineAmt}</td>
                        <td className="px-2 py-2 w-8">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)}
                              className="p-1 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors">
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
            {errors.lines?.root && <p className={err}>{errors.lines.root.message}</p>}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={lbl}>Additional Tax / Charges (₹)</label>
              <Input {...register('taxAmount')} placeholder="0.00" className={inp} />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-xs text-white/50">
                <span>Subtotal</span><span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Tax/Charges</span><span className="tabular-nums">₹{taxAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/[0.06]">
                <span>Total</span><span className="tabular-nums">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Internal notes…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inp)} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">Cancel</Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[120px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create PO'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
