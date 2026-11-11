import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, Check, Copy, Download, ImagePlus, Link2, Mail, Phone, QrCode, RotateCcw, Wifi } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ContentType = "url" | "text" | "email" | "phone" | "wifi";
type QrOptions = { width: number; margin: number; color: { dark: string; light: string }; errorCorrectionLevel: "H" };

const typeOptions: { id: ContentType; label: string; icon: typeof Link2 }[] = [
  { id: "url", label: "URL", icon: Link2 }, { id: "text", label: "Text", icon: QrCode },
  { id: "email", label: "Email", icon: Mail }, { id: "phone", label: "Phone", icon: Phone }, { id: "wifi", label: "Wi-Fi", icon: Wifi },
];

function escapeWifi(value: string) { return value.replace(/[\\;,:\"]/g, (match) => `\\${match}`); }

export default function QrCodeGenerator() {
  const [kind, setKind] = useState<ContentType>("url");
  const [fields, setFields] = useState({ url: "https://zorvani.com", text: "", email: "", subject: "", phone: "", ssid: "", password: "", security: "WPA", hidden: false });
  const [foreground, setForeground] = useState("#111827");
  const [background, setBackground] = useState("#ffffff");
  const [size, setSize] = useState(320);
  const [logo, setLogo] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => {
    if (kind === "url") {
      const value = fields.url.trim();
      if (!value) return "";
      try { const parsed = new URL(value.includes("://") ? value : `https://${value}`); if (!["http:", "https:"].includes(parsed.protocol)) return ""; return parsed.href; } catch { return ""; }
    }
    if (kind === "text") return fields.text.trim();
    if (kind === "email") { const email = fields.email.trim(); if (!email) return ""; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "!invalid-email"; return `mailto:${email}${fields.subject.trim() ? `?subject=${encodeURIComponent(fields.subject.trim())}` : ""}`; }
    if (kind === "phone") { const phone = fields.phone.trim(); if (!phone) return ""; return /^[+\d\s().-]{7,25}$/.test(phone) ? `tel:${phone.replace(/[\s().-]/g, "")}` : "!invalid-phone"; }
    if (!fields.ssid.trim()) return "";
    if (fields.security !== "nopass" && !fields.password) return "!wifi-password";
    return `WIFI:T:${fields.security};S:${escapeWifi(fields.ssid)};P:${escapeWifi(fields.password)};H:${fields.hidden ? "true" : "false"};;`;
  }, [kind, fields]);

  const options = useMemo<QrOptions>(() => ({ width: size, margin: 2, color: { dark: foreground, light: background }, errorCorrectionLevel: "H" }), [size, foreground, background]);

  useEffect(() => {
    let active = true;
    if (!payload) { setPreview(""); setError(""); return; }
    if (payload.startsWith("!")) { setPreview(""); setError(payload === "!invalid-email" ? "Enter a valid email address." : payload === "!invalid-phone" ? "Enter a valid phone number, including its country code if needed." : "Enter a Wi-Fi password or choose an open network."); return; }
    setError("");
    void (async () => {
      try {
        const url = await QRCode.toDataURL(payload, options);
        if (!active) return;
        if (!logo) { setPreview(url); return; }
        const image = new Image(); image.src = url;
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not render QR code.")); });
        if (!active) return;
        const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
        const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas is unavailable.");
        context.drawImage(image, 0, 0, size, size);
        const mark = new Image(); mark.src = logo;
        await new Promise<void>((resolve, reject) => { mark.onload = () => resolve(); mark.onerror = () => reject(new Error("Could not load logo.")); });
        const box = Math.round(size * 0.22); const inset = Math.round(size * 0.04); const x = (size - box) / 2;
        context.fillStyle = background; context.fillRect(x - inset, x - inset, box + inset * 2, box + inset * 2);
        context.drawImage(mark, x, x, box, box);
        if (active) setPreview(canvas.toDataURL("image/png"));
      } catch (cause) { if (active) { setPreview(""); setError(cause instanceof Error ? cause.message : "Could not generate this QR code."); } }
    })();
    return () => { active = false; };
  }, [payload, options, logo, size, background]);

  const getSvg = async () => {
    if (!payload || payload.startsWith("!")) throw new Error("Add valid content before downloading.");
    let svg = await QRCode.toString(payload, { ...options, type: "svg" });
    if (logo) {
      const image = new Image(); image.src = logo;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not load logo.")); });
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0); const data = canvas.toDataURL("image/png");
      const box = Math.round(size * 0.22); const inset = Math.round(size * 0.04); const center = size / 2;
      svg = svg.replace("</svg>", `<rect x="${center-box/2-inset}" y="${center-box/2-inset}" width="${box+inset*2}" height="${box+inset*2}" fill="${background}"/><image href="${data}" x="${center-box/2}" y="${center-box/2}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/></svg>`);
    }
    return svg;
  };

  const download = async (format: "png" | "svg") => {
    try {
      const content = format === "png" ? preview : await getSvg();
      if (!content) throw new Error("Add valid content before downloading.");
      const blob = format === "png" ? await (await fetch(content)).blob() : new Blob([content], { type: "image/svg+xml;charset=utf-8" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `zorvani-qr-code.${format}`; link.click(); URL.revokeObjectURL(link.href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Download failed. Please try again."); }
  };

  const copy = async () => {
    try {
      if (!preview) throw new Error("Add valid content before copying.");
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const blob = await (await fetch(preview)).blob(); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else { throw new Error("Image clipboard access is not supported in this browser."); }
      setCopied(true); window.setTimeout(() => setCopied(false), 1800);
    } catch { setError("Could not copy to clipboard. Check browser clipboard permissions and try again."); }
  };

  const fieldClass = "border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:ring-[#3B82F6]";
  const setField = (name: keyof typeof fields, value: string | boolean) => setFields(current => ({ ...current, [name]: value }));

  return <AppLayout breadcrumbs={[{ label: "Tools" }, { label: "QR Code Generator" }]}>
    <div className="mx-auto max-w-[1180px] space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-300"><QrCode className="h-4 w-4"/> Workspace utility</div><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">QR Code Generator</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Create branded, scannable QR codes for the information your customers and team need.</p></div><div className="rounded-xl border border-blue-400/15 bg-blue-400/[0.06] px-3 py-2 text-xs text-blue-200/70">Private · generated in your browser</div></header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <section className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6">
          <div><h2 className="text-sm font-semibold text-white">Content</h2><p className="mt-1 text-xs text-white/40">Choose what your QR code should open.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{typeOptions.map(item => { const Icon=item.icon; return <button key={item.id} type="button" onClick={() => setKind(item.id)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${kind===item.id?"border-blue-400/35 bg-blue-500/15 text-blue-200":"border-white/[0.08] bg-white/[0.025] text-white/45 hover:bg-white/[0.06]"}`}><Icon className="h-3.5 w-3.5"/>{item.label}</button>; })}</div></div>
          <div className="space-y-3">
            {kind==="url"&&<label className="block space-y-2 text-xs font-medium text-white/65">Website URL<Input value={fields.url} onChange={e=>setField("url",e.target.value)} placeholder="https://example.com" className={fieldClass}/></label>}
            {kind==="text"&&<label className="block space-y-2 text-xs font-medium text-white/65">Text or message<textarea value={fields.text} onChange={e=>setField("text",e.target.value)} rows={4} maxLength={2000} placeholder="Type your message..." className={`${fieldClass} w-full resize-y rounded-md border px-3 py-2 text-sm outline-none`}/><span className="block text-right text-[10px] text-white/30">{fields.text.length}/2,000</span></label>}
            {kind==="email"&&<><label className="block space-y-2 text-xs font-medium text-white/65">Email address<Input type="email" value={fields.email} onChange={e=>setField("email",e.target.value)} placeholder="hello@example.com" className={fieldClass}/></label><label className="block space-y-2 text-xs font-medium text-white/65">Subject <span className="font-normal text-white/30">(optional)</span><Input value={fields.subject} onChange={e=>setField("subject",e.target.value)} placeholder="How can we help?" className={fieldClass}/></label></>}
            {kind==="phone"&&<label className="block space-y-2 text-xs font-medium text-white/65">Phone number<Input type="tel" value={fields.phone} onChange={e=>setField("phone",e.target.value)} placeholder="+1 555 123 4567" className={fieldClass}/></label>}
            {kind==="wifi"&&<><label className="block space-y-2 text-xs font-medium text-white/65">Network name (SSID)<Input value={fields.ssid} onChange={e=>setField("ssid",e.target.value)} placeholder="Your Wi-Fi network" className={fieldClass}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-2 text-xs font-medium text-white/65">Security<select value={fields.security} onChange={e=>setField("security",e.target.value)} className={`${fieldClass} h-10 w-full rounded-md border px-3`}><option value="WPA">WPA / WPA2</option><option value="WEP">WEP</option><option value="nopass">Open network</option></select></label>{fields.security!=="nopass"&&<label className="block space-y-2 text-xs font-medium text-white/65">Password<Input type="password" value={fields.password} onChange={e=>setField("password",e.target.value)} placeholder="Wi-Fi password" className={fieldClass}/></label>}</div><label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={fields.hidden} onChange={e=>setField("hidden",e.target.checked)} className="accent-blue-500"/>Hidden network</label></>}
          </div>
          <div className="border-t border-white/[0.07] pt-5"><div className="mb-3"><h2 className="text-sm font-semibold text-white">Appearance</h2><p className="mt-1 text-xs text-white/40">Adjust colors, dimensions, and branding.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs font-medium text-white/60">Foreground<div className="flex h-10 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-2"><input aria-label="Foreground color" type="color" value={foreground} onChange={e=>setForeground(e.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"/><Input aria-label="Foreground hex" value={foreground} onChange={e=>setForeground(e.target.value)} className="h-8 border-0 bg-transparent px-1 font-mono text-xs uppercase text-white"/></div></label><label className="space-y-2 text-xs font-medium text-white/60">Background<div className="flex h-10 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-2"><input aria-label="Background color" type="color" value={background} onChange={e=>setBackground(e.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"/><Input aria-label="Background hex" value={background} onChange={e=>setBackground(e.target.value)} className="h-8 border-0 bg-transparent px-1 font-mono text-xs uppercase text-white"/></div></label></div><label className="mt-4 block space-y-2 text-xs font-medium text-white/60">Size <span className="float-right font-mono text-white/40">{size} × {size} px</span><input type="range" min="180" max="640" step="20" value={size} onChange={e=>setSize(Number(e.target.value))} className="h-1.5 w-full cursor-pointer accent-blue-500"/><div className="flex justify-between text-[10px] text-white/30"><span>180 px</span><span>640 px</span></div></label><div className="mt-4"><p className="mb-2 text-xs font-medium text-white/60">Add a logo <span className="font-normal text-white/30">(optional · PNG, JPEG, or WebP)</span></p>{logo?<div className="flex items-center gap-3"><img src={logo} alt="Logo preview" className="h-10 w-10 rounded-lg border border-white/10 bg-white object-contain p-1"/><Button type="button" variant="ghost" onClick={()=>setLogo(null)} className="h-8 text-xs text-white/50"><RotateCcw className="mr-1.5 h-3.5 w-3.5"/>Remove logo</Button></div>:<label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-xs text-white/55 hover:bg-white/[0.04]"><ImagePlus className="h-4 w-4"/>Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file){if(file.size>2*1024*1024){setError("Logo must be smaller than 2 MB.");return;}const reader=new FileReader();reader.onload=()=>setLogo(String(reader.result));reader.readAsDataURL(file);}}}/></label>}</div></div>
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6 lg:sticky lg:top-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Live preview</h2><p className="mt-1 text-xs text-white/40">Updates as you edit.</p></div><span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-medium text-emerald-300">LIVE</span></div><div className="mt-5 flex min-h-[320px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#080c17] p-4 sm:min-h-[360px]"><div className="flex w-full max-w-[320px] flex-col items-center">{preview?<img src={preview} alt="Generated QR code preview" className="h-auto w-full rounded-sm shadow-[0_12px_48px_rgba(0,0,0,0.24)]"/>:<div className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center"><div className="mb-3 rounded-xl bg-white/[0.04] p-3 text-white/25"><QrCode className="h-8 w-8"/></div><p className="text-sm text-white/45">Your QR code will appear here</p><p className="mt-1 text-xs text-white/25">Enter content to get started</p></div>}{preview&&<p className="mt-3 text-[10px] text-white/30">Scan to preview your content</p>}</div></div>{error&&<div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}<div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={()=>void download("png")} disabled={!preview} className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"><Download className="mr-2 h-4 w-4"/>Download PNG</Button><Button onClick={()=>void download("svg")} disabled={!preview} variant="outline" className="border-white/[0.1] bg-transparent text-white/75 hover:bg-white/[0.05]"><Download className="mr-2 h-4 w-4"/>Download SVG</Button></div><Button onClick={()=>void copy()} disabled={!preview} variant="ghost" className="mt-2 w-full text-white/55 hover:bg-white/[0.04] hover:text-white">{copied?<Check className="mr-2 h-4 w-4 text-emerald-400"/>:<Copy className="mr-2 h-4 w-4"/>}{copied?"Copied QR code":"Copy generated QR code"}</Button><p className="mt-3 text-center text-[10px] leading-4 text-white/25">High error correction helps keep branded codes scannable. Use a strong contrast between foreground and background.</p></section>
      </div>
    </div>
  </AppLayout>;
}
