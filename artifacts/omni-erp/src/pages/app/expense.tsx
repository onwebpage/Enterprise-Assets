import { useState } from "react";
import { Receipt, FileText, ListChecks, ShieldCheck, Plus, Trash2, CheckCircle2, XCircle, Banknote, Loader2, Settings2, Wallet } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import KPICard from "@/components/app/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/currency";
import {
  useExpenseSummary, useExpenseCategories, useExpensePolicies, useExpenseClaims,
  useCreateExpenseCategory, useDeleteExpenseCategory,
  useCreateExpensePolicy, useDeleteExpensePolicy,
  useCreateExpenseClaim, useSubmitExpenseClaim, useApproveExpenseClaim,
  useRejectExpenseClaim, useReimburseExpenseClaim, useDeleteExpenseClaim,
} from "@/hooks/useExpense";

const today = () => new Date().toISOString().slice(0, 10);
const field = "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 h-9 text-sm";
const select = `${field} rounded-md px-3`;
function fmt(value: unknown) { return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function Status({ value }: { value: string }) {
  const tone = value === "approved" || value === "reimbursed" ? "text-emerald-400 bg-emerald-500/10" : value === "rejected" ? "text-red-400 bg-red-500/10" : value === "draft" ? "text-white/40 bg-white/10" : value === "submitted" || value === "in_review" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10";
  return <Badge className={`border-0 capitalize ${tone}`}>{value.replaceAll("_", " ")}</Badge>;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{headers.map(h => <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/35">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function Empty({ cols, text = "No records found." }: { cols: number; text?: string }) { return <tr><td colSpan={cols} className="px-4 py-12 text-center text-white/30">{text}</td></tr>; }
function Row({ children }: { children: React.ReactNode }) { return <tr className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]">{children}</tr>; }
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1 block text-[11px] font-medium text-white/45">{children}</label>; }
function Busy({ pending }: { pending: boolean }) { return pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null; }

export default function Expense() {
  const [tab, setTab] = useState("overview");
  const { data: summaryRes, isLoading: summaryLoading } = useExpenseSummary();
  const summary = summaryRes?.data;
  const tabs = [
    { id: "overview", label: "Control tower", icon: Settings2 },
    { id: "claims", label: "Claims", icon: FileText },
    { id: "categories", label: "Categories", icon: ListChecks },
    { id: "policies", label: "Policies", icon: ShieldCheck },
  ];
  const kpis = [
    { label: "Total claims", value: summaryLoading ? "..." : fmt(summary?.totalClaims), change: `${fmt(summary?.draftClaims)} drafts`, icon: FileText, iconColor: "text-cyan-400", gradient: "bg-cyan-500/15", sparkline: [2, 3, 4, 3, 5, 4, Number(summary?.totalClaims ?? 0)] },
    { label: "Pending approval", value: summaryLoading ? "..." : fmt(summary?.pendingClaims), change: `${formatINR(summary?.pendingAmount)} pending`, icon: Wallet, iconColor: "text-amber-400", gradient: "bg-amber-500/15", sparkline: [1, 2, 2, 3, 2, 3, Number(summary?.pendingClaims ?? 0)] },
    { label: "Reimbursed", value: summaryLoading ? "..." : fmt(summary?.reimbursedClaims), change: `${formatINR(summary?.totalAmount)} total`, icon: Banknote, iconColor: "text-emerald-400", gradient: "bg-emerald-500/15", sparkline: [2, 1, 2, 1, 2, 1, Number(summary?.reimbursedClaims ?? 0)] },
    { label: "Active policies", value: summaryLoading ? "..." : fmt(summary?.activePolicies), change: `${fmt(summary?.totalCategories)} categories`, icon: ShieldCheck, iconColor: "text-purple-400", gradient: "bg-purple-500/15", sparkline: [1, 2, 2, 3, 2, 2, Number(summary?.activePolicies ?? 0)] },
  ];
  return <AppLayout breadcrumbs={[{ label: "Expense Management" }]}>
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400"><Receipt className="h-5 w-5" /></div><h1 className="text-2xl font-bold tracking-tight text-white">Expense Management</h1></div><p className="mt-1 text-sm text-white/40">Expense claims, employee expenses, approval workflow, categories, receipts, reimbursement and policy controls.</p></div>
        <Button onClick={() => setTab("claims")} className="h-9 bg-emerald-600 hover:bg-emerald-500"><Plus className="mr-2 h-4 w-4" />New claim</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}</div>
      <div className="overflow-x-auto"><div className="inline-flex min-w-max gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${tab === t.id ? "bg-emerald-600 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>)}</div></div>
      {tab === "overview" && <Overview summary={summary} onTab={setTab} />}
      {tab === "claims" && <Claims />}
      {tab === "categories" && <Categories />}
      {tab === "policies" && <Policies />}
    </div>
  </AppLayout>;
}

function Claims() {
  const { toast } = useToast();
  const { data: claimsRes } = useExpenseClaims();
  const { data: categoriesRes } = useExpenseCategories();
  const categories = categoriesRes?.data ?? [];
  const create = useCreateExpenseClaim(); const submit = useSubmitExpenseClaim();
  const approve = useApproveExpenseClaim(); const reject = useRejectExpenseClaim();
  const reimburse = useReimburseExpenseClaim(); const remove = useDeleteExpenseClaim();
  const [form, setForm] = useState({ employeeName: "", department: "", title: "", description: "", claimDate: today(), status: "draft", notes: "", lines: [] as Array<{ categoryName: string; expenseDate: string; description: string; amount: string; hasReceipt: boolean }> });
  const setLine = (i: number, k: string, v: any) => { const l = [...form.lines]; (l[i] as any)[k] = v; setForm({ ...form, lines: l }); };
  const addLine = () => setForm({ ...form, lines: [...form.lines, { categoryName: "", expenseDate: today(), description: "", amount: "0", hasReceipt: false }] });
  const save = async () => {
    try {
      const lines = form.lines.filter(l => l.categoryName && l.description).map(l => ({ categoryName: l.categoryName, expenseDate: l.expenseDate, description: l.description, amount: Number(l.amount) || 0, hasReceipt: l.hasReceipt }));
      await create.mutateAsync({ employeeId: 1, employeeName: form.employeeName, department: null, title: form.title, description: form.description || null, claimDate: form.claimDate, status: form.status, notes: form.notes || null, items: lines });
      toast({ title: "Claim created" });
      setForm({ employeeName: "", department: "", title: "", description: "", claimDate: today(), status: "draft", notes: "", lines: [] });
    } catch (e: any) { toast({ title: "Failed to create claim", description: e.message, variant: "destructive" }); }
  };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Create expense claim</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Employee *</Label><Input className={field} value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} /></div><div><Label>Title *</Label><Input className={field} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div><div><Label>Description</Label><Input className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div><Label>Claim date *</Label><Input className={field} type="date" value={form.claimDate} onChange={e => setForm({ ...form, claimDate: e.target.value })} /></div><div><Label>Status</Label><select className={select + " w-full"} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{["draft", "submitted", "in_review", "approved", "rejected", "reimbursed"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div><div className="mt-3 space-y-2">{form.lines.map((l, i) => <div key={i} className="grid gap-2 md:grid-cols-5"><select className={select} value={l.categoryName} onChange={e => setLine(i, "categoryName", e.target.value)}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select><Input className={field} type="date" value={l.expenseDate} onChange={e => setLine(i, "expenseDate", e.target.value)} /><Input className={field} placeholder="Description" value={l.description} onChange={e => setLine(i, "description", e.target.value)} /><Input className={field} type="number" min="0" placeholder="Amount" value={l.amount} onChange={e => setLine(i, "amount", e.target.value)} /><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs text-white/50"><input type="checkbox" checked={l.hasReceipt} onChange={e => setLine(i, "hasReceipt", e.target.checked)} />Receipt</label><Button variant="ghost" size="sm" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div><div className="mt-2 flex gap-2"><Button onClick={addLine} variant="outline" className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add item</Button><Button onClick={save} disabled={create.isPending || !form.employeeName || !form.title} className="h-8 bg-emerald-600 text-xs hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1 h-3.5 w-3.5" />Create claim</Button></div></div>
    <Table headers={["Claim", "Employee", "Title", "Date", "Amount", "Items", "Receipts", "Status", "Actions"]}>{(claimsRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-emerald-400">{c.claim_number}</td><td className="px-4 py-3 text-white">{c.employee_name}</td><td className="px-4 py-3 text-white/50">{c.title}</td><td className="px-4 py-3 text-white/50">{c.claim_date}</td><td className="px-4 py-3 text-white/60">${fmt(c.total_amount)}</td><td className="px-4 py-3 text-white/50">{c.item_count ?? 0}</td><td className="px-4 py-3 text-white/50">{c.receipt_count ?? 0}</td><td className="px-4 py-3"><Status value={c.status} /></td><td className="px-4 py-3"><div className="flex gap-1">{c.status === "draft" && <Button variant="ghost" size="sm" onClick={() => submit.mutate(c.id)} className="text-blue-400"><FileText className="h-3.5 w-3.5" /></Button>}{c.status === "submitted" && <><Button variant="ghost" size="sm" onClick={() => approve.mutate({ id: c.id })} className="text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => reject.mutate({ id: c.id })} className="text-red-400"><XCircle className="h-3.5 w-3.5" /></Button></>}{c.status === "approved" && <Button variant="ghost" size="sm" onClick={() => reimburse.mutate({ id: c.id })} className="text-emerald-400"><Banknote className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></Row>)}{!(claimsRes?.data?.length) && <Empty cols={9} text="No expense claims yet." />}</Table>
  </div>;
}

function Categories() {
  const { toast } = useToast();
  const { data: categoriesRes } = useExpenseCategories();
  const create = useCreateExpenseCategory(); const remove = useDeleteExpenseCategory();
  const [form, setForm] = useState({ code: "", name: "", description: "", isActive: true });
  const save = async () => { try { await create.mutateAsync({ code: form.code, name: form.name, description: form.description || null, isActive: form.isActive }); toast({ title: "Category created" }); setForm({ code: "", name: "", description: "", isActive: true }); } catch (e: any) { toast({ title: "Failed to create category", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Create expense category</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Code *</Label><Input className={field} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="TRAVEL" /></div><div><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Description</Label><Input className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div><Label>Active</Label><select className={select + " w-full"} value={String(form.isActive)} onChange={e => setForm({ ...form, isActive: e.target.value === "true" })}><option value="true">Yes</option><option value="false">No</option></select></div><div className="flex items-end"><Button onClick={save} disabled={create.isPending || !form.code || !form.name} className="h-9 w-full bg-emerald-600 hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1.5 h-3.5 w-3.5" />Create</Button></div></div></div>
    <Table headers={["Code", "Name", "Description", "Active", "Actions"]}>{(categoriesRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-emerald-400">{c.code}</td><td className="px-4 py-3 text-white">{c.name}</td><td className="px-4 py-3 text-white/50">{c.description || "—"}</td><td className="px-4 py-3"><Status value={c.is_active ? "active" : "inactive"} /></td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(categoriesRes?.data?.length) && <Empty cols={5} text="No categories yet." />}</Table>
  </div>;
}

function Policies() {
  const { toast } = useToast();
  const { data: policiesRes } = useExpensePolicies();
  const create = useCreateExpensePolicy(); const remove = useDeleteExpensePolicy();
  const [form, setForm] = useState({ name: "", policyType: "max_amount", category: "", maxAmount: "0", perDiemRate: "0", approvalThreshold: "0", requiresReceipt: true, requiresApproval: true, description: "", status: "active" });
  const save = async () => { try { await create.mutateAsync({ name: form.name, policyType: form.policyType, category: form.category || null, maxAmount: Number(form.maxAmount) || 0, perDiemRate: Number(form.perDiemRate) || 0, approvalThreshold: Number(form.approvalThreshold) || 0, requiresReceipt: form.requiresReceipt, requiresApproval: form.requiresApproval, description: form.description || null, status: form.status }); toast({ title: "Policy created" }); setForm({ name: "", policyType: "max_amount", category: "", maxAmount: "0", perDiemRate: "0", approvalThreshold: "0", requiresReceipt: true, requiresApproval: true, description: "", status: "active" }); } catch (e: any) { toast({ title: "Failed to create policy", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Create expense policy</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Type</Label><select className={select + " w-full"} value={form.policyType} onChange={e => setForm({ ...form, policyType: e.target.value })}>{["per_diem", "max_amount", "category_limit", "approval_threshold"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Category</Label><Input className={field} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div><div><Label>Max amount</Label><Input className={field} type="number" min="0" value={form.maxAmount} onChange={e => setForm({ ...form, maxAmount: e.target.value })} /></div><div><Label>Per-diem rate</Label><Input className={field} type="number" min="0" value={form.perDiemRate} onChange={e => setForm({ ...form, perDiemRate: e.target.value })} /></div><div><Label>Approval threshold</Label><Input className={field} type="number" min="0" value={form.approvalThreshold} onChange={e => setForm({ ...form, approvalThreshold: e.target.value })} /></div><div><Label>Requires receipt</Label><select className={select + " w-full"} value={String(form.requiresReceipt)} onChange={e => setForm({ ...form, requiresReceipt: e.target.value === "true" })}><option value="true">Yes</option><option value="false">No</option></select></div><div><Label>Requires approval</Label><select className={select + " w-full"} value={String(form.requiresApproval)} onChange={e => setForm({ ...form, requiresApproval: e.target.value === "true" })}><option value="true">Yes</option><option value="false">No</option></select></div><div><Label>Description</Label><Input className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div><Label>Status</Label><select className={select + " w-full"} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{["active", "inactive"].map(x => <option key={x}>{x}</option>)}</select></div><div className="flex items-end"><Button onClick={save} disabled={create.isPending || !form.name} className="h-9 w-full bg-emerald-600 hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1.5 h-3.5 w-3.5" />Create</Button></div></div></div>
    <Table headers={["Policy", "Type", "Category", "Max amount", "Per-diem", "Approval threshold", "Receipt", "Approval", "Status", "Actions"]}>{(policiesRes?.data ?? []).map(p => <Row key={p.id}><td className="px-4 py-3"><p className="font-mono text-emerald-400">{p.policy_number}</p><p className="text-white">{p.name}</p></td><td className="px-4 py-3 text-white/50 capitalize">{p.policy_type}</td><td className="px-4 py-3 text-white/50">{p.category || "—"}</td><td className="px-4 py-3 text-white/50">${fmt(p.max_amount)}</td><td className="px-4 py-3 text-white/50">${fmt(p.per_diem_rate)}</td><td className="px-4 py-3 text-white/50">${fmt(p.approval_threshold)}</td><td className="px-4 py-3 text-white/50">{p.requires_receipt ? "Yes" : "No"}</td><td className="px-4 py-3 text-white/50">{p.requires_approval ? "Yes" : "No"}</td><td className="px-4 py-3"><Status value={p.status} /></td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(policiesRes?.data?.length) && <Empty cols={10} text="No policies yet." />}</Table>
  </div>;
}

function Overview({ summary, onTab }: { summary?: any; onTab: (tab: string) => void }) {
  const cards = [
    { title: "Expense claims", text: "Create and manage employee expense claims with line items.", action: "Open claims", tab: "claims", icon: FileText },
    { title: "Categories", text: "Define expense categories for consistent classification.", action: "Open categories", tab: "categories", icon: ListChecks },
    { title: "Policy controls", text: "Set spending limits, per-diem rates and approval thresholds.", action: "Open policies", tab: "policies", icon: ShieldCheck },
  ];
  return <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><p className="text-xs uppercase tracking-widest text-emerald-400/70">Expense</p><h2 className="mt-1 text-lg font-semibold text-white">Expense control tower</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{cards.map(c => <button key={c.title} onClick={() => onTab(c.tab)} className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-left hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"><c.icon className="mb-3 h-5 w-5 text-emerald-400" /><h3 className="text-sm font-semibold text-white">{c.title}</h3><p className="mt-1 text-xs leading-5 text-white/40">{c.text}</p><p className="mt-3 text-xs font-medium text-emerald-400">{c.action} →</p></button>)}</div></div><div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><h2 className="text-sm font-semibold text-white">Expense posture</h2><div className="mt-4 space-y-4">{[["Claims pipeline", `${fmt(summary?.totalClaims)} total claims with ${fmt(summary?.pendingClaims)} pending approval.`, FileText, "text-cyan-400"], ["Receipts", `${fmt(summary?.totalReceipts)} receipts attached across ${fmt(summary?.totalItems)} expense items.`, Receipt, "text-amber-400"], ["Policy coverage", `${fmt(summary?.activePolicies)} active policies across ${fmt(summary?.totalCategories)} categories.`, ShieldCheck, "text-purple-400"]].map(([title, text, Icon, color]) => { const I = Icon as React.ComponentType<{ className?: string }>; return <div key={String(title)} className="flex gap-3"><div className={`mt-0.5 ${color}`}><I className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">{String(title)}</p><p className="mt-1 text-xs leading-5 text-white/40">{String(text)}</p></div></div>; })}</div></div></div>;
}