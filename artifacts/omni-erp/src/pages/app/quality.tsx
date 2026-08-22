import { useState } from "react";
import { ShieldCheck, ClipboardCheck, AlertTriangle, FileCheck2, ListChecks, Package, Plus, Trash2, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import KPICard from "@/components/app/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInvProducts, useInvWarehouses } from "@/hooks/useInventory";
import {
  useQcSummary, useQcParameters, useQcInspections,
  useQcRejections, useQcCapas, useQcCertificates,
  useCreateQcParameter, useDeleteQcParameter,
  useCreateQcInspection, useCompleteQcInspection, useDeleteQcInspection,
  useCreateQcRejection, useDeleteQcRejection,
  useCreateQcCapa, useCloseQcCapa, useDeleteQcCapa,
  useCreateQcCertificate, useIssueQcCertificate, useDeleteQcCertificate,
} from "@/hooks/useQuality";

const today = () => new Date().toISOString().slice(0, 10);
const field = "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 h-9 text-sm";
const select = `${field} rounded-md px-3`;
function fmt(value: unknown) { return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
function Status({ value }: { value: string }) {
  const tone = value === "passed" || value === "issued" || value === "closed" || value === "returned" || value === "reworked" ? "text-emerald-400 bg-emerald-500/10" : value === "failed" || value === "cancelled" || value === "revoked" || value === "scrapped" ? "text-red-400 bg-red-500/10" : value === "draft" || value === "open" || value === "pending" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10";
  return <Badge className={`border-0 capitalize ${tone}`}>{value.replaceAll("_", " ")}</Badge>;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07]">{headers.map(h => <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/35">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function Empty({ cols, text = "No records found." }: { cols: number; text?: string }) { return <tr><td colSpan={cols} className="px-4 py-12 text-center text-white/30">{text}</td></tr>; }
function Row({ children }: { children: React.ReactNode }) { return <tr className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]">{children}</tr>; }
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1 block text-[11px] font-medium text-white/45">{children}</label>; }
function Busy({ pending }: { pending: boolean }) { return pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null; }

export default function Quality() {
  const [tab, setTab] = useState("overview");
  const { data: summaryRes, isLoading: summaryLoading } = useQcSummary();
  const summary = summaryRes?.data;
  const tabs = [
    { id: "overview", label: "Control tower", icon: ShieldCheck },
    { id: "incoming", label: "Incoming QC", icon: Package },
    { id: "inprocess", label: "In-process QC", icon: ClipboardCheck },
    { id: "finished", label: "Finished goods", icon: FileCheck2 },
    { id: "parameters", label: "Parameters", icon: ListChecks },
    { id: "rejections", label: "Rejections", icon: AlertTriangle },
    { id: "capa", label: "CAPA", icon: RefreshCw },
    { id: "certificates", label: "Certificates", icon: FileCheck2 },
  ];
  const kpis = [
    { label: "Total inspections", value: summaryLoading ? "..." : fmt(summary?.totalInspections), change: `${fmt(summary?.failedInspections)} failed`, icon: ClipboardCheck, iconColor: "text-cyan-400", gradient: "bg-cyan-500/15", sparkline: [2, 3, 4, 3, 5, 4, Number(summary?.totalInspections ?? 0)] },
    { label: "Open incoming", value: summaryLoading ? "..." : fmt(summary?.openIncoming), change: `${fmt(summary?.openInProcess)} in-process`, icon: Package, iconColor: "text-blue-400", gradient: "bg-blue-500/15", sparkline: [1, 2, 2, 3, 2, 3, Number(summary?.openIncoming ?? 0)] },
    { label: "Open rejections", value: summaryLoading ? "..." : fmt(summary?.openRejections), change: `${fmt(summary?.rejectedUnits)} units`, icon: AlertTriangle, iconColor: "text-amber-400", gradient: "bg-amber-500/15", sparkline: [2, 1, 2, 1, 2, 1, Number(summary?.openRejections ?? 0)] },
    { label: "Open CAPAs", value: summaryLoading ? "..." : fmt(summary?.openCapas), change: `${fmt(summary?.issuedCertificates)} certificates issued`, icon: RefreshCw, iconColor: "text-purple-400", gradient: "bg-purple-500/15", sparkline: [1, 2, 2, 3, 2, 2, Number(summary?.openCapas ?? 0)] },
  ];
  return <AppLayout breadcrumbs={[{ label: "Quality Management" }]}>
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400"><ShieldCheck className="h-5 w-5" /></div><h1 className="text-2xl font-bold tracking-tight text-white">Quality Management</h1></div><p className="mt-1 text-sm text-white/40">Incoming, in-process and finished-goods QC with parameters, rejections, CAPA and certificates.</p></div>
        <Button onClick={() => setTab("incoming")} className="h-9 bg-emerald-600 hover:bg-emerald-500"><Plus className="mr-2 h-4 w-4" />New inspection</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}</div>
      <div className="overflow-x-auto"><div className="inline-flex min-w-max gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${tab === t.id ? "bg-emerald-600 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>)}</div></div>
      {tab === "overview" && <Overview summary={summary} onTab={setTab} />}
      {tab === "incoming" && <Inspections type="incoming" />}
      {tab === "inprocess" && <Inspections type="in_process" />}
      {tab === "finished" && <Inspections type="finished_goods" />}
      {tab === "parameters" && <Parameters />}
      {tab === "rejections" && <Rejections />}
      {tab === "capa" && <Capas />}
      {tab === "certificates" && <Certificates />}
    </div>
  </AppLayout>;
}

function Overview({ summary, onTab }: { summary?: any; onTab: (tab: string) => void }) {
  const cards = [
    { title: "Incoming QC", text: "Inspect received goods against supplier specifications and quality parameters.", action: "Open incoming QC", tab: "incoming", icon: Package },
    { title: "In-process QC", text: "Monitor production quality at each stage with parameter-based checks.", action: "Open in-process QC", tab: "inprocess", icon: ClipboardCheck },
    { title: "Finished goods", text: "Verify finished products meet quality standards before dispatch.", action: "Open finished goods", tab: "finished", icon: FileCheck2 },
    { title: "CAPA & certificates", text: "Track corrective actions and issue quality certificates for lots.", action: "Manage CAPA", tab: "capa", icon: RefreshCw },
  ];
  return <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><p className="text-xs uppercase tracking-widest text-emerald-400/70">Quality assurance</p><h2 className="mt-1 text-lg font-semibold text-white">Quality control tower</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{cards.map(c => <button key={c.title} onClick={() => onTab(c.tab)} className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-left hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"><c.icon className="mb-3 h-5 w-5 text-emerald-400" /><h3 className="text-sm font-semibold text-white">{c.title}</h3><p className="mt-1 text-xs leading-5 text-white/40">{c.text}</p><p className="mt-3 text-xs font-medium text-emerald-400">{c.title} →</p></button>)}</div></div><div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><h2 className="text-sm font-semibold text-white">Live quality posture</h2><div className="mt-4 space-y-4">{[["Inspection coverage", `${fmt(summary?.totalInspections)} total inspections with ${fmt(summary?.failedInspections)} failed.`, ClipboardCheck, "text-cyan-400"], ["Rejection exposure", `${fmt(summary?.openRejections)} open rejection(s) totalling ${fmt(summary?.rejectedUnits)} units need disposition.`, AlertTriangle, "text-amber-400"], ["CAPA & certificates", `${fmt(summary?.openCapas)} open CAPA(s) and ${fmt(summary?.issuedCertificates)} issued certificate(s).`, FileCheck2, "text-purple-400"]].map(([title, text, Icon, color]) => { const I = Icon as React.ComponentType<{ className?: string }>; return <div key={String(title)} className="flex gap-3"><div className={`mt-0.5 ${color}`}><I className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">{String(title)}</p><p className="mt-1 text-xs leading-5 text-white/40">{String(text)}</p></div></div>; })}</div></div></div>;
}

function Parameters() {
  const { toast } = useToast();
  const { data: paramsRes } = useQcParameters();
  const create = useCreateQcParameter(); const remove = useDeleteQcParameter();
  const [form, setForm] = useState({ code: "", name: "", parameterType: "numeric", unit: "", minValue: "", maxValue: "", allowedValues: "", description: "" });
  const save = async () => { try { await create.mutateAsync({ code: form.code, name: form.name, parameterType: form.parameterType, unit: form.unit || null, minValue: form.minValue ? Number(form.minValue) : null, maxValue: form.maxValue ? Number(form.maxValue) : null, allowedValues: form.allowedValues || null, description: form.description || null }); toast({ title: "Parameter created" }); setForm({ code: "", name: "", parameterType: "numeric", unit: "", minValue: "", maxValue: "", allowedValues: "", description: "" }); } catch (e: any) { toast({ title: "Failed to create parameter", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">New inspection parameter</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Code *</Label><Input className={field} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="PAR-WT" /></div><div><Label>Name *</Label><Input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Type</Label><select className={select + " w-full"} value={form.parameterType} onChange={e => setForm({ ...form, parameterType: e.target.value })}>{["numeric", "text", "boolean", "enum"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Unit</Label><Input className={field} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="kg, cm, %" /></div><div><Label>Min value</Label><Input className={field} type="number" value={form.minValue} onChange={e => setForm({ ...form, minValue: e.target.value })} /></div><div><Label>Max value</Label><Input className={field} type="number" value={form.maxValue} onChange={e => setForm({ ...form, maxValue: e.target.value })} /></div><div><Label>Allowed values (enum)</Label><Input className={field} value={form.allowedValues} onChange={e => setForm({ ...form, allowedValues: e.target.value })} placeholder="Black,White,Silver" /></div><div><Label>Description</Label><Input className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div></div><Button onClick={save} disabled={create.isPending || !form.code || !form.name} className="mt-3 h-8 bg-emerald-600 text-xs hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1 h-3.5 w-3.5" />Create</Button></div>
    <Table headers={["Code", "Name", "Type", "Unit", "Range", "Actions"]}>{(paramsRes?.data ?? []).map(p => <Row key={p.id}><td className="px-4 py-3 font-mono text-emerald-400">{p.code}</td><td className="px-4 py-3 text-white">{p.name}</td><td className="px-4 py-3 text-white/50 capitalize">{p.parameter_type}</td><td className="px-4 py-3 text-white/50">{p.unit || "—"}</td><td className="px-4 py-3 text-white/50">{p.min_value && p.max_value ? `${p.min_value} – ${p.max_value}` : p.allowed_values || "—"}</td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(paramsRes?.data?.length) && <Empty cols={6} text="No parameters yet." />}</Table>
  </div>;
}

function Inspections({ type }: { type: string }) {
  const { toast } = useToast();
  const { data: inspectionsRes } = useQcInspections(type);
  const { data: productsRes } = useInvProducts({ limit: 100 });
  const { data: warehousesRes } = useInvWarehouses();
  const { data: paramsRes } = useQcParameters();
  const products = productsRes?.data ?? [];
  const warehouses = warehousesRes?.data ?? [];
  const params = paramsRes?.data ?? [];
  const create = useCreateQcInspection(); const complete = useCompleteQcInspection(); const remove = useDeleteQcInspection();
  const [form, setForm] = useState({ productId: "", warehouseId: "", referenceNumber: "", lotNumber: "", batchNumber: "", quantity: "", inspector: "", inspectionDate: today(), notes: "", lines: [] as Array<{ parameterId: string; measuredValue: string; result: string }> });
  const setLine = (i: number, k: string, v: string) => { const l = [...form.lines]; (l[i] as any)[k] = v; setForm({ ...form, lines: l }); };
  const addLine = () => setForm({ ...form, lines: [...form.lines, { parameterId: "", measuredValue: "", result: "pending" }] });
  const save = async () => {
    try {
      const lines = form.lines.filter(l => l.parameterId).map(l => ({ parameterId: Number(l.parameterId), measuredValue: l.measuredValue || null, expectedValue: null, result: l.result as any }));
      await create.mutateAsync({ inspectionType: type, productId: Number(form.productId), warehouseId: form.warehouseId ? Number(form.warehouseId) : null, referenceNumber: form.referenceNumber || null, lotNumber: form.lotNumber || null, batchNumber: form.batchNumber || null, quantity: Number(form.quantity) || 0, inspectedQty: Number(form.quantity) || 0, inspector: form.inspector || null, inspectionDate: form.inspectionDate || null, notes: form.notes || null, lines });
      toast({ title: "Inspection created" });
      setForm({ productId: "", warehouseId: "", referenceNumber: "", lotNumber: "", batchNumber: "", quantity: "", inspector: "", inspectionDate: today(), notes: "", lines: [] });
    } catch (e: any) { toast({ title: "Failed to create inspection", description: e.message, variant: "destructive" }); }
  };
  const typeLabel = type === "incoming" ? "Incoming" : type === "in_process" ? "In-process" : "Finished goods";
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Create {typeLabel} inspection</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Product *</Label><select className={select + " w-full"} value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}><option value="">Select SKU</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div><div><Label>Warehouse</Label><select className={select + " w-full"} value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}><option value="">None</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></div><div><Label>Reference (PO/WO/SO)</Label><Input className={field} value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} /></div><div><Label>Lot / batch</Label><Input className={field} value={form.lotNumber} onChange={e => setForm({ ...form, lotNumber: e.target.value })} placeholder="LOT-2026-08" /></div><div><Label>Quantity *</Label><Input className={field} type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div><div><Label>Inspector</Label><Input className={field} value={form.inspector} onChange={e => setForm({ ...form, inspector: e.target.value })} /></div><div><Label>Inspection date</Label><Input className={field} type="date" value={form.inspectionDate} onChange={e => setForm({ ...form, inspectionDate: e.target.value })} /></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div><div className="mt-3 space-y-2">{form.lines.map((l, i) => <div key={i} className="grid gap-2 md:grid-cols-4"><select className={select} value={l.parameterId} onChange={e => setLine(i, "parameterId", e.target.value)}><option value="">Select parameter</option>{params.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select><Input className={field} placeholder="Measured value" value={l.measuredValue} onChange={e => setLine(i, "measuredValue", e.target.value)} /><select className={select} value={l.result} onChange={e => setLine(i, "result", e.target.value)}>{["pending", "pass", "fail"].map(x => <option key={x}>{x}</option>)}</select><Button variant="ghost" size="sm" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div><div className="mt-2 flex gap-2"><Button onClick={addLine} variant="outline" className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add parameter</Button><Button onClick={save} disabled={create.isPending || !form.productId || !form.quantity} className="h-8 bg-emerald-600 text-xs hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1 h-3.5 w-3.5" />Create inspection</Button></div></div>
    <Table headers={["Inspection", "Product", "Reference", "Qty", "Passed", "Rejected", "Status", "Actions"]}>{(inspectionsRes?.data ?? []).map(i => <Row key={i.id}><td className="px-4 py-3 font-mono text-emerald-400">{i.inspection_number}</td><td className="px-4 py-3"><p className="text-white">{i.sku}</p><p className="text-xs text-white/35">{i.product_name}</p></td><td className="px-4 py-3 text-white/50">{i.reference_number || "—"}</td><td className="px-4 py-3 text-white/60">{fmt(i.quantity)}</td><td className="px-4 py-3 text-emerald-400">{fmt(i.passed_qty)}</td><td className="px-4 py-3 text-red-400">{fmt(i.rejected_qty)}</td><td className="px-4 py-3"><Status value={i.status} /></td><td className="px-4 py-3"><div className="flex gap-1">{i.status === "draft" && <Button variant="ghost" size="sm" onClick={() => complete.mutate(i.id)} className="text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="sm" onClick={() => remove.mutate(i.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></Row>)}{!(inspectionsRes?.data?.length) && <Empty cols={8} text={`No ${typeLabel.toLowerCase()} inspections yet.`} />}</Table>
  </div>;
}

function Rejections() {
  const { toast } = useToast();
  const { data: rejectionsRes } = useQcRejections();
  const { data: productsRes } = useInvProducts({ limit: 100 });
  const { data: warehousesRes } = useInvWarehouses();
  const products = productsRes?.data ?? [];
  const warehouses = warehousesRes?.data ?? [];
  const create = useCreateQcRejection(); const remove = useDeleteQcRejection();
  const [form, setForm] = useState({ productId: "", warehouseId: "", lotNumber: "", quantity: "", reason: "", disposition: "quarantine", notes: "" });
  const save = async () => { try { await create.mutateAsync({ productId: Number(form.productId), warehouseId: form.warehouseId ? Number(form.warehouseId) : null, lotNumber: form.lotNumber || null, quantity: Number(form.quantity) || 0, reason: form.reason, disposition: form.disposition, notes: form.notes || null }); toast({ title: "Rejection recorded" }); setForm({ productId: "", warehouseId: "", lotNumber: "", quantity: "", reason: "", disposition: "quarantine", notes: "" }); } catch (e: any) { toast({ title: "Failed to record rejection", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Record rejection</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Product *</Label><select className={select + " w-full"} value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}><option value="">Select SKU</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div><div><Label>Warehouse</Label><select className={select + " w-full"} value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}><option value="">None</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}</select></div><div><Label>Lot / batch</Label><Input className={field} value={form.lotNumber} onChange={e => setForm({ ...form, lotNumber: e.target.value })} /></div><div><Label>Quantity *</Label><Input className={field} type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div><div><Label>Reason *</Label><Input className={field} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div><div><Label>Disposition</Label><select className={select + " w-full"} value={form.disposition} onChange={e => setForm({ ...form, disposition: e.target.value })}>{["quarantine", "return", "scrap", "rework"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div><div className="flex items-end"><Button onClick={save} disabled={create.isPending || !form.productId || !form.reason} className="h-9 w-full bg-emerald-600 hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1.5 h-3.5 w-3.5" />Record</Button></div></div></div>
    <Table headers={["Rejection", "Product", "Qty", "Reason", "Disposition", "Status", "Action"]}>{(rejectionsRes?.data ?? []).map(r => <Row key={r.id}><td className="px-4 py-3 font-mono text-emerald-400">{r.rejection_number}</td><td className="px-4 py-3"><p className="text-white">{r.sku}</p><p className="text-xs text-white/35">{r.product_name}</p></td><td className="px-4 py-3 text-white/60">{fmt(r.quantity)}</td><td className="px-4 py-3 text-white/50">{r.reason}</td><td className="px-4 py-3 text-white/50 capitalize">{r.disposition}</td><td className="px-4 py-3"><Status value={r.status} /></td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></td></Row>)}{!(rejectionsRes?.data?.length) && <Empty cols={7} text="No rejections yet." />}</Table>
  </div>;
}

function Capas() {
  const { toast } = useToast();
  const { data: capasRes } = useQcCapas();
  const create = useCreateQcCapa(); const close = useCloseQcCapa(); const remove = useDeleteQcCapa();
  const [form, setForm] = useState({ capaType: "corrective", title: "", description: "", sourceType: "inspection", priority: "medium", rootCause: "", actionPlan: "", assignedTo: "", dueDate: "", notes: "" });
  const save = async () => { try { await create.mutateAsync({ capaType: form.capaType, title: form.title, description: form.description || null, sourceType: form.sourceType || null, priority: form.priority, rootCause: form.rootCause || null, actionPlan: form.actionPlan || null, assignedTo: form.assignedTo || null, dueDate: form.dueDate || null, notes: form.notes || null }); toast({ title: "CAPA created" }); setForm({ capaType: "corrective", title: "", description: "", sourceType: "inspection", priority: "medium", rootCause: "", actionPlan: "", assignedTo: "", dueDate: "", notes: "" }); } catch (e: any) { toast({ title: "Failed to create CAPA", description: e.message, variant: "destructive" }); } };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Create CAPA</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Type</Label><select className={select + " w-full"} value={form.capaType} onChange={e => setForm({ ...form, capaType: e.target.value })}>{["corrective", "preventive"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Title *</Label><Input className={field} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div><div><Label>Source</Label><select className={select + " w-full"} value={form.sourceType} onChange={e => setForm({ ...form, sourceType: e.target.value })}>{["inspection", "rejection", "audit", "complaint", "other"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Priority</Label><select className={select + " w-full"} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{["low", "medium", "high", "critical"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Description</Label><Input className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div><Label>Root cause</Label><Input className={field} value={form.rootCause} onChange={e => setForm({ ...form, rootCause: e.target.value })} /></div><div><Label>Action plan</Label><Input className={field} value={form.actionPlan} onChange={e => setForm({ ...form, actionPlan: e.target.value })} /></div><div><Label>Assigned to</Label><Input className={field} value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></div><div><Label>Due date</Label><Input className={field} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div><div className="flex items-end"><Button onClick={save} disabled={create.isPending || !form.title} className="h-9 w-full bg-emerald-600 hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1.5 h-3.5 w-3.5" />Create</Button></div></div></div>
    <Table headers={["CAPA", "Type", "Title", "Priority", "Status", "Assigned", "Due", "Actions"]}>{(capasRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-emerald-400">{c.capa_number}</td><td className="px-4 py-3 text-white/50 capitalize">{c.capa_type}</td><td className="px-4 py-3"><p className="text-white">{c.title}</p><p className="text-xs text-white/35">{c.description || ""}</p></td><td className="px-4 py-3"><Badge className={`border-0 capitalize ${c.priority === "critical" ? "text-red-400 bg-red-500/10" : c.priority === "high" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10"}`}>{c.priority}</Badge></td><td className="px-4 py-3"><Status value={c.status} /></td><td className="px-4 py-3 text-white/50">{c.assigned_to || "—"}</td><td className="px-4 py-3 text-white/50">{c.due_date || "—"}</td><td className="px-4 py-3"><div className="flex gap-1">{c.status !== "closed" && <Button variant="ghost" size="sm" onClick={() => close.mutate(c.id)} className="text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></Row>)}{!(capasRes?.data?.length) && <Empty cols={8} text="No CAPAs yet." />}</Table>
  </div>;
}

function Certificates() {
  const { toast } = useToast();
  const { data: certsRes } = useQcCertificates();
  const { data: productsRes } = useInvProducts({ limit: 100 });
  const { data: paramsRes } = useQcParameters();
  const products = productsRes?.data ?? [];
  const params = paramsRes?.data ?? [];
  const create = useCreateQcCertificate(); const issue = useIssueQcCertificate(); const remove = useDeleteQcCertificate();
  const [form, setForm] = useState({ productId: "", lotNumber: "", certificateType: "coa", issueDate: today(), expiryDate: "", issuedBy: "", notes: "", lines: [] as Array<{ parameterId: string; measuredValue: string; result: string }> });
  const setLine = (i: number, k: string, v: string) => { const l = [...form.lines]; (l[i] as any)[k] = v; setForm({ ...form, lines: l }); };
  const addLine = () => setForm({ ...form, lines: [...form.lines, { parameterId: "", measuredValue: "", result: "pass" }] });
  const save = async () => {
    try {
      const lines = form.lines.filter(l => l.parameterId).map(l => ({ parameterId: Number(l.parameterId), measuredValue: l.measuredValue || null, expectedValue: null, result: l.result as any }));
      await create.mutateAsync({ productId: Number(form.productId), lotNumber: form.lotNumber || null, certificateType: form.certificateType, issueDate: form.issueDate, expiryDate: form.expiryDate || null, issuedBy: form.issuedBy || null, notes: form.notes || null, lines });
      toast({ title: "Certificate created" });
      setForm({ productId: "", lotNumber: "", certificateType: "coa", issueDate: today(), expiryDate: "", issuedBy: "", notes: "", lines: [] });
    } catch (e: any) { toast({ title: "Failed to create certificate", description: e.message, variant: "destructive" }); }
  };
  return <div className="space-y-4">
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><h2 className="text-sm font-semibold text-white">Create quality certificate</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><div><Label>Product *</Label><select className={select + " w-full"} value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}><option value="">Select SKU</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div><div><Label>Lot / batch</Label><Input className={field} value={form.lotNumber} onChange={e => setForm({ ...form, lotNumber: e.target.value })} /></div><div><Label>Type</Label><select className={select + " w-full"} value={form.certificateType} onChange={e => setForm({ ...form, certificateType: e.target.value })}>{["coa", "cof", "coc", "other"].map(x => <option key={x}>{x}</option>)}</select></div><div><Label>Issue date *</Label><Input className={field} type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} /></div><div><Label>Expiry date</Label><Input className={field} type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div><div><Label>Issued by</Label><Input className={field} value={form.issuedBy} onChange={e => setForm({ ...form, issuedBy: e.target.value })} /></div><div><Label>Notes</Label><Input className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div><div className="mt-3 space-y-2">{form.lines.map((l, i) => <div key={i} className="grid gap-2 md:grid-cols-4"><select className={select} value={l.parameterId} onChange={e => setLine(i, "parameterId", e.target.value)}><option value="">Select parameter</option>{params.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select><Input className={field} placeholder="Measured value" value={l.measuredValue} onChange={e => setLine(i, "measuredValue", e.target.value)} /><select className={select} value={l.result} onChange={e => setLine(i, "result", e.target.value)}>{["pass", "fail"].map(x => <option key={x}>{x}</option>)}</select><Button variant="ghost" size="sm" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div><div className="mt-2 flex gap-2"><Button onClick={addLine} variant="outline" className="h-8 border-white/10 bg-transparent text-xs text-white/60"><Plus className="mr-1 h-3.5 w-3.5" />Add parameter</Button><Button onClick={save} disabled={create.isPending || !form.productId || !form.issueDate} className="h-8 bg-emerald-600 text-xs hover:bg-emerald-500"><Busy pending={create.isPending} /><Plus className="mr-1 h-3.5 w-3.5" />Create certificate</Button></div></div>
    <Table headers={["Certificate", "Product", "Lot", "Type", "Issued", "Status", "Actions"]}>{(certsRes?.data ?? []).map(c => <Row key={c.id}><td className="px-4 py-3 font-mono text-emerald-400">{c.certificate_number}</td><td className="px-4 py-3"><p className="text-white">{c.sku}</p><p className="text-xs text-white/35">{c.product_name}</p></td><td className="px-4 py-3 text-white/50">{c.lot_number || "—"}</td><td className="px-4 py-3 text-white/50 uppercase">{c.certificate_type}</td><td className="px-4 py-3 text-white/50">{c.issue_date}</td><td className="px-4 py-3"><Status value={c.status} /></td><td className="px-4 py-3"><div className="flex gap-1">{c.status === "draft" && <Button variant="ghost" size="sm" onClick={() => issue.mutate(c.id)} className="text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></Row>)}{!(certsRes?.data?.length) && <Empty cols={7} text="No certificates yet." />}</Table>
  </div>;
}