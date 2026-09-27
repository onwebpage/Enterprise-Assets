import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const revenueData = [
  { month: "Jan", value: 1.2 },
  { month: "Feb", value: 1.9 },
  { month: "Mar", value: 1.6 },
  { month: "Apr", value: 2.2 },
  { month: "May", value: 2.8 },
  { month: "Jun", value: 3.2 },
];

const salesData = [
  { name: "Hardware", value: 420 },
  { name: "Software", value: 380 },
  { name: "Services", value: 290 },
  { name: "Training", value: 210 },
];

const expensesData = [
  { name: "Ops", value: 45, color: "hsl(var(--primary))" },
  { name: "Mktg", value: 25, color: "#06B6D4" },
  { name: "R&D", value: 20, color: "#8B5CF6" },
  { name: "Admin", value: 10, color: "#F59E0B" },
];

export function DashboardPreview() {
  return (
    <section id="solutions" className="py-24 relative bg-[#050816]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] uppercase tracking-[0.15em] font-medium mb-6">
            Command Center
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight text-white">
            One dashboard.
            <br />
            Every metric. Real-time.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative max-w-[1000px] mx-auto"
        >
          {/* Ambient Monitor Glow */}
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

          {/* Monitor Mockup */}
          <div className="relative bg-[#050816] rounded-xl border border-white/[0.15] p-2 shadow-[0_40px_120px_rgba(37,99,235,0.2)]">
            <div className="bg-[#0a0f1e] rounded-lg border border-white/[0.06] overflow-hidden">
              {/* Fake Top Bar */}
              <div className="h-12 border-b border-white/[0.06] flex items-center justify-between px-6 bg-white/[0.02]">
                <div className="text-[13px] font-semibold text-white">
                  Executive Overview
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-slate-400 bg-white/5 px-2 py-1 rounded">
                    Last 6 Months
                  </div>
                </div>
              </div>

              {/* Grid Content */}
              <div className="p-6 grid grid-cols-3 gap-6">
                {/* Main Area Chart */}
                <div className="col-span-2 bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                  <h3 className="text-[12px] font-medium text-slate-400 mb-4 uppercase tracking-wider">
                    Revenue Trend (M)
                  </h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient
                            id="colorRevPrev"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `₹${v}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorRevPrev)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 flex flex-col">
                  <h3 className="text-[12px] font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    OPEX Breakdown
                  </h3>
                  <div className="flex-1 flex items-center justify-center min-h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesData}
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {expensesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {expensesData.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <div
                          className="w-2 h-2 rounded-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-300">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="col-span-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                  <h3 className="text-[12px] font-medium text-slate-400 mb-4 uppercase tracking-wider">
                    Sales by Category (K)
                  </h3>
                  <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Bar
                          dataKey="value"
                          fill="#06B6D4"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Monitor Base (visual detail) */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-4 bg-gradient-to-b from-[#1a1f2e] to-[#0a0f1e] rounded-b-xl border border-t-0 border-white/[0.1] -z-10" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
