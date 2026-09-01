import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateEInvBuyer, useUpdateEInvBuyer, type EInvBuyer, type EInvBuyerFormValues } from '@/hooks/useEInvoicing';

interface Props {
  buyer: EInvBuyer | null;
  onClose: () => void;
}

const EMPTY: EInvBuyerFormValues = {
  name: '', gstin: '', pan: '', email: '', phone: '',
  address: '', city: '', state: '', pincode: '', country: 'India', notes: '',
};

export default function BuyerFormModal({ buyer, onClose }: Props) {
  const [form, setForm] = useState<EInvBuyerFormValues>(buyer ? {
    name:    buyer.name,
    gstin:   buyer.gstin    ?? '',
    pan:     buyer.pan      ?? '',
    email:   buyer.email    ?? '',
    phone:   buyer.phone    ?? '',
    address: buyer.address  ?? '',
    city:    buyer.city     ?? '',
    state:   buyer.state    ?? '',
    pincode: buyer.pincode  ?? '',
    country: buyer.country  ?? 'India',
    notes:   buyer.notes    ?? '',
  } : { ...EMPTY });
  const [error, setError] = useState<string | null>(null);

  const create = useCreateEInvBuyer();
  const update = useUpdateEInvBuyer();
  const isEdit = !!buyer;
  const loading = create.isPending || update.isPending;

  function set(field: keyof EInvBuyerFormValues, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Name is required'); return; }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: buyer.id, data: form });
      } else {
        await create.mutateAsync(form);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save buyer');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-xl mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">{isEdit ? 'Edit Buyer' : 'Add Buyer'}</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Company / Name <span className="text-red-400">*</span></label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Buyer company name"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
            </div>

            {/* GSTIN / PAN */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">GSTIN</label>
                <Input value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">PAN</label>
                <Input value={form.pan} onChange={e => set('pan', e.target.value)} placeholder="AAAAA0000A"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
            </div>

            {/* Email / Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.com"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Phone</label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Address</label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
            </div>

            {/* City / State / Pincode */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">City</label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">State</label>
                <Input value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Pincode</label>
                <Input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400001"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Country</label>
              <Input value={form.country} onChange={e => set('country', e.target.value)} placeholder="India"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={2} placeholder="Optional notes…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563EB]/50 resize-none" />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
            )}
          </div>

          <div className="flex gap-2 justify-end px-6 py-4 border-t border-white/[0.07]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Buyer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
