import { useMemo, useState, type ReactNode } from "react";
import {
  Activity, ArrowDownLeft, ArrowRightLeft, ArrowUpRight, CalendarDays,
  Check, ChevronRight, CircleAlert, CircleCheck, Clock3, Coins, Edit3,
  FileClock, FilePlus2, Landmark, Loader2, LockKeyhole, Plus, RefreshCw,
  Search, ShieldCheck, Trash2, TrendingDown, TrendingUp, X, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useCreateCurrency, useCreateExchangeRate, useCreateRevaluation,
  useDeleteCurrency, useDeleteExchangeRate, useDeleteRevaluation,
  useExchangeRates, useFinanceCurrencies, useMultiCurrencyPermissions,
  useMultiCurrencySummary, useRevaluationAction, useRevaluationDetail,
  useRevaluationRuns, useUpdateCurrency, useUpdateExchangeRate,
  useUpdateRevaluation, type CurrencyFormValues, type FinanceCurrency,
  type FinanceExchangeRate, type FxRateType, type RevaluationFormValues,
  type RevaluationLineInput, type RevaluationRun,
} from "@/hooks/useMultiCurrency";
import { useAccounts } from "@/hooks/useChartOfAccounts";
import { useIntercompanyAccounts, useIntercompanyCompanies } from "@/hooks/useIntercompany";

const TODAY = new Date().toISOString().slice(0, 10);
const INK = "bg-[#0c1520] border border-[#223447]";
const FIELD = "bg-[#111e2d] border-[#2b4054] text-white placeholder:text-white/25 focus-visible:ring-[#d59b52]/40 focus-visible:border-[#d59b52]/70";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function money(value: number | string, currency = "USD") {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(numeric);
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">{label}</label>
        {hint && <span className="text-[10px] text-white/25">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NativeSelect({ value, onChange, children, className, disabled = false }: {
  value: string | number; onChange: (value: string) => void; children: ReactNode;
  className?: string; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
      className={cn("h-9 w-full rounded-md border px-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45", FIELD, className)}>
      {children}
    </select>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-[#4cb890]/30 bg-[#4cb890]/10 text-[#7cdbb6]",
    inactive: "border-white/10 bg-white/[0.05] text-white/45",
    draft: "border-[#d59b52]/30 bg-[#d59b52]/10 text-[#f0be78]",
    posted: "border-[#4cb890]/30 bg-[#4cb890]/10 text-[#7cdbb6]",
    void: "border-[#e27b7b]/30 bg-[#e27b7b]/10 text-[#efaaaa]",
  };
  return <Badge className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize", styles[status] ?? styles.inactive)}>{status}</Badge>;
}

function SkeletonRows({ columns = 5 }: { columns?: number }) {
  return (
    <div className="space-y-3 p-5" data-testid="state-loading">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: columns }).map((_, index) => <div key={index} className="h-4 flex-1 animate-pulse rounded bg-white/[0.06]" />)}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail, action }: {
  icon: typeof Coins; title: string; detail: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center" data-testid="state-empty">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d59b52]/20 bg-[#d59b52]/[0.08]">
        <Icon className="h-5 w-5 text-[#d59b52]" />
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-white/35">{detail}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ErrorState({ onRetry, detail = "The finance service could not return this data." }: { onRetry: () => void; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" data-testid="state-error">
      <CircleAlert className="mb-3 h-6 w-6 text-[#e27b7b]" />
      <p className="text-sm font-semibold text-white">Could not load this view</p>
      <p className="mt-1 text-xs text-white/35">{detail}</p>
      <Button size="sm" variant="outline" onClick={onRetry} data-testid="button-retry-multi-currency"
        className="mt-4 border-white/10 bg-transparent text-white/65 hover:bg-white/[0.06] hover:text-white">
        <RefreshCw className="h-3.5 w-3.5" />Try again
      </Button>
    </div>
  );
}

function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", destructive = false, onClose, onConfirm, busy }: {
  open: boolean; title: string; description: string; confirmLabel?: string; destructive?: boolean;
  onClose: () => void; onConfirm: () => void; busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="border-[#2b4054] bg-[#0d1926] text-white sm:max-w-md">
        <DialogHeader><DialogTitle className="text-white">{title}</DialogTitle><DialogDescription className="text-white/45">{description}</DialogDescription></DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} data-testid="button-cancel-confirm"
            className="border-white/10 bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white">Cancel</Button>
          <Button onClick={onConfirm} disabled={busy} data-testid="button-confirm-action"
            className={destructive ? "bg-[#b95858] text-white hover:bg-[#a94b4b]" : "bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyDialog({ open, onClose, editCurrency, canEdit, onSaved }: {
  open: boolean; onClose: () => void; editCurrency: FinanceCurrency | null; canEdit: boolean; onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const create = useCreateCurrency();
  const update = useUpdateCurrency();
  const [form, setForm] = useState<CurrencyFormValues>({ code: "", name: "", symbol: "", decimalPlaces: 2, status: "active" });
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;

  function openForm() {
    setError("");
    setForm(editCurrency ? {
      code: editCurrency.code, name: editCurrency.name, symbol: editCurrency.symbol,
      decimalPlaces: editCurrency.decimalPlaces, status: editCurrency.status,
    } : { code: "", name: "", symbol: "", decimalPlaces: 2, status: "active" });
  }
  function save() {
    setError("");
    const data = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim(), symbol: form.symbol.trim() };
    if (!data.code || data.code.length !== 3) { setError("Use a three-letter ISO currency code."); return; }
    if (!data.name || !data.symbol) { setError("Name and symbol are required."); return; }
    const request = editCurrency ? update.mutateAsync({ id: editCurrency.id, data }) : create.mutateAsync(data);
    request.then(() => { onSaved(editCurrency ? "Currency updated" : "Currency added"); onClose(); })
      .catch((err) => { setError(errorMessage(err, "Could not save currency.")); toast({ title: "Currency save failed", description: errorMessage(err, "Please try again."), variant: "destructive" }); });
  }
  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) openForm(); else if (!busy) onClose(); }}>
      <DialogContent className="border-[#2b4054] bg-[#0d1926] text-white sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-white">{editCurrency ? "Edit currency" : "Add currency"}</DialogTitle><DialogDescription className="text-white/45">Keep the currency master explicit. ISO codes are normalized before saving.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ISO code"><Input value={form.code} maxLength={3} onChange={(event) => setForm({ ...form, code: event.target.value })} className={FIELD} placeholder="EUR" data-testid="input-currency-code" /></Field>
          <Field label="Symbol"><Input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} className={FIELD} placeholder="€" data-testid="input-currency-symbol" /></Field>
          <div className="col-span-2"><Field label="Currency name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={FIELD} placeholder="Euro" data-testid="input-currency-name" /></Field></div>
          <Field label="Decimal places"><Input type="number" min={0} max={4} value={form.decimalPlaces} onChange={(event) => setForm({ ...form, decimalPlaces: Number(event.target.value) })} className={FIELD} data-testid="input-currency-decimals" /></Field>
          <Field label="Status"><NativeSelect value={form.status} onChange={(value) => setForm({ ...form, status: value as CurrencyFormValues["status"] })} data-testid="select-currency-status"><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></Field>
        </div>
        {error && <p className="text-xs text-[#efaaaa]" data-testid="error-currency-form">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} data-testid="button-cancel-currency" className="border-white/10 bg-transparent text-white/60 hover:text-white">Cancel</Button>
          <Button onClick={save} disabled={busy || !canEdit} data-testid="button-save-currency" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editCurrency ? "Save currency" : "Add currency"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RateDialog({ open, onClose, editRate, currencies, canEdit, onSaved }: {
  open: boolean; onClose: () => void; editRate: FinanceExchangeRate | null; currencies: FinanceCurrency[]; canEdit: boolean; onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const create = useCreateExchangeRate();
  const update = useUpdateExchangeRate();
  const defaults = { fromCurrency: "USD", toCurrency: "EUR", rate: 1, effectiveDate: TODAY, rateType: "spot" as FxRateType, source: "Manual treasury input", status: "active" as const, notes: "" };
  const [form, setForm] = useState(defaults);
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;
  function reset() {
    setError("");
    setForm(editRate ? { fromCurrency: editRate.fromCurrency, toCurrency: editRate.toCurrency, rate: Number(editRate.rate), effectiveDate: editRate.effectiveDate.slice(0, 10), rateType: editRate.rateType, source: editRate.source, status: editRate.status, notes: editRate.notes ?? "" } : defaults);
  }
  function save() {
    setError("");
    if (form.fromCurrency === form.toCurrency) { setError("From and to currencies must be different."); return; }
    if (!form.rate || form.rate <= 0) { setError("Rate must be greater than zero."); return; }
    if (!form.effectiveDate || !form.source.trim()) { setError("Effective date and source are required."); return; }
    const data = { ...form, source: form.source.trim(), notes: form.notes?.trim() || null };
    (editRate ? update.mutateAsync({ id: editRate.id, data }) : create.mutateAsync(data))
      .then(() => { onSaved(editRate ? "Exchange rate updated" : "Exchange rate added"); onClose(); })
      .catch((err) => { setError(errorMessage(err, "Could not save exchange rate.")); toast({ title: "Rate save failed", description: errorMessage(err, "Please try again."), variant: "destructive" }); });
  }
  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) reset(); else if (!busy) onClose(); }}>
      <DialogContent className="border-[#2b4054] bg-[#0d1926] text-white sm:max-w-xl">
        <DialogHeader><DialogTitle className="text-white">{editRate ? "Edit exchange rate" : "Add exchange rate"}</DialogTitle><DialogDescription className="text-white/45">An effective-dated rate is part of the audit trail. Record its source and valuation convention.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From currency"><NativeSelect value={form.fromCurrency} onChange={(value) => setForm({ ...form, fromCurrency: value })} data-testid="select-rate-from">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}</NativeSelect></Field>
          <Field label="To currency"><NativeSelect value={form.toCurrency} onChange={(value) => setForm({ ...form, toCurrency: value })} data-testid="select-rate-to">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}</NativeSelect></Field>
          <Field label="Rate"><Input type="number" min={0} step="0.000001" value={form.rate} onChange={(event) => setForm({ ...form, rate: Number(event.target.value) })} className={FIELD} data-testid="input-rate-value" /></Field>
          <Field label="Effective date"><Input type="date" value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} className={FIELD} data-testid="input-rate-date" /></Field>
          <Field label="Rate type"><NativeSelect value={form.rateType} onChange={(value) => setForm({ ...form, rateType: value as FxRateType })} data-testid="select-rate-type"><option value="spot">Spot</option><option value="closing">Closing</option><option value="average">Average</option></NativeSelect></Field>
          <Field label="Status"><NativeSelect value={form.status} onChange={(value) => setForm({ ...form, status: value as "active" | "inactive" })} data-testid="select-rate-status"><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></Field>
          <div className="col-span-2"><Field label="Source"><Input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className={FIELD} placeholder="Treasury feed, central bank, or manual source" data-testid="input-rate-source" /></Field></div>
          <div className="col-span-2"><Field label="Notes" hint="Optional"><Textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={cn(FIELD, "min-h-[72px]")} placeholder="Context for reviewers" data-testid="input-rate-notes" /></Field></div>
        </div>
        {error && <p className="text-xs text-[#efaaaa]" data-testid="error-rate-form">{error}</p>}
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose} disabled={busy} data-testid="button-cancel-rate" className="border-white/10 bg-transparent text-white/60 hover:text-white">Cancel</Button><Button onClick={save} disabled={busy || !canEdit} data-testid="button-save-rate" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editRate ? "Save rate" : "Add rate"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevaluationDialog({ open, onClose, editRun, currencies, companies, accounts, canEdit, onSaved }: {
  open: boolean; onClose: () => void; editRun: RevaluationRun | null; currencies: FinanceCurrency[]; companies: { id: number; name: string }[]; accounts: { id: number; code: string; name: string }[]; canEdit: boolean; onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const create = useCreateRevaluation();
  const update = useUpdateRevaluation();
  const defaultOrg = companies[0]?.id ?? 0;
  const defaultAccount = accounts[0]?.id ?? 0;
  const makeLine = (): RevaluationLineInput => ({ accountId: defaultAccount, currency: currencies.find((item) => item.code !== "USD")?.code ?? "EUR", foreignBalance: 0, previousRate: 1, currentRate: 1 });
  const [form, setForm] = useState<RevaluationFormValues>({ orgId: defaultOrg, valuationDate: TODAY, baseCurrency: "USD", gainLossAccountId: defaultAccount, notes: "", lines: [makeLine()] });
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;
  function reset() {
    setError("");
    if (editRun) {
      setForm({ orgId: editRun.orgId, valuationDate: editRun.valuationDate.slice(0, 10), baseCurrency: editRun.baseCurrency, gainLossAccountId: editRun.gainLossAccountId, notes: editRun.notes ?? "", lines: editRun.lines?.map((line) => ({ accountId: line.accountId, currency: line.currency, foreignBalance: Number(line.foreignBalance), previousRate: Number(line.previousRate), currentRate: Number(line.currentRate) })) ?? [makeLine()] });
    } else setForm({ orgId: defaultOrg, valuationDate: TODAY, baseCurrency: "USD", gainLossAccountId: defaultAccount, notes: "", lines: [makeLine()] });
  }
  function updateLine(index: number, patch: Partial<RevaluationLineInput>) {
    setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) }));
  }
  function save() {
    setError("");
    if (!form.orgId || !form.gainLossAccountId) { setError("Organization and gain/loss account are required."); return; }
    if (!form.valuationDate || form.lines.length === 0) { setError("Add at least one exposure line."); return; }
    if (form.lines.some((line) => !line.accountId || !line.currency || line.foreignBalance === 0 || line.previousRate <= 0 || line.currentRate <= 0)) { setError("Complete each exposure line with positive balances and rates."); return; }
    (editRun ? update.mutateAsync({ id: editRun.id, data: form }) : create.mutateAsync(form))
      .then(() => { onSaved(editRun ? "Revaluation draft updated" : "Revaluation draft created"); onClose(); })
      .catch((err) => { setError(errorMessage(err, "Could not save revaluation.")); toast({ title: "Revaluation save failed", description: errorMessage(err, "Please try again."), variant: "destructive" }); });
  }
  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) reset(); else if (!busy) onClose(); }}>
      <DialogContent className="max-w-4xl border-[#2b4054] bg-[#0d1926] text-white">
        <DialogHeader><DialogTitle className="text-white">{editRun ? "Edit revaluation draft" : "New revaluation run"}</DialogTitle><DialogDescription className="text-white/45">Build the exposure lines first. Posting is a separate, deliberate ledger action.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Organization"><NativeSelect value={form.orgId} onChange={(value) => setForm({ ...form, orgId: Number(value) })} data-testid="select-revaluation-org">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</NativeSelect></Field>
          <Field label="Valuation date"><Input type="date" value={form.valuationDate} onChange={(event) => setForm({ ...form, valuationDate: event.target.value })} className={FIELD} data-testid="input-revaluation-date" /></Field>
          <Field label="Base currency"><NativeSelect value={form.baseCurrency} onChange={(value) => setForm({ ...form, baseCurrency: value })} data-testid="select-revaluation-base">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</NativeSelect></Field>
          <Field label="Gain/loss account"><NativeSelect value={form.gainLossAccountId} onChange={(value) => setForm({ ...form, gainLossAccountId: Number(value) })} data-testid="select-revaluation-account">{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</NativeSelect></Field>
        </div>
        <div className="rounded-lg border border-white/[0.08]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><div><p className="text-xs font-semibold text-white">Exposure lines</p><p className="text-[11px] text-white/35">Functional impact is calculated from the two effective rates.</p></div><Button size="sm" variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, makeLine()] })} data-testid="button-add-exposure-line" className="border-[#d59b52]/30 bg-transparent text-[#e5ad66] hover:bg-[#d59b52]/10"><Plus className="h-3.5 w-3.5" />Add line</Button></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.12em] text-white/35"><th className="px-4 py-2">Account</th><th className="px-2 py-2">Currency</th><th className="px-2 py-2">Foreign balance</th><th className="px-2 py-2">Previous rate</th><th className="px-2 py-2">Current rate</th><th className="w-10 px-2 py-2" /></tr></thead><tbody>
              {form.lines.map((line, index) => <tr key={index} className="border-b border-white/[0.05] last:border-0"><td className="px-4 py-2"><NativeSelect value={line.accountId} onChange={(value) => updateLine(index, { accountId: Number(value) })} data-testid={`select-exposure-account-${index}`}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</NativeSelect></td><td className="px-2 py-2"><NativeSelect value={line.currency} onChange={(value) => updateLine(index, { currency: value })} data-testid={`select-exposure-currency-${index}`}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</NativeSelect></td><td className="px-2 py-2"><Input type="number" value={line.foreignBalance} onChange={(event) => updateLine(index, { foreignBalance: Number(event.target.value) })} className={FIELD} data-testid={`input-exposure-balance-${index}`} /></td><td className="px-2 py-2"><Input type="number" step="0.000001" value={line.previousRate} onChange={(event) => updateLine(index, { previousRate: Number(event.target.value) })} className={FIELD} data-testid={`input-exposure-previous-rate-${index}`} /></td><td className="px-2 py-2"><Input type="number" step="0.000001" value={line.currentRate} onChange={(event) => updateLine(index, { currentRate: Number(event.target.value) })} className={FIELD} data-testid={`input-exposure-current-rate-${index}`} /></td><td className="px-2 py-2">{form.lines.length > 1 && <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })} data-testid={`button-remove-exposure-line-${index}`} className="h-8 w-8 text-white/35 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]"><X className="h-3.5 w-3.5" /></Button>}</td></tr>)}
            </tbody></table>
          </div>
        </div>
        <Field label="Notes" hint="Optional"><Textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={cn(FIELD, "min-h-[56px]")} placeholder="Explain the valuation convention or review context" data-testid="input-revaluation-notes" /></Field>
        {error && <p className="text-xs text-[#efaaaa]" data-testid="error-revaluation-form">{error}</p>}
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose} disabled={busy} data-testid="button-cancel-revaluation" className="border-white/10 bg-transparent text-white/60 hover:text-white">Cancel</Button><Button onClick={save} disabled={busy || !canEdit} data-testid="button-save-revaluation" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editRun ? "Save draft" : "Create draft"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MultiCurrencyTab() {
  const permissions = useMultiCurrencyPermissions();
  const summary = useMultiCurrencySummary();
  const currenciesQuery = useFinanceCurrencies();
  const [rateSearch, setRateSearch] = useState("");
  const ratesQuery = useExchangeRates({ search: rateSearch || undefined });
  const revaluationsQuery = useRevaluationRuns();
  const accountsQuery = useAccounts({ status: "active", limit: 100 });
  const companiesQuery = useIntercompanyCompanies();
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>(undefined);
  const intercompanyAccountsQuery = useIntercompanyAccounts(selectedOrgId);
  const detailQuery = useRevaluationDetail(undefined);
  const convert = useConvertCurrency();
  const deleteCurrency = useDeleteCurrency();
  const deleteRate = useDeleteExchangeRate();
  const deleteRevaluation = useDeleteRevaluation();
  const action = useRevaluationAction();
  const { toast } = useToast();
  const [view, setView] = useState<"master" | "rates" | "converter" | "revaluation">("master");
  const [currencyDialog, setCurrencyDialog] = useState(false);
  const [rateDialog, setRateDialog] = useState(false);
  const [revaluationDialog, setRevaluationDialog] = useState(false);
  const [editCurrency, setEditCurrency] = useState<FinanceCurrency | null>(null);
  const [editRate, setEditRate] = useState<FinanceExchangeRate | null>(null);
  const [editRun, setEditRun] = useState<RevaluationRun | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "currency" | "rate" | "revaluation"; id: number; label: string } | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | undefined>(undefined);
  const [converter, setConverter] = useState({ fromCurrency: "USD", toCurrency: "EUR", amount: "1000", asOfDate: TODAY, rateType: "spot" as FxRateType });
  const currencies = currenciesQuery.data?.data ?? [];
  const rates = ratesQuery.data?.data ?? [];
  const runs = revaluationsQuery.data?.data ?? [];
  const companies = companiesQuery.data?.data ?? [];
  const accountData = accountsQuery.data?.data ?? [];
  const intercompanyAccounts = intercompanyAccountsQuery.data?.data ?? [];
  const accountOptions = useMemo(() => (intercompanyAccounts.length ? intercompanyAccounts : accountData).map((account) => ({ id: account.id, code: account.code, name: account.name })), [intercompanyAccounts, accountData]);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;
  const selectedDetail = detailQuery.data?.data ?? selectedRun;
  const canView = permissions.data?.data?.canView ?? false;
  const canCreate = permissions.data?.data?.canCreate ?? false;
  const canEdit = permissions.data?.data?.canEdit ?? false;
  const canDelete = permissions.data?.data?.canDelete ?? false;
  const totalExposure = selectedDetail?.lines?.reduce((sum, line) => sum + Number(line.gainLoss), 0) ?? 0;

  function openCurrency(currency: FinanceCurrency | null) { setEditCurrency(currency); setCurrencyDialog(true); }
  function openRate(rate: FinanceExchangeRate | null) { setEditRate(rate); setRateDialog(true); }
  function openRevaluation(run: RevaluationRun | null) { setEditRun(run); setRevaluationDialog(true); }
  function notify(message: string) { toast({ title: message }); }
  function removeTarget() {
    if (!deleteTarget) return;
    const request = deleteTarget.kind === "currency" ? deleteCurrency.mutateAsync(deleteTarget.id) : deleteTarget.kind === "rate" ? deleteRate.mutateAsync(deleteTarget.id) : deleteRevaluation.mutateAsync(deleteTarget.id);
    request.then(() => { notify(`${deleteTarget.label} deleted`); setDeleteTarget(null); }).catch((err) => toast({ title: "Delete failed", description: errorMessage(err, "Please try again."), variant: "destructive" }));
  }
  function convertAmount() {
    if (converter.fromCurrency === converter.toCurrency || !Number(converter.amount)) return;
    convert.mutate({ fromCurrency: converter.fromCurrency, toCurrency: converter.toCurrency, amount: Number(converter.amount), asOfDate: converter.asOfDate, rateType: converter.rateType }, {
      onError: (err) => toast({ title: "Conversion failed", description: errorMessage(err, "No rate was found for this date."), variant: "destructive" }),
    });
  }
  function runAction(run: RevaluationRun, actionName: "post" | "void") {
    action.mutate({ id: run.id, action: actionName }, { onSuccess: () => notify(actionName === "post" ? `${run.runNumber} posted to ledger` : `${run.runNumber} voided`), onError: (err) => toast({ title: "Revaluation action failed", description: errorMessage(err, "Please try again."), variant: "destructive" }) });
  }

  if (permissions.isLoading) return <div className="rounded-xl border border-[#223447] bg-[#0c1520]"><SkeletonRows columns={4} /></div>;
  if (permissions.isError) return <div className={cn(INK, "rounded-xl")}><ErrorState onRetry={() => permissions.refetch()} /></div>;
  if (!canView) return <div className={cn(INK, "rounded-xl")}><EmptyState icon={LockKeyhole} title="Multi-currency access is restricted" detail="Ask a Finance administrator for permission to view rates, conversions, and revaluation runs." /></div>;

  const nav = [
    { id: "master" as const, label: "Currency master", count: summary.data?.data?.activeCurrencyCount, icon: Coins },
    { id: "rates" as const, label: "Exchange rates", count: summary.data?.data?.activeRateCount, icon: Activity },
    { id: "converter" as const, label: "Amount converter", icon: ArrowRightLeft },
    { id: "revaluation" as const, label: "Revaluation runs", count: summary.data?.data?.draftRevaluationCount, icon: FileClock },
  ];

  return (
    <div className="space-y-4 pb-8" data-testid="multi-currency-tab">
      <div className="relative overflow-hidden rounded-2xl border border-[#29445a] bg-[#0c1824] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border-[30px] border-[#d59b52]/[0.08]" />
        <div className="pointer-events-none absolute -bottom-32 right-24 h-52 w-52 rounded-full border-[20px] border-[#4cb890]/[0.06]" />
        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d59b52]"><ShieldCheck className="h-3.5 w-3.5" />Controlled foreign exchange</div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Multi-currency control room</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-white/42">Rates, conversions, and revaluations with an explicit audit trail for every functional-currency decision.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-3 sm:grid-cols-4">
            {[
              ["Active currencies", summary.data?.data?.activeCurrencyCount ?? "—", Coins],
              ["Live rates", summary.data?.data?.activeRateCount ?? "—", Activity],
              ["Draft reviews", summary.data?.data?.draftRevaluationCount ?? "—", FileClock],
              ["Posted gain / loss", summary.data?.data ? money(summary.data.data.postedGainLoss) : "—", TrendingUp],
            ].map(([label, value, Icon]) => <div key={String(label)} data-testid={`metric-${String(label).toLowerCase().replaceAll(" ", "-")}`}><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/35"><Icon className="h-3 w-3 text-[#4cb890]" />{label}</div><p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{value}</p></div>)}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#223447] bg-[#0c1520] p-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {nav.map(({ id, label, count, icon: Icon }) => <button key={id} onClick={() => setView(id)} data-testid={`tab-${id}`} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all", view === id ? "bg-[#d59b52] text-[#1a1209] shadow-[0_4px_18px_rgba(213,155,82,0.16)]" : "text-white/45 hover:bg-white/[0.05] hover:text-white")}><Icon className="h-3.5 w-3.5" />{label}{count !== undefined && <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", view === id ? "bg-[#1a1209]/10" : "bg-white/[0.06]")}>{count}</span>}</button>)}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="hidden text-[10px] uppercase tracking-wider text-white/25 sm:inline">Last rate date</span>
          <span className="font-mono text-xs text-white/55">{dateLabel(summary.data?.data?.latestRateDate)}</span>
          <Button size="icon" variant="ghost" onClick={() => { currenciesQuery.refetch(); ratesQuery.refetch(); revaluationsQuery.refetch(); summary.refetch(); }} data-testid="button-refresh-multi-currency" className="h-8 w-8 text-white/40 hover:bg-white/[0.06] hover:text-white"><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {view === "master" && <section className={cn(INK, "overflow-hidden rounded-xl")} data-testid="section-currency-master">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Coins className="h-4 w-4 text-[#d59b52]" /><h3 className="text-sm font-semibold text-white">Currency master</h3></div><p className="mt-1 text-xs text-white/35">Functional and transactional currencies available to this organization.</p></div><Button onClick={() => openCurrency(null)} disabled={!canCreate} data-testid="button-add-currency" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" />Add currency</Button></div>
        {currenciesQuery.isLoading ? <SkeletonRows columns={6} /> : currenciesQuery.isError ? <ErrorState onRetry={() => currenciesQuery.refetch()} /> : currencies.length === 0 ? <EmptyState icon={Coins} title="No currencies configured" detail="Add the currencies your entities transact in before loading exchange rates." action={<Button onClick={() => openCurrency(null)} disabled={!canCreate} data-testid="button-empty-add-currency" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" />Add first currency</Button>} /> :
          <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3">Currency</th><th className="px-3 py-3">ISO</th><th className="px-3 py-3">Decimals</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>
            {currencies.map((currency) => <tr key={currency.id} className="group border-b border-white/[0.045] transition-colors last:border-0 hover:bg-white/[0.025]" data-testid={`row-currency-${currency.id}`}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d59b52]/10 font-mono text-sm font-semibold text-[#e5ad66]">{currency.symbol}</span><div><p className="text-sm font-medium text-white">{currency.name}</p><p className="text-[11px] text-white/32">Updated {dateLabel(currency.updatedAt)}</p></div></div></td><td className="px-3 py-3.5 font-mono text-xs font-semibold text-white/75">{currency.code}</td><td className="px-3 py-3.5 font-mono text-xs text-white/60">{currency.decimalPlaces}</td><td className="px-3 py-3.5">{currency.isSystem ? <span className="inline-flex items-center gap-1 text-[11px] text-[#4cb890]"><ShieldCheck className="h-3 w-3" />System</span> : <span className="text-[11px] text-white/42">Custom</span>}</td><td className="px-3 py-3.5"><StatusPill status={currency.status} /></td><td className="px-3 py-3.5"><div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"><Button size="icon" variant="ghost" onClick={() => openCurrency(currency)} disabled={!canEdit} data-testid={`button-edit-currency-${currency.id}`} className="h-8 w-8 text-white/45 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "currency", id: currency.id, label: currency.code })} disabled={!canDelete || currency.isSystem} data-testid={`button-delete-currency-${currency.id}`} className="h-8 w-8 text-white/35 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}
          </tbody></table></div>}
      </section>}

      {view === "rates" && <section className={cn(INK, "overflow-hidden rounded-xl")} data-testid="section-exchange-rates">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#4cb890]" /><h3 className="text-sm font-semibold text-white">Effective-dated exchange rates</h3></div><p className="mt-1 text-xs text-white/35">One rate, one date, one source of truth. Future-dated rates are ready for the next close.</p></div><div className="flex items-center gap-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" /><Input value={rateSearch} onChange={(event) => setRateSearch(event.target.value)} placeholder="Search pair or source" data-testid="input-search-rates" className={cn(FIELD, "h-8 w-48 pl-8 text-xs")} /></div><Button onClick={() => openRate(null)} disabled={!canCreate} data-testid="button-add-rate" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" />Add rate</Button></div></div>
        {ratesQuery.isLoading ? <SkeletonRows columns={7} /> : ratesQuery.isError ? <ErrorState onRetry={() => ratesQuery.refetch()} /> : rates.length === 0 ? <EmptyState icon={Activity} title="No exchange rates match" detail="Add a spot, closing, or average rate to make conversion and revaluation available." action={<Button onClick={() => openRate(null)} disabled={!canCreate} data-testid="button-empty-add-rate" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" />Add first rate</Button>} /> :
          <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3">Pair</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3">Effective date</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>
            {rates.map((rate) => <tr key={rate.id} className="group border-b border-white/[0.045] transition-colors last:border-0 hover:bg-white/[0.025]" data-testid={`row-rate-${rate.id}`}><td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-white">{rate.fromCurrency}</span><ArrowRightLeft className="h-3 w-3 text-[#d59b52]" /><span className="font-mono text-xs font-semibold text-white">{rate.toCurrency}</span></div></td><td className="px-3 py-3.5 font-mono text-sm tabular-nums text-[#e5ad66]">{Number(rate.rate).toFixed(6)}</td><td className="px-3 py-3.5 text-xs text-white/60">{dateLabel(rate.effectiveDate)}</td><td className="px-3 py-3.5"><span className="rounded bg-white/[0.06] px-2 py-1 text-[10px] capitalize text-white/55">{rate.rateType}</span></td><td className="max-w-[190px] truncate px-3 py-3.5 text-xs text-white/45">{rate.source}</td><td className="px-3 py-3.5"><StatusPill status={rate.status} /></td><td className="px-3 py-3.5"><div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"><Button size="icon" variant="ghost" onClick={() => openRate(rate)} disabled={!canEdit} data-testid={`button-edit-rate-${rate.id}`} className="h-8 w-8 text-white/45 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "rate", id: rate.id, label: `${rate.fromCurrency}/${rate.toCurrency} rate` })} disabled={!canDelete} data-testid={`button-delete-rate-${rate.id}`} className="h-8 w-8 text-white/35 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}
          </tbody></table></div>}
      </section>}

      {view === "converter" && <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]" data-testid="section-amount-converter">
        <div className={cn(INK, "rounded-xl p-5 sm:p-6")}><div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#d59b52]" /><h3 className="text-sm font-semibold text-white">Live amount converter</h3></div><p className="mt-1 text-xs text-white/35">Uses the same effective-dated rate service that powers posting and close.</p></div><span className="flex items-center gap-1.5 rounded-md border border-[#4cb890]/20 bg-[#4cb890]/[0.08] px-2 py-1 text-[10px] text-[#7cdbb6]"><span className="h-1.5 w-1.5 rounded-full bg-[#4cb890]" />Live endpoint</span></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end"><Field label="From"><NativeSelect value={converter.fromCurrency} onChange={(value) => setConverter({ ...converter, fromCurrency: value })} data-testid="select-converter-from">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}</NativeSelect></Field><div className="hidden h-9 items-center justify-center md:flex"><ArrowRightLeft className="h-4 w-4 text-[#d59b52]" /></div><Field label="To"><NativeSelect value={converter.toCurrency} onChange={(value) => setConverter({ ...converter, toCurrency: value })} data-testid="select-converter-to">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}</NativeSelect></Field></div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"><Field label="Amount"><Input type="number" min={0} value={converter.amount} onChange={(event) => setConverter({ ...converter, amount: event.target.value })} className={FIELD} data-testid="input-converter-amount" /></Field><Field label="As of date"><Input type="date" value={converter.asOfDate} onChange={(event) => setConverter({ ...converter, asOfDate: event.target.value })} className={FIELD} data-testid="input-converter-date" /></Field><Field label="Rate type"><NativeSelect value={converter.rateType} onChange={(value) => setConverter({ ...converter, rateType: value as FxRateType })} data-testid="select-converter-rate-type"><option value="spot">Spot</option><option value="closing">Closing</option><option value="average">Average</option></NativeSelect></Field></div>
          <Button onClick={convertAmount} disabled={convert.isPending || converter.fromCurrency === converter.toCurrency || !Number(converter.amount)} data-testid="button-convert-amount" className="mt-5 bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">{convert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Convert amount</Button>
        </div>
        <div className={cn(INK, "flex min-h-[250px] flex-col justify-between rounded-xl p-5 sm:p-6)}><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Conversion result</p>{convert.data?.data ? <div className="mt-5" data-testid="conversion-result"><p className="font-mono text-3xl font-semibold tracking-tight text-white">{money(convert.data.data.convertedAmount, converter.toCurrency)}</p><p className="mt-2 font-mono text-xs text-white/45">{money(convert.data.data.amount, converter.fromCurrency)} = {convert.data.data.rate.toFixed(6)} {converter.toCurrency}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4"><div><p className="text-[10px] uppercase tracking-wider text-white/30">Direction</p><p className="mt-1 text-xs capitalize text-[#7cdbb6]">{convert.data.data.direction}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/30">Rate date</p><p className="mt-1 text-xs text-white/65">{dateLabel(convert.data.data.rateDate)}</p></div></div></div> : <div className="mt-12 text-center"><ArrowRightLeft className="mx-auto h-7 w-7 text-white/15" /><p className="mt-3 text-sm text-white/55">Ready to convert</p><p className="mt-1 text-xs text-white/30">Choose a pair and valuation date to see the live result.</p></div>}</div><div className="flex items-center gap-2 border-t border-white/[0.07] pt-4 text-[11px] text-white/30"><ShieldCheck className="h-3.5 w-3.5 text-[#4cb890]" />Result uses the selected rate convention</div></div>
      </section>}

      {view === "revaluation" && <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]" data-testid="section-revaluation-runs">
        <div className={cn(INK, "overflow-hidden rounded-xl")}><div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><FileClock className="h-4 w-4 text-[#d59b52]" /><h3 className="text-sm font-semibold text-white">Revaluation runs</h3></div><p className="mt-1 text-xs text-white/35">Review drafts before an explicit post-to-ledger action.</p></div><Button onClick={() => openRevaluation(null)} disabled={!canCreate} data-testid="button-add-revaluation" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><FilePlus2 className="h-3.5 w-3.5" />New draft</Button></div>
          {revaluationsQuery.isLoading ? <SkeletonRows columns={6} /> : revaluationsQuery.isError ? <ErrorState onRetry={() => revaluationsQuery.refetch()} /> : runs.length === 0 ? <EmptyState icon={FileClock} title="No revaluation runs yet" detail="Create a draft to capture foreign-currency exposure for the next close." action={<Button onClick={() => openRevaluation(null)} disabled={!canCreate} data-testid="button-empty-add-revaluation" className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" />Create draft</Button>} /> :
            <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3">Run</th><th className="px-3 py-3">Valuation date</th><th className="px-3 py-3">Base</th><th className="px-3 py-3">Gain / loss</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} onClick={() => { setSelectedRunId(run.id); setSelectedOrgId(run.orgId); }} className={cn("group cursor-pointer border-b border-white/[0.045] transition-colors last:border-0 hover:bg-white/[0.035]", selectedRunId === run.id && "bg-[#d59b52]/[0.06]")} data-testid={`row-revaluation-${run.id}`}><td className="px-5 py-3.5"><p className="font-mono text-xs font-semibold text-white">{run.runNumber}</p><p className="mt-1 text-[11px] text-white/32">{run.organizationName}</p></td><td className="px-3 py-3.5 text-xs text-white/60">{dateLabel(run.valuationDate)}</td><td className="px-3 py-3.5 font-mono text-xs text-white/65">{run.baseCurrency}</td><td className={cn("px-3 py-3.5 font-mono text-xs tabular-nums", Number(run.totalGainLoss) >= 0 ? "text-[#7cdbb6]" : "text-[#efaaaa]")}>{money(run.totalGainLoss, run.baseCurrency)}</td><td className="px-3 py-3.5"><StatusPill status={run.status} /></td><td className="px-3 py-3.5"><div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}><Button size="icon" variant="ghost" onClick={() => openRevaluation(run)} disabled={!canEdit || run.status !== "draft"} data-testid={`button-edit-revaluation-${run.id}`} className="h-8 w-8 text-white/45 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "revaluation", id: run.id, label: run.runNumber })} disabled={!canDelete || run.status !== "draft"} data-testid={`button-delete-revaluation-${run.id}`} className="h-8 w-8 text-white/35 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]"><Trash2 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => runAction(run, "post")} disabled={!canEdit || run.status !== "draft" || action.isPending} data-testid={`button-post-revaluation-${run.id}`} className="h-8 w-8 text-[#7cdbb6]/70 hover:bg-[#4cb890]/10 hover:text-[#7cdbb6]"><ArrowUpRight className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => runAction(run, "void")} disabled={!canEdit || run.status === "void" || action.isPending} data-testid={`button-void-revaluation-${run.id}`} className="h-8 w-8 text-[#efaaaa]/60 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]"><X className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div>}
        </div>
        <div className={cn(INK, "min-h-[350px] rounded-xl p-5")} data-testid="revaluation-detail-panel"><div className="flex items-center justify-between border-b border-white/[0.07] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Run detail</p><p className="mt-1 text-sm font-semibold text-white">{selectedDetail?.runNumber ?? "Select a run"}</p></div>{selectedDetail && <StatusPill status={selectedDetail.status} />}</div>{selectedDetail ? <><div className="grid grid-cols-2 gap-4 border-b border-white/[0.07] py-4"><div><p className="text-[10px] uppercase tracking-wider text-white/30">Valuation date</p><p className="mt-1 text-xs text-white/70">{dateLabel(selectedDetail.valuationDate)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/30">Net impact</p><p className={cn("mt-1 font-mono text-sm", totalExposure >= 0 ? "text-[#7cdbb6]" : "text-[#efaaaa]")}>{money(totalExposure, selectedDetail.baseCurrency)}</p></div></div>{detailQuery.isLoading ? <SkeletonRows columns={3} /> : <div className="space-y-2 pt-4">{(selectedDetail.lines ?? []).map((line) => <div key={line.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3" data-testid={`detail-line-${line.id}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-white">{line.accountCode} · {line.accountName}</p><p className="mt-1 text-[11px] text-white/40">{line.currency} exposure · {Number(line.foreignBalance).toLocaleString()}</p></div><span className={cn("font-mono text-xs", Number(line.gainLoss) >= 0 ? "text-[#7cdbb6]" : "text-[#efaaaa]")}>{money(line.gainLoss, selectedDetail.baseCurrency)}</span></div><div className="mt-2 flex items-center gap-2 text-[10px] text-white/30"><span>{Number(line.previousRate).toFixed(5)}</span><ChevronRight className="h-3 w-3" /><span>{Number(line.currentRate).toFixed(5)}</span><span className="ml-auto">functional impact</span></div></div>)}</div></> : <div className="flex h-64 flex-col items-center justify-center text-center"><FileClock className="h-7 w-7 text-white/15" /><p className="mt-3 text-sm text-white/50">Choose a run to inspect exposure</p><p className="mt-1 max-w-[220px] text-xs leading-5 text-white/30">Every line keeps its source balance and both rates visible for review.</p></div>}</div>
      </section>}

      <CurrencyDialog open={currencyDialog} onClose={() => { setCurrencyDialog(false); setEditCurrency(null); }} editCurrency={editCurrency} canEdit={canEdit} onSaved={notify} />
      <RateDialog open={rateDialog} onClose={() => { setRateDialog(false); setEditRate(null); }} editRate={editRate} currencies={currencies} canEdit={canEdit} onSaved={notify} />
      <RevaluationDialog open={revaluationDialog} onClose={() => { setRevaluationDialog(false); setEditRun(null); }} editRun={editRun} currencies={currencies} companies={companies} accounts={accountOptions} canEdit={canEdit} onSaved={notify} />
      <ConfirmDialog open={deleteTarget !== null} title={`Delete ${deleteTarget?.label ?? "record"}?`} description="This action cannot be undone. Confirm only after checking that no downstream rate or ledger process depends on this record." confirmLabel="Delete record" destructive onClose={() => setDeleteTarget(null)} onConfirm={removeTarget} busy={deleteCurrency.isPending || deleteRate.isPending || deleteRevaluation.isPending} />
    </div>
  );
}