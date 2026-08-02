import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TAX_RATE_TYPES, type TaxRate, type TaxRateFormValues, type TaxRateType } from '@/hooks/useGST';

const schema = z.object({
  name:        z.string().min(1, 'Name is required').max(200),
  type:        z.enum(TAX_RATE_TYPES),
  rate:        z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid percentage'),
  hsnSacCode:  z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive:    z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const TYPE_LABELS: Record<TaxRateType, string> = {
  cgst: 'CGST', sgst: 'SGST', igst: 'IGST', utgst: 'UTGST',
  cess: 'Cess', vat: 'VAT', service_tax: 'Service Tax', other: 'Other',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaxRateFormValues) => Promise<void>;
  isSubmitting: boolean;
  taxRate?: TaxRate | null;
  error?: string | null;
}

export default function TaxRateFormModal({ open, onClose, onSubmit, isSubmitting, taxRate, error }: Props) {
  const isEdit = !!taxRate;
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'cgst', rate: '0', hsnSacCode: '', description: '', isActive: true },
  });

  const watchedType    = watch('type');
  const watchedActive  = watch('isActive');

  useEffect(() => {
    if (open) {
      reset(taxRate
        ? { name: taxRate.name, type: taxRate.type, rate: taxRate.rate, hsnSacCode: taxRate.hsnSacCode ?? '', description: taxRate.description ?? '', isActive: taxRate.isActive }
        : { name: '', type: 'cgst', rate: '0', hsnSacCode: '', description: '', isActive: true });
    }
  }, [open, taxRate, reset]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      hsnSacCode:  values.hsnSacCode  || null,
      description: values.description || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit Tax Rate' : 'New Tax Rate'}
          </DialogTitle>
          <DialogClose asChild>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className={labelCls}>Rate Name *</label>
            <Input {...register('name')} placeholder="e.g. CGST 9%" className={inputCls} />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tax Type *</label>
              <select {...register('type')} className={cn('w-full rounded-md border px-3 h-9 text-sm appearance-none', inputCls)}>
                {TAX_RATE_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#0d1225]">{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Rate (%) *</label>
              <Input {...register('rate')} placeholder="e.g. 9" className={inputCls} />
              {errors.rate && <p className={errorCls}>{errors.rate.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>HSN / SAC Code</label>
            <Input {...register('hsnSacCode')} placeholder="e.g. 9954" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea {...register('description')} rows={2} placeholder="Short description of when this rate applies…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inputCls)} />
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <div className="flex items-center gap-2">
              {([true, false] as boolean[]).map((v) => (
                <button key={String(v)} type="button" onClick={() => setValue('isActive', v)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                    watchedActive === v
                      ? v ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                  {v ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[110px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Rate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
