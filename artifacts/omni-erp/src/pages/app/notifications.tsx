import { useState } from 'react';
import { Link } from 'wouter';
import {
  Bell, CheckCheck, Archive, Trash2, MoreHorizontal, Search,
  Filter, RefreshCw, Plus, Info, CheckCircle2, AlertTriangle,
  XCircle, DollarSign, Package, Users, ShoppingCart, Factory,
  Zap, FileText, Globe, Settings, X, BellOff,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useNotifications, useNotificationSummary,
  useMarkRead, useMarkUnread, useMarkAllRead,
  useArchiveNotification, useDeleteNotification,
  useCreateNotification,
  timeAgo, CATEGORY_LABELS, TYPE_COLORS,
  type NotificationCategory, type NotificationType,
  type Notification,
} from '@/hooks/useNotifications';

// ── Category icon map ─────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  finance:       DollarSign,
  inventory:     Package,
  hr:            Users,
  purchase:      ShoppingCart,
  sales:         Globe,
  manufacturing: Factory,
  workflow:      Zap,
  documents:     FileText,
  system:        Settings,
  general:       Bell,
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
};

function NotifTypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? Info;
  const colors: Record<string, string> = {
    info:    'text-[#2563EB]',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error:   'text-rose-400',
  };
  return <Icon className={`w-3.5 h-3.5 ${colors[type] ?? 'text-white/50'}`} />;
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

function CreateNotifDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const create = useCreateNotification();
  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [type, setType]         = useState<NotificationType>('info');
  const [category, setCategory] = useState<NotificationCategory>('general');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    try {
      await create.mutateAsync({ title: title.trim(), body: message.trim() || null, type, category });
      toast({ title: 'Notification created' });
      setTitle(''); setMessage(''); setType('info'); setCategory('general');
      onClose();
    } catch {
      toast({ title: 'Failed to create notification', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1e] border-white/[0.07] text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
          <DialogDescription className="text-white/40">Send a notification to yourself</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Title *</Label>
            <Input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Notification title"
              className="bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Message</Label>
            <Textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Optional message body"
              rows={3}
              className="bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/20 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Type</Label>
              <Select value={type} onValueChange={v => setType(v as NotificationType)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1424] border-white/[0.07] text-white">
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as NotificationCategory)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1424] border-white/[0.07] text-white">
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/[0.05]">
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Notification Row ──────────────────────────────────────────────────────────

function NotifRow({
  notif, onRead, onUnread, onArchive, onDelete,
}: {
  notif: Notification;
  onRead: (id: number) => void;
  onUnread: (id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const CatIcon = CATEGORY_ICONS[notif.category] ?? Bell;

  return (
    <div
      className={`flex gap-4 px-5 py-4 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors group
        ${!notif.read && !notif.isArchived ? 'bg-white/[0.015]' : ''}`}
    >
      {/* Unread dot */}
      <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-opacity
          ${!notif.read && !notif.isArchived ? TYPE_COLORS[notif.type as NotificationType] ?? 'bg-[#2563EB]' : 'opacity-0'}`}
        />
      </div>

      {/* Category icon */}
      <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center flex-shrink-0 mt-0.5">
        <CatIcon className="w-4 h-4 text-white/40" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-medium leading-snug ${notif.isArchived ? 'text-white/40' : 'text-white'}`}>
                {notif.title}
              </p>
              <div className="flex items-center gap-1">
                <NotifTypeIcon type={notif.type} />
                <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 bg-white/[0.06] text-white/40`}>
                  {CATEGORY_LABELS[notif.category as NotificationCategory] ?? notif.category}
                </Badge>
              </div>
            </div>
            {notif.body && (
              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{notif.body}</p>
            )}
            <p className="text-[11px] text-white/25 mt-1">{timeAgo(notif.createdAt)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notif.isArchived && (
              notif.read
                ? <button title="Mark unread" onClick={() => onUnread(notif.id)}
                    className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                : <button title="Mark read" onClick={() => onRead(notif.id)}
                    className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
            )}
            <button title={notif.isArchived ? 'Unarchive' : 'Archive'} onClick={() => onArchive(notif.id)}
              className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button title="Delete" onClick={() => onDelete(notif.id)}
              className="p-1 rounded hover:bg-rose-500/10 text-white/30 hover:text-rose-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { toast } = useToast();
  const [filter, setFilter]       = useState<'all' | 'unread' | 'archived'>('all');
  const [category, setCategory]   = useState('all');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: summary } = useNotificationSummary();

  const { data, isLoading, refetch } = useNotifications({
    filter, category, search: search || undefined, page, limit: 20,
  });

  const markRead     = useMarkRead();
  const markUnread   = useMarkUnread();
  const markAllRead  = useMarkAllRead();
  const archive      = useArchiveNotification();
  const del          = useDeleteNotification();

  async function handleMarkRead(id: number) {
    try { await markRead.mutateAsync(id); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  }
  async function handleMarkUnread(id: number) {
    try { await markUnread.mutateAsync(id); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  }
  async function handleMarkAllRead() {
    try { await markAllRead.mutateAsync(); toast({ title: 'All notifications marked as read' }); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  }
  async function handleArchive(id: number) {
    try { await archive.mutateAsync(id); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  }
  async function handleDelete(id: number) {
    try { await del.mutateAsync(id); toast({ title: 'Notification deleted' }); }
    catch { toast({ title: 'Failed to delete', variant: 'destructive' }); }
  }

  const notifications = data?.data ?? [];
  const total   = data?.total ?? 0;
  const pages   = data?.pages ?? 1;
  const unread  = summary?.unread ?? 0;

  return (
    <AppLayout breadcrumbs={[{ label: 'Notification Center' }]}>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Notification Center</h1>
              <p className="text-sm text-white/40">
                {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()}
              className="text-white/50 hover:text-white hover:bg-white/[0.05] gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead}
                className="text-white/50 hover:text-white hover:bg-white/[0.05] gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: summary?.total ?? 0, color: 'from-[#2563EB]/20 to-[#2563EB]/5', border: 'border-[#2563EB]/20', text: 'text-[#2563EB]' },
            { label: 'Unread', value: summary?.unread ?? 0, color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400' },
            { label: 'Finance', value: summary?.byCategory?.find(c => c.category === 'finance')?.count ?? 0, color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { label: 'System', value: summary?.byCategory?.find(c => c.category === 'system')?.count ?? 0, color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
          ].map(card => (
            <div key={card.label}
              className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-xl p-4`}>
              <p className="text-xs text-white/40 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
            {/* Tabs */}
            <Tabs value={filter} onValueChange={v => { setFilter(v as typeof filter); setPage(1); }}>
              <TabsList className="bg-white/[0.04] border border-white/[0.06] h-8">
                <TabsTrigger value="all" className="text-xs h-6 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                  All {summary?.total ? `(${summary.total})` : ''}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs h-6 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                  Unread {unread > 0 ? `(${unread})` : ''}
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs h-6 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">
                  Archived
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search notifications…"
                  className="pl-8 h-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/20 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category filter */}
              <Select value={category} onValueChange={v => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 bg-white/[0.04] border-white/[0.07] text-white text-xs">
                  <Filter className="w-3 h-3 mr-1.5 text-white/40" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1424] border-white/[0.07] text-white">
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="py-16 text-center text-white/30 text-sm">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                <BellOff className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-sm text-white/30">No notifications found</p>
              {filter === 'unread' && (
                <p className="text-xs text-white/20">You're all caught up!</p>
              )}
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onRead={handleMarkRead}
                  onUnread={handleMarkUnread}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07]">
              <p className="text-xs text-white/30">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="h-7 px-2 text-xs text-white/50 hover:text-white hover:bg-white/[0.05] disabled:opacity-30">
                  Prev
                </Button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > pages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs rounded transition-colors
                        ${p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05] hover:text-white'}`}>
                      {p}
                    </button>
                  );
                })}
                <Button variant="ghost" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}
                  className="h-7 px-2 text-xs text-white/50 hover:text-white hover:bg-white/[0.05] disabled:opacity-30">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateNotifDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  );
}
