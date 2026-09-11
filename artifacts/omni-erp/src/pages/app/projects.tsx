import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FolderKanban, Pencil, Plus, Search, Trash2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";

type Project = { id: number; code: string; name: string; description: string | null; status: string; managerId: number | null; startDate: string | null; endDate: string | null; budget: string; isArchived: boolean };
type FormState = Omit<Project, "id" | "isArchived">;
const emptyForm: FormState = { code: "", name: "", description: "", status: "planned", managerId: null, startDate: "", endDate: "", budget: "0" };
const statuses = ["planned", "active", "on_hold", "completed", "cancelled"];

export default function Projects() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const permissions = useQuery({ queryKey: ["projects", "permissions"], queryFn: () => api.get<{ success: boolean; data: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean } }>("/projects/my-permissions") });
  const projects = useQuery({ queryKey: ["projects", search, status], queryFn: () => api.get<{ success: boolean; data: Project[] }>(`/projects?search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`), enabled: permissions.data?.data.canView !== false });
  const save = useMutation({ mutationFn: (value: FormState) => editing ? api.put(`/projects/${editing}`, value) : api.post("/projects", value), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setOpen(false); setEditing(null); setForm(emptyForm); } });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/projects/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }) });

  function edit(project: Project) { setEditing(project.id); setForm({ code: project.code, name: project.name, description: project.description ?? "", status: project.status, managerId: project.managerId, startDate: project.startDate ?? "", endDate: project.endDate ?? "", budget: project.budget }); setOpen(true); }
  async function exportCsv() { const response = await fetch("/api/projects/export/csv", { headers: { Authorization: `Bearer ${getToken()}` } }); if (!response.ok) return; const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "projects.csv"; link.click(); URL.revokeObjectURL(url); }

  return (
    <AppLayout breadcrumbs={[{ label: "Business" }, { label: "Projects" }]}>
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><FolderKanban className="h-5 w-5" /></div><div><h1 className="text-xl font-semibold text-white">Projects</h1><p className="text-sm text-white/40">Plan and track company projects.</p></div></div>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 h-3.5 w-3.5" />Export CSV</Button>{permissions.data?.data.canCreate !== false && <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />New project</Button>}</div>
        </div>
        <div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-white/25" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code or name" className="w-64 pl-9" /></div><select value={status} onChange={e => setStatus(e.target.value)} className="h-9 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white"><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0a0f1e]
          "><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.07] text-left text-xs text-white/35"><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3" /></tr></thead><tbody>{(projects.data?.data ?? []).map(project => <tr key={project.id} className="border-b border-white/[0.05] text-white/70"><td className="px-4 py-3 font-mono text-blue-300">{project.code}</td><td className="px-4 py-3"><p className="font-medium text-white">{project.name}</p>{project.description && <p className="max-w-md truncate text-xs text-white/35">{project.description}</p>}</td><td className="px-4 py-3 capitalize">{project.status.replace("_", " ")}</td><td className="px-4 py-3">{project.budget}</td><td className="px-4 py-3 text-xs text-white/45">{project.startDate ?? "—"} to {project.endDate ?? "—"}</td><td className="px-4 py-3 text-right">{permissions.data?.data.canEdit !== false && <Button variant="ghost" size="sm" onClick={() => edit(project)}><Pencil className="h-3.5 w-3.5" /></Button>}{permissions.data?.data.canDelete !== false && <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Delete ${project.name}?`)) remove.mutate(project.id); }} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>}</td></tr>)}</tbody></table>{!projects.isLoading && !(projects.data?.data.length) && <p className="p-10 text-center text-sm text-white/35">No projects found.</p>}</div>
        {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="w-full max-w-lg space-y-4 rounded-xl border border-white/[0.1] bg-[#0a0f1e] p-6"><h2 className="text-lg font-semibold text-white">{editing ? "Edit project" : "New project"}</h2><div className="grid grid-cols-2 gap-3"><div><Label>Code</Label><Input required maxLength={50} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div><div><Label>Name</Label><Input required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div></div><div><Label>Description</Label><textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-20 w-full rounded-md border border-white/[0.1] bg-white/[0.04] p-2 text-sm text-white" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Status</Label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="h-9 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-2 text-sm text-white">{statuses.map(value => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></div><div><Label>Budget</Label><Input required pattern="^\d+(\.\d{1,2})?$" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Start date</Label><Input type="date" value={form.startDate ?? ""} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div><div><Label>End date</Label><Input type="date" value={form.endDate ?? ""} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save project"}</Button></div>{save.isError && <p className="text-sm text-red-400">{save.error instanceof Error ? save.error.message : "Unable to save project"}</p>}</form></div>}
      </div>
    </AppLayout>
  );
}