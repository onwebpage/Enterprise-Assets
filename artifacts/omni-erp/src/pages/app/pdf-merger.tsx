import { DragEvent, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Download, FileText, Files, GripVertical, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";

type PdfEntry = { id: string; file: File; pages: number };
const MAX_FILES = 20;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

export default function PDFMerger() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PdfEntry[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState<{ url: string; name: string; bytes: number } | null>(null);
  const [status, setStatus] = useState("");
  const totalBytes = files.reduce((sum, entry) => sum + entry.file.size, 0);
  const totalPages = files.reduce((sum, entry) => sum + entry.pages, 0);

  const addFiles = async (incoming: FileList | File[]) => {
    setError(""); setMerged(current => { if (current) URL.revokeObjectURL(current.url); return null; }); setStatus("");
    const list = Array.from(incoming);
    if (!list.length) return;
    if (files.length + list.length > MAX_FILES) { setError(`You can merge up to ${MAX_FILES} PDF files at a time.`); return; }
    if (totalBytes + list.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) { setError("Combined file size cannot exceed 200 MB."); return; }
    const parsed: PdfEntry[] = [];
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) { setError(`${file.name} exceeds the 50 MB per-file limit.`); continue; }
      if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) { setError(`${file.name} is not a PDF file.`); continue; }
      try {
        const bytes = await file.arrayBuffer();
        if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("This file does not contain a valid PDF header.");
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
        if (!pdf.getPageCount()) throw new Error("This PDF has no pages.");
        parsed.push({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, pages: pdf.getPageCount() });
      } catch (cause) { setError(`${file.name}: ${cause instanceof Error ? cause.message : "Could not read this PDF."}`); }
    }
    if (parsed.length) { setFiles(current => [...current, ...parsed]); setStatus(`${parsed.length} PDF${parsed.length===1?"":"s"} added and validated.`); }
  };

  const remove = (id: string) => { setFiles(current => current.filter(entry => entry.id !== id)); setMerged(current => { if (current) URL.revokeObjectURL(current.url); return null; }); setError(""); };
  const move = (from: number, to: number) => { if (to < 0 || to >= files.length) return; setFiles(current => { const next=[...current]; const [item]=next.splice(from,1); next.splice(to,0,item); return next; }); setMerged(current => { if(current)URL.revokeObjectURL(current.url);return null; }); };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragOver(false); const target=(event.target as HTMLElement).closest("[data-pdf-id]")?.getAttribute("data-pdf-id"); if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files); else if (draggedId&&target&&target!==draggedId) { const from=files.findIndex(f=>f.id===draggedId),to=files.findIndex(f=>f.id===target); if(from>=0&&to>=0)move(from,to); } setDraggedId(null); };

  const merge = async () => {
    if (files.length < 2) { setError("Add at least two PDF files to merge."); return; }
    setError(""); setMerging(true); setProgress(0); setStatus("Preparing merged PDF…");
    try {
      const output = await PDFDocument.create();
      for (let i=0;i<files.length;i++) {
        const source=await PDFDocument.load(await files[i].file.arrayBuffer(),{ignoreEncryption:false,updateMetadata:false});
        const pages=await output.copyPages(source,source.getPageIndices()); pages.forEach(page=>output.addPage(page));
        setProgress(Math.round(((i+1)/files.length)*90)); setStatus(`Adding ${files[i].file.name}…`);
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      }
      output.setTitle("Merged PDF"); output.setCreator("ZorvanI ERP PDF Merger");
      const bytes=await output.save({useObjectStreams:true}); const blob=new Blob([bytes as BlobPart],{type:"application/pdf"}); const url=URL.createObjectURL(blob);
      const name=`merged-${new Date().toISOString().slice(0,10)}.pdf`;
      setMerged({url,name,bytes:blob.size}); setProgress(100); setStatus(`Merged ${files.length} PDFs into ${totalPages} pages.`);
    } catch (cause) { setError(cause instanceof Error?cause.message:"PDF merge failed. Check that every file is a readable, unencrypted PDF."); setStatus(""); }
    finally { setMerging(false); }
  };
  const download = () => { if(!merged)return; const link=document.createElement("a");link.href=merged.url;link.download=merged.name;link.click(); };
  const formatSize = (bytes:number) => bytes<1024*1024?`${(bytes/1024).toFixed(0)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
  const clear = () => { setFiles([]);setError("");setStatus("");setProgress(0);setMerged(current=>{if(current)URL.revokeObjectURL(current.url);return null;});if(inputRef.current)inputRef.current.value=""; };
  return <AppLayout breadcrumbs={[{label:"Documents",path:"/app/documents"},{label:"PDF Merger"}]}><div className="mx-auto max-w-[1050px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-blue-300"><Files className="h-4 w-4"/> Documents tools</div><h1 className="text-2xl font-bold text-white sm:text-3xl">PDF Merger</h1><p className="mt-2 text-sm text-white/45">Combine PDFs in the order you choose. Files are processed locally in your browser.</p></header>
    <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5 sm:p-6">
      <div onDragOver={event=>{event.preventDefault();setDragOver(true);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragOver(false);}} onDrop={onDrop} className={`flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${dragOver?"border-blue-400 bg-blue-400/[0.08]":"border-white/15 bg-white/[0.02]"}`}><div className="rounded-xl bg-blue-400/[0.1] p-3 text-blue-300">{dragOver?<Upload className="h-6 w-6"/>:<Plus className="h-6 w-6"/>}</div><p className="mt-3 text-sm font-medium text-white">Drop PDF files here</p><p className="mt-1 text-xs text-white/40">or select from your device · up to 20 files, 50 MB each, 200 MB total</p><Button type="button" variant="outline" onClick={()=>inputRef.current?.click()} className="mt-4 border-white/10 bg-transparent text-white"><Upload className="mr-2 h-4 w-4"/>Choose PDFs</Button><input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={event=>{if(event.target.files)void addFiles(event.target.files);event.target.value="";}}/></div>
      {files.length>0&&<div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-white">Selected PDFs <span className="text-white/35">({files.length})</span></h2><p className="mt-1 text-xs text-white/40">{totalPages} pages · {formatSize(totalBytes)} · drag rows or use arrows to reorder</p></div><Button variant="ghost" onClick={clear} disabled={merging} className="text-xs text-white/45">Clear all</Button></div><div className="space-y-2">{files.map((entry,index)=><div key={entry.id} data-pdf-id={entry.id} draggable={!merging} onDragStart={event=>{setDraggedId(entry.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",entry.id);}} onDragEnd={()=>setDraggedId(null)} onDragOver={event=>{if(draggedId){event.preventDefault();event.dataTransfer.dropEffect="move";}}} onDrop={event=>{event.preventDefault();event.stopPropagation();const id=event.dataTransfer.getData("text/plain")||draggedId;const from=files.findIndex(file=>file.id===id);if(from>=0)move(from,index);setDraggedId(null);}} className={`flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 ${draggedId===entry.id?"opacity-40":""}`}><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-white/25"/><div className="rounded-lg bg-rose-400/[0.1] p-2 text-rose-300"><FileText className="h-4 w-4"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white/80">{entry.file.name}</p><p className="mt-1 text-xs text-white/35">{entry.pages} page{entry.pages===1?"":"s"} · {formatSize(entry.file.size)}</p></div><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Move ${entry.file.name} up`} onClick={()=>move(index,index-1)} disabled={index===0||merging} className="h-8 w-8 text-white/45"><ArrowUp className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" aria-label={`Move ${entry.file.name} down`} onClick={()=>move(index,index+1)} disabled={index===files.length-1||merging} className="h-8 w-8 text-white/45"><ArrowDown className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${entry.file.name}`} onClick={()=>remove(entry.id)} disabled={merging} className="h-8 w-8 text-white/35 hover:text-rose-300"><Trash2 className="h-4 w-4"/></Button></div></div>)}</div></div>}
      {error&&<div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
      {status&&<p aria-live="polite" className="flex items-center gap-2 text-xs text-emerald-200/75">{merged?<CheckCircle2 className="h-4 w-4"/>:null}{status}</p>}
      {merging&&<div><div className="mb-2 flex justify-between text-xs text-white/45"><span>{status}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-blue-500 transition-all" style={{width:`${progress}%`}}/></div></div>}
      <div className="flex flex-wrap gap-2"><Button onClick={()=>void merge()} disabled={files.length<2||merging} className="bg-[#2563EB]">{merging?<LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>:<Files className="mr-2 h-4 w-4"/>}{merging?"Merging PDFs…":"Merge PDFs"}</Button>{merged&&<Button onClick={download} className="bg-emerald-600 hover:bg-emerald-500"><Download className="mr-2 h-4 w-4"/>Download merged PDF · {formatSize(merged.bytes)}</Button>}</div>
    </section><p className="text-center text-[10px] leading-4 text-white/30">PDF content remains on this device. Encrypted PDFs and files larger than the stated limits cannot be merged.</p>
  </div></AppLayout>;
}
