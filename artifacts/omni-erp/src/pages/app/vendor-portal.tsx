import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, DollarSign, FileText, Plus, Download, Search, MoreHorizontal,
  Star, CheckCircle, AlertCircle, Clock, X, Send, ChevronDown, RefreshCw,
  Mail, Phone, Building2, Tag, ToggleLeft, ToggleRight, Trash2, Edit3,
  MessageSquare, Package, TrendingUp,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  useVpPermissions, useVpSummary, useVpActivity,
  useVpVendors, useCreateVpVendor, useUpdateVpVendor, useDeleteVpVendor,
  useInviteVpVendor, useToggleVpVendor,
  useVpBills, useCreateVpBill, useUpdateVpBill, useDeleteVpBill,
  useVpTickets, useCreateVpTicket, useUpdateVpTicket,
  useVpTicketMessages, useAddVpTicketMessage,
  VP_VENDOR_STATUSES, VP_BILL_STATUSES, VP_TICKET_STATUSES,
  VP_TICKET_PRIORITIES, VP_TICKET_CATEGORIES, VP_VENDOR_CATEGORIES,
  VP_AVATAR_COLORS,
  type VpVendor, type VpBill, type VpTicket,
} from '@/hooks/useVendorPortal';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n));

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const VENDOR_STATUS_STYLE: Record<string, string> = {
  preferred:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  active:       'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  pending:      'bg-amber-500/15 text-amber-400 border-amber-500/20',
  inactive:     'bg-white/5 text-white/40 border-white/10',
  blocked:      'bg-red-500/15 text-red-400 border-red-500/20',
};
const BILL_STATUS_STYLE: Record<string, string> = {
  draft:    'bg-white/5 text-white/40 border-white/10',
  pending:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  approved: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  paid:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  overdue:  'bg-red-500/15 text-red-400 border-red-500/20',
};
const TICKET_STATUS_STYLE: Record<string, string> = {
  open:        'bg-amber-500/15 text-amber-400 border-amber-500/20',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  resolved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed:      'bg-white/5 text-white/40 border-white/10',
};
const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'text-red-400',
  high:   'text-orange-400',
  medium: 'text-amber-400',
  low:    'text-white/40',
};
const AVATAR_BG: Record<string, string> = {
  blue:    'from-[#2563EB]/30 to-[#2563EB]/10 text-[#2563EB]',
  emerald: 'from-emerald-500/30 to-emerald-500/10 text-emerald-400',
  amber:   'from-amber-500/30 to-amber-500/10 text-amber-400',
  purple:  'from-purple-500/30 to-purple-500/10 text-purple-400',
  rose:    'from-rose-500/30 to-rose-500/10 text-rose-400',
  cyan:    'from-cyan-500/30 to-cyan-500/10 text-cyan-400',
  orange:  'from-orange-500/30 to-orange-500/10 text-orange-400',
  slate:   'from-slate-500/30 to-slate-500/10 text-slate-400',
};

// ── Vendor Dialog ──────────────────────────────────────────────────────────────

function VendorDialog({
  open, onClose, vendor, vendors,
}: { open: boolean; onClose: () => void; vendor?: VpVendor; vendors: VpVendor[] }) {
  const { toast } = useToast();
  const create = useCreateVpVendor();
  const update = useUpdateVpVendor();

  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    email: vendor?.email ?? '',
    company: vendor?.company ?? '',
    phone: vendor?.phone ?? '',
    category: vendor?.category ?? '',
    status: vendor?.status ?? 'pending',
    avatarColor: vendor?.avatarColor ?? 'blue',
    rating: vendor?.rating ?? '0',
    onTimePct: vendor?.onTimePct ?? '0',
    notes: vendor?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast({ title: 'Name and email are required', variant: 'destructive' });
      return;
    }
    try {
      if (vendor) {
        await update.mutateAsync({ id: vendor.id, data: form });
        toast({ title: 'Vendor updated' });
      } else {
        await create.mutateAsync(form);
        toast({ title: 'Vendor created' });
      }
      onClose();
    } catch {
      toast({ title: 'Failed to save vendor', variant: 'destructive' });
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-white/50 text-xs">Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="Vendor name" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Email *</Label>
            <Input value={form.email} onChange={e => set('email', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="contact@vendor.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Company</Label>
            <Input value={form.company} onChange={e => set('company', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="Company name" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {VP_VENDOR_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="text-white focus:bg-white/[0.06]">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {VP_VENDOR_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-white/[0.06] capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Avatar Color</Label>
            <Select value={form.avatarColor} onValueChange={v => set('avatarColor', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {VP_AVATAR_COLORS.map(c => (
                  <SelectItem key={c} value={c} className="text-white focus:bg-white/[0.06] capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Rating (0–5)</Label>
            <Input type="number" min="0" max="5" step="0.1" value={form.rating}
              onChange={e => set('rating', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">On-Time % (0–100)</Label>
            <Input type="number" min="0" max="100" step="0.1" value={form.onTimePct}
              onChange={e => set('onTimePct', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-white/50 text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="bg-white/[0.04] border-white/[0.08] text-white resize-none" placeholder="Internal notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.08] bg-transparent text-white/60">Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            {busy ? 'Saving…' : vendor ? 'Update Vendor' : 'Add Vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bill Dialog ────────────────────────────────────────────────────────────────

function BillDialog({
  open, onClose, bill, vendors,
}: { open: boolean; onClose: () => void; bill?: VpBill; vendors: VpVendor[] }) {
  const { toast } = useToast();
  const create = useCreateVpBill();
  const update = useUpdateVpBill();

  const [form, setForm] = useState({
    vendorId: bill?.vendorId ? String(bill.vendorId) : '',
    billDate: bill?.billDate ?? new Date().toISOString().slice(0, 10),
    dueDate: bill?.dueDate ?? '',
    amount: bill?.amount ?? '',
    paidAmount: bill?.paidAmount ?? '0',
    currency: bill?.currency ?? 'INR',
    status: bill?.status ?? 'draft',
    poReference: bill?.poReference ?? '',
    description: bill?.description ?? '',
    notes: bill?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.vendorId || !form.billDate || !form.amount) {
      toast({ title: 'Vendor, date and amount are required', variant: 'destructive' });
      return;
    }
    try {
      const payload = { ...form, vendorId: parseInt(form.vendorId) };
      if (bill) {
        const { vendorId: _v, ...rest } = payload;
        await update.mutateAsync({ id: bill.id, data: rest });
        toast({ title: 'Bill updated' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Bill created' });
      }
      onClose();
    } catch {
      toast({ title: 'Failed to save bill', variant: 'destructive' });
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{bill ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {!bill && (
            <div className="col-span-2 space-y-1">
              <Label className="text-white/50 text-xs">Vendor *</Label>
              <Select value={form.vendorId} onValueChange={v => set('vendorId', v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={String(v.id)} className="text-white focus:bg-white/[0.06]">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Bill Date *</Label>
            <Input type="date" value={form.billDate} onChange={e => set('billDate', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Amount *</Label>
            <Input type="number" min="0" step="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Paid Amount</Label>
            <Input type="number" min="0" step="0.01" value={form.paidAmount}
              onChange={e => set('paidAmount', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {VP_BILL_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-white/[0.06] capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">PO Reference</Label>
            <Input value={form.poReference} onChange={e => set('poReference', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="PO-XXXX" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-white/50 text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="bg-white/[0.04] border-white/[0.08] text-white resize-none" placeholder="Bill description..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.08] bg-transparent text-white/60">Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            {busy ? 'Saving…' : bill ? 'Update Bill' : 'Add Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ticket Dialog ──────────────────────────────────────────────────────────────

function TicketDialog({
  open, onClose, ticket, vendors,
}: { open: boolean; onClose: () => void; ticket?: VpTicket; vendors: VpVendor[] }) {
  const { toast } = useToast();
  const create = useCreateVpTicket();
  const update = useUpdateVpTicket();

  const [form, setForm] = useState({
    vendorId: ticket?.vendorId ? String(ticket.vendorId) : '',
    subject: ticket?.subject ?? '',
    description: ticket?.description ?? '',
    category: ticket?.category ?? 'general',
    priority: ticket?.priority ?? 'medium',
    status: ticket?.status ?? 'open',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.vendorId || !form.subject) {
      toast({ title: 'Vendor and subject are required', variant: 'destructive' });
      return;
    }
    try {
      if (ticket) {
        await update.mutateAsync({ id: ticket.id, data: { subject: form.subject, category: form.category as any, priority: form.priority as any, status: form.status as any, description: form.description } });
        toast({ title: 'Ticket updated' });
      } else {
        await create.mutateAsync({ vendorId: parseInt(form.vendorId), subject: form.subject, description: form.description, category: form.category, priority: form.priority });
        toast({ title: 'Ticket created' });
      }
      onClose();
    } catch {
      toast({ title: 'Failed to save ticket', variant: 'destructive' });
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{ticket ? 'Edit Ticket' : 'New Ticket'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {!ticket && (
            <div className="col-span-2 space-y-1">
              <Label className="text-white/50 text-xs">Vendor *</Label>
              <Select value={form.vendorId} onValueChange={v => set('vendorId', v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={String(v.id)} className="text-white focus:bg-white/[0.06]">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-2 space-y-1">
            <Label className="text-white/50 text-xs">Subject *</Label>
            <Input value={form.subject} onChange={e => set('subject', e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="Brief description of the issue" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {VP_TICKET_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="text-white focus:bg-white/[0.06] capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-xs">Priority</Label>
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {VP_TICKET_PRIORITIES.map(p => (
                  <SelectItem key={p} value={p} className="text-white focus:bg-white/[0.06] capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ticket && (
            <div className="space-y-1">
              <Label className="text-white/50 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {VP_TICKET_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-white focus:bg-white/[0.06] capitalize">{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={`${ticket ? '' : 'col-span-2'} space-y-1`}>
            <Label className="text-white/50 text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="bg-white/[0.04] border-white/[0.08] text-white resize-none col-span-2" placeholder="Detailed description..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.08] bg-transparent text-white/60">Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            {busy ? 'Saving…' : ticket ? 'Update Ticket' : 'Create Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Message Dialog ─────────────────────────────────────────────────────────────

function MessageDialog({ open, onClose, ticket }: { open: boolean; onClose: () => void; ticket: VpTicket | null }) {
  const { toast } = useToast();
  const { data: messages = [], isLoading } = useVpTicketMessages(ticket?.id ?? null);
  const addMessage = useAddVpTicketMessage();
  const [msg, setMsg] = useState('');

  const send = async () => {
    if (!msg.trim() || !ticket) return;
    try {
      await addMessage.mutateAsync({ ticketId: ticket.id, data: { senderType: 'staff', senderName: 'Staff', message: msg.trim() } });
      setMsg('');
    } catch {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">
            {ticket?.ticketNumber} — {ticket?.subject}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-xs text-white/40 -mt-2 mb-1">
          <span>{ticket?.vendorName}</span>
          <span>·</span>
          <Badge className={`text-[10px] border px-2 py-0 ${TICKET_STATUS_STYLE[ticket?.status ?? 'open']}`}>
            {ticket?.status?.replace('_', ' ')}
          </Badge>
          <span className={`font-medium ${PRIORITY_STYLE[ticket?.priority ?? 'medium']}`}>{ticket?.priority}</span>
        </div>
        <div className="h-64 overflow-y-auto space-y-3 pr-1 border border-white/[0.05] rounded-lg p-3 bg-white/[0.02]">
          {isLoading && <p className="text-white/30 text-xs text-center mt-8">Loading…</p>}
          {!isLoading && messages.length === 0 && (
            <p className="text-white/30 text-xs text-center mt-8">No messages yet. Start the conversation.</p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex gap-2 ${m.senderType === 'staff' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.senderType === 'staff' ? 'bg-[#2563EB]/20 text-[#2563EB]' : 'bg-amber-500/20 text-amber-400'}`}>
                {m.senderName[0]}
              </div>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${m.senderType === 'staff' ? 'bg-[#2563EB]/10 border border-[#2563EB]/20' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
                <p className="text-xs font-medium text-white/70 mb-0.5">{m.senderName}</p>
                <p className="text-sm text-white/90">{m.message}</p>
                <p className="text-[10px] text-white/30 mt-1">{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            className="bg-white/[0.04] border-white/[0.08] text-white flex-1" placeholder="Type a message…" />
          <Button size="sm" onClick={send} disabled={!msg.trim() || addMessage.isPending}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VendorPortal() {
  const { toast } = useToast();
  const [tab, setTab] = useState('vendors');

  // search & filter
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');

  // dialogs
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editVendor, setEditVendor] = useState<VpVendor | undefined>();
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [editBill, setEditBill] = useState<VpBill | undefined>();
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [editTicket, setEditTicket] = useState<VpTicket | undefined>();
  const [messageTicket, setMessageTicket] = useState<VpTicket | null>(null);

  // data
  const { data: perms } = useVpPermissions();
  const { data: summary, isLoading: summaryLoading } = useVpSummary();
  const { data: activity = [] } = useVpActivity(15);
  const { data: vendors = [], isLoading: vendorsLoading } = useVpVendors(vendorSearch, vendorStatusFilter);
  const { data: bills = [], isLoading: billsLoading } = useVpBills(billSearch, billStatusFilter);
  const { data: tickets = [], isLoading: ticketsLoading } = useVpTickets(ticketSearch, ticketStatusFilter);

  const deleteVendor = useDeleteVpVendor();
  const deleteBill = useDeleteVpBill();
  const inviteVendor = useInviteVpVendor();
  const toggleVendor = useToggleVpVendor();

  const handleDeleteVendor = async (v: VpVendor) => {
    if (!confirm(`Delete ${v.name}?`)) return;
    try {
      await deleteVendor.mutateAsync(v.id);
      toast({ title: 'Vendor deleted' });
    } catch {
      toast({ title: 'Failed to delete vendor', variant: 'destructive' });
    }
  };

  const handleDeleteBill = async (b: VpBill) => {
    if (b.status === 'paid') { toast({ title: 'Cannot delete a paid bill', variant: 'destructive' }); return; }
    if (!confirm(`Delete bill ${b.billNumber}?`)) return;
    try {
      await deleteBill.mutateAsync(b.id);
      toast({ title: 'Bill deleted' });
    } catch {
      toast({ title: 'Failed to delete bill', variant: 'destructive' });
    }
  };

  const handleInvite = async (v: VpVendor) => {
    try {
      await inviteVendor.mutateAsync(v.id);
      toast({ title: `Invite sent to ${v.name}` });
    } catch {
      toast({ title: 'Failed to send invite', variant: 'destructive' });
    }
  };

  const handleToggle = async (v: VpVendor) => {
    try {
      await toggleVendor.mutateAsync(v.id);
      toast({ title: v.portalEnabled ? 'Portal access disabled' : 'Portal access enabled' });
    } catch {
      toast({ title: 'Failed to toggle access', variant: 'destructive' });
    }
  };

  const summaryCards = [
    {
      label: 'Total Vendors', value: summaryLoading ? '…' : String(summary?.totalVendors ?? 0),
      sub: `${summary?.preferredVendors ?? 0} preferred`,
      icon: Truck, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5',
    },
    {
      label: 'Bills Outstanding', value: summaryLoading ? '…' : fmt(summary?.outstanding ?? 0),
      sub: `${summary?.totalBills ?? 0} total bills`,
      icon: FileText, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5',
    },
    {
      label: 'Avg On-Time Rate', value: summaryLoading ? '…' : `${summary?.avgOnTimePct ?? 0}%`,
      sub: `${summary?.activeVendors ?? 0} active vendors`,
      icon: CheckCircle, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      label: 'Open Tickets', value: summaryLoading ? '…' : String(summary?.openTickets ?? 0),
      sub: `${summary?.resolvedTickets ?? 0} resolved`,
      icon: AlertCircle, color: 'text-rose-400', bg: 'from-rose-500/20 to-rose-500/5',
    },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Portals' }, { label: 'Vendor Portal' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Vendor Portal</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {summary ? `${summary.totalVendors} vendors · ${summary.activeVendors} active · ${summary.avgOnTimePct}% on-time` : 'Manage vendor relationships'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {perms?.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                onClick={() => { setEditVendor(undefined); setShowVendorDialog(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Vendor
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
              <p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            {['vendors', 'bills', 'tickets', 'performance', 'activity'].map(t => (
              <TabsTrigger key={t} value={t}
                className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Vendors Tab ── */}
          <TabsContent value="vendors" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)}
                  placeholder="Search vendors…"
                  className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
              </div>
              <Select value={vendorStatusFilter || 'all'} onValueChange={v => setVendorStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-sm w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  <SelectItem value="all" className="text-white focus:bg-white/[0.06]">All statuses</SelectItem>
                  {VP_VENDOR_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-white focus:bg-white/[0.06] capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              {vendorsLoading ? (
                <div className="py-16 text-center text-white/30 text-sm">Loading vendors…</div>
              ) : vendors.length === 0 ? (
                <div className="py-16 text-center">
                  <Truck className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No vendors yet</p>
                  {perms?.canCreate && (
                    <Button size="sm" className="mt-4 bg-[#2563EB] hover:bg-[#1d4ed8]"
                      onClick={() => { setEditVendor(undefined); setShowVendorDialog(true); }}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add First Vendor
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Vendor', 'Category', 'Total Spend', 'Bills', 'On-Time', 'Rating', 'Status', 'Portal', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map(v => (
                        <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AVATAR_BG[v.avatarColor]} flex items-center justify-center text-xs font-bold`}>
                                {v.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{v.name}</p>
                                <p className="text-xs text-white/30">{v.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {v.category
                              ? <Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{v.category}</Badge>
                              : <span className="text-white/20 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-white">{fmt(v.totalSpend)}</td>
                          <td className="px-4 py-3 text-sm text-white/60">{v.billCount}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={Number(v.onTimePct)} className="w-14 h-1.5 bg-white/[0.07]" />
                              <span className="text-xs text-white/50">{Number(v.onTimePct).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-amber-400 font-medium">
                            {Number(v.rating) > 0 ? `★ ${Number(v.rating).toFixed(1)}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${VENDOR_STATUS_STYLE[v.status]} px-2 py-0 capitalize`}>
                              {v.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleToggle(v)}
                              className="text-white/30 hover:text-white transition-colors">
                              {v.portalEnabled
                                ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                                : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#0d1117] border-white/[0.08] text-white" align="end">
                                {perms?.canEdit && (
                                  <DropdownMenuItem className="focus:bg-white/[0.06] cursor-pointer"
                                    onClick={() => { setEditVendor(v); setShowVendorDialog(true); }}>
                                    <Edit3 className="w-3.5 h-3.5 mr-2" />Edit
                                  </DropdownMenuItem>
                                )}
                                {perms?.canEdit && (
                                  <DropdownMenuItem className="focus:bg-white/[0.06] cursor-pointer"
                                    onClick={() => handleInvite(v)}>
                                    <Mail className="w-3.5 h-3.5 mr-2" />
                                    {v.inviteSentAt ? 'Resend Invite' : 'Send Invite'}
                                  </DropdownMenuItem>
                                )}
                                {perms?.canEdit && (
                                  <DropdownMenuItem className="focus:bg-white/[0.06] cursor-pointer"
                                    onClick={() => handleToggle(v)}>
                                    {v.portalEnabled
                                      ? <><ToggleLeft className="w-3.5 h-3.5 mr-2" />Disable Access</>
                                      : <><ToggleRight className="w-3.5 h-3.5 mr-2" />Enable Access</>}
                                  </DropdownMenuItem>
                                )}
                                {perms?.canDelete && (
                                  <>
                                    <DropdownMenuSeparator className="bg-white/[0.06]" />
                                    <DropdownMenuItem className="focus:bg-red-500/10 text-red-400 cursor-pointer"
                                      onClick={() => handleDeleteVendor(v)}>
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-white/[0.05]">
                    <p className="text-xs text-white/30">Showing {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Bills Tab ── */}
          <TabsContent value="bills" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input value={billSearch} onChange={e => setBillSearch(e.target.value)}
                    placeholder="Search bills…"
                    className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-52" />
                </div>
                <Select value={billStatusFilter || 'all'} onValueChange={v => setBillStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-sm w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="all" className="text-white focus:bg-white/[0.06]">All statuses</SelectItem>
                    {VP_BILL_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="text-white focus:bg-white/[0.06] capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {perms?.canCreate && (
                <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                  onClick={() => { setEditBill(undefined); setShowBillDialog(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Add Bill
                </Button>
              )}
            </div>

            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              {billsLoading ? (
                <div className="py-16 text-center text-white/30 text-sm">Loading bills…</div>
              ) : bills.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No bills yet</p>
                  {perms?.canCreate && vendors.length > 0 && (
                    <Button size="sm" className="mt-4 bg-[#2563EB] hover:bg-[#1d4ed8]"
                      onClick={() => { setEditBill(undefined); setShowBillDialog(true); }}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add First Bill
                    </Button>
                  )}
                  {vendors.length === 0 && <p className="text-white/20 text-xs mt-2">Add a vendor first</p>}
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Bill #', 'Vendor', 'PO Reference', 'Amount', 'Paid', 'Due Date', 'Status', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map(b => {
                        const remaining = Number(b.amount) - Number(b.paidAmount);
                        const isOverdue = b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'paid';
                        return (
                          <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{b.billNumber}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-white/80">{b.vendorName}</p>
                              <p className="text-xs text-white/30">{b.vendorEmail}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-white/50">{b.poReference || '—'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-white">{fmt(b.amount)}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-white/70">{fmt(b.paidAmount)}</p>
                              {remaining > 0 && <p className="text-xs text-amber-400">{fmt(remaining)} due</p>}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={isOverdue ? 'text-red-400 font-medium' : 'text-white/50'}>
                                {fmtDate(b.dueDate)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`text-[10px] border ${BILL_STATUS_STYLE[b.status]} px-2 py-0 capitalize`}>
                                {b.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#0d1117] border-white/[0.08] text-white" align="end">
                                  {perms?.canEdit && (
                                    <DropdownMenuItem className="focus:bg-white/[0.06] cursor-pointer"
                                      onClick={() => { setEditBill(b); setShowBillDialog(true); }}>
                                      <Edit3 className="w-3.5 h-3.5 mr-2" />Edit
                                    </DropdownMenuItem>
                                  )}
                                  {perms?.canDelete && b.status !== 'paid' && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                                      <DropdownMenuItem className="focus:bg-red-500/10 text-red-400 cursor-pointer"
                                        onClick={() => handleDeleteBill(b)}>
                                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-white/[0.05]">
                    <p className="text-xs text-white/30">Showing {bills.length} bill{bills.length !== 1 ? 's' : ''}</p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Tickets Tab ── */}
          <TabsContent value="tickets" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input value={ticketSearch} onChange={e => setTicketSearch(e.target.value)}
                    placeholder="Search tickets…"
                    className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-52" />
                </div>
                <Select value={ticketStatusFilter || 'all'} onValueChange={v => setTicketStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-sm w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="all" className="text-white focus:bg-white/[0.06]">All statuses</SelectItem>
                    {VP_TICKET_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="text-white focus:bg-white/[0.06] capitalize">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {perms?.canCreate && (
                <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                  onClick={() => { setEditTicket(undefined); setShowTicketDialog(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />New Ticket
                </Button>
              )}
            </div>

            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              {ticketsLoading ? (
                <div className="py-16 text-center text-white/30 text-sm">Loading tickets…</div>
              ) : tickets.length === 0 ? (
                <div className="py-16 text-center">
                  <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No tickets yet</p>
                  {perms?.canCreate && vendors.length > 0 && (
                    <Button size="sm" className="mt-4 bg-[#2563EB] hover:bg-[#1d4ed8]"
                      onClick={() => { setEditTicket(undefined); setShowTicketDialog(true); }}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Create First Ticket
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Ticket #', 'Vendor', 'Subject', 'Category', 'Priority', 'Status', 'Messages', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map(t => (
                        <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{t.ticketNumber}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white/80">{t.vendorName}</p>
                            <p className="text-xs text-white/30">{t.vendorCompany}</p>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="text-sm text-white truncate">{t.subject}</p>
                            <p className="text-xs text-white/30">{timeAgo(t.updatedAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-white/5 text-white/50 border-white/10 text-xs capitalize">{t.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${TICKET_STATUS_STYLE[t.status]} px-2 py-0 capitalize`}>
                              {t.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setMessageTicket(t)}
                              className="flex items-center gap-1 text-white/40 hover:text-white/80 transition-colors text-sm">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{t.messageCount}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#0d1117] border-white/[0.08] text-white" align="end">
                                <DropdownMenuItem className="focus:bg-white/[0.06] cursor-pointer"
                                  onClick={() => setMessageTicket(t)}>
                                  <MessageSquare className="w-3.5 h-3.5 mr-2" />Messages
                                </DropdownMenuItem>
                                {perms?.canEdit && (
                                  <DropdownMenuItem className="focus:bg-white/[0.06] cursor-pointer"
                                    onClick={() => { setEditTicket(t); setShowTicketDialog(true); }}>
                                    <Edit3 className="w-3.5 h-3.5 mr-2" />Edit / Update Status
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-white/[0.05]">
                    <p className="text-xs text-white/30">Showing {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Performance Tab ── */}
          <TabsContent value="performance" className="mt-4">
            {vendors.length === 0 ? (
              <div className="py-16 text-center">
                <TrendingUp className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No vendor data yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vendors.map((v, i) => (
                  <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_BG[v.avatarColor]} flex items-center justify-center text-sm font-bold`}>
                          {v.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{v.name}</p>
                          <p className="text-xs text-white/40">{v.category || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {Number(v.rating) > 0
                          ? <div className="flex items-center gap-1 text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" /><span className="text-sm font-semibold">{Number(v.rating).toFixed(1)}</span></div>
                          : <span className="text-white/20 text-xs">No rating</span>}
                        <Badge className={`text-[10px] border ${VENDOR_STATUS_STYLE[v.status]} px-2 py-0 capitalize mt-1`}>{v.status}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { l: 'Total Spend', v: fmt(v.totalSpend) },
                        { l: 'Bills', v: String(v.billCount) },
                        { l: 'Open Tickets', v: String(v.openTickets) },
                      ].map(item => (
                        <div key={item.l} className="text-center bg-white/[0.02] rounded-lg py-2">
                          <p className="text-sm font-bold text-white">{item.v}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">{item.l}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">On-Time Delivery</span>
                        <span className={`font-medium ${Number(v.onTimePct) >= 90 ? 'text-emerald-400' : Number(v.onTimePct) >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                          {Number(v.onTimePct).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={Number(v.onTimePct)}
                        className="h-1.5 bg-white/[0.07]"
                      />
                    </div>

                    {v.inviteSentAt && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400/70">
                        <Mail className="w-3 h-3" />
                        <span>Invited {timeAgo(v.inviteSentAt)}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 space-y-1 max-w-2xl">
              {activity.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No recent activity</p>
                </div>
              ) : (
                activity.map(ev => {
                  const icon =
                    ev.type === 'vendor_joined' ? <Truck className="w-3.5 h-3.5 text-[#2563EB]" /> :
                    ev.type === 'bill_updated' ? <FileText className="w-3.5 h-3.5 text-amber-400" /> :
                    ev.type === 'ticket_updated' ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> :
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{ev.label}</p>
                        {ev.sub && <p className="text-xs text-white/40 truncate mt-0.5">{ev.sub}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {ev.status && (
                          <Badge className={`text-[10px] border px-2 py-0 capitalize mb-1 block
                            ${VENDOR_STATUS_STYLE[ev.status] ?? BILL_STATUS_STYLE[ev.status] ?? TICKET_STATUS_STYLE[ev.status] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
                            {ev.status}
                          </Badge>
                        )}
                        <p className="text-xs text-white/30">{timeAgo(ev.at as string)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <VendorDialog
        open={showVendorDialog}
        onClose={() => { setShowVendorDialog(false); setEditVendor(undefined); }}
        vendor={editVendor}
        vendors={vendors}
      />
      <BillDialog
        open={showBillDialog}
        onClose={() => { setShowBillDialog(false); setEditBill(undefined); }}
        bill={editBill}
        vendors={vendors}
      />
      <TicketDialog
        open={showTicketDialog}
        onClose={() => { setShowTicketDialog(false); setEditTicket(undefined); }}
        ticket={editTicket}
        vendors={vendors}
      />
      <MessageDialog
        open={!!messageTicket}
        onClose={() => setMessageTicket(null)}
        ticket={messageTicket}
      />
    </AppLayout>
  );
}
