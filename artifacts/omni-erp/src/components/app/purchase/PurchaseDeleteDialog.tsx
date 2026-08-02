import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title: string;
  description: string;
  error?: string | null;
}

export default function PurchaseDeleteDialog({ open, onClose, onConfirm, isDeleting, title, description, error }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="bg-[#0d1424] border border-white/[0.08] text-white max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <AlertDialogTitle className="text-white text-base">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/50 text-sm leading-relaxed pl-12">
            {description}
          </AlertDialogDescription>
          {error && <p className="pl-12 text-xs text-red-400 mt-1">{error}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel onClick={onClose}
            className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white border-0 min-w-[90px]">
            {isDeleting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting…</> : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
