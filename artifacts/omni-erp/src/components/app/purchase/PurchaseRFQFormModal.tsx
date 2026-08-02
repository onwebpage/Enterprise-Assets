import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  RFQ_STATUSES, type PurchaseVendor, type PurchaseRFQ, type RFQFormValues, type RFQStatus,
} from '@/hooks/usePurchase';

const schema = z.object({
  vendorId:         z.number().int().positive().nullable().optional(),
  rfqDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  dueDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('')),
  itemsDescription: z.string().max(2000).nullable().optional(),
  estimatedValue:   z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional().or(z.literal('')),
  status:           z.enum(RFQ_STATUSES),
  notes:            z.string().max(1000).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const lbl = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inp = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const err = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<RFQStatus, string> = {
  draft:     'border-white/[0.12] bg-white/[0.04] text-white/40',
  sent:      'border-blue-500/30 bg-blue-500/10 text-blue-400',
  responded: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  converted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  cancelled: 'border-red-500/30 bg-red-500/10 text-red-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: RFQFormValues) => Promise<void>;
  isSubmitting: boolean;
  rfq?: PurchaseRFQ | null;
  vendors: PurchaseVendor[];
  error?: string | null;
}

export default function PurchaseRFQFormModal({ open, onClose, onSubmit, isSubmitting, rfq, vendors, error }: Props) {
  const isEdit = !!rfq;
  const today  = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorId: null, rfqDate: today, dueDate: '', itemsDescription: '',
      estimatedValue: '', status: 'draft', notes: '',
    },
  });

  const watchedStatus = watch('status');

  useEffect(() => {
    if (!open) return;
    if (rfq) {
      reset({
        vendorId: rfq.vendorId ?? null,
        rfqDate: rfq.rfqDate, dueDate: rfq.dueDate ?? '',
        itemsDescription: rfq.itemsDescription ?? '',
        estimatedValue: rfq.estimatedValue ?? '',
        status: rfq.status as RFQStatus, notes: rfq.notes ?? '',
      });
    } else {
      reset({ vendorId: null, rfqDate: today, dueDate: '', itemsDescription: '', estimatedValue: '', status: 'draft', notes: '' });
    }
  }, [open, rfq]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1424] border border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">{isEdit ? 'Edit RFQ' : 'New Request for Quotation'}</DialogTitle>
            <DialogClose className="text-white/30 hover:text-white/70"><X className="w-4 h-4" /></DialogClose>
          </div>
        </DialogHeader>

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className={lbl}>Vendor</label>
            <select
              value={watch('vendorId') ?? ''}
              onChange={(e) => setValue('vendorId', e.target.value ? parseInt(e.target.value) : null)}
              className={cn('w-full rounded-md border px-3 h-9 text-sm', inp, 'bg-[#0a0f1e]')}>
              <option value="" className="bg-[#0d1424]">— No vendor selected —</option>
              {vendors.map((v) => <option key={v.id} value={v.id} className="bg-[#0d1424]">{v.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>RFQ Date <span className="text-red-400">*</span></label>
              <Input {...register('rfqDate')} type="date" className={inp} />
              {errors.rfqDate && <p className={err}>{errors.rfqDate.message}</p>}
            </div>
            <div>
              <label className={lbl}>Response Due Date</label>
              <Input {...register('dueDate')} type="date" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Items Description</label>
            <textarea {...register('itemsDescription')} rows={3}
              placeholder="Describe the items/services you want quotations for…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inp)} />
          </div>

          <div>
            <label className={lbl}>Estimated Value (₹)</label>
            <Input {...register('estimatedValue')} placeholder="0.00" className={inp} />
          </div>

          <div>
            <label className={lbl}>Status</label>
            <div className="flex flex-wrap gap-2">
              {RFQ_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setValue('status', s)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                    watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                  {s}
                </button>
              ))}
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
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[110px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create RFQ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
