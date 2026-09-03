import { useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BankAccount } from '@/hooks/useBanking';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (data: { bankAccountId: number; fileName: string; rows: Array<Record<string, string>> }) => Promise<void>;
  accounts: BankAccount[];
  isSubmitting: boolean;
  error?: string | null;
}

function parseCsv(text: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let value = '';
  let quoted = false;
  for (const character of text.replace(/^\uFEFF/, '')) {
    if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { record.push(value.trim()); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\n' && (value || record.length)) { record.push(value.trim()); records.push(record); record = []; value = ''; }
    } else value += character;
  }
  if (value || record.length) { record.push(value.trim()); records.push(record); }
  if (records.length < 2) return [];
  const headers = records[0].map((header) => {
    const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
    if (['date', 'transactiondate', 'valuedate', 'postingdate'].includes(normalized)) return 'date';
    if (['description', 'memo', 'narration', 'details'].includes(normalized)) return 'description';
    if (['amount', 'transactionamount'].includes(normalized)) return 'amount';
    if (['reference', 'referencenumber', 'transactionid', 'externalid'].includes(normalized)) return 'reference';
    return normalized;
  });
  return records.slice(1).filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export default function StatementImportModal({ open, onClose, onImport, accounts, isSubmitting, error }: Props) {
  const [accountId, setAccountId] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const selectedAccount = accountId || (accounts[0] ? String(accounts[0].id) : '');

  function chooseFile(file?: File) {
    if (!file) return;
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ''));
      if (!parsed.length) setParseError('The CSV must include a header row and at least one transaction.');
      setRows(parsed);
    };
    reader.onerror = () => setParseError('Unable to read this file.');
    reader.readAsText(file);
  }

  async function submit() {
    if (!selectedAccount || !rows.length) { setParseError('Select an account and a valid CSV file.'); return; }
    await onImport({ bankAccountId: Number(selectedAccount), fileName, rows });
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="max-w-lg bg-[#0a0f1e] border-white/[0.1] text-white">
      <DialogHeader><DialogTitle className="text-white">Import bank statement</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><label className="text-xs text-white/60">Bank account</label><Select value={selectedAccount} onValueChange={setAccountId}><SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.1] text-white"><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent className="bg-[#0a0f1e] border-white/[0.1] text-white">{accounts.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.name}</SelectItem>)}</SelectContent></Select></div>
        <div><label className="text-xs text-white/60">CSV statement</label><label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.15] px-4 py-8 text-sm text-white/50 hover:border-blue-400/50 hover:text-white"><FileUp className="h-5 w-5" />{fileName || 'Choose CSV file'}<input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} /></label><p className="mt-1 text-[11px] text-white/30">Required columns: date, description, amount. Optional: reference, type, category.</p></div>
        {rows.length > 0 && <p className="text-xs text-emerald-400">{rows.length} transaction rows ready to import.</p>}
        {(parseError || error) && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{parseError || error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose} className="text-white/50">Cancel</Button><Button onClick={() => void submit()} disabled={isSubmitting || !rows.length} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import statement</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
