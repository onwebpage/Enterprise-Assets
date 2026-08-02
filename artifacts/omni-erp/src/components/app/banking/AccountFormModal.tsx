import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BANK_ACCOUNT_TYPES, BANK_ACCOUNT_STATUSES, type BankAccount, type BankAccountFormValues } from '@/hooks/useBanking';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: BankAccountFormValues) => void;
  isSubmitting: boolean;
  account?: BankAccount | null;
  error?: string | null;
}

export default function AccountFormModal({ open, onClose, onSubmit, isSubmitting, account, error }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BankAccountFormValues>({
    defaultValues: { currency: 'USD', accountType: 'checking', status: 'active', currentBalance: '0' },
  });

  useEffect(() => {
    if (open) {
      reset(account ? {
        name: account.name, accountNumber: account.accountNumber ?? '', bankName: account.bankName ?? '',
        bankBranch: account.bankBranch ?? '', currency: account.currency, currentBalance: account.currentBalance,
        accountType: account.accountType, status: account.status, notes: account.notes ?? '',
      } : { currency: 'USD', accountType: 'checking', status: 'active', currentBalance: '0' });
    }
  }, [open, account]);

  const type   = watch('accountType');
  const status = watch('status');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{account ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-white/60">Account Name *</Label>
            <Input {...register('name', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="e.g. Main Operating Account" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Account Type</Label>
              <Select value={type} onValueChange={(v) => setValue('accountType', v as any)}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                  {BANK_ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize hover:bg-white/[0.05]">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-white/60">Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as any)}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                  {BANK_ACCOUNT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize hover:bg-white/[0.05]">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Bank Name</Label>
              <Input {...register('bankName')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="e.g. Chase" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Branch</Label>
              <Input {...register('bankBranch')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Account Number</Label>
              <Input {...register('accountNumber')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="Optional" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Currency</Label>
              <Input {...register('currency')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="USD" maxLength={10} />
            </div>
          </div>
          {!account && (
            <div>
              <Label className="text-xs text-white/60">Opening Balance</Label>
              <Input {...register('currentBalance')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="0.00" />
            </div>
          )}
          <div>
            <Label className="text-xs text-white/60">Notes</Label>
            <Input {...register('notes')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="Optional" />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {isSubmitting ? 'Saving…' : account ? 'Save Changes' : 'Add Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
