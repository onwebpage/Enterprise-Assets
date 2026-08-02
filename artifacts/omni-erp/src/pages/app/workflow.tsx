import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Play, Pause, Plus, Search, MoreHorizontal, CheckCircle,
  Clock, AlertCircle, ArrowRight, Settings, Activity, TrendingUp,
  Bot, Trash2, RefreshCw, ChevronDown, ChevronUp, X, GripVertical,
  Globe, Mail, Bell, Database, GitBranch, Timer, Send,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
  useWfPermissions, useWfSummary, useWfDefinitions, useWfInstances,
  useWfInstance, useCreateWfDefinition, useUpdateWfDefinition,
  useDeleteWfDefinition, useToggleWfDefinition, usePublishWfDefinition,
  useTriggerWfDefinition,
  WF_CATEGORIES, WF_ACTION_TYPES, WF_ACTION_LABELS,
  type WfDefinition, type WfStepData, type WfActionType, type WfCategory,
  type InsertWfDefinition,
} from '@/hooks/useWorkflow';

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  paused:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  draft:     'bg-white/5 text-white/50 border-white/10',
  running:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  failed:    'bg-red-500/15 text-red-400 border-red-500/20',
  cancelled: 'bg-white/5 text-white/40 border-white/10',
};

const categoryColors: Record<string, string> = {
  Finance: 'bg-blue-500/10 text-blue-400',
  Inventory: 'bg-amber-500/10 text-amber-400',
  Sales: 'bg-emerald-500/10 text-emerald-400',
  HR: 'bg-purple-500/10 text-purple-400',
  Tax: 'bg-red-500/10 text-red-400',
  Purchase: 'bg-cyan-500/10 text-cyan-400',
  Manufacturing: 'bg-orange-500/10 text-orange-400',
  Reports: 'bg-indigo-500/10 text-indigo-400',
  General: 'bg-white/5 text-white/50',
};

const actionTypeIcons: Record<string, React.ElementType> = {
  send_notification: Bell,
  send_email: Mail,
  update_record: Database,
  create_record: Plus,
  approve_reject: CheckCircle,
  condition: GitBranch,
  delay: Timer,
  webhook: Globe,
};

function fmtDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Templates (static) ────────────────────────────────────────────────────────

const TEMPLATES: {
  name: string; desc: string; category: WfCategory; icon: React.ElementType;
  steps: Omit<WfStepData, 'id'>[];
}[] = [
  {
    name: 'AP Invoice Auto-Approval',
    desc: 'Automatically approve AP invoices under a threshold and notify the finance team.',
    category: 'Finance',
    icon: CheckCircle,
    steps: [
      { name: 'Check invoice amount', actionType: 'condition', actionConfig: { field: 'amount', operator: 'lt', value: 5000 }, conditionConfig: {}, isEnabled: true },
      { name: 'Auto-approve invoice',  actionType: 'update_record', actionConfig: { entity: 'ap_bill', field: 'status', value: 'approved' }, conditionConfig: {}, isEnabled: true },
      { name: 'Notify finance team',   actionType: 'send_notification', actionConfig: { message: 'Invoice auto-approved' }, conditionConfig: {}, isEnabled: true },
    ],
  },
  {
    name: 'Low Stock Reorder Alert',
    desc: 'Detect low inventory and auto-create a purchase order when stock hits reorder point.',
    category: 'Inventory',
    icon: Activity,
    steps: [
      { name: 'Check stock level',      actionType: 'condition', actionConfig: { field: 'qty_on_hand', operator: 'lte', value: 'reorder_point' }, conditionConfig: {}, isEnabled: true },
      { name: 'Create purchase order',  actionType: 'create_record', actionConfig: { entity: 'purchase_order' }, conditionConfig: {}, isEnabled: true },
      { name: 'Notify procurement',     actionType: 'send_notification', actionConfig: { message: 'Low stock PO created' }, conditionConfig: {}, isEnabled: true },
    ],
  },
  {
    name: 'Monthly Reports Distribution',
    desc: 'Auto-generate and email monthly P&L reports to management.',
    category: 'Reports',
    icon: TrendingUp,
    steps: [
      { name: 'Generate P&L report', actionType: 'create_record', actionConfig: { entity: 'report', type: 'pnl' }, conditionConfig: {}, isEnabled: true },
      { name: 'Email to management', actionType: 'send_email', actionConfig: { to: 'management@company.com', subject: 'Monthly P&L' }, conditionConfig: {}, isEnabled: true },
    ],
  },
  {
    name: 'HR Leave Approval Flow',
    desc: 'Route leave requests to the reporting manager for approval.',
    category: 'HR',
    icon: CheckCircle,
    steps: [
      { name: 'Notify reporting manager', actionType: 'send_notification', actionConfig: { message: 'New leave request pending approval' }, conditionConfig: {}, isEnabled: true },
      { name: 'Wait for approval',        actionType: 'approve_reject',     actionConfig: { timeout_hours: 48 }, conditionConfig: {}, isEnabled: true },
      { name: 'Update leave record',      actionType: 'update_record',      actionConfig: { entity: 'hr_leave' }, conditionConfig: {}, isEnabled: true },
      { name: 'Notify employee',          actionType: 'send_notification',  actionConfig: { message: 'Leave request decision sent' }, conditionConfig: {}, isEnabled: true },
    ],
  },
  {
    name: 'GST Return Reminder',
    desc: 'Send reminders 10 days before GST return due date.',
    category: 'Tax',
    icon: Bot,
    steps: [
      { name: 'Check due date',      actionType: 'condition',         actionConfig: { days_before: 10 }, conditionConfig: {}, isEnabled: true },
      { name: 'Send email reminder', actionType: 'send_email',        actionConfig: { subject: 'GST Return Due Soon' }, conditionConfig: {}, isEnabled: true },
      { name: 'Slack notification',  actionType: 'send_notification', actionConfig: { channel: 'finance-alerts' }, conditionConfig: {}, isEnabled: true },
    ],
  },
  {
    name: 'Customer Follow-up Sequence',
    desc: 'Auto-send follow-up emails after a deal is closed won in CRM.',
    category: 'Sales',
    icon: Send,
    steps: [
      { name: 'Send welcome email',     actionType: 'send_email',       actionConfig: { template: 'welcome' }, conditionConfig: {}, isEnabled: true },
      { name: 'Wait 3 days',            actionType: 'delay',            actionConfig: { days: 3 }, conditionConfig: {}, isEnabled: true },
      { name: 'Send onboarding guide',  actionType: 'send_email',       actionConfig: { template: 'onboarding' }, conditionConfig: {}, isEnabled: true },
      { name: 'Create follow-up task',  actionType: 'create_record',    actionConfig: { entity: 'crm_task' }, conditionConfig: {}, isEnabled: true },
    ],
  },
];

// ── Step Editor ───────────────────────────────────────────────────────────────

function StepEditor({
  steps, onChange,
}: {
  steps: Omit<WfStepData, 'id'>[];
  onChange: (steps: Omit<WfStepData, 'id'>[]) => void;
}) {
  function addStep() {
    onChange([...steps, { name: '', actionType: 'send_notification', actionConfig: {}, conditionConfig: {}, isEnabled: true }]);
  }
  function removeStep(i: number) {
    onChange(steps.filter((_, idx) => idx !== i));
  }
  function updateStep(i: number, patch: Partial<Omit<WfStepData, 'id'>>) {
    onChange(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }
  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const Icon = actionTypeIcons[step.actionType] ?? Bell;
        return (
          <div key={i} className="flex items-start gap-2 bg-white/[0.03] border border-white/[0.07] rounded-lg p-3">
            <div className="flex flex-col gap-1 mt-0.5">
              <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                className="p-0.5 text-white/20 hover:text-white/50 disabled:opacity-20">
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}
                className="p-0.5 text-white/20 hover:text-white/50 disabled:opacity-20">
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <div className="flex-1 space-y-2">
              <Input
                placeholder={`Step ${i + 1} name`}
                value={step.name}
                onChange={e => updateStep(i, { name: e.target.value })}
                className="h-8 text-sm bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
              />
              <Select value={step.actionType} onValueChange={v => updateStep(i, { actionType: v as WfActionType })}>
                <SelectTrigger className="h-8 text-xs bg-white/[0.05] border-white/[0.1] text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WF_ACTION_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{WF_ACTION_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Switch
                checked={step.isEnabled}
                onCheckedChange={v => updateStep(i, { isEnabled: v })}
                className="scale-75"
              />
              <button onClick={() => removeStep(i)} className="p-1 text-white/20 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      <button
        onClick={addStep}
        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/[0.1] rounded-lg text-white/40 hover:text-white/60 hover:border-white/20 transition-all text-sm"
      >
        <Plus className="w-3.5 h-3.5" /> Add Step
      </button>
    </div>
  );
}

// ── Workflow Form Dialog ──────────────────────────────────────────────────────

function WorkflowFormDialog({
  open, onClose, initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: WfDefinition | null;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const create = useCreateWfDefinition();
  const update = useUpdateWfDefinition();

  const [name, setName]           = useState(initial?.name ?? '');
  const [desc, setDesc]           = useState(initial?.description ?? '');
  const [category, setCategory]   = useState<WfCategory>(initial?.category ?? 'General');
  const [triggerType, setTrigger] = useState<string>(initial?.triggerType ?? 'manual');
  const [steps, setSteps]         = useState<Omit<WfStepData, 'id'>[]>(
    initial?.steps?.map(s => ({ name: s.name, actionType: s.actionType, actionConfig: s.actionConfig ?? {}, conditionConfig: s.conditionConfig ?? {}, isEnabled: s.isEnabled ?? true })) ?? []
  );

  const busy = create.isPending || update.isPending;

  async function handleSubmit() {
    if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }

    const payload: InsertWfDefinition = {
      name: name.trim(),
      description: desc.trim() || null,
      category,
      triggerType: triggerType as 'manual' | 'schedule' | 'event',
      steps: steps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    };

    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, data: payload });
        toast({ title: 'Workflow updated' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Workflow created' });
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Something went wrong';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
          <DialogDescription className="text-white/40">
            {isEdit ? 'Update workflow definition and steps.' : 'Define a new automated workflow.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Workflow Name *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Invoice Auto-Approval"
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Description</Label>
            <Textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What does this workflow do?"
              rows={2}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 resize-none"
            />
          </div>

          {/* Category + Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as WfCategory)}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WF_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Trigger Type</Label>
              <Select value={triggerType} onValueChange={setTrigger}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="schedule">Scheduled</SelectItem>
                  <SelectItem value="event">Event-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <Label className="text-white/60 text-xs">Steps ({steps.length})</Label>
            <StepEditor steps={steps} onChange={setSteps} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={busy}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Workflow'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Instance Detail Dialog ────────────────────────────────────────────────────

function InstanceDetailDialog({ instanceId, onClose }: { instanceId: number | null; onClose: () => void }) {
  const { data } = useWfInstance(instanceId);
  const instance = data?.data;

  return (
    <Dialog open={instanceId !== null} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execution Details</DialogTitle>
          <DialogDescription className="text-white/40">
            {instance?.workflowName ?? '…'} · Run #{instanceId}
          </DialogDescription>
        </DialogHeader>
        {!instance ? (
          <div className="py-8 text-center text-white/30 text-sm">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Status', value: <Badge className={`text-[10px] border ${statusStyle[instance.status]}`}>{instance.status}</Badge> },
                { label: 'Duration', value: fmtDuration(instance.durationMs) },
                { label: 'Triggered', value: instance.triggerType },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-1">{label}</div>
                  <div className="text-sm font-medium text-white">{value}</div>
                </div>
              ))}
            </div>
            {instance.errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                {instance.errorMessage}
              </div>
            )}
            <div>
              <div className="text-xs text-white/40 mb-2">Step Execution Log</div>
              <div className="space-y-2">
                {(instance.logs ?? []).map(log => (
                  <div key={log.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2">
                    <div className="text-xs text-white/30 w-5 text-right">{log.stepOrder}</div>
                    {log.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : log.status === 'failed' ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      : <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{log.stepName}</div>
                      {log.errorMessage && <div className="text-xs text-red-400 mt-0.5 truncate">{log.errorMessage}</div>}
                    </div>
                    <div className="text-xs text-white/30">{fmtDuration(
                      log.startedAt && log.completedAt
                        ? new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()
                        : null
                    )}</div>
                  </div>
                ))}
                {(instance.logs ?? []).length === 0 && (
                  <div className="text-center text-white/30 text-sm py-4">No step logs available</div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowAutomation() {
  const { toast } = useToast();
  const [tab, setTab]             = useState('automations');
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('');
  const [formOpen, setFormOpen]   = useState(false);
  const [editTarget, setEdit]     = useState<WfDefinition | null>(null);
  const [instanceId, setInstanceId] = useState<number | null>(null);

  const { data: permsData } = useWfPermissions();
  const perms = permsData?.data ?? { canView: true, canCreate: true, canEdit: true, canDelete: true };

  const { data: summaryData } = useWfSummary();
  const summary = summaryData?.data;

  const { data: defsData, isLoading: defsLoading } = useWfDefinitions({
    search, status: filterStatus,
  });
  const definitions = defsData?.data ?? [];

  const { data: instancesData, isLoading: instLoading } = useWfInstances();
  const instances = instancesData?.data ?? [];

  const toggleWf   = useToggleWfDefinition();
  const publishWf  = usePublishWfDefinition();
  const deleteWf   = useDeleteWfDefinition();
  const triggerWf  = useTriggerWfDefinition();

  function openCreate() { setEdit(null); setFormOpen(true); }
  function openEdit(wf: WfDefinition) { setEdit(wf); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEdit(null); }

  async function handleToggle(wf: WfDefinition) {
    try {
      await toggleWf.mutateAsync(wf.id);
      toast({ title: wf.status === 'active' ? 'Workflow paused' : 'Workflow activated' });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to toggle';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  async function handlePublish(wf: WfDefinition) {
    try {
      await publishWf.mutateAsync(wf.id);
      toast({ title: 'Workflow published and active' });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to publish';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  async function handleDelete(wf: WfDefinition) {
    try {
      await deleteWf.mutateAsync(wf.id);
      toast({ title: 'Workflow deleted' });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to delete';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  async function handleTrigger(wf: WfDefinition) {
    try {
      const res = await triggerWf.mutateAsync({ id: wf.id });
      const inst = (res as { data?: { id?: number } })?.data;
      toast({ title: `Workflow triggered`, description: `Run #${inst?.id} started` });
      if (inst?.id) setInstanceId(inst.id);
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to trigger';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  async function applyTemplate(tpl: typeof TEMPLATES[0]) {
    try {
      await (useCreateWfDefinition as never);
      toast({ title: `Creating "${tpl.name}"…` });
    } catch { /* noop */ }
  }

  const summaryCards = [
    { label: 'Total Workflows', value: summary?.total ?? 0, icon: Zap, color: 'from-[#2563EB]/20 to-[#06B6D4]/20', text: 'text-[#2563EB]' },
    { label: 'Active',          value: summary?.active ?? 0, icon: Activity, color: 'from-emerald-500/20 to-teal-500/20', text: 'text-emerald-400' },
    { label: 'Runs Today',      value: summary?.todayRuns ?? 0, icon: RefreshCw, color: 'from-purple-500/20 to-indigo-500/20', text: 'text-purple-400' },
    { label: 'Success Rate',    value: summary ? `${summary.successRate}%` : '—', icon: TrendingUp, color: 'from-amber-500/20 to-orange-500/20', text: 'text-amber-400' },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Intelligence' }, { label: 'Workflow Automation' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Workflow Automation</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {summary
                ? `${summary.total} workflows · ${summary.todayRuns} runs today · ${summary.successRate}% success`
                : 'Loading…'}
            </p>
          </div>
          {perms.canCreate && (
            <Button onClick={openCreate} size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Workflow
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map(c => (
            <div key={c.label} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/40">{c.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center`}>
                  <c.icon className={`w-4 h-4 ${c.text}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{c.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              <TabsTrigger value="automations" className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                Automations
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                Templates
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                Execution History
              </TabsTrigger>
            </TabsList>

            {tab === 'automations' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search workflows…"
                    className="pl-9 h-8 text-sm w-48 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                  />
                </div>
                <Select value={filterStatus || '_all'} onValueChange={v => setFilter(v === '_all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs w-28 bg-white/[0.05] border-white/[0.1] text-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Automations Tab */}
          <TabsContent value="automations" className="mt-4">
            {defsLoading ? (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center text-white/30 text-sm">
                Loading workflows…
              </div>
            ) : definitions.length === 0 ? (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
                <Zap className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/50 font-medium">No workflows yet</p>
                <p className="text-white/30 text-sm mt-1 mb-4">Create your first workflow or use a template</p>
                {perms.canCreate && (
                  <Button onClick={openCreate} size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Create Workflow
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      {['Workflow', 'Category', 'Trigger', 'Steps', 'Runs', 'Success', 'Last Run', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-white/30 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.map(wf => {
                      const successPct = wf.runCount > 0
                        ? Math.round((wf.successCount / wf.runCount) * 1000) / 10
                        : null;
                      return (
                        <tr key={wf.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-white">{wf.name}</div>
                            {wf.description && (
                              <div className="text-xs text-white/30 mt-0.5 max-w-[200px] truncate">{wf.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryColors[wf.category] ?? categoryColors.General}`}>
                              {wf.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-white/50 capitalize">{wf.triggerType}</td>
                          <td className="px-4 py-3 text-sm text-white/50">{wf.stepCount ?? 0}</td>
                          <td className="px-4 py-3 text-sm text-white/70 font-medium">{wf.runCount}</td>
                          <td className="px-4 py-3 text-sm">
                            {successPct !== null ? (
                              <span className={successPct >= 90 ? 'text-emerald-400' : successPct >= 70 ? 'text-amber-400' : 'text-red-400'}>
                                {successPct}%
                              </span>
                            ) : <span className="text-white/30">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/40">{timeAgo(wf.lastRunAt)}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${statusStyle[wf.status]} px-2 py-0`}>{wf.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5">
                              {/* Toggle active/pause */}
                              {wf.status !== 'draft' && perms.canEdit && (
                                <button
                                  onClick={() => handleToggle(wf)}
                                  className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors"
                                  title={wf.status === 'active' ? 'Pause' : 'Activate'}
                                >
                                  {wf.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {/* Publish draft */}
                              {wf.status === 'draft' && perms.canEdit && (
                                <button
                                  onClick={() => handlePublish(wf)}
                                  className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors"
                                  title="Publish"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Manual trigger */}
                              {wf.status !== 'draft' && perms.canCreate && (
                                <button
                                  onClick={() => handleTrigger(wf)}
                                  className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-purple-400 transition-colors"
                                  title="Run now"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.1] text-white">
                                  {perms.canEdit && (
                                    <DropdownMenuItem onClick={() => openEdit(wf)}
                                      className="text-sm cursor-pointer hover:bg-white/[0.07]">
                                      <Settings className="w-3.5 h-3.5 mr-2" />Edit
                                    </DropdownMenuItem>
                                  )}
                                  {perms.canDelete && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.07]" />
                                      <DropdownMenuItem onClick={() => handleDelete(wf)}
                                        className="text-sm cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400">
                                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {TEMPLATES.map(tpl => (
                <div key={tpl.name} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-[#2563EB]/30 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center">
                      <tpl.icon className="w-5 h-5 text-[#2563EB]" />
                    </div>
                    <Badge className={`text-[10px] border-0 ${categoryColors[tpl.category] ?? categoryColors.General}`}>{tpl.category}</Badge>
                  </div>
                  <h4 className="font-semibold text-white mb-1">{tpl.name}</h4>
                  <p className="text-xs text-white/40 mb-3">{tpl.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">{tpl.steps.length} steps</span>
                    {perms.canCreate && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            // Import hook directly in callback
                            const payload: InsertWfDefinition = {
                              name: tpl.name,
                              description: tpl.desc,
                              category: tpl.category,
                              triggerType: 'manual',
                              steps: tpl.steps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
                            };
                            // We can't call hooks in event handlers, so open form pre-filled
                            setEdit({ id: 0, orgId: null, name: tpl.name, description: tpl.desc, category: tpl.category, triggerType: 'manual', triggerConfig: {}, status: 'draft', runCount: 0, successCount: 0, lastRunAt: null, createdAt: '', updatedAt: '', steps: tpl.steps.map((s, i) => ({ ...s, stepOrder: i + 1 })) });
                            setFormOpen(true);
                            void payload;
                          } catch { /* noop */ }
                        }}
                        className="bg-[#2563EB]/20 hover:bg-[#2563EB]/40 text-[#2563EB] border border-[#2563EB]/20 text-xs h-7"
                      >
                        Use Template <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Execution History Tab */}
          <TabsContent value="history" className="mt-4">
            {instLoading ? (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center text-white/30 text-sm">
                Loading execution history…
              </div>
            ) : instances.length === 0 ? (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
                <Activity className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/50 font-medium">No executions yet</p>
                <p className="text-white/30 text-sm mt-1">Trigger a workflow to see execution history here</p>
              </div>
            ) : (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      {['Run #', 'Workflow', 'Category', 'Trigger', 'Status', 'Duration', 'Started', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-white/30 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map(inst => (
                      <tr key={inst.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm text-white/50 font-mono">#{inst.id}</td>
                        <td className="px-4 py-3 text-sm text-white font-medium">{inst.workflowName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryColors[inst.workflowCategory ?? ''] ?? categoryColors.General}`}>
                            {inst.workflowCategory ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/50 capitalize">{inst.triggerType}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] border ${statusStyle[inst.status]} px-2 py-0`}>
                            {inst.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/50">{fmtDuration(inst.durationMs)}</td>
                        <td className="px-4 py-3 text-sm text-white/40">{timeAgo(inst.startedAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setInstanceId(inst.id)}
                            className="text-xs text-[#2563EB] hover:underline"
                          >
                            View logs
                          </button>
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

      {/* Dialogs */}
      <WorkflowFormDialog
        open={formOpen}
        onClose={closeForm}
        initial={editTarget}
      />
      <InstanceDetailDialog
        instanceId={instanceId}
        onClose={() => setInstanceId(null)}
      />
    </AppLayout>
  );
}
