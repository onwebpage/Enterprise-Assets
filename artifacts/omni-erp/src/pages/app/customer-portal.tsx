import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Users, FileText, LifeBuoy, Plus, Search, MoreHorizontal,
  Mail, Phone, Building2, CheckCircle, Clock, AlertCircle,
  XCircle, Send, RefreshCw, Trash2, Eye, Ban, UserCheck,
  TrendingUp, MessageSquare, ChevronDown, X, ArrowUpRight,
  DollarSign, Activity, Tag,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useCpPermissions, useCpSummary, useCpActivity,
  useCpCustomers, useCpInvoices, useCpTickets, useCpTicketMessages,
  useCreateCpCustomer, useUpdateCpCustomer, useDeleteCpCustomer,
  useInviteCpCustomer, useToggleCpCustomer,
  useCreateCpInvoice, useUpdateCpInvoice, useDeleteCpInvoice,
  useCreateCpTicket, useUpdateCpTicket, useAddCpTicketMessage,
  CP_CUSTOMER_STATUSES, CP_INVOICE_STATUSES, CP_TICKET_STATUSES,
  CP_TICKET_PRIORITIES, CP_TICKET_CATEGORIES, CP_AVATAR_COLORS,
  type CpCustomer, type CpInvoice, type CpTicket,
  type CpCustomerStatus, type CpInvoiceStatus, type CpTicketStatus,
  type CpTicketPriority, type CpTicketCategory, type CpAvatarColor,
} from '@/hooks/useCustomerPortal';

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  active:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive:    'bg-white/5 text-white/40 border-white/10',
  pending:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
  draft:       'bg-white/5 text-white/50 border-white/10',
  sent:        'bg-blue-500/15 text-blue-400 border-blue-500/20',
  viewed:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  paid:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  overdue:     'bg-red-500/15 text-red-400 border-red-500/20',
  open:        'bg-blue-500/15 text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  resolved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed:      'bg-white/5 text-white/40 border-white/10',
};

const priorityStyle: Record<string, string> = {
  low:    'bg-white/5 text-white/40 border-white/10',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  high:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  urgent: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const avatarBg: Record<string, string> = {
  blue:    'from-blue-500 to-blue-700',
  emerald: 'from-emerald-500 to-emerald-700',
  amber:   'from-amber-500 to-amber-700',
  purple:  'from-purple-500 to-purple-700',
  rose:    'from-rose-500 to-rose-700',
  cyan:    'from-cyan-500 to-cyan-700',
  orange:  'from-orange-500 to-orange-700',
  slate:   'from-slate-500 to-slate-700',
};

const colorDot: Record<string, string> = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  purple:  'bg-purple-500',
  rose:    'bg-rose-500',
  cyan:    'bg-cyan-500',
  orange:  'bg-orange-500',
  slate:   'bg-slate-500',
};

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-white/40 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Customer Form Dialog ───────────────────────────────────────────────────────

function CustomerFormDialog({
  open, onClose, initial,
}: { open: boolean; onClose: () => void; initial?: CpCustomer | null }) {
  const { toast } = useToast();
  const create = useCreateCpCustomer();
  const update = useUpdateCpCustomer();
  const [name,         setName]         = useState(initial?.name ?? '');
  const [email,        setEmail]        = useState(initial?.email ?? '');
  const [company,      setCompany]      = useState(initial?.company ?? '');
  const [phone,        setPhone]        = useState(initial?.phone ?? '');
  const [status,       setStatus]       = useState<CpCustomerStatus>(initial?.status ?? 'pending');
  const [avatarColor,  setAvatarColor]  = useState<CpAvatarColor>(initial?.avatarColor ?? 'blue');
  const [notes,        setNotes]        = useState(initial?.notes ?? '');

  const busy = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Name and email are required', variant: 'destructive' }); return;
    }
    const payload = { name: name.trim(), email: email.trim(), company: company || undefined,
      phone: phone || undefined, status, avatarColor, notes: notes || undefined };
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, data: payload });
        toast({ title: 'Customer updated' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Customer added' });
      }
      onClose();
    } catch {
      toast({ title: 'Failed to save customer', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription className="text-white/40">
            {initial ? 'Update customer portal account' : 'Create a new customer portal account'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Full Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Okonkwo"
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Email *</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="sarah@example.com"
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Company</Label>
                  <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company name"
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as CpCustomerStatus)}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  {CP_CUSTOMER_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Avatar Color</Label>
              <div className="flex gap-2 flex-wrap pt-1">
                {CP_AVATAR_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setAvatarColor(c)}
                    className={`w-6 h-6 rounded-full ${colorDot[c]} ring-2 ring-offset-1 ring-offset-[#0d1117] transition-all ${avatarColor === c ? 'ring-white' : 'ring-transparent'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Internal notes about this customer…"
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {initial ? 'Update' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Invoice Form Dialog ────────────────────────────────────────────────────────

function InvoiceFormDialog({
  open, onClose, initial, customers,
}: { open: boolean; onClose: () => void; initial?: CpInvoice | null; customers: CpCustomer[] }) {
  const { toast } = useToast();
  const create = useCreateCpInvoice();
  const update = useUpdateCpInvoice();
  const [customerId,   setCustomerId]   = useState(initial?.customerId ? String(initial.customerId) : '');
  const [invoiceDate,  setInvoiceDate]  = useState(initial?.invoiceDate ?? new Date().toISOString().split('T')[0]);
  const [dueDate,      setDueDate]      = useState(initial?.dueDate ?? '');
  const [amount,       setAmount]       = useState(initial?.amount ?? '');
  const [currency,     setCurrency]     = useState(initial?.currency ?? 'INR');
  const [status,       setStatus]       = useState<CpInvoiceStatus>(initial?.status ?? 'draft');
  const [description,  setDescription]  = useState(initial?.description ?? '');
  const [notes,        setNotes]        = useState(initial?.notes ?? '');

  const busy = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !invoiceDate || !amount) {
      toast({ title: 'Customer, date and amount are required', variant: 'destructive' }); return;
    }
    const payload = {
      customerId: parseInt(customerId), invoiceDate, dueDate: dueDate || undefined,
      amount, currency, status, description: description || undefined, notes: notes || undefined,
    };
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, data: { ...payload, customerId: undefined } as never });
        toast({ title: 'Invoice updated' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Invoice created' });
      }
      onClose();
    } catch {
      toast({ title: 'Failed to save invoice', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
          <DialogDescription className="text-white/40">Share an invoice with a portal customer</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId} disabled={!!initial}>
              <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                className="bg-white/[0.05] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="bg-white/[0.05] border-white/[0.08] text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  {['INR', 'USD', 'EUR', 'GBP'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as CpInvoiceStatus)}>
              <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                {CP_INVOICE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Services rendered for Q2 2026…"
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Payment terms, bank details…"
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {initial ? 'Update' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Ticket Form Dialog ─────────────────────────────────────────────────────────

function TicketFormDialog({
  open, onClose, customers,
}: { open: boolean; onClose: () => void; customers: CpCustomer[] }) {
  const { toast } = useToast();
  const create = useCreateCpTicket();
  const [customerId,  setCustomerId]  = useState('');
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<CpTicketCategory>('general');
  const [priority,    setPriority]    = useState<CpTicketPriority>('medium');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !subject.trim()) {
      toast({ title: 'Customer and subject are required', variant: 'destructive' }); return;
    }
    try {
      await create.mutateAsync({
        customerId: parseInt(customerId), subject: subject.trim(),
        description: description || undefined, category, priority,
      });
      toast({ title: 'Ticket created' });
      onClose();
    } catch {
      toast({ title: 'Failed to create ticket', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
          <DialogDescription className="text-white/40">Create a new support request from a customer</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Subject *</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Issue with invoice payment…"
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as CpTicketCategory)}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  {CP_TICKET_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as CpTicketPriority)}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  {CP_TICKET_PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Describe the issue in detail…"
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {create.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Ticket Thread Dialog ───────────────────────────────────────────────────────

function TicketThreadDialog({
  ticket, open, onClose,
}: { ticket: CpTicket | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const updateTicket = useUpdateCpTicket();
  const addMessage   = useAddCpTicketMessage();
  const { data: msgsData } = useCpTicketMessages(ticket?.id ?? null);
  const messages = msgsData?.data ?? [];
  const [reply, setReply] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !ticket) return;
    try {
      await addMessage.mutateAsync({
        ticketId: ticket.id,
        data: { senderType: 'staff', senderName: 'Support Team', message: reply.trim() },
      });
      setReply('');
    } catch {
      toast({ title: 'Failed to send reply', variant: 'destructive' });
    }
  }

  async function changeStatus(status: CpTicketStatus) {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({ id: ticket.id, data: { status } });
      toast({ title: `Ticket ${status}` });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  }

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-base">{ticket.ticketNumber}: {ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-white/40">{ticket.customerName}</span>
                <span className="text-white/20">·</span>
                <Badge className={`${priorityStyle[ticket.priority]} border text-[10px] px-1.5 py-0 capitalize`}>{ticket.priority}</Badge>
                <Badge className={`${statusStyle[ticket.status]} border text-[10px] px-1.5 py-0 capitalize`}>{ticket.status.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {ticket.status !== 'resolved' && (
                <Button size="sm" variant="ghost" onClick={() => changeStatus('resolved')}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs h-7 px-2">
                  <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                </Button>
              )}
              {ticket.status !== 'closed' && (
                <Button size="sm" variant="ghost" onClick={() => changeStatus('closed')}
                  className="text-white/40 hover:text-white/70 text-xs h-7 px-2">
                  <XCircle className="w-3 h-3 mr-1" /> Close
                </Button>
              )}
              {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                <Button size="sm" variant="ghost" onClick={() => changeStatus('open')}
                  className="text-blue-400 hover:text-blue-300 text-xs h-7 px-2">
                  <RefreshCw className="w-3 h-3 mr-1" /> Reopen
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        {ticket.description && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-sm text-white/60 flex-shrink-0">
            {ticket.description}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
          {messages.length === 0 && (
            <p className="text-center text-white/30 text-sm py-6">No replies yet</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.senderType === 'staff' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white
                ${msg.senderType === 'staff' ? 'bg-gradient-to-br from-[#2563EB] to-[#06B6D4]' : 'bg-gradient-to-br from-purple-500 to-purple-700'}`}>
                {initials(msg.senderName)}
              </div>
              <div className={`max-w-[75%] ${msg.senderType === 'staff' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-xl px-3 py-2 text-sm ${
                  msg.senderType === 'staff'
                    ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/20'
                    : 'bg-white/[0.06] text-white/80 border border-white/[0.07]'
                }`}>
                  {msg.message}
                </div>
                <p className="text-[10px] text-white/25">{msg.senderName} · {timeAgo(msg.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply */}
        <form onSubmit={handleSend} className="flex gap-2 flex-shrink-0 border-t border-white/[0.07] pt-3">
          <Input value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Type a reply…"
            className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 flex-1" />
          <Button type="submit" disabled={!reply.trim() || addMessage.isPending}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-3">
            {addMessage.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerPortalPage() {
  const { toast } = useToast();
  const { data: permsData } = useCpPermissions();
  const { data: summaryData } = useCpSummary();
  const { data: activityData } = useCpActivity(15);
  const perms   = permsData?.data;
  const summary = summaryData?.data;
  const activity = activityData?.data ?? [];

  const [tab,           setTab]           = useState('overview');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatus, setCustomerStatus] = useState('');
  const [invoiceSearch,  setInvoiceSearch]  = useState('');
  const [invoiceStatus,  setInvoiceStatus]  = useState('');
  const [ticketSearch,   setTicketSearch]   = useState('');
  const [ticketStatus,   setTicketStatus]   = useState('');
  const [ticketPriority, setTicketPriority] = useState('');

  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [editCustomer,     setEditCustomer]     = useState<CpCustomer | null>(null);
  const [invoiceFormOpen,  setInvoiceFormOpen]  = useState(false);
  const [editInvoice,      setEditInvoice]      = useState<CpInvoice | null>(null);
  const [ticketFormOpen,   setTicketFormOpen]   = useState(false);
  const [threadTicket,     setThreadTicket]     = useState<CpTicket | null>(null);

  const { data: customersData } = useCpCustomers(
    customerSearch || customerStatus ? { search: customerSearch, status: customerStatus } : undefined,
  );
  const { data: invoicesData } = useCpInvoices(
    invoiceSearch || invoiceStatus ? { search: invoiceSearch, status: invoiceStatus } : undefined,
  );
  const { data: ticketsData } = useCpTickets(
    ticketSearch || ticketStatus || ticketPriority
      ? { search: ticketSearch, status: ticketStatus, priority: ticketPriority }
      : undefined,
  );

  const customers = customersData?.data ?? [];
  const invoices  = invoicesData?.data ?? [];
  const tickets   = ticketsData?.data ?? [];

  const deleteCustomer = useDeleteCpCustomer();
  const invite         = useInviteCpCustomer();
  const toggle         = useToggleCpCustomer();
  const deleteInvoice  = useDeleteCpInvoice();
  const updateInvoice  = useUpdateCpInvoice();
  const updateTicket   = useUpdateCpTicket();

  async function handleDeleteCustomer(id: number) {
    try {
      await deleteCustomer.mutateAsync(id);
      toast({ title: 'Customer removed' });
    } catch {
      toast({ title: 'Failed to remove customer', variant: 'destructive' });
    }
  }

  async function handleInvite(id: number) {
    try {
      await invite.mutateAsync(id);
      toast({ title: 'Invite sent — portal access activated' });
    } catch {
      toast({ title: 'Failed to send invite', variant: 'destructive' });
    }
  }

  async function handleToggle(id: number) {
    try {
      await toggle.mutateAsync(id);
      toast({ title: 'Portal access updated' });
    } catch {
      toast({ title: 'Failed to toggle access', variant: 'destructive' });
    }
  }

  async function handleDeleteInvoice(id: number) {
    try {
      await deleteInvoice.mutateAsync(id);
      toast({ title: 'Invoice deleted' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete invoice';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  async function handleMarkInvoicePaid(id: number) {
    try {
      await updateInvoice.mutateAsync({ id, data: { status: 'paid' } });
      toast({ title: 'Invoice marked as paid' });
    } catch {
      toast({ title: 'Failed to update invoice', variant: 'destructive' });
    }
  }

  async function handleTicketStatus(id: number, status: CpTicketStatus) {
    try {
      await updateTicket.mutateAsync({ id, data: { status } });
      toast({ title: `Ticket ${status.replace('_', ' ')}` });
    } catch {
      toast({ title: 'Failed to update ticket', variant: 'destructive' });
    }
  }

  const activityIcon: Record<string, React.ElementType> = {
    customer_joined:  UserCheck,
    invoice_updated:  FileText,
    ticket_updated:   LifeBuoy,
    ticket_message:   MessageSquare,
  };
  const activityColor: Record<string, string> = {
    customer_joined:  'bg-emerald-500/20 text-emerald-400',
    invoice_updated:  'bg-blue-500/20 text-blue-400',
    ticket_updated:   'bg-amber-500/20 text-amber-400',
    ticket_message:   'bg-purple-500/20 text-purple-400',
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Portals' }, { label: 'Customer Portal', path: '/app/customer-portal' }]}>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
            <p className="text-sm text-white/40 mt-0.5">Manage customer access, invoices, and support tickets</p>
          </div>
          <div className="flex gap-2">
            {perms?.canCreate && (
              <>
                <Button onClick={() => { setTicketFormOpen(true); }}
                  variant="ghost" className="border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.05]">
                  <LifeBuoy className="w-4 h-4 mr-1.5" /> New Ticket
                </Button>
                <Button onClick={() => { setInvoiceFormOpen(true); setEditInvoice(null); }}
                  variant="ghost" className="border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.05]">
                  <FileText className="w-4 h-4 mr-1.5" /> New Invoice
                </Button>
                <Button onClick={() => { setCustomerFormOpen(true); setEditCustomer(null); }}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Customer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <SummaryCard icon={Users}      label="Total Customers"   value={summary?.totalCustomers ?? 0}  color="bg-blue-500/20" />
          <SummaryCard icon={UserCheck}  label="Active Customers"  value={summary?.activeCustomers ?? 0} color="bg-emerald-500/20" />
          <SummaryCard icon={FileText}   label="Total Invoices"    value={summary?.totalInvoices ?? 0}   color="bg-cyan-500/20" />
          <SummaryCard icon={DollarSign} label="Outstanding"
            value={`₹${fmt(summary?.outstanding ?? '0')}`} color="bg-amber-500/20" />
          <SummaryCard icon={LifeBuoy}   label="Open Tickets"      value={summary?.openTickets ?? 0}     color="bg-rose-500/20" />
          <SummaryCard icon={CheckCircle} label="Resolved Tickets" value={summary?.resolvedTickets ?? 0} color="bg-purple-500/20" />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/[0.04] border border-white/[0.07]">
            <TabsTrigger value="overview"  className="data-[state=active]:bg-[#2563EB]/20 data-[state=active]:text-[#2563EB]">Overview</TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-[#2563EB]/20 data-[state=active]:text-[#2563EB]">
              Customers {customers.length > 0 && <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{customers.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="invoices"  className="data-[state=active]:bg-[#2563EB]/20 data-[state=active]:text-[#2563EB]">
              Invoices {invoices.length > 0 && <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{invoices.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="tickets"   className="data-[state=active]:bg-[#2563EB]/20 data-[state=active]:text-[#2563EB]">
              Support {tickets.length > 0 && <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{tickets.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ─────────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Feed */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
                  <Activity className="w-4 h-4 text-white/30" />
                </div>
                <div className="space-y-3">
                  {activity.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-8">No activity yet</p>
                  )}
                  {activity.map(event => {
                    const Icon = activityIcon[event.type] ?? Activity;
                    return (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${activityColor[event.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 truncate">{event.label}</p>
                          <p className="text-xs text-white/30 truncate">{event.sub}</p>
                        </div>
                        <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo(event.at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick stats — top customers by outstanding */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">Customer Overview</h3>
                  <TrendingUp className="w-4 h-4 text-white/30" />
                </div>
                {customers.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-8">No customers yet</p>
                )}
                <div className="space-y-2">
                  {customers.slice(0, 6).map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarBg[c.avatarColor] ?? avatarBg.blue} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{c.name}</p>
                        <p className="text-xs text-white/30 truncate">{c.company ?? c.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge className={`${statusStyle[c.status]} border text-[10px] px-1.5 capitalize`}>{c.status}</Badge>
                        {Number(c.outstanding) > 0 && (
                          <p className="text-xs text-amber-400 mt-0.5">₹{fmt(c.outstanding)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Customers ────────────────────────────────────────────────────── */}
          <TabsContent value="customers" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search customers…"
                  className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
              </div>
              <Select value={customerStatus || 'all'} onValueChange={v => setCustomerStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  <SelectItem value="all">All status</SelectItem>
                  {CP_CUSTOMER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Customer</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Status</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium text-xs hidden lg:table-cell">Invoices</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium text-xs hidden lg:table-cell">Outstanding</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium text-xs hidden lg:table-cell">Tickets</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-white/30">No customers found</td></tr>
                  )}
                  {customers.map(c => (
                    <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarBg[c.avatarColor] ?? avatarBg.blue} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                            {initials(c.name)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{c.name}</p>
                            <p className="text-xs text-white/30">{c.customerCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-white/70 text-xs">{c.email}</p>
                        {c.company && <p className="text-white/30 text-xs">{c.company}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusStyle[c.status]} border text-[10px] px-1.5 capitalize`}>{c.status}</Badge>
                        {!c.portalEnabled && (
                          <p className="text-[10px] text-white/30 mt-0.5">Portal disabled</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-white/60 text-xs">{c.invoiceCount}</td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-xs">
                        {Number(c.outstanding) > 0
                          ? <span className="text-amber-400">₹{fmt(c.outstanding)}</span>
                          : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-xs">
                        {c.openTickets > 0
                          ? <span className="text-rose-400">{c.openTickets} open</span>
                          : <span className="text-white/30">{c.ticketCount}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-white/30 hover:text-white hover:bg-white/[0.05]">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white w-44">
                            {perms?.canEdit && (
                              <>
                                <DropdownMenuItem onClick={() => { setEditCustomer(c); setCustomerFormOpen(true); }}
                                  className="hover:bg-white/[0.05] cursor-pointer text-xs">
                                  <Eye className="w-3.5 h-3.5 mr-2" /> Edit Customer
                                </DropdownMenuItem>
                                {!c.inviteSentAt && (
                                  <DropdownMenuItem onClick={() => handleInvite(c.id)}
                                    className="hover:bg-white/[0.05] cursor-pointer text-xs">
                                    <Mail className="w-3.5 h-3.5 mr-2" /> Send Invite
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleToggle(c.id)}
                                  className="hover:bg-white/[0.05] cursor-pointer text-xs">
                                  {c.portalEnabled
                                    ? <><Ban className="w-3.5 h-3.5 mr-2" /> Disable Access</>
                                    : <><UserCheck className="w-3.5 h-3.5 mr-2" /> Enable Access</>}
                                </DropdownMenuItem>
                              </>
                            )}
                            {perms?.canDelete && (
                              <>
                                <DropdownMenuSeparator className="bg-white/[0.07]" />
                                <DropdownMenuItem onClick={() => handleDeleteCustomer(c.id)}
                                  className="hover:bg-white/[0.05] cursor-pointer text-red-400 text-xs">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
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
            </div>
          </TabsContent>

          {/* ── Invoices ─────────────────────────────────────────────────────── */}
          <TabsContent value="invoices" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)}
                  placeholder="Search invoices…"
                  className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
              </div>
              <Select value={invoiceStatus || 'all'} onValueChange={v => setInvoiceStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  <SelectItem value="all">All status</SelectItem>
                  {CP_INVOICE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Invoice</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs hidden md:table-cell">Customer</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs hidden lg:table-cell">Date / Due</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium text-xs">Amount</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Status</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-white/30">No invoices found</td></tr>
                  )}
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-white/80 text-xs">{inv.invoiceNumber}</p>
                        {inv.description && <p className="text-[11px] text-white/30 truncate max-w-[160px]">{inv.description}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-white/70 text-xs">{inv.customerName}</p>
                        {inv.customerCompany && <p className="text-white/30 text-[11px]">{inv.customerCompany}</p>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-white/60 text-xs">{fmtDate(inv.invoiceDate)}</p>
                        {inv.dueDate && <p className="text-white/30 text-[11px]">Due {fmtDate(inv.dueDate)}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-white font-medium text-sm">{inv.currency} {fmt(inv.amount)}</p>
                        {Number(inv.paidAmount) > 0 && Number(inv.paidAmount) < Number(inv.amount) && (
                          <p className="text-[11px] text-emerald-400">Paid {fmt(inv.paidAmount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusStyle[inv.status]} border text-[10px] px-1.5 capitalize`}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-white/30 hover:text-white hover:bg-white/[0.05]">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white w-44">
                            {perms?.canEdit && (
                              <>
                                <DropdownMenuItem onClick={() => { setEditInvoice(inv); setInvoiceFormOpen(true); }}
                                  className="hover:bg-white/[0.05] cursor-pointer text-xs">
                                  <Eye className="w-3.5 h-3.5 mr-2" /> Edit Invoice
                                </DropdownMenuItem>
                                {inv.status !== 'paid' && (
                                  <DropdownMenuItem onClick={() => handleMarkInvoicePaid(inv.id)}
                                    className="hover:bg-white/[0.05] cursor-pointer text-xs text-emerald-400">
                                    <CheckCircle className="w-3.5 h-3.5 mr-2" /> Mark Paid
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {perms?.canDelete && (
                              <>
                                <DropdownMenuSeparator className="bg-white/[0.07]" />
                                <DropdownMenuItem onClick={() => handleDeleteInvoice(inv.id)}
                                  className="hover:bg-white/[0.05] cursor-pointer text-red-400 text-xs">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
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
            </div>
          </TabsContent>

          {/* ── Support Tickets ───────────────────────────────────────────────── */}
          <TabsContent value="tickets" className="mt-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={ticketSearch} onChange={e => setTicketSearch(e.target.value)}
                  placeholder="Search tickets…"
                  className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
              </div>
              <Select value={ticketStatus || 'all'} onValueChange={v => setTicketStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  <SelectItem value="all">All status</SelectItem>
                  {CP_TICKET_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ticketPriority || 'all'} onValueChange={v => setTicketPriority(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white h-8 text-sm w-36">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08] text-white">
                  <SelectItem value="all">All priority</SelectItem>
                  {CP_TICKET_PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {tickets.length === 0 && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl py-12 text-center text-white/30">No tickets found</div>
              )}
              {tickets.map(t => (
                <motion.div key={t.id} layout
                  className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  onClick={() => setThreadTicket(t)}>
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${
                    t.priority === 'urgent' ? 'bg-red-500' :
                    t.priority === 'high'   ? 'bg-amber-500' :
                    t.priority === 'medium' ? 'bg-blue-500' : 'bg-white/20'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-white/40 text-xs">{t.ticketNumber}</span>
                      <Badge className={`${statusStyle[t.status]} border text-[10px] px-1.5 capitalize`}>{t.status.replace('_', ' ')}</Badge>
                      <Badge className={`${priorityStyle[t.priority]} border text-[10px] px-1.5 capitalize`}>{t.priority}</Badge>
                      <Badge className="bg-white/5 text-white/40 border border-white/10 text-[10px] px-1.5 capitalize">{t.category}</Badge>
                    </div>
                    <p className="text-sm font-medium text-white mt-0.5 truncate">{t.subject}</p>
                    <p className="text-xs text-white/30">{t.customerName}{t.customerCompany ? ` · ${t.customerCompany}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {t.messageCount > 0 && (
                      <div className="flex items-center gap-1 text-white/30 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {t.messageCount}
                      </div>
                    )}
                    <span className="text-[11px] text-white/25">{timeAgo(t.updatedAt)}</span>
                    {perms?.canEdit && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {t.status === 'open' && (
                          <Button size="sm" variant="ghost" onClick={() => handleTicketStatus(t.id, 'in_progress')}
                            className="h-6 px-2 text-[10px] text-amber-400 hover:bg-amber-500/10">In Progress</Button>
                        )}
                        {(t.status === 'open' || t.status === 'in_progress') && (
                          <Button size="sm" variant="ghost" onClick={() => handleTicketStatus(t.id, 'resolved')}
                            className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10">Resolve</Button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CustomerFormDialog
        open={customerFormOpen}
        onClose={() => { setCustomerFormOpen(false); setEditCustomer(null); }}
        initial={editCustomer}
      />
      <InvoiceFormDialog
        open={invoiceFormOpen}
        onClose={() => { setInvoiceFormOpen(false); setEditInvoice(null); }}
        initial={editInvoice}
        customers={customers}
      />
      <TicketFormDialog
        open={ticketFormOpen}
        onClose={() => setTicketFormOpen(false)}
        customers={customers}
      />
      <TicketThreadDialog
        ticket={threadTicket}
        open={!!threadTicket}
        onClose={() => setThreadTicket(null)}
      />
    </AppLayout>
  );
}
