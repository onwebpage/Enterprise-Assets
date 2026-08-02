import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GST_RETURN_TYPES, GST_RETURN_STATUSES, type GSTReturn, type GSTReturnFormValues, type GSTReturnType, type GSTReturnStatus } from '@/hooks/useGST';

const amountPattern = /^\d+(\.\d{1,2})?$/;
const amtStr = z.string().regex(amountPattern, 'Must be a valid amount').optional().default('0');

const schema = z.object({
  returnType:        z.enum(GST_RETURN_TYPES),
  period:            z.string().min(4, 'Required').max(7),
  dueDate:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  submissionDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:            z.enum(GST_RETURN_STATUSES).optional(),
  gstin:             z.string().max(20).nullable().optional(),
  totalTaxableValue: amtStr,
  totalCgst:         amtStr,
  totalSgst:         amtStr,
  totalIgst:         amtStr,
  totalCess:         amtStr,
  totalItc:          amtStr,
  notes:             z.string().max(1000).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const RETURN_LABELS: Record<GSTReturnType, string> = {
  gstr1: 'GSTR-1 (Outward Supplies)',
  gstr3b: 'GSTR-3B (Monthly Return)',
  gstr9: 'GSTR-9 (Annual Return)',
  gstr2a: 'GSTR-2A (Inward Supplies)',
  gstr4: 'GSTR-4 (Composition)',
  gstr6: 'GSTR-6 (Input Service Distributor)',
};

const STATUS_COLORS: Record<GSTReturnStatus, string> = {
  draft:   'border-blue-500/30 bg-blue-500/10 text-blue-400',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  filed:   'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  overdue: 'border-red-500/30 bg-red-500/10 text-red-400',
  revised: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: GSTReturnFormValues) => Promise<void>;
  isSubmitting: boolean;
  gstReturn?: GSTReturn | null;
  error?: string | null;
}

export default function GSTReturnFormModal({ open, onClose, onSubmit, isSubmitting, gstReturn, error }: Props) {
  const isEdit = !!gstReturn;
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      returnType: 'gstr3b', period: '', dueDate: today,
      submissionDate: '', status: 'draft', gstin: '',
      totalTaxableValue: '0', totalCgst: '0', totalSgst: '0',
      totalIgst: '0', totalCess: '0', totalItc: '0', notes: '',
    },
  });

  const watchedStatus = watch('status');

  useEffect(() => {
    if (open) {
      reset(gstReturn ? {
        returnType: gstReturn.returnType, period: gstReturn.period, dueDate: gstReturn.dueDate,
        submissionDate: gstReturn.submissionDate ?? '', status: gstReturn.status,
        gstin: gstReturn.gstin ?? '',
        totalTaxableValue: gstReturn.totalTaxableValue, totalCgst: gstReturn.totalCgst,
        totalSgst: gstReturn.totalSgst, totalIgst: gstReturn.totalIgst, totalCess: gstReturn.totalCess,
        totalItc: gstReturn.totalItc, notes: gstReturn.notes ?? '',
      } : {
        returnType: 'gstr3b', period: '', dueDate: today,
        submissionDate: '', status: 'draft', gstin: '',
        totalTaxableValue: '0', totalCgst: '0', totalSgst: '0',
        totalIgst: '0', totalCess: '0', totalItc: '0', notes: '',
      });
    }
  }, [open, gstReturn, reset, today]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      submissionDate: values.submissionDate || null,
      gstin: values.gstin || null,
      notes: values.notes || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit GST Return' : 'New GST Return'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Return Type *</label>
              <select {...register('returnType')} className={cn('w-full rounded-md border px-3 h-9 text-sm appearance-none', inputCls)}>
                {GST_RETURN_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#0d1225]">{RETURN_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Period *</label>
              <Input {...register('period')} placeholder="YYYY-MM or YYYY" className={inputCls} />
              {errors.period && <p className={errorCls}>{errors.period.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Due Date *</label>
              <Input {...register('dueDate')} type="date" className={inputCls} />
              {errors.dueDate && <p className={errorCls}>{errors.dueDate.message}</p>}
            </div>
            <div>
              <label className={labelCls}>GSTIN</label>
              <Input {...register('gstin')} placeholder="27AABCA1234B1Z5" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <div className="flex flex-wrap items-center gap-2">
              {GST_RETURN_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setValue('status', s)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                    watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Tax Amounts</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { field: 'totalTaxableValue' as const, label: 'Taxable Value' },
                { field: 'totalCgst'         as const, label: 'Total CGST' },
                { field: 'totalSgst'         as const, label: 'Total SGST' },
                { field: 'totalIgst'         as const, label: 'Total IGST' },
                { field: 'totalCess'         as const, label: 'Total Cess' },
                { field: 'totalItc'          as const, label: 'Input Tax Credit' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className={labelCls}>{label}</label>
                  <Input {...register(field)} placeholder="0.00" className={inputCls} />
                </div>
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
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Return'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
