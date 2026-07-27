import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings,
  Building2, DollarSign, TrendingUp, Calendar
} from 'lucide-react';

const revenueData = [
  { month: 'Jan', value: 1200 },
  { month: 'Feb', value: 1900 },
  { month: 'Mar', value: 1600 },
  { month: 'Apr', value: 2200 },
  { month: 'May', value: 2800 },
  { month: 'Jun', value: 3200 },
];

const salesData = [
  { name: 'Product A', value: 4200 },
  { name: 'Product B', value: 3800 },
  { name: 'Product C', value: 2900 },
  { name: 'Product D', value: 2100 },
];

const expensesData = [
  { name: 'Operations', value: 45, color: 'hsl(var(--primary))' },
  { name: 'Marketing', value: 25, color: 'hsl(var(--accent))' },
  { name: 'Payroll', value: 20, color: 'hsl(var(--chart-3))' },
  { name: 'Other', value: 10, color: 'hsl(var(--chart-4))' },
];

const inventoryData = [
  { item: 'Raw Materials', stock: 850 },
  { item: 'WIP', stock: 420 },
  { item: 'Finished Goods', stock: 1240 },
];

export function DashboardPreview() {
  return (
    <section id="solutions" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            See OmniERP
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              In Action.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A unified dashboard that gives you real-time visibility into every aspect of your business.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glassmorphism rounded-3xl p-6 shadow-2xl"
        >
          {/* Top Nav */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Executive Dashboard</h3>
                <p className="text-xs text-muted-foreground">Real-time overview</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 glassmorphism rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Last 6 months</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
                JD
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-2">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', active: true },
                { icon: ShoppingCart, label: 'Sales' },
                { icon: Package, label: 'Inventory' },
                { icon: Users, label: 'HR' },
                { icon: FileText, label: 'Finance' },
                { icon: Settings, label: 'Settings' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    item.active
                      ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden xl:block">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: ShoppingCart, label: 'Orders', value: '1,847', change: '+12%', color: 'from-primary to-accent' },
                  { icon: FileText, label: 'Invoices', value: '342', change: '+8%', color: 'from-accent to-primary' },
                  { icon: Users, label: 'Employees', value: '156', change: '+2', color: 'from-chart-3 to-chart-4' },
                  { icon: DollarSign, label: 'Revenue', value: '$3.2M', change: '+18%', color: 'from-chart-4 to-chart-3' },
                ].map((kpi, i) => (
                  <div key={i} className="glassmorphism rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
                      <kpi.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
                    <div className="text-xl font-bold mb-1">{kpi.value}</div>
                    <div className="text-xs text-[#22C55E]">{kpi.change}</div>
                  </div>
                ))}
              </div>

              {/* Revenue Chart */}
              <div className="glassmorphism rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Revenue Trend</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-[#22C55E]">+24%</span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sales & Inventory */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="glassmorphism rounded-xl p-6">
                  <h4 className="font-semibold mb-4">Sales by Product</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glassmorphism rounded-xl p-6">
                  <h4 className="font-semibold mb-4">Inventory Status</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis dataKey="item" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="stock" fill="hsl(var(--chart-3))" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-3 space-y-6">
              {/* Expenses Breakdown */}
              <div className="glassmorphism rounded-xl p-6">
                <h4 className="font-semibold mb-4">Expenses</h4>
                <div className="h-40 flex items-center justify-center mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {expensesData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar Widget */}
              <div className="glassmorphism rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Calendar</h4>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-muted-foreground font-medium">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - 2;
                    const isToday = day === 15;
                    const hasEvent = [8, 12, 20, 24].includes(day);
                    return day > 0 && day <= 30 ? (
                      <div
                        key={i}
                        className={`aspect-square flex items-center justify-center rounded ${
                          isToday
                            ? 'bg-gradient-to-br from-primary to-accent text-white font-bold'
                            : hasEvent
                            ? 'bg-accent/20 text-accent font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {day}
                      </div>
                    ) : (
                      <div key={i} />
                    );
                  })}
                </div>
              </div>

              {/* AI Insights */}
              <div className="glassmorphism rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold">AI Insights</h4>
                </div>
                <div className="space-y-3">
                  {[
                    { text: 'Revenue up 18% vs last quarter', color: 'text-[#22C55E]' },
                    { text: 'Inventory low for Product X', color: 'text-[#F59E0B]' },
                    { text: '3 invoices overdue', color: 'text-destructive' },
                  ].map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span className={insight.color}>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="glassmorphism rounded-xl p-6">
                <h4 className="font-semibold mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  {[
                    { user: 'Sarah Chen', action: 'created invoice #1847', time: '2m ago' },
                    { user: 'Mike Johnson', action: 'approved PO #234', time: '15m ago' },
                    { user: 'Lisa Wong', action: 'updated inventory', time: '1h ago' },
                  ].map((notif, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {notif.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{notif.user}</span>
                          <span className="text-muted-foreground"> {notif.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{notif.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
