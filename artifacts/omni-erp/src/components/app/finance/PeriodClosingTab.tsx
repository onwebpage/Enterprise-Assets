import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Archive, CalendarDays, CheckCircle2, ChevronDown, Clock3,
  Edit3, LockKeyhole, Plus, RefreshCw, RotateCcw, Search, ShieldOff,
  Trash2, UnlockKeyhole, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useChangeClosingPeriodStatus, useClosingAccounts, useClosingPermissions,
  useClosingPeriods, useCreateClosingPeriod, useDeleteClosingPeriod,
  useRunYearEndClosing, useUpdateClosingPeriod,
  type FinancialPeriod, type PeriodFormValues,
} from "@/hooks/usePeriodClosing";
import { cn } from "@/lib/utils";

const EMPTY_FORM: PeriodFormValues = {
  fiscalYear: new Date().getFullYear(),
  name: "",
  startDate: `${new Date().getFullYear()}-01-01`,
  endDate: `${new Date().getFullYear()}-12-31`,
  isYearEnd: false,
  notes: "",
};

function money(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return `$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS: Record<FinancialPeriod["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  open: { label: "Open", className: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25", icon: UnlockKeyhole },
  soft_closed: { label: "Soft closed", className: "bg-amber-500/12 text-amber-400 border-amber-500/25", icon: LockKeyhole },
  closed: { label: "Closed", className: "bg-white/[0.06] text-white/50 border-white/10", icon: Archive },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{children}</label>;
}

function FieldError({ children }: { children?: React.ReactNode }) {
  return children ? <p className="text-[11px] text-red-400 mt-1">{children}</p> : null;
}

function PeriodFormDialog({
  open, onClose, editPeriod, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editPeriod: FinancialPeriod | null;
  onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const create = useCreateClosingPeriod();
  const update = useUpdateClosingPeriod();
  const [form, setForm] = useState<PeriodFormValues>(EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(editPeriod ? {
      fiscalYear: editPeriod.fiscalYear,
      name: editPeriod.name,
      startDate: editPeriod.startDate,
      endDate: editPeriod.endDate,
      isYearEnd: editPeriod.isYearEnd,
      notes: editPeriod.notes ?? "",
    } : { ...EMPTY_FORM, fiscalYear: new Date().getFullYear(), name: `FY ${new Date().getFullYear()}` });
  }, [open, editPeriod]);

  const busy = create.isPending || update.isPending;
  function set<K extends keyof PeriodFormValues>(key: K, value: PeriodFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    setError("");
    if (!form.name.trim()) { setError("Period name is required."); return; }
    if (!form.startDate || !form.endDate) { setError("Start and end dates are required."); return; }
    if (form.endDate < form.startDate) { setError("End date must be on or after the start date."); return; }
    try {
      if (editPeriod) await update.mutateAsync({ id: editPeriod.id, data: { ...form, name: form.name.trim(), notes: form.notes?.trim() || null } });
      else await create.mutateAsync({ ...form, name: form.name.trim(), notes: form.notes?.trim() || null });
      onSaved(editPeriod ? "Financial period updated" : "Financial period created");
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Could not save the financial period.");
      toast({ title: "Could not save period", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{editPeriod ? "Edit financial period" : "Create financial period"}</DialogTitle>
          <DialogDescription className="text-white/45">
            Define the date window used to control ledger posting and closing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Fiscal year</FieldLabel>
              <Input type="number" min={1900} max={2200} value={form.fiscalYear}
                onChange={(e) => set("fiscalYear", Number(e.target.value))}
                className="bg-white/[0.04] border-white/[0.1] text-white" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Period name</FieldLabel>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="FY 2026" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Start date</FieldLabel>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>End date</FieldLabel>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white" />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] p-3 cursor-pointer">
            <input type="checkbox" checked={form.isYearEnd} onChange={(e) => set("isYearEnd", e.target.checked)} className="mt-0.5 accent-[#2563EB]" />
            <span>
              <span className="block text-sm font-medium text-white">Year-end period</span>
              <span className="block text-xs text-white/40 mt-0.5">Enables the year-end closing workflow for this period.</span>
            </span>
          </label>
          <div className="space-y-1.5">
            <FieldLabel>Notes</FieldLabel>
            <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3}
              placeholder="Optional close checklist or accounting notes"
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] p-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563EB]/60 resize-none" />
          </div>
          <FieldError>{error}</FieldError>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
          <Button onClick={save} disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            {busy ? "Saving…" : editPeriod ? "Save changes" : "Create period"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function YearEndDialog({ period, open, onClose, onSaved }: {
  period: FinancialPeriod | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const { data: accountsRes, isLoading: accountsLoading } = useClosingAccounts();
  const runClosing = useRunYearEndClosing();
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const accounts = accountsRes?.data ?? [];

  useEffect(() => {
    if (!open) return;
    setAccountId(accounts[0] ? String(accounts[0].id) : "");
    setNotes("");
    setError("");
  }, [open, period?.id, accountsRes]);

  async function submit() {
    if (!period) return;
    if (!accountId) { setError("Select a retained earnings account."); return; }
    if (!window.confirm(`Complete year-end closing for ${period.name}? This will post an immutable closing journal entry and lock the period.`)) return;
    setError("");
    try {
      await runClosing.mutateAsync({ id: period.id, retainedEarningsAccountId: Number(accountId), notes: notes.trim() || null });
      onSaved(`Year-end closing completed for ${period.name}`);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Could not complete year-end closing.");
      toast({ title: "Year-end closing failed", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" />Run year-end closing</DialogTitle>
          <DialogDescription className="text-white/45">
            {period?.name} · {dateLabel(period?.startDate ?? null)} – {dateLabel(period?.endDate ?? null)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-200/80 leading-relaxed">
            This action closes all posted Income and Expense balances into retained earnings, creates a posted journal entry, and locks the period. Draft journal entries must be resolved first.
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Retained earnings account</FieldLabel>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={accountsLoading}
              className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-3 text-sm text-white outline-none focus:border-[#2563EB]/60">
              <option value="">{accountsLoading ? "Loading equity accounts…" : "Select an equity account"}</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Closing notes</FieldLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional audit note"
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] p-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563EB]/60 resize-none" />
          </div>
          <FieldError>{error}</FieldError>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
          <Button onClick={submit} disabled={runClosing.isPending || accountsLoading || !accounts.length} className="bg-amber-600 hover:bg-amber-500 text-white">
            {runClosing.isPending ? "Closing books…" : "Complete year-end close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PeriodClosingTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editPeriod, setEditPeriod] = useState<FinancialPeriod | null>(null);
  const [closingPeriod, setClosingPeriod] = useState<FinancialPeriod | null>(null);
  const { data: permsRes } = useClosingPermissions();
  const { data, isLoading, isFetching, refetch } = useClosingPeriods({ search: search || undefined, status: status || undefined, fiscalYear: year || undefined });
  const changeStatus = useChangeClosingPeriodStatus();
  const remove = useDeleteClosingPeriod();
  const periods = data?.data ?? [];
  const perms = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const summary = data?.summary ?? { total: 0, open: 0, softClosed: 0, closed: 0, yearEndClosed: 0 };

  const latestYear = useMemo(() => periods.length ? Math.max(...periods.map((period) => period.fiscalYear)) : null, [periods]);

  if (permsRes && !perms.canView) {
    return <div className="flex flex-col items-center justify-center py-20 text-center gap-3"><ShieldOff className="w-8 h-8 text-white/20" /><p className="text-sm text-white/30">You don't have permission to view period closing.</p></div>;
  }

  async function action(period: FinancialPeriod, actionName: "soft-close" | "close" | "reopen") {
    const labels = { "soft-close": "soft-close", close: "close", reopen: "reopen" };
    if (!window.confirm(`${labels[actionName][0].toUpperCase()}${labels[actionName].slice(1)} ${period.name}?`)) return;
    try {
      await changeStatus.mutateAsync({ id: period.id, action: actionName });
      toast({ title: `${period.name} ${actionName === "reopen" ? "reopened" : `${labels[actionName]}d`}` });
    } catch (err: any) {
      toast({ title: "Period action failed", description: err?.message, variant: "destructive" });
    }
  }

  async function deletePeriod(period: FinancialPeriod) {
    if (!window.confirm(`Delete ${period.name}? Only empty open periods can be deleted.`)) return;
    try {
      await remove.mutateAsync(period.id);
      toast({ title: "Financial period deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete period", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Periods", value: summary.total, icon: CalendarDays, color: "text-white", border: "border-white/[0.07]" },
          { label: "Open", value: summary.open, icon: UnlockKeyhole, color: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Soft closed", value: summary.softClosed, icon: Clock3, color: "text-amber-400", border: "border-amber-500/20" },
          { label: "Closed", value: summary.closed, icon: LockKeyhole, color: "text-white/60", border: "border-white/[0.07]" },
          { label: "Year-end completed", value: summary.yearEndClosed, icon: CheckCircle2, color: "text-[#60A5FA]", border: "border-[#2563EB]/25" },
        ].map((card) => (
          <div key={card.label} className={cn("bg-[#0a0f1e] border rounded-xl p-4", card.border)}>
            <div className="flex items-center justify-between"><p className="text-xs text-white/40">{card.label}</p><card.icon className={cn("w-4 h-4", card.color)} /></div>
            <p className={cn("text-2xl font-bold mt-2", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search periods…" className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>
          <Input type="number" placeholder="Fiscal year" value={year} onChange={(e) => setYear(e.target.value)} className="w-28 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-white/[0.07] bg-[#11172b] px-2 text-sm text-white/60 outline-none">
            <option value="">All statuses</option><option value="open">Open</option><option value="soft_closed">Soft closed</option><option value="closed">Closed</option>
          </select>
          <button onClick={() => refetch()} title="Refresh" className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /></button>
          {perms.canCreate && <Button size="sm" onClick={() => { setEditPeriod(null); setFormOpen(true); }} className="ml-auto bg-[#2563EB] hover:bg-[#1d4ed8] h-8"><Plus className="w-3.5 h-3.5 mr-1.5" />New period</Button>}
        </div>

        <div className="px-5 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Period controls</h3>
            <p className="text-xs text-white/35 mt-0.5">Posting locks are enforced against journal entry dates. Year-end closing is immutable once completed.</p>
          </div>
          {latestYear && <Badge className="bg-[#2563EB]/12 text-[#60A5FA] border-[#2563EB]/25">Latest FY {latestYear}</Badge>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr className="border-b border-white/[0.05]">
              {["Period", "Date range", "Entries", "Status", "Year-end", "Closed at", "Actions"].map((heading) => <th key={heading} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{heading}</th>)}
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <tr key={index} className="border-b border-white/[0.04]">{Array.from({ length: 7 }).map((__, cell) => <td key={cell} className="px-4 py-4"><div className="h-3.5 bg-white/[0.04] rounded animate-pulse" /></td>)}</tr>) : periods.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center"><CalendarDays className="w-7 h-7 mx-auto text-white/15 mb-3" /><p className="text-sm text-white/35">No financial periods found.</p><p className="text-xs text-white/20 mt-1">Create a period to start controlling posting dates.</p></td></tr>
              ) : periods.map((period) => {
                const statusConfig = STATUS[period.status];
                const StatusIcon = statusConfig.icon;
                return <tr key={period.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div><p className="text-sm font-medium text-white">{period.name}</p><p className="text-[11px] text-white/35">FY {period.fiscalYear}</p></div>{period.isYearEnd && <Badge className="bg-amber-500/12 text-amber-300 border-amber-500/20 text-[10px]">Year end</Badge>}</div></td>
                  <td className="px-4 py-3 text-sm text-white/55 whitespace-nowrap">{dateLabel(period.startDate)} <span className="text-white/20">→</span> {dateLabel(period.endDate)}</td>
                  <td className="px-4 py-3 text-sm text-white/65 tabular-nums">{period.entries ?? "—"} <span className="text-white/25 text-xs">{period.draftEntries ? `(${period.draftEntries} draft)` : ""}</span></td>
                  <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border", statusConfig.className)}><StatusIcon className="w-3 h-3" />{statusConfig.label}</span></td>
                  <td className="px-4 py-3">{period.closing ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Completed</span> : period.isYearEnd ? <span className="text-xs text-amber-400/80">Ready</span> : <span className="text-xs text-white/25">Not applicable</span>}</td>
                  <td className="px-4 py-3 text-xs text-white/45 whitespace-nowrap">{dateLabel(period.closedAt)}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1">
                    {perms.canEdit && period.status === "open" && <button onClick={() => action(period, "soft-close")} title="Soft-close" className="p-1.5 rounded text-white/35 hover:bg-amber-500/10 hover:text-amber-400"><LockKeyhole className="w-3.5 h-3.5" /></button>}
                    {perms.canEdit && period.status !== "closed" && <button onClick={() => action(period, "close")} title="Close period" className="p-1.5 rounded text-white/35 hover:bg-white/[0.07] hover:text-white/75"><Archive className="w-3.5 h-3.5" /></button>}
                    {perms.canEdit && period.status === "soft_closed" && <button onClick={() => action(period, "reopen")} title="Reopen" className="p-1.5 rounded text-white/35 hover:bg-emerald-500/10 hover:text-emerald-400"><RotateCcw className="w-3.5 h-3.5" /></button>}
                    {perms.canCreate && period.isYearEnd && !period.closing && period.status !== "closed" && <button onClick={() => setClosingPeriod(period)} title="Run year-end close" className="p-1.5 rounded text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300"><Zap className="w-3.5 h-3.5" /></button>}
                    {perms.canEdit && period.status === "open" && <button onClick={() => { setEditPeriod(period); setFormOpen(true); }} title="Edit" className="p-1.5 rounded text-white/35 hover:bg-white/[0.07] hover:text-white/75"><Edit3 className="w-3.5 h-3.5" /></button>}
                    {perms.canDelete && period.status === "open" && <button onClick={() => deletePeriod(period)} title="Delete" className="p-1.5 rounded text-white/35 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {periods.length > 0 && <div className="px-4 py-3 border-t border-white/[0.06] text-xs text-white/30">{periods.length} period{periods.length === 1 ? "" : "s"} · {summary.yearEndClosed} completed year-end closing{summary.yearEndClosed === 1 ? "" : "s"}</div>}
      </div>

      <PeriodFormDialog open={formOpen} onClose={() => setFormOpen(false)} editPeriod={editPeriod} onSaved={(message) => toast({ title: message })} />
      <YearEndDialog open={closingPeriod !== null} period={closingPeriod} onClose={() => setClosingPeriod(null)} onSaved={(message) => toast({ title: message })} />
    </div>
  );
}