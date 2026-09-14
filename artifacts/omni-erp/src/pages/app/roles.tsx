import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Edit, Plus, Search, MoreHorizontal, CheckCircle, XCircle, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, type ApiListResponse } from '@/lib/api';
import RolesFunctional from '@/pages/app/roles-functional';

interface PermissionRow {
  id: number;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number | null;
  permissions: PermissionRow[];
}

// Visual palette per position index
const ROLE_STYLES = [
  { color: 'from-purple-500/20 to-purple-500/5',   textColor: 'text-purple-400',  borderColor: 'border-purple-500/20'  },
  { color: 'from-[#2563EB]/20 to-[#2563EB]/5',     textColor: 'text-[#2563EB]',   borderColor: 'border-[#2563EB]/20'   },
  { color: 'from-[#06B6D4]/20 to-[#06B6D4]/5',     textColor: 'text-[#06B6D4]',   borderColor: 'border-[#06B6D4]/20'   },
  { color: 'from-emerald-500/20 to-emerald-500/5',  textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  { color: 'from-amber-500/20 to-amber-500/5',      textColor: 'text-amber-400',   borderColor: 'border-amber-500/20'   },
  { color: 'from-rose-500/20 to-rose-500/5',        textColor: 'text-rose-400',    borderColor: 'border-rose-500/20'    },
  { color: 'from-white/5 to-white/2',               textColor: 'text-white/50',    borderColor: 'border-white/10'       },
  { color: 'from-white/5 to-white/2',               textColor: 'text-white/50',    borderColor: 'border-white/10'       },
];

function LegacyRoles() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<ApiListResponse<RoleRow>>('/roles'),
    select: (res) => res.data,
  });

  const roles = data ?? [];
  const selected = roles.find(r => r.id === selectedId) ?? roles[0];
  const filtered = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Roles & Permissions' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
            <p className="text-white/40 text-sm mt-0.5">{roles.length} roles · RBAC model</p>
          </div>
          <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Create Role
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="space-y-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..."
                className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
            </div>

            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
              ))
            ) : filtered.map((role, idx) => {
              const style = ROLE_STYLES[idx % ROLE_STYLES.length];
              const isSelected = selected?.id === role.id;
              return (
                <motion.div key={role.id} whileHover={{ x: 2 }}
                  onClick={() => setSelectedId(role.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? `bg-gradient-to-r ${style.color} ${style.borderColor}` : 'bg-[#0a0f1e] border-white/[0.07] hover:border-white/[0.12]'}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${style.color} flex items-center justify-center flex-shrink-0`}>
                    <Shield className={`w-4 h-4 ${style.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/80'}`}>{role.name}</p>
                    <p className="text-xs text-white/30">{role.userCount ?? 0} users</p>
                  </div>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />}
                </motion.div>
              );
            })}
          </div>

          {/* Permissions Matrix */}
          <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
            {!selected ? (
              <div className="flex items-center justify-center h-48 text-white/30 text-sm">Select a role to view permissions</div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-white/[0.07]">
                  <div>
                    <h3 className="font-semibold text-white">{selected.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{selected.description ?? 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{selected.userCount ?? 0} users</Badge>
                    <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {selected.permissions.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-white/30 text-sm">No permissions configured for this role</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                          <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">Module</th>
                          {['View', 'Create', 'Edit', 'Delete'].map(a => (
                            <th key={a} className="text-center text-[11px] font-semibold text-white/30 uppercase tracking-wide px-3 py-3 w-20">{a}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.permissions.map((p) => (
                          <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 text-sm text-white/70">{p.module}</td>
                            {[p.canView, p.canCreate, p.canEdit, p.canDelete].map((v, i) => (
                              <td key={i} className="px-3 py-2.5 text-center">
                                {v
                                  ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                                  : <XCircle className="w-4 h-4 text-white/15 mx-auto" />}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default RolesFunctional;
