import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Send, Edit, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useGSTReturnEntries, useCreateGSTReturnEntry, useDeleteGSTReturnEntry,
  useSubmitGSTReturn, useUpdateGSTReturn,
  type GSTReturn, type GSTReturnStatus, type GSTReturnType, type GSTReturnEntry,
  type GSTReturnEntryFormValues,
} from '@/hooks/useGSTReturns';
import EntryFormModal from './EntryFormModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (isNaN(n)) return '₹0';
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

const RETURN_LABELS: Record<string, string> = {
  gstr1: 'GSTR-1', gstr3b: 'GSTR-3B', gstr9: 'GSTR-9',
  gstr2a: 'GSTR-2A', gstr4: 'GSTR-4', gstr6: 'GSTR-6',
};

const STATUS_STYLES: Record<string, string> = {
  draft:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  filed:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/25',
  revised: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
};

// ── Tax summary row ────────────────────────────────────────────────────────────

function TaxRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0', highlight && 'pt-3 border-t border-white/[0.08]')}>
      <span className={cn('text-xs', highlight ? 'font-semibold text-white/80' : 'text-white/40')}>{label}</span>
      <span className={cn('text-sm tabular-nums', highlight ? 'font-bold text-white' : 'text-white/70')}>{value}</span>
    </div>
  );
}

// ── Status transition buttons ──────────────────────────────────────────────────

const STATUS_FLOW: Record<GSTReturnStatus, GSTReturnStatus | null> = {
  draft:   'pending',
  pending: null,  // filed via submit action
  filed:   'revised',
  overdue: null,
  revised: null,
};

const STATUS_NEXT_LABELS: Record<string, string> = {
  draft:   'Mark as Pending',
  revised: 'Mark as Draft',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  gstReturn: GSTReturn;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function ReturnDetailSheet({ gstReturn: r, onClose, onEdit, canEdit }: Props) {
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [entryError,   setEntryError]   = useState<string | null>(null);
  const [actionError,  setActionError]  = useState<string | null>(null);

  const { data: entriesData, isLoading: entriesLoading } = useGSTReturnEntries(r.id);
  const createEntry = useCreateGSTReturnEntry();
  const deleteEntry = useDeleteGSTReturnEntry();
  const submitMut   = useSubmitGSTReturn();
  const updateMut   = useUpdateGSTReturn();

  const entries = entriesData?.data ?? [];
  const isFiled = r.status === 'filed';

  async function handleAddEntry(values: Omit<GSTReturnEntryFormValues, 'returnId'>) {
    setEntryError(null);
    try {
      await createEntry.mutateAsync({ returnId: r.id, data: values });
      setAddEntryOpen(false);
    } catch (e: any) {
      setEntryError(e?.message ?? 'Failed to add entry');
    }
  }

  async function handleDeleteEntry(entry: GSTReturnEntry) {
    try { await deleteEntry.mutateAsync({ id: entry.id, returnId: r.id }); }
    catch {}
  }

  async function handleFileReturn() {
    setActionError(null);
    try { await submitMut.mutateAsync(r.id); }
    catch (e: any) { setActionError(e?.message ?? 'Failed to file return'); }
  }

  async function handleStatusChange(newStatus: GSTReturnStatus) {
    setActionError(null);
    try { await updateMut.mutateAsync({ id: r.id, data: { status: newStatus } }); }
    catch (e: any) { setActionError(e?.message ?? 'Failed to update status'); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="relative bg-[#0a0f1e] border-l border-white/[0.07] w-full max-w-[500px] h-full flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-white">
                  {RETURN_LABELS[r.returnType] ?? r.returnType.toUpperCase()}
                </h3>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize', STATUS_STYLES[r.status])}>
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-white/40">Period: {r.period} · Due: {r.dueDate}</p>
              {r.gstin && <p className="text-[11px] text-white/30 mt-0.5">GSTIN: {r.gstin}</p>}
            </div>
            <div className="flex items-center gap-1 ml-3">
              {canEdit && !isFiled && (
                <button onClick={onEdit} title="Edit return"
                  className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Tax summary */}
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Tax Summary</p>
              <div className="space-y-0">
                <TaxRow label="Taxable Value"    value={fmtMoney(r.totalTaxableValue)} />
                <TaxRow label="CGST"             value={fmtMoney(r.totalCgst)} />
                <TaxRow label="SGST"             value={fmtMoney(r.totalSgst)} />
                <TaxRow label="IGST"             value={fmtMoney(r.totalIgst)} />
                <TaxRow label="Cess"             value={fmtMoney(r.totalCess)} />
                <TaxRow label="Tax Liability"    value={fmtMoney(r.totalTaxLiability)} />
                <TaxRow label="Input Tax Credit" value={`− ${fmtMoney(r.totalItc)}`} />
                <TaxRow label="Net Payable"      value={fmtMoney(r.netPayable)} highlight />
              </div>
              {r.submissionDate && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Filed on {r.submissionDate}
                </div>
              )}
            </div>

            {/* Actions */}
            {canEdit && (
              <div className="px-5 py-4 border-b border-white/[0.06] space-y-2">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Actions</p>

                {actionError && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{actionError}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* File return */}
                  {r.status !== 'filed' && (
                    <Button size="sm" onClick={handleFileReturn} disabled={submitMut.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                      {submitMut.isPending
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Filing…</>
                        : <><Send className="w-3.5 h-3.5 mr-1.5" />File Return</>
                      }
                    </Button>
                  )}

                  {/* Status transitions */}
                  {STATUS_FLOW[r.status as GSTReturnStatus] && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(STATUS_FLOW[r.status as GSTReturnStatus]!)}
                      disabled={updateMut.isPending}
                      className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8 text-xs">
                      {STATUS_NEXT_LABELS[r.status] ?? `Mark as ${STATUS_FLOW[r.status as GSTReturnStatus]}`}
                    </Button>
                  )}

                  {/* Add entry */}
                  {!isFiled && (
                    <Button size="sm" onClick={() => { setEntryError(null); setAddEntryOpen(true); }}
                      className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add Entry
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Entries */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                  Transaction Entries ({entries.length})
                </p>
                {!isFiled && canEdit && (
                  <button onClick={() => { setEntryError(null); setAddEntryOpen(true); }}
                    className="flex items-center gap-1 text-[11px] text-[#60a5fa] hover:text-white transition-colors">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>

              {entriesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-xs text-white/30">No entries yet.</p>
                  {!isFiled && canEdit && (
                    <button onClick={() => { setEntryError(null); setAddEntryOpen(true); }}
                      className="mt-1.5 text-xs text-[#60a5fa] hover:underline">
                      Add the first entry →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {entries.map((entry) => (
                    <motion.div key={entry.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="group bg-white/[0.025] hover:bg-white/[0.04] border border-white/[0.04] rounded-lg px-3 py-2.5 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">
                              {entry.entryType.replace('_', ' ')}
                            </span>
                            {entry.invoiceNumber && (
                              <span className="text-[11px] text-white/60 font-mono">{entry.invoiceNumber}</span>
                            )}
                          </div>
                          {entry.partyName && (
                            <p className="text-xs text-white/70 truncate">{entry.partyName}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-white/40">
                              Taxable: <span className="text-white/60 tabular-nums">{fmtMoney(entry.taxableValue)}</span>
                            </span>
                            <span className="text-[11px] text-white/40">
                              Tax: <span className="font-semibold text-white/70 tabular-nums">{fmtMoney(entry.totalTax)}</span>
                            </span>
                          </div>
                          {/* Tax breakdown mini */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {[
                              { l: 'C', v: entry.cgstAmount, c: 'text-blue-400/70' },
                              { l: 'S', v: entry.sgstAmount, c: 'text-indigo-400/70' },
                              { l: 'I', v: entry.igstAmount, c: 'text-cyan-400/70' },
                              { l: 'Cs', v: entry.cessAmount, c: 'text-amber-400/70' },
                            ].filter(({ v }) => parseFloat(v) > 0).map(({ l, v, c }) => (
                              <span key={l} className={`text-[10px] tabular-nums ${c}`}>
                                {l}: {fmtMoney(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                        {!isFiled && (
                          <button onClick={() => handleDeleteEntry(entry)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {r.notes && (
              <div className="px-5 pb-4">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Notes</p>
                <p className="text-xs text-white/50">{r.notes}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <EntryFormModal
        open={addEntryOpen}
        returnId={r.id}
        returnType={r.returnType}
        onClose={() => setAddEntryOpen(false)}
        onSubmit={handleAddEntry}
        isSubmitting={createEntry.isPending}
        error={entryError}
      />
    </>
  );
}
