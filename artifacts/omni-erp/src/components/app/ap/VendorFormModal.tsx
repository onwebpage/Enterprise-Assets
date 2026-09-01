import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { APVendor, APVendorFormValues, APVendorStatus } from '@/hooks/useAccountsPayable';

const schema = z.object({
  name:         z.string().min(1, 'Name is required').max(200),
  email:        z.string().email('Invalid email').max(200).or(z.literal('')).nullable().optional(),
  phone:        z.string().max(50).nullable().optional(),
  address:      z.string().max(500).nullable().optional(),
  city:         z.string().max(100).nullable().optional(),
  country:      z.string().max(100).nullable().optional(),
  taxId:        z.string().max(100).nullable().optional(),
  currency:     z.string().max(10).optional(),
  paymentTerms: z.string().max(50).nullable().optional(),
  status:       z.enum(['active', 'inactive', 'blocked']).optional(),
  notes:        z.string().max(1000).nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<string, string> = {
  active:   'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  inactive: 'border-white/[0.12] bg-white/[0.06] text-white/50',
  blocked:  'border-red-500/30 bg-red-500/10 text-red-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: APVendorFormValues) => Promise<void>;
  isSubmitting: boolean;
  vendor?: APVendor | null;
  error?: string | null;
}

export default function VendorFormModal({ open, onClose, onSubmit, isSubmitting, vendor, error }: Props) {
  const isEdit = !!vendor;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
       name: '', email: '', phone: '', address: '', city: '', country: 'India',
       taxId: '', currency: 'INR', paymentTerms: 'Net 30', status: 'active', notes: '',
    },
  });

  const watchedStatus = watch('status');

  useEffect(() => {
    if (open) {
      reset(vendor
        ? {
            name: vendor.name, email: vendor.email ?? '', phone: vendor.phone ?? '',
            address: vendor.address ?? '', city: vendor.city ?? '', country: vendor.country ?? '',
            taxId: vendor.taxId ?? '', currency: vendor.currency,
            paymentTerms: vendor.paymentTerms ?? '', status: vendor.status, notes: vendor.notes ?? '',
          }
        : {
             name: '', email: '', phone: '', address: '', city: '', country: 'India',
             taxId: '', currency: 'INR', paymentTerms: 'Net 30', status: 'active', notes: '',
          });
    }
  }, [open, vendor, reset]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      email:        values.email        || null,
      phone:        values.phone        || null,
      address:      values.address      || null,
      city:         values.city         || null,
      country:      values.country      || null,
      taxId:        values.taxId        || null,
      paymentTerms: values.paymentTerms || null,
      notes:        values.notes        || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit Vendor' : 'New Vendor'}
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

          {/* Name */}
          <div>
            <label className={labelCls}>Vendor / Supplier Name *</label>
            <Input {...register('name')} placeholder="e.g. Acme Supplies Inc." className={inputCls} />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <Input {...register('email')} placeholder="billing@vendor.com" className={inputCls} />
              {errors.email && <p className={errorCls}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <Input {...register('phone')} placeholder="+1 312 555 0100" className={inputCls} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Address</label>
            <Input {...register('address')} placeholder="456 Vendor Ave" className={inputCls} />
          </div>

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <Input {...register('city')} placeholder="Chicago" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <Input {...register('country')} placeholder="USA" className={inputCls} />
            </div>
          </div>

          {/* Tax ID + Payment Terms + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tax ID / VAT</label>
              <Input {...register('taxId')} placeholder="12-3456789" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Payment Terms</label>
              <Input {...register('paymentTerms')} placeholder="Net 30" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select {...register('currency')} className={cn('w-full rounded-md border px-3 h-9 text-sm appearance-none', inputCls)}>
                {['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'].map((c) => (
                  <option key={c} value={c} className="bg-[#0d1225]">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className={labelCls}>Status</label>
              <div className="flex items-center gap-2">
                {(['active', 'inactive', 'blocked'] as APVendorStatus[]).map((s) => (
                  <button key={s} type="button" onClick={() => setValue('status', s)}
                    className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                      watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes <span className="text-white/25 normal-case font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} placeholder="Internal notes about this vendor…"
              className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inputCls)} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[110px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
