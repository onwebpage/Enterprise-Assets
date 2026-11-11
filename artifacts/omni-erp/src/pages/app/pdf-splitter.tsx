import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { AlertCircle, CheckCircle2, Download, FileText, Files, LoaderCircle, Scissors, Upload, X } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";

type Mode = "individual" | "ranges" | "selected";
type OutputFile = { name: string; url: string; bytes: number; pages: number[] };
const MAX_BYTES=50*1024*1024;

function parseRanges(input:string,pageCount:number) {
  const chunks=input.split(",").map(part=>part.trim()).filter(Boolean);
  if(!chunks.length)throw new Error("Enter one or more page numbers or ranges, such as 1-3, 5-8.");
  const ranges:number[][]=[];
  for(const chunk of chunks){
    const match=chunk.match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
    if(!match)throw new Error(`“${chunk}” is not a valid page number or range.`);
    const start=Number(match[1]),end=Number(match[2]??match[1]);
    if(start<1||end<1||start>pageCount||end>pageCount)throw new Error(`Page range “${chunk}” is outside this PDF (pages 1-${pageCount}).`);
    if(start>end)throw new Error(`Range “${chunk}” must start before it ends.`);
    ranges.push(Array.from({length:end-start+1},(_,i)=>start-1+i));
  }
  return ranges;
}

function explainPdfError(error:unknown) {
  const message=error instanceof Error?error.message:String(error);
  if(/encrypt|password|decrypt/i.test(message))return "This PDF is password-protected or encrypted. Unlock it first, then try again.";
  if(/parse|unexpected|invalid|PDF header|Failed to parse/i.test(message))return "This PDF appears corrupted or has an unsupported structure. Try opening and saving it again in a PDF reader.";
  return message||"Could not process this PDF.";
}

export default function PDFSplitter(){
  const inputRef=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null);const [pageCount,setPageCount]=useState(0);const [previewUrl,setPreviewUrl]=useState("");
  const [mode,setMode]=useState<Mode>("individual");const [rangeText,setRangeText]=useState("1-3, 5-8");const [selected,setSelected]=useState<number[]>([]);
  const [error,setError]=useState("");const [progress,setProgress]=useState(0);const [processing,setProcessing]=useState(false);const [status,setStatus]=useState("");const [outputs,setOutputs]=useState<OutputFile[]>([]);
  const cleanupOutputs=()=>{outputs.forEach(output=>URL.revokeObjectURL(output.url));setOutputs([]);};
  useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);outputs.forEach(output=>URL.revokeObjectURL(output.url));},[previewUrl,outputs]);
  const selectFile=async(next:File|undefined)=>{
    if(!next)return;setError("");setStatus("");cleanupOutputs();
    if(!(next.type==="application/pdf"||next.name.toLowerCase().endsWith(".pdf"))){setError("Choose a PDF file (.pdf).");return;}
    if(next.size>MAX_BYTES){setError("The PDF exceeds the 50 MB file size limit.");return;}
    try{
      const bytes=await next.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=="%PDF-")throw new Error("Invalid PDF header.");
      const doc=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});const count=doc.getPageCount();if(!count)throw new Error("This PDF has no pages.");if(count>5000)throw new Error("This PDF has more than 5,000 pages; split it into smaller files first.");
      if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl(URL.createObjectURL(next));setFile(next);setPageCount(count);setSelected([]);setStatus(`${count} pages ready to split.`);
    }catch(cause){setFile(null);setPageCount(0);setError(explainPdfError(cause));}
  };
  const setOutputFiles=(items:OutputFile[])=>{outputs.forEach(output=>URL.revokeObjectURL(output.url));setOutputs(items);};
  const split=async()=>{
    if(!file)return;setError("");setStatus("");setProcessing(true);setProgress(0);setOutputFiles([]);
    try{
      const source=await PDFDocument.load(await file.arrayBuffer(),{ignoreEncryption:false,updateMetadata:false});
      let groups:number[][]=[];
      if(mode==="individual")groups=Array.from({length:pageCount},(_,i)=>[i]);
      else if(mode==="ranges")groups=parseRanges(rangeText,pageCount);
      else {const pages=[...new Set(selected)].sort((a,b)=>a-b);if(!pages.length)throw new Error("Select at least one page to extract.");if(pages.some(p=>p<0||p>=pageCount))throw new Error("A selected page is outside the document range.");groups=pages.map(page=>[page]);}
      const generated:OutputFile[]=[];
      for(let i=0;i<groups.length;i++){
        const output=await PDFDocument.create();for(const page of await output.copyPages(source,groups[i]))output.addPage(page);
        const bytes=await output.save({useObjectStreams:true});const blob=new Blob([bytes as BlobPart],{type:"application/pdf"});
        const label=groups[i].length===1?`page-${groups[i][0]+1}`:`pages-${groups[i][0]+1}-to-${groups[i][groups[i].length-1]+1}`;
        generated.push({name:`${file.name.replace(/\.pdf$/i,"")}-${label}.pdf`,url:URL.createObjectURL(blob),bytes:blob.size,pages:groups[i].map(p=>p+1)});
        setProgress(Math.round(((i+1)/groups.length)*100));setStatus(`Creating PDF ${i+1} of ${groups.length}…`);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      }
      setOutputs(generated);setStatus(`Created ${generated.length} PDF${generated.length===1?"":"s"}.`);
    }catch(cause){setError(explainPdfError(cause));setStatus("");}
    finally{setProcessing(false);}
  };
  const downloadAll=async()=>{if(!outputs.length)return;try{const zip=new JSZip();for(const output of outputs){const response=await fetch(output.url);zip.file(output.name,await response.arrayBuffer());}const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${file?.name.replace(/\.pdf$/i,"")||"split-pdf"}-pages.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(cause){setError(cause instanceof Error?cause.message:"Could not create ZIP archive.");}};
  const downloadOne=(output:OutputFile)=>{const a=document.createElement("a");a.href=output.url;a.download=output.name;a.click();};
  const formatBytes=(n:number)=>n<1024*1024?`${(n/1024).toFixed(0)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
  const field="border-white/[0.1] bg-white/[0.04] text-white";
  return <AppLayout breadcrumbs={[{label:"Documents",path:"/app/documents"},{label:"PDF Splitter"}]}><div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-blue-300"><Scissors className="h-4 w-4"/> Documents tools</div><h1 className="text-2xl font-bold text-white sm:text-3xl">PDF Splitter</h1><p className="mt-2 text-sm text-white/45">Split a PDF into pages or extract exactly the pages you need. Files stay on this device.</p></header>
    {!file?<section onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void selectFile(e.dataTransfer.files[0]);}} className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0a0f1e] p-6 text-center"><div className="rounded-xl bg-blue-400/[0.1] p-3 text-blue-300"><Upload className="h-6 w-6"/></div><p className="mt-3 text-sm font-medium text-white">Drop a PDF here</p><p className="mt-1 text-xs text-white/40">Maximum file size 50 MB</p><Button onClick={()=>inputRef.current?.click()} variant="outline" className="mt-4 border-white/10 bg-transparent text-white"><Upload className="mr-2 h-4 w-4"/>Choose PDF</Button><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={e=>void selectFile(e.target.files?.[0])}/></section>:<div className="grid items-start gap-5 lg:grid-cols-[.9fr_1.1fr]"><section className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-rose-400/[0.1] p-2 text-rose-300"><FileText className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{file.name}</p><p className="mt-1 text-xs text-white/40">{pageCount} pages · {formatBytes(file.size)}</p></div><Button variant="ghost" size="icon" onClick={()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl("");setFile(null);setPageCount(0);setOutputFiles([]);setError("");}} aria-label="Remove PDF" className="h-8 w-8 text-white/40"><X className="h-4 w-4"/></Button></div>
      <div><h2 className="text-sm font-semibold text-white">Split method</h2><div className="mt-3 space-y-2">{([{id:"individual",label:"Every page separately",hint:`Create ${pageCount} individual PDFs`},{id:"ranges",label:"Custom page ranges",hint:"Example: 1-3, 5-8 creates one PDF per range"},{id:"selected",label:"Selected pages",hint:"Choose pages to extract as individual PDFs"}] as const).map(item=><button key={item.id} onClick={()=>{setMode(item.id);setError("");}} className={`w-full rounded-xl border p-3 text-left ${mode===item.id?"border-blue-400/30 bg-blue-500/[0.09]":"border-white/[0.08] bg-white/[0.02]"}`}><span className="block text-xs font-medium text-white/80">{item.label}</span><span className="mt-1 block text-[10px] text-white/40">{item.hint}</span></button>)}</div></div>
      {mode==="ranges"&&<label className="block space-y-2 text-xs font-medium text-white/60">Page ranges<input value={rangeText} onChange={e=>setRangeText(e.target.value)} placeholder="1-3, 5-8" className={`${field} h-10 w-full rounded-md border px-3`}/><span className="block text-[10px] text-white/35">Use commas to separate ranges; end page numbers are included.</span></label>}
      {mode==="selected"&&<div><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-medium text-white/65">Select pages</h3><button onClick={()=>setSelected(selected.length===pageCount?[]:Array.from({length:pageCount},(_,i)=>i))} className="text-[10px] text-blue-300">{selected.length===pageCount?"Clear selection":"Select all"}</button></div><div className="grid max-h-40 grid-cols-6 gap-2 overflow-auto rounded-lg border border-white/[0.06] p-3 sm:grid-cols-8">{Array.from({length:pageCount},(_,i)=><label key={i} className={`flex cursor-pointer items-center justify-center rounded-md border py-2 text-xs ${selected.includes(i)?"border-blue-400/30 bg-blue-500/15 text-blue-200":"border-white/[0.07] text-white/45"}`}><input type="checkbox" className="sr-only" checked={selected.includes(i)} onChange={e=>setSelected(current=>e.target.checked?[...current,i]:current.filter(p=>p!==i))}/>{i+1}</label>)}</div></div>}
      {error&&<div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
      {status&&<p aria-live="polite" className="flex items-center gap-2 text-xs text-emerald-200/75">{outputs.length>0&&<CheckCircle2 className="h-4 w-4"/>}{status}</p>}
      {processing&&<div><div className="mb-2 flex justify-between text-xs text-white/45"><span>Splitting pages…</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full bg-blue-500 transition-all" style={{width:`${progress}%`}}/></div></div>}
      <Button onClick={()=>void split()} disabled={processing||!file} className="bg-[#2563EB]">{processing?<LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>:<Scissors className="mr-2 h-4 w-4"/>}{processing?"Splitting…":"Split PDF"}</Button>
    </section><section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5"><div><h2 className="text-sm font-semibold text-white">PDF preview</h2><p className="mt-1 text-xs text-white/40">Page 1 of {pageCount}</p></div><iframe title="Source PDF preview" src={`${previewUrl}#page=1&toolbar=0`} className="h-[440px] w-full rounded-lg border border-white/[0.08] bg-white"/></section></div>}
    {error&&!file&&<div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
    {outputs.length>0&&<section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Extracted PDFs <span className="text-white/35">({outputs.length})</span></h2><p className="mt-1 text-xs text-white/40">Download files individually or as one ZIP archive.</p></div><Button onClick={()=>void downloadAll()} className="bg-emerald-600 hover:bg-emerald-500"><Download className="mr-2 h-4 w-4"/>Download all as ZIP</Button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{outputs.map(output=><div key={output.name} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"><FileText className="h-4 w-4 shrink-0 text-rose-300"/><div className="min-w-0 flex-1"><p className="truncate text-xs text-white/75">{output.name}</p><p className="mt-1 text-[10px] text-white/35">Page{output.pages.length>1?"s":""} {output.pages.join(", ")} · {formatBytes(output.bytes)}</p></div><Button variant="ghost" size="icon" onClick={()=>downloadOne(output)} aria-label={`Download ${output.name}`} className="h-8 w-8 text-white/50"><Download className="h-4 w-4"/></Button></div>)}</div></section>}
    <p className="text-center text-[10px] leading-4 text-white/30">PDFs are processed locally in your browser and are not uploaded. Password-protected files must be unlocked before splitting.</p>
  </div></AppLayout>;
}
