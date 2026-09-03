import { useEffect, useState } from 'react';
import { Check, Clipboard, ExternalLink, Loader2, Upload, Wallet } from 'lucide-react';
import { api, type ApiResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAYMENT_URL = 'https://razorpay.me/@debabratabanerjee3358stem';
const PAYMENT_MESSAGE = 'Payment request from DEBABRATA BANERJEE\nUse this link to enter the amount and pay securely via Razorpay: https://razorpay.me/@debabratabanerjee3358stem';
interface PaymentRequest { paymentUrl: string; qrImageUrl: string; message: string; submission: { id: number; status: string; amount: string; utr: string; paidAt: string; rejectionReason: string | null } | null; }

export default function PaymentRequestPanel() {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [utr, setUtr] = useState('');
  const [notes, setNotes] = useState('');
  const [proofData, setProofData] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PaymentRequest | null>(null);
  useEffect(() => { api.get<ApiResponse<PaymentRequest>>('/billing/payment-request').then((response) => setData(response.data)).catch(() => setNotice('Unable to load the payment request.')); }, []);

  async function copyLink() { await navigator.clipboard.writeText(PAYMENT_URL); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function chooseProof(file?: File) { if (!file) return; setProofFileName(file.name); const reader = new FileReader(); reader.onload = () => setProofData(String(reader.result)); reader.readAsDataURL(file); }
  async function submit(event: React.FormEvent) { event.preventDefault(); setNotice(null); setSaving(true); try { const response = await api.post<ApiResponse<PaymentRequest['submission']>>('/billing/payment-submissions', { amount, paidAt, utr, notes, proofData, proofFileName }); setData((current) => current ? { ...current, submission: response.data } : current); setNotice('Payment submitted for admin verification.'); setUtr(''); setProofData(null); setProofFileName(''); } catch (error) { setNotice(error instanceof Error ? error.message : 'Payment submission failed.'); } finally { setSaving(false); } }
  const submission = data?.submission;
  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300"><Wallet className="h-5 w-5" /></div><div><h3 className="font-semibold text-white">Pay by Razorpay / UPI</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/60">{data?.message ?? PAYMENT_MESSAGE}</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2"><Button asChild className="bg-[#2563EB] hover:bg-[#1d4ed8]"><a href={PAYMENT_URL} target="_blank" rel="noreferrer">Open Payment Link <ExternalLink className="ml-2 h-4 w-4" /></a></Button><Button variant="outline" onClick={() => void copyLink()} className="border-white/[0.1] bg-transparent text-white/70">{copied ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <Clipboard className="mr-2 h-4 w-4" />}{copied ? 'Copied' : 'Copy Link'}</Button></div>
        <p className="mt-3 break-all text-xs text-white/35">{PAYMENT_URL}</p>
      </div>
      <div className="flex items-center justify-center rounded-xl border border-white/[0.07] bg-white p-4"><img src={data?.qrImageUrl ?? '/qr.jpeg'} alt="Razorpay UPI QR code for Debabrata Banerjee" className="h-auto w-full max-w-[240px] object-contain" /></div>
    </div>
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5"><div className="mb-4"><h3 className="font-semibold text-white">Submit payment details</h3><p className="mt-1 text-xs text-white/40">After paying, submit the UTR and proof for admin verification.</p></div><form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-2"><label className="text-xs text-white/60">Amount (INR)<Input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" /></label><label className="text-xs text-white/60">Payment date<Input required type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" /></label><label className="text-xs text-white/60">UTR / Transaction ID<Input required minLength={6} value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Enter bank or Razorpay reference" className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" /></label><label className="text-xs text-white/60">Payment proof *<label className="mt-1 flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/50"><Upload className="h-4 w-4" />{proofFileName || 'Upload image or PDF'}<input required type="file" accept="image/*,application/pdf" className="hidden" onChange={(event) => chooseProof(event.target.files?.[0])} /></label></label><label className="text-xs text-white/60 md:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} className="mt-1 min-h-20 w-full rounded-md border border-white/[0.1] bg-white/[0.04] p-2 text-sm text-white outline-none" /></label><div className="md:col-span-2"><Button type="submit" disabled={saving || submission?.status === 'pending'} className="bg-[#2563EB]">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submission?.status === 'pending' ? 'Awaiting verification' : 'Submit payment for approval'}</Button></div></form>{submission && <p className="mt-3 text-xs text-white/50">Latest submission: <span className="capitalize text-white/80">{submission.status}</span> · UTR {submission.utr}{submission.rejectionReason ? ` · ${submission.rejectionReason}` : ''}</p>}{notice && <p className="mt-3 rounded-md border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs text-blue-200">{notice}</p>}</div>
  </div>;
}
