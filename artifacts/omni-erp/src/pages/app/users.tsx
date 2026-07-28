import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Shield, Clock, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Lock, Unlock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const users = [
  { id: 'USR-001', name: 'James Doyle', email: 'j.doyle@apexglobal.io', role: 'System Admin', dept: 'IT', status: 'active', lastLogin: '10 min ago', mfa: true, initials: 'JD' },
  { id: 'USR-002', name: 'Sarah Kim', email: 's.kim@apexglobal.io', role: 'Sales Manager', dept: 'Sales', status: 'active', lastLogin: '1h ago', mfa: true, initials: 'SK' },
  { id: 'USR-003', name: 'Anna Park', email: 'a.park@apexglobal.io', role: 'Developer', dept: 'Engineering', status: 'active', lastLogin: '2h ago', mfa: false, initials: 'AP' },
  { id: 'USR-004', name: 'Mike Roberts', email: 'm.roberts@apexglobal.io', role: 'Sales Rep', dept: 'Sales', status: 'active', lastLogin: '3h ago', mfa: true, initials: 'MR' },
  { id: 'USR-005', name: 'Linda Chen', email: 'l.chen@apexglobal.io', role: 'Finance Manager', dept: 'Finance', status: 'on_leave', lastLogin: '3d ago', mfa: true, initials: 'LC' },
  { id: 'USR-006', name: 'Tom Brown', email: 't.brown@apexglobal.io', role: 'DevOps Engineer', dept: 'Engineering', status: 'active', lastLogin: '4h ago', mfa: false, initials: 'TB' },
  { id: 'USR-007', name: 'Emma Wilson', email: 'e.wilson@apexglobal.io', role: 'HR Manager', dept: 'HR', status: 'inactive', lastLogin: '2w ago', mfa: false, initials: 'EW' },
  { id: 'USR-008', name: 'Robert Shaw', email: 'r.shaw@apexglobal.io', role: 'Accountant', dept: 'Finance', status: 'active', lastLogin: '5h ago', mfa: true, initials: 'RS' },
];

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-red-500/15 text-red-400 border-red-500/20',
  on_leave: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  pending: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
};

const roleColors: Record<string, string> = {
  'System Admin': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Finance Manager': 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  'Sales Manager': 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  default: 'bg-white/5 text-white/50 border-white/10',
};

export default function UserManagement() {
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'User Management' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">User Management</h1><p className="text-white/40 text-sm mt-0.5">342 users · 18 roles · 28 pending invitations</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Invite User</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: '342', sub: '319 active', icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Admin Users', value: '8', sub: 'Full access', icon: Shield, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5' },
            { label: 'MFA Enabled', value: '68%', sub: '232 users secured', icon: Lock, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Pending Invites', value: '28', sub: 'Expires in 7 days', icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p><p className="text-xs text-white/40 mt-0.5">{k.label}</p><p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* MFA Warning */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">110 users don't have MFA enabled. <button className="underline hover:no-underline">Send reminder emails</button></p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['users', 'invitations', 'sessions'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-52" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="users" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['User', 'Role', 'Department', 'Status', 'MFA', 'Last Login', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-[9px] font-bold">{u.initials}</AvatarFallback></Avatar>
                          <div><p className="text-sm font-medium text-white">{u.name}</p><p className="text-xs text-white/40">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border px-2 py-0 ${roleColors[u.role] || roleColors.default}`}>{u.role}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/50">{u.dept}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] border ${statusStyle[u.status]} px-2 py-0`}>{u.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3">
                        {u.mfa
                          ? <div className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5" />Enabled</div>
                          : <div className="flex items-center gap-1 text-white/30 text-xs"><AlertCircle className="w-3.5 h-3.5" />Disabled</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/40">{u.lastLogin}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing {filtered.length} of 342 users</p>
                <div className="flex items-center gap-1">{[1, 2, 3, '...', 43].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <UserPlus className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Pending Invitations</p>
              <p className="text-white/30 text-sm mt-1">28 invites sent · 7 expire in 24 hours</p>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Invite New User</Button>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Active Sessions</p>
              <p className="text-white/30 text-sm mt-1">214 active sessions right now</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
