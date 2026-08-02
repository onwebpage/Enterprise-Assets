import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Factory, TrendingUp, CheckCircle, AlertCircle, Plus, Download, Search,
  MoreHorizontal, Settings, Zap, Play, Pencil, Trash2, X, Loader2,
  ChevronDown, Package, Wrench,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useMfgPermissions, useMfgSummary,
  useMfgWorkCenters, useCreateWorkCenter, useUpdateWorkCenter, useDeleteWorkCenter,
  useMfgBOMs, useMfgBOM, useCreateBOM, useUpdateBOM, useDeleteBOM,
  useMfgWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder,
  MFG_WORK_CENTER_STATUSES, MFG_WORK_CENTER_TYPES,
  MFG_BOM_STATUSES, MFG_WO_STATUSES, MFG_WO_PRIORITIES,
  type MfgWorkCenter, type MfgBOM, type MfgBOMLine, type MfgWorkOrder,
  type InsertWorkCenter, type InsertBOM, type InsertBOMLine, type InsertWorkOrder,
} from '@/hooks/useManufacturing';

// ── Style maps ────────────────────────────────────────────────────────────────

const woStatusStyle: Record<string, string> = {
  planned:     'bg-white/5 text-white/50 border-white/10',
  scheduled:   'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  done:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  cancelled:   'bg-red-500/15 text-red-400 border-red-500/20',
};

const wcStatusStyle: Record<string, string> = {
  active:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  idle:        'bg-white/5 text-white/50 border-white/10',
  maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  inactive:    'bg-red-500/15 text-red-400 border-red-500/20',
};

const bomStatusStyle: Record<string, string> = {
  draft:    'bg-white/5 text-white/50 border-white/10',
  active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  archived: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const priorityStyle: Record<string, string> = {
  low:    'bg-white/5 text-white/40 border-white/10',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  high:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  urgent: 'bg-red-500/15 text-red-400 border-red-500/20',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | undefined | null) {
  if (!v) return '0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 10_00_000)   return `${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function EmptyState({ icon: Icon, title, sub, action }: { icon: React.ElementType; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
      <Icon className="w-12 h-12 text-white/20 mx-auto mb-3" />
      <p className="text-white/50 font-medium">{title}</p>
      <p className="text-white/30 text-sm mt-1">{sub}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Work Center Form ──────────────────────────────────────────────────────────

interface WCFormProps {
  open: boolean;
  onClose: () => void;
  initial?: MfgWorkCenter | null;
}

function WorkCenterForm({ open, onClose, initial }: WCFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const create = useCreateWorkCenter();
  const update = useUpdateWorkCenter();
  const busy = create.isPending || update.isPending;

  const [f, setF] = useState<InsertWorkCenter>(() => initial
    ? { code: initial.code, name: initial.name, type: initial.type, description: initial.description ?? '', capacity: initial.capacity, costPerHour: initial.costPerHour, operator: initial.operator ?? '', status: initial.status, notes: initial.notes ?? '' }
    : { code: '', name: '', type: 'machine', description: '', capacity: '1', costPerHour: '0', operator: '', status: 'active', notes: '' });

  const set = (k: keyof InsertWorkCenter) => (v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial!.id, data: f });
        toast({ title: 'Work center updated' });
      } else {
        await create.mutateAsync(f);
        toast({ title: 'Work center created' });
      }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Work Center' : 'New Work Center'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Code *</Label>
              <Input value={f.code} onChange={e => set('code')(e.target.value)} placeholder="CNC-01" required className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Name *</Label>
              <Input value={f.name} onChange={e => set('name')(e.target.value)} placeholder="CNC Machining Center" required className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Type</Label>
              <Select value={f.type} onValueChange={set('type')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {MFG_WORK_CENTER_TYPES.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Status</Label>
              <Select value={f.status} onValueChange={set('status')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {MFG_WORK_CENTER_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Capacity (units/hr)</Label>
              <Input type="number" min="0" step="0.01" value={f.capacity} onChange={e => set('capacity')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Cost / Hour (₹)</Label>
              <Input type="number" min="0" step="0.01" value={f.costPerHour} onChange={e => set('costPerHour')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Operator</Label>
            <Input value={f.operator ?? ''} onChange={e => set('operator')(e.target.value)} placeholder="Operator name" className="bg-white/[0.04] border-white/[0.08] text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Notes</Label>
            <Textarea value={f.notes ?? ''} onChange={e => set('notes')(e.target.value)} rows={2} className="bg-white/[0.04] border-white/[0.08] text-white resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Work Center'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── BOM Form ──────────────────────────────────────────────────────────────────

interface BOMFormProps {
  open: boolean;
  onClose: () => void;
  initial?: MfgBOM | null;
}

function BOMForm({ open, onClose, initial }: BOMFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const create = useCreateBOM();
  const update = useUpdateBOM();
  const busy = create.isPending || update.isPending;

  const [f, setF] = useState(() => initial
    ? { productName: initial.productName, productSku: initial.productSku ?? '', outputQty: initial.outputQty, unit: initial.unit, version: initial.version, status: initial.status, notes: initial.notes ?? '' }
    : { productName: '', productSku: '', outputQty: '1', unit: 'each', version: '1.0', status: 'draft' as const, notes: '' });

  const [lines, setLines] = useState<InsertBOMLine[]>(() =>
    initial?.lines?.map(l => ({ sequence: l.sequence, componentName: l.componentName, componentSku: l.componentSku ?? '', qty: l.qty, unit: l.unit, notes: l.notes ?? '' })) ?? []);

  const addLine = () => setLines(p => [...p, { sequence: p.length + 1, componentName: '', componentSku: '', qty: '1', unit: 'each', notes: '' }]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));
  const setLine = (i: number, k: keyof InsertBOMLine) => (v: string) =>
    setLines(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: InsertBOM = { ...f, lines };
      if (isEdit) {
        await update.mutateAsync({ id: initial!.id, data: payload });
        toast({ title: 'BOM updated' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'BOM created' });
      }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit BOM' : 'New Bill of Materials'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Product Name *</Label>
              <Input value={f.productName} onChange={e => setF(p => ({ ...p, productName: e.target.value }))} placeholder="Servo Assembly X200" required className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Product SKU</Label>
              <Input value={f.productSku} onChange={e => setF(p => ({ ...p, productSku: e.target.value }))} placeholder="SKU-001" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Output Qty</Label>
              <Input type="number" min="0.0001" step="any" value={f.outputQty} onChange={e => setF(p => ({ ...p, outputQty: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Unit</Label>
              <Input value={f.unit} onChange={e => setF(p => ({ ...p, unit: e.target.value }))} placeholder="each" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Version</Label>
              <Input value={f.version} onChange={e => setF(p => ({ ...p, version: e.target.value }))} placeholder="1.0" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Status</Label>
              <Select value={f.status} onValueChange={v => setF(p => ({ ...p, status: v as any }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {MFG_BOM_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Notes</Label>
              <Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-white/60 text-xs font-medium">Components ({lines.length})</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLine} className="h-7 text-xs border-white/[0.1] bg-transparent text-white/60 hover:text-white">
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
            {lines.length === 0 && (
              <p className="text-white/30 text-xs text-center py-4 border border-dashed border-white/[0.07] rounded-lg">No components yet. Click Add to define raw materials.</p>
            )}
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_70px_auto] gap-2 mb-2 items-center">
                <Input value={line.componentName} onChange={e => setLine(i, 'componentName')(e.target.value)} placeholder="Component name" required className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-8" />
                <Input type="number" min="0.0001" step="any" value={line.qty} onChange={e => setLine(i, 'qty')(e.target.value)} placeholder="Qty" required className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-8" />
                <Input value={line.unit ?? 'each'} onChange={e => setLine(i, 'unit')(e.target.value)} placeholder="unit" className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-8" />
                <button type="button" onClick={() => removeLine(i)} className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create BOM'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Work Order Form ───────────────────────────────────────────────────────────

interface WOFormProps {
  open: boolean;
  onClose: () => void;
  initial?: MfgWorkOrder | null;
}

function WorkOrderForm({ open, onClose, initial }: WOFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const create = useCreateWorkOrder();
  const update = useUpdateWorkOrder();
  const busy = create.isPending || update.isPending;
  const { data: bomsRes } = useMfgBOMs();
  const { data: wcsRes } = useMfgWorkCenters();
  const boms = bomsRes?.data ?? [];
  const wcs  = wcsRes?.data ?? [];

  const [f, setF] = useState<InsertWorkOrder & { producedQty?: string }>(() => initial
    ? { bomId: initial.bomId ?? undefined, productName: initial.productName, workCenterId: initial.workCenterId ?? undefined, plannedQty: initial.plannedQty, producedQty: initial.producedQty, priority: initial.priority, status: initial.status, plannedStartDate: initial.plannedStartDate ?? '', plannedEndDate: initial.plannedEndDate ?? '', notes: initial.notes ?? '' }
    : { productName: '', plannedQty: '1', priority: 'medium', status: 'planned', notes: '' });

  const set = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...f,
        bomId: f.bomId || undefined,
        workCenterId: f.workCenterId || undefined,
        plannedStartDate: f.plannedStartDate || null,
        plannedEndDate: f.plannedEndDate || null,
      };
      if (isEdit) {
        await update.mutateAsync({ id: initial!.id, data: payload });
        toast({ title: 'Work order updated' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Work order created' });
      }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Work Order' : 'New Work Order'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Product Name *</Label>
            <Input value={f.productName} onChange={e => set('productName')(e.target.value)} placeholder="Servo Assembly X200" required className="bg-white/[0.04] border-white/[0.08] text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">BOM</Label>
              <Select value={String(f.bomId ?? '')} onValueChange={v => set('bomId')(v ? parseInt(v) : undefined)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue placeholder="Select BOM" /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  <SelectItem value="" className="text-white/40">None</SelectItem>
                  {boms.map(b => <SelectItem key={b.id} value={String(b.id)} className="text-white">{b.bomNumber} — {b.productName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Work Center</Label>
              <Select value={String(f.workCenterId ?? '')} onValueChange={v => set('workCenterId')(v ? parseInt(v) : undefined)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue placeholder="Select work center" /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  <SelectItem value="" className="text-white/40">None</SelectItem>
                  {wcs.map(w => <SelectItem key={w.id} value={String(w.id)} className="text-white">{w.code} — {w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Planned Qty *</Label>
              <Input type="number" min="0.0001" step="any" value={f.plannedQty} onChange={e => set('plannedQty')(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Produced Qty</Label>
                <Input type="number" min="0" step="any" value={f.producedQty ?? '0'} onChange={e => set('producedQty')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Priority</Label>
              <Select value={f.priority ?? 'medium'} onValueChange={set('priority')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {MFG_WO_PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Status</Label>
              <Select value={f.status ?? 'planned'} onValueChange={set('status')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {MFG_WO_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Planned Start</Label>
              <Input type="date" value={f.plannedStartDate ?? ''} onChange={e => set('plannedStartDate')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Planned End</Label>
              <Input type="date" value={f.plannedEndDate ?? ''} onChange={e => set('plannedEndDate')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Notes</Label>
            <Textarea value={f.notes ?? ''} onChange={e => set('notes')(e.target.value)} rows={2} className="bg-white/[0.04] border-white/[0.08] text-white resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── BOM Detail Dialog ─────────────────────────────────────────────────────────

function BOMDetailDialog({ id, open, onClose }: { id: number | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useMfgBOM(id);
  const bom = data?.data;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{bom?.bomNumber ?? 'BOM Detail'}</DialogTitle></DialogHeader>
        {isLoading && <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>}
        {bom && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-white/40">Product</span><p className="text-white font-medium mt-0.5">{bom.productName}</p></div>
              <div><span className="text-white/40">SKU</span><p className="text-white mt-0.5">{bom.productSku ?? '—'}</p></div>
              <div><span className="text-white/40">Output Qty</span><p className="text-white mt-0.5">{bom.outputQty} {bom.unit}</p></div>
              <div><span className="text-white/40">Version</span><p className="text-white mt-0.5">v{bom.version}</p></div>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-2 font-medium">Components ({bom.lines?.length ?? 0})</p>
              {!bom.lines?.length
                ? <p className="text-white/30 text-sm">No components defined.</p>
                : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/[0.05]"><th className="text-left text-xs text-white/30 pb-2">Component</th><th className="text-right text-xs text-white/30 pb-2">Qty</th><th className="text-right text-xs text-white/30 pb-2">Unit</th></tr></thead>
                    <tbody>
                      {bom.lines.map(l => (
                        <tr key={l.id} className="border-b border-white/[0.04]">
                          <td className="py-2 text-white/80">{l.componentName}{l.componentSku && <span className="text-white/30 ml-1">({l.componentSku})</span>}</td>
                          <td className="py-2 text-right text-white/60">{l.qty}</td>
                          <td className="py-2 text-right text-white/40">{l.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
            {bom.notes && <div><p className="text-white/40 text-xs mb-1">Notes</p><p className="text-white/70 text-sm">{bom.notes}</p></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Manufacturing() {
  const [tab, setTab] = useState('work-orders');
  const [search, setSearch] = useState('');
  const [wcStatus, setWcStatus] = useState('');
  const [woStatus, setWoStatus] = useState('');
  const [bomStatus, setBomStatus] = useState('');

  // Dialogs
  const [wcForm, setWcForm]       = useState<{ open: boolean; item?: MfgWorkCenter | null }>({ open: false });
  const [bomForm, setBomForm]     = useState<{ open: boolean; item?: MfgBOM | null }>({ open: false });
  const [woForm, setWoForm]       = useState<{ open: boolean; item?: MfgWorkOrder | null }>({ open: false });
  const [bomDetail, setBomDetail] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'wc' | 'bom' | 'wo'; id: number; label: string } | null>(null);

  const { toast } = useToast();
  const { data: permsRes }   = useMfgPermissions();
  const { data: summaryRes, isLoading: summaryLoading } = useMfgSummary();
  const s = summaryRes?.data;
  const p = permsRes?.data ?? { canCreate: true, canEdit: true, canDelete: true };

  const { data: wcRes, isLoading: wcLoading }     = useMfgWorkCenters({ search: tab === 'routings' ? search : '', status: wcStatus || undefined });
  const { data: bomRes, isLoading: bomLoading }   = useMfgBOMs({ search: tab === 'bom' ? search : '', status: bomStatus || undefined });
  const { data: woRes, isLoading: woLoading }     = useMfgWorkOrders({ search: tab === 'work-orders' ? search : '', status: woStatus || undefined });

  const wcs = wcRes?.data ?? [];
  const boms = bomRes?.data ?? [];
  const wos  = woRes?.data ?? [];

  const deleteWC  = useDeleteWorkCenter();
  const deleteBOM = useDeleteBOM();
  const deleteWO  = useDeleteWorkOrder();

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'wc')  await deleteWC.mutateAsync(deleteTarget.id);
      if (deleteTarget.type === 'bom') await deleteBOM.mutateAsync(deleteTarget.id);
      if (deleteTarget.type === 'wo')  await deleteWO.mutateAsync(deleteTarget.id);
      toast({ title: 'Deleted successfully' });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: 'Cannot delete', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
      setDeleteTarget(null);
    }
  }

  const kpis = [
    { label: 'Active Work Orders', value: summaryLoading ? '—' : String(s?.activeWOs ?? 0), sub: s ? `${s.behindSchedule} behind schedule` : '', icon: Factory, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
    { label: 'Units Produced', value: summaryLoading ? '—' : fmt(s?.unitsProduced), sub: 'This month', icon: CheckCircle, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Work Centers', value: summaryLoading ? '—' : String(s?.totalWorkCenters ?? 0), sub: 'Active', icon: Wrench, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
    { label: 'Active BOMs', value: summaryLoading ? '—' : String(s?.activeBOMs ?? 0), sub: 'Configured', icon: Settings, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
  ];

  // Compute WC utilization % as activeWOs / capacity proxy
  const wcWithUtil = wcs.map(wc => ({
    ...wc,
    utilization: wc.status === 'maintenance' ? 0 : wc.status === 'inactive' ? 0 : wc.status === 'idle' ? 0 : Math.min(100, Math.round((wc.activeWOs ?? 0) * 25 + (parseFloat(wc.capacity) > 0 ? 40 : 20))),
  }));

  return (
    <AppLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Manufacturing' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Manufacturing</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {s ? `${s.activeWOs} active WOs · ${s.totalWorkCenters} work centers · ${s.activeBOMs} BOMs` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'work-orders' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setWoForm({ open: true })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New WO
              </Button>
            )}
            {tab === 'bom' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setBomForm({ open: true })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New BOM
              </Button>
            )}
            {tab === 'routings' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setWcForm({ open: true })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Work Center
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
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

        {/* Work Center Status panel */}
        {wcWithUtil.length > 0 && (
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Work Center Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {wcWithUtil.slice(0, 6).map(wc => (
                <div key={wc.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center flex-shrink-0">
                    <Factory className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">{wc.name}</span>
                      <Badge className={`text-[10px] border ${wcStatusStyle[wc.status]} px-2 py-0 ml-2 shrink-0`}>{wc.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={wc.utilization} className="flex-1 h-1.5 bg-white/[0.07]" />
                      <span className="text-xs text-white/40 w-8">{wc.utilization}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={t => { setTab(t); setSearch(''); }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {[['work-orders', 'Work Orders'], ['bom', 'Bill of Materials'], ['routings', 'Work Centers']].map(([v, l]) => (
                <TabsTrigger key={v} value={v} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">{l}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-44" />
              </div>
              {tab === 'work-orders' && (
                <Select value={woStatus} onValueChange={setWoStatus}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-xs w-32">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="" className="text-white/60">All status</SelectItem>
                    {MFG_WO_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {tab === 'bom' && (
                <Select value={bomStatus} onValueChange={setBomStatus}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-xs w-32">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="" className="text-white/60">All status</SelectItem>
                    {MFG_BOM_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {tab === 'routings' && (
                <Select value={wcStatus} onValueChange={setWcStatus}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-xs w-32">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="" className="text-white/60">All status</SelectItem>
                    {MFG_WORK_CENTER_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ── Work Orders ── */}
          <TabsContent value="work-orders" className="mt-4">
            {woLoading
              ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : wos.length === 0
                ? <EmptyState icon={Factory} title="No work orders found" sub="Create a work order to start tracking production" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setWoForm({ open: true })}><Plus className="w-3.5 h-3.5 mr-1.5" />New Work Order</Button> : undefined} />
                : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          {['WO #', 'Product', 'Qty / Progress', 'BOM', 'Work Center', 'Priority', 'Status', 'Due', ''].map(h => (
                            <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {wos.map(wo => {
                          const pct = Math.min(100, (parseFloat(wo.producedQty) / parseFloat(wo.plannedQty)) * 100);
                          const canEdit = wo.status !== 'done' && wo.status !== 'cancelled';
                          const canDel  = wo.status !== 'in_progress' && wo.status !== 'done';
                          return (
                            <tr key={wo.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{wo.woNumber}</td>
                              <td className="px-4 py-3 text-sm text-white/80 max-w-[160px] truncate">{wo.productName}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Progress value={isNaN(pct) ? 0 : pct} className="w-20 h-1.5 bg-white/[0.07]" />
                                  <span className="text-xs text-white/50 whitespace-nowrap">{wo.producedQty}/{wo.plannedQty}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-white/40">{wo.bomNumber ?? '—'}</td>
                              <td className="px-4 py-3 text-xs text-white/50">{wo.workCenterCode ?? '—'}</td>
                              <td className="px-4 py-3"><Badge className={`text-[10px] border ${priorityStyle[wo.priority]} px-2 py-0 capitalize`}>{wo.priority}</Badge></td>
                              <td className="px-4 py-3"><Badge className={`text-[10px] border ${woStatusStyle[wo.status]} px-2 py-0`}>{wo.status.replace('_', ' ')}</Badge></td>
                              <td className="px-4 py-3 text-xs text-white/40">{wo.plannedEndDate ?? '—'}</td>
                              <td className="px-4 py-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white">
                                    {p.canEdit && canEdit && <DropdownMenuItem onClick={() => setWoForm({ open: true, item: wo })} className="hover:bg-white/[0.05] cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>}
                                    {p.canDelete && canDel && (
                                      <>
                                        <DropdownMenuSeparator className="bg-white/[0.05]" />
                                        <DropdownMenuItem onClick={() => setDeleteTarget({ type: 'wo', id: wo.id, label: wo.woNumber })} className="text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
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
                  </div>
                )}
          </TabsContent>

          {/* ── BOM ── */}
          <TabsContent value="bom" className="mt-4">
            {bomLoading
              ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : boms.length === 0
                ? <EmptyState icon={Package} title="No bill of materials found" sub="Define a BOM to specify components needed for production" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setBomForm({ open: true })}><Plus className="w-3.5 h-3.5 mr-1.5" />New BOM</Button> : undefined} />
                : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          {['BOM #', 'Product', 'Output Qty', 'Version', 'Components', 'Status', ''].map(h => (
                            <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {boms.map(bom => (
                          <tr key={bom.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-[#2563EB] cursor-pointer" onClick={() => setBomDetail({ open: true, id: bom.id })}>{bom.bomNumber}</td>
                            <td className="px-4 py-3 text-sm text-white/80">{bom.productName}{bom.productSku && <span className="text-white/30 ml-1 text-xs">({bom.productSku})</span>}</td>
                            <td className="px-4 py-3 text-sm text-white/60">{bom.outputQty} {bom.unit}</td>
                            <td className="px-4 py-3 text-xs text-white/40">v{bom.version}</td>
                            <td className="px-4 py-3 text-sm text-white/60">{bom.lineCount ?? 0}</td>
                            <td className="px-4 py-3"><Badge className={`text-[10px] border ${bomStatusStyle[bom.status]} px-2 py-0 capitalize`}>{bom.status}</Badge></td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white">
                                  <DropdownMenuItem onClick={() => setBomDetail({ open: true, id: bom.id })} className="hover:bg-white/[0.05] cursor-pointer"><Settings className="w-3.5 h-3.5 mr-2" />View Details</DropdownMenuItem>
                                  {p.canEdit && <DropdownMenuItem onClick={() => setBomForm({ open: true, item: bom })} className="hover:bg-white/[0.05] cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>}
                                  {p.canDelete && bom.status !== 'active' && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.05]" />
                                      <DropdownMenuItem onClick={() => setDeleteTarget({ type: 'bom', id: bom.id, label: bom.bomNumber })} className="text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
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
                )}
          </TabsContent>

          {/* ── Work Centers ── */}
          <TabsContent value="routings" className="mt-4">
            {wcLoading
              ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : wcs.length === 0
                ? <EmptyState icon={Wrench} title="No work centers found" sub="Add work centers to represent machines, assembly lines, and labor stations" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setWcForm({ open: true })}><Plus className="w-3.5 h-3.5 mr-1.5" />New Work Center</Button> : undefined} />
                : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          {['Code', 'Name', 'Type', 'Operator', 'Capacity', 'Cost/hr', 'Active WOs', 'Status', ''].map(h => (
                            <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {wcs.map(wc => (
                          <tr key={wc.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{wc.code}</td>
                            <td className="px-4 py-3 text-sm text-white/80">{wc.name}</td>
                            <td className="px-4 py-3 text-xs text-white/50 capitalize">{wc.type}</td>
                            <td className="px-4 py-3 text-xs text-white/50">{wc.operator ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-white/50">{wc.capacity}/hr</td>
                            <td className="px-4 py-3 text-xs text-white/50">₹{parseFloat(wc.costPerHour).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-white/60">{wc.activeWOs ?? 0}</td>
                            <td className="px-4 py-3"><Badge className={`text-[10px] border ${wcStatusStyle[wc.status]} px-2 py-0 capitalize`}>{wc.status}</Badge></td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white">
                                  {p.canEdit && <DropdownMenuItem onClick={() => setWcForm({ open: true, item: wc })} className="hover:bg-white/[0.05] cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>}
                                  {p.canDelete && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.05]" />
                                      <DropdownMenuItem onClick={() => setDeleteTarget({ type: 'wc', id: wc.id, label: wc.name })} className="text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
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
                )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Forms */}
      <WorkCenterForm open={wcForm.open} initial={wcForm.item} onClose={() => setWcForm({ open: false })} />
      <BOMForm open={bomForm.open} initial={bomForm.item} onClose={() => setBomForm({ open: false })} />
      <WorkOrderForm open={woForm.open} initial={woForm.item} onClose={() => setWoForm({ open: false })} />
      <BOMDetailDialog id={bomDetail.id} open={bomDetail.open} onClose={() => setBomDetail({ open: false, id: null })} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0d1117] border-white/[0.08] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'wc' ? 'Work Center' : deleteTarget?.type === 'bom' ? 'BOM' : 'Work Order'}?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Are you sure you want to delete <strong className="text-white">{deleteTarget?.label}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
