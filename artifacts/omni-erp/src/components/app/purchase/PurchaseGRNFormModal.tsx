import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  GRN_STATUSES, type PurchaseOrder, type GRNFormValues, type GRNStatus,
} from '@/hooks/usePurchase';

const lineSchema = z.object({
  poLineId:    z.number().int().positive(),
  description: z.string().min(1),
  orderedQty:  z.string(),
  receivedQty: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid'),
  acceptedQty: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid'),
  rejectedQty: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid'),
  unit:        z.string().max(50).optional(),
  notes:       z.string().max(500).nullable().optional(),
  sequence:    z.number().int().optional(),
});

const schema = z.object({
  poId:        z.number().int().positive(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  status:      z.enum(GRN_STATUSES),
  notes:       z.string().max(1000).nullable().optional(),
  lines:       z.array(lineSchema).min(1),
});
type FormValues = z.infer<typeof schema>;

const lbl = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inp = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const err = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<GRNStatus, string> = {
  draft:    'border-white/[0.12] bg-white/[0.04] text-white/40',
  received: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  rejected: 'border-red-500/30 bg-red-500/10 text-red-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: GRNFormValues) => Promise<void>;
  isSubmitting: boolean;
  order: PurchaseOrder | null;
  error?: string | null;
}

export default function PurchaseGRNFormModal({ open, onClose, onSubmit, isSubmitting, order, error }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { poId: 0, receiptDate: today, status: 'received', notes: '', lines: [] },
  });

  const { fields } = useFieldArray({ control, name: 'lines' });
  const watchedStatus = watch('status');

  useEffect(() => {
    if (!open || !order) return;
    const lines = (order.lines ?? []).map((l, i) => ({
      poLineId:    l.id,
      description: l.description,
      orderedQty:  l.quantity,
      receivedQty: l.quantity,  // default to full qty
      acceptedQty: l.quantity,
      rejectedQty: '0',
      unit:        l.unit,
      notes:       '',
      sequence:    i,
    }));
    reset({ poId: order.id, receiptDate: today, status: 'received', notes: '', lines });
  }, [open, order]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1424] border border-white/[0.08] text-white max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Goods Receipt — {order.poNumber}</DialogTitle>
            <DialogClose className="text-white/30 hover:text-white/70"><X className="w-4 h-4" /></DialogClose>
          </div>
          <p className="text-xs text-white/40 mt-1">Vendor: {order.vendorName}</p>
        </DialogHeader>

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Receipt Date <span className="text-red-400">*</span></label>
              <Input {...register('receiptDate')} type="date" className={inp} />
              {errors.receiptDate && <p className={err}>{errors.receiptDate.message}</p>}
            </div>
            <div>
              <label className={lbl}>Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {GRN_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setValue('status', s)}
                    className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                      watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lines */}
          <div>
            <label className={lbl}>Receipt Lines</label>
            <div className="rounded-xl border border-white/[0.07] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    {['Item', 'Ordered', 'Received', 'Accepted', 'Rejected'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => (
                    <tr key={field.id} className="border-b border-white/[0.04]">
                      <td className="px-3 py-2 text-white/70 text-xs">{(order.lines ?? [])[idx]?.description}</td>
                      <td className="px-3 py-2 text-white/40 tabular-nums text-xs">{(order.lines ?? [])[idx]?.quantity}</td>
                      <td className="px-2 py-2 w-24">
                        <Input {...register(`lines.${idx}.receivedQty`)} className={cn(inp, 'h-7')} />
                        {errors.lines?.[idx]?.receivedQty && <p className={err}>{errors.lines?.[idx]?.receivedQty?.message}</p>}
                      </td>
                      <td className="px-2 py-2 w-24">
                        <Input {...register(`lines.${idx}.acceptedQty`)} className={cn(inp, 'h-7')} />
                      </td>
                      <td className="px-2 py-2 w-24">
                        <Input {...register(`lines.${idx}.rejectedQty`)} className={cn(inp, 'h-7')} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Receiving notes, discrepancies…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inp)} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">Cancel</Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[120px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Record Receipt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
