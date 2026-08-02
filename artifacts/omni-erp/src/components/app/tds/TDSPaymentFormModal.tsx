import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TAX_PAYMENT_STATUSES, type TDSPayment, type TDSPaymentFormValues, type TaxPaymentStatus } from '@/hooks/useTDS';

const schema = z.object({
  paymentType:   z.enum(['tds', 'tcs']),
  period:        z.string().min(1, 'Period is required').max(20),
  paymentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  amount:        z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount'),
  interest:      z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0'),
  penalty:       z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0'),
  challanNumber: z.string().max(100).nullable().optional(),
  bankReference: z.string().max(200).nullable().optional(),
  status:        z.enum(TAX_PAYMENT_STATUSES),
  notes:         z.string().max(1000).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<TaxPaymentStatus, string> = {
  pending: 'border-white/[0.12] bg-white/[0.04] text-white/40',
  paid:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  failed:  'border-red-500/30 bg-red-500/10 text-red-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TDSPaymentFormValues) => Promise<void>;
  isSubmitting: boolean;
  payment?: TDSPayment | null;
  error?: string | null;
}

export default function TDSPaymentFormModal({ open, onClose, onSubmit, isSubmitting, payment, error }: Props) {
  const isEdit = !!payment;
  const today  = new Date().toISOString().slice(0, 10);
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentType: 'tds', period: currentPeriod, paymentDate: today,
      amount: '0', interest: '0', penalty: '0',
      challanNumber: '', bankReference: '', status: 'pending', notes: '',
    },
  });

  const watchedStatus = watch('status');
  const watchedType   = watch('paymentType');

  useEffect(() => {
    if (open) {
      if (payment) {
        reset({
          paymentType: payment.paymentType, period: payment.period,
          paymentDate: payment.paymentDate, amount: payment.amount,
          interest: payment.interest ?? '0', penalty: payment.penalty ?? '0',
          challanNumber: payment.challanNumber ?? '', bankReference: payment.bankReference ?? '',
          status: payment.status, notes: payment.notes ?? '',
        });
      } else {
        reset({
          paymentType: 'tds', period: currentPeriod, paymentDate: today,
          amount: '0', interest: '0', penalty: '0',
          challanNumber: '', bankReference: '', status: 'pending', notes: '',
        });
      }
    }
  }, [open, payment]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1424] border border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-white">
              {isEdit ? 'Edit Challan Payment' : 'Record Challan Payment'}
            </DialogTitle>
            <DialogClose className="text-white/30 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Type */}
          <div>
            <label className={labelCls}>Payment Type</label>
            <div className="flex gap-2">
              {(['tds', 'tcs'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setValue('paymentType', t)}
                  className={cn(
                    'flex-1 py-2 rounded-lg border text-sm font-semibold uppercase tracking-wide transition-all',
                    watchedType === t
                      ? t === 'tds'
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                        : 'border-violet-500/40 bg-violet-500/10 text-violet-400'
                      : 'border-white/[0.07] bg-transparent text-white/30 hover:text-white/50',
                  )}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Period <span className="text-red-400">*</span></label>
              <Input {...register('period')} placeholder="YYYY-MM" className={inputCls} />
              {errors.period && <p className={errorCls}>{errors.period.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Payment Date <span className="text-red-400">*</span></label>
              <Input {...register('paymentDate')} type="date" className={inputCls} />
              {errors.paymentDate && <p className={errorCls}>{errors.paymentDate.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Amount (₹) <span className="text-red-400">*</span></label>
            <Input {...register('amount')} placeholder="0.00" className={inputCls} />
            {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Interest (₹)</label>
              <Input {...register('interest')} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Penalty (₹)</label>
              <Input {...register('penalty')} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Challan Number</label>
              <Input {...register('challanNumber')} placeholder="BSR/Seq" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bank Reference</label>
              <Input {...register('bankReference')} placeholder="UTR / Ref no." className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <div className="flex flex-wrap gap-2">
              {TAX_PAYMENT_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setValue('status', s)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                    watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Internal notes…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inputCls)} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[110px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
