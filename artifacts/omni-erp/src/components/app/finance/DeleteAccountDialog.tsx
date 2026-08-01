import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Account } from '@/hooks/useChartOfAccounts';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  account: Account | null;
  error?: string | null;
}

export default function DeleteAccountDialog({
  open, onClose, onConfirm, isDeleting, account, error,
}: DeleteAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">Delete Account</DialogTitle>
              <p className="text-xs text-white/40 mt-1">This action cannot be undone.</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-4">
          {account && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
              <p className="text-xs text-white/40 mb-0.5">Account to delete</p>
              <p className="text-sm font-semibold text-white">{account.code} · {account.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{account.type}</p>
            </div>
          )}

          <p className="text-sm text-white/60">
            Are you sure you want to permanently delete this account?
            {account?.childCount ? (
              <span className="text-amber-400 block mt-1">
                ⚠ This account has {account.childCount} child account{account.childCount > 1 ? 's' : ''} — re-parent or delete them first.
              </span>
            ) : null}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isDeleting}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isDeleting || (account?.childCount ?? 0) > 0}
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 h-8 min-w-[90px]"
            >
              {isDeleting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting…</>
              ) : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
