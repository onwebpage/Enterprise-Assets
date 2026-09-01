import { useState } from "react";
import {
  Landmark, ArrowLeftRight, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Coins, Plus, Trash2, CheckCircle2, XCircle, Banknote, Loader2, Wallet, PiggyBank, ArrowRightCircle, Pencil, AlertTriangle
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import KPICard from "@/components/app/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useTreasurySummary, useTreasuryAccounts, useTreasuryPositions, useTreasuryForecasts,
  useTreasuryPayments, useTreasuryCollections, useTreasuryTransfers,
  useCreateTreasuryAccount, useUpdateTreasuryAccount, useDeleteTreasuryAccount,
  useCreateTreasuryPosition, useUpdateTreasuryPosition, useDeleteTreasuryPosition,
  useCreateTreasuryForecast, useUpdateTreasuryForecast, useDeleteTreasuryForecast,
  useCreateTreasuryPayment, useUpdateTreasuryPayment, useApproveTreasuryPayment, useMarkPaymentPaid, useDeleteTreasuryPayment,
  useCreateTreasuryCollection, useUpdateTreasuryCollection, useMarkCollectionReceived, useDeleteTreasuryCollection,
  useCreateTreasuryTransfer, useAuthorizeTransfer, useExecuteTransfer, useDeleteTreasuryTransfer,
} from "@/hooks/useCashTreasury";
import { formatINR } from "@/lib/currency";

const today = () => new Date().toISOString().slice(0, 10);
const field = "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 h-9 text-sm";
const select = `${field} rounded-md px-3`;
function fmt(value: unknown) { return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function money(value: unknown) { return formatINR(Number(value ?? 0)); }
function Status({ value }: { value: string }) {
  const tone = value === "active" || value === "approved" || value === "received" || value === "executed" || value === "paid" ? "text-emerald-400 bg-emerald-500/10" : value === "cancelled" || value === "failed" || value === "closed" || value === "overdue" ? "text-red-400 bg-red-500/10" : value === "draft" ? "text-white/40 bg-white/10" : value === "scheduled" || value === "processing" || value === "authorized" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10";
  return <Badge className={`border-0 capitalize ${tone}`}>{value.replaceAll("_", " ")}</Badge>;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{headers.map(h => <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/35">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function Empty({ cols, text = "No records found." }: { cols: number; text?: string }) { return <tr><td colSpan={cols} className="px-4 py-12 text-center text-white/30">{text}</td></tr>; }
function Row({ children }: { children: React.ReactNode }) { return <tr className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]">{children}</tr>; }
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1 block text-[11px] font-medium text-white/45">{children}</label>; }
function Busy({ pending }: { pending: boolean }) { return pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null; }

const ACCOUNT_TYPES = ["checking", "savings", "credit", "cash", "investment", "petty_cash"];
const METHODS = ["bank_transfer", "wire", "ach", "check", "cash", "credit_card", "upi", "rtgs", "neft"];
const PAYMENT_CATEGORIES = ["operating", "payroll", "vendor", "tax", "loan", "capex", "other"];
const PAYMENT_STATUSES = ["draft", "scheduled"];
const COLLECTION_STATUSES = ["draft", "scheduled", "approved", "processing", "received", "cancelled", "overdue"];
const TRANSFER_STATUSES = ["draft", "authorized", "executed", "cancelled", "failed"];

export default function CashTreasury() {
  const [tab, setTab] = useState("overview");
  const { data: summaryRes, isLoading: summaryLoading } = useTreasurySummary();
  const summary = summaryRes?.data;
  const tabs = [
    { id: "overview", label: "Control tower", icon: Landmark },
    { id: "positions", label: "Cash position", icon: Wallet },
    { id: "forecasts", label: "Liquidity forecasting", icon: TrendingUp },
    { id: "payments", label: "Payment planning", icon: ArrowUpFromLine },
    { id: "collections", label: "Collection planning", icon: ArrowDownToLine },
    { id: "transfers", label: "Fund transfers", icon: ArrowLeftRight },
    { id: "accounts", label: "Bank & cash accounts", icon: Coins },
  ];
  const kpis = [
    { label: "Total cash", value: summaryLoading ? "..." : money(summary?.availableBalance), change: `${fmt(summary?.activeAccounts)} active accounts`, icon: Wallet, iconColor: "text-cyan-400", gradient: "bg-cyan-500/15", sparkline: [2, 3, 4, 3, 5, 4, Number(summary?.totalBalance ?? 0) / 100000] },
    { label: "Payments due", value: summaryLoading ? "..." : money(summary?.paymentsDue), change: `${fmt(summary?.totalPayments)} plans`, icon: ArrowUpFromLine, iconColor: "text-amber-400", gradient: "bg-amber-500/15", sparkline: [1, 2, 2, 3, 2, 3, Number(summary?.paymentsDue ?? 0) / 10000] },
    { label: "Collections due", value: summaryLoading ? "..." : money(summary?.collectionsDue), change: `${fmt(summary?.totalCollections)} plans`, icon: ArrowDownToLine, iconColor: "text-emerald-400", gradient: "bg-emerald-500/15", sparkline: [2, 1, 2, 1, 2, 1, Number(summary?.collectionsDue ?? 0) / 10000] },
    { label: "Forecast horizon", value: summaryLoading ? "..." : `${fmt(summary?.totalForecasts)} days`, change: `${fmt(summary?.executedTransfers)} transfers executed`, icon: TrendingUp, iconColor: "text-purple-400", gradient: "bg-purple-500/15", sparkline: [1, 2, 2, 3, 2, 2, Number(summary?.totalForecasts ?? 0)] },
  ];
  return <AppLayout breadcrumbs={[{ label: "Advanced Treasury Management" }]}>
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-lg bg-cyan-500/15 p-2 text-cyan-400"><Landmark className="h-5 w-5" /></div><h1 className="text-2xl font-bold tracking-tight text-white">Advanced Treasury Management</h1></div><p className="mt-1 text-sm text-white/40">A real-time control tower for cash visibility, liquidity risk, approvals, collections, and inter-account funding.</p></div>
        <Button onClick={() => setTab("payments")} className="h-9 bg-cyan-600 hover:bg-cyan-500"><Plus className="mr-2 h-4 w-4" />New payment</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}</div>
      <div className="overflow-x-auto"><div className="inline-flex min-w-max gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${tab === t.id ? "bg-cyan-600 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>)}</div></div>
      {tab === "overview" && <Overview summary={summary} onTab={setTab} />}
      {tab === "positions" && <Positions />}
      {tab === "forecasts" && <Forecasts />}
      {tab === "payments" && <Payments />}
      {tab === "collections" && <Collections />}
      {tab === "transfers" && <Transfers />}
      {tab === "accounts" && <Accounts />}
    </div>
  </AppLayout>;
}

function Accounts() {
  const { toast } = useToast();
  const { data: accountsRes } = useTreasuryAccounts();
  const create = useCreateTreasuryAccount(); const update = useUpdateTreasuryAccount(); const remove = useDeleteTreasuryAccount();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", accountNumber: "", bankName: "", bankBranch: "", currency: "INR", currentBalance: "0", availableBalance: "0", accountType: "checking", status: "active", isPrimary: false, notes: "" });
  const save = async () => {
    try {
      const payload = { name: form.name, accountNumber: form.accountNumber || null, bankName: form.bankName || null, bankBranch: form.bankBranch || null, currency: form.currency, currentBalance: Number(form.currentBalance) || 0, availableBalance: Number(form.availableBalance) || 0, accountType: form.accountType, status: form.status, isPrimary: form.isPrimary, notes: form.notes || null };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Account updated" : "Account created" });
      setForm({ name: "", accountNumber: "", bankName: "", bankBranch: "", currency: "INR", currentBalance: "0", availableBalance: "0", accountType: "checking", status: "active", isPrimary: false, notes: "" });
      setEditingId(null);
    } catch (e: any) { toast({ title: "Failed to create account", description: e.message, variant: "destructive" }); }
  };
  const edit = (a: any) => { setEditingId(a.id); setForm({ name: a.name, accountNumber: a.account_number ?? "", bankName: a.bank_name ?? "", bankBranch: a.bank_branch ?? "", currency: a.currency, currentBalance: String(a.current_balance), availableBalance: String(a.available_balance), accountType: a.account_type, status: a.status, isPrimary: a.is_primary, notes: a.notes ?? "" }); };
  return <div className="space-y-4">
     <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">{editingId ? "Edit bank / cash account" : "Create bank / cash account"}</h2><div className="mt-3 grid gap-3 md:grid-cols-5">
      <div><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Account number</Label><Input className={field} value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} /></div>
      <div><Label>Bank name</Label><Input className={field} value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
      <div><Label>Branch</Label><Input className={field} value={form.bankBranch} onChange={e => setForm({ ...form, bankBranch: e.target.value })} /></div>
      <div><Label>Type</Label><select className={select + " w-full"} value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value })}>{ACCOUNT_TYPES.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Currency</Label><Input className={field} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
      <div><Label>Current balance</Label><Input className={field} type="number" value={form.currentBalance} onChange={e => setForm({ ...form, currentBalance: e.target.value })} /></div>
      <div><Label>Available balance</Label><Input className={field} type="number" value={form.availableBalance} onChange={e => setForm({ ...form, availableBalance: e.target.value })} /></div>
      <div><Label>Status</Label><select className={select + " w-full"} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{["active", "inactive", "closed"].map(x => <option key={x}>{x}</option>)}</select></div>
       <div className="flex items-end gap-2"><label className="flex h-9 items-center gap-1 text-xs text-white/50"><input type="checkbox" checked={form.isPrimary} onChange={e => setForm({ ...form, isPrimary: e.target.checked })} />Primary</label><Button onClick={save} disabled={create.isPending || update.isPending || !form.name} className="h-9 bg-cyan-600 hover:bg-cyan-500"><Busy pending={create.isPending || update.isPending} />{editingId ? <><Pencil className="mr-1 h-3.5 w-3.5" />Update</> : <><Plus className="mr-1 h-3.5 w-3.5" />Create</>}</Button>{editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setForm({ name: "", accountNumber: "", bankName: "", bankBranch: "", currency: "INR", currentBalance: "0", availableBalance: "0", accountType: "checking", status: "active", isPrimary: false, notes: "" }); }} className="h-9 text-xs text-white/50">Cancel</Button>}</div>
    </div></div>
     <Table headers={["Account", "Type", "Bank", "Currency", "Balance", "Available", "Status", "Actions"]}>{(accountsRes?.data ?? []).map(a => <Row key={a.id}><td className="px-4 py-3"><p className="font-medium text-white">{a.name}{a.is_primary ? <span className="ml-2 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-400">PRIMARY</span> : null}</p><p className="text-xs text-white/35">{a.account_number || "—"}</p></td><td className="px-4 py-3 text-white/50 capitalize">{a.account_type}</td><td className="px-4 py-3 text-white/50">{a.bank_name || "—"}</td><td className="px-4 py-3 text-white/50">{a.currency}</td><td className="px-4 py-3 text-white/60">{money(a.current_balance)}</td><td className="px-4 py-3 text-emerald-400">{money(a.available_balance)}</td><td className="px-4 py-3"><Status value={a.status} /></td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => edit(a)} className="text-white/50" title="Edit account"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => remove.mutate(a.id)} className="text-red-400" title="Delete account"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(accountsRes?.data?.length) && <Empty cols={8} text="No accounts yet." />}</Table>
  </div>;
}

function Positions() {
  const { toast } = useToast();
  const { data: positionsRes } = useTreasuryPositions();
  const { data: accountsRes } = useTreasuryAccounts();
  const accounts = accountsRes?.data ?? [];
  const create = useCreateTreasuryPosition(); const update = useUpdateTreasuryPosition(); const remove = useDeleteTreasuryPosition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ accountId: "", positionDate: today(), openingBalance: "0", closingBalance: "0", notes: "" });
  const save = async () => {
    try {
      const payload = { accountId: Number(form.accountId), positionDate: form.positionDate, openingBalance: Number(form.openingBalance) || 0, closingBalance: Number(form.closingBalance) || 0, notes: form.notes || null };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Position updated" : "Position recorded" });
      setForm({ accountId: "", positionDate: today(), openingBalance: "0", closingBalance: "0", notes: "" });
      setEditingId(null);
    } catch (e: any) { toast({ title: "Failed to record position", description: e.message, variant: "destructive" }); }
  };
  const edit = (p: any) => { setEditingId(p.id); setForm({ accountId: String(p.account_id), positionDate: p.position_date, openingBalance: String(p.opening_balance), closingBalance: String(p.closing_balance), notes: p.notes ?? "" }); };
  return <div className="space-y-4">
     <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">{editingId ? "Edit daily cash position" : "Record daily cash position"}</h2><div className="mt-3 grid gap-3 md:grid-cols-5">
      <div><Label>Account *</Label><select className={select + " w-full"} value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><Label>Date *</Label><Input className={field} type="date" value={form.positionDate} onChange={e => setForm({ ...form, positionDate: e.target.value })} /></div>
      <div><Label>Opening</Label><Input className={field} type="number" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} /></div>
      <div><Label>Closing</Label><Input className={field} type="number" value={form.closingBalance} onChange={e => setForm({ ...form, closingBalance: e.target.value })} /></div>
       <div className="flex items-end gap-2"><Button onClick={save} disabled={create.isPending || update.isPending || !form.accountId} className="h-9 flex-1 bg-cyan-600 hover:bg-cyan-500"><Busy pending={create.isPending || update.isPending} />{editingId ? <><Pencil className="mr-1.5 h-3.5 w-3.5" />Update</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Record</>}</Button>{editingId && <Button variant="ghost" onClick={() => setEditingId(null)} className="h-9 text-xs text-white/50">Cancel</Button>}</div>
    </div></div>
     <Table headers={["Date", "Account", "Opening", "Closing", "Net cashflow", "Actions"]}>{(positionsRes?.data ?? []).map(p => <Row key={p.id}><td className="px-4 py-3 text-white/60">{p.position_date}</td><td className="px-4 py-3 text-white">{p.account_name || `Account #${p.account_id}`}</td><td className="px-4 py-3 text-white/50">{money(p.opening_balance)}</td><td className="px-4 py-3 text-white/60">{money(p.closing_balance)}</td><td className={`px-4 py-3 ${Number(p.net_cashflow) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(p.net_cashflow)}</td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => edit(p)} className="text-white/50" title="Edit position"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)} className="text-red-400" title="Delete position"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(positionsRes?.data?.length) && <Empty cols={6} text="No positions recorded yet." />}</Table>
  </div>;
}

function Forecasts() {
  const { toast } = useToast();
  const { data: forecastsRes } = useTreasuryForecasts();
  const { data: accountsRes } = useTreasuryAccounts();
  const accounts = accountsRes?.data ?? [];
  const create = useCreateTreasuryForecast(); const update = useUpdateTreasuryForecast(); const remove = useDeleteTreasuryForecast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ accountId: "", forecastDate: today(), projectedInflow: "0", projectedOutflow: "0", confidence: "medium", scenario: "base", notes: "" });
  const save = async () => {
    try {
      const payload = { accountId: Number(form.accountId), forecastDate: form.forecastDate, projectedInflow: Number(form.projectedInflow) || 0, projectedOutflow: Number(form.projectedOutflow) || 0, confidence: form.confidence, scenario: form.scenario, notes: form.notes || null };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Forecast updated" : "Forecast created" });
      setForm({ accountId: "", forecastDate: today(), projectedInflow: "0", projectedOutflow: "0", confidence: "medium", scenario: "base", notes: "" });
      setEditingId(null);
    } catch (e: any) { toast({ title: "Failed to create forecast", description: e.message, variant: "destructive" }); }
  };
  const edit = (f: any) => { setEditingId(f.id); setForm({ accountId: String(f.account_id), forecastDate: f.forecast_date, projectedInflow: String(f.projected_inflow), projectedOutflow: String(f.projected_outflow), confidence: f.confidence, scenario: f.scenario, notes: f.notes ?? "" }); };
  return <div className="space-y-4">
     <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">{editingId ? "Edit liquidity forecast" : "Create liquidity forecast"}</h2><div className="mt-3 grid gap-3 md:grid-cols-5">
      <div><Label>Account *</Label><select className={select + " w-full"} value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><Label>Date *</Label><Input className={field} type="date" value={form.forecastDate} onChange={e => setForm({ ...form, forecastDate: e.target.value })} /></div>
      <div><Label>Projected inflow</Label><Input className={field} type="number" min="0" value={form.projectedInflow} onChange={e => setForm({ ...form, projectedInflow: e.target.value })} /></div>
      <div><Label>Projected outflow</Label><Input className={field} type="number" min="0" value={form.projectedOutflow} onChange={e => setForm({ ...form, projectedOutflow: e.target.value })} /></div>
      <div><Label>Confidence</Label><select className={select + " w-full"} value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })}>{["high", "medium", "low"].map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Scenario</Label><select className={select + " w-full"} value={form.scenario} onChange={e => setForm({ ...form, scenario: e.target.value })}>{["base", "optimistic", "pessimistic"].map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
       <div className="flex items-end gap-2"><Button onClick={save} disabled={create.isPending || update.isPending || !form.accountId} className="h-9 flex-1 bg-cyan-600 hover:bg-cyan-500"><Busy pending={create.isPending || update.isPending} />{editingId ? <><Pencil className="mr-1.5 h-3.5 w-3.5" />Update</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Add</>}</Button>{editingId && <Button variant="ghost" onClick={() => setEditingId(null)} className="h-9 text-xs text-white/50">Cancel</Button>}</div>
    </div></div>
     <Table headers={["Date", "Account", "Inflow", "Outflow", "Net", "Projected balance", "Confidence", "Scenario", "Actions"]}>{(forecastsRes?.data ?? []).map(f => <Row key={f.id}><td className="px-4 py-3 text-white/60">{f.forecast_date}</td><td className="px-4 py-3 text-white">{f.account_name || `Account #${f.account_id}`}</td><td className="px-4 py-3 text-emerald-400">{money(f.projected_inflow)}</td><td className="px-4 py-3 text-red-400">{money(f.projected_outflow)}</td><td className={`px-4 py-3 ${Number(f.net_cashflow) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(f.net_cashflow)}</td><td className="px-4 py-3 font-medium text-white">{money(f.projected_balance)}</td><td className="px-4 py-3"><Status value={f.confidence} /></td><td className="px-4 py-3 text-white/50 capitalize">{f.scenario}</td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => edit(f)} className="text-white/50" title="Edit forecast"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => remove.mutate(f.id)} className="text-red-400" title="Delete forecast"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(forecastsRes?.data?.length) && <Empty cols={9} text="No forecasts yet." />}</Table>
  </div>;
}

function Payments() {
  const { toast } = useToast();
  const { data: paymentsRes } = useTreasuryPayments();
  const { data: accountsRes } = useTreasuryAccounts();
  const accounts = accountsRes?.data ?? [];
  const create = useCreateTreasuryPayment(); const update = useUpdateTreasuryPayment(); const approve = useApproveTreasuryPayment(); const markPaid = useMarkPaymentPaid(); const remove = useDeleteTreasuryPayment();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ accountId: "", payeeName: "", vendorName: "", amount: "0", paymentDate: today(), method: "bank_transfer", category: "operating", reference: "", status: "draft", notes: "" });
  const save = async () => {
    try {
      const payload = { accountId: form.accountId ? Number(form.accountId) : null, payeeName: form.payeeName, vendorName: form.vendorName || null, amount: Number(form.amount) || 0, paymentDate: form.paymentDate, method: form.method, category: form.category, reference: form.reference || null, status: form.status, notes: form.notes || null };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Payment plan updated" : "Payment plan created" });
      setForm({ accountId: "", payeeName: "", vendorName: "", amount: "0", paymentDate: today(), method: "bank_transfer", category: "operating", reference: "", status: "draft", notes: "" });
      setEditingId(null);
    } catch (e: any) { toast({ title: "Failed to create payment plan", description: e.message, variant: "destructive" }); }
  };
  const edit = (p: any) => { setEditingId(p.id); setForm({ accountId: p.account_id ? String(p.account_id) : "", payeeName: p.payee_name, vendorName: p.vendor_name ?? "", amount: String(p.amount), paymentDate: p.payment_date, method: p.method, category: p.category, reference: p.reference ?? "", status: p.status, notes: p.notes ?? "" }); };
  return <div className="space-y-4">
     <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">{editingId ? "Edit outgoing payment" : "Plan outgoing payment"}</h2><div className="mt-3 grid gap-3 md:grid-cols-5">
      <div><Label>Payee *</Label><Input className={field} value={form.payeeName} onChange={e => setForm({ ...form, payeeName: e.target.value })} /></div>
      <div><Label>Vendor</Label><Input className={field} value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} /></div>
      <div><Label>Amount *</Label><Input className={field} type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
      <div><Label>Date *</Label><Input className={field} type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></div>
      <div><Label>Account</Label><select className={select + " w-full"} value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><Label>Method</Label><select className={select + " w-full"} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{METHODS.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Category</Label><select className={select + " w-full"} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{PAYMENT_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Reference</Label><Input className={field} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
      <div><Label>Status</Label><select className={select + " w-full"} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{PAYMENT_STATUSES.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
       <div className="flex items-end gap-2"><Button onClick={save} disabled={create.isPending || update.isPending || !form.payeeName} className="h-9 flex-1 bg-cyan-600 hover:bg-cyan-500"><Busy pending={create.isPending || update.isPending} />{editingId ? <><Pencil className="mr-1.5 h-3.5 w-3.5" />Update</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Create</>}</Button>{editingId && <Button variant="ghost" onClick={() => setEditingId(null)} className="h-9 text-xs text-white/50">Cancel</Button>}</div>
    </div></div>
     <Table headers={["Plan", "Payee", "Date", "Amount", "Method", "Category", "Account", "Status", "Actions"]}>{(paymentsRes?.data ?? []).map(p => <Row key={p.id}><td className="px-4 py-3 font-mono text-cyan-400">{p.payment_number}</td><td className="px-4 py-3 text-white">{p.payee_name}</td><td className="px-4 py-3 text-white/50">{p.payment_date}</td><td className="px-4 py-3 font-medium text-white">{money(p.amount)}</td><td className="px-4 py-3 text-white/50 capitalize">{p.method}</td><td className="px-4 py-3 text-white/50 capitalize">{p.category}</td><td className="px-4 py-3 text-white/50">{p.account_name || "—"}</td><td className="px-4 py-3"><Status value={p.status} /></td><td className="px-4 py-3"><div className="flex gap-1">{p.status === "draft" && <><Button variant="ghost" size="sm" onClick={() => edit(p)} className="text-white/50" title="Edit payment"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => approve.mutate(p.id)} className="text-emerald-400" title="Approve"><CheckCircle2 className="h-3.5 w-3.5" /></Button></>}{p.status === "approved" && <Button variant="ghost" size="sm" onClick={() => markPaid.mutate(p.id)} className="text-emerald-400" title="Mark paid"><Banknote className="h-3.5 w-3.5" /></Button>}{p.status === "draft" && <Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)} className="text-red-400" title="Delete payment"><Trash2 className="h-3.5 w-3.5" /></Button>}</div></td></Row>)}{!(paymentsRes?.data?.length) && <Empty cols={9} text="No payment plans yet." />}</Table>
  </div>;
}

function Collections() {
  const { toast } = useToast();
  const { data: collectionsRes } = useTreasuryCollections();
  const { data: accountsRes } = useTreasuryAccounts();
  const accounts = accountsRes?.data ?? [];
  const create = useCreateTreasuryCollection(); const update = useUpdateTreasuryCollection(); const markReceived = useMarkCollectionReceived(); const remove = useDeleteTreasuryCollection();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ accountId: "", payerName: "", customerName: "", amount: "0", collectionDate: today(), method: "bank_transfer", reference: "", status: "draft", notes: "" });
  const save = async () => {
    try {
      const payload = { accountId: form.accountId ? Number(form.accountId) : null, payerName: form.payerName, customerName: form.customerName || null, amount: Number(form.amount) || 0, collectionDate: form.collectionDate, method: form.method, reference: form.reference || null, status: form.status, notes: form.notes || null };
      if (editingId) await update.mutateAsync({ id: editingId, data: payload }); else await create.mutateAsync(payload);
      toast({ title: editingId ? "Collection plan updated" : "Collection plan created" });
      setForm({ accountId: "", payerName: "", customerName: "", amount: "0", collectionDate: today(), method: "bank_transfer", reference: "", status: "draft", notes: "" });
      setEditingId(null);
    } catch (e: any) { toast({ title: "Failed to create collection plan", description: e.message, variant: "destructive" }); }
  };
  const edit = (c: any) => { setEditingId(c.id); setForm({ accountId: c.account_id ? String(c.account_id) : "", payerName: c.payer_name, customerName: c.customer_name ?? "", amount: String(c.amount), collectionDate: c.collection_date, method: c.method, reference: c.reference ?? "", status: c.status, notes: c.notes ?? "" }); };
  return <div className="space-y-4">
     <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">{editingId ? "Edit incoming collection" : "Plan incoming collection"}</h2><div className="mt-3 grid gap-3 md:grid-cols-5">
      <div><Label>Payer *</Label><Input className={field} value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })} /></div>
      <div><Label>Customer</Label><Input className={field} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} /></div>
      <div><Label>Amount *</Label><Input className={field} type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
      <div><Label>Date *</Label><Input className={field} type="date" value={form.collectionDate} onChange={e => setForm({ ...form, collectionDate: e.target.value })} /></div>
      <div><Label>Account</Label><select className={select + " w-full"} value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><Label>Method</Label><select className={select + " w-full"} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{METHODS.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Reference</Label><Input className={field} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
      <div><Label>Status</Label><select className={select + " w-full"} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{COLLECTION_STATUSES.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
       <div className="flex items-end gap-2"><Button onClick={save} disabled={create.isPending || update.isPending || !form.payerName} className="h-9 flex-1 bg-cyan-600 hover:bg-cyan-500"><Busy pending={create.isPending || update.isPending} />{editingId ? <><Pencil className="mr-1.5 h-3.5 w-3.5" />Update</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Create</>}</Button>{editingId && <Button variant="ghost" onClick={() => setEditingId(null)} className="h-9 text-xs text-white/50">Cancel</Button>}</div>
    </div></div>
     <Table headers={["Plan", "Payer", "Date", "Amount", "Method", "Account", "Reference", "Status", "Actions"]}>{(collectionsRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-cyan-400">{c.collection_number}</td><td className="px-4 py-3 text-white">{c.payer_name}</td><td className="px-4 py-3 text-white/50">{c.collection_date}</td><td className="px-4 py-3 font-medium text-emerald-400">{money(c.amount)}</td><td className="px-4 py-3 text-white/50 capitalize">{c.method}</td><td className="px-4 py-3 text-white/50">{c.account_name || "—"}</td><td className="px-4 py-3 text-white/50">{c.reference || "—"}</td><td className="px-4 py-3"><Status value={c.status} /></td><td className="px-4 py-3"><div className="flex gap-1">{c.status === "draft" && <><Button variant="ghost" size="sm" onClick={() => edit(c)} className="text-white/50" title="Edit collection"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)} className="text-red-400" title="Delete collection"><Trash2 className="h-3.5 w-3.5" /></Button></>}{c.status !== "received" && c.status !== "cancelled" && <Button variant="ghost" size="sm" onClick={() => markReceived.mutate(c.id)} className="text-emerald-400" title="Mark received"><Banknote className="h-3.5 w-3.5" /></Button>}</div></td></Row>)}{!(collectionsRes?.data?.length) && <Empty cols={9} text="No collection plans yet." />}</Table>
  </div>;
}

function Transfers() {
  const { toast } = useToast();
  const { data: transfersRes } = useTreasuryTransfers();
  const { data: accountsRes } = useTreasuryAccounts();
  const accounts = accountsRes?.data ?? [];
  const create = useCreateTreasuryTransfer(); const authorize = useAuthorizeTransfer(); const execute = useExecuteTransfer(); const remove = useDeleteTreasuryTransfer();
  const [form, setForm] = useState({ fromAccountId: "", toAccountId: "", amount: "0", transferDate: today(), reference: "", notes: "" });
  const save = async () => {
    try {
      await create.mutateAsync({ fromAccountId: Number(form.fromAccountId), toAccountId: Number(form.toAccountId), amount: Number(form.amount) || 0, transferDate: form.transferDate, reference: form.reference || null, notes: form.notes || null });
      toast({ title: "Transfer created" });
      setForm({ fromAccountId: "", toAccountId: "", amount: "0", transferDate: today(), reference: "", notes: "" });
    } catch (e: any) { toast({ title: "Failed to create transfer", description: e.message, variant: "destructive" }); }
  };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Transfer funds between accounts</h2><div className="mt-3 grid gap-3 md:grid-cols-5">
      <div><Label>From *</Label><select className={select + " w-full"} value={form.fromAccountId} onChange={e => setForm({ ...form, fromAccountId: e.target.value })}><option value="">Select source</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><Label>To *</Label><select className={select + " w-full"} value={form.toAccountId} onChange={e => setForm({ ...form, toAccountId: e.target.value })}><option value="">Select destination</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><Label>Amount *</Label><Input className={field} type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
      <div><Label>Date *</Label><Input className={field} type="date" value={form.transferDate} onChange={e => setForm({ ...form, transferDate: e.target.value })} /></div>
      <div><Label>Reference</Label><Input className={field} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
      <div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="flex items-end"><Button onClick={save} disabled={create.isPending || !form.fromAccountId || !form.toAccountId} className="h-9 w-full bg-cyan-600 hover:bg-cyan-500"><Busy pending={create.isPending} /><Plus className="mr-1.5 h-3.5 w-3.5" />Create</Button></div>
    </div></div>
    <Table headers={["Transfer", "From", "To", "Date", "Amount", "Status", "Actions"]}>{(transfersRes?.data ?? []).map(t => <Row key={t.id}><td className="px-4 py-3 font-mono text-cyan-400">{t.transfer_number}</td><td className="px-4 py-3 text-white/60">{t.from_account_name || `#${t.from_account_id}`}</td><td className="px-4 py-3 text-white/60">{t.to_account_name || `#${t.to_account_id}`}</td><td className="px-4 py-3 text-white/50">{t.transfer_date}</td><td className="px-4 py-3 font-medium text-white">{money(t.amount)}</td><td className="px-4 py-3"><Status value={t.status} /></td><td className="px-4 py-3"><div className="flex gap-1">{t.status === "draft" && <Button variant="ghost" size="sm" onClick={() => authorize.mutate(t.id)} className="text-blue-400" title="Authorize"><CheckCircle2 className="h-3.5 w-3.5" /></Button>}{t.status === "authorized" && <Button variant="ghost" size="sm" onClick={() => execute.mutate(t.id)} className="text-emerald-400" title="Execute"><ArrowRightCircle className="h-3.5 w-3.5" /></Button>}{t.status === "draft" || t.status === "authorized" ? <Button variant="ghost" size="sm" onClick={() => remove.mutate(t.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button> : null}</div></td></Row>)}{!(transfersRes?.data?.length) && <Empty cols={7} text="No transfers yet." />}</Table>
  </div>;
}

function Overview({ summary, onTab }: { summary?: any; onTab: (tab: string) => void }) {
  const cards = [
    { title: "Cash position", text: "Record daily opening/closing cash balances per account.", action: "Open positions", tab: "positions", icon: Wallet },
    { title: "Liquidity forecasting", text: "Project inflows, outflows and balances over a 30-day horizon.", action: "Open forecasting", tab: "forecasts", icon: TrendingUp },
    { title: "Payment planning", text: "Plan, approve and track outgoing payments to vendors and payees.", action: "Open payments", tab: "payments", icon: ArrowUpFromLine },
    { title: "Collection planning", text: "Plan, approve and track incoming collections from customers.", action: "Open collections", tab: "collections", icon: ArrowDownToLine },
    { title: "Fund transfers", text: "Authorize and execute transfers between treasury accounts.", action: "Open transfers", tab: "transfers", icon: ArrowLeftRight },
    { title: "Bank & cash accounts", text: "Manage operating, payroll, reserve and investment accounts.", action: "Open accounts", tab: "accounts", icon: Coins },
  ];
  const posture = [
    ["Total cash", `${money(summary?.totalBalance)} current across ${fmt(summary?.totalAccounts)} accounts.`, Wallet, "text-cyan-400"],
    ["Liquidity coverage", `${fmt(summary?.totalForecasts)} forecast days with ${money(summary?.collectionsDue)} collections due.`, TrendingUp, "text-emerald-400"],
    ["Payment pipeline", `${money(summary?.paymentsDue)} payments due with ${fmt(summary?.paidPayments)} already paid.`, ArrowUpFromLine, "text-amber-400"],
    ["Transfer activity", `${fmt(summary?.executedTransfers)} of ${fmt(summary?.totalTransfers)} transfers executed.`, ArrowLeftRight, "text-purple-400"],
  ] as const;
  const forecastAtRisk = Number(summary?.lowestForecastBalance ?? 0) < 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6">
        <p className="text-xs uppercase tracking-widest text-cyan-400/70">Advanced Treasury Management</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Treasury control tower</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <button key={card.title} onClick={() => onTab(card.tab)} className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-left hover:border-cyan-500/40 hover:bg-cyan-500/[0.06]">
              <card.icon className="mb-3 h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              <p className="mt-1 text-xs leading-5 text-white/40">{card.text}</p>
              <p className="mt-3 text-xs font-medium text-cyan-400">{card.action} →</p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6">
        <h2 className="text-sm font-semibold text-white">Treasury posture</h2>
        <div className="mt-4 space-y-4">
          {posture.map(([title, text, Icon, color]) => (
            <div key={title} className="flex gap-3">
              <div className={`mt-0.5 ${color}`}><Icon className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/40">{text}</p></div>
            </div>
          ))}
        </div>
        <div className={`mt-5 rounded-xl border p-4 ${forecastAtRisk ? "border-red-500/30 bg-red-500/[0.08]" : "border-emerald-500/20 bg-emerald-500/[0.06]"}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${forecastAtRisk ? "text-red-400" : "text-emerald-400"}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Liquidity risk signal</p>
          </div>
          <p className="mt-2 text-sm text-white/75">
            {forecastAtRisk
              ? `Base scenario falls to ${money(summary?.lowestForecastBalance)} in the next 30 days.`
              : `Base scenario remains positive with ${money(summary?.forecastNet30)} net movement over the next 30 days.`}
          </p>
          <p className="mt-1 text-xs text-white/40">{fmt(summary?.approvalQueue)} items awaiting approval · {fmt(summary?.overdueCollections)} overdue collections</p>
        </div>
      </div>
    </div>
  );
}