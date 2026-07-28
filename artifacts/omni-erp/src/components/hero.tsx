import { motion } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Zap, Activity, Lock, FileCheck, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';

/* ─── Data ─────────────────────────────────────────────────────────── */
const revenueData = [
  { m: 'Jan', v: 3.1 }, { m: 'Feb', v: 3.4 }, { m: 'Mar', v: 2.9 },
  { m: 'Apr', v: 4.1 }, { m: 'May', v: 4.8 }, { m: 'Jun', v: 4.3 },
  { m: 'Jul', v: 5.2 }, { m: 'Aug', v: 5.9 }, { m: 'Sep', v: 5.4 },
  { m: 'Oct', v: 6.3 }, { m: 'Nov', v: 6.8 }, { m: 'Dec', v: 7.2 },
];

const pipelineStages = [
  { label: 'Leads', count: 284, color: '#3B82F6', pct: 100 },
  { label: 'Qualified', count: 181, color: '#06B6D4', pct: 64 },
  { label: 'Proposal', count: 97, color: '#8B5CF6', pct: 34 },
  { label: 'Negotiation', count: 54, color: '#F59E0B', pct: 19 },
  { label: 'Closed', count: 38, color: '#22C55E', pct: 13 },
];

const invoices = [
  { id: 'INV-4821', client: 'Stratford Industries', amount: '$48,200', status: 'Paid', date: 'Jul 24' },
  { id: 'INV-4820', client: 'Apex Global Ltd', amount: '$31,500', status: 'Pending', date: 'Jul 23' },
  { id: 'INV-4819', client: 'Meridian Corp', amount: '$92,750', status: 'Paid', date: 'Jul 22' },
  { id: 'INV-4818', client: 'Catalyst Ventures', amount: '$17,300', status: 'Overdue', date: 'Jul 20' },
];

const aiInsights = [
  { icon: '↑', color: '#22C55E', text: 'Q3 revenue tracking 14% above forecast.' },
  { icon: '⚠', color: '#F59E0B', text: 'Inventory for SKU-2841 below reorder threshold.' },
  { icon: '→', color: '#3B82F6', text: '3 procurement approvals pending your review.' },
];

const sidebarItems = [
  { label: 'Dashboard', active: true },
  { label: 'Finance', active: false },
  { label: 'Sales', active: false },
  { label: 'HR', active: false },
  { label: 'Inventory', active: false },
  { label: 'CRM', active: false },
  { label: 'Reports', active: false },
  { label: 'AI Ops', active: false },
];

const trustBadges = [
  { icon: ShieldCheck, label: 'ISO 27001' },
  { icon: FileCheck, label: 'GST Ready' },
  { icon: Zap, label: 'AI Powered' },
  { icon: Activity, label: '99.99% Uptime' },
  { icon: Building2, label: '10,000+ Businesses' },
  { icon: Lock, label: 'SOC 2 Type II' },
];

const stats = [
  { value: '10,000+', label: 'Enterprises' },
  { value: '150+', label: 'Countries' },
  { value: '$2T+', label: 'Processed' },
];

/* ─── Status badge helper ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Paid: 'text-[#22C55E] bg-[#22C55E]/10',
    Pending: 'text-[#F59E0B] bg-[#F59E0B]/10',
    Overdue: 'text-red-400 bg-red-500/10',
  };
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */
export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">

      {/* ── Background ──────────────────────────────────────────────── */}
      {/* Subtle enterprise dot grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Primary glow — top center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/[0.12] blur-[120px] -translate-y-1/3 pointer-events-none" />
      {/* Accent glow — right */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-accent/[0.07] blur-[100px] pointer-events-none" />
      {/* Subtle bottom vignette */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid lg:grid-cols-[45fr_55fr] gap-12 xl:gap-16 items-center">

          {/* ── LEFT: Copy ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            {/* Enterprise badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wide"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Enterprise-Grade ERP Platform
            </motion.div>

            {/* Headline */}
            <h1 className="text-[2.75rem] sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold leading-[1.08] tracking-tight">
              Run Your Entire<br />
              Enterprise From<br />
              <span className="bg-gradient-to-r from-primary via-[hsl(200,94%,53%)] to-accent bg-clip-text text-transparent">
                One Platform.
              </span>
            </h1>

            {/* Body */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[480px]">
              OmniERP unifies finance, operations, supply chain, HR, and CRM into a single AI-powered command center — built for the scale, security, and complexity of modern enterprise.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all duration-200"
              >
                Start Free Trial
                <ArrowRight className="w-4.5 h-4.5" strokeWidth={2.5} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl border border-border/60 bg-white/[0.03] text-foreground font-medium text-base hover:border-border hover:bg-white/[0.06] transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Demo
              </motion.button>
            </div>

            {/* Divider */}
            <div className="border-t border-border/40 pt-5">
              {/* Trust badges */}
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3">
                Certifications &amp; Standards
              </p>
              <div className="flex flex-wrap gap-2">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-white/[0.025] text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors duration-150"
                  >
                    <Icon className="w-3 h-3 text-primary/70" strokeWidth={2} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 sm:gap-8 pt-1">
              {stats.map(({ value, label }, i) => (
                <div key={label} className="flex items-center gap-6 sm:gap-8">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                  {i < stats.length - 1 && (
                    <div className="w-px h-10 bg-border/60" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── RIGHT: Dashboard Mockup ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Glow behind dashboard */}
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-3xl scale-95 translate-y-4 pointer-events-none" />

            {/* Dashboard window */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)] bg-[hsl(228,60%,7%)]">

              {/* Window chrome */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[hsl(228,60%,6%)]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                </div>
                <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-md px-3 py-1">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] text-muted-foreground/50 font-mono">app.omnierp.io/dashboard</span>
                </div>
              </div>

              {/* App body */}
              <div className="flex h-[488px]">

                {/* Sidebar */}
                <div className="w-[110px] flex-shrink-0 border-r border-white/[0.06] bg-[hsl(228,60%,6.5%)] flex flex-col py-3 gap-0.5">
                  <div className="px-3 mb-2">
                    <div className="text-[9px] font-bold text-primary tracking-widest uppercase">OmniERP</div>
                  </div>
                  {sidebarItems.map(({ label, active }) => (
                    <div
                      key={label}
                      className={`mx-2 px-2.5 py-1.5 rounded-md text-[10px] font-medium cursor-default transition-colors ${
                        active
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground/50 hover:text-muted-foreground/80'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">

                  {/* Topbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[hsl(228,60%,7%)] flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                      <span>Dashboard</span>
                      <span>/</span>
                      <span className="text-foreground/70 font-medium">Overview</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-md px-2.5 py-1 text-[10px] text-muted-foreground/40 w-28">
                        <span>🔍</span>
                        <span>Search…</span>
                      </div>
                      <div className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center text-[11px] cursor-default relative">
                        🔔
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-[hsl(228,60%,7%)]" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[9px] font-bold text-white">
                        JD
                      </div>
                    </div>
                  </div>

                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2.5">

                    {/* KPI Row */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Total Revenue', value: '$7.2M', delta: '+14.3%', up: true },
                        { label: 'Orders', value: '1,847', delta: '+8.2%', up: true },
                        { label: 'Inventory', value: '94.1%', delta: '-1.2%', up: false },
                        { label: 'Employees', value: '342', delta: '+4', up: true },
                      ].map(({ label, value, delta, up }) => (
                        <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                          <div className="text-[9px] text-muted-foreground/50 mb-1">{label}</div>
                          <div className="text-[13px] font-bold">{value}</div>
                          <div className={`flex items-center gap-0.5 text-[9px] font-medium mt-0.5 ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
                            {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {delta}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Middle row: Chart + Pipeline */}
                    <div className="grid grid-cols-[3fr_2fr] gap-2 flex-1 min-h-0">

                      {/* Revenue chart */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                          <span className="text-[10px] font-semibold">Revenue Analytics</span>
                          <span className="text-[9px] text-muted-foreground/40 bg-white/[0.04] px-1.5 py-0.5 rounded">2024 YTD</span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
                              <defs>
                                <linearGradient id="heroRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(221,83%,53%)" stopOpacity={0.35} />
                                  <stop offset="100%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="m" tick={{ fontSize: 8, fill: 'rgba(148,163,184,0.4)' }} axisLine={false} tickLine={false} />
                              <Tooltip
                                contentStyle={{ background: 'hsl(228,60%,9%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 10, padding: '4px 8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(v: number) => [`$${v}M`, '']}
                              />
                              <Area type="monotone" dataKey="v" stroke="hsl(221,83%,53%)" strokeWidth={1.5} fill="url(#heroRev)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Sales pipeline */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 flex flex-col min-h-0">
                        <div className="text-[10px] font-semibold mb-2 flex-shrink-0">Sales Pipeline</div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          {pipelineStages.map(({ label, count, color, pct }) => (
                            <div key={label}>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[9px] text-muted-foreground/60">{label}</span>
                                <span className="text-[9px] font-medium">{count}</span>
                              </div>
                              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: color }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className="mt-auto pt-1 border-t border-white/[0.05]">
                            <div className="text-[9px] text-muted-foreground/40">Pipeline value</div>
                            <div className="text-[12px] font-bold text-[#22C55E]">$2.84M</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Invoices + AI Insights */}
                    <div className="grid grid-cols-[3fr_2fr] gap-2">

                      {/* Recent invoices */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                        <div className="text-[10px] font-semibold mb-2">Recent Invoices</div>
                        <table className="w-full">
                          <thead>
                            <tr>
                              {['Invoice', 'Client', 'Amount', 'Status'].map(h => (
                                <th key={h} className="text-left text-[8px] text-muted-foreground/35 font-medium pb-1.5">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map(({ id, client, amount, status }) => (
                              <tr key={id} className="border-t border-white/[0.04]">
                                <td className="py-1 text-[9px] text-primary/80 font-mono">{id}</td>
                                <td className="py-1 text-[9px] text-muted-foreground/60 truncate max-w-[70px]">{client}</td>
                                <td className="py-1 text-[9px] font-semibold">{amount}</td>
                                <td className="py-1"><StatusBadge status={status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* AI Insights */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[7px] font-bold">AI</div>
                          <span className="text-[10px] font-semibold">AI Insights</span>
                          <span className="ml-auto text-[8px] text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-full">Live</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {aiInsights.map(({ icon, color, text }, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[9px] text-muted-foreground/60 leading-tight">
                              <span className="mt-0.5 font-bold" style={{ color }}>{icon}</span>
                              {text}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/[0.05] text-[8px] text-muted-foreground/30">
                          Updated just now · GPT-4o
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
