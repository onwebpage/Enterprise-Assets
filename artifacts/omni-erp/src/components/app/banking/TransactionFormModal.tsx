import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BANK_TRANSACTION_TYPES, type BankAccount, type BankTransactionFormValues } from '@/hooks/useBanking';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: BankTransactionFormValues) => void;
  isSubmitting: boolean;
  accounts: BankAccount[];
  error?: string | null;
}

export default function TransactionFormModal({ open, onClose, onSubmit, isSubmitting, accounts, error }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, setValue, watch } = useForm<BankTransactionFormValues>({
    defaultValues: { type: 'credit', transactionDate: today, bankAccountId: accounts[0]?.id },
  });

  useEffect(() => {
    if (open) reset({ type: 'credit', transactionDate: today, bankAccountId: accounts[0]?.id });
  }, [open, accounts]);

  const type      = watch('type');
  const accountId = watch('bankAccountId');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-white/60">Bank Account *</Label>
            <Select value={String(accountId ?? '')} onValueChange={(v) => setValue('bankAccountId', parseInt(v, 10))}>
              <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)} className="hover:bg-white/[0.05]">{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Date *</Label>
              <Input type="date" {...register('transactionDate', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Type</Label>
              <Select value={type} onValueChange={(v) => setValue('type', v as any)}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                  {BANK_TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize hover:bg-white/[0.05]">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-white/60">Description *</Label>
            <Input {...register('description', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="e.g. Monthly rent payment" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Amount *</Label>
              <Input {...register('amount', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Reference</Label>
              <Input {...register('reference')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-white/60">Category</Label>
            <Input {...register('category')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="e.g. Rent, Payroll, Sales" />
          </div>
          <div>
            <Label className="text-xs text-white/60">Notes</Label>
            <Input {...register('notes')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" placeholder="Optional" />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {isSubmitting ? 'Saving…' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
