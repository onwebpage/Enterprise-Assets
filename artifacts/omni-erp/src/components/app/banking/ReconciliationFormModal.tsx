import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBankTransactions } from '@/hooks/useBanking';
import { type BankAccount, type BankReconciliationFormValues } from '@/hooks/useBanking';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: BankReconciliationFormValues) => void;
  isSubmitting: boolean;
  accounts: BankAccount[];
  error?: string | null;
}

export default function ReconciliationFormModal({ open, onClose, onSubmit, isSubmitting, accounts, error }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, setValue, watch } = useForm<BankReconciliationFormValues>({
    defaultValues: { statementDate: today, openingBalance: '0', closingBalance: '0', bankAccountId: accounts[0]?.id, matchedTransactionIds: [] },
  });
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const bankAccountId = watch('bankAccountId');

  const { data: txnList } = useBankTransactions({ bankAccountId: bankAccountId ? Number(bankAccountId) : undefined, status: 'unreconciled', limit: 100 });
  const unreconciled = txnList?.data ?? [];

  useEffect(() => {
    if (open) {
      reset({ statementDate: today, openingBalance: '0', closingBalance: '0', bankAccountId: accounts[0]?.id, matchedTransactionIds: [] });
      setMatchedIds([]);
    }
  }, [open, accounts]);

  function toggleMatch(id: number) {
    setMatchedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setValue('matchedTransactionIds', next);
      return next;
    });
  }

  function doSubmit(values: BankReconciliationFormValues) {
    onSubmit({ ...values, matchedTransactionIds: matchedIds });
  }

  const accountIdVal = watch('bankAccountId');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">New Reconciliation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(doSubmit)} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-white/60">Bank Account *</Label>
            <Select value={String(accountIdVal ?? '')} onValueChange={(v) => setValue('bankAccountId', parseInt(v, 10))}>
              <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white h-9">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
                {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)} className="hover:bg-white/[0.05]">{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-white/60">Statement Date *</Label>
              <Input type="date" {...register('statementDate', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Opening Balance</Label>
              <Input {...register('openingBalance')} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Closing Balance *</Label>
              <Input {...register('closingBalance', { required: true })} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white font-mono" placeholder="0.00" />
            </div>
          </div>

          {/* Match transactions */}
          {unreconciled.length > 0 && (
            <div>
              <Label className="text-xs text-white/60 mb-2 block">Mark Cleared Transactions ({matchedIds.length} selected)</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-white/[0.07] rounded-lg p-2">
                {unreconciled.map((txn) => (
                  <button key={txn.id} type="button" onClick={() => toggleMatch(txn.id)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      matchedIds.includes(txn.id) ? 'bg-[#2563EB]/15 border border-[#2563EB]/30' : 'hover:bg-white/[0.04] border border-transparent')}>
                    <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
                      matchedIds.includes(txn.id) ? 'bg-[#2563EB] border-[#2563EB]' : 'border-white/[0.2]')}>
                      {matchedIds.includes(txn.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 truncate">{txn.description}</p>
                      <p className="text-[11px] text-white/40">{txn.transactionDate}</p>
                    </div>
                    <span className={cn('text-xs font-semibold tabular-nums ml-auto', txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                      {txn.type === 'debit' ? '-' : '+'}₹{parseFloat(txn.amount).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
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
              {isSubmitting ? 'Creating…' : 'Create Reconciliation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
