import { useState } from 'react';
import { X, AlertCircle, Trash2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Shared dialog shell ────────────────────────────────────────────────────────
function Dialog({
  open, onClose, icon: Icon, iconClass, title, description, error,
  children, confirmLabel, confirmClass, onConfirm, isLoading,
}: {
  open: boolean; onClose: () => void; icon: React.ElementType; iconClass: string;
  title: string; description: string; error?: string | null;
  children?: React.ReactNode; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; isLoading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-white/60 leading-relaxed">{description}</p>
          {children}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.07]">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}
            className="text-white/50 hover:text-white hover:bg-white/[0.05] h-8 text-sm">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className={`h-8 text-sm ${confirmClass}`}>
            {isLoading ? 'Processing…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

export function DeleteDialog({ open, onClose, onConfirm, isLoading, billName, error }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  isLoading?: boolean; billName?: string; error?: string | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} icon={Trash2} iconClass="bg-red-500/15 text-red-400"
      title="Delete E-Way Bill"
      description={`Delete draft bill "${billName ?? ''}"? This action cannot be undone.`}
      error={error} confirmLabel="Delete" confirmClass="bg-red-600 hover:bg-red-700 text-white"
      onConfirm={onConfirm} isLoading={isLoading} />
  );
}

// ── Cancel dialog ─────────────────────────────────────────────────────────────

export function CancelDialog({ open, onClose, onConfirm, isLoading, ewbNumber, error }: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void;
  isLoading?: boolean; ewbNumber?: string | null; error?: string | null;
}) {
  const [reason, setReason] = useState('');

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} icon={XCircle} iconClass="bg-amber-500/15 text-amber-400"
      title="Cancel E-Way Bill"
      description={`Cancel EWB ${ewbNumber ?? ''}? This can only be done within 24 hours of generation.`}
      error={error} confirmLabel="Cancel Bill" confirmClass="bg-amber-600 hover:bg-amber-700 text-white"
      onConfirm={handleConfirm} isLoading={isLoading}>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/50">Cancellation Reason<span className="text-red-400 ml-0.5">*</span></label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
          placeholder="Enter reason for cancellation..."
          className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]/50 placeholder:text-white/25 resize-none" />
      </div>
    </Dialog>
  );
}

// ── Extend dialog ─────────────────────────────────────────────────────────────

export function ExtendDialog({ open, onClose, onConfirm, isLoading, ewbNumber, currentVehicle, error }: {
  open: boolean; onClose: () => void;
  onConfirm: (vehicleNumber: string, reason: string) => void;
  isLoading?: boolean; ewbNumber?: string | null; currentVehicle?: string | null; error?: string | null;
}) {
  const [vehicle, setVehicle] = useState(currentVehicle ?? '');
  const [reason,  setReason]  = useState('');

  function handleConfirm() { onConfirm(vehicle, reason); }

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} icon={Clock} iconClass="bg-cyan-500/15 text-cyan-400"
      title="Extend Validity"
      description={`Extend the validity period of EWB ${ewbNumber ?? ''}.`}
      error={error} confirmLabel="Extend" confirmClass="bg-cyan-600 hover:bg-cyan-700 text-white"
      onConfirm={handleConfirm} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/50">Vehicle Number</label>
          <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)}
            placeholder="MH01AB1234"
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/50">Reason for Extension</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="e.g. Vehicle breakdown, route change..."
            className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]/50 placeholder:text-white/25 resize-none" />
        </div>
      </div>
    </Dialog>
  );
}
