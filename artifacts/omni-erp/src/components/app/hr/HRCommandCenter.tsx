import { useMemo } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Command,
  DoorOpen,
  FileCheck2,
  Minus,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  UserPlus,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HrAnalytics, HrSummary } from '@/hooks/useHR';

type HRCommandCenterProps = {
  data?: HrAnalytics;
  summary?: HrSummary;
  isLoading: boolean;
  onRefresh: () => void;
  onTab: (tab: string) => void;
};

const chartTooltipStyle = {
  backgroundColor: '#101827',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '11px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
};

const signalColors = ['#22d3ee', '#60a5fa', '#a78bfa', '#fbbf24', '#fb7185'];

function formatMoney(value: string | number | null | undefined, compact = false) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(amount)) return '—';
  if (compact) {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
    if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value: string) {
  if (['approved', 'paid', 'open', 'active', 'filled'].includes(value)) {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  }
  if (['pending', 'processing', 'on_hold', 'on_leave'].includes(value)) {
    return 'border-amber-300/20 bg-amber-300/10 text-amber-200';
  }
  if (['rejected', 'terminated', 'closed'].includes(value)) {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-300';
  }
  if (value === 'draft') return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
  return 'border-sky-400/20 bg-sky-400/10 text-sky-200';
}

function Panel({
  children,
  className = '',
  testId,
}: {
  children: ReactNode;
  className?: string;
  testId: string;
}) {
  return (
    <section
      data-testid={testId}
      className={`rounded-2xl border border-white/[0.075] bg-[#0c1422]/80 shadow-[0_16px_48px_rgba(0,0,0,0.12)] ${className}`}
    >
      {children}
    </section>
  );
}

function PanelHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
      <div className="min-w-0">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-cyan-300/65">{eyebrow}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-slate-100">{title}</h2>
          {detail && <span className="text-[11px] text-slate-500">{detail}</span>}
        </div>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  accent,
  onClick,
  testId,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  caption: ReactNode;
  accent: string;
  onClick?: () => void;
  testId: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accent}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        {onClick && <ChevronRight className="mt-1 h-3.5 w-3.5 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />}
      </div>
      <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p data-testid={`${testId}-value`} className="mt-1 text-[25px] font-semibold tracking-[-0.05em] text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{caption}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        className="group min-h-[153px] rounded-2xl border border-white/[0.075] bg-[#0c1422]/80 p-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.1)] transition-colors hover:border-cyan-300/20 hover:bg-[#101b2d]"
      >
        {content}
      </button>
    );
  }

  return (
    <div data-testid={testId} className="min-h-[153px] rounded-2xl border border-white/[0.075] bg-[#0c1422]/80 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.1)]">
      {content}
    </div>
  );
}

function LoadingPanel({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-white/[0.06] bg-[#0c1422]/70 p-5 ${className}`}>
      <div className="h-2.5 w-24 rounded-full bg-white/[0.08]" />
      <div className="mt-3 h-4 w-40 rounded-full bg-white/[0.07]" />
      <div className="mt-7 h-24 rounded-xl bg-white/[0.04]" />
    </div>
  );
}

function EmptySignal({
  icon: Icon,
  title,
  detail,
}: {
  icon: ElementType;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-[154px] flex-col items-center justify-center px-4 text-center">
      <Icon className="h-6 w-6 text-slate-600" strokeWidth={1.5} />
      <p className="mt-3 text-sm font-medium text-slate-400">{title}</p>
      <p className="mt-1 max-w-[260px] text-[11px] leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function ChangeIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (!Number.isFinite(value) || value === 0) {
    return <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><Minus className="h-3 w-3" /> stable</span>;
  }
  const positive = inverse ? value < 0 : value > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function HRCommandCenter({ data, summary, isLoading, onRefresh, onTab }: HRCommandCenterProps) {
  const headcountTrend = data?.headcountTrend ?? [];
  const payrollTrend = data?.payrollTrend ?? [];
  const leaveMix = data?.leaveMix ?? [];
  const hiringPipeline = data?.hiringPipeline ?? [];
  const salaryByDepartment = data?.salaryByDepartment ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const departments = summary?.deptBreakdown ?? [];

  const headcountDelta = useMemo(() => {
    if (headcountTrend.length < 2) return 0;
    const current = headcountTrend[headcountTrend.length - 1]?.count ?? 0;
    const previous = headcountTrend[headcountTrend.length - 2]?.count ?? 0;
    return previous ? ((current - previous) / previous) * 100 : 0;
  }, [headcountTrend]);

  const leaveTotal = leaveMix.reduce((total, item) => total + (item.requests || 0), 0);
  const pipelineTotal = hiringPipeline.reduce((total, item) => total + (item.openings || 0), 0);
  const payrollLatest = payrollTrend[payrollTrend.length - 1];
  const payrollPrevious = payrollTrend[payrollTrend.length - 2];
  const payrollDelta = payrollLatest && payrollPrevious && payrollPrevious.gross
    ? ((payrollLatest.gross - payrollPrevious.gross) / payrollPrevious.gross) * 100
    : 0;
  const maxDepartmentCount = Math.max(...departments.map((department) => department.count), 1);
  const hasSignals = Boolean(summary || data);

  return (
    <main data-testid="hr-command-center" className="min-h-[100dvh] bg-[#07101d] px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative overflow-hidden rounded-2xl border border-cyan-300/[0.12] bg-[linear-gradient(115deg,#0d1b2a_0%,#0c1625_48%,#101827_100%)] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-90px] left-[38%] h-48 w-48 rounded-full bg-blue-500/[0.06] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300/75">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,0.1)]" />
                Workforce operations / live brief
              </div>
              <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-[-0.06em] text-slate-50">People command center</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                A clear read on workforce health, exposure, and the decisions that need a manager&apos;s attention.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div data-testid="status-data-scope" className="mr-1 hidden items-center gap-2 rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2 text-[10px] text-slate-500 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300/80" />
                HRIS synced
              </div>
              <Button
                type="button"
                data-testid="button-refresh-hr-command-center"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="border-white/[0.12] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-4 text-[10px] text-slate-500 sm:flex sm:items-center sm:gap-6">
            <span className="inline-flex items-center gap-2"><Command className="h-3.5 w-3.5 text-cyan-300/70" /> Manager view</span>
            <span className="inline-flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-cyan-300/70" /> Updated just now</span>
            <span className="inline-flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-cyan-300/70" /> Signal quality: good</span>
          </div>
        </header>

        {isLoading ? (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LoadingPanel />
            <LoadingPanel />
            <LoadingPanel />
            <LoadingPanel />
            <LoadingPanel className="md:col-span-2 xl:col-span-3" />
            <LoadingPanel />
            <LoadingPanel className="md:col-span-2" />
            <LoadingPanel className="md:col-span-2" />
          </div>
        ) : !hasSignals ? (
          <Panel testId="empty-hr-command-center" className="mt-5">
            <div className="flex min-h-[410px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06]">
                <Activity className="h-7 w-7 text-cyan-300/70" strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-slate-200">Your command center is ready</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Workforce signals will appear here once the HRIS has returned its first brief. Refresh to check for the latest snapshot.
              </p>
              <Button type="button" data-testid="button-refresh-empty-hr" onClick={onRefresh} className="mt-6 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <RefreshCw className="h-4 w-4" /> Check for data
              </Button>
            </div>
          </Panel>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={UsersRound}
                label="Total workforce"
                value={summary?.totalEmployees ?? '—'}
                caption={<>{summary?.activeEmployees ?? '—'} active now <ChangeIndicator value={headcountDelta} /></>}
                accent="border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-200"
                onClick={() => onTab('employees')}
                testId="metric-total-workforce"
              />
              <MetricCard
                icon={CircleDollarSign}
                label="Monthly payroll"
                value={summary?.monthlyPayroll ? formatMoney(summary.monthlyPayroll, true) : '—'}
                caption={payrollLatest ? `${payrollLatest.employees} employees in latest run` : 'No payroll run recorded'}
                accent="border-blue-300/15 bg-blue-300/[0.05] text-blue-200"
                onClick={() => onTab('payroll')}
                testId="metric-monthly-payroll"
              />
              <MetricCard
                icon={CalendarDays}
                label="Leave demand"
                value={summary?.pendingLeaves ?? '—'}
                caption={leaveTotal ? `${leaveTotal} requests across tracked leave types` : 'No leave requests recorded'}
                accent="border-amber-300/15 bg-amber-300/[0.05] text-amber-200"
                onClick={() => onTab('leaves')}
                testId="metric-pending-leaves"
              />
              <MetricCard
                icon={BriefcaseBusiness}
                label="Open positions"
                value={summary?.openPositions ?? (pipelineTotal || '—')}
                caption={pipelineTotal ? `${pipelineTotal} planned openings in pipeline` : 'No active requisitions'}
                accent="border-violet-300/15 bg-violet-300/[0.05] text-violet-200"
                onClick={() => onTab('recruitment')}
                testId="metric-open-positions"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
              <Panel testId="panel-headcount-trend" className="min-h-[330px]">
                <PanelHeading
                  eyebrow="01 / workforce health"
                  title="Headcount trajectory"
                  detail={headcountTrend.length ? `${headcountTrend.length} reporting periods` : 'No trend data'}
                  action={<ChangeIndicator value={headcountDelta} />}
                />
                {headcountTrend.length ? (
                  <div data-testid="chart-headcount-trend" className="h-[245px] px-2 pb-3 pt-5 sm:px-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={headcountTrend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="headcountFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={32} />
                        <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: 'rgba(34,211,238,0.25)' }} />
                        <Area type="monotone" dataKey="count" name="Employees" stroke="#22d3ee" strokeWidth={2} fill="url(#headcountFill)" activeDot={{ r: 4, fill: '#22d3ee', stroke: '#07101d', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptySignal icon={UsersRound} title="No headcount trend" detail="Historical workforce readings will populate this view." />}
              </Panel>

              <Panel testId="panel-department-distribution" className="min-h-[330px]">
                <PanelHeading eyebrow="02 / workforce mix" title="By department" detail={summary ? `${summary.totalEmployees} people` : undefined} />
                {departments.length ? (
                  <div className="space-y-4 px-5 py-5">
                    {departments.slice(0, 6).map((department, index) => (
                      <div key={`${department.deptName}-${index}`} data-testid={`department-row-${index}`}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                          <span className="truncate text-slate-300">{department.deptName || 'Unassigned'}</span>
                          <span className="shrink-0 font-mono text-slate-500">{department.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{ width: `${(department.count / maxDepartmentCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                    {departments.length > 6 && <p className="pt-1 text-[10px] text-slate-600">+ {departments.length - 6} more departments</p>}
                  </div>
                ) : <EmptySignal icon={UsersRound} title="No department mix" detail="Department allocation appears when workforce records are available." />}
              </Panel>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel testId="panel-payroll-exposure" className="min-h-[335px]">
                <PanelHeading
                  eyebrow="03 / financial exposure"
                  title="Payroll exposure"
                  detail={payrollLatest ? `${payrollLatest.period} latest run` : 'No payroll history'}
                  action={payrollLatest ? <ChangeIndicator value={payrollDelta} /> : undefined}
                />
                {payrollTrend.length ? (
                  <div data-testid="chart-payroll-trend" className="h-[245px] px-2 pb-3 pt-5 sm:px-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={payrollTrend.slice(-8)} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={4}>
                        <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value / 100000)}L`} width={34} />
                        <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                        <Bar dataKey="gross" name="Gross" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="net" name="Net" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptySignal icon={CircleDollarSign} title="No payroll exposure" detail="Payroll runs will be visualized here once they are recorded." />}
              </Panel>

              <Panel testId="panel-leave-demand" className="min-h-[335px]">
                <PanelHeading eyebrow="04 / absence pressure" title="Leave demand" detail={leaveTotal ? `${leaveTotal} total requests` : 'No leave history'} action={summary?.pendingLeaves ? <Badge className="border-amber-300/20 bg-amber-300/10 text-[10px] text-amber-200">{summary.pendingLeaves} pending</Badge> : undefined} />
                {leaveMix.length ? (
                  <div className="flex min-h-[245px] items-center gap-4 px-5 py-4">
                    <div data-testid="chart-leave-mix" className="h-[190px] w-[48%] max-w-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={leaveMix} dataKey="requests" nameKey="name" innerRadius="57%" outerRadius="82%" paddingAngle={3} stroke="none">
                            {leaveMix.map((item, index) => <Cell key={`${item.code}-${index}`} fill={signalColors[index % signalColors.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={chartTooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      {leaveMix.slice(0, 5).map((item, index) => (
                        <div key={`${item.code}-${index}`} data-testid={`leave-mix-row-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="flex min-w-0 items-center gap-2 text-slate-400">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: signalColors[index % signalColors.length] }} />
                            <span className="truncate">{item.name || item.code}</span>
                          </span>
                          <span className="shrink-0 font-mono text-slate-300">{item.requests}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptySignal icon={DoorOpen} title="No leave demand" detail="Leave request patterns will appear as teams begin logging time away." />}
              </Panel>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.4fr]">
              <Panel testId="panel-hiring-pipeline" className="min-h-[300px]">
                <PanelHeading eyebrow="05 / talent flow" title="Hiring pipeline" detail={pipelineTotal ? `${pipelineTotal} openings` : 'No active pipeline'} />
                {hiringPipeline.length ? (
                  <div className="px-5 py-5">
                    <div data-testid="chart-hiring-pipeline" className="h-[195px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hiringPipeline} layout="vertical" margin={{ top: 0, right: 12, left: 18, bottom: 0 }}>
                          <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.08)" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={titleCase} width={64} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                          <Bar dataKey="openings" name="Openings" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <button type="button" data-testid="button-view-recruitment-pipeline" onClick={() => onTab('recruitment')} className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-300 transition-colors hover:text-violet-200">
                      Open recruitment workspace <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ) : <EmptySignal icon={UserPlus} title="Pipeline is quiet" detail="Open roles and their current stage will show here." />}
              </Panel>

              <Panel testId="panel-salary-by-department" className="min-h-[300px]">
                <PanelHeading eyebrow="06 / cost concentration" title="Salary cost by department" detail="Monthly run-rate" />
                {salaryByDepartment.length ? (
                  <div className="overflow-x-auto px-5 py-4">
                    <div className="min-w-[440px]">
                      <div className="grid grid-cols-[1.3fr_0.6fr_0.9fr] gap-3 border-b border-white/[0.06] px-1 pb-2 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">
                        <span>Department</span><span>People</span><span className="text-right">Monthly cost</span>
                      </div>
                      <div className="divide-y divide-white/[0.05]">
                        {salaryByDepartment.slice(0, 6).map((department, index) => (
                          <div key={`${department.department}-${index}`} data-testid={`salary-department-row-${index}`} className="grid grid-cols-[1.3fr_0.6fr_0.9fr] items-center gap-3 px-1 py-3 text-[11px]">
                            <span className="truncate text-slate-300">{department.department || 'Unassigned'}</span>
                            <span className="text-slate-500">{department.employees}</span>
                            <span className="text-right font-mono text-cyan-200/90">{formatMoney(department.monthlyCost, true)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : <EmptySignal icon={CircleDollarSign} title="No cost concentration" detail="Department salary run-rate will be available with payroll data." />}
              </Panel>
            </div>

            <Panel testId="panel-recent-activity" className="mt-4">
              <PanelHeading eyebrow="07 / audit trail" title="Recent HR activity" detail={recentActivity.length ? `${recentActivity.length} latest events` : 'No activity recorded'} action={<Badge className="border-emerald-400/20 bg-emerald-400/10 text-[10px] text-emerald-300"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live</Badge>} />
              {recentActivity.length ? (
                <div className="grid grid-cols-1 divide-y divide-white/[0.05] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                  {recentActivity.slice(0, 8).map((activity, index) => (
                    <div key={`${activity.happenedAt}-${activity.reference}-${index}`} data-testid={`activity-item-${index}`} className="group flex gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025]">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-500">
                        {activity.type.toLowerCase().includes('pay') ? <CircleDollarSign className="h-3.5 w-3.5" /> : activity.type.toLowerCase().includes('leave') ? <CalendarDays className="h-3.5 w-3.5" /> : activity.type.toLowerCase().includes('hire') ? <UserPlus className="h-3.5 w-3.5" /> : <FileCheck2 className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-slate-300">{activity.label || 'HR record updated'}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-slate-600">{activity.reference || 'No reference'} · {formatDate(activity.happenedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptySignal icon={FileCheck2} title="No recent activity" detail="Changes to employees, leave, payroll, and hiring will be logged here." />}
            </Panel>

            <footer className="flex flex-col items-start justify-between gap-2 px-1 pb-3 pt-5 text-[10px] text-slate-600 sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> Built for people managers</span>
              <span className="font-mono">ZORVANI / HR-OPS / COMMAND-CENTER</span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

export default HRCommandCenter;