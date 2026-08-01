import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAccountParents } from '@/hooks/useChartOfAccounts';
import {
  useCreateJournalEntry, useUpdateJournalEntry, usePostJournalEntry,
  type JournalEntry, type JournalEntryFormValues, type JournalEntryLineFormValues,
} from '@/hooks/useGeneralLedger';

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function emptyLine(): JournalEntryLineFormValues {
  return { accountId: 0, description: '', debit: '', credit: '' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMoney(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtBalance(n: number): string {
  if (n === 0) return '—';
  return n < 0 ? `($${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` :
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:        boolean;
  onClose:     () => void;
  editEntry?:  JournalEntry | null;   // if provided, we're editing
  postAfterSave?: boolean;            // used by "Save & Post" flow
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JournalEntryFormModal({ open, onClose, editEntry }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [date,      setDate]      = useState(TODAY);
  const [reference, setReference] = useState('');
  const [memo,      setMemo]      = useState('');
  const [lines,     setLines]     = useState<JournalEntryLineFormValues[]>([emptyLine(), emptyLine()]);
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [posting,   setPosting]   = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: parentsRes } = useAccountParents();
  const accounts = parentsRes?.data ?? [];

  const createMut = useCreateJournalEntry();
  const updateMut = useUpdateJournalEntry();
  const postMut   = usePostJournalEntry();

  // ── Populate form when editing ───────────────────────────────────────────────
  useEffect(() => {
    if (editEntry) {
      setDate(editEntry.date);
      setReference(editEntry.reference ?? '');
      setMemo(editEntry.memo);
      if (editEntry.lines && editEntry.lines.length > 0) {
        setLines(editEntry.lines.map((l) => ({
          accountId:   l.accountId,
          description: l.description ?? '',
          debit:       parseFloat(l.debit)  > 0 ? String(parseFloat(l.debit).toFixed(2))  : '',
          credit:      parseFloat(l.credit) > 0 ? String(parseFloat(l.credit).toFixed(2)) : '',
        })));
      }
    } else {
      setDate(TODAY);
      setReference('');
      setMemo('');
      setLines([emptyLine(), emptyLine()]);
    }
    setError(null);
  }, [editEntry, open]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalDebit  = lines.reduce((s, l) => s + parseMoney(l.debit),  0);
  const totalCredit = lines.reduce((s, l) => s + parseMoney(l.credit), 0);
  const diff        = Math.abs(totalDebit - totalCredit);
  const isBalanced  = diff < 0.005 && totalDebit > 0;

  // ── Line handlers ────────────────────────────────────────────────────────────
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setLineField<K extends keyof JournalEntryLineFormValues>(
    i: number, key: K, val: JournalEntryLineFormValues[K],
  ) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  }

  // When user enters debit, clear credit (and vice-versa)
  function handleDebitChange(i: number, val: string) {
    setLines((prev) => prev.map((l, idx) =>
      idx === i ? { ...l, debit: val, credit: val !== '' && parseMoney(val) > 0 ? '' : l.credit } : l,
    ));
  }

  function handleCreditChange(i: number, val: string) {
    setLines((prev) => prev.map((l, idx) =>
      idx === i ? { ...l, credit: val, debit: val !== '' && parseMoney(val) > 0 ? '' : l.debit } : l,
    ));
  }

  // ── Build payload ────────────────────────────────────────────────────────────
  function buildPayload(): JournalEntryFormValues | string {
    if (!date) return 'Date is required';
    if (!memo.trim()) return 'Memo is required';

    const validLines = lines.filter((l) => l.accountId > 0 && (parseMoney(l.debit) > 0 || parseMoney(l.credit) > 0));
    if (validLines.length < 2) return 'At least 2 lines with an account and amount are required';

    const td = validLines.reduce((s, l) => s + parseMoney(l.debit),  0);
    const tc = validLines.reduce((s, l) => s + parseMoney(l.credit), 0);
    if (Math.abs(td - tc) > 0.005) return `Entry is not balanced: debits ${fmtBalance(td)} ≠ credits ${fmtBalance(tc)}`;

    return {
      date,
      reference: reference.trim() || '',
      memo:      memo.trim(),
      lines:     validLines.map((l, i) => ({
        accountId:   l.accountId,
        description: l.description.trim() || '',
        debit:       parseMoney(l.debit)  > 0 ? parseMoney(l.debit).toFixed(2)  : '0',
        credit:      parseMoney(l.credit) > 0 ? parseMoney(l.credit).toFixed(2) : '0',
        sequence:    i,
      })),
    };
  }

  // ── Submit handlers ──────────────────────────────────────────────────────────
  async function handleSave() {
    setError(null);
    const payload = buildPayload();
    if (typeof payload === 'string') { setError(payload); return; }

    setSaving(true);
    try {
      if (editEntry) {
        await updateMut.mutateAsync({ id: editEntry.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndPost() {
    setError(null);
    const payload = buildPayload();
    if (typeof payload === 'string') { setError(payload); return; }

    setPosting(true);
    try {
      let jeId: number;
      if (editEntry) {
        const res = await updateMut.mutateAsync({ id: editEntry.id, data: payload });
        jeId = (res as any).data?.id ?? editEntry.id;
      } else {
        const res = await createMut.mutateAsync(payload);
        jeId = (res as any).data?.id;
      }
      await postMut.mutateAsync(jeId);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save and post journal entry');
    } finally {
      setPosting(false);
    }
  }

  const busy = saving || posting;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">
            {editEntry ? `Edit ${editEntry.entryNumber}` : 'New Journal Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Date <span className="text-red-400">*</span></label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Reference</label>
              <Input
                placeholder="INV-001, PAY-123…"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Memo <span className="text-red-400">*</span></label>
              <Input
                placeholder="Entry description…"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 h-8 text-sm"
              />
            </div>
          </div>

          {/* Lines table */}
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Entry Lines</span>
              <Button
                variant="ghost" size="sm"
                onClick={addLine}
                className="h-7 text-xs text-[#2563EB] hover:text-white hover:bg-[#2563EB]/20 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />Add Line
              </Button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Account', 'Description', 'Debit', 'Credit', ''].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-white/30 uppercase tracking-wide px-3 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    {/* Account selector */}
                    <td className="px-3 py-2 w-[260px]">
                      <select
                        value={line.accountId || ''}
                        onChange={(e) => setLineField(i, 'accountId', parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-md text-sm text-white px-2 h-8 focus:outline-none focus:border-[#2563EB]/60"
                      >
                        <option value="">— Select account —</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id} className="bg-[#0d1225]">
                            {a.code} · {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* Description */}
                    <td className="px-3 py-2">
                      <Input
                        placeholder="Optional note…"
                        value={line.description}
                        onChange={(e) => setLineField(i, 'description', e.target.value)}
                        className="bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/20 h-8 text-sm"
                      />
                    </td>
                    {/* Debit */}
                    <td className="px-3 py-2 w-[130px]">
                      <Input
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) => handleDebitChange(i, e.target.value)}
                        className="bg-white/[0.04] border-white/[0.07] text-emerald-400 placeholder:text-white/20 h-8 text-sm tabular-nums"
                      />
                    </td>
                    {/* Credit */}
                    <td className="px-3 py-2 w-[130px]">
                      <Input
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) => handleCreditChange(i, e.target.value)}
                        className="bg-white/[0.04] border-white/[0.07] text-red-400 placeholder:text-white/20 h-8 text-sm tabular-nums"
                      />
                    </td>
                    {/* Remove */}
                    <td className="px-3 py-2 w-[40px]">
                      {lines.length > 2 && (
                        <button
                          onClick={() => removeLine(i)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                  <td className="px-3 py-2.5 text-xs font-semibold text-white/50" colSpan={2}>Totals</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-emerald-400 tabular-nums">
                    {totalDebit > 0 ? `$${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-red-400 tabular-nums">
                    {totalCredit > 0 ? `$${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {totalDebit > 0 && (
                      isBalanced
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <AlertCircle  className="w-4 h-4 text-amber-400" />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Balance indicator */}
          {totalDebit > 0 && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
              isBalanced
                ? 'bg-emerald-500/8 border border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/8 border border-amber-500/20 text-amber-400',
            )}>
              {isBalanced
                ? <><CheckCircle2 className="w-3.5 h-3.5" />Entry is balanced</>
                : <><AlertCircle  className="w-3.5 h-3.5" />Out of balance by {fmtBalance(diff)}</>}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={busy}
            className="text-white/50 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={busy}
            className="border-white/[0.1] bg-transparent text-white/70 hover:text-white hover:bg-white/[0.05]"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save as Draft
          </Button>
          <Button
            onClick={handleSaveAndPost}
            disabled={busy || !isBalanced}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {posting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save &amp; Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
