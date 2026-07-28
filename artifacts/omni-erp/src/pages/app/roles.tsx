import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Edit, Plus, Search, MoreHorizontal, CheckCircle, XCircle, Users, ChevronDown } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const roles = [
  { id: 'ROLE-001', name: 'System Admin', users: 8, desc: 'Full system access — all modules and settings', color: 'from-purple-500/20 to-purple-500/5', textColor: 'text-purple-400', borderColor: 'border-purple-500/20' },
  { id: 'ROLE-002', name: 'Finance Manager', users: 12, desc: 'Full access to Finance, Banking, GST, Reports', color: 'from-[#2563EB]/20 to-[#2563EB]/5', textColor: 'text-[#2563EB]', borderColor: 'border-[#2563EB]/20' },
  { id: 'ROLE-003', name: 'Sales Manager', users: 24, desc: 'Access to Sales, CRM, Reports, Customer Portal', color: 'from-[#06B6D4]/20 to-[#06B6D4]/5', textColor: 'text-[#06B6D4]', borderColor: 'border-[#06B6D4]/20' },
  { id: 'ROLE-004', name: 'HR Manager', users: 6, desc: 'Access to HR, Payroll, User Management', color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  { id: 'ROLE-005', name: 'Operations Manager', users: 18, desc: 'Access to Inventory, Purchase, Manufacturing', color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
  { id: 'ROLE-006', name: 'Accountant', users: 28, desc: 'Read/write Finance, read-only Reports', color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-400', borderColor: 'border-rose-500/20' },
  { id: 'ROLE-007', name: 'Sales Rep', users: 42, desc: 'Access to Sales pipeline and CRM only', color: 'from-white/5 to-white/2', textColor: 'text-white/50', borderColor: 'border-white/10' },
  { id: 'ROLE-008', name: 'Viewer', users: 84, desc: 'Read-only access to all modules', color: 'from-white/5 to-white/2', textColor: 'text-white/50', borderColor: 'border-white/10' },
];

const modules = ['Dashboard', 'Finance', 'Banking', 'GST & Tax', 'Sales & CRM', 'Purchase', 'Inventory', 'Manufacturing', 'Projects', 'HR & Payroll', 'Reports', 'AI Assistant', 'Workflow', 'Documents', 'Customer Portal', 'Vendor Portal', 'Organization', 'User Management', 'Settings'];

type Permission = 'full' | 'read' | 'none';

const permMatrix: Record<string, Record<string, Permission>> = {
  'System Admin': Object.fromEntries(modules.map(m => [m, 'full'])) as Record<string, Permission>,
  'Finance Manager': Object.fromEntries(modules.map(m => ['Finance', 'Banking', 'GST & Tax', 'Reports'].includes(m) ? [m, 'full'] : ['Dashboard'].includes(m) ? [m, 'read'] : [m, 'none'])) as Record<string, Permission>,
  'Sales Manager': Object.fromEntries(modules.map(m => ['Sales & CRM', 'Customer Portal'].includes(m) ? [m, 'full'] : ['Dashboard', 'Reports'].includes(m) ? [m, 'read'] : [m, 'none'])) as Record<string, Permission>,
};

export default function Roles() {
  const [selected, setSelected] = useState(roles[0]);
  const [search, setSearch] = useState('');

  const perms = permMatrix[selected.name] || {};

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Roles & Permissions' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Roles & Permissions</h1><p className="text-white/40 text-sm mt-0.5">8 roles · 342 users assigned · RBAC model</p></div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />Create Role</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="space-y-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
            </div>
            {roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map((role) => (
              <motion.div key={role.id} whileHover={{ x: 2 }}
                onClick={() => setSelected(role)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected.id === role.id ? `bg-gradient-to-r ${role.color} ${role.borderColor}` : 'bg-[#0a0f1e] border-white/[0.07] hover:border-white/[0.12]'}`}>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0`}>
                  <Shield className={`w-4 h-4 ${role.textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${selected.id === role.id ? 'text-white' : 'text-white/80'}`}>{role.name}</p>
                  <p className="text-xs text-white/30">{role.users} users</p>
                </div>
                {selected.id === role.id && <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />}
              </motion.div>
            ))}
          </div>

          {/* Permissions Matrix */}
          <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.07]">
              <div>
                <h3 className="font-semibold text-white">{selected.name}</h3>
                <p className="text-xs text-white/40 mt-0.5">{selected.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{selected.users} users</Badge>
                <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-left text-xs font-medium text-white/30 px-4 py-3">Module</th>
                    <th className="text-center text-xs font-medium text-white/30 px-4 py-3">Full Access</th>
                    <th className="text-center text-xs font-medium text-white/30 px-4 py-3">Read Only</th>
                    <th className="text-center text-xs font-medium text-white/30 px-4 py-3">No Access</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod) => {
                    const perm = perms[mod] || (selected.name === 'System Admin' ? 'full' : 'none');
                    return (
                      <tr key={mod} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-sm text-white/70">{mod}</td>
                        {(['full', 'read', 'none'] as Permission[]).map((p) => (
                          <td key={p} className="px-4 py-2.5 text-center">
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto transition-all ${perm === p
                              ? p === 'full' ? 'bg-emerald-400 border-emerald-400' : p === 'read' ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-red-400 border-red-400'
                              : 'bg-transparent border-white/10'}`} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />Full Access</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#2563EB] inline-block" />Read Only</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />No Access</span>
              </div>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
