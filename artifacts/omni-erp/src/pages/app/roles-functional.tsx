import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus, Search, Shield, Trash2 } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api, type ApiListResponse, type ApiResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface PermissionRow {
  id?: number;
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
  userCount: number;
  permissions: PermissionRow[];
}

const actionLabels = [
  ['canView', 'View'],
  ['canCreate', 'Create'],
  ['canEdit', 'Edit'],
  ['canDelete', 'Delete'],
] as const;

function moduleLabel(module: string) {
  return module.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export default function RolesFunctional() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [draftPermissions, setDraftPermissions] = useState<PermissionRow[]>([]);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<ApiListResponse<RoleRow>>('/roles'),
    select: (response) => response.data,
  });
  const modulesQuery = useQuery({
    queryKey: ['role-modules'],
    queryFn: () => api.get<ApiListResponse<string>>('/roles/modules'),
    select: (response) => response.data,
  });
  const roles = rolesQuery.data ?? [];
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0] ?? null;
  const filtered = roles.filter((role) => role.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!selected) {
      setDraftPermissions([]);
      return;
    }
    const existing = new Map(selected.permissions.map((permission) => [permission.module, permission]));
    setDraftPermissions((modulesQuery.data ?? []).map((module) => ({
      module,
      ...existing.get(module),
      canView: existing.get(module)?.canView ?? false,
      canCreate: existing.get(module)?.canCreate ?? false,
      canEdit: existing.get(module)?.canEdit ?? false,
      canDelete: existing.get(module)?.canDelete ?? false,
    })));
  }, [selected?.id, selected?.permissions, modulesQuery.data]);

  const createRole = useMutation({
    mutationFn: () => api.post<ApiResponse<RoleRow>>('/roles', { name, description }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedId(response.data.id);
      setEditorOpen(false);
      toast({ title: 'Role created' });
    },
    onError: (error) => toast({ title: 'Could not create role', description: error.message, variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: (role: RoleRow) => api.put<ApiListResponse<RoleRow>>(`/roles/${role.id}`, {
      name,
      description,
      permissions: draftPermissions,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditorOpen(false);
      toast({ title: 'Role and permissions saved' });
    },
    onError: (error) => toast({ title: 'Could not save role', description: error.message, variant: 'destructive' }),
  });

  const deleteRole = useMutation({
    mutationFn: (role: RoleRow) => api.delete(`/roles/${role.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedId(null);
      toast({ title: 'Role deleted' });
    },
    onError: (error) => toast({ title: 'Could not delete role', description: error.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setEditorOpen(true);
  };

  const openEdit = (role: RoleRow) => {
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description ?? '');
    setEditorOpen(true);
  };

  const togglePermission = (module: string, action: keyof Omit<PermissionRow, 'id' | 'module'>) => {
    setDraftPermissions((current) => current.map((permission) => permission.module === module
      ? { ...permission, [action]: !permission[action] }
      : permission));
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Roles & Permissions' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
            <p className="text-white/40 text-sm mt-0.5">{roles.length} roles · RBAC model</p>
          </div>
          <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Create Role
          </Button>
        </div>

        {rolesQuery.isError && <p className="text-sm text-red-400">Failed to load roles. Refresh and try again.</p>}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
            </div>
            {rolesQuery.isLoading ? <div className="h-14 rounded-xl bg-white/[0.03] animate-pulse" /> : filtered.map((role) => (
              <button key={role.id} type="button" onClick={() => setSelectedId(role.id)} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${selected?.id === role.id ? 'bg-[#2563EB]/15 border-[#2563EB]/30' : 'bg-[#0a0f1e] border-white/[0.07] hover:border-white/[0.12]'}`}>
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/15 flex items-center justify-center"><Shield className="w-4 h-4 text-[#60a5fa]" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{role.name}</p><p className="text-xs text-white/30">{role.userCount} users</p></div>
              </button>
            ))}
          </div>

          <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
            {!selected ? <div className="p-10 text-center text-white/30 text-sm">No roles found.</div> : <>
              <div className="flex items-center justify-between gap-4 p-4 border-b border-white/[0.07]">
                <div><h3 className="font-semibold text-white">{selected.name}</h3><p className="text-xs text-white/40 mt-0.5">{selected.description ?? 'No description'}</p></div>
                <div className="flex items-center gap-2"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{selected.userCount} users</Badge><Button variant="ghost" size="icon" aria-label="Edit role" onClick={() => openEdit(selected)}><Edit className="w-4 h-4" /></Button>{!selected.isSystem && <Button variant="ghost" size="icon" aria-label="Delete role" onClick={() => { if (window.confirm(`Delete role ${selected.name}?`)) deleteRole.mutate(selected); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>}</div>
              </div>
              <div className="p-4 space-y-3">
                {modulesQuery.isLoading ? <p className="text-sm text-white/40">Loading module permissions...</p> : draftPermissions.map((permission) => <div key={permission.module} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_repeat(4,minmax(4.5rem,auto))] gap-3 items-center border-b border-white/[0.05] pb-3"><span className="text-sm text-white/70">{moduleLabel(permission.module)}</span>{actionLabels.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-xs text-white/50"><input type="checkbox" checked={permission[key]} disabled={selected.isSystem || updateRole.isPending} onChange={() => togglePermission(permission.module, key)} className="h-4 w-4 accent-blue-600" />{label}</label>)}</div>)}
                <div className="flex justify-end"><Button disabled={selected.isSystem || updateRole.isPending || modulesQuery.isLoading} onClick={() => updateRole.mutate(selected)}>{updateRole.isPending ? 'Saving...' : 'Save Permissions'}</Button></div>
              </div>
            </>}
          </div>
        </div>
      </div>
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="bg-[#0a0f1e] border-white/[0.1] text-white">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Role' : 'Create Role'}</DialogTitle></DialogHeader>
          <div className="space-y-4"><div><label className="text-sm text-white/60">Role name</label><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" /></div><div><label className="text-sm text-white/60">Description</label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className="mt-1 bg-white/[0.04] border-white/[0.1] text-white" /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button disabled={!name.trim() || createRole.isPending || updateRole.isPending} onClick={() => editingId ? updateRole.mutate(selected!) : createRole.mutate()}>{createRole.isPending || updateRole.isPending ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
