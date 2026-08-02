import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function EInvDeleteDialog({ title, description, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/50 mt-1">{description}</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}
            className="text-white/60 hover:text-white hover:bg-white/[0.06]">
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
