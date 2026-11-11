import { useMemo, useState } from "react";
import { Calculator, Check, Copy, Download, RotateCcw } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "exclusive" | "inclusive" | "reverse";
type Supply = "intra" | "inter";
const rates = [0, 5, 12, 18, 28];
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calculate(amount: number, rate: number, mode: Mode, supply: Supply) {
  const taxable = mode === "exclusive" ? amount : amount / (1 + rate / 100);
  const tax = taxable * rate / 100;
  return { taxable, tax, total: taxable + tax, cgst: supply === "intra" ? tax / 2 : 0, sgst: supply === "intra" ? tax / 2 : 0, igst: supply === "inter" ? tax : 0 };
}

export default function GSTCalculator() {
  const [amountText, setAmountText] = useState("10000");
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<Mode>("exclusive");
  const [supply, setSupply] = useState<Supply>("intra");
  const [copied, setCopied] = useState(false);
  const amount = amountText.trim() === "" ? NaN : Number(amountText);
  const valid = Number.isFinite(amount) && amount >= 0 && amount <= 999999999999;
  const result = useMemo(() => valid ? calculate(amount, rate, mode, supply) : null, [valid, amount, rate, mode, supply]);
  const summary = result ? ["ZorvanI ERP · GST Calculation", `Mode: ${mode === "exclusive" ? "GST exclusive" : mode === "inclusive" ? "GST inclusive" : "Reverse GST"}`, `Supply: ${supply === "intra" ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"}`, `GST rate: ${rate}%`, `Taxable amount: ${inr.format(result.taxable)}`, `CGST: ${inr.format(result.cgst)}`, `SGST: ${inr.format(result.sgst)}`, `IGST: ${inr.format(result.igst)}`, `Total GST: ${inr.format(result.tax)}`, `Final total: ${inr.format(result.total)}`].join("\n") : "";
  const reset = () => { setAmountText("0"); setRate(18); setMode("exclusive"); setSupply("intra"); };
  const copy = async () => { try { await navigator.clipboard.writeText(summary); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* Clipboard access can be restricted by the browser. */ } };
  const download = () => { const blob = new Blob([summary], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "zorvani-gst-calculation.txt"; a.click(); URL.revokeObjectURL(url); };
  const field = "border-white/[0.1] bg-white/[0.04] text-white";
  const modes: { id: Mode; title: string; hint: string }[] = [{ id: "exclusive", title: "Add GST", hint: "Amount before tax" }, { id: "inclusive", title: "GST included", hint: "Amount includes tax" }, { id: "reverse", title: "Reverse GST", hint: "Find base amount from total" }];
  return <AppLayout breadcrumbs={[{ label: "Finance", path: "/app/finance" }, { label: "GST Calculator" }]}><div className="mx-auto max-w-[1080px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-blue-300"><Calculator className="h-4 w-4"/> Finance tools</div><h1 className="text-2xl font-bold text-white sm:text-3xl">GST Calculator</h1><p className="mt-2 text-sm text-white/45">Quickly calculate GST and split tax for intra-state or inter-state supplies.</p></header>
    <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_.95fr]"><section className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6">
      <div><h2 className="text-sm font-semibold text-white">Calculation type</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{modes.map(item=><button key={item.id} type="button" onClick={()=>setMode(item.id)} className={`rounded-xl border p-3 text-left transition ${mode===item.id?"border-blue-400/35 bg-blue-500/15":"border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}`}><span className={`block text-xs font-semibold ${mode===item.id?"text-blue-200":"text-white/75"}`}>{item.title}</span><span className="mt-1 block text-[10px] text-white/35">{item.hint}</span></button>)}</div></div>
      <label className="block space-y-2 text-xs font-medium text-white/60">{mode === "exclusive" ? "Amount before GST" : "Amount including GST"}<div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">₹</span><Input inputMode="decimal" value={amountText} onChange={e=>setAmountText(e.target.value)} placeholder="0.00" className={`${field} pl-8`} aria-invalid={!valid}/></div>{!valid&&<span role="alert" className="text-rose-300">Enter an amount from ₹0 to ₹999,999,999,999.</span>}</label>
      <div><h2 className="text-sm font-semibold text-white">GST rate</h2><div className="mt-3 grid grid-cols-5 gap-2">{rates.map(item=><button type="button" key={item} onClick={()=>setRate(item)} className={`rounded-lg border py-2.5 text-sm font-semibold transition ${rate===item?"border-blue-400/35 bg-blue-500/15 text-blue-200":"border-white/[0.08] text-white/50 hover:bg-white/[0.04]"}`}>{item}%</button>)}</div></div>
      <div><h2 className="text-sm font-semibold text-white">Place of supply</h2><p className="mt-1 text-xs text-white/35">Choose how tax should be split.</p><div className="mt-3 grid grid-cols-2 gap-2">{([{id:"intra",name:"Intra-state",desc:"CGST + SGST"},{id:"inter",name:"Inter-state",desc:"IGST"}] as const).map(item=><button type="button" key={item.id} onClick={()=>setSupply(item.id)} className={`rounded-xl border p-3 text-left ${supply===item.id?"border-blue-400/35 bg-blue-500/10":"border-white/[0.08] bg-white/[0.02]"}`}><span className="block text-xs font-medium text-white/80">{item.name}</span><span className="mt-1 block text-[10px] text-white/35">{item.desc}</span></button>)}</div></div>
      <Button variant="ghost" onClick={reset} className="text-white/45 hover:text-white"><RotateCcw className="mr-2 h-3.5 w-3.5"/>Reset calculator</Button>
    </section><section className="rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6"><div><h2 className="text-sm font-semibold text-white">Calculation summary</h2><p className="mt-1 text-xs text-white/40">Amounts shown in Indian Rupees (INR).</p></div><div className="mt-5 space-y-3">{[{label:"Taxable amount",value:result?inr.format(result.taxable):"—"},{label:supply==="intra"?"CGST":"IGST",value:result?inr.format(supply==="intra"?result.cgst:result.igst):"—"},...(supply==="intra"?[{label:"SGST",value:result?inr.format(result.sgst):"—"}]:[]),{label:"Total GST",value:result?inr.format(result.tax):"—"}].map(row=><div key={row.label} className="flex items-center justify-between border-b border-white/[0.06] pb-3"><span className="text-sm text-white/50">{row.label}</span><span className="font-mono text-sm text-white/80">{row.value}</span></div>)}</div><div className="mt-4 rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-4"><span className="text-xs text-blue-200/65">Final total</span><p className="mt-1 font-mono text-2xl font-semibold text-white">{result?inr.format(result.total):"—"}</p></div><div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={()=>void copy()} disabled={!result} className="bg-[#2563EB]">{copied?<Check className="mr-2 h-4 w-4"/>:<Copy className="mr-2 h-4 w-4"/>}{copied?"Copied":"Copy summary"}</Button><Button onClick={download} disabled={!result} variant="outline" className="border-white/10 bg-transparent text-white"><Download className="mr-2 h-4 w-4"/>Download</Button></div><p className="mt-4 text-[10px] leading-4 text-white/25">Calculations use the entered amount and selected rate. Verify applicable tax treatment for your transaction.</p></section></div>
  </div></AppLayout>;
}
