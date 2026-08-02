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
  PURCHASE_VENDOR_STATUSES, PURCHASE_VENDOR_CATEGORIES,
  type PurchaseVendor, type PurchaseVendorFormValues,
  type PurchaseVendorStatus, type PurchaseVendorCategory,
} from '@/hooks/usePurchase';

const schema = z.object({
  name:         z.string().min(1, 'Vendor name is required').max(300),
  category:     z.enum(PURCHASE_VENDOR_CATEGORIES),
  gstin:        z.string().max(20).nullable().optional(),
  pan:          z.string().max(20).nullable().optional(),
  email:        z.string().max(200).nullable().optional(),
  phone:        z.string().max(50).nullable().optional(),
  address:      z.string().max(500).nullable().optional(),
  city:         z.string().max(100).nullable().optional(),
  state:        z.string().max(100).nullable().optional(),
  country:      z.string().max(100).optional(),
  currency:     z.string().max(10).optional(),
  paymentTerms: z.string().max(50).nullable().optional(),
  creditLimit:  z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional().or(z.literal('')),
  status:       z.enum(PURCHASE_VENDOR_STATUSES),
  notes:        z.string().max(1000).nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const lbl = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inp = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const err = 'text-[11px] text-red-400 mt-1';

const STATUS_COLORS: Record<PurchaseVendorStatus, string> = {
  active:   'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  inactive: 'border-white/[0.12] bg-white/[0.04] text-white/40',
  blocked:  'border-red-500/30 bg-red-500/10 text-red-400',
};
const CAT_COLORS: Record<PurchaseVendorCategory, string> = {
  goods:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
  services: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  both:     'border-amber-500/30 bg-amber-500/10 text-amber-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: PurchaseVendorFormValues) => Promise<void>;
  isSubmitting: boolean;
  vendor?: PurchaseVendor | null;
  error?: string | null;
}

export default function PurchaseVendorFormModal({ open, onClose, onSubmit, isSubmitting, vendor, error }: Props) {
  const isEdit = !!vendor;
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', category: 'goods', gstin: '', pan: '', email: '', phone: '',
      address: '', city: '', state: '', country: 'India', currency: 'INR',
      paymentTerms: '', creditLimit: '', status: 'active', notes: '',
    },
  });

  const watchedStatus   = watch('status');
  const watchedCategory = watch('category');

  useEffect(() => {
    if (!open) return;
    if (vendor) {
      reset({
        name: vendor.name, category: vendor.category as PurchaseVendorCategory,
        gstin: vendor.gstin ?? '', pan: vendor.pan ?? '',
        email: vendor.email ?? '', phone: vendor.phone ?? '',
        address: vendor.address ?? '', city: vendor.city ?? '', state: vendor.state ?? '',
        country: vendor.country ?? 'India', currency: vendor.currency ?? 'INR',
        paymentTerms: vendor.paymentTerms ?? '', creditLimit: vendor.creditLimit ?? '',
        status: vendor.status as PurchaseVendorStatus, notes: vendor.notes ?? '',
      });
    } else {
      reset({
        name: '', category: 'goods', gstin: '', pan: '', email: '', phone: '',
        address: '', city: '', state: '', country: 'India', currency: 'INR',
        paymentTerms: '', creditLimit: '', status: 'active', notes: '',
      });
    }
  }, [open, vendor]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1424] border border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">{isEdit ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
            <DialogClose className="text-white/30 hover:text-white/70"><X className="w-4 h-4" /></DialogClose>
          </div>
        </DialogHeader>

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Category */}
          <div>
            <label className={lbl}>Category</label>
            <div className="flex gap-2">
              {PURCHASE_VENDOR_CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setValue('category', c)}
                  className={cn('flex-1 py-2 rounded-lg border text-xs font-semibold capitalize tracking-wide transition-all',
                    watchedCategory === c ? CAT_COLORS[c] : 'border-white/[0.07] bg-transparent text-white/30 hover:text-white/50')}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Vendor Name <span className="text-red-400">*</span></label>
              <Input {...register('name')} placeholder="e.g. Sharma Enterprises" className={inp} />
              {errors.name && <p className={err}>{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>GSTIN</label>
              <Input {...register('gstin')} placeholder="22AAAAA0000A1Z5" className={cn(inp, 'uppercase')} />
            </div>
            <div>
              <label className={lbl}>PAN</label>
              <Input {...register('pan')} placeholder="ABCDE1234F" className={cn(inp, 'uppercase')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Email</label>
              <Input {...register('email')} type="email" placeholder="vendor@example.com" className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <Input {...register('phone')} placeholder="+91 98765 43210" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Address</label>
            <Input {...register('address')} placeholder="Street / Building" className={inp} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>City</label>
              <Input {...register('city')} placeholder="Mumbai" className={inp} />
            </div>
            <div>
              <label className={lbl}>State</label>
              <Input {...register('state')} placeholder="Maharashtra" className={inp} />
            </div>
            <div>
              <label className={lbl}>Country</label>
              <Input {...register('country')} placeholder="India" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Currency</label>
              <Input {...register('currency')} placeholder="INR" className={inp} />
            </div>
            <div>
              <label className={lbl}>Payment Terms</label>
              <Input {...register('paymentTerms')} placeholder="Net 30" className={inp} />
            </div>
            <div>
              <label className={lbl}>Credit Limit (₹)</label>
              <Input {...register('creditLimit')} placeholder="0.00" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Status</label>
            <div className="flex gap-2">
              {PURCHASE_VENDOR_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setValue('status', s)}
                  className={cn('flex-1 py-2 rounded-lg border text-xs font-semibold capitalize transition-all',
                    watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.07] bg-transparent text-white/30 hover:text-white/50')}>
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
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
