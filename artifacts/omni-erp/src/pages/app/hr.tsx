import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Clock, UserPlus, Plus, Download, Filter, Search, MoreHorizontal, TrendingUp, Award, Calendar, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const headcountData = [
  { month: 'Jan', count: 318 }, { month: 'Feb', count: 322 }, { month: 'Mar', count: 328 },
  { month: 'Apr', count: 331 }, { month: 'May', count: 336 }, { month: 'Jun', count: 339 }, { month: 'Jul', count: 342 },
];

const payrollData = [
  { month: 'Jan', amount: 1.84 }, { month: 'Feb', amount: 1.87 }, { month: 'Mar', amount: 1.89 },
  { month: 'Apr', amount: 1.91 }, { month: 'May', amount: 1.94 }, { month: 'Jun', amount: 1.96 }, { month: 'Jul', amount: 2.01 },
];

const employees = [
  { id: 'EMP-0841', name: 'Sarah Kim', dept: 'Sales', role: 'Senior Account Executive', salary: 95000, status: 'active', joined: 'Mar 2022', initials: 'SK' },
  { id: 'EMP-0840', name: 'Mike Roberts', dept: 'Sales', role: 'Account Executive', salary: 78000, status: 'active', joined: 'Jun 2022', initials: 'MR' },
  { id: 'EMP-0839', name: 'Anna Park', dept: 'Engineering', role: 'Senior Developer', salary: 128000, status: 'active', joined: 'Jan 2021', initials: 'AP' },
  { id: 'EMP-0838', name: 'Tom Brown', dept: 'Engineering', role: 'DevOps Engineer', salary: 112000, status: 'active', joined: 'Sep 2021', initials: 'TB' },
  { id: 'EMP-0837', name: 'Linda Chen', dept: 'Finance', role: 'Financial Analyst', salary: 88000, status: 'on_leave', joined: 'Apr 2020', initials: 'LC' },
  { id: 'EMP-0836', name: 'James Doyle', dept: 'Admin', role: 'System Administrator', salary: 102000, status: 'active', joined: 'Feb 2019', initials: 'JD' },
];

const departments = [
  { name: 'Engineering', count: 84, budget: 9.8, utilization: 92 },
  { name: 'Sales', count: 62, budget: 5.2, utilization: 88 },
  { name: 'Finance', count: 28, budget: 2.8, utilization: 95 },
  { name: 'Operations', count: 94, budget: 6.4, utilization: 84 },
  { name: 'HR & Admin', count: 24, budget: 1.9, utilization: 79 },
  { name: 'Marketing', count: 31, budget: 2.4, utilization: 86 },
  { name: 'Customer Success', count: 19, budget: 1.6, utilization: 91 },
];

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  on_leave: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  terminated: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function HR() {
  const [tab, setTab] = useState('employees');
  return (
    <AppLayout breadcrumbs={[{ label: 'Business' }, { label: 'HR & Payroll' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">HR & Payroll</h1><p className="text-white/40 text-sm mt-0.5">342 employees · 7 departments · July 2026 payroll</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Hire Employee</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: '342', sub: '+4 this month', icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Monthly Payroll', value: '$2.01M', sub: '+2.5% vs last month', icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Open Positions', value: '18', sub: '6 offers pending', icon: UserPlus, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Attrition Rate', value: '3.2%', sub: 'Below 5% target', icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p><p className="text-xs text-white/40 mt-0.5">{k.label}</p><p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Headcount Growth</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={headcountData}>
                <defs><linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[310, 350]} />
                <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} />
                <Area type="monotone" dataKey="count" name="Employees" stroke="#2563EB" strokeWidth={2} fill="url(#hcGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Department Breakdown</h3>
            <div className="space-y-2.5">
              {departments.slice(0, 5).map((dept) => (
                <div key={dept.name} className="flex items-center gap-3">
                  <span className="text-sm text-white/60 w-28 truncate flex-shrink-0">{dept.name}</span>
                  <div className="flex-1"><Progress value={(dept.count / 342) * 100} className="h-1.5 bg-white/[0.07]" /></div>
                  <span className="text-sm font-semibold text-white w-8 text-right">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['employees', 'payroll', 'leaves', 'recruitment'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search employees..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="employees" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['Employee', 'Department', 'Role', 'Salary', 'Status', 'Joined', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7 flex-shrink-0"><AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-[9px] font-bold">{emp.initials}</AvatarFallback></Avatar>
                          <div><p className="text-sm font-medium text-white">{emp.name}</p><p className="text-xs text-white/30">{emp.id}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{emp.dept}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/60">{emp.role}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">${emp.salary.toLocaleString()}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[emp.status]} px-2 py-0`}>{emp.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/40">{emp.joined}</td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 6 of 342 records</p>
                <div className="flex items-center gap-1">{[1, 2, 3, '...', 57].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="font-semibold text-white">July 2026 Payroll</h3><p className="text-xs text-white/40">Due: Jul 31, 2026</p></div>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs">Pending Approval</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[{ l: 'Gross Pay', v: '$2.01M' }, { l: 'Deductions', v: '$284K' }, { l: 'Net Pay', v: '$1.73M' }].map(item => (
                  <div key={item.l} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                    <p className="text-lg font-bold text-white">{item.v}</p><p className="text-xs text-white/40 mt-0.5">{item.l}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={payrollData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                  <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} formatter={(v: any) => [`$${v}M`, 'Payroll']} />
                  <Bar dataKey="amount" name="Payroll" fill="#2563EB" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="leaves" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Leave Management</p><p className="text-white/30 text-sm mt-1">8 leave requests pending approval</p>
            </div>
          </TabsContent>

          <TabsContent value="recruitment" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <UserPlus className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Recruitment Pipeline</p><p className="text-white/30 text-sm mt-1">18 open positions · 42 candidates in pipeline</p>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><Plus className="w-3.5 h-3.5 mr-1.5" />Post Job</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
