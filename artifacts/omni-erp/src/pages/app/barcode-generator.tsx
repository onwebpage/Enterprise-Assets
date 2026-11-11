import { useEffect, useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import { Barcode, Download, Printer, Package, AlertCircle } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvProducts } from "@/hooks/useInventory";

type Format = "CODE128" | "EAN13" | "EAN8" | "UPC";
const formats: Format[] = ["CODE128", "EAN13", "EAN8", "UPC"];
const symbology: Record<Format, string> = { CODE128: "CODE128", EAN13: "EAN13", EAN8: "EAN8", UPC: "UPC" };
type Item = { value: string; label: string };

function renderSvg(value: string, format: Format, width: number, height: number) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(node, value, { format: symbology[format], width, height, displayValue: true, font: "Arial", fontSize: 14, margin: 12, lineColor: "#111827", background: "#ffffff", valid: (valid) => { if (!valid) throw new Error(`“${value}” is not valid for ${format}.`); } });
  return new XMLSerializer().serializeToString(node);
}

export default function BarcodeGenerator() {
  const [format, setFormat] = useState<Format>("CODE128");
  const [value, setValue] = useState("ZV-10482");
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(90);
  const [bulkText, setBulkText] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const { data: productsRes, isLoading, isError } = useInvProducts({ limit: 100, page: 1 });
  const products = productsRes?.data ?? [];
  const preview = useMemo(() => {
    if (!value.trim()) return "";
    try { return renderSvg(value.trim(), format, width, height); } catch (e) { return ""; }
  }, [value, format, width, height]);
  useEffect(() => { if (value.trim() && !preview) { try { renderSvg(value.trim(), format, width, height); } catch (e) { setError(e instanceof Error ? e.message : "Invalid barcode value."); } } else setError(""); }, [preview, value, format, width, height]);

  const bulkItems: Item[] = useMemo(() => {
    const manual = bulkText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => ({ value: line.split(/\s*[|,\t]\s*/)[0], label: line }));
    const fromProducts = products.filter(product => selected.includes(product.id)).map(product => ({ value: product.sku, label: `${product.sku} — ${product.name}` }));
    return [...fromProducts, ...manual];
  }, [bulkText, products, selected]);
  const bulkValidity = bulkItems.map(item => { try { renderSvg(item.value, format, width, height); return { ...item, error: "" }; } catch (e) { return { ...item, error: e instanceof Error ? e.message : "Invalid" }; } });

  const download = (content: string, extension: "svg" | "png", name: string) => {
    const blob = extension === "svg" ? new Blob([content], { type: "image/svg+xml;charset=utf-8" }) : new Blob([content], { type: "image/png" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${name}.${extension}`; a.click(); URL.revokeObjectURL(url);
  };
  const downloadPng = async (svg: string, name: string) => {
    const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not render PNG.")); });
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; canvas.getContext("2d")?.drawImage(image, 0, 0); canvas.toBlob(blob => { if (blob) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${name}.png`; a.click(); URL.revokeObjectURL(url); } }, "image/png");
  };
  const print = (items: Item[]) => {
    try {
      const docs = items.map((item, i) => `<div class="label"><div>${item.label.replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[ch]!) )}</div>${renderSvg(item.value, format, width, height)}</div>`).join("");
      const popup = window.open("", "_blank", "width=800,height=600"); if (!popup) throw new Error("Allow pop-ups to print barcode labels.");
      popup.document.write(`<!doctype html><title>Barcode labels</title><style>body{font:12px Arial;display:flex;flex-wrap:wrap;gap:12px}.label{border:1px dashed #aaa;padding:12px;text-align:center;break-inside:avoid}svg{display:block;max-width:100%;margin:6px auto}@media print{.label{border:0}}</style>${docs}<script>window.onload=()=>window.print()<\/script>`); popup.document.close(); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to prepare print labels."); }
  };
  const field = "border-white/[0.1] bg-white/[0.04] text-white";
  return <AppLayout breadcrumbs={[{ label: "Inventory", path: "/app/inventory" }, { label: "Barcode Generator" }]}><div className="mx-auto max-w-[1180px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-blue-300"><Barcode className="h-4 w-4"/> Inventory tools</div><h1 className="text-2xl font-bold text-white sm:text-3xl">Barcode Generator</h1><p className="mt-2 text-sm text-white/45">Create and print scan ready product labels.</p></header>
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5"><h2 className="text-sm font-semibold text-white">Barcode setup</h2><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs text-white/60">Format<select className={`${field} h-10 w-full rounded-md border px-3`} value={format} onChange={e=>setFormat(e.target.value as Format)}>{formats.map(f=><option key={f}>{f}</option>)}</select></label><label className="space-y-2 text-xs text-white/60">Product code, SKU, or text<Input value={value} onChange={e=>setValue(e.target.value)} className={field} placeholder="Enter barcode value"/></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs text-white/60">Bar width<Input type="number" min="1" max="4" value={width} onChange={e=>setWidth(Math.max(1,Math.min(4,Number(e.target.value)||1)))} className={field}/></label><label className="space-y-2 text-xs text-white/60">Bar height (px)<Input type="number" min="40" max="240" value={height} onChange={e=>setHeight(Math.max(40,Math.min(240,Number(e.target.value)||40)))} className={field}/></label></div>
    <div className="border-t border-white/[0.08] pt-5"><h2 className="text-sm font-semibold text-white">Inventory products</h2><p className="mt-1 text-xs text-white/40">Select products to include them in the bulk batch.</p><div className="mt-3 max-h-44 space-y-2 overflow-auto rounded-lg border border-white/[0.06] p-3">{isLoading?<p className="text-xs text-white/40">Loading products…</p>:isError?<p className="text-xs text-rose-300">Products could not be loaded. You can still enter values below.</p>:products.map(p=><label key={p.id} className="flex items-center gap-2 text-xs text-white/65"><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,p.id]:s.filter(id=>id!==p.id))} className="accent-blue-500"/><Package className="h-3.5 w-3.5 text-white/35"/>{p.sku} — {p.name}</label>)}</div><label className="mt-4 block space-y-2 text-xs text-white/60">Bulk values <span className="text-white/30">(one per line; SKU, code, or custom text)</span><textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={4} placeholder={'SKU-001\nSKU-002\nCustom code'} className={`${field} w-full resize-y rounded-md border px-3 py-2 text-sm`}/></label><div className="mt-3 flex flex-wrap items-center gap-2"><Button onClick={()=>print(bulkValidity.filter(x=>!x.error))} disabled={!bulkValidity.length||bulkValidity.every(x=>x.error)} variant="outline" className="border-white/10 bg-transparent text-white"><Printer className="mr-2 h-4 w-4"/>Print valid ({bulkValidity.filter(x=>!x.error).length})</Button><span className="text-xs text-white/35">{bulkValidity.filter(x=>x.error).length?`${bulkValidity.filter(x=>x.error).length} invalid item(s) will be skipped`:"Bulk labels use current format and dimensions."}</span></div></div>
    </section><section className="rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5"><div><h2 className="text-sm font-semibold text-white">Live preview</h2><p className="mt-1 text-xs text-white/40">Updates as you change the value or format.</p></div><div className="mt-5 flex min-h-[260px] items-center justify-center overflow-auto rounded-xl bg-white p-4" aria-label="Barcode preview">{preview?<div dangerouslySetInnerHTML={{__html:preview}}/>:<p className="text-sm text-slate-500">Enter a valid value to preview.</p>}</div>{error&&<div role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}<div className="mt-4 grid grid-cols-2 gap-2"><Button disabled={!preview} onClick={()=>void downloadPng(preview,"barcode").catch(e=>setError(e.message))} className="bg-[#2563EB]"><Download className="mr-2 h-4 w-4"/>Download PNG</Button><Button disabled={!preview} onClick={()=>download(preview,"svg","barcode")} variant="outline" className="border-white/10 bg-transparent text-white"><Download className="mr-2 h-4 w-4"/>Download SVG</Button></div><Button disabled={!preview} onClick={()=>print([{value:value.trim(),label:value.trim()}])} variant="ghost" className="mt-2 w-full text-white/60"><Printer className="mr-2 h-4 w-4"/>Print barcode label</Button></section></div>
    {bulkValidity.length>0&&<section className="rounded-xl border border-white/[0.08] bg-[#0a0f1e] p-5"><h2 className="text-sm font-semibold text-white">Bulk batch · {bulkValidity.length} barcodes</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{bulkValidity.map((item,i)=><div key={`${item.value}-${i}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="truncate text-xs text-white/60">{item.label}</p>{item.error?<p className="mt-2 text-xs text-rose-300">{item.error}</p>:<div className="mt-2 overflow-auto rounded bg-white p-2" dangerouslySetInnerHTML={{__html:renderSvg(item.value,format,width,height)}}/>}</div>)}</div></section>}
  </div></AppLayout>;
}
