import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Shield, Clock, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Lock, Unlock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api, type ApiListResponse } from '@/lib/api';
import { TableRowSkeleton } from '@/components/app/LoadingSkeleton';

interface UserRow {
  id: number;
  roleId: number | null;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  roleName: string | null;
  deptName: string | null;
}

const statusStyle: Record<string, string> = {
  active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-red-500/15 text-red-400 border-red-500/20',
  on_leave: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  pending:  'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
};

const roleColors: Record<string, string> = {
  'System Admin':    'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Finance Manager': 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  'Sales Manager':   'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
};

function initials(u: UserRow) {
  return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UserManagement() {
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get<ApiListResponse<UserRow>>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  const users = data?.data ?? [];
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<ApiListResponse<{ id: number; name: string }>>('/roles'),
    select: (response) => response.data,
  });
  const updateRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number | null }) => api.put(`/users/${userId}`, { roleId }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });
  const total = data?.total ?? 0;
  const activeCount = users.filter(u => u.status === 'active').length;
  const adminCount = users.filter(u => u.roleName === 'System Admin').length;
  const mfaCount = users.filter(u => u.mfaEnabled).length;
  const mfaPct = total > 0 ? Math.round((mfaCount / total) * 100) : 0;

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'User Management' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-white/40 text-sm mt-0.5">{total} users · {activeCount} active</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />Invite User
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users',    value: String(total),     sub: `${activeCount} active`,       icon: Users,  color: 'text-[#2563EB]',   bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Admin Users',    value: String(adminCount),sub: 'Full access',                  icon: Shield, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5' },
            { label: 'MFA Enabled',    value: `${mfaPct}%`,      sub: `${mfaCount} users secured`,    icon: Lock,   color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Pending Invites',value: '0',               sub: 'No pending',                   icon: Clock,  color: 'text-amber-400',   bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`w-4.5 h-4.5 ${k.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.sub}</p>
              <p className="text-xs text-white/60 font-medium mt-1">{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Alert */}
        {mfaPct < 100 && total > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-sm text-amber-300/80">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            {total - mfaCount} users don't have MFA enabled.
            <button className="ml-auto text-amber-400 hover:text-amber-300 font-medium text-xs underline underline-offset-2">Send reminder emails</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
            <Tabs value={tab} onValueChange={setTab} className="flex-1">
              <TabsList className="bg-white/[0.04] border border-white/[0.07]">
                <TabsTrigger value="users" className="text-xs data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">Users</TabsTrigger>
                <TabsTrigger value="invitations" className="text-xs data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">Invitations</TabsTrigger>
                <TabsTrigger value="sessions" className="text-xs data-[state=active]:bg-[#2563EB] data-[state=active]:text-white">Sessions</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-56" />
            </div>
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white h-8">
              <Filter className="w-3.5 h-3.5 mr-1.5" />Filter
            </Button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">User</th>
                <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">Role</th>
                <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">Department</th>
                <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">MFA</th>
                <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">Last Login</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : error ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-red-400">Failed to load users</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="bg-gradient-to-br from-[#2563EB]/60 to-[#06B6D4]/60 text-white text-xs font-bold">{initials(u)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-white/40">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select aria-label={`Role for ${u.email}`} value={u.roleId ?? ''} onChange={(event) => updateRole.mutate({ userId: u.id, roleId: event.target.value ? Number(event.target.value) : null })} className={`max-w-40 rounded-md border px-2 py-1 text-xs ${roleColors[u.roleName ?? ''] ?? 'bg-white/5 text-white/70 border-white/10'}`}>
                      <option value="">No role</option>
                      {(rolesData ?? []).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">{u.deptName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[11px] border ${statusStyle[u.status] ?? 'bg-white/5 text-white/50 border-white/10'}`}>
                      {u.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.mfaEnabled
                      ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3.5 h-3.5" />Enabled</span>
                      : <span className="flex items-center gap-1 text-xs text-white/30"><AlertCircle className="w-3.5 h-3.5" />Disabled</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/50">{timeAgo(u.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
