import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Coins,
  Edit3,
  FileClock,
  FilePlus2,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useChartOfAccounts";
import { useIntercompanyCompanies } from "@/hooks/useIntercompany";
import {
  useConvertCurrency,
  useCreateCurrency,
  useCreateExchangeRate,
  useCreateRevaluation,
  useDeleteCurrency,
  useDeleteExchangeRate,
  useDeleteRevaluation,
  useExchangeRates,
  useFinanceCurrencies,
  useMultiCurrencyPermissions,
  useMultiCurrencySummary,
  useRevaluationAction,
  useRevaluationDetail,
  useRevaluationRuns,
  useUpdateCurrency,
  useUpdateExchangeRate,
  useUpdateRevaluation,
  type CurrencyFormValues,
  type FinanceCurrency,
  type FinanceExchangeRate,
  type FxRateType,
  type RevaluationFormValues,
  type RevaluationLineInput,
  type RevaluationRun,
} from "@/hooks/useMultiCurrency";

const TODAY = new Date().toISOString().slice(0, 10);
const PANEL = "border border-[#223447] bg-[#0c1520]";
const FIELD =
  "border-[#2b4054] bg-[#111e2d] text-white placeholder:text-white/25 focus-visible:border-[#d59b52]/70 focus-visible:ring-[#d59b52]/40";

function getError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function money(value: number | string, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">
        {label}
        {hint && <span className="font-normal normal-case tracking-normal text-white/25">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn(
        "h-9 w-full rounded-md border px-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        FIELD,
      )}
    >
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
  return (
    <Badge
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize",
        styles[status] ?? styles.inactive,
      )}
    >
      {status}
    </Badge>
  );
}

function LoadingRows({ columns = 5 }: { columns?: number }) {
  return (
    <div className="space-y-3 p-5" data-testid="state-loading">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-4 flex-1 animate-pulse rounded bg-white/[0.06]" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: typeof Coins;
  title: string;
  detail: string;
  action?: ReactNode;
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

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" data-testid="state-error">
      <CircleAlert className="mb-3 h-6 w-6 text-[#e27b7b]" />
      <p className="text-sm font-semibold text-white">Could not load this view</p>
      <p className="mt-1 text-xs text-white/35">The finance service did not return this data.</p>
      <Button
        size="sm"
        variant="outline"
        onClick={retry}
        className="mt-4 border-white/10 bg-transparent text-white/65 hover:bg-white/[0.06] hover:text-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function CurrencyDialog({
  open,
  currency,
  canSave,
  onClose,
  onSaved,
}: {
  open: boolean;
  currency: FinanceCurrency | null;
  canSave: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const create = useCreateCurrency();
  const update = useUpdateCurrency();
  const { toast } = useToast();
  const [form, setForm] = useState<CurrencyFormValues>({
    code: "",
    name: "",
    symbol: "",
    decimalPlaces: 2,
    status: "active",
  });
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      currency
        ? {
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimalPlaces: currency.decimalPlaces,
            status: currency.status,
          }
        : { code: "", name: "", symbol: "", decimalPlaces: 2, status: "active" },
    );
  }, [open, currency]);

  async function save() {
    const data = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      symbol: form.symbol.trim(),
    };
    if (!/^[A-Z]{3}$/.test(data.code)) {
      setError("Use a three-letter ISO currency code.");
      return;
    }
    if (!data.name || !data.symbol) {
      setError("Name and symbol are required.");
      return;
    }
    setError("");
    try {
      if (currency) await update.mutateAsync({ id: currency.id, data });
      else await create.mutateAsync(data);
      onSaved(currency ? "Currency updated" : "Currency added");
      onClose();
    } catch (saveError) {
      const message = getError(saveError, "Could not save currency.");
      setError(message);
      toast({ title: "Currency save failed", description: message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent className="border-[#2b4054] bg-[#0d1926] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{currency ? "Edit currency" : "Add currency"}</DialogTitle>
          <DialogDescription className="text-white/45">
            Currency codes are normalized and protected by the database uniqueness rule.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ISO code">
            <Input
              value={form.code}
              maxLength={3}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className={FIELD}
              placeholder="EUR"
              disabled={Boolean(currency)}
              data-testid="input-currency-code"
            />
          </Field>
          <Field label="Symbol">
            <Input
              value={form.symbol}
              onChange={(event) => setForm({ ...form, symbol: event.target.value })}
              className={FIELD}
              placeholder="€"
              data-testid="input-currency-symbol"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Currency name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={FIELD}
                placeholder="Euro"
                data-testid="input-currency-name"
              />
            </Field>
          </div>
          <Field label="Decimal places">
            <Input
              type="number"
              min={0}
              max={6}
              value={form.decimalPlaces}
              onChange={(event) => setForm({ ...form, decimalPlaces: Number(event.target.value) })}
              className={FIELD}
              data-testid="input-currency-decimals"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value as CurrencyFormValues["status"] })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        {error && <p className="text-xs text-[#efaaaa]">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} className="border-white/10 bg-transparent text-white/60">
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !canSave} className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {currency ? "Save currency" : "Add currency"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RateDialog({
  open,
  rate,
  currencies,
  canSave,
  onClose,
  onSaved,
}: {
  open: boolean;
  rate: FinanceExchangeRate | null;
  currencies: FinanceCurrency[];
  canSave: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const create = useCreateExchangeRate();
  const update = useUpdateExchangeRate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    fromCurrency: "",
    toCurrency: "",
    rate: 1,
    effectiveDate: TODAY,
    rateType: "spot" as FxRateType,
    source: "Manual treasury input",
    status: "active" as "active" | "inactive",
    notes: "",
  });
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    const active = currencies.filter((item) => item.status === "active");
    setError("");
    setForm(
      rate
        ? {
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            rate: Number(rate.rate),
            effectiveDate: rate.effectiveDate.slice(0, 10),
            rateType: rate.rateType,
            source: rate.source,
            status: rate.status,
            notes: rate.notes ?? "",
          }
        : {
            fromCurrency: active[0]?.code ?? "",
            toCurrency: active[1]?.code ?? active[0]?.code ?? "",
            rate: 1,
            effectiveDate: TODAY,
            rateType: "spot",
            source: "Manual treasury input",
            status: "active",
            notes: "",
          },
    );
  }, [open, rate, currencies]);

  async function save() {
    if (!form.fromCurrency || !form.toCurrency || form.fromCurrency === form.toCurrency) {
      setError("Choose two different active currencies.");
      return;
    }
    if (!Number.isFinite(form.rate) || form.rate <= 0) {
      setError("Rate must be greater than zero.");
      return;
    }
    if (!form.effectiveDate || !form.source.trim()) {
      setError("Effective date and source are required.");
      return;
    }
    setError("");
    const data = { ...form, source: form.source.trim(), notes: form.notes.trim() || null };
    try {
      if (rate) await update.mutateAsync({ id: rate.id, data });
      else await create.mutateAsync(data);
      onSaved(rate ? "Exchange rate updated" : "Exchange rate added");
      onClose();
    } catch (saveError) {
      const message = getError(saveError, "Could not save exchange rate.");
      setError(message);
      toast({ title: "Rate save failed", description: message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent className="border-[#2b4054] bg-[#0d1926] text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">{rate ? "Edit exchange rate" : "Add exchange rate"}</DialogTitle>
          <DialogDescription className="text-white/45">
            Store the source and rate convention with every effective-dated value.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From currency">
            <Select value={form.fromCurrency} onChange={(value) => setForm({ ...form, fromCurrency: value })}>
              {currencies.filter((item) => item.status === "active").map((item) => (
                <option key={item.code} value={item.code}>{item.code} — {item.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="To currency">
            <Select value={form.toCurrency} onChange={(value) => setForm({ ...form, toCurrency: value })}>
              {currencies.filter((item) => item.status === "active").map((item) => (
                <option key={item.code} value={item.code}>{item.code} — {item.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Rate">
            <Input
              type="number"
              min={0}
              step="0.000001"
              value={form.rate}
              onChange={(event) => setForm({ ...form, rate: Number(event.target.value) })}
              className={FIELD}
              data-testid="input-rate-value"
            />
          </Field>
          <Field label="Effective date">
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })}
              className={FIELD}
              data-testid="input-rate-date"
            />
          </Field>
          <Field label="Rate type">
            <Select value={form.rateType} onChange={(value) => setForm({ ...form, rateType: value as FxRateType })}>
              <option value="spot">Spot</option>
              <option value="closing">Closing</option>
              <option value="average">Average</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(value) => setForm({ ...form, status: value as "active" | "inactive" })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label="Source">
              <Input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className={FIELD} placeholder="Central bank, treasury feed, or manual source" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes" hint="Optional">
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={cn(FIELD, "min-h-[72px]")} placeholder="Context for reviewers" />
            </Field>
          </div>
        </div>
        {error && <p className="text-xs text-[#efaaaa]">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} className="border-white/10 bg-transparent text-white/60">Cancel</Button>
          <Button onClick={save} disabled={busy || !canSave} className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {rate ? "Save rate" : "Add rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevaluationDialog({
  open,
  run,
  currencies,
  companies,
  accounts,
  canSave,
  onClose,
  onSaved,
}: {
  open: boolean;
  run: RevaluationRun | null;
  currencies: FinanceCurrency[];
  companies: { id: number; name: string; currency?: string | null }[];
  accounts: { id: number; code: string; name: string; type: string }[];
  canSave: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const create = useCreateRevaluation();
  const update = useUpdateRevaluation();
  const { toast } = useToast();
  const activeCurrencies = currencies.filter((item) => item.status === "active");
  const incomeExpense = accounts.filter((item) => item.type === "Income" || item.type === "Expense");
  const [form, setForm] = useState<RevaluationFormValues>({
    orgId: 0,
    valuationDate: TODAY,
    baseCurrency: "",
    gainLossAccountId: 0,
    notes: "",
    lines: [],
  });
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    const company = companies[0];
    const base = company?.currency?.toUpperCase() || activeCurrencies[0]?.code || "";
    const firstCurrency = activeCurrencies.find((item) => item.code !== base)?.code || activeCurrencies[0]?.code || "";
    setError("");
    setForm(
      run
        ? {
            orgId: run.orgId,
            valuationDate: run.valuationDate.slice(0, 10),
            baseCurrency: run.baseCurrency,
            gainLossAccountId: run.gainLossAccountId,
            notes: run.notes ?? "",
            lines: (run.lines ?? []).map((line) => ({
              accountId: line.accountId,
              currency: line.currency,
              foreignBalance: Number(line.foreignBalance),
              previousRate: Number(line.previousRate),
              currentRate: Number(line.currentRate),
            })),
          }
        : {
            orgId: company?.id ?? 0,
            valuationDate: TODAY,
            baseCurrency: base,
            gainLossAccountId: incomeExpense[0]?.id ?? 0,
            notes: "",
            lines: [{
              accountId: accounts[0]?.id ?? 0,
              currency: firstCurrency,
              foreignBalance: 0,
              previousRate: 1,
              currentRate: 1,
            }],
          },
    );
  }, [open, run, companies, currencies, accounts]);

  function updateLine(index: number, patch: Partial<RevaluationLineInput>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
    }));
  }

  async function save() {
    if (!form.orgId || !form.baseCurrency || !form.gainLossAccountId || form.lines.length === 0) {
      setError("Organization, base currency, gain/loss account, and one exposure line are required.");
      return;
    }
    if (form.lines.some((line) => !line.accountId || !line.currency || !Number.isFinite(line.foreignBalance) || line.foreignBalance === 0 || line.previousRate <= 0 || line.currentRate <= 0)) {
      setError("Complete every exposure line with a non-zero balance and positive rates.");
      return;
    }
    setError("");
    try {
      if (run) await update.mutateAsync({ id: run.id, data: form });
      else await create.mutateAsync(form);
      onSaved(run ? "Revaluation draft updated" : "Revaluation draft created");
      onClose();
    } catch (saveError) {
      const message = getError(saveError, "Could not save revaluation.");
      setError(message);
      toast({ title: "Revaluation save failed", description: message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent className="max-w-4xl border-[#2b4054] bg-[#0d1926] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{run ? "Edit revaluation draft" : "New revaluation run"}</DialogTitle>
          <DialogDescription className="text-white/45">
            Capture exposure lines first; posting is a separate ledger action.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Organization">
            <Select value={form.orgId} onChange={(value) => setForm({ ...form, orgId: Number(value) })}>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
          </Field>
          <Field label="Valuation date">
            <Input type="date" value={form.valuationDate} onChange={(event) => setForm({ ...form, valuationDate: event.target.value })} className={FIELD} />
          </Field>
          <Field label="Base currency">
            <Select value={form.baseCurrency} onChange={(value) => setForm({ ...form, baseCurrency: value })}>
              {activeCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
            </Select>
          </Field>
          <Field label="Gain/loss account">
            <Select value={form.gainLossAccountId} onChange={(value) => setForm({ ...form, gainLossAccountId: Number(value) })}>
              {incomeExpense.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="rounded-lg border border-white/[0.08]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-white">Exposure lines</p>
              <p className="text-[11px] text-white/35">Functional impact is calculated from both rates.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setForm({
                ...form,
                lines: [...form.lines, {
                  accountId: accounts[0]?.id ?? 0,
                  currency: activeCurrencies.find((item) => item.code !== form.baseCurrency)?.code || activeCurrencies[0]?.code || "",
                  foreignBalance: 0,
                  previousRate: 1,
                  currentRate: 1,
                }],
              })}
              className="border-[#d59b52]/30 bg-transparent text-[#e5ad66] hover:bg-[#d59b52]/10"
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <th className="px-4 py-2">Account</th>
                  <th className="px-2 py-2">Currency</th>
                  <th className="px-2 py-2">Foreign balance</th>
                  <th className="px-2 py-2">Previous rate</th>
                  <th className="px-2 py-2">Current rate</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={index} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-4 py-2">
                      <Select value={line.accountId} onChange={(value) => updateLine(index, { accountId: Number(value) })}>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Select value={line.currency} onChange={(value) => updateLine(index, { currency: value })}>
                        {activeCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-2"><Input type="number" value={line.foreignBalance} onChange={(event) => updateLine(index, { foreignBalance: Number(event.target.value) })} className={FIELD} /></td>
                    <td className="px-2 py-2"><Input type="number" step="0.000001" value={line.previousRate} onChange={(event) => updateLine(index, { previousRate: Number(event.target.value) })} className={FIELD} /></td>
                    <td className="px-2 py-2"><Input type="number" step="0.000001" value={line.currentRate} onChange={(event) => updateLine(index, { currentRate: Number(event.target.value) })} className={FIELD} /></td>
                    <td className="px-2 py-2">
                      {form.lines.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })} className="h-8 w-8 text-white/35 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Field label="Notes" hint="Optional">
          <Textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={cn(FIELD, "min-h-[56px]")} />
        </Field>
        {error && <p className="text-xs text-[#efaaaa]">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} className="border-white/10 bg-transparent text-white/60">Cancel</Button>
          <Button onClick={save} disabled={busy || !canSave} className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {run ? "Save draft" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MultiCurrencyTab() {
  const permissions = useMultiCurrencyPermissions();
  const summary = useMultiCurrencySummary();
  const currenciesQuery = useFinanceCurrencies();
  const [view, setView] = useState<"master" | "rates" | "converter" | "revaluation">("master");
  const [search, setSearch] = useState("");
  const ratesQuery = useExchangeRates({ search: search || undefined });
  const runsQuery = useRevaluationRuns();
  const accountsQuery = useAccounts({ status: "active", limit: 100 });
  const companiesQuery = useIntercompanyCompanies();
  const [currencyDialog, setCurrencyDialog] = useState(false);
  const [rateDialog, setRateDialog] = useState(false);
  const [revaluationDialog, setRevaluationDialog] = useState(false);
  const [currencyEdit, setCurrencyEdit] = useState<FinanceCurrency | null>(null);
  const [rateEdit, setRateEdit] = useState<FinanceExchangeRate | null>(null);
  const [runEdit, setRunEdit] = useState<RevaluationRun | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "currency" | "rate" | "run"; id: number; label: string } | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number>();
  const [converter, setConverter] = useState({
    fromCurrency: "",
    toCurrency: "",
    amount: "1000",
    asOfDate: TODAY,
    rateType: "spot" as FxRateType,
  });
  const convert = useConvertCurrency();
  const deleteCurrency = useDeleteCurrency();
  const deleteRate = useDeleteExchangeRate();
  const deleteRun = useDeleteRevaluation();
  const action = useRevaluationAction();
  const { toast } = useToast();

  const currencies = currenciesQuery.data?.data ?? [];
  const activeCurrencies = useMemo(() => currencies.filter((item) => item.status === "active"), [currencies]);
  const rates = ratesQuery.data?.data ?? [];
  const runs = runsQuery.data?.data ?? [];
  const companies = companiesQuery.data?.data ?? [];
  const accounts = accountsQuery.data?.data ?? [];
  const selectedRun = runs.find((item) => item.id === selectedRunId);
  const detail = useRevaluationDetail(selectedRunId);
  const selectedDetail = detail.data?.data ?? selectedRun;
  const canView = permissions.data?.data?.canView ?? false;
  const canCreate = permissions.data?.data?.canCreate ?? false;
  const canEdit = permissions.data?.data?.canEdit ?? false;
  const canDelete = permissions.data?.data?.canDelete ?? false;

  useEffect(() => {
    if (!activeCurrencies.length) return;
    setConverter((current) => ({
      ...current,
      fromCurrency: activeCurrencies.some((item) => item.code === current.fromCurrency) ? current.fromCurrency : activeCurrencies[0].code,
      toCurrency: activeCurrencies.some((item) => item.code === current.toCurrency) ? current.toCurrency : activeCurrencies[1]?.code ?? activeCurrencies[0].code,
    }));
  }, [activeCurrencies]);

  function notify(message: string) {
    toast({ title: message });
  }

  function openCurrency(currency: FinanceCurrency | null) {
    setCurrencyEdit(currency);
    setCurrencyDialog(true);
  }

  function openRate(rate: FinanceExchangeRate | null) {
    setRateEdit(rate);
    setRateDialog(true);
  }

  function openRun(run: RevaluationRun | null) {
    setRunEdit(run);
    setRevaluationDialog(true);
  }

  async function removeTarget() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "currency") await deleteCurrency.mutateAsync(deleteTarget.id);
      else if (deleteTarget.kind === "rate") await deleteRate.mutateAsync(deleteTarget.id);
      else await deleteRun.mutateAsync(deleteTarget.id);
      notify(`${deleteTarget.label} deleted`);
      setDeleteTarget(null);
    } catch (error) {
      toast({ title: "Delete failed", description: getError(error, "Please try again."), variant: "destructive" });
    }
  }

  function convertAmount() {
    if (!converter.fromCurrency || !converter.toCurrency || !Number.isFinite(Number(converter.amount)) || Number(converter.amount) < 0) return;
    convert.mutate(
      {
        fromCurrency: converter.fromCurrency,
        toCurrency: converter.toCurrency,
        amount: Number(converter.amount),
        asOfDate: converter.asOfDate,
        rateType: converter.rateType,
      },
      { onError: (error) => toast({ title: "Conversion failed", description: getError(error, "No rate was found for this date."), variant: "destructive" }) },
    );
  }

  function runAction(run: RevaluationRun, actionName: "post" | "void") {
    const message = actionName === "post"
      ? `Post ${run.runNumber} to the general ledger?`
      : `Void ${run.runNumber}?`;
    if (!window.confirm(message)) return;
    action.mutate(
      { id: run.id, action: actionName },
      {
        onSuccess: () => notify(actionName === "post" ? `${run.runNumber} posted to ledger` : `${run.runNumber} voided`),
        onError: (error) => toast({ title: "Revaluation action failed", description: getError(error, "Please try again."), variant: "destructive" }),
      },
    );
  }

  if (permissions.isLoading) return <div className={cn(PANEL, "rounded-xl")}><LoadingRows columns={4} /></div>;
  if (permissions.isError) return <div className={cn(PANEL, "rounded-xl")}><ErrorState retry={() => permissions.refetch()} /></div>;
  if (!canView) {
    return (
      <div className={cn(PANEL, "rounded-xl")}>
        <EmptyState icon={LockKeyhole} title="Multi-currency access is restricted" detail="Ask a Finance administrator for permission to view rates, conversions, and revaluation runs." />
      </div>
    );
  }

  const nav = [
    { id: "master" as const, label: "Currency master", count: summary.data?.data?.activeCurrencyCount, icon: Coins },
    { id: "rates" as const, label: "Exchange rates", count: summary.data?.data?.activeRateCount, icon: Activity },
    { id: "converter" as const, label: "Amount converter", icon: ArrowRightLeft },
    { id: "revaluation" as const, label: "Revaluation runs", count: summary.data?.data?.draftRevaluationCount, icon: FileClock },
  ];

  return (
    <div className="space-y-4 pb-8" data-testid="multi-currency-tab">
      <div className={cn(PANEL, "rounded-xl p-5 sm:p-6")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d59b52]">
              <ShieldCheck className="h-3.5 w-3.5" /> Controlled foreign exchange
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Multi-currency control room</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">
              Manage currency master data, effective-dated rates, conversions, and auditable revaluation postings from Finance.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Active currencies", summary.data?.data?.activeCurrencyCount ?? "—"],
              ["Active rates", summary.data?.data?.activeRateCount ?? "—"],
              ["Draft revaluations", summary.data?.data?.draftRevaluationCount ?? "—"],
              ["Posted gain/loss", summary.data?.data ? money(summary.data.data.postedGainLoss, activeCurrencies[0]?.code ?? "INR") : "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
          {nav.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                view === id ? "bg-[#d59b52] text-[#1a1209] shadow-[0_4px_18px_rgba(213,155,82,0.16)]" : "text-white/45 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
              {count !== undefined && <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", view === id ? "bg-[#1a1209]/10" : "bg-white/[0.06]")}>{count}</span>}
            </button>
          ))}
          <span className="ml-auto hidden text-[10px] uppercase tracking-wider text-white/25 sm:inline">Latest rate {dateLabel(summary.data?.data?.latestRateDate)}</span>
          <Button size="icon" variant="ghost" onClick={() => { currenciesQuery.refetch(); ratesQuery.refetch(); runsQuery.refetch(); summary.refetch(); }} className="h-8 w-8 text-white/40 hover:bg-white/[0.06] hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {view === "master" && (
        <section className={cn(PANEL, "overflow-hidden rounded-xl")}>
          <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-semibold text-white">Currency master</h3><p className="mt-1 text-xs text-white/35">Functional and transactional currencies available to this organization.</p></div>
            <Button onClick={() => openCurrency(null)} disabled={!canCreate} className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" /> Add currency</Button>
          </div>
          {currenciesQuery.isLoading ? <LoadingRows columns={6} /> : currenciesQuery.isError ? <ErrorState retry={() => currenciesQuery.refetch()} /> : currencies.length === 0 ? <EmptyState icon={Coins} title="No currencies configured" detail="Add the currencies your entities transact in before loading exchange rates." action={<Button onClick={() => openCurrency(null)} disabled={!canCreate} className="bg-[#d59b52] text-[#1a1209]"><Plus className="h-3.5 w-3.5" /> Add first currency</Button>} /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3">Currency</th><th className="px-3 py-3">ISO</th><th className="px-3 py-3">Decimals</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{currencies.map((currency) => <tr key={currency.id} className="group border-b border-white/[0.045] last:border-0 hover:bg-white/[0.025]" data-testid={`row-currency-${currency.id}`}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d59b52]/10 font-mono text-sm font-semibold text-[#e5ad66]">{currency.symbol}</span><div><p className="text-sm font-medium text-white">{currency.name}</p><p className="text-[11px] text-white/32">Updated {dateLabel(currency.updatedAt)}</p></div></div></td><td className="px-3 py-3.5 font-mono text-xs font-semibold text-white/75">{currency.code}</td><td className="px-3 py-3.5 font-mono text-xs text-white/60">{currency.decimalPlaces}</td><td className="px-3 py-3.5 text-[11px] text-white/42">{currency.isSystem ? "System" : "Custom"}</td><td className="px-3 py-3.5"><StatusPill status={currency.status} /></td><td className="px-3 py-3.5"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openCurrency(currency)} disabled={!canEdit} className="h-8 w-8 text-white/45 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "currency", id: currency.id, label: currency.code })} disabled={!canDelete || currency.isSystem} className="h-8 w-8 text-white/35 hover:bg-[#e27b7b]/10 hover:text-[#efaaaa]"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div>
          )}
        </section>
      )}

      {view === "rates" && (
        <section className={cn(PANEL, "overflow-hidden rounded-xl")}>
          <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-white">Effective-dated exchange rates</h3><p className="mt-1 text-xs text-white/35">Use direct or inverse rates for conversion and close.</p></div><div className="flex items-center gap-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search source or notes" className={cn(FIELD, "h-8 w-48 pl-8 text-xs")} /></div><Button onClick={() => openRate(null)} disabled={!canCreate} className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><Plus className="h-3.5 w-3.5" /> Add rate</Button></div></div>
          {ratesQuery.isLoading ? <LoadingRows columns={7} /> : ratesQuery.isError ? <ErrorState retry={() => ratesQuery.refetch()} /> : rates.length === 0 ? <EmptyState icon={Activity} title="No exchange rates match" detail="Add a spot, closing, or average rate to make conversion available." action={<Button onClick={() => openRate(null)} disabled={!canCreate} className="bg-[#d59b52] text-[#1a1209]"><Plus className="h-3.5 w-3.5" /> Add first rate</Button>} /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3">Pair</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3">Effective date</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{rates.map((rate) => <tr key={rate.id} className="group border-b border-white/[0.045] last:border-0 hover:bg-white/[0.025]"><td className="px-5 py-3.5 font-mono text-xs font-semibold text-white">{rate.fromCurrency} <ArrowRightLeft className="mx-1 inline h-3 w-3 text-[#d59b52]" /> {rate.toCurrency}</td><td className="px-3 py-3.5 font-mono text-sm text-[#e5ad66]">{Number(rate.rate).toFixed(6)}</td><td className="px-3 py-3.5 text-xs text-white/60">{dateLabel(rate.effectiveDate)}</td><td className="px-3 py-3.5 text-[10px] capitalize text-white/55">{rate.rateType}</td><td className="max-w-[190px] truncate px-3 py-3.5 text-xs text-white/45">{rate.source}</td><td className="px-3 py-3.5"><StatusPill status={rate.status} /></td><td className="px-3 py-3.5"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openRate(rate)} disabled={!canEdit} className="h-8 w-8 text-white/45 hover:text-white"><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "rate", id: rate.id, label: `${rate.fromCurrency}/${rate.toCurrency} rate` })} disabled={!canDelete} className="h-8 w-8 text-white/35 hover:text-[#efaaaa]"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div>
          )}
        </section>
      )}

      {view === "converter" && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={cn(PANEL, "rounded-xl p-5 sm:p-6")}><div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#d59b52]" /><h3 className="text-sm font-semibold text-white">Live amount converter</h3></div><p className="mt-1 text-xs text-white/35">Uses the selected rate type and latest rate on or before the date.</p></div><span className="flex items-center gap-1.5 rounded-md border border-[#4cb890]/20 bg-[#4cb890]/[0.08] px-2 py-1 text-[10px] text-[#7cdbb6]"><span className="h-1.5 w-1.5 rounded-full bg-[#4cb890]" /> Live endpoint</span></div><div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end"><Field label="From"><Select value={converter.fromCurrency} onChange={(value) => setConverter({ ...converter, fromCurrency: value })}>{activeCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</Select></Field><ArrowRightLeft className="hidden h-4 w-4 text-[#d59b52] md:block" /><Field label="To"><Select value={converter.toCurrency} onChange={(value) => setConverter({ ...converter, toCurrency: value })}>{activeCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</Select></Field></div><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"><Field label="Amount"><Input type="number" min={0} value={converter.amount} onChange={(event) => setConverter({ ...converter, amount: event.target.value })} className={FIELD} /></Field><Field label="As of date"><Input type="date" value={converter.asOfDate} onChange={(event) => setConverter({ ...converter, asOfDate: event.target.value })} className={FIELD} /></Field><Field label="Rate type"><Select value={converter.rateType} onChange={(value) => setConverter({ ...converter, rateType: value as FxRateType })}><option value="spot">Spot</option><option value="closing">Closing</option><option value="average">Average</option></Select></Field></div><Button onClick={convertAmount} disabled={convert.isPending || !converter.fromCurrency || !converter.toCurrency || Number(converter.amount) < 0} className="mt-5 bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]">{convert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Convert amount</Button></div>
          <div className={cn(PANEL, "flex min-h-[250px] flex-col justify-between rounded-xl p-5 sm:p-6")}><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Conversion result</p>{convert.data?.data ? <div className="mt-5" data-testid="conversion-result"><p className="font-mono text-3xl font-semibold tracking-tight text-white">{money(convert.data.data.convertedAmount, converter.toCurrency)}</p><p className="mt-2 font-mono text-xs text-white/45">{money(convert.data.data.amount, converter.fromCurrency)} = {convert.data.data.rate.toFixed(6)} {converter.toCurrency}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4"><div><p className="text-[10px] uppercase tracking-wider text-white/30">Direction</p><p className="mt-1 text-xs capitalize text-[#7cdbb6]">{convert.data.data.direction}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/30">Rate date</p><p className="mt-1 text-xs text-white/65">{dateLabel(convert.data.data.rateDate)}</p></div></div></div> : <div className="mt-12 text-center"><ArrowRightLeft className="mx-auto h-7 w-7 text-white/15" /><p className="mt-3 text-sm text-white/55">Ready to convert</p><p className="mt-1 text-xs text-white/30">Choose a pair and valuation date to see the live result.</p></div>}</div><div className="flex items-center gap-2 border-t border-white/[0.07] pt-4 text-[11px] text-white/30"><ShieldCheck className="h-3.5 w-3.5 text-[#4cb890]" /> Result uses the selected rate convention</div></div>
        </section>
      )}

      {view === "revaluation" && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className={cn(PANEL, "overflow-hidden rounded-xl")}><div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-white">Revaluation runs</h3><p className="mt-1 text-xs text-white/35">Review drafts before an explicit post-to-ledger action.</p></div><Button onClick={() => openRun(null)} disabled={!canCreate} className="bg-[#d59b52] text-[#1a1209] hover:bg-[#e5ad66]"><FilePlus2 className="h-3.5 w-3.5" /> New draft</Button></div>{runsQuery.isLoading ? <LoadingRows columns={6} /> : runsQuery.isError ? <ErrorState retry={() => runsQuery.refetch()} /> : runs.length === 0 ? <EmptyState icon={FileClock} title="No revaluation runs yet" detail="Create a draft to capture foreign-currency exposure for the next close." action={<Button onClick={() => openRun(null)} disabled={!canCreate} className="bg-[#d59b52] text-[#1a1209]"><Plus className="h-3.5 w-3.5" /> Create draft</Button>} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3">Run</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Base</th><th className="px-3 py-3">Gain / loss</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} onClick={() => setSelectedRunId(run.id)} className={cn("group cursor-pointer border-b border-white/[0.045] last:border-0 hover:bg-white/[0.035]", selectedRunId === run.id && "bg-[#d59b52]/[0.06]")}><td className="px-5 py-3.5"><p className="font-mono text-xs font-semibold text-white">{run.runNumber}</p><p className="mt-1 text-[11px] text-white/32">{run.organizationName}</p></td><td className="px-3 py-3.5 text-xs text-white/60">{dateLabel(run.valuationDate)}</td><td className="px-3 py-3.5 font-mono text-xs text-white/65">{run.baseCurrency}</td><td className={cn("px-3 py-3.5 font-mono text-xs", Number(run.totalGainLoss) >= 0 ? "text-[#7cdbb6]" : "text-[#efaaaa]")}>{money(run.totalGainLoss, run.baseCurrency)}</td><td className="px-3 py-3.5"><StatusPill status={run.status} /></td><td className="px-3 py-3.5"><div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}><Button size="icon" variant="ghost" onClick={() => openRun(run)} disabled={!canEdit || run.status !== "draft"} className="h-8 w-8 text-white/45 hover:text-white"><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "run", id: run.id, label: run.runNumber })} disabled={!canDelete || run.status !== "draft"} className="h-8 w-8 text-white/35 hover:text-[#efaaaa]"><Trash2 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => runAction(run, "post")} disabled={!canEdit || run.status !== "draft" || action.isPending} className="h-8 w-8 text-[#7cdbb6]/70 hover:text-[#7cdbb6]"><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => runAction(run, "void")} disabled={!canEdit || run.status !== "draft" || action.isPending} className="h-8 w-8 text-[#efaaaa]/60 hover:text-[#efaaaa]"><X className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div>}</div>
          <div className={cn(PANEL, "min-h-[350px] rounded-xl p-5")}><div className="flex items-center justify-between border-b border-white/[0.07] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Run detail</p><p className="mt-1 text-sm font-semibold text-white">{selectedDetail?.runNumber ?? "Select a run"}</p></div>{selectedDetail && <StatusPill status={selectedDetail.status} />}</div>{selectedDetail ? <><div className="grid grid-cols-2 gap-4 border-b border-white/[0.07] py-4"><div><p className="text-[10px] uppercase tracking-wider text-white/30">Valuation date</p><p className="mt-1 text-xs text-white/70">{dateLabel(selectedDetail.valuationDate)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/30">Net impact</p><p className={cn("mt-1 font-mono text-sm", Number(selectedDetail.totalGainLoss) >= 0 ? "text-[#7cdbb6]" : "text-[#efaaaa]")}>{money(selectedDetail.totalGainLoss, selectedDetail.baseCurrency)}</p></div></div>{detail.isLoading ? <LoadingRows columns={3} /> : <div className="space-y-2 pt-4">{(selectedDetail.lines ?? []).map((line) => <div key={line.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-white">{line.accountCode} · {line.accountName}</p><p className="mt-1 text-[11px] text-white/40">{line.currency} exposure · {Number(line.foreignBalance).toLocaleString()}</p></div><span className={cn("font-mono text-xs", Number(line.gainLoss) >= 0 ? "text-[#7cdbb6]" : "text-[#efaaaa]")}>{money(line.gainLoss, selectedDetail.baseCurrency)}</span></div><div className="mt-2 flex items-center gap-2 text-[10px] text-white/30"><span>{Number(line.previousRate).toFixed(5)}</span><ChevronRight className="h-3 w-3" /><span>{Number(line.currentRate).toFixed(5)}</span><span className="ml-auto">functional impact</span></div></div>)}</div>}</> : <div className="flex h-64 flex-col items-center justify-center text-center"><FileClock className="h-7 w-7 text-white/15" /><p className="mt-3 text-sm text-white/50">Choose a run to inspect exposure</p><p className="mt-1 max-w-[220px] text-xs text-white/30">Source balance and both rates stay visible for review.</p></div>}</div>
        </section>
      )}

      <CurrencyDialog open={currencyDialog} currency={currencyEdit} canSave={currencyEdit ? canEdit : canCreate} onClose={() => { setCurrencyDialog(false); setCurrencyEdit(null); }} onSaved={notify} />
      <RateDialog open={rateDialog} rate={rateEdit} currencies={currencies} canSave={rateEdit ? canEdit : canCreate} onClose={() => { setRateDialog(false); setRateEdit(null); }} onSaved={notify} />
      <RevaluationDialog open={revaluationDialog} run={runEdit} currencies={currencies} companies={companies} accounts={accounts} canSave={runEdit ? canEdit : canCreate} onClose={() => { setRevaluationDialog(false); setRunEdit(null); }} onSaved={notify} />
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <DialogContent className="border-[#2b4054] bg-[#0d1926] text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Delete {deleteTarget?.label ?? "record"}?</DialogTitle><DialogDescription className="text-white/45">This cannot be undone. Records referenced by rates or ledger runs must be marked inactive instead.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDeleteTarget(null)} className="border-white/10 bg-transparent text-white/60">Cancel</Button><Button onClick={removeTarget} disabled={deleteCurrency.isPending || deleteRate.isPending || deleteRun.isPending} className="bg-[#b95858] text-white hover:bg-[#a94b4b]">Delete record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}