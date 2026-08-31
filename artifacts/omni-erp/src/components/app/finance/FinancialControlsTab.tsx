import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Edit3, Eye,
  FileWarning, Lock, Plus, RefreshCw, ShieldCheck, Trash2, UserRound, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateControlException, useCreateControlRun, useCreateFinancialControl,
  useDeleteControlException, useDeleteControlRun, useDeleteFinancialControl,
  useFinancialControlDetail, useFinancialControlPermissions, useFinancialControls,
  useFinancialControlSummary, useFinancialControlUsers, useUpdateControlException,
  useUpdateControlRun, useUpdateFinancialControl,
  type ControlCategory, type ControlException, type ControlFormValues, type ControlFrequency,
  type ControlRisk, type ControlRun, type ExceptionFormValues, type ExceptionSeverity,
  type ExceptionStatus, type FinancialControl, type RunResult, type RunStatus,
} from "@/hooks/useFinancialControls";
import { cn } from "@/lib/utils";

const categories: Array<[ControlCategory, string]> = [
  ["reconciliation", "Reconciliation"], ["approval", "Approval"], ["segregation_of_duties", "Segregation of duties"],
  ["period_close", "Period close"], ["journal_review", "Journal review"], ["access", "Access"], ["other", "Other"],
];
const frequencies: Array<[ControlFrequency, string]> = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"], ["annual", "Annual"], ["event", "Event driven"]];
const risks: Array<[ControlRisk, string]> = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]];
const runStatuses: Array<[RunStatus, string]> = [["pending", "Pending"], ["in_progress", "In progress"], ["completed", "Completed"], ["waived", "Waived"]];
const runResults: Array<[RunResult, string]> = [["pending", "Pending"], ["passed", "Passed"], ["failed", "Failed"], ["partial", "Partially passed"]];
const exceptionStatuses: Array<[ExceptionStatus, string]> = [["open", "Open"], ["investigating", "Investigating"], ["resolved", "Resolved"], ["accepted", "Accepted"]];
const exceptionSeverities: Array<[ExceptionSeverity, string]> = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]];

const EMPTY_CONTROL: ControlFormValues = { name: "", description: "", category: "reconciliation", frequency: "monthly", riskLevel: "medium", ownerId: null, reviewerId: null, threshold: null, dueDay: null, status: "active" };
const EMPTY_EXCEPTION: ExceptionFormValues = { title: "", description: "", severity: "medium", status: "open", assignedTo: null, dueDate: null, resolution: "" };

function labelOf<T extends string>(options: Array<[T, string]>, value: T) {
  return options.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ");
}
function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(name: string | null | undefined) {
  return (name ?? "Unassigned").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
function statusClass(value: string) {
  if (["passed", "resolved", "accepted", "active", "completed"].includes(value)) return "bg-emerald-500/12 text-emerald-300 border-emerald-500/25";
  if (["failed", "critical", "high"].includes(value)) return "bg-red-500/12 text-red-300 border-red-500/25";
  if (["partial", "investigating", "in_progress", "medium"].includes(value)) return "bg-amber-500/12 text-amber-300 border-amber-500/25";
  return "bg-white/[0.06] text-white/50 border-white/10";
}
function Pill({ value }: { value: string }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize", statusClass(value))}>{value.replaceAll("_", " ")}</span>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{label}</label>{children}</div>;
}

function ControlDialog({ open, onClose, edit, users, onSaved }: { open: boolean; onClose: () => void; edit: FinancialControl | null; users: Array<{ id: number; name: string; email: string }>; onSaved: () => void }) {
  const { toast } = useToast();
  const create = useCreateFinancialControl();
  const update = useUpdateFinancialControl();
  const [form, setForm] = useState<ControlFormValues>(EMPTY_CONTROL);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(edit ? { name: edit.name, description: edit.description ?? "", category: edit.category, frequency: edit.frequency, riskLevel: edit.riskLevel, ownerId: edit.ownerId, reviewerId: edit.reviewerId, threshold: edit.threshold ? Number(edit.threshold) : null, dueDay: edit.dueDay, status: edit.status } : { ...EMPTY_CONTROL });
  }, [open, edit]);
  function set<K extends keyof ControlFormValues>(key: K, value: ControlFormValues[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function save() {
    setError("");
    if (form.name.trim().length < 2) { setError("Control name must be at least 2 characters."); return; }
    if (form.ownerId && form.reviewerId && form.ownerId === form.reviewerId) { setError("Owner and reviewer must be different people."); return; }
    try {
      if (edit) await update.mutateAsync({ id: edit.id, data: { ...form, name: form.name.trim(), description: form.description?.trim() || null } });
      else await create.mutateAsync({ ...form, name: form.name.trim(), description: form.description?.trim() || null });
      toast({ title: edit ? "Control updated" : "Control created" }); onSaved(); onClose();
    } catch (err: any) { setError(err?.message ?? "Could not save the control."); }
  }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-2xl bg-[#0d1225] border-white/[0.1] text-white">
    <DialogHeader><DialogTitle className="text-white">{edit ? "Edit financial control" : "Create financial control"}</DialogTitle><DialogDescription className="text-white/45">Define the owner, reviewer, frequency, and risk profile for this control.</DialogDescription></DialogHeader>
    <div className="grid gap-4">
      <Field label="Control name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Monthly bank reconciliation" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></Field>
      <Field label="Description"><Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="What evidence is required and what risk does this control address?" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Category"><select value={form.category} onChange={(e) => set("category", e.target.value as ControlCategory)} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{categories.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
        <Field label="Frequency"><select value={form.frequency} onChange={(e) => set("frequency", e.target.value as ControlFrequency)} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{frequencies.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
        <Field label="Risk level"><select value={form.riskLevel} onChange={(e) => set("riskLevel", e.target.value as ControlRisk)} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{risks.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Control owner"><select value={form.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
        <Field label="Independent reviewer"><select value={form.reviewerId ?? ""} onChange={(e) => set("reviewerId", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
        <Field label="Threshold (optional)"><Input type="number" min="0" step="0.01" value={form.threshold ?? ""} onChange={(e) => set("threshold", e.target.value ? Number(e.target.value) : null)} placeholder="0.00" className="bg-white/[0.04] border-white/[0.1] text-white" /></Field>
        <Field label="Due day of month"><Input type="number" min="1" max="31" value={form.dueDay ?? ""} onChange={(e) => set("dueDay", e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 5" className="bg-white/[0.04] border-white/[0.1] text-white" /></Field>
      </div>
      {edit && <Field label="Status"><select value={form.status} onChange={(e) => set("status", e.target.value as "active" | "inactive")} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white"><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
    <DialogFooter><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60">Cancel</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{create.isPending || update.isPending ? "Saving…" : edit ? "Save changes" : "Create control"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function RunDialog({ open, onClose, control, onSaved }: { open: boolean; onClose: () => void; control: FinancialControl | null; onSaved: () => void }) {
  const { toast } = useToast();
  const create = useCreateControlRun();
  const [form, setForm] = useState({ periodStart: `${new Date().getFullYear()}-01-01`, periodEnd: new Date().toISOString().slice(0, 10), dueDate: "", notes: "", evidenceReference: "" });
  useEffect(() => { if (open) setForm({ periodStart: `${new Date().getFullYear()}-01-01`, periodEnd: new Date().toISOString().slice(0, 10), dueDate: "", notes: "", evidenceReference: "" }); }, [open]);
  async function save() {
    if (!control || !form.periodStart || !form.periodEnd || form.periodEnd < form.periodStart) { toast({ title: "Choose a valid period range", variant: "destructive" }); return; }
    try { await create.mutateAsync({ controlId: control.id, data: { ...form, dueDate: form.dueDate || null, notes: form.notes.trim() || null, evidenceReference: form.evidenceReference.trim() || null } }); toast({ title: "Control run created" }); onSaved(); onClose(); } catch (err: any) { toast({ title: "Could not create run", description: err?.message, variant: "destructive" }); }
  }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-lg bg-[#0d1225] border-white/[0.1] text-white"><DialogHeader><DialogTitle className="text-white">Start control run</DialogTitle><DialogDescription className="text-white/45">{control?.controlNumber} · {control?.name}</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid grid-cols-2 gap-3"><Field label="Period start"><Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field><Field label="Period end"><Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field></div><Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field><Field label="Evidence reference"><Input value={form.evidenceReference} onChange={(e) => setForm({ ...form, evidenceReference: e.target.value })} placeholder="Bank statement, close checklist, ticket ID…" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></Field><Field label="Run notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field></div><DialogFooter><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60">Cancel</Button><Button onClick={save} disabled={create.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{create.isPending ? "Starting…" : "Start run"}</Button></DialogFooter></DialogContent></Dialog>;
}

function RunDialogEdit({ open, onClose, run, users, onSaved }: { open: boolean; onClose: () => void; run: ControlRun | null; users: Array<{ id: number; name: string; email: string }>; onSaved: () => void }) {
  const { toast } = useToast();
  const update = useUpdateControlRun();
  const [form, setForm] = useState({ status: "pending" as RunStatus, result: "pending" as RunResult, notes: "", evidenceReference: "", reviewedBy: null as number | null });
  useEffect(() => { if (open && run) setForm({ status: run.status, result: run.result, notes: run.notes ?? "", evidenceReference: run.evidenceReference ?? "", reviewedBy: run.reviewedBy }); }, [open, run]);
  async function save() {
    if (!run) return;
    try { await update.mutateAsync({ id: run.id, data: { ...form, notes: form.notes.trim() || null, evidenceReference: form.evidenceReference.trim() || null } }); toast({ title: "Control run updated" }); onSaved(); onClose(); } catch (err: any) { toast({ title: "Could not update run", description: err?.message, variant: "destructive" }); }
  }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-lg bg-[#0d1225] border-white/[0.1] text-white"><DialogHeader><DialogTitle className="text-white">Update {run?.runNumber}</DialogTitle><DialogDescription className="text-white/45">{dateLabel(run?.periodStart)} – {dateLabel(run?.periodEnd)}</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid grid-cols-2 gap-3"><Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RunStatus })} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{runStatuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field><Field label="Result"><select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as RunResult })} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{runResults.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field></div><Field label="Reviewer"><select value={form.reviewedBy ?? ""} onChange={(e) => setForm({ ...form, reviewedBy: e.target.value ? Number(e.target.value) : null })} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white"><option value="">No review recorded</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Evidence reference"><Input value={form.evidenceReference} onChange={(e) => setForm({ ...form, evidenceReference: e.target.value })} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field></div><DialogFooter><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60">Cancel</Button><Button onClick={save} disabled={update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{update.isPending ? "Saving…" : "Save run"}</Button></DialogFooter></DialogContent></Dialog>;
}

function ExceptionDialog({ open, onClose, run, edit, users, onSaved }: { open: boolean; onClose: () => void; run: ControlRun | null; edit: ControlException | null; users: Array<{ id: number; name: string; email: string }>; onSaved: () => void }) {
  const { toast } = useToast();
  const create = useCreateControlException();
  const update = useUpdateControlException();
  const [form, setForm] = useState<ExceptionFormValues>(EMPTY_EXCEPTION);
  useEffect(() => { if (open) setForm(edit ? { title: edit.title, description: edit.description ?? "", severity: edit.severity, status: edit.status, assignedTo: edit.assignedTo, dueDate: edit.dueDate, resolution: edit.resolution ?? "" } : { ...EMPTY_EXCEPTION }); }, [open, edit]);
  async function save() {
    if (form.title.trim().length < 2) { toast({ title: "Exception title is required", variant: "destructive" }); return; }
    if ((form.status === "resolved" || form.status === "accepted") && !form.resolution?.trim()) { toast({ title: "Add a resolution before closing", variant: "destructive" }); return; }
    try {
      if (edit) await update.mutateAsync({ id: edit.id, data: { ...form, title: form.title.trim(), description: form.description?.trim() || null, resolution: form.resolution?.trim() || null, dueDate: form.dueDate || null } });
      else if (run) await create.mutateAsync({ runId: run.id, data: { ...form, title: form.title.trim(), description: form.description?.trim() || null, resolution: form.resolution?.trim() || null, dueDate: form.dueDate || null } });
      toast({ title: edit ? "Exception updated" : "Exception logged" }); onSaved(); onClose();
    } catch (err: any) { toast({ title: "Could not save exception", description: err?.message, variant: "destructive" }); }
  }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-lg bg-[#0d1225] border-white/[0.1] text-white"><DialogHeader><DialogTitle className="text-white">{edit ? "Update exception" : "Log control exception"}</DialogTitle><DialogDescription className="text-white/45">{edit?.exceptionNumber ?? run?.runNumber} · Document an issue and its remediation owner.</DialogDescription></DialogHeader><div className="grid gap-4"><Field label="Exception title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Unreconciled bank item over threshold" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></Field><Field label="Description"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Severity"><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as ExceptionSeverity })} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{exceptionSeverities.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ExceptionStatus })} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white">{exceptionStatuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field></div><Field label="Assignee"><select value={form.assignedTo ?? ""} onChange={(e) => setForm({ ...form, assignedTo: e.target.value ? Number(e.target.value) : null })} className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-2 text-sm text-white"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Due date"><Input type="date" value={form.dueDate ?? ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} className="bg-white/[0.04] border-white/[0.1] text-white" /></Field><Field label="Resolution"><Input value={form.resolution ?? ""} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="Required when closed" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></Field></div></div><DialogFooter><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60">Cancel</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{create.isPending || update.isPending ? "Saving…" : edit ? "Save exception" : "Log exception"}</Button></DialogFooter></DialogContent></Dialog>;
}

function DetailPanel({ control, users, canEdit, canDelete, onRefresh }: { control: FinancialControl; users: Array<{ id: number; name: string; email: string }>; canEdit: boolean; canDelete: boolean; onRefresh: () => void }) {
  const { toast } = useToast();
  const removeRun = useDeleteControlRun();
  const removeException = useDeleteControlException();
  const [runOpen, setRunOpen] = useState(false);
  const [editRun, setEditRun] = useState<ControlRun | null>(null);
  const [exceptionRun, setExceptionRun] = useState<ControlRun | null>(null);
  const [editException, setEditException] = useState<ControlException | null>(null);
  const exceptions = control.exceptions ?? [];
  async function deleteRun(run: ControlRun) { if (!window.confirm(`Delete ${run.runNumber}?`)) return; try { await removeRun.mutateAsync(run.id); toast({ title: "Run deleted" }); onRefresh(); } catch (err: any) { toast({ title: "Could not delete run", description: err?.message, variant: "destructive" }); } }
  async function deleteException(item: ControlException) { if (!window.confirm(`Delete ${item.exceptionNumber}?`)) return; try { await removeException.mutateAsync(item.id); toast({ title: "Exception deleted" }); onRefresh(); } catch (err: any) { toast({ title: "Could not delete exception", description: err?.message, variant: "destructive" }); } }
  return <div className="mt-4 rounded-xl border border-[#2563EB]/25 bg-[#0a0f1e] overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-white/[0.07]"><div><div className="flex items-center gap-2"><span className="font-mono text-xs text-cyan-300">{control.controlNumber}</span><Pill value={control.status} /></div><h3 className="mt-1 text-lg font-semibold text-white">{control.name}</h3><p className="mt-1 max-w-3xl text-sm text-white/45">{control.description || "No control description provided."}</p></div><div className="flex items-center gap-2">{canEdit && <Button size="sm" onClick={() => setRunOpen(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="mr-1.5 h-3.5 w-3.5" />Start run</Button>}<button onClick={onRefresh} className="rounded p-2 text-white/35 hover:bg-white/[0.07] hover:text-white"><RefreshCw className="h-4 w-4" /></button></div></div>
    <div className="grid grid-cols-2 gap-3 border-b border-white/[0.07] p-5 md:grid-cols-5"><div><p className="text-[10px] uppercase tracking-wider text-white/35">Category</p><p className="mt-1 text-sm text-white/75">{labelOf(categories, control.category)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/35">Frequency</p><p className="mt-1 text-sm text-white/75 capitalize">{control.frequency}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/35">Risk</p><div className="mt-1"><Pill value={control.riskLevel} /></div></div><div><p className="text-[10px] uppercase tracking-wider text-white/35">Owner</p><p className="mt-1 flex items-center gap-1.5 text-sm text-white/75"><UserRound className="h-3.5 w-3.5 text-white/35" />{control.ownerName || "Unassigned"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/35">Reviewer</p><p className="mt-1 flex items-center gap-1.5 text-sm text-white/75"><ShieldCheck className="h-3.5 w-3.5 text-white/35" />{control.reviewerName || "Unassigned"}</p></div></div>
    <div className="grid gap-5 p-5 xl:grid-cols-3"><div className="xl:col-span-2"><div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-semibold text-white">Execution history</h4><p className="text-xs text-white/35">Evidence and results for each control period.</p></div><span className="text-xs text-white/35">{control.runs?.length ?? 0} runs</span></div><div className="overflow-x-auto rounded-lg border border-white/[0.07]"><table className="w-full min-w-[700px]"><thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">{["Run", "Period", "Status", "Result", "Exceptions", "Actions"].map((head) => <th key={head} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-white/35">{head}</th>)}</tr></thead><tbody>{(control.runs ?? []).map((run) => <tr key={run.id} className="border-b border-white/[0.04] last:border-0"><td className="px-3 py-3 font-mono text-xs text-cyan-300">{run.runNumber}</td><td className="px-3 py-3 text-xs text-white/55">{dateLabel(run.periodStart)} → {dateLabel(run.periodEnd)}{run.dueDate && <span className="block text-[10px] text-white/30">Due {dateLabel(run.dueDate)}</span>}</td><td className="px-3 py-3"><Pill value={run.status} /></td><td className="px-3 py-3"><Pill value={run.result} /></td><td className="px-3 py-3 text-sm text-white/65">{run.exceptionCount}</td><td className="px-3 py-3"><div className="flex items-center gap-1">{canEdit && <><button title="Update run" onClick={() => setEditRun(run)} className="rounded p-1.5 text-white/35 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></button><button title="Log exception" onClick={() => setExceptionRun(run)} className="rounded p-1.5 text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300"><FileWarning className="h-3.5 w-3.5" /></button></>}{canDelete && <button title="Delete run" onClick={() => deleteRun(run)} className="rounded p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}</div></td></tr>)}{!control.runs?.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-white/35">No runs yet. Start the first control execution above.</td></tr>}</tbody></table></div></div>
      <div><div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-semibold text-white">Exceptions</h4><p className="text-xs text-white/35">Open issues require remediation.</p></div><span className="text-xs text-white/35">{exceptions.length} total</span></div><div className="space-y-2">{exceptions.map((item) => <div key={item.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-mono text-[10px] text-amber-300">{item.exceptionNumber}</p><p className="mt-1 text-sm font-medium text-white">{item.title}</p></div><Pill value={item.severity} /></div><div className="mt-2 flex items-center justify-between gap-2"><Pill value={item.status} /><span className="truncate text-[11px] text-white/35">{item.assignedToName || "Unassigned"}</span></div><div className="mt-2 flex justify-end gap-1">{canEdit && <button title="Edit exception" onClick={() => setEditException(item)} className="rounded p-1.5 text-white/35 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></button>}{canDelete && <button title="Delete exception" onClick={() => deleteException(item)} className="rounded p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}</div></div>)}{!exceptions.length && <div className="rounded-lg border border-dashed border-white/[0.1] px-3 py-8 text-center text-xs text-white/35">No exceptions logged.</div>}</div></div></div>
    <RunDialog open={runOpen} control={control} onClose={() => setRunOpen(false)} onSaved={onRefresh} /><RunDialogEdit open={editRun !== null} run={editRun} users={users} onClose={() => setEditRun(null)} onSaved={onRefresh} /><ExceptionDialog open={exceptionRun !== null || editException !== null} run={exceptionRun} edit={editException} users={users} onClose={() => { setExceptionRun(null); setEditException(null); }} onSaved={onRefresh} />
  </div>;
}

export default function FinancialControlsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<FinancialControl | null>(null);
  const permsQuery = useFinancialControlPermissions();
  const { data: summaryRes } = useFinancialControlSummary();
  const { data: usersRes } = useFinancialControlUsers();
  const listQuery = useFinancialControls({ search: search || undefined, status: status || undefined, category: category || undefined, riskLevel: riskLevel || undefined });
  const detailQuery = useFinancialControlDetail(selectedId);
  const remove = useDeleteFinancialControl();
  const perms = permsQuery.data?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const summary = summaryRes?.data;
  const users = usersRes?.data ?? [];
  const controls = listQuery.data?.data ?? [];
  const selected = detailQuery.data?.data ?? null;
  const cards = useMemo(() => [
    { label: "Active controls", value: summary?.activeControls ?? 0, icon: ShieldCheck, color: "text-emerald-400", border: "border-emerald-500/20" },
    { label: "Pending runs", value: summary?.pendingRuns ?? 0, icon: CalendarClock, color: "text-cyan-300", border: "border-cyan-500/20" },
    { label: "Open exceptions", value: summary?.openExceptions ?? 0, icon: AlertTriangle, color: "text-amber-400", border: "border-amber-500/20" },
    { label: "High-risk exceptions", value: summary?.highRiskExceptions ?? 0, icon: Lock, color: "text-red-400", border: "border-red-500/20" },
    { label: "Pass rate", value: `${summary?.passRate ?? 0}%`, icon: CheckCircle2, color: "text-[#60A5FA]", border: "border-[#2563EB]/25" },
  ], [summary]);
  if (permsQuery.data && !perms.canView) return <div className="flex flex-col items-center justify-center gap-3 py-20 text-center"><Lock className="h-8 w-8 text-white/20" /><p className="text-sm text-white/35">You don't have permission to view financial controls.</p></div>;
  async function deleteControl(control: FinancialControl) {
    if (!window.confirm(`Delete ${control.controlNumber}? Controls with execution history cannot be deleted.`)) return;
    try { await remove.mutateAsync(control.id); if (selectedId === control.id) setSelectedId(null); toast({ title: "Financial control deleted" }); } catch (err: any) { toast({ title: "Could not delete control", description: err?.message, variant: "destructive" }); }
  }
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map((card) => <div key={card.label} className={cn("rounded-xl border bg-[#0a0f1e] p-4", card.border)}><div className="flex items-center justify-between"><p className="text-xs text-white/40">{card.label}</p><card.icon className={cn("h-4 w-4", card.color)} /></div><p className={cn("mt-2 text-2xl font-bold", card.color)}>{card.value}</p></div>)}</div>
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] p-4"><div className="relative min-w-[220px] flex-1"><ClipboardCheck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search controls…" className="h-8 bg-white/[0.04] border-white/[0.07] pl-9 text-sm text-white placeholder:text-white/30" /></div><select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-md border border-white/[0.07] bg-[#11172b] px-2 text-xs text-white/65"><option value="">All categories</option>{categories.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="h-8 rounded-md border border-white/[0.07] bg-[#11172b] px-2 text-xs text-white/65"><option value="">All risks</option>{risks.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-white/[0.07] bg-[#11172b] px-2 text-xs text-white/65"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button onClick={() => listQuery.refetch()} className="rounded p-1.5 text-white/35 hover:bg-white/[0.07] hover:text-white"><RefreshCw className={cn("h-3.5 w-3.5", listQuery.isFetching && "animate-spin")} /></button>{perms.canCreate && <Button size="sm" onClick={() => { setEdit(null); setFormOpen(true); }} className="ml-auto h-8 bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="mr-1.5 h-3.5 w-3.5" />New control</Button>}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px]"><thead><tr className="border-b border-white/[0.05]">{["Control", "Category", "Owner / reviewer", "Frequency", "Risk", "Latest run", "Actions"].map((head) => <th key={head} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-white/30">{head}</th>)}</tr></thead><tbody>{listQuery.isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i} className="border-b border-white/[0.04]">{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-3 rounded bg-white/[0.04] animate-pulse" /></td>)}</tr>) : controls.length === 0 ? <tr><td colSpan={7} className="px-4 py-14 text-center"><ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-white/15" /><p className="text-sm text-white/35">No financial controls found.</p><p className="mt-1 text-xs text-white/20">Create your first control to start a controlled execution trail.</p></td></tr> : controls.map((control) => <tr key={control.id} className={cn("cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]", selectedId === control.id && "bg-[#2563EB]/[0.07]")} onClick={() => setSelectedId(selectedId === control.id ? null : control.id)}><td className="px-4 py-3"><div className="flex items-start gap-2"><div className="mt-0.5 rounded-md bg-[#2563EB]/12 p-1.5 text-[#60A5FA]"><ShieldCheck className="h-3.5 w-3.5" /></div><div><p className="font-mono text-[11px] text-cyan-300">{control.controlNumber}</p><p className="mt-0.5 text-sm font-medium text-white">{control.name}</p></div></div></td><td className="px-4 py-3 text-xs text-white/55">{labelOf(categories, control.category)}</td><td className="px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-white/65"><UserRound className="h-3 w-3 text-white/30" />{control.ownerName || "Unassigned"}</p><p className="mt-1 text-[10px] text-white/30">Review: {control.reviewerName || "Unassigned"}</p></td><td className="px-4 py-3 text-xs capitalize text-white/55">{control.frequency}{control.dueDay ? <span className="block text-[10px] text-white/25">Day {control.dueDay}</span> : null}</td><td className="px-4 py-3"><Pill value={control.riskLevel} /></td><td className="px-4 py-3">{control.latestRun ? <div><Pill value={control.latestRun.result} /><p className="mt-1 text-[10px] text-white/30">{control.latestRun.runNumber} · {control.latestRun.exceptionCount} exceptions</p></div> : <span className="text-xs text-white/25">No runs</span>}</td><td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-1"><button title="View details" onClick={() => setSelectedId(control.id)} className="rounded p-1.5 text-white/35 hover:bg-white/[0.07] hover:text-white"><Eye className="h-3.5 w-3.5" /></button>{perms.canEdit && <button title="Edit control" onClick={() => { setEdit(control); setFormOpen(true); }} className="rounded p-1.5 text-white/35 hover:bg-white/[0.07] hover:text-white"><Edit3 className="h-3.5 w-3.5" /></button>}{perms.canDelete && <button title="Delete control" onClick={() => deleteControl(control)} className="rounded p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}</div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-xs text-white/30"><span>{listQuery.data?.total ?? controls.length} control{(listQuery.data?.total ?? controls.length) === 1 ? "" : "s"}</span><span>{summary?.completedRuns ?? 0} completed runs · {summary?.passedRuns ?? 0} passed</span></div></div>
    {selected && <DetailPanel control={selected} users={users} canEdit={perms.canEdit} canDelete={perms.canDelete} onRefresh={() => detailQuery.refetch()} />}
    <ControlDialog open={formOpen} edit={edit} users={users} onClose={() => setFormOpen(false)} onSaved={() => { listQuery.refetch(); if (selectedId) detailQuery.refetch(); }} />
  </div>;
}