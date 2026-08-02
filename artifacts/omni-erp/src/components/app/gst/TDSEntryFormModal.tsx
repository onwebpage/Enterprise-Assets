import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TDS_ENTRY_TYPES, TDS_STATUSES, type TDSEntry, type TDSEntryFormValues, type TDSStatus } from '@/hooks/useGST';

const TDS_SECTIONS = [
  '192', '193', '194', '194A', '194B', '194BB', '194C', '194D', '194DA',
  '194E', '194EE', '194F', '194G', '194H', '194I', '194IA', '194IB',
  '194J', '194K', '194LA', '194LB', '194LC', '194LD', '194N', '194O',
  '194P', '194Q', '194R', '194S', '206C',
];

const schema = z.object({
  entryType:       z.enum(TDS_ENTRY_TYPES),
  section:         z.string().min(1, 'Section is required').max(20),
  partyName:       z.string().min(1, 'Party name is required').max(300),
  partyPan:        z.string().max(20).nullable().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  grossAmount:     z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount'),
  taxRate:         z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid percentage'),
  depositDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  challanNumber:   z.string().max(100).nullable().optional(),
  assessmentYear:  z.string().max(10).nullable().optional(),
  status:          z.enum(TDS_STATUSES),
  notes:           z.string().max(1000).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<TDSStatus, string> = {
  deducted:  'border-blue-500/30 bg-blue-500/10 text-blue-400',
  deposited: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  filed:     'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  pending:   'border-white/[0.12] bg-white/[0.04] text-white/40',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TDSEntryFormValues) => Promise<void>;
  isSubmitting: boolean;
  entry?: TDSEntry | null;
  error?: string | null;
}

export default function TDSEntryFormModal({ open, onClose, onSubmit, isSubmitting, entry, error }: Props) {
  const isEdit = !!entry;
  const today  = new Date().toISOString().slice(0, 10);
  const [taxPreview, setTaxPreview] = useState({ taxAmount: '0.00', netAmount: '0.00' });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entryType: 'tds', section: '194C', partyName: '', partyPan: '',
      transactionDate: today, grossAmount: '0', taxRate: '2',
      depositDate: '', challanNumber: '', assessmentYear: '',
      status: 'deducted', notes: '',
    },
  });

  const watchedStatus = watch('status');
  const grossAmount   = watch('grossAmount');
  const taxRate       = watch('taxRate');

  useEffect(() => {
    const gross = parseFloat(grossAmount) || 0;
    const rate  = parseFloat(taxRate)    || 0;
    const tax   = (gross * rate) / 100;
    setTaxPreview({ taxAmount: tax.toFixed(2), netAmount: (gross - tax).toFixed(2) });
  }, [grossAmount, taxRate]);

  useEffect(() => {
    if (open) {
      reset(entry ? {
        entryType: entry.entryType, section: entry.section, partyName: entry.partyName,
        partyPan: entry.partyPan ?? '', transactionDate: entry.transactionDate,
        grossAmount: entry.grossAmount, taxRate: entry.taxRate,
        depositDate: entry.depositDate ?? '', challanNumber: entry.challanNumber ?? '',
        assessmentYear: entry.assessmentYear ?? '', status: entry.status, notes: entry.notes ?? '',
      } : {
        entryType: 'tds', section: '194C', partyName: '', partyPan: '',
        transactionDate: today, grossAmount: '0', taxRate: '2',
        depositDate: '', challanNumber: '', assessmentYear: '',
        status: 'deducted', notes: '',
      });
    }
  }, [open, entry, reset, today]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      partyPan:       values.partyPan       || null,
      depositDate:    values.depositDate    || null,
      challanNumber:  values.challanNumber  || null,
      assessmentYear: values.assessmentYear || null,
      notes:          values.notes          || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit TDS/TCS Entry' : 'New TDS/TCS Entry'}
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
              <label className={labelCls}>Type *</label>
              <div className="flex gap-2">
                {TDS_ENTRY_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setValue('entryType', t)}
                    className={cn('flex-1 px-3 py-2 rounded-lg border text-xs font-semibold uppercase transition-all',
                      watch('entryType') === t
                        ? 'border-[#2563EB]/50 bg-[#2563EB]/15 text-[#60a5fa]'
                        : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/60')}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Section *</label>
              <select {...register('section')} className={cn('w-full rounded-md border px-3 h-9 text-sm appearance-none', inputCls)}>
                {TDS_SECTIONS.map((s) => (
                  <option key={s} value={s} className="bg-[#0d1225]">{s}</option>
                ))}
              </select>
              {errors.section && <p className={errorCls}>{errors.section.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Party Name *</label>
              <Input {...register('partyName')} placeholder="Vendor / Payee name" className={inputCls} />
              {errors.partyName && <p className={errorCls}>{errors.partyName.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Party PAN</label>
              <Input {...register('partyPan')} placeholder="AABCA1234B" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Transaction Date *</label>
              <Input {...register('transactionDate')} type="date" className={inputCls} />
              {errors.transactionDate && <p className={errorCls}>{errors.transactionDate.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Assessment Year</label>
              <Input {...register('assessmentYear')} placeholder="2026-27" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Gross Amount *</label>
              <Input {...register('grossAmount')} placeholder="100000" className={inputCls} />
              {errors.grossAmount && <p className={errorCls}>{errors.grossAmount.message}</p>}
            </div>
            <div>
              <label className={labelCls}>TDS Rate (%) *</label>
              <Input {...register('taxRate')} placeholder="2" className={inputCls} />
              {errors.taxRate && <p className={errorCls}>{errors.taxRate.message}</p>}
            </div>
          </div>

          {/* Live preview */}
          <div className="grid grid-cols-2 gap-3 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wide">Tax Amount</p>
              <p className="text-base font-bold text-amber-400 tabular-nums">₹{parseFloat(taxPreview.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wide">Net Payable</p>
              <p className="text-base font-bold text-white/80 tabular-nums">₹{parseFloat(taxPreview.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Deposit Date</label>
              <Input {...register('depositDate')} type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Challan Number</label>
              <Input {...register('challanNumber')} placeholder="BSR/Seq number" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <div className="flex flex-wrap gap-2">
              {TDS_STATUSES.map((s) => (
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
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
