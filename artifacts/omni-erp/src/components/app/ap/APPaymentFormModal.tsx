import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { APPayment, APPaymentFormValues, APPaymentMethod, APBill } from '@/hooks/useAccountsPayable';
import { AP_PAYMENT_METHODS } from '@/hooks/useAccountsPayable';

const schema = z.object({
  billId:      z.number().int().positive('Bill is required'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date required'),
  amount:      z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid amount required'),
  method:      z.enum(['bank_transfer', 'check', 'cash', 'card', 'other'] as const).optional(),
  reference:   z.string().max(100).nullable().optional(),
  notes:       z.string().max(500).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const METHOD_LABELS: Record<APPaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: APPaymentFormValues) => Promise<void>;
  isSubmitting: boolean;
  payment?: APPayment | null;
  bills: APBill[];
  defaultBillId?: number;
  error?: string | null;
}

export default function APPaymentFormModal({ open, onClose, onSubmit, isSubmitting, payment, bills, defaultBillId, error }: Props) {
  const isEdit = !!payment;
  const today  = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { billId: defaultBillId ?? 0, paymentDate: today, amount: '', method: 'bank_transfer', reference: '', notes: '' },
  });

  const watchedMethod = watch('method');
  const watchedBill   = watch('billId');
  const selectedBill  = bills.find((b) => b.id === watchedBill);
  const remaining     = selectedBill
    ? (parseFloat(selectedBill.totalAmount) - parseFloat(selectedBill.amountPaid)).toFixed(2)
    : null;

  useEffect(() => {
    if (open) {
      reset(payment
        ? { billId: payment.billId, paymentDate: payment.paymentDate, amount: payment.amount, method: payment.method, reference: payment.reference ?? '', notes: payment.notes ?? '' }
        : { billId: defaultBillId ?? (bills[0]?.id ?? 0), paymentDate: today, amount: '', method: 'bank_transfer', reference: '', notes: '' });
    }
  }, [open, payment, defaultBillId, bills, reset, today]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({ ...values, reference: values.reference || null, notes: values.notes || null });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit Payment' : 'Record Payment'}
          </DialogTitle>
          <DialogClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>}

          {/* Bill selector */}
          <div>
            <label className={labelCls}>Bill *</label>
            <select
              value={watchedBill}
              onChange={(e) => setValue('billId', parseInt(e.target.value))}
              disabled={isEdit}
              className={cn('w-full rounded-md border px-3 h-9 text-sm appearance-none', inputCls, isEdit && 'opacity-50 cursor-not-allowed')}
            >
              <option value={0} className="bg-[#0d1225]">— Select bill —</option>
              {bills.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#0d1225]">
                  {b.billNumber} · {b.vendorName} · ₹{parseFloat(b.totalAmount).toLocaleString('en-IN')} (bal: ₹{(parseFloat(b.totalAmount) - parseFloat(b.amountPaid)).toFixed(2)})
                </option>
              ))}
            </select>
            {errors.billId && <p className={errorCls}>{errors.billId.message}</p>}
            {remaining && !isEdit && (
              <p className="text-[11px] text-white/35 mt-1">Remaining balance: <span className="text-white/60">₹{remaining}</span></p>
            )}
          </div>

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Payment Date *</label>
              <Input type="date" {...register('paymentDate')} className={inputCls} />
              {errors.paymentDate && <p className={errorCls}>{errors.paymentDate.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                <Input {...register('amount')} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
              </div>
              {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
            </div>
          </div>

          {/* Method */}
          <div>
            <label className={labelCls}>Payment Method</label>
            <div className="flex flex-wrap gap-1.5">
              {AP_PAYMENT_METHODS.map((m) => (
                <button key={m} type="button" onClick={() => setValue('method', m)}
                  className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                    watchedMethod === m
                      ? 'border-[#2563EB]/40 bg-[#2563EB]/15 text-[#60a5fa]'
                      : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Reference + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Reference <span className="text-white/25 normal-case font-normal">(optional)</span></label>
              <Input {...register('reference')} placeholder="TXN-12345" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes <span className="text-white/25 normal-case font-normal">(optional)</span></label>
              <Input {...register('notes')} placeholder="Notes…" className={inputCls} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[120px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
