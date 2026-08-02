import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TAX_PAYMENT_TYPES, TAX_PAYMENT_STATUSES, type TaxPayment, type TaxPaymentFormValues, type TaxPaymentStatus } from '@/hooks/useGST';

const amtStr = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount').optional().default('0');

const schema = z.object({
  paymentType:   z.enum(TAX_PAYMENT_TYPES),
  period:        z.string().min(1, 'Period is required').max(20),
  paymentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  amount:        z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount'),
  cgst:          amtStr,
  sgst:          amtStr,
  igst:          amtStr,
  cess:          amtStr,
  interest:      amtStr,
  penalty:       amtStr,
  challanNumber: z.string().max(100).nullable().optional(),
  bankReference: z.string().max(200).nullable().optional(),
  status:        z.enum(TAX_PAYMENT_STATUSES),
  notes:         z.string().max(1000).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  gst: 'GST', tds: 'TDS', tcs: 'TCS', advance_tax: 'Advance Tax', self_assessment: 'Self Assessment',
};

const STATUS_COLORS: Record<TaxPaymentStatus, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  paid:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  failed:  'border-red-500/30 bg-red-500/10 text-red-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaxPaymentFormValues) => Promise<void>;
  isSubmitting: boolean;
  payment?: TaxPayment | null;
  error?: string | null;
}

export default function TaxPaymentFormModal({ open, onClose, onSubmit, isSubmitting, payment, error }: Props) {
  const isEdit = !!payment;
  const today  = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentType: 'gst', period: '', paymentDate: today,
      amount: '0', cgst: '0', sgst: '0', igst: '0', cess: '0',
      interest: '0', penalty: '0', challanNumber: '', bankReference: '',
      status: 'pending', notes: '',
    },
  });

  const watchedStatus      = watch('status');
  const watchedPaymentType = watch('paymentType');

  useEffect(() => {
    if (open) {
      reset(payment ? {
        paymentType: payment.paymentType, period: payment.period, paymentDate: payment.paymentDate,
        amount: payment.amount, cgst: payment.cgst, sgst: payment.sgst,
        igst: payment.igst, cess: payment.cess, interest: payment.interest, penalty: payment.penalty,
        challanNumber: payment.challanNumber ?? '', bankReference: payment.bankReference ?? '',
        status: payment.status, notes: payment.notes ?? '',
      } : {
        paymentType: 'gst', period: '', paymentDate: today,
        amount: '0', cgst: '0', sgst: '0', igst: '0', cess: '0',
        interest: '0', penalty: '0', challanNumber: '', bankReference: '',
        status: 'pending', notes: '',
      });
    }
  }, [open, payment, reset, today]);

  const showGstBreakdown = watchedPaymentType === 'gst';

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      challanNumber: values.challanNumber || null,
      bankReference: values.bankReference || null,
      notes:         values.notes         || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit Tax Payment' : 'Record Tax Payment'}
          </DialogTitle>
          <DialogClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className={labelCls}>Payment Type *</label>
            <div className="flex flex-wrap gap-1.5">
              {TAX_PAYMENT_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setValue('paymentType', t)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                    watchedPaymentType === t
                      ? 'border-[#2563EB]/50 bg-[#2563EB]/15 text-[#60a5fa]'
                      : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/60')}>
                  {PAYMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Period *</label>
              <Input {...register('period')} placeholder="YYYY-MM" className={inputCls} />
              {errors.period && <p className={errorCls}>{errors.period.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Payment Date *</label>
              <Input {...register('paymentDate')} type="date" className={inputCls} />
              {errors.paymentDate && <p className={errorCls}>{errors.paymentDate.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Total Amount *</label>
            <Input {...register('amount')} placeholder="0.00" className={inputCls} />
            {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
          </div>

          {showGstBreakdown && (
            <div className="border border-white/[0.06] rounded-lg p-3 space-y-3">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wide">GST Breakdown (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                {([['cgst', 'CGST'], ['sgst', 'SGST'], ['igst', 'IGST'], ['cess', 'Cess']] as const).map(([field, label]) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <Input {...register(field)} placeholder="0.00" className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Interest</label>
              <Input {...register('interest')} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Penalty</label>
              <Input {...register('penalty')} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Challan Number</label>
              <Input {...register('challanNumber')} placeholder="CIN / ARN" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bank Reference</label>
              <Input {...register('bankReference')} placeholder="Transaction ID" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <div className="flex gap-2">
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
