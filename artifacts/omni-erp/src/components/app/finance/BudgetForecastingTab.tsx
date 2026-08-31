import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useApproveForecast,
  useActivateBudget,
  useBudget,
  useBudgetAccounts,
  useBudgetVsActual,
  useBudgets,
  useCreateBudget,
  useCreateForecast,
  useDeleteBudget,
  useDeleteForecast,
  useForecast,
  useForecasts,
  useGenerateForecast,
  useCloseBudget,
  useUpdateBudget,
  useUpdateForecast,
} from "@/hooks/useBudgetCost";

const field = "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 h-9 text-sm";
const select = `${field} rounded-md px-3`;
const money = (value: unknown) => Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-medium text-white/45">{children}</label>;
}

function Status({ value }: { value: string }) {
  const tone = value === "approved" ? "text-emerald-400 bg-emerald-500/10" : value === "draft" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium capitalize ${tone}`}>{value.replaceAll("_", " ")}</span>;
}

type BudgetLineForm = { accountId: string; periodIndex: string; amount: string; description: string };
type ForecastLineForm = { accountId: string; period: string; amount: string; isActual: boolean; notes: string };

export default function BudgetForecastingTab() {
  const [section, setSection] = useState<"budgets" | "forecasts">("budgets");
  return <div className="space-y-4">
    <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
      <button onClick={() => setSection("budgets")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${section === "budgets" ? "bg-cyan-600 text-white" : "text-white/45 hover:text-white"}`}><BarChart3 className="h-3.5 w-3.5" />Budget planning</button>
      <button onClick={() => setSection("forecasts")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${section === "forecasts" ? "bg-purple-600 text-white" : "text-white/45 hover:text-white"}`}><RefreshCw className="h-3.5 w-3.5" />Forecasting</button>
    </div>
    {section === "budgets" ? <BudgetPlanning /> : <ForecastPlanning />}
  </div>;
}

function BudgetPlanning() {
  const { toast } = useToast();
  const { data: budgetsRes } = useBudgets();
  const { data: accountsRes } = useBudgetAccounts();
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const remove = useDeleteBudget();
  const activate = useActivateBudget();
  const close = useCloseBudget();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [compareId, setCompareId] = useState<number | null>(null);
  const detailRes = useBudget(editingId);
  const compareRes = useBudgetVsActual(compareId);
  const blankLine = (): BudgetLineForm => ({ accountId: "", periodIndex: "0", amount: "", description: "" });
  const blankForm = () => ({ name: "", fiscalYear: String(new Date().getFullYear()), periodType: "monthly", budgetType: "operating", notes: "", lines: [blankLine()] });
  const [form, setForm] = useState(blankForm);

  useEffect(() => {
    const budget = detailRes.data?.data;
    if (!budget) return;
    setForm({
      name: budget.name,
      fiscalYear: String(budget.fiscal_year),
      periodType: budget.period_type,
      budgetType: budget.budget_type,
      notes: budget.notes ?? "",
      lines: budget.lines.length ? budget.lines.map(line => ({ accountId: String(line.account_id), periodIndex: String(line.period_index), amount: String(line.amount), description: line.description ?? "" })) : [blankLine()],
    });
  }, [detailRes.data?.data]);

  const reset = () => { setEditingId(null); setForm(blankForm()); };
  const updateLine = (index: number, key: keyof BudgetLineForm, value: string) => setForm(current => ({ ...current, lines: current.lines.map((line, i) => i === index ? { ...line, [key]: value } : line) }));
  const save = async () => {
    const lines = form.lines.filter(line => line.accountId && line.amount !== "").map(line => ({ accountId: Number(line.accountId), periodIndex: Number(line.periodIndex), amount: Number(line.amount), description: line.description || null }));
    if (!form.name.trim() || !Number(form.fiscalYear) || !lines.length || lines.some(line => !Number.isFinite(line.amount) || line.amount < 0)) {
      toast({ title: "Complete the budget header and add valid account lines", variant: "destructive" }); return;
    }
    try {
      const payload = { name: form.name.trim(), fiscalYear: Number(form.fiscalYear), periodType: form.periodType, budgetType: form.budgetType, notes: form.notes || null, lines };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Budget updated" : "Budget draft saved" }); reset();
    } catch (error: any) { toast({ title: "Could not save budget", description: error.message, variant: "destructive" }); }
  };
  const accounts = accountsRes?.data ?? [];
  const periodNames = form.periodType === "monthly" ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : form.periodType === "quarterly" ? ["Q1", "Q2", "Q3", "Q4"] : ["Full year"];
  return <div className="space-y-4">
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
      <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">{editingId ? "Edit budget draft" : "Build a budget"}</h2><p className="mt-1 text-xs text-white/40">Budget by chart-of-accounts line and fiscal period. Active budgets are locked for auditability.</p></div>{editingId && <Button variant="ghost" size="sm" onClick={reset} className="text-white/50"><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-5"><div className="md:col-span-2"><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="FY2027 Operating Plan" /></div><div><Label>Fiscal year *</Label><Input className={field} type="number" min="2000" max="2100" value={form.fiscalYear} onChange={e => setForm({ ...form, fiscalYear: e.target.value })} /></div><div><Label>Periods</Label><select className={select + " w-full"} value={form.periodType} onChange={e => setForm({ ...form, periodType: e.target.value, lines: form.lines.map(line => ({ ...line, periodIndex: "0" })) })}>{["monthly", "quarterly", "yearly"].map(value => <option key={value}>{value}</option>)}</select></div><div><Label>Budget type</Label><select className={select + " w-full"} value={form.budgetType} onChange={e => setForm({ ...form, budgetType: e.target.value })}>{["operating", "capital", "cash_flow", "project"].map(value => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></div></div>
      <div className="mt-3 space-y-2"><div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_1.4fr_auto] gap-2 px-1 text-[10px] uppercase tracking-wider text-white/30"><span>Account</span><span>Period</span><span>Amount</span><span>Description</span><span /></div>{form.lines.map((line, index) => <div key={index} className="grid grid-cols-[1.5fr_0.7fr_0.8fr_1.4fr_auto] gap-2"><select className={select} value={line.accountId} onChange={e => updateLine(index, "accountId", e.target.value)}><option value="">Select account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} · {account.name} ({account.type})</option>)}</select><select className={select} value={line.periodIndex} onChange={e => updateLine(index, "periodIndex", e.target.value)}>{periodNames.map((name, periodIndex) => <option key={periodIndex} value={periodIndex}>{name}</option>)}</select><Input className={field} type="number" min="0" step="0.01" value={line.amount} onChange={e => updateLine(index, "amount", e.target.value)} placeholder="0.00" /><Input className={field} value={line.description} onChange={e => updateLine(index, "description", e.target.value)} placeholder="Optional note" /><Button variant="ghost" size="sm" onClick={() => setForm({ ...form, lines: form.lines.length > 1 ? form.lines.filter((_, i) => i !== index) : form.lines })} className="text-white/35 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>
      <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, blankLine()] })} className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add line</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="h-8 bg-cyan-600 text-xs hover:bg-cyan-500"><Save className="mr-1 h-3.5 w-3.5" />{editingId ? "Save changes" : "Save draft"}</Button></div>
    </div>
    <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{["Budget", "Year", "Type", "Status", "Lines", "Amount", "Actions"].map(header => <th key={header} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/35">{header}</th>)}</tr></thead><tbody>{(budgetsRes?.data ?? []).map(budget => <tr key={budget.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]"><td className="px-4 py-3"><p className="font-mono text-cyan-400">{budget.budget_number}</p><p className="text-xs text-white/35">{budget.name}</p></td><td className="px-4 py-3 text-white/50">{budget.fiscal_year}</td><td className="px-4 py-3 capitalize text-white/50">{budget.budget_type.replaceAll("_", " ")}</td><td className="px-4 py-3"><Status value={budget.status} /></td><td className="px-4 py-3 text-white/50">{budget.line_count ?? 0}</td><td className="px-4 py-3 text-white">${money(budget.total_amount)}</td><td className="px-4 py-3"><div className="flex gap-1">{budget.status === "draft" && <><Button variant="ghost" size="sm" title="Edit draft" onClick={() => setEditingId(budget.id)} className="text-white/50 hover:text-white"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" title="Activate" onClick={() => activate.mutate(budget.id)} className="text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" title="Delete draft" onClick={() => remove.mutate(budget.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></>}{budget.status === "active" && <><Button variant="ghost" size="sm" title="Compare to actual" onClick={() => setCompareId(compareId === budget.id ? null : budget.id)} className="text-cyan-400"><BarChart3 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" title="Close budget" onClick={() => close.mutate(budget.id)} className="text-amber-400"><X className="h-3.5 w-3.5" /></Button></>}</div></td></tr>)}{!(budgetsRes?.data?.length) && <tr><td colSpan={7} className="px-4 py-12 text-center text-white/30">No budgets yet. Create a draft with account lines above.</td></tr>}</tbody></table></div>
    {compareRes.data?.data && <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Budget vs actual · {compareRes.data.data.budget.name}</h2><p className="mt-1 text-xs text-white/40">Actuals are read from finance transactions for the budget fiscal year.</p></div><Button variant="ghost" size="sm" onClick={() => setCompareId(null)} className="text-white/40"><X className="h-3.5 w-3.5" /></Button></div><div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{["Account", "Period", "Budget", "Actual", "Variance", "Variance %"].map(header => <th key={header} className="px-3 py-2 text-left text-[10px] uppercase text-white/35">{header}</th>)}</tr></thead><tbody>{compareRes.data.data.lines.map(line => <tr key={line.id} className="border-b border-white/[0.04]"><td className="px-3 py-2 text-white">{line.account_code} · {line.account_name}</td><td className="px-3 py-2 text-white/50">{line.period_label}</td><td className="px-3 py-2 text-white">${money(line.amount)}</td><td className="px-3 py-2 text-white/60">${money(line.actual)}</td><td className={`px-3 py-2 ${line.variance >= 0 ? "text-emerald-400" : "text-amber-400"}`}>${money(line.variance)}</td><td className="px-3 py-2 text-white/60">{line.variance_pct}%</td></tr>)}</tbody></table></div></div>}
  </div>;
}

function ForecastPlanning() {
  const { toast } = useToast();
  const { data: forecastRes } = useForecasts();
  const { data: accountsRes } = useBudgetAccounts();
  const create = useCreateForecast(); const update = useUpdateForecast(); const approve = useApproveForecast(); const generate = useGenerateForecast(); const remove = useDeleteForecast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const detailRes = useForecast(editingId);
  const blankLine = (): ForecastLineForm => ({ accountId: "", period: new Date().toISOString().slice(0, 7), amount: "", isActual: false, notes: "" });
  const blankForm = () => ({ name: "", method: "manual", currency: "USD", notes: "", lines: [blankLine()] });
  const [form, setForm] = useState(blankForm);
  useEffect(() => {
    const forecast = detailRes.data?.data;
    if (!forecast) return;
    setForm({ name: forecast.name, method: forecast.method, currency: forecast.currency, notes: forecast.notes ?? "", lines: forecast.lines.length ? forecast.lines.map(line => ({ accountId: String(line.account_id), period: line.period, amount: String(line.amount), isActual: line.is_actual, notes: line.notes ?? "" })) : [blankLine()] });
  }, [detailRes.data?.data]);
  const reset = () => { setEditingId(null); setForm(blankForm()); };
  const updateLine = (index: number, key: keyof ForecastLineForm, value: string | boolean) => setForm(current => ({ ...current, lines: current.lines.map((line, i) => i === index ? { ...line, [key]: value } : line) }));
  const save = async () => {
    const lines = form.lines.filter(line => line.accountId && line.period && line.amount !== "").map(line => ({ accountId: Number(line.accountId), period: line.period, amount: Number(line.amount), isActual: line.isActual, notes: line.notes || null }));
    if (!form.name.trim() || !lines.length || lines.some(line => !Number.isFinite(line.amount) || line.amount < 0)) { toast({ title: "Complete the forecast header and add valid lines", variant: "destructive" }); return; }
    try {
      const payload = { name: form.name.trim(), method: form.method, currency: form.currency.trim().toUpperCase(), notes: form.notes || null, lines };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Forecast updated" : "Forecast draft saved" }); reset();
    } catch (error: any) { toast({ title: "Could not save forecast", description: error.message, variant: "destructive" }); }
  };
  const accounts = accountsRes?.data ?? [];
  return <div className="space-y-4">
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">{editingId ? "Edit forecast draft" : "Build a forecast"}</h2><p className="mt-1 text-xs text-white/40">Use manual assumptions or generate a 12-month projection from transaction history.</p></div>{editingId && <Button variant="ghost" size="sm" onClick={reset} className="text-white/50"><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>}</div><div className="mt-4 grid gap-3 md:grid-cols-5"><div className="md:col-span-2"><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rolling 12-month forecast" /></div><div><Label>Method</Label><select className={select + " w-full"} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{["linear", "moving_average", "seasonal", "manual"].map(value => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></div><div><Label>Currency</Label><Input className={field} maxLength={10} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Planning assumptions" /></div></div><div className="mt-3 space-y-2"><div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_1.2fr_auto] gap-2 px-1 text-[10px] uppercase tracking-wider text-white/30"><span>Account</span><span>Period</span><span>Amount</span><span>Actual?</span><span>Notes</span><span /></div>{form.lines.map((line, index) => <div key={index} className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_1.2fr_auto] gap-2"><select className={select} value={line.accountId} onChange={e => updateLine(index, "accountId", e.target.value)}><option value="">Select account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select><Input className={field} type="month" value={line.period} onChange={e => updateLine(index, "period", e.target.value)} /><Input className={field} type="number" min="0" step="0.01" value={line.amount} onChange={e => updateLine(index, "amount", e.target.value)} placeholder="0.00" /><label className="flex items-center justify-center"><input type="checkbox" checked={line.isActual} onChange={e => updateLine(index, "isActual", e.target.checked)} className="h-4 w-4 accent-cyan-500" /></label><Input className={field} value={line.notes} onChange={e => updateLine(index, "notes", e.target.value)} placeholder="Optional note" /><Button variant="ghost" size="sm" onClick={() => setForm({ ...form, lines: form.lines.length > 1 ? form.lines.filter((_, i) => i !== index) : form.lines })} className="text-white/35 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, blankLine()] })} className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add line</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="h-8 bg-purple-600 text-xs hover:bg-purple-500"><Save className="mr-1 h-3.5 w-3.5" />{editingId ? "Save changes" : "Save draft"}</Button></div></div>
    <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{["Forecast", "Method", "Status", "Horizon", "Total", "Actions"].map(header => <th key={header} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/35">{header}</th>)}</tr></thead><tbody>{(forecastRes?.data ?? []).map(forecast => <tr key={forecast.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]"><td className="px-4 py-3"><p className="font-mono text-purple-400">{forecast.forecast_number}</p><p className="text-xs text-white/35">{forecast.name}</p></td><td className="px-4 py-3 capitalize text-white/50">{forecast.method.replaceAll("_", " ")}</td><td className="px-4 py-3"><Status value={forecast.status} /></td><td className="px-4 py-3 text-white/50">{forecast.line_count ?? 0} lines</td><td className="px-4 py-3 text-white">{forecast.currency} {money(forecast.line_total)}</td><td className="px-4 py-3"><div className="flex gap-1">{forecast.status === "draft" && <><Button variant="ghost" size="sm" title="Edit draft" onClick={() => setEditingId(forecast.id)} className="text-white/50 hover:text-white"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" title="Approve" onClick={() => approve.mutate(forecast.id)} className="text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" title="Delete draft" onClick={() => remove.mutate(forecast.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></>}<Button variant="ghost" size="sm" title="Generate 12-month projection" onClick={() => generate.mutate(forecast.id)} className="text-cyan-400"><RefreshCw className="h-3.5 w-3.5" /></Button></div></td></tr>)}{!(forecastRes?.data?.length) && <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">No forecasts yet. Create a draft with assumptions above.</td></tr>}</tbody></table></div>
  </div>;
}