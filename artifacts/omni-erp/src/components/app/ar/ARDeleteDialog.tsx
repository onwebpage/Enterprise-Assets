import { Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ARDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  title: string;
  description: string;
  error?: string | null;
}

export default function ARDeleteDialog({
  open, onClose, onConfirm, isDeleting, title, description, error,
}: ARDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
            </div>
            <DialogTitle className="text-base font-semibold text-white">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-5 space-y-4">
          <p className="text-sm text-white/50">{description}</p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              Cancel
            </Button>
            <Button size="sm" onClick={onConfirm} disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 h-8 min-w-[90px]">
              {isDeleting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting…</> : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
