import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Check, Copy, Download, RefreshCw, WifiOff, Globe2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const currencies = [
  ["INR", "Indian Rupee"], ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"], ["AED", "UAE Dirham"],
  ["JPY", "Japanese Yen"], ["CAD", "Canadian Dollar"], ["AUD", "Australian Dollar"], ["CHF", "Swiss Franc"], ["CNY", "Chinese Yuan"],
  ["SGD", "Singapore Dollar"], ["NZD", "New Zealand Dollar"], ["HKD", "Hong Kong Dollar"], ["SAR", "Saudi Riyal"], ["ZAR", "South African Rand"],
  ["THB", "Thai Baht"], ["MYR", "Malaysian Ringgit"], ["IDR", "Indonesian Rupiah"], ["KRW", "South Korean Won"], ["BRL", "Brazilian Real"],
] as const;
type Currency = typeof currencies[number][0];
type RateResponse = { result: string; base_code: string; time_last_update_utc: string; time_next_update_utc: string; rates: Record<string, number>; "error-type"?: string };
const fmt = (code: string, value: number) => new Intl.NumberFormat("en", { style: "currency", currency: code, maximumFractionDigits: 4 }).format(value);

export default function CurrencyConverter() {
  const [from, setFrom] = useState<Currency>("INR"); const [to, setTo] = useState<Currency>("USD"); const [amountText, setAmountText] = useState("1000");
  const [rates, setRates] = useState<Record<string, number> | null>(null); const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(false); const [apiError, setApiError] = useState(""); const [offline, setOffline] = useState(!navigator.onLine);
  const [manualEnabled, setManualEnabled] = useState(false); const [manualText, setManualText] = useState(""); const [copied, setCopied] = useState(false);
  const amount = amountText.trim() === "" ? NaN : Number(amountText);
  const validAmount = Number.isFinite(amount) && amount >= 0 && amount <= 1e15;

  const loadRates = useCallback(async (base: Currency, signal?: AbortSignal) => {
    setLoading(true); setApiError(""); setRates(null); setUpdatedAt("");
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, { signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
      const data = await response.json() as RateResponse;
      if (data.result !== "success" || data.base_code !== base || !data.rates || !data.time_last_update_utc) throw new Error(data["error-type"] ? `Exchange-rate service: ${data["error-type"]}.` : "Exchange-rate service returned an invalid response.");
      setRates(data.rates); setUpdatedAt(data.time_last_update_utc);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setApiError(error instanceof Error ? error.message : "Could not load exchange rates.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const controller = new AbortController(); void loadRates(from, controller.signal); return () => controller.abort(); }, [from, loadRates]);
  useEffect(() => { const onChange=()=>setOffline(!navigator.onLine); window.addEventListener("online",onChange); window.addEventListener("offline",onChange); return()=>{window.removeEventListener("online",onChange);window.removeEventListener("offline",onChange);}; }, []);
  const liveRate = rates && from === to ? 1 : rates?.[to];
  const manualRate = manualEnabled && Number.isFinite(Number(manualText)) && Number(manualText) > 0 ? Number(manualText) : null;
  const rate = liveRate ?? manualRate;
  const converted = validAmount && rate != null ? amount * rate : null;
  const usedManualRate = liveRate == null && manualRate != null;
  const timestamp = updatedAt ? new Date(updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "";
  const summary = converted == null || rate == null ? "" : ["ZorvanI ERP · Currency Conversion", `${fmt(from, amount)} ${from} = ${fmt(to, converted)} ${to}`, `Exchange rate: 1 ${from} = ${rate} ${to}`, usedManualRate ? "Rate source: manually entered" : `Rate source: ExchangeRate-API · updated ${timestamp}`, usedManualRate ? "" : "Reference rates only; provider fees and spreads may apply."].filter(Boolean).join("\n");
  const swap = () => { setFrom(to); setTo(from); setManualText(""); };
  const copy = async () => { try { await navigator.clipboard.writeText(summary); setCopied(true); window.setTimeout(()=>setCopied(false),1800); } catch { setApiError("Clipboard access was denied by the browser."); } };
  const download = () => { const url=URL.createObjectURL(new Blob([summary],{type:"text/plain;charset=utf-8"})); const a=document.createElement("a"); a.href=url; a.download=`${from}-${to}-conversion.txt`; a.click(); URL.revokeObjectURL(url); };
  const field="border-white/[0.1] bg-white/[0.04] text-white";
  return <AppLayout breadcrumbs={[{label:"Finance",path:"/app/finance"},{label:"Currency Converter"}]}><div className="mx-auto max-w-[1050px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-blue-300"><Globe2 className="h-4 w-4"/> Finance tools</div><h1 className="text-2xl font-bold text-white sm:text-3xl">Currency Converter</h1><p className="mt-2 text-sm text-white/45">Convert using dated reference exchange rates or enter your own rate.</p></header>
    <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_.95fr]"><section className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6"><div><h2 className="text-sm font-semibold text-white">Conversion</h2><p className="mt-1 text-xs text-white/40">Choose the source and target currencies.</p></div>
      <label className="block space-y-2 text-xs font-medium text-white/60">Amount<Input inputMode="decimal" value={amountText} onChange={e=>setAmountText(e.target.value)} className={field} placeholder="Enter amount" aria-invalid={!validAmount}/>{!validAmount&&<span role="alert" className="text-rose-300">Enter an amount from 0 to 1,000,000,000,000,000.</span>}</label>
      <div className="grid grid-cols-[1fr_44px_1fr] items-end gap-2"><label className="space-y-2 text-xs font-medium text-white/60">From<select value={from} onChange={e=>{setFrom(e.target.value as Currency);setManualText("")}} className={`${field} h-10 w-full rounded-md border px-2`}>{currencies.map(([code,name])=><option key={code} value={code}>{code} · {name}</option>)}</select></label><Button type="button" aria-label="Swap currencies" onClick={swap} variant="outline" className="h-10 w-10 border-white/10 bg-white/[0.03] p-0 text-white/70"><ArrowDownUp className="h-4 w-4"/></Button><label className="space-y-2 text-xs font-medium text-white/60">To<select value={to} onChange={e=>setTo(e.target.value as Currency)} className={`${field} h-10 w-full rounded-md border px-2`}>{currencies.map(([code,name])=><option key={code} value={code}>{code} · {name}</option>)}</select></label></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-xs text-white/50">{loading?<><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Fetching dated exchange rates…</>:offline?<><WifiOff className="h-3.5 w-3.5 text-amber-300"/>Offline</>:apiError?<><WifiOff className="h-3.5 w-3.5 text-rose-300"/>Live rates unavailable</>:timestamp?<>Rates updated {timestamp}</>:"No live rate loaded"}</div><Button size="sm" variant="ghost" onClick={()=>void loadRates(from)} disabled={loading||offline} className="h-8 text-xs text-blue-300"><RefreshCw className="mr-1.5 h-3 w-3"/>Refresh</Button></div>
      {(apiError||offline||liveRate==null)&&<div className="space-y-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3"><p className="text-xs leading-5 text-amber-100/75">{offline?"You are offline. Live exchange rates cannot be fetched.":apiError?apiError:rates?`The live rate table does not include ${to}.`:"Waiting for an exchange rate."} Live results will not be shown without a returned rate.</p><label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={manualEnabled} onChange={e=>setManualEnabled(e.target.checked)} className="accent-blue-500"/>Enter a manual rate</label>{manualEnabled&&<label className="block space-y-2 text-xs text-white/60">1 {from} equals<Input type="number" min="0" step="any" value={manualText} onChange={e=>setManualText(e.target.value)} className={field} placeholder={`Amount in ${to}`}/></label>}</div>}
    </section><section className="rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6"><div><h2 className="text-sm font-semibold text-white">Converted amount</h2><p className="mt-1 text-xs text-white/40">{usedManualRate?"Using your manual rate":"Reference exchange rate"}</p></div><div className="mt-5 rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-5"><p className="text-xs text-blue-200/65">{from} → {to}</p><p className="mt-2 break-all font-mono text-3xl font-semibold text-white">{converted==null?"—":fmt(to,converted)}</p><p className="mt-2 text-sm text-white/45">{converted==null?"A valid rate and amount are required":`${fmt(from,amount)} ${from}`}</p></div><div className="mt-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3"><span className="text-sm text-white/45">Exchange rate</span><span className="text-right font-mono text-xs text-white/75">{rate==null?"—":`1 ${from} = ${new Intl.NumberFormat("en",{maximumSignificantDigits:8}).format(rate)} ${to}`}</span></div><div className="mt-3 flex items-start justify-between gap-3"><span className="text-sm text-white/45">Last updated</span><span className="text-right text-xs text-white/65">{usedManualRate?"Manual rate":timestamp||"Unavailable"}</span></div><div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={()=>void copy()} disabled={converted==null} className="bg-[#2563EB]">{copied?<Check className="mr-2 h-4 w-4"/>:<Copy className="mr-2 h-4 w-4"/>}{copied?"Copied":"Copy result"}</Button><Button onClick={download} disabled={converted==null} variant="outline" className="border-white/10 bg-transparent text-white"><Download className="mr-2 h-4 w-4"/>Download</Button></div><p className="mt-4 text-[10px] leading-4 text-white/30">Rates provided by <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="text-white/50 underline">ExchangeRate-API</a> (open.er-api.com). Rates update periodically; this is a reference conversion and may differ from provider fees or transaction rates.</p></section></div>
  </div></AppLayout>;
}
