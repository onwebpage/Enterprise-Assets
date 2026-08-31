import { motion } from "framer-motion";
import { Link } from "wouter";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Play,
  PieChart,
  Box,
  Workflow,
  Building2,
  Bell,
  Search,
  Settings,
} from "lucide-react";

/* ─── Data ─────────────────────────────────────────────────────────── */
const revenueData = [
  { m: "Feb", v: 3.4 },
  { m: "Mar", v: 2.9 },
  { m: "Apr", v: 4.1 },
  { m: "May", v: 4.8 },
  { m: "Jun", v: 4.3 },
  { m: "Jul", v: 5.2 },
  { m: "Aug", v: 5.9 },
  { m: "Sep", v: 5.4 },
  { m: "Oct", v: 6.3 },
  { m: "Nov", v: 6.8 },
  { m: "Dec", v: 7.2 },
];

const pipelineStages = [
  { label: "Leads", count: 284, pct: 100 },
  { label: "Qualified", count: 181, pct: 64 },
  { label: "Proposal", count: 97, pct: 34 },
  { label: "Negotiation", count: 54, pct: 19 },
  { label: "Closed", count: 38, pct: 13 },
];

const invoices = [
  {
    id: "INV-4821",
    client: "Stratford Industries",
    amount: "$48,200",
    status: "Paid",
  },
  {
    id: "INV-4820",
    client: "Apex Global",
    amount: "$31,500",
    status: "Pending",
  },
  {
    id: "INV-4819",
    client: "Meridian Corp",
    amount: "$92,750",
    status: "Paid",
  },
];

const aiInsights = [
  { text: "Pipeline value $2.84M" },
  { text: "Inventory for SKU-2841 below threshold" },
  { text: "3 procurement approvals pending" },
];

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: DollarSign, label: "Finance", active: false },
  { icon: PieChart, label: "Sales", active: false },
  { icon: Users, label: "HR", active: false },
  { icon: Box, label: "Inventory", active: false },
  { icon: Users, label: "CRM", active: false },
  { icon: Building2, label: "Manufacturing", active: false },
  { icon: Package, label: "Reports", active: false },
  { icon: Workflow, label: "AI Ops", active: false },
];

/* ─── Hero ─────────────────────────────────────────────────────────── */
export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-24 pb-16">
      {/* Primary glow — center right */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.12] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/4 -translate-y-1/2 w-[600px] h-[500px] rounded-full bg-accent/[0.08] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-[45fr_55fr] gap-12 lg:gap-16 items-center">
          {/* ── LEFT: Copy ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] uppercase tracking-[0.15em] font-medium self-start">
              Enterprise-Grade ERP Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-bold leading-[1.05] tracking-tight">
              Run Your Entire
              <br />
              Enterprise From
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                One Platform.
              </span>
            </h1>

            <p className="text-[17px] text-slate-400 leading-relaxed max-w-lg">
              OmniERP unifies finance, operations, supply chain, HR, and CRM
              into a single AI-powered command center — built for the scale,
              security, and complexity of modern enterprise.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/signup"
                className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-3.5 text-[15px] font-medium transition-colors inline-flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#demo"
                className="bg-transparent hover:bg-white/[0.06] text-white border border-white/15 rounded-lg px-6 py-3.5 text-[15px] font-medium transition-colors inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Book Demo
              </a>
            </div>

            <div className="mt-8 pt-8 border-t border-white/[0.06] flex items-center gap-12">
              <div>
                <div className="text-3xl font-bold tabular-nums">10,000+</div>
                <div className="text-[13px] text-slate-400 mt-1">
                  Enterprises
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">$2T+</div>
                <div className="text-[13px] text-slate-400 mt-1">Processed</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">150+</div>
                <div className="text-[13px] text-slate-400 mt-1">Countries</div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Dashboard Mockup ──────────────────────────────── */}
          <motion.div
            initial={{
              opacity: 0,
              y: 40,
              rotateX: 10,
              rotateY: -10,
              scale: 0.95,
            }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 1,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.1,
            }}
            style={{ perspective: 1200 }}
            className="relative lg:ml-auto w-full max-w-[800px]"
          >
            <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#050816] shadow-[0_0_80px_rgba(37,99,235,0.15),0_0_120px_rgba(6,182,212,0.08)]">
              {/* Browser Chrome */}
              <div className="h-10 bg-[#0a0f1e] border-b border-white/[0.06] flex items-center px-4 gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white/5 rounded-md px-3 py-1 flex items-center gap-2 w-full max-w-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] text-slate-400 font-mono">
                      app.omnierp.io/dashboard
                    </span>
                  </div>
                </div>
              </div>

              {/* App Body */}
              <div className="flex h-[520px]">
                {/* Sidebar */}
                <div className="w-[180px] bg-[#0a0f1e] border-r border-white/[0.06] flex flex-col py-4">
                  <div className="px-4 mb-6 flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent" />
                    <span className="font-bold text-[14px]">OmniERP</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1 px-2">
                    {sidebarItems.map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          item.active
                            ? "bg-primary text-white"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <item.icon className="w-4 h-4 opacity-70" />
                        {item.label}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 mt-auto">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                        JD
                      </div>
                      <div className="text-[12px] font-medium text-slate-300">
                        Settings
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[#050816]">
                  {/* Top bar */}
                  <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6">
                    <div className="text-[13px] text-slate-400 font-medium">
                      Dashboard <span className="mx-2">/</span>{" "}
                      <span className="text-white">Overview</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 flex items-center gap-2 w-48">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[12px] text-slate-400">
                          Search...
                        </span>
                      </div>
                      <div className="relative">
                        <Bell className="w-4 h-4 text-slate-400" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary border-2 border-[#050816]" />
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        {
                          label: "Total Revenue",
                          value: "$7.2M",
                          delta: "+14.3%",
                          up: true,
                        },
                        {
                          label: "Orders",
                          value: "1,847",
                          delta: "+8.2%",
                          up: true,
                        },
                        {
                          label: "Inventory",
                          value: "94.1%",
                          delta: "-1.2%",
                          up: false,
                        },
                        {
                          label: "Employees",
                          value: "342",
                          delta: "+4",
                          up: true,
                        },
                      ].map((kpi, i) => (
                        <div
                          key={i}
                          className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-3.5"
                        >
                          <div className="text-[11px] text-slate-400 font-medium mb-1">
                            {kpi.label}
                          </div>
                          <div className="text-[16px] font-bold tabular-nums">
                            {kpi.value}
                          </div>
                          <div
                            className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${kpi.up ? "text-green-400" : "text-red-400"}`}
                          >
                            {kpi.up ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {kpi.delta}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Middle Row */}
                    <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
                      {/* Chart */}
                      <div className="col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 flex flex-col">
                        <div className="text-[13px] font-medium text-white mb-4">
                          Revenue Analytics
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={revenueData}
                              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorRev"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="hsl(var(--primary))"
                                    stopOpacity={0.3}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="hsl(var(--primary))"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <Area
                                type="monotone"
                                dataKey="v"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRev)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Pipeline */}
                      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 flex flex-col">
                        <div className="text-[13px] font-medium text-white mb-4">
                          Sales Pipeline
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          {pipelineStages.map((stage, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between text-[11px] mb-1.5">
                                <span className="text-slate-400">
                                  {stage.label}
                                </span>
                                <span className="text-white font-medium tabular-nums">
                                  {stage.count}
                                </span>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${stage.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Invoices */}
                      <div className="col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
                        <div className="text-[13px] font-medium text-white mb-3">
                          Recent Invoices
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {invoices.map((inv, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-[12px]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 font-mono">
                                  {inv.id}
                                </span>
                                <span className="text-white">{inv.client}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-slate-300 tabular-nums">
                                  {inv.amount}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    inv.status === "Paid"
                                      ? "bg-green-500/10 text-green-400"
                                      : "bg-amber-500/10 text-amber-400"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Insights */}
                      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                        <div className="text-[13px] font-medium text-white mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                          AI Insights
                        </div>
                        <div className="flex flex-col gap-2">
                          {aiInsights.map((insight, i) => (
                            <div
                              key={i}
                              className="text-[11px] text-slate-300 leading-snug flex items-start gap-1.5"
                            >
                              <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                              {insight.text}
                            </div>
                          ))}
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
