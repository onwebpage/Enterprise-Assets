import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FilePlus2,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HR_STATUTORY_CODES,
  HR_STATUTORY_FILINGS_STATUSES,
  useCalculatePayrollStatutory,
  useCreateStatutoryConfig,
  useCreateStatutoryFiling,
  useDeleteStatutoryConfig,
  useDeleteStatutoryFiling,
  useHrStatutoryConfigs,
  useHrStatutoryFilings,
  useHrPayrollRunStatutoryLines,
  useHrStatutorySummary,
  useUpdateStatutoryConfig,
  useUpdateStatutoryFiling,
  type HrStatutoryCode,
  type HrStatutoryConfig,
  type HrStatutoryFiling,
  type HrStatutoryFilingStatus,
  type HrPayrollRun,
} from "@/hooks/useHR";
import { cn } from "@/lib/utils";

type Props = {
  payrollRuns: HrPayrollRun[];
  payrollRunId?: number | null;
  payrollRunPeriod?: string;
  onPayrollRunChange: (runId: number | null) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToast: (title: string, description?: string, destructive?: boolean) => void;
};

const money = (value: string | number | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const compactMoney = (value: string | number | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₹0";
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return money(amount);
};

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
};

const statusStyles: Record<HrStatutoryFilingStatus, string> = {
  draft: "border-white/10 bg-white/[0.05] text-white/55",
  ready: "border-[#e7a23b]/25 bg-[#e7a23b]/10 text-[#f0bb63]",
  filed: "border-[#60c5ad]/25 bg-[#60c5ad]/10 text-[#78d7bd]",
  paid: "border-[#8ab4ff]/25 bg-[#8ab4ff]/10 text-[#9fc2ff]",
  overdue: "border-[#e87868]/25 bg-[#e87868]/10 text-[#f28d7f]",
};

const codeStyles: Record<HrStatutoryCode, { bg: string; text: string; label: string }> = {
  PF: { bg: "bg-[#87aefb]/10", text: "text-[#9fc2ff]", label: "Provident fund" },
  ESI: { bg: "bg-[#64c7b0]/10", text: "text-[#79d9c0]", label: "Employee state insurance" },
  PT: { bg: "bg-[#e7a23b]/10", text: "text-[#f1bd68]", label: "Professional tax" },
  TDS: { bg: "bg-[#d98a9d]/10", text: "text-[#eca9b8]", label: "Tax deducted at source" },
};

const labelize = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function ErrorState({ retry, message }: { retry: () => void; message?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#e87868]/20 bg-[#e87868]/[0.06] px-4 py-3 text-sm text-[#f2a198]" data-testid="state-compliance-error">
      <div className="flex min-w-0 items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{message ?? "Compliance data could not be loaded."}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={retry}
        data-testid="button-retry-compliance"
        className="shrink-0 border-[#e87868]/25 bg-transparent text-[#f2a198] hover:bg-[#e87868]/10"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/[0.11] bg-white/[0.018] px-5 py-8 text-center" data-testid="state-compliance-empty">
      <Icon className="mx-auto mb-3 h-8 w-8 text-[#e7a23b]/55" />
      <p className="text-sm font-medium text-white/75">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/35">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "amber",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof CircleDollarSign;
  tone?: "amber" | "teal" | "blue" | "rose";
}) {
  const tones = {
    amber: { icon: "bg-[#e7a23b]/10 text-[#f1bd68]", line: "bg-[#e7a23b]" },
    teal: { icon: "bg-[#64c7b0]/10 text-[#79d9c0]", line: "bg-[#64c7b0]" },
    blue: { icon: "bg-[#87aefb]/10 text-[#9fc2ff]", line: "bg-[#87aefb]" },
    rose: { icon: "bg-[#d98a9d]/10 text-[#eca9b8]", line: "bg-[#d98a9d]" },
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1423]/90 p-4 transition-transform duration-200 hover:-translate-y-0.5" data-testid={`card-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-4 flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">{label}</span>
        <span className={cn("rounded-md p-2", tones.icon)}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="font-mono text-[26px] font-semibold tracking-[-0.05em] text-white" data-testid={`text-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
      <p className="mt-1 text-xs text-white/35">{detail}</p>
      <span className={cn("absolute inset-x-0 bottom-0 h-px opacity-60", tones.line)} />
    </div>
  );
}

type ConfigFormValue = {
  code: HrStatutoryCode;
  name: string;
  enabled: boolean;
  employeeRate: string;
  employerRate: string;
  wageCeiling: string;
  threshold: string;
  fixedAmount: string;
  jurisdiction: string;
  registrationNumber: string;
  effectiveFrom: string;
};

const configDefaults: ConfigFormValue = {
  code: "PF",
  name: "",
  enabled: true,
  employeeRate: "",
  employerRate: "",
  wageCeiling: "",
  threshold: "",
  fixedAmount: "0",
  jurisdiction: "",
  registrationNumber: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
};

function ConfigDialog({
  open,
  initial,
  onClose,
  onToast,
}: {
  open: boolean;
  initial?: HrStatutoryConfig | null;
  onClose: () => void;
  onToast: Props["onToast"];
}) {
  const create = useCreateStatutoryConfig();
  const update = useUpdateStatutoryConfig();
  const [form, setForm] = useState<ConfigFormValue>(configDefaults);
  const isEdit = Boolean(initial);
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        code: initial.code,
        name: initial.name,
        enabled: initial.enabled,
        employeeRate: initial.employeeRate,
        employerRate: initial.employerRate,
        wageCeiling: initial.wageCeiling ?? "",
        threshold: initial.threshold ?? "",
        fixedAmount: initial.fixedAmount,
        jurisdiction: initial.jurisdiction ?? "",
        registrationNumber: initial.registrationNumber ?? "",
        effectiveFrom: initial.effectiveFrom.slice(0, 10),
      });
    } else {
      setForm({ ...configDefaults });
    }
  }, [open, initial?.id]);

  const set = <K extends keyof ConfigFormValue>(key: K, value: ConfigFormValue[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      onToast("Rule name is required", "Give this statutory rule a recognizable name.", true);
      return;
    }
    try {
      const payload = {
        code: form.code,
        name: form.name.trim(),
        enabled: form.enabled,
        employeeRate: form.employeeRate || "0",
        employerRate: form.employerRate || "0",
        wageCeiling: form.wageCeiling || null,
        threshold: form.threshold || null,
        fixedAmount: form.fixedAmount || "0",
        jurisdiction: form.jurisdiction || null,
        registrationNumber: form.registrationNumber || null,
        effectiveFrom: form.effectiveFrom,
      };
      if (initial) {
        await update.mutateAsync({ id: initial.id, data: payload });
        onToast("Statutory rule updated", `${form.code} is ready for the next calculation.`);
      } else {
        await create.mutateAsync(payload);
        onToast("Statutory rule added", `${form.code} is now part of the compliance set.`);
      }
      onClose();
    } catch (error) {
      onToast("Could not save statutory rule", error instanceof Error ? error.message : "Please try again.", true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl border-white/[0.1] bg-[#0b1220] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Scale className="h-4 w-4 text-[#e7a23b]" />
            {isEdit ? "Edit statutory rule" : "Add statutory rule"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Code</Label>
              <Select value={form.code} onValueChange={(value) => set("code", value as HrStatutoryCode)} disabled={isEdit}>
                <SelectTrigger className="border-white/[0.1] bg-white/[0.04] text-white" data-testid="select-config-code"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/[0.1] bg-[#101a2b] text-white">
                  {HR_STATUTORY_CODES.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Rule name</Label>
              <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Employer PF contribution" required className="border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/20" data-testid="input-config-name" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Employee rate (%)" value={form.employeeRate} onChange={(value) => set("employeeRate", value)} testId="input-config-employee-rate" />
            <Field label="Employer rate (%)" value={form.employerRate} onChange={(value) => set("employerRate", value)} testId="input-config-employer-rate" />
            <Field label="Fixed amount (₹)" value={form.fixedAmount} onChange={(value) => set("fixedAmount", value)} testId="input-config-fixed-amount" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Wage ceiling (₹)" value={form.wageCeiling} onChange={(value) => set("wageCeiling", value)} testId="input-config-wage-ceiling" placeholder="Optional" />
            <Field label="Threshold (₹)" value={form.threshold} onChange={(value) => set("threshold", value)} testId="input-config-threshold" placeholder="Optional" />
            <Field label="Jurisdiction" value={form.jurisdiction} onChange={(value) => set("jurisdiction", value)} testId="input-config-jurisdiction" placeholder="Maharashtra" />
            <Field label="Registration number" value={form.registrationNumber} onChange={(value) => set("registrationNumber", value)} testId="input-config-registration" placeholder="Optional" />
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Effective from</Label>
              <Input type="date" value={form.effectiveFrom} onChange={(event) => set("effectiveFrom", event.target.value)} required className="border-white/[0.1] bg-white/[0.04] text-white" data-testid="input-config-effective-from" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => set("enabled", !form.enabled)} data-testid="button-toggle-config-enabled" className={cn("flex h-9 w-full items-center justify-between rounded-md border px-3 text-xs transition-colors", form.enabled ? "border-[#64c7b0]/30 bg-[#64c7b0]/[0.08] text-[#8bdac6]" : "border-white/[0.1] bg-white/[0.03] text-white/45")}>
                <span>Rule active</span>
                <span className={cn("h-4 w-7 rounded-full p-0.5 transition-colors", form.enabled ? "bg-[#64c7b0]" : "bg-white/20")}><span className={cn("block h-3 w-3 rounded-full bg-[#07101a] transition-transform", form.enabled ? "translate-x-3" : "translate-x-0")} /></span>
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-white/[0.07] pt-4">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-config" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="button-save-config" className="bg-[#e7a23b] text-[#171108] hover:bg-[#f0b252]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? "Save rule" : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, testId, placeholder }: { label: string; value: string; onChange: (value: string) => void; testId: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/55">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/20" data-testid={testId} />
    </div>
  );
}

type FilingFormValue = {
  code: HrStatutoryCode;
  period: string;
  dueDate: string;
  status: HrStatutoryFilingStatus;
  referenceNumber: string;
  notes: string;
};

function FilingDialog({
  open,
  initial,
  onClose,
  onToast,
}: {
  open: boolean;
  initial?: HrStatutoryFiling | null;
  onClose: () => void;
  onToast: Props["onToast"];
}) {
  const create = useCreateStatutoryFiling();
  const update = useUpdateStatutoryFiling();
  const [form, setForm] = useState<FilingFormValue>({
    code: "PF",
    period: new Date().toISOString().slice(0, 7),
    dueDate: new Date().toISOString().slice(0, 10),
    status: "draft",
    referenceNumber: "",
    notes: "",
  });
  const isEdit = Boolean(initial);
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        code: initial.code,
        period: initial.period,
        dueDate: initial.dueDate.slice(0, 10),
        status: initial.status,
        referenceNumber: initial.referenceNumber ?? "",
        notes: initial.notes ?? "",
      });
    } else {
      setForm({
        code: "PF",
        period: new Date().toISOString().slice(0, 7),
        dueDate: new Date().toISOString().slice(0, 10),
        status: "draft",
        referenceNumber: "",
        notes: "",
      });
    }
  }, [open, initial?.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (initial) {
        await update.mutateAsync({
          id: initial.id,
          data: { status: form.status, referenceNumber: form.referenceNumber || null, notes: form.notes || null },
        });
        onToast("Filing updated", `${form.code} ${form.period} has been updated.`);
      } else {
        await create.mutateAsync({ code: form.code, period: form.period, dueDate: form.dueDate, notes: form.notes || null });
        onToast("Filing created", `${form.code} ${form.period} is now tracked.`);
      }
      onClose();
    } catch (error) {
      onToast("Could not save filing", error instanceof Error ? error.message : "Please try again.", true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg border-white/[0.1] bg-[#0b1220] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FilePlus2 className="h-4 w-4 text-[#64c7b0]" />
            {isEdit ? "Edit filing details" : "Track statutory filing"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Statutory code</Label>
              <Select value={form.code} onValueChange={(value) => setForm((current) => ({ ...current, code: value as HrStatutoryCode }))} disabled={isEdit}>
                <SelectTrigger className="border-white/[0.1] bg-white/[0.04] text-white" data-testid="select-filing-code"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/[0.1] bg-[#101a2b] text-white">
                  {HR_STATUTORY_CODES.map((code) => <SelectItem key={code} value={code}>{code} · {codeStyles[code].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Period</Label>
              <Input type="month" value={form.period} onChange={(event) => setForm((current) => ({ ...current, period: event.target.value }))} disabled={isEdit} required className="border-white/[0.1] bg-white/[0.04] text-white" data-testid="input-filing-period" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Due date</Label>
              <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} disabled={isEdit} required className="border-white/[0.1] bg-white/[0.04] text-white" data-testid="input-filing-due-date" />
            </div>
            {isEdit ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-white/55">Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as HrStatutoryFilingStatus }))}>
                  <SelectTrigger className="border-white/[0.1] bg-white/[0.04] text-white" data-testid="select-filing-status"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-white/[0.1] bg-[#101a2b] text-white">
                    {HR_STATUTORY_FILINGS_STATUSES.map((status) => <SelectItem key={status} value={status}>{labelize(status)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          {isEdit ? <Field label="Reference number" value={form.referenceNumber} onChange={(value) => setForm((current) => ({ ...current, referenceNumber: value }))} testId="input-filing-reference" placeholder="Acknowledgement / challan reference" /> : null}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/55">Notes</Label>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Add an audit note or handoff context" className="flex w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#e7a23b]/50" data-testid="textarea-filing-notes" />
          </div>
          <DialogFooter className="gap-2 border-t border-white/[0.07] pt-4">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-filing" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="button-save-filing" className="bg-[#64c7b0] text-[#071411] hover:bg-[#7bd7c0]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? "Save filing" : "Create filing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 py-2" data-testid="state-compliance-loading">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-md bg-white/[0.045]" />
      ))}
    </div>
  );
}

export default function AdvancedPayrollCompliance({
  payrollRuns,
  payrollRunId = null,
  payrollRunPeriod,
  onPayrollRunChange,
  canCreate,
  canEdit,
  canDelete,
  onToast,
}: Props) {
  const summary = useHrStatutorySummary();
  const configs = useHrStatutoryConfigs();
  const [periodFilter, setPeriodFilter] = useState(payrollRunPeriod ?? "");
  const filings = useHrStatutoryFilings({ period: periodFilter || undefined });
  const statutoryLines = useHrPayrollRunStatutoryLines(payrollRunId);
  const calculate = useCalculatePayrollStatutory();
  const deleteConfig = useDeleteStatutoryConfig();
  const deleteFiling = useDeleteStatutoryFiling();
  const [configDialog, setConfigDialog] = useState<{ open: boolean; initial: HrStatutoryConfig | null }>({ open: false, initial: null });
  const [filingDialog, setFilingDialog] = useState<{ open: boolean; initial: HrStatutoryFiling | null }>({ open: false, initial: null });

  useEffect(() => {
    if (payrollRunPeriod) setPeriodFilter(payrollRunPeriod);
  }, [payrollRunPeriod]);

  const summaryData = summary.data?.data;
  const configRows = configs.data?.data ?? [];
  const filingRows = filings.data?.data ?? [];
  const statutoryLineRows = statutoryLines.data?.data ?? [];
  const selectedRun = payrollRuns.find((run) => run.id === payrollRunId) ?? null;
  const selectedRunByCode = useMemo(() => {
    const grouped = new Map<HrStatutoryCode, { employees: number; employeeAmount: number; employerAmount: number; liability: number }>();
    for (const line of statutoryLineRows) {
      const current = grouped.get(line.code) ?? { employees: 0, employeeAmount: 0, employerAmount: 0, liability: 0 };
      current.employees += 1;
      current.employeeAmount += Number(line.employeeAmount || 0);
      current.employerAmount += Number(line.employerAmount || 0);
      current.liability += Number(line.employeeAmount || 0) + Number(line.employerAmount || 0);
      grouped.set(line.code, current);
    }
    return [...grouped.entries()].map(([code, values]) => ({ code, ...values }));
  }, [statutoryLineRows]);
  const liability = useMemo(
    () => summaryData?.filingSummary?.reduce((total, item) => total + Number(item.liability || 0), 0) ?? 0,
    [summaryData?.filingSummary],
  );
  const overdue = useMemo(
    () => summaryData?.filingSummary?.find((item) => item.status === "overdue")?.count ?? 0,
    [summaryData?.filingSummary],
  );
  const latestByCode = summaryData?.latestByCode ?? [];
  const activeConfigCount = configRows.filter((config) => config.enabled).length;

  async function calculateRun() {
    if (!payrollRunId) return;
    try {
      await calculate.mutateAsync(payrollRunId);
      onToast("Statutory lines recalculated", payrollRunPeriod ? `Payroll run for ${payrollRunPeriod} is ready for review.` : "The selected payroll run has been recalculated.");
    } catch (error) {
      onToast("Calculation failed", error instanceof Error ? error.message : "Please check the payroll run and try again.", true);
    }
  }

  async function removeConfig(config: HrStatutoryConfig) {
    if (!window.confirm(`Delete the ${config.code} statutory rule?`)) return;
    try {
      await deleteConfig.mutateAsync(config.id);
      onToast("Statutory rule deleted", `${config.code} is no longer configured.`);
    } catch (error) {
      onToast("Could not delete rule", error instanceof Error ? error.message : "Please try again.", true);
    }
  }

  async function removeFiling(filing: HrStatutoryFiling) {
    if (!window.confirm(`Delete the ${filing.code} filing for ${filing.period}?`)) return;
    try {
      await deleteFiling.mutateAsync(filing.id);
      onToast("Filing removed", `${filing.code} ${filing.period} was removed from the register.`);
    } catch (error) {
      onToast("Could not delete filing", error instanceof Error ? error.message : "Please try again.", true);
    }
  }

  return (
    <section className="relative min-h-[700px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080f1b] text-white shadow-2xl shadow-black/20" data-testid="workspace-advanced-payroll-compliance">
      <div className="pointer-events-none absolute -right-28 -top-36 h-96 w-96 rounded-full bg-[#e7a23b]/[0.045] blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-48 h-72 w-72 rounded-full bg-[#64c7b0]/[0.025] blur-3xl" />
      <div className="relative">
        <header className="border-b border-white/[0.08] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e7a23b]">
                <ShieldCheck className="h-3.5 w-3.5" /> Control room / statutory register
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[30px]">Payroll compliance</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-white/42">Keep every contribution, filing and rule defensible before payroll moves to payment.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
               {payrollRuns.length > 0 ? (
                 <Select value={payrollRunId ? String(payrollRunId) : ""} onValueChange={(value) => onPayrollRunChange(Number(value))}>
                   <SelectTrigger className="h-9 w-[190px] border-white/[0.1] bg-white/[0.04] text-xs text-white" data-testid="select-compliance-payroll-run"><SelectValue placeholder="Select payroll run" /></SelectTrigger>
                   <SelectContent className="border-white/[0.1] bg-[#101a2b] text-white">
                     {payrollRuns.map((run) => <SelectItem key={run.id} value={String(run.id)}>{run.period} · {run.runNumber}</SelectItem>)}
                   </SelectContent>
                 </Select>
               ) : null}
               {payrollRunId ? (
                <Button type="button" onClick={calculateRun} disabled={calculate.isPending} data-testid="button-calculate-statutory" className="bg-[#e7a23b] text-[#171108] hover:bg-[#f0b252]">
                  {calculate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {calculate.isPending ? "Calculating…" : "Calculate statutory"}
                </Button>
              ) : (
                <Badge className="border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/45" data-testid="status-no-payroll-run">
                  <CircleDollarSign className="mr-1.5 h-3.5 w-3.5" /> No payroll run selected
                </Badge>
              )}
              {canCreate ? (
                <Button type="button" variant="outline" onClick={() => setFilingDialog({ open: true, initial: null })} data-testid="button-create-filing" className="border-[#64c7b0]/25 bg-[#64c7b0]/[0.06] text-[#8bdac6] hover:bg-[#64c7b0]/10">
                  <Plus className="h-4 w-4" /> Track filing
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-white/[0.065] bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-[#87aefb]/10 p-2 text-[#9fc2ff]"><Landmark className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-medium text-white/65">Calculation context</p>
                <p className="mt-0.5 text-[11px] text-white/35">{payrollRunId ? `Run #${payrollRunId}${payrollRunPeriod ? ` · ${payrollRunPeriod}` : ""}` : "Select a payroll run in Payroll to calculate statutory lines."}</p>
              </div>
            </div>
             {payrollRunId ? <Badge className="w-fit border border-[#64c7b0]/20 bg-[#64c7b0]/[0.08] text-[10px] text-[#7ed8c0]" data-testid="status-calculation-ready"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {selectedRun?.status ?? "Run"} available</Badge> : null}
          </div>
        </header>

        <main className="space-y-7 px-5 py-6 sm:px-7">
          {summary.isError ? <ErrorState retry={() => summary.refetch()} /> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[143px] animate-pulse rounded-xl bg-white/[0.04]" data-testid={`skeleton-summary-${index}`} />)
            ) : (
              <>
                <MetricCard label="Open liability" value={compactMoney(liability)} detail={`${overdue} overdue filing${overdue === 1 ? "" : "s"}`} icon={TriangleAlert} tone="rose" />
                <MetricCard label="Configured rules" value={`${activeConfigCount}/${summaryData?.totalConfigured ?? configRows.length}`} detail={`${configRows.length} rules in register`} icon={Scale} tone="amber" />
                <MetricCard label="Employee share" value={compactMoney(latestByCode.reduce((total, item) => total + Number(item.employeeAmount || 0), 0))} detail="Latest tracked period" icon={CircleDollarSign} tone="blue" />
                <MetricCard label="Employer share" value={compactMoney(latestByCode.reduce((total, item) => total + Number(item.employerAmount || 0), 0))} detail="Latest tracked period" icon={Landmark} tone="teal" />
              </>
            )}
          </div>

          <div className="grid gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
            <div className="min-w-0 space-y-7">
              <section className="rounded-xl border border-white/[0.075] bg-[#0d1423]/80" data-testid="section-selected-run-breakdown">
                <div className="border-b border-white/[0.07] px-4 py-4">
                  <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#87aefb]" /><h2 className="text-sm font-semibold text-white/85">Selected run breakdown</h2></div>
                  <p className="mt-1 text-xs text-white/35">{selectedRun ? `${selectedRun.runNumber} · ${selectedRun.period} · ${selectedRun.employeeCount} employees` : "Choose a payroll run to inspect its statutory snapshot."}</p>
                </div>
                {!payrollRunId ? <div className="p-4"><EmptyState icon={CircleDollarSign} title="No payroll run selected" description="Select a run above or open one from the Payroll tab." /></div>
                  : statutoryLines.isLoading ? <div className="px-4 py-3"><LoadingRows count={4} /></div>
                  : statutoryLines.isError ? <div className="p-4"><ErrorState retry={() => statutoryLines.refetch()} /></div>
                  : selectedRunByCode.length === 0 ? <div className="p-4"><EmptyState icon={ClipboardCheck} title="Awaiting calculation" description="Calculate statutory deductions for this run to create an auditable contribution snapshot." action={canEdit && selectedRun?.status !== "approved" && selectedRun?.status !== "paid" ? <Button type="button" size="sm" onClick={calculateRun} disabled={calculate.isPending} className="bg-[#e7a23b] text-[#171108] hover:bg-[#f0b252]"><RefreshCw className="h-3.5 w-3.5" /> Calculate now</Button> : null} /></div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left">
                        <thead><tr className="border-b border-white/[0.055] text-[10px] uppercase tracking-[0.13em] text-white/28"><th className="px-4 py-3 font-medium">Code</th><th className="px-3 py-3 font-medium">Employees</th><th className="px-3 py-3 text-right font-medium">Employee share</th><th className="px-3 py-3 text-right font-medium">Employer share</th><th className="px-4 py-3 text-right font-medium">Liability</th></tr></thead>
                        <tbody>{selectedRunByCode.map((item) => <tr key={item.code} className="border-b border-white/[0.045] last:border-0"><td className="px-4 py-3"><span className={cn("rounded-md px-2 py-1 font-mono text-[10px] font-semibold", codeStyles[item.code].bg, codeStyles[item.code].text)}>{item.code}</span></td><td className="px-3 py-3 text-xs text-white/55">{item.employees}</td><td className="px-3 py-3 text-right font-mono text-xs text-[#9fc2ff]">{money(item.employeeAmount)}</td><td className="px-3 py-3 text-right font-mono text-xs text-[#79d9c0]">{money(item.employerAmount)}</td><td className="px-4 py-3 text-right font-mono text-xs font-semibold text-white/80">{money(item.liability)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
              </section>

              <section className="rounded-xl border border-white/[0.075] bg-[#0d1423]/80" data-testid="section-filing-register">
                <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-[#64c7b0]" />
                      <h2 className="text-sm font-semibold text-white/85">Filing register</h2>
                      <span className="font-mono text-[10px] text-white/28">{filingRows.length} records</span>
                    </div>
                    <p className="mt-1 text-xs text-white/35">Deadlines and payment evidence across statutory codes.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <CalendarClock className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-white/28" />
                      <Input type="month" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="h-8 w-[145px] border-white/[0.1] bg-white/[0.035] pl-8 text-xs text-white" data-testid="input-filter-filing-period" />
                    </div>
                    {periodFilter ? <Button type="button" variant="ghost" size="icon" onClick={() => setPeriodFilter("")} data-testid="button-clear-filing-period" className="h-8 w-8 text-white/35 hover:text-white"><X className="h-3.5 w-3.5" /></Button> : null}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {filings.isLoading ? <div className="px-4 py-3"><LoadingRows /></div> : filings.isError ? <div className="p-4"><ErrorState retry={() => filings.refetch()} /></div> : filingRows.length === 0 ? (
                    <div className="p-4"><EmptyState icon={FileCheck2} title={periodFilter ? "No filings for this period" : "Filing register is empty"} description={periodFilter ? "Clear the period filter or track a filing for this payroll month." : "Create a filing record when a contribution is ready to be prepared."} action={canCreate ? <Button type="button" size="sm" onClick={() => setFilingDialog({ open: true, initial: null })} data-testid="button-empty-create-filing" className="bg-[#64c7b0] text-[#071411] hover:bg-[#7bd7c0]"><Plus className="h-3.5 w-3.5" /> Track first filing</Button> : null} /></div>
                  ) : (
                    <table className="w-full min-w-[780px] text-left">
                      <thead>
                        <tr className="border-b border-white/[0.055] text-[10px] uppercase tracking-[0.13em] text-white/28">
                          <th className="px-4 py-3 font-medium">Code / period</th>
                          <th className="px-3 py-3 font-medium">Due</th>
                          <th className="px-3 py-3 text-right font-medium">Liability</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filingRows.map((filing) => {
                          const locked = filing.status === "filed" || filing.status === "paid";
                          const nextStatus: HrStatutoryFilingStatus | null = filing.status === "draft" || filing.status === "overdue" ? "ready" : filing.status === "ready" ? "filed" : filing.status === "filed" ? "paid" : null;
                          return (
                            <FilingRow key={filing.id} filing={filing} locked={locked} nextStatus={nextStatus} canEdit={canEdit} canDelete={canDelete} onEdit={() => setFilingDialog({ open: true, initial: filing })} onDelete={() => removeFiling(filing)} onToast={onToast} />
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-white/[0.075] bg-[#0d1423]/80" data-testid="section-recent-periods">
                <div className="border-b border-white/[0.07] px-4 py-4">
                  <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#87aefb]" /><h2 className="text-sm font-semibold text-white/85">Contribution ledger</h2></div>
                  <p className="mt-1 text-xs text-white/35">Recent periods split by employee and employer liability.</p>
                </div>
                {summary.isLoading ? <div className="px-4 py-3"><LoadingRows count={3} /></div> : (summaryData?.recentPeriods ?? []).length === 0 ? <div className="p-4"><EmptyState icon={CircleDollarSign} title="No contribution periods yet" description="Run statutory calculation on a payroll run to populate the ledger." /></div> : (
                  <div className="divide-y divide-white/[0.05]">
                    {(summaryData?.recentPeriods ?? []).map((period) => (
                      <div key={period.period} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_1fr] sm:items-center" data-testid={`row-period-${period.period}`}>
                        <div><p className="font-mono text-sm font-medium text-white/80">{period.period}</p><p className="mt-0.5 text-[11px] text-white/32">{period.employees} employees</p></div>
                        <div className="text-right sm:text-left"><p className="font-mono text-xs text-[#9fc2ff]">{money(period.employeeAmount)}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/25">Employee</p></div>
                        <div className="hidden text-left sm:block"><p className="font-mono text-xs text-[#79d9c0]">{money(period.employerAmount)}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/25">Employer</p></div>
                        <div className="text-right"><p className="font-mono text-sm font-semibold text-white/80">{money(period.liability)}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/25">Total</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-7">
              <section className="rounded-xl border border-white/[0.075] bg-[#0d1423]/80" data-testid="section-latest-by-code">
                <div className="border-b border-white/[0.07] px-4 py-4">
                  <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#e7a23b]" /><h2 className="text-sm font-semibold text-white/85">Latest by code</h2></div>
                  <p className="mt-1 text-xs text-white/35">The last calculated contribution snapshot.</p>
                </div>
                {summary.isLoading ? <div className="px-4 py-3"><LoadingRows count={4} /></div> : latestByCode.length === 0 ? <div className="p-4"><EmptyState icon={ClipboardCheck} title="Awaiting calculation" description="Latest statutory amounts will appear here after a run is calculated." /></div> : (
                  <div className="divide-y divide-white/[0.05]">
                    {latestByCode.map((item) => {
                      const code = codeStyles[item.code];
                      return <div key={item.code} className="px-4 py-3.5" data-testid={`row-latest-code-${item.code}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5"><span className={cn("flex h-8 w-8 items-center justify-center rounded-md font-mono text-[11px] font-semibold", code.bg, code.text)}>{item.code}</span><div><p className="text-xs font-medium text-white/75">{code.label}</p><p className="mt-0.5 text-[10px] text-white/30">{item.employees} covered employees</p></div></div>
                          <span className="font-mono text-sm font-semibold text-white/85">{money(item.liability)}</span>
                        </div>
                        <div className="mt-3 flex gap-4 pl-10 text-[10px]"><span className="text-white/30">Employee <b className="ml-1 font-mono font-medium text-[#9fc2ff]">{money(item.employeeAmount)}</b></span><span className="text-white/30">Employer <b className="ml-1 font-mono font-medium text-[#79d9c0]">{money(item.employerAmount)}</b></span></div>
                      </div>;
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/[0.075] bg-[#0d1423]/80" data-testid="section-statutory-rules">
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4">
                  <div><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-[#e7a23b]" /><h2 className="text-sm font-semibold text-white/85">Rulebook</h2></div><p className="mt-1 text-xs text-white/35">Rates and ceilings used by calculation.</p></div>
                  {canCreate ? <Button type="button" variant="ghost" size="icon" onClick={() => setConfigDialog({ open: true, initial: null })} data-testid="button-add-config" className="h-8 w-8 text-[#f1bd68] hover:bg-[#e7a23b]/10 hover:text-[#f1bd68]"><Plus className="h-4 w-4" /></Button> : null}
                </div>
                {configs.isLoading ? <div className="px-4 py-3"><LoadingRows count={3} /></div> : configs.isError ? <div className="p-4"><ErrorState retry={() => configs.refetch()} /></div> : configRows.length === 0 ? <div className="p-4"><EmptyState icon={Scale} title="No statutory rules" description="Add the first rule to make statutory calculations explicit and reviewable." action={canCreate ? <Button type="button" size="sm" onClick={() => setConfigDialog({ open: true, initial: null })} data-testid="button-empty-add-config" className="bg-[#e7a23b] text-[#171108] hover:bg-[#f0b252]"><Plus className="h-3.5 w-3.5" /> Add rule</Button> : null} /></div> : (
                  <div className="divide-y divide-white/[0.05]">
                    {configRows.map((config) => <ConfigRow key={config.id} config={config} canEdit={canEdit} canDelete={canDelete} onEdit={() => setConfigDialog({ open: true, initial: config })} onDelete={() => removeConfig(config)} />)}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </main>
      </div>
      <ConfigDialog open={configDialog.open} initial={configDialog.initial} onClose={() => setConfigDialog({ open: false, initial: null })} onToast={onToast} />
      <FilingDialog open={filingDialog.open} initial={filingDialog.initial} onClose={() => setFilingDialog({ open: false, initial: null })} onToast={onToast} />
    </section>
  );
}

function ConfigRow({ config, canEdit, canDelete, onEdit, onDelete }: { config: HrStatutoryConfig; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }) {
  const tone = codeStyles[config.code];
  return (
    <div className="group px-4 py-3.5" data-testid={`row-config-${config.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold", tone.bg, tone.text)}>{config.code}</span>
          <div className="min-w-0"><p className="truncate text-xs font-medium text-white/78" data-testid={`text-config-name-${config.id}`}>{config.name}</p><p className="mt-0.5 truncate text-[10px] text-white/30">{config.jurisdiction || "All jurisdictions"} · from {dateLabel(config.effectiveFrom)}</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
          {config.enabled ? <Badge className="border border-[#64c7b0]/20 bg-[#64c7b0]/[0.07] px-1.5 py-0 text-[9px] text-[#79d9c0]" data-testid={`status-config-enabled-${config.id}`}>Active</Badge> : <Badge className="border border-white/10 bg-white/[0.04] px-1.5 py-0 text-[9px] text-white/35" data-testid={`status-config-disabled-${config.id}`}>Off</Badge>}
          {canEdit ? <Button type="button" variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-config-${config.id}`} className="h-7 w-7 text-white/35 hover:text-white"><Pencil className="h-3.5 w-3.5" /></Button> : null}
          {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-config-${config.id}`} className="h-7 w-7 text-white/30 hover:text-[#f28d7f]"><Trash2 className="h-3.5 w-3.5" /></Button> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-10 text-[10px] text-white/30">
        <span>Employee <b className="font-mono font-medium text-[#9fc2ff]">{config.employeeRate || "0"}%</b></span>
        <span>Employer <b className="font-mono font-medium text-[#79d9c0]">{config.employerRate || "0"}%</b></span>
        {config.wageCeiling ? <span>Ceiling <b className="font-mono font-medium text-white/60">{money(config.wageCeiling)}</b></span> : null}
      </div>
    </div>
  );
}

function FilingRow({ filing, locked, nextStatus, canEdit, canDelete, onEdit, onDelete, onToast }: { filing: HrStatutoryFiling; locked: boolean; nextStatus: HrStatutoryFilingStatus | null; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void; onToast: Props["onToast"] }) {
  const update = useUpdateStatutoryFiling();
  const code = codeStyles[filing.code];
  async function advance() {
    if (!nextStatus) return;
    try {
      await update.mutateAsync({ id: filing.id, data: { status: nextStatus, referenceNumber: filing.referenceNumber, notes: filing.notes } });
      onToast(`Filing marked ${labelize(nextStatus)}`, `${filing.code} ${filing.period} moved forward in the register.`);
    } catch (error) {
      onToast("Could not advance filing", error instanceof Error ? error.message : "Please try again.", true);
    }
  }
  return (
    <tr className="group border-b border-white/[0.045] last:border-0 hover:bg-white/[0.018]" data-testid={`row-filing-${filing.id}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5"><span className={cn("flex h-7 w-7 items-center justify-center rounded-md font-mono text-[10px] font-semibold", code.bg, code.text)}>{filing.code}</span><div><p className="font-mono text-xs font-medium text-white/78" data-testid={`text-filing-period-${filing.id}`}>{filing.period}</p><p className="mt-0.5 text-[10px] text-white/30">{filing.employeeCount} employees</p></div></div>
      </td>
      <td className="px-3 py-3"><p className={cn("text-xs", filing.status === "overdue" ? "text-[#f28d7f]" : "text-white/55")} data-testid={`text-filing-due-${filing.id}`}>{dateLabel(filing.dueDate)}</p>{filing.status === "overdue" ? <span className="text-[10px] text-[#e87868]/80">Action required</span> : null}</td>
      <td className="px-3 py-3 text-right"><p className="font-mono text-xs font-semibold text-white/78" data-testid={`text-filing-liability-${filing.id}`}>{money(filing.totalLiability)}</p><p className="mt-0.5 text-[10px] text-white/28">E {compactMoney(filing.employeeAmount)} · R {compactMoney(filing.employerAmount)}</p></td>
      <td className="px-3 py-3"><Badge className={cn("border px-2 py-0.5 text-[10px]", statusStyles[filing.status])} data-testid={`status-filing-${filing.id}`}>{labelize(filing.status)}</Badge>{locked ? <p className="mt-1 flex items-center gap-1 text-[10px] text-white/25"><LockKeyhole className="h-3 w-3" /> Locked after {filing.status}</p> : null}</td>
      <td className="px-4 py-3"><div className="flex justify-end gap-1">
        {nextStatus && canEdit ? <Button type="button" size="sm" onClick={advance} disabled={update.isPending} data-testid={`button-advance-filing-${filing.id}`} className="h-7 gap-1 bg-[#64c7b0]/10 px-2 text-[10px] text-[#83dac4] hover:bg-[#64c7b0]/20">{update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />} {labelize(nextStatus)}</Button> : null}
        {canEdit && !locked ? <Button type="button" variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-filing-${filing.id}`} className="h-7 w-7 text-white/35 hover:text-white" title="Edit filing"><Pencil className="h-3.5 w-3.5" /></Button> : null}
        {canDelete && !locked ? <Button type="button" variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-filing-${filing.id}`} className="h-7 w-7 text-white/30 hover:text-[#f28d7f]" title="Delete filing"><Trash2 className="h-3.5 w-3.5" /></Button> : null}
        {locked ? <span className="flex h-7 items-center px-2 text-[10px] text-white/25" data-testid={`status-filing-locked-${filing.id}`}>No edits</span> : null}
      </div></td>
    </tr>
  );
}