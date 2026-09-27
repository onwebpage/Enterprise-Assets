import { useEffect, useMemo, useState } from "react";
import { Wallet, Target, Percent, Package, ChartLine, Coins, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, GitBranch, Pencil, BarChart3, Save, X, Eye, Loader2, AlertCircle } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import KPICard from "@/components/app/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInvProducts } from "@/hooks/useInventory";
import {
  useBudgetCostSummary, useBudgetCostPermissions, useBudgetAccounts, useBudget, useBudgetVsActual, useCostCentres, useProfitCentres, useBudgets,
  useProductCostings, useVariances, useForecasts,
  useCreateCostCentre, useDeleteCostCentre,
  useCreateProfitCentre, useDeleteProfitCentre,
  useCreateBudget, useUpdateBudget, useActivateBudget, useCloseBudget, useDeleteBudget,
  useCreateCosting, useRecalculateCosting, useDeleteCosting,
  useCreateVariance, useDeleteVariance,
  useCreateForecast, useUpdateForecast, useForecast, useApproveForecast, useGenerateForecast, useDeleteForecast,
} from "@/hooks/useBudgetCost";
import ManagementAccountingTab from "@/components/app/finance/ManagementAccountingTab";
import { formatINR } from "@/lib/currency";

const field = "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 h-9 text-sm";
const select = `${field} rounded-md px-3`;
function fmt(value: unknown) { return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function Status({ value }: { value: string }) {
  const tone = value === "active" || value === "approved" || value === "resolved" ? "text-emerald-400 bg-emerald-500/10" : value === "cancelled" || value === "closed" ? "text-red-400 bg-red-500/10" : value === "draft" || value === "open" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10";
  return <Badge className={`border-0 capitalize ${tone}`}>{value.replaceAll("_", " ")}</Badge>;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{headers.map(h => <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/35">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function Empty({ cols, text = "No records found." }: { cols: number; text?: string }) { return <tr><td colSpan={cols} className="px-4 py-12 text-center text-white/30">{text}</td></tr>; }
function Row({ children }: { children: React.ReactNode }) { return <tr className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]">{children}</tr>; }
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1 block text-[11px] font-medium text-white/45">{children}</label>; }

export default function BudgetCost() {
  const [tab, setTab] = useState("overview");
  const { data: permsRes, isLoading: permsLoading } = useBudgetCostPermissions();
  const perms = permsRes?.data;
  const { data: summaryRes, isLoading } = useBudgetCostSummary();
  const summary = summaryRes?.data;
  const tabs = [
    { id: "overview", label: "Control tower", icon: Coins },
    { id: "centres", label: "Cost & profit centres", icon: Target },
    { id: "budgets", label: "Budgets", icon: Wallet },
    { id: "costing", label: "Product costing", icon: Package },
    { id: "variances", label: "Variance analysis", icon: Percent },
    { id: "forecasts", label: "Forecasting", icon: ChartLine },
    { id: "management", label: "Management accounting", icon: GitBranch },
  ];
  const kpis = [
    { label: "Active budgets", value: isLoading ? "..." : fmt(summary?.activeBudgets), change: `${formatINR(summary?.budgetAmount)} budgeted`, icon: Wallet, iconColor: "text-cyan-400", gradient: "bg-cyan-500/15", sparkline: [3, 4, 3, 5, 4, 4, Number(summary?.activeBudgets ?? 0)] },
    { label: "Cost centres", value: isLoading ? "..." : fmt(summary?.costCentres), change: `${fmt(summary?.profitCentres)} profit centres`, icon: Target, iconColor: "text-blue-400", gradient: "bg-blue-500/15", sparkline: [2, 3, 3, 4, 4, 4, Number(summary?.costCentres ?? 0)] },
    { label: "Open variances", value: isLoading ? "..." : fmt(summary?.openVariances), change: `${formatINR(summary?.varianceAmount)} total`, icon: Percent, iconColor: "text-amber-400", gradient: "bg-amber-500/15", sparkline: [2, 3, 2, 3, 2, 1, Number(summary?.openVariances ?? 0)] },
    { label: "Product cost cards", value: isLoading ? "..." : fmt(summary?.productCosts), change: `${fmt(summary?.activeForecasts)} active forecasts`, icon: Package, iconColor: "text-purple-400", gradient: "bg-purple-500/15", sparkline: [1, 2, 2, 3, 3, 4, Number(summary?.productCosts ?? 0)] },
  ];

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: "Finance" }, { label: "Advanced Budget & Forecasting" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view Advanced Budget & Forecasting.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout breadcrumbs={[{ label: "Finance" }, { label: "Advanced Budget & Forecasting" }]}>
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-lg bg-cyan-500/15 p-2 text-cyan-400"><Coins className="h-5 w-5" /></div><h1 className="text-2xl font-bold tracking-tight text-white">Advanced Budget &amp; Forecasting</h1></div><p className="mt-1 text-sm text-white/40">Plan, approve and monitor budgets against actuals, then project the months ahead with auditable forecasts.</p></div>
        {perms?.canCreate && (
          <Button onClick={() => setTab("budgets")} className="h-9 bg-cyan-600 hover:bg-cyan-500"><Plus className="mr-2 h-4 w-4" />Create budget</Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}</div>
      <div className="overflow-x-auto"><div className="inline-flex min-w-max gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${tab === t.id ? "bg-cyan-600 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>)}</div></div>
      {tab === "overview" && <Overview summary={summary} onTab={setTab} />}
      {tab === "centres" && <Centres />}
      {tab === "budgets" && <Budgets />}
      {tab === "costing" && <Costing />}
      {tab === "variances" && <Variances />}
      {tab === "forecasts" && <Forecasts />}
      {tab === "management" && <ManagementAccountingTab />}
    </div>
  </AppLayout>;
}

function Overview({ summary, onTab }: { summary?: any; onTab: (tab: string) => void }) {
  const cards = [
    { title: "Budgets", text: "Operating, capital and project budgets by centre and account line.", action: "Manage budgets", tab: "budgets", icon: Wallet },
    { title: "Cost & profit centres", text: "Model cost accumulation and revenue-generating units.", action: "Manage centres", tab: "centres", icon: Target },
    { title: "Product costing", text: "Standard cost cards with material, labour and overhead components.", action: "Cost products", tab: "costing", icon: Package },
    { title: "Variance & forecast", text: "Track budget vs actual and project revenue/cost forward.", action: "Analyse", tab: "variances", icon: Percent },
  ];
  return <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><p className="text-xs uppercase tracking-widest text-cyan-400/70">Cost intelligence</p><h2 className="mt-1 text-lg font-semibold text-white">Budget & cost control tower</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{cards.map(c => <button key={c.title} onClick={() => onTab(c.tab)} className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-left hover:border-cyan-500/40 hover:bg-cyan-500/[0.06]"><c.icon className="mb-3 h-5 w-5 text-cyan-400" /><h3 className="text-sm font-semibold text-white">{c.title}</h3><p className="mt-1 text-xs leading-5 text-white/40">{c.text}</p><p className="mt-3 text-xs font-medium text-cyan-400">{c.action} →</p></button>)}</div></div><div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><h2 className="text-sm font-semibold text-white">Live cost posture</h2><div className="mt-4 space-y-4">{[["Budget health", `${fmt(summary?.activeBudgets)} active budget(s) covering ₹${fmt(summary?.budgetAmount)} across the year.`, Wallet, "text-cyan-400"], ["Variance exposure", `${fmt(summary?.openVariances)} open variance(s) totalling ₹${fmt(summary?.varianceAmount)} need review.`, Percent, "text-amber-400"], ["Cost coverage", `${fmt(summary?.productCosts)} product cost cards and ${fmt(summary?.activeForecasts)} forecast(s).`, Package, "text-purple-400"]].map(([title, text, Icon, color]) => { const I = Icon as React.ComponentType<{ className?: string }>; return <div key={String(title)} className="flex gap-3"><div className={`mt-0.5 ${color}`}><I className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">{String(title)}</p><p className="mt-1 text-xs leading-5 text-white/40">{String(text)}</p></div></div>; })}</div></div></div>;
}
function Centres() {
  const { toast } = useToast();
  const { data: ccRes } = useCostCentres();
  const { data: pcRes } = useProfitCentres();
  const createCC = useCreateCostCentre(); const delCC = useDeleteCostCentre();
  const createPC = useCreateProfitCentre(); const delPC = useDeleteProfitCentre();
  const [ccForm, setCcForm] = useState({ code: "", name: "", manager: "", description: "" });
  const [pcForm, setPcForm] = useState({ code: "", name: "", manager: "", description: "" });
  const saveCC = async () => { try { await createCC.mutateAsync({ ...ccForm, manager: ccForm.manager || null, description: ccForm.description || null }); toast({ title: "Cost centre created" }); setCcForm({ code: "", name: "", manager: "", description: "" }); } catch (e: any) { toast({ title: "Failed to create cost centre", description: e.message, variant: "destructive" }); } };
  const savePC = async () => { try { await createPC.mutateAsync({ ...pcForm, manager: pcForm.manager || null, description: pcForm.description || null }); toast({ title: "Profit centre created" }); setPcForm({ code: "", name: "", manager: "", description: "" }); } catch (e: any) { toast({ title: "Failed to create profit centre", description: e.message, variant: "destructive" }); } };
  return <div className="grid gap-4 xl:grid-cols-2">
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">New cost centre</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>Code *</Label><Input className={field} value={ccForm.code} onChange={e => setCcForm({ ...ccForm, code: e.target.value })} placeholder="CC-XX" /></div><div><Label>Name *</Label><Input className={field} value={ccForm.name} onChange={e => setCcForm({ ...ccForm, name: e.target.value })} /></div><div><Label>Manager</Label><Input className={field} value={ccForm.manager} onChange={e => setCcForm({ ...ccForm, manager: e.target.value })} /></div><div><Label>Description</Label><Input className={field} value={ccForm.description} onChange={e => setCcForm({ ...ccForm, description: e.target.value })} /></div></div><Button onClick={saveCC} disabled={createCC.isPending || !ccForm.code || !ccForm.name} className="mt-3 h-8 bg-cyan-600 text-xs hover:bg-cyan-500"><Plus className="mr-1 h-3.5 w-3.5" />Create</Button></div>
      <Table headers={["Code", "Name", "Manager", "Actions"]}>{(ccRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-cyan-400">{c.code}</td><td className="px-4 py-3 text-white">{c.name}</td><td className="px-4 py-3 text-white/50">{c.manager || "—"}</td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => delCC.mutate(c.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(ccRes?.data?.length) && <Empty cols={4} text="No cost centres yet." />}</Table>
    </div>
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">New profit centre</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>Code *</Label><Input className={field} value={pcForm.code} onChange={e => setPcForm({ ...pcForm, code: e.target.value })} placeholder="PC-XX" /></div><div><Label>Name *</Label><Input className={field} value={pcForm.name} onChange={e => setPcForm({ ...pcForm, name: e.target.value })} /></div><div><Label>Manager</Label><Input className={field} value={pcForm.manager} onChange={e => setPcForm({ ...pcForm, manager: e.target.value })} /></div><div><Label>Description</Label><Input className={field} value={pcForm.description} onChange={e => setPcForm({ ...pcForm, description: e.target.value })} /></div></div><Button onClick={savePC} disabled={createPC.isPending || !pcForm.code || !pcForm.name} className="mt-3 h-8 bg-cyan-600 text-xs hover:bg-cyan-500"><Plus className="mr-1 h-3.5 w-3.5" />Create</Button></div>
      <Table headers={["Code", "Name", "Manager", "Parent", "Actions"]}>{(pcRes?.data ?? []).map(p => <Row key={p.id}><td className="px-4 py-3 font-mono text-cyan-400">{p.code}</td><td className="px-4 py-3 text-white">{p.name}</td><td className="px-4 py-3 text-white/50">{p.manager || "—"}</td><td className="px-4 py-3 text-white/50">{p.parent_name || "—"}</td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => delPC.mutate(p.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(pcRes?.data?.length) && <Empty cols={5} text="No profit centres yet." />}</Table>
    </div>
  </div>;
}
type BudgetLineDraft = { accountId: string; periodIndex: string; amount: string; description: string };
const newBudgetLine = (): BudgetLineDraft => ({ accountId: "", periodIndex: "0", amount: "", description: "" });

function Budgets() {
  const { toast } = useToast();
  const { data: budgetsRes } = useBudgets();
  const { data: accountsRes } = useBudgetAccounts();
  const { data: centresRes } = useCostCentres();
  const create = useCreateBudget(); const update = useUpdateBudget(); const activate = useActivateBudget(); const close = useCloseBudget(); const remove = useDeleteBudget();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: detailRes, isLoading: detailLoading } = useBudget(selectedId);
  const [form, setForm] = useState({ name: "", fiscalYear: String(new Date().getFullYear()), periodType: "monthly", budgetType: "operating", costCentreId: "", notes: "" });
  const [lines, setLines] = useState<BudgetLineDraft[]>([newBudgetLine()]);
  const accounts = accountsRes?.data ?? [];
  const periodCount = form.periodType === "yearly" ? 1 : form.periodType === "quarterly" ? 4 : 12;
  const lineTotal = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0), [lines]);
  const setLine = (index: number, key: keyof BudgetLineDraft, value: string) => setLines(current => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  useEffect(() => {
    if (!editingId || !detailRes?.data) return;
    const budget = detailRes.data;
    setForm({ name: budget.name, fiscalYear: String(budget.fiscal_year), periodType: budget.period_type, budgetType: budget.budget_type, costCentreId: budget.cost_centre_id ? String(budget.cost_centre_id) : "", notes: budget.notes ?? "" });
    setLines(budget.lines.length ? budget.lines.map(line => ({ accountId: String(line.account_id), periodIndex: String(line.period_index), amount: String(line.amount), description: line.description ?? "" })) : [newBudgetLine()]);
  }, [editingId, detailRes?.data]);
  const reset = () => { setForm({ name: "", fiscalYear: String(new Date().getFullYear()), periodType: "monthly", budgetType: "operating", costCentreId: "", notes: "" }); setLines([newBudgetLine()]); setEditingId(null); };
  const save = async () => { try {
    const validLines = lines.filter(line => line.accountId && line.amount !== "" && Number(line.amount) >= 0).map(line => ({ accountId: Number(line.accountId), periodIndex: Number(line.periodIndex), amount: Number(line.amount), description: line.description || null }));
    if (!validLines.length) throw new Error("Add at least one account line before saving");
    const payload = { name: form.name.trim(), fiscalYear: Number(form.fiscalYear), periodType: form.periodType, budgetType: form.budgetType, costCentreId: form.costCentreId ? Number(form.costCentreId) : null, notes: form.notes || null, lines: validLines };
    if (editingId) await update.mutateAsync({ id: editingId, data: payload });
    else await create.mutateAsync(payload);
    toast({ title: editingId ? "Budget updated" : "Budget created", description: `₹${fmt(lineTotal)} planned across ${validLines.length} line(s).` }); reset();
  } catch (e: any) { toast({ title: "Failed to create budget", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">{editingId ? "Edit draft budget" : "Build a budget"}</h2><p className="mt-1 text-xs text-white/35">Add account-level planned amounts by month, quarter, or year. Drafts remain editable until activation.</p></div><span className="text-sm font-semibold text-cyan-300">₹{fmt(lineTotal)}</span></div><div className="mt-4 grid gap-3 md:grid-cols-5"><div><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="FY2027 Operating Plan" /></div><div><Label>Fiscal year *</Label><Input className={field} type="number" min="2000" max="2100" value={form.fiscalYear} onChange={e => setForm({ ...form, fiscalYear: e.target.value })} /></div><div><Label>Period granularity</Label><select className={select + " w-full"} value={form.periodType} onChange={e => { setForm({ ...form, periodType: e.target.value }); setLines(current => current.map(line => ({ ...line, periodIndex: "0" }))); }}>{["monthly", "quarterly", "yearly"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Budget type</Label><select className={select + " w-full"} value={form.budgetType} onChange={e => setForm({ ...form, budgetType: e.target.value })}>{["operating", "capital", "cash_flow", "project"].map(x => <option key={x}>{x.replaceAll("_", " ")}</option>)}</select></div><div><Label>Cost centre</Label><select className={select + " w-full"} value={form.costCentreId} onChange={e => setForm({ ...form, costCentreId: e.target.value })}><option value="">All centres</option>{(centresRes?.data ?? []).map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></div></div><div className="mt-4 space-y-2">{lines.map((line, index) => <div key={index} className="grid gap-2 md:grid-cols-[1.6fr_0.7fr_0.9fr_1.5fr_auto]"><select className={select} value={line.accountId} onChange={e => setLine(index, "accountId", e.target.value)}><option value="">Select account *</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} · {account.name} ({account.type})</option>)}</select><select className={select} value={line.periodIndex} onChange={e => setLine(index, "periodIndex", e.target.value)}>{Array.from({ length: periodCount }, (_, i) => <option key={i} value={i}>{form.periodType === "monthly" ? new Date(2000, i, 1).toLocaleString(undefined, { month: "short" }) : form.periodType === "quarterly" ? `Q${i + 1}` : "Full year"}</option>)}</select><Input className={field} type="number" min="0" step="0.01" placeholder="Amount *" value={line.amount} onChange={e => setLine(index, "amount", e.target.value)} /><Input className={field} placeholder="Line description" value={line.description} onChange={e => setLine(index, "description", e.target.value)} /><Button variant="ghost" size="sm" onClick={() => setLines(current => current.length === 1 ? [newBudgetLine()] : current.filter((_, i) => i !== index))} className="text-white/35 hover:text-red-300"><X className="h-4 w-4" /></Button></div>)}</div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => setLines([...lines, newBudgetLine()])} variant="outline" className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add account line</Button><Button onClick={save} disabled={create.isPending || update.isPending || !form.name.trim() || !accounts.length} className="h-8 bg-cyan-600 text-xs hover:bg-cyan-500">{create.isPending || update.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}{editingId ? "Update draft" : "Save draft"}</Button>{editingId && <Button onClick={reset} variant="ghost" className="h-8 text-xs text-white/50">Cancel edit</Button>}</div></div>
    <Table headers={["Budget", "Year", "Type", "Status", "Lines", "Amount", "Actions"]}>{(budgetsRes?.data ?? []).map(b => <Row key={b.id}><td className="px-4 py-3"><p className="font-mono text-cyan-400">{b.budget_number}</p><p className="text-xs text-white/35">{b.name}</p></td><td className="px-4 py-3 text-white/50">{b.fiscal_year}</td><td className="px-4 py-3 text-white/50 capitalize">{b.budget_type.replaceAll("_", " ")}</td><td className="px-4 py-3"><Status value={b.status} /></td><td className="px-4 py-3 text-white/50">{b.line_count ?? 0}</td><td className="px-4 py-3 text-white">₹{fmt(b.line_total ?? b.total_amount)}</td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => setSelectedId(b.id)} className="text-cyan-400" title="View budget"><Eye className="h-3.5 w-3.5" /></Button>{b.status === "draft" && <><Button variant="ghost" size="sm" onClick={() => { setEditingId(b.id); setSelectedId(b.id); }} className="text-white/45" title="Edit draft"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => activate.mutate(b.id)} className="text-emerald-400" title="Activate"><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Delete ${b.budget_number}?`)) remove.mutate(b.id); }} className="text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button></>}{b.status === "active" && <Button variant="ghost" size="sm" onClick={() => close.mutate(b.id)} className="text-amber-400" title="Close"><XCircle className="h-3.5 w-3.5" /></Button>}</div></td></Row>)}{!(budgetsRes?.data?.length) && <Empty cols={7} text="No budgets yet. Build your first account-level plan above." />}</Table>
    {selectedId && <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5">{detailLoading ? <div className="flex items-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin text-cyan-400" />Loading budget detail…</div> : detailRes?.data ? <><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-cyan-300">{detailRes.data.budget_number}</p><h3 className="mt-1 text-lg font-semibold text-white">{detailRes.data.name}</h3><p className="mt-1 text-xs text-white/40">{detailRes.data.fiscal_year} · {detailRes.data.period_type} · {detailRes.data.lines.length} lines</p></div><Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-white/45"><X className="h-4 w-4" /></Button></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.08] text-left text-[10px] uppercase tracking-wider text-white/35"><th className="px-3 py-2">Account</th><th className="px-3 py-2">Period</th><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Description</th></tr></thead><tbody>{detailRes.data.lines.map(line => <tr key={line.id} className="border-b border-white/[0.04]"><td className="px-3 py-2 text-white">{line.account_code} · {line.account_name}</td><td className="px-3 py-2 text-white/50">{line.period_index + 1}</td><td className="px-3 py-2 text-cyan-300">₹{fmt(line.amount)}</td><td className="px-3 py-2 text-white/40">{line.description || "—"}</td></tr>)}</tbody></table></div></> : null}</div>}
  </div>;
}
function Costing() {
  const { toast } = useToast();
  const { data: costingsRes } = useProductCostings();
  const { data: productsRes } = useInvProducts({ limit: 100 });
  const products = productsRes?.data ?? [];
  const create = useCreateCosting(); const recalc = useRecalculateCosting(); const remove = useDeleteCosting();
  const [form, setForm] = useState({ productId: "", standardCost: "0", comps: [{ name: "", type: "material", qty: "1", cost: "0" }] });
  const setComp = (i: number, k: string, v: string) => { const c = [...form.comps]; (c[i] as any)[k] = v; setForm({ ...form, comps: c }); };
  const addComp = () => setForm({ ...form, comps: [...form.comps, { name: "", type: "material", qty: "1", cost: "0" }] });
  const save = async () => {
    try {
      const lines = form.comps.filter(c => c.name).map(c => ({ componentName: c.name, costType: c.type, quantity: Number(c.qty) || 1, unitCost: Number(c.cost) || 0, amount: (Number(c.qty) || 1) * (Number(c.cost) || 0) }));
      const computed = lines.reduce((s, l) => s + l.amount, 0);
      await create.mutateAsync({ productId: Number(form.productId), standardCost: Number(form.standardCost) || computed, notes: null, lines });
      toast({ title: "Cost card created" });
      setForm({ productId: "", standardCost: "0", comps: [{ name: "", type: "material", qty: "1", cost: "0" }] });
    } catch (e: any) { toast({ title: "Failed to create cost card", description: e.message, variant: "destructive" }); }
  };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Standard cost card</h2><div className="mt-3 grid gap-3 md:grid-cols-3"><div><Label>Product *</Label><select className={select + " w-full"} value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}><option value="">Select SKU</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div><div><Label>Standard cost (auto if 0)</Label><Input className={field} type="number" min="0" value={form.standardCost} onChange={e => setForm({ ...form, standardCost: e.target.value })} /></div></div><div className="mt-3 space-y-2">{form.comps.map((c, i) => <div key={i} className="grid gap-2 md:grid-cols-5"><Input className={field} placeholder="Component" value={c.name} onChange={e => setComp(i, "name", e.target.value)} /><select className={select} value={c.type} onChange={e => setComp(i, "type", e.target.value)}>{["material", "labour", "overhead", "other"].map(x => <option key={x}>{x}</option>)}</select><Input className={field} type="number" min="0" placeholder="Qty" value={c.qty} onChange={e => setComp(i, "qty", e.target.value)} /><Input className={field} type="number" min="0" placeholder="Unit cost" value={c.cost} onChange={e => setComp(i, "cost", e.target.value)} /><span className="text-right text-sm text-cyan-400 text-white/60 self-center">{(Number(c.qty) || 0) * (Number(c.cost) || 0)}</span></div>)}</div><div className="mt-2 flex gap-2"><Button onClick={addComp} variant="outline" className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button><Button onClick={save} disabled={create.isPending || !form.productId} className="h-8 bg-cyan-600 text-xs hover:bg-cyan-500"><Plus className="mr-1 h-3.5 w-3.5" />Create cost card</Button></div></div>
    <Table headers={["SKU", "Product", "Standard", "Last actual", "Components", "Actions"]}>{(costingsRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-cyan-400">{c.sku}</td><td className="px-4 py-3 text-white">{c.product_name}</td><td className="px-4 py-3 text-white">₹{fmt(c.standard_cost)}</td><td className="px-4 py-3 text-white/50">₹{fmt(c.last_actual_cost)}</td><td className="px-4 py-3 text-white/50">{c.line_count ?? 0} · ${fmt(c.component_total)}</td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => recalc.mutate(c.id)} className="text-cyan-400"><RefreshCw className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></Row>)}{!(costingsRes?.data?.length) && <Empty cols={6} text="No product cost cards yet." />}</Table>
  </div>;
}
function Variances() {
  const { toast } = useToast();
  const { data: variancesRes } = useVariances();
  const create = useCreateVariance(); const remove = useDeleteVariance();
  const today = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({ varianceType: "price", period: today, standardAmount: "", actualAmount: "", reason: "" });
  const save = async () => {
    try {
      await create.mutateAsync({ varianceType: form.varianceType, period: form.period, standardAmount: Number(form.standardAmount) || 0, actualAmount: Number(form.actualAmount) || 0, reason: form.reason || null, action: null });
      toast({ title: "Variance recorded" });
      setForm({ varianceType: "price", period: today, standardAmount: "", actualAmount: "", reason: "" });
    } catch (e: any) { toast({ title: "Failed to record variance", description: e.message, variant: "destructive" }); }
  };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Record variance</h2><div className="mt-3 grid gap-3 md:grid-cols-5"><div><Label>Type</Label><select className={select + " w-full"} value={form.varianceType} onChange={e => setForm({ ...form, varianceType: e.target.value })}>{["price", "quantity", "usage", "labour_rate", "labour_efficiency", "overhead", "sales_volume", "sales_price", "material"].map(x => <option key={x}>{x.replaceAll("_", " ")}</option>)}</select></div><div><Label>Period *</Label><Input className={field} type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} /></div><div><Label>Standard amount</Label><Input className={field} type="number" min="0" value={form.standardAmount} onChange={e => setForm({ ...form, standardAmount: e.target.value })} /></div><div><Label>Actual amount</Label><Input className={field} type="number" min="0" value={form.actualAmount} onChange={e => setForm({ ...form, actualAmount: e.target.value })} /></div><div className="flex items-end"><Button onClick={save} disabled={create.isPending || !form.period} className="h-9 w-full bg-cyan-600 hover:bg-cyan-500"><Plus className="mr-1.5 h-3.5 w-3.5" />Record</Button></div></div></div>
    <Table headers={["Variance", "Type", "Period", "Standard", "Actual", "Δ", "Δ%", "Status", "Action"]}>{(variancesRes?.data ?? []).map(v => <Row key={v.id}><td className="px-4 py-3 font-mono text-cyan-400">{v.variance_number}</td><td className="px-4 py-3 text-white/50 capitalize">{v.variance_type.replaceAll("_", " ")}</td><td className="px-4 py-3 text-white/50">{v.period}</td><td className="px-4 py-3 text-white/60">₹{fmt(v.standard_amount)}</td><td className="px-4 py-3 text-white/60">₹{fmt(v.actual_amount)}</td><td className={`px-4 py-3 ${Number(v.variance_amount) >= 0 ? "text-amber-400" : "text-emerald-400"}`}>₹{fmt(v.variance_amount)}</td><td className={`px-4 py-3 ${Number(v.variance_pct) >= 0 ? "text-amber-400" : "text-emerald-400"}`}>{fmt(v.variance_pct)}%</td><td className="px-4 py-3"><Status value={v.status} /></td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => remove.mutate(v.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(variancesRes?.data?.length) && <Empty cols={9} text="No variances recorded yet." />}</Table>
  </div>;
}
function Forecasts() {
  const { toast } = useToast();
  const { data: forecastRes } = useForecasts();
  const { data: accountsRes } = useBudgetAccounts();
  const create = useCreateForecast(); const approve = useApproveForecast(); const generate = useGenerateForecast(); const remove = useDeleteForecast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detailRes, isLoading: detailLoading } = useForecast(selectedId);
  const [form, setForm] = useState({ name: "", method: "manual", currency: "INR", notes: "" });
  const save = async () => { try { await create.mutateAsync({ name: form.name.trim(), method: form.method, currency: form.currency, notes: form.notes || null, lines: [] }); toast({ title: "Forecast draft created", description: "Generate projections from the last 12 months of finance transactions." }); setForm({ name: "", method: "manual", currency: "INR", notes: "" }); } catch (e: any) { toast({ title: "Failed to create forecast", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Create rolling forecast</h2><p className="mt-1 text-xs text-white/35">Generate a 12-month projection from the last year of finance transactions using a transparent method.</p></div><ChartLine className="h-5 w-5 text-cyan-400" /></div><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="FY2027 rolling outlook" /></div><div><Label>Method</Label><select className={select + " w-full"} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{["linear", "moving_average", "seasonal", "manual"].map(x => <option key={x}>{x.replaceAll("_", " ")}</option>)}</select></div><div><Label>Currency</Label><Input className={field} maxLength={10} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div><Button onClick={save} disabled={create.isPending || !form.name.trim() || !accountsRes} className="mt-3 h-9 bg-cyan-600 hover:bg-cyan-500"><Plus className="mr-1.5 h-3.5 w-3.5" />Create draft</Button></div>
    <Table headers={["Forecast", "Method", "Status", "Periods", "Total", "Actions"]}>{(forecastRes?.data ?? []).map(f => <Row key={f.id}><td className="px-4 py-3"><p className="font-mono text-cyan-400">{f.forecast_number}</p><p className="text-xs text-white/35">{f.name}</p></td><td className="px-4 py-3 text-white/50 capitalize">{f.method.replaceAll("_", " ")}</td><td className="px-4 py-3"><Status value={f.status} /></td><td className="px-4 py-3 text-white/50">{f.line_count ?? 0}</td><td className="px-4 py-3 text-white">₹{fmt(f.line_total)}</td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => setSelectedId(f.id)} className="text-cyan-400" title="View forecast"><Eye className="h-3.5 w-3.5" /></Button>{f.status === "draft" && <Button variant="ghost" size="sm" onClick={() => approve.mutate(f.id)} className="text-emerald-400" title="Approve"><CheckCircle2 className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="sm" onClick={async () => { try { await generate.mutateAsync(f.id); toast({ title: "Forecast regenerated", description: "The next 12 months were recalculated from transaction history." }); } catch (e: any) { toast({ title: "Could not generate forecast", description: e.message, variant: "destructive" }); } }} className="text-cyan-400" title="Generate"><RefreshCw className={`h-3.5 w-3.5 ${generate.isPending ? "animate-spin" : ""}`} /></Button>{f.status === "draft" && <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Delete ${f.forecast_number}?`)) remove.mutate(f.id); }} className="text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>}</div></td></Row>)}{!(forecastRes?.data?.length) && <Empty cols={6} text="No forecasts yet. Create a draft to start a rolling outlook." />}</Table>
    {selectedId && <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5">{detailLoading ? <div className="flex items-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin text-cyan-400" />Loading forecast detail…</div> : detailRes?.data ? <><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-cyan-300">{detailRes.data.forecast_number}</p><h3 className="mt-1 text-lg font-semibold text-white">{detailRes.data.name}</h3><p className="mt-1 text-xs text-white/40">{detailRes.data.method.replaceAll("_", " ")} · {detailRes.data.currency} · {detailRes.data.lines.length} lines</p></div><Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-white/45"><X className="h-4 w-4" /></Button></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.08] text-left text-[10px] uppercase tracking-wider text-white/35"><th className="px-3 py-2">Period</th><th className="px-3 py-2">Account</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Notes</th></tr></thead><tbody>{detailRes.data.lines.map(line => <tr key={line.id} className="border-b border-white/[0.04]"><td className="px-3 py-2 text-white/60">{line.period}</td><td className="px-3 py-2 text-white">{line.account_code} · {line.account_name}</td><td className="px-3 py-2">{line.is_actual ? <Badge className="border-0 bg-emerald-500/10 text-emerald-300">Actual</Badge> : <Badge className="border-0 bg-cyan-500/10 text-cyan-300">Projected</Badge>}</td><td className="px-3 py-2 text-cyan-300">₹{fmt(line.amount)}</td><td className="px-3 py-2 text-white/40">{line.notes || "—"}</td></tr>)}</tbody></table>{!detailRes.data.lines.length && <p className="py-8 text-center text-sm text-white/35">No lines yet. Use Generate to create a projection from real transactions.</p>}</div></> : null}</div>}
  </div>;
}
