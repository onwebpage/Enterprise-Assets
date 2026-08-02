import { useState } from 'react';
import { X, Send, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useSubmitEInvInvoice, useAcknowledgeEInvInvoice, useCancelEInvInvoice,
  type EInvInvoice,
} from '@/hooks/useEInvoicing';

type Action = 'submit' | 'acknowledge' | 'cancel';

interface Props {
  invoice: EInvInvoice;
  action: Action;
  onClose: () => void;
}

const ACTION_CONFIG = {
  submit: {
    title: 'Submit for IRN Generation',
    icon: Send,
    accent: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    btnClass: 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white',
    btnLabel: 'Submit Invoice',
    showIrn: true,
    showCancel: false,
  },
  acknowledge: {
    title: 'Acknowledge Invoice',
    icon: CheckCircle,
    accent: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    btnLabel: 'Acknowledge',
    showIrn: true,
    showCancel: false,
  },
  cancel: {
    title: 'Cancel Invoice',
    icon: XCircle,
    accent: 'bg-red-500/15',
    iconColor: 'text-red-400',
    btnClass: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    btnLabel: 'Cancel Invoice',
    showIrn: false,
    showCancel: true,
  },
};

export default function SubmitInvoiceModal({ invoice, action, onClose }: Props) {
  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;

  const [irn, setIrn]               = useState(invoice.irn ?? '');
  const [ackNumber, setAckNumber]   = useState(invoice.ackNumber ?? '');
  const [ackDate, setAckDate]       = useState(invoice.ackDate ?? '');
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError]           = useState<string | null>(null);

  const submitMut      = useSubmitEInvInvoice();
  const acknowledgeMut = useAcknowledgeEInvInvoice();
  const cancelMut      = useCancelEInvInvoice();
  const loading        = submitMut.isPending || acknowledgeMut.isPending || cancelMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (action === 'submit') {
        await submitMut.mutateAsync({ id: invoice.id, data: { irn: irn || undefined, ackNumber: ackNumber || undefined, ackDate: ackDate || undefined } });
      } else if (action === 'acknowledge') {
        await acknowledgeMut.mutateAsync({ id: invoice.id, data: { irn: irn || undefined, ackNumber: ackNumber || undefined, ackDate: ackDate || undefined } });
      } else {
        if (!cancelReason.trim()) { setError('Cancel reason is required'); return; }
        await cancelMut.mutateAsync({ id: invoice.id, reason: cancelReason });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Action failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0f1e] border border-white/[0.1] rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.accent}`}>
            <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{cfg.title}</h2>
            <p className="text-[11px] text-white/40 mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {cfg.showIrn && (
              <>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    IRN (Invoice Reference Number)
                    {action === 'submit' && <span className="text-white/30 ml-1">— optional, auto-generated if blank</span>}
                  </label>
                  <Input value={irn} onChange={e => setIrn(e.target.value)}
                    placeholder="64-character hash from IRP…"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 font-mono text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Ack Number</label>
                    <Input value={ackNumber} onChange={e => setAckNumber(e.target.value)}
                      placeholder="Acknowledgment no."
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Ack Date</label>
                    <Input type="date" value={ackDate} onChange={e => setAckDate(e.target.value)}
                      className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />
                  </div>
                </div>
                {action === 'submit' && (
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    If IRN is provided the invoice will be marked <strong className="text-white/50">Acknowledged</strong> immediately.
                    Otherwise it moves to <strong className="text-white/50">Submitted</strong> pending IRP confirmation.
                  </p>
                )}
              </>
            )}

            {cfg.showCancel && (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Cancellation Reason <span className="text-red-400">*</span>
                </label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  rows={3} placeholder="State the reason for cancellation…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563EB]/50 resize-none" />
              </div>
            )}

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
            )}
          </div>

          <div className="flex gap-2 justify-end px-6 py-4 border-t border-white/[0.07]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
            <Button type="submit" size="sm" disabled={loading} className={cfg.btnClass}>
              {loading ? 'Processing…' : cfg.btnLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
