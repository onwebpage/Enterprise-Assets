import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ASSET_CATEGORIES, ASSET_STATUSES, DEPRECIATION_METHODS,
  type FixedAsset, type FixedAssetFormValues,
} from '@/hooks/useFixedAssets';

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight Line', declining_balance: 'Declining Balance', sum_of_years_digits: 'Sum of Years Digits',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active', fully_depreciated: 'Fully Depreciated', disposed: 'Disposed', under_maintenance: 'Under Maintenance',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: FixedAssetFormValues) => void;
  isSubmitting: boolean;
  asset?: FixedAsset | null;
  error?: string | null;
}

export default function AssetFormModal({ open, onClose, onSubmit, isSubmitting, asset, error }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, setValue, watch } = useForm<FixedAssetFormValues>({
    defaultValues: {
      category: 'other', depreciationMethod: 'straight_line', status: 'active',
      salvageValue: '0', usefulLifeMonths: 60, purchaseDate: today,
    },
  });

  const category = watch('category');
  const method   = watch('depreciationMethod');
  const status   = watch('status');

  useEffect(() => {
    if (open) {
      reset(asset ? {
        name: asset.name, assetNumber: asset.assetNumber, category: asset.category as any,
        description: asset.description ?? '', purchaseDate: asset.purchaseDate,
        purchaseCost: asset.purchaseCost, salvageValue: asset.salvageValue,
        usefulLifeMonths: asset.usefulLifeMonths, depreciationMethod: asset.depreciationMethod as any,
        status: asset.status as any, location: asset.location ?? '', serialNumber: asset.serialNumber ?? '',
        notes: asset.notes ?? '',
      } : {
        category: 'other', depreciationMethod: 'straight_line', status: 'active',
        salvageValue: '0', usefulLifeMonths: 60, purchaseDate: today,
      });
    }
  }, [open, asset]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{asset ? 'Edit Fixed Asset' : 'Add Fixed Asset'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-white/60">Asset Name *</Label>
              <Input {...register('name', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="e.g. Company Vehicle #1" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Asset Number</Label>
              <Input {...register('assetNumber')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="Auto-generated if blank" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Category</Label>
              <Select value={category} onValueChange={(v) => setValue('category', v as any)}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                  {ASSET_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize hover:bg-white/[0.05]">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-white/60">Purchase Date *</Label>
              <Input type="date" {...register('purchaseDate', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Purchase Cost *</Label>
              <Input {...register('purchaseCost', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Salvage Value</Label>
              <Input {...register('salvageValue')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Useful Life (months)</Label>
              <Input type="number" min={1} max={999} {...register('usefulLifeMonths', { valueAsNumber: true })}
                className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="60" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Depreciation Method</Label>
              <Select value={method} onValueChange={(v) => setValue('depreciationMethod', v as any)}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                  {DEPRECIATION_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="hover:bg-white/[0.05]">{METHOD_LABELS[m] ?? m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as any)}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="hover:bg-white/[0.05]">{STATUS_LABELS[s] ?? s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-white/60">Location</Label>
              <Input {...register('location')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="Optional" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-white/60">Serial Number</Label>
            <Input {...register('serialNumber')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="Optional" />
          </div>
          <div>
            <Label className="text-xs text-white/60">Notes</Label>
            <Input {...register('notes')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="Optional" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {isSubmitting ? 'Saving…' : asset ? 'Save Changes' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
