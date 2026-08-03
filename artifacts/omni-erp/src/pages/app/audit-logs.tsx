import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Search, Filter, Download, RefreshCw, X,
  ChevronLeft, ChevronRight, Shield, User, Clock, Hash,
  Activity, AlertTriangle, CheckCircle2, XCircle, Globe,
  ChevronDown, Eye, Loader2,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAuditLogs, useAuditStats, useAuditLog,
  ACTION_COLORS, STATUS_COLORS, AUDIT_MODULES, AUDIT_ACTIONS,
  type AuditLog, type AuditFilters,
} from '@/hooks/useAuditLogs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const MODULE_COLORS: Record<string, string> = {
  'Authentication':       'text-cyan-400 bg-cyan-400/10',
  'Finance':              'text-emerald-400 bg-emerald-400/10',
  'Accounts Receivable':  'text-blue-400 bg-blue-400/10',
  'Accounts Payable':     'text-violet-400 bg-violet-400/10',
  'Banking':              'text-teal-400 bg-teal-400/10',
  'Fixed Assets':         'text-orange-400 bg-orange-400/10',
  'GST & Tax':            'text-amber-400 bg-amber-400/10',
  'Purchase & Procurement': 'text-indigo-400 bg-indigo-400/10',
  'Inventory':            'text-lime-400 bg-lime-400/10',
  'Manufacturing':        'text-orange-400 bg-orange-400/10',
  'HR & Payroll':         'text-pink-400 bg-pink-400/10',
  'Sales & CRM':          'text-sky-400 bg-sky-400/10',
  'Documents':            'text-slate-400 bg-slate-400/10',
  'Workflow Automation':  'text-purple-400 bg-purple-400/10',
  'Settings':             'text-white/50 bg-white/5',
  'User Management':      'text-rose-400 bg-rose-400/10',
  'Roles & Permissions':  'text-red-400 bg-red-400/10',
  'System':               'text-white/40 bg-white/5',
};

function ModuleBadge({ module }: { module: string }) {
  const cls = MODULE_COLORS[module] ?? 'text-white/50 bg-white/5';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {module}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'text-white/50 bg-white/5';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${cls}`}>
      {action}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'failure') return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-[#2563EB]' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-current/10`}
        style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: log, isLoading } = useAuditLog(id);

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#07091a] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#2563EB]" />
          <h2 className="font-semibold text-white text-sm">Event Detail</h2>
          {log && <span className="text-xs text-white/30">#{log.id}</span>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : log ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status + action */}
          <div className="flex items-center gap-2 flex-wrap">
            <ActionBadge action={log.action} />
            <ModuleBadge module={log.module} />
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[log.status] ?? 'text-white/50 bg-white/5'}`}>
              <StatusIcon status={log.status} />
              {log.status}
            </span>
          </div>

          {/* Description */}
          <div className="bg-[#0a0f1e] rounded-xl p-4">
            <p className="text-sm text-white leading-relaxed">{log.description}</p>
          </div>

          {/* Meta */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider">Event Details</h3>
            {[
              { icon: Clock,  label: 'Timestamp',   value: fmtDate(log.createdAt) },
              { icon: User,   label: 'User',        value: `${log.userName} (${log.userEmail})` },
              { icon: Shield, label: 'Module',      value: log.module },
              { icon: Activity, label: 'Action',    value: log.action },
              ...(log.entityType ? [{ icon: Hash, label: 'Entity', value: `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}${log.entityName ? ` — ${log.entityName}` : ''}` }] : []),
              ...(log.ipAddress  ? [{ icon: Globe, label: 'IP Address', value: log.ipAddress }] : []),
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/30">{label}</p>
                  <p className="text-sm text-white mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Value diff */}
          {(log.oldValues || log.newValues) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider">Changes</h3>
              {log.oldValues && (
                <div>
                  <p className="text-xs text-rose-400/70 mb-1">Before</p>
                  <pre className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 text-xs text-white/60 overflow-x-auto whitespace-pre-wrap">{log.oldValues}</pre>
                </div>
              )}
              {log.newValues && (
                <div>
                  <p className="text-xs text-emerald-400/70 mb-1">After</p>
                  <pre className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs text-white/60 overflow-x-auto whitespace-pre-wrap">{log.newValues}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Event not found</div>
      )}
    </motion.div>
  );
}

// ── Select wrapper ────────────────────────────────────────────────────────────
function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none h-8 pl-3 pr-7 rounded-lg text-xs bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50 cursor-pointer"
      >
        <option value="" className="bg-[#0a0f1e]">{placeholder}</option>
        {options.map(o => <option key={o} value={o} className="bg-[#0a0f1e]">{o}</option>)}
      </select>
      <ChevronDown className="w-3 h-3 text-white/30 absolute right-2 top-2.5 pointer-events-none" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, limit: 50 });
  const [search, setSearch]   = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: stats } = useAuditStats();
  const { data: logsRes, isLoading, refetch } = useAuditLogs(filters);

  const logs  = logsRes?.data  ?? [];
  const total = logsRes?.total ?? 0;
  const pages = logsRes?.pages ?? 1;
  const page  = filters.page   ?? 1;

  const applySearch = useCallback(() => {
    setFilters(f => ({ ...f, search: search || undefined, page: 1 }));
  }, [search]);

  function setFilter(key: keyof AuditFilters, val: string) {
    setFilters(f => ({ ...f, [key]: val || undefined, page: 1 }));
  }

  function clearFilters() {
    setSearch('');
    setFilters({ page: 1, limit: 50 });
  }

  const hasActiveFilters = !!(filters.module || filters.action || filters.status || filters.dateFrom || filters.dateTo || filters.search);

  function handleExport() {
    const params = new URLSearchParams();
    if (filters.module)   params.set('module',   filters.module);
    if (filters.action)   params.set('action',   filters.action);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo)   params.set('dateTo',   filters.dateTo);
    window.open(`/api/audit/export/csv?${params.toString()}`, '_blank');
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Audit Logs' }]}>
      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-white/40 text-sm mt-0.5">Complete record of all user actions and system events</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05] h-8 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
            </Button>
            <Button size="sm" onClick={handleExport}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white h-8 text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ClipboardList} label="Total Events" value={stats.total} sub="All time" />
            <StatCard icon={Activity}     label="Last 24 Hours" value={stats.last24h} sub="Recent activity" color="text-emerald-400" />
            <StatCard icon={User}         label="Active Users"  value={stats.uniqueUsers} sub="Distinct actors" color="text-violet-400" />
            <StatCard icon={Shield}       label="Modules Tracked" value={stats.byModule.length} sub="Across platform" color="text-amber-400" />
          </div>
        )}

        {/* Module breakdown */}
        {stats && stats.byModule.length > 0 && (
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Activity by Module</p>
            <div className="flex flex-wrap gap-2">
              {stats.byModule.slice(0, 12).map(({ module, count }) => (
                <button
                  key={module}
                  onClick={() => setFilter('module', filters.module === module ? '' : module)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    filters.module === module
                      ? 'bg-[#2563EB]/20 border border-[#2563EB]/30 text-white'
                      : 'bg-white/[0.04] border border-white/[0.07] text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span>{module}</span>
                  <span className={`px-1 py-0.5 rounded text-[10px] font-semibold ${
                    filters.module === module ? 'bg-[#2563EB]/30 text-[#2563EB]' : 'bg-white/[0.08] text-white/40'
                  }`}>{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters bar */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
                placeholder="Search descriptions, users, entities…"
                className="w-full h-8 pl-8 pr-3 rounded-lg text-xs bg-white/[0.04] border border-white/[0.07] text-white placeholder:text-white/30 focus:outline-none focus:border-[#2563EB]/50"
              />
            </div>

            <Button size="sm" onClick={applySearch}
              className="bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] border border-[#2563EB]/20 h-8 text-xs">
              Search
            </Button>

            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs border transition-colors ${
                filtersOpen || hasActiveFilters
                  ? 'bg-[#2563EB]/10 border-[#2563EB]/30 text-[#2563EB]'
                  : 'bg-white/[0.04] border-white/[0.07] text-white/60 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />Filters
              {hasActiveFilters && <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[9px] flex items-center justify-center font-bold">!</span>}
            </button>

            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs border border-white/[0.07] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors">
                <X className="w-3 h-3" />Clear
              </button>
            )}
          </div>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/[0.05]">
                  <FilterSelect
                    value={filters.module ?? ''}
                    onChange={v => setFilter('module', v)}
                    placeholder="All modules"
                    options={[...AUDIT_MODULES]}
                  />
                  <FilterSelect
                    value={filters.action ?? ''}
                    onChange={v => setFilter('action', v)}
                    placeholder="All actions"
                    options={[...AUDIT_ACTIONS]}
                  />
                  <FilterSelect
                    value={filters.status ?? ''}
                    onChange={v => setFilter('status', v)}
                    placeholder="All statuses"
                    options={['success', 'failure', 'warning']}
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/30">From</span>
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={e => setFilter('dateFrom', e.target.value)}
                      className="h-8 px-2.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/30">To</span>
                    <input
                      type="date"
                      value={filters.dateTo ?? ''}
                      onChange={e => setFilter('dateTo', e.target.value)}
                      className="h-8 px-2.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1.4fr_100px_90px_80px_36px] gap-3 px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            <span>Timestamp</span>
            <span>Description</span>
            <span>Module</span>
            <span>Action</span>
            <span>Status</span>
            <span />
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
              <p className="text-sm text-white/30">Loading events…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <ClipboardList className="w-10 h-10 text-white/10" />
              <p className="text-sm text-white/40">No events found</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-[#2563EB] hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {logs.map((log: AuditLog) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedId(log.id)}
                  className={`grid grid-cols-[1fr_1.4fr_100px_90px_80px_36px] gap-3 px-4 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors group ${
                    selectedId === log.id ? 'bg-[#2563EB]/5 border-l-2 border-[#2563EB]' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs text-white/70 truncate">{timeAgo(log.createdAt)}</span>
                    <span className="text-[10px] text-white/30 truncate">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>

                  {/* Description + user */}
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs text-white truncate" title={log.description}>{log.description}</span>
                    <span className="text-[10px] text-white/30 truncate">{log.userName}</span>
                  </div>

                  {/* Module */}
                  <div className="flex items-center">
                    <ModuleBadge module={log.module} />
                  </div>

                  {/* Action */}
                  <div className="flex items-center">
                    <ActionBadge action={log.action} />
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={log.status} />
                    <span className="text-[10px] text-white/50 capitalize">{log.status}</span>
                  </div>

                  {/* Detail */}
                  <div className="flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07]">
              <span className="text-xs text-white/30">
                Showing {((page - 1) * (filters.limit ?? 50)) + 1}–{Math.min(page * (filters.limit ?? 50), total)} of {total.toLocaleString()} events
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/40 px-2">Page {page} of {pages}</span>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: Math.min(pages, (f.page ?? 1) + 1) }))}
                  disabled={page >= pages}
                  className="p-1.5 rounded-lg hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed text-white/60 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedId !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedId(null)}
            />
            <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
