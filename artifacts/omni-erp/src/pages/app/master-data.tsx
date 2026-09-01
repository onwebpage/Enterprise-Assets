import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive, Boxes, Building2, Database, Edit3, MapPin, MoreHorizontal,
  Package, Plus, RefreshCw, Search, Tag, Trash2, UserRound, Users, Warehouse,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, type ApiListResponse, type ApiResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Entity = "customers" | "vendors" | "products" | "warehouses" | "categories";

interface Customer {
  id: number; name: string; email: string | null; phone: string | null; address: string | null;
  city: string | null; country: string | null; taxId: string | null; creditLimit: string;
  currency: string; status: string; notes: string | null;
}
interface Vendor {
  id: number; name: string; email: string | null; phone: string | null; address: string | null;
  city: string | null; country: string | null; taxId: string | null; currency: string;
  paymentTerms: string | null; status: string; notes: string | null;
}
interface Product {
  id: number; sku: string; name: string; description: string | null; categoryId: number | null;
  categoryName: string | null; unit: string; costPrice: string; sellingPrice: string;
  reorderPoint: number; reorderQty: number; status: string; notes: string | null;
}
interface WarehouseRow {
  id: number; code: string; name: string; location: string | null; manager: string | null;
  capacity: number; status: string; notes: string | null;
}
interface Category {
  id: number; name: string; description: string | null;
}
type Row = Customer | Vendor | Product | WarehouseRow | Category;
type FormState = Record<string, string>;

const entityMeta: Record<Entity, { label: string; singular: string; icon: typeof Users; description: string }> = {
  customers: { label: "Customers", singular: "Customer", icon: Users, description: "Billing and receivables master records" },
  vendors: { label: "Vendors", singular: "Vendor", icon: UserRound, description: "Supplier and payables master records" },
  products: { label: "Products & SKUs", singular: "Product", icon: Package, description: "Items shared with purchasing and inventory" },
  warehouses: { label: "Warehouses", singular: "Warehouse", icon: Warehouse, description: "Inventory locations and stock ownership" },
  categories: { label: "Categories", singular: "Category", icon: Tag, description: "Product classification master records" },
};

const tabs: Entity[] = ["customers", "vendors", "products", "warehouses", "categories"];

const statusStyle: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  inactive: "bg-white/10 text-white/45 border-white/10",
  blocked: "bg-red-500/15 text-red-400 border-red-500/20",
  discontinued: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  maintenance: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const inputClass = "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/20";
const selectClass = "h-9 w-full rounded-md border border-white/[0.1] bg-[#0b1020] px-3 text-sm text-white outline-none focus:border-[#2563EB]";

function blankFor(entity: Entity): FormState {
  if (entity === "customers") return { name: "", email: "", phone: "", taxId: "", currency: "USD", creditLimit: "0", status: "active", city: "", country: "", address: "", notes: "" };
  if (entity === "vendors") return { name: "", email: "", phone: "", taxId: "", currency: "USD", paymentTerms: "Net 30", status: "active", city: "", country: "", address: "", notes: "" };
  if (entity === "products") return { sku: "", name: "", categoryId: "", unit: "each", costPrice: "0", sellingPrice: "0", reorderPoint: "0", reorderQty: "0", status: "active", description: "", notes: "" };
  if (entity === "warehouses") return { code: "", name: "", location: "", manager: "", capacity: "0", status: "active", notes: "" };
  return { name: "", description: "" };
}

function rowToForm(entity: Entity, row: Row): FormState {
  const state = blankFor(entity);
  Object.keys(state).forEach((key) => {
    const value = (row as unknown as Record<string, unknown>)[key];
    state[key] = value === null || value === undefined ? "" : String(value);
  });
  return state;
}

function cleanOptional(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

function StatusBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-white/25">—</span>;
  return <Badge className={statusStyle[value] ?? "bg-white/10 text-white/55 border-white/10"}>{value.replace("_", " ")}</Badge>;
}

function LoadingRows() {
  return <div className="space-y-2 p-4">{[1, 2, 3, 4].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg bg-white/[0.04]" />)}</div>;
}

export default function MasterData() {
  const [entity, setEntity] = useState<Entity>("customers");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(blankFor("customers"));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissionsData } = useQuery({
    queryKey: ["master-data", "permissions"],
    queryFn: () => api.get<ApiResponse<{ canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>>("/master-data/my-permissions"),
  });
  const permissions = permissionsData?.data ?? { canView: false, canCreate: false, canEdit: false, canDelete: false };

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["master-data", "summary"],
    queryFn: () => api.get<ApiResponse<Record<string, number>>>("/master-data/summary"),
    enabled: permissions.canView,
  });

  const listQueries = {
    customers: useQuery({ queryKey: ["master-data", "customers", search, status], queryFn: () => api.get<ApiListResponse<Customer>>(`/master-data/customers?search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`), enabled: permissions.canView }),
    vendors: useQuery({ queryKey: ["master-data", "vendors", search, status], queryFn: () => api.get<ApiListResponse<Vendor>>(`/master-data/vendors?search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`), enabled: permissions.canView }),
    products: useQuery({ queryKey: ["master-data", "products", search, status], queryFn: () => api.get<ApiListResponse<Product>>(`/master-data/products?search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`), enabled: permissions.canView }),
    warehouses: useQuery({ queryKey: ["master-data", "warehouses", search, status], queryFn: () => api.get<ApiListResponse<WarehouseRow>>(`/master-data/warehouses?search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`), enabled: permissions.canView }),
    categories: useQuery({ queryKey: ["master-data", "categories", search], queryFn: () => api.get<ApiListResponse<Category>>(`/master-data/categories?search=${encodeURIComponent(search)}`), enabled: permissions.canView }),
  } as const;
  const currentQuery = listQueries[entity];
  const rows = (currentQuery.data?.data ?? []) as Row[];
  const summary = summaryData?.data ?? {};
  const meta = entityMeta[entity];

  const saveMutation = useMutation({
    mutationFn: async () => {
      let payload: Record<string, unknown>;
      if (entity === "customers") {
        payload = { name: form.name.trim(), email: cleanOptional(form.email), phone: cleanOptional(form.phone), taxId: cleanOptional(form.taxId), currency: form.currency.trim().toUpperCase() || "USD", creditLimit: form.creditLimit || "0", status: form.status, city: cleanOptional(form.city), country: cleanOptional(form.country), address: cleanOptional(form.address), notes: cleanOptional(form.notes) };
      } else if (entity === "vendors") {
        payload = { name: form.name.trim(), email: cleanOptional(form.email), phone: cleanOptional(form.phone), taxId: cleanOptional(form.taxId), currency: form.currency.trim().toUpperCase() || "USD", paymentTerms: cleanOptional(form.paymentTerms), status: form.status, city: cleanOptional(form.city), country: cleanOptional(form.country), address: cleanOptional(form.address), notes: cleanOptional(form.notes) };
      } else if (entity === "products") {
        payload = { sku: form.sku.trim().toUpperCase(), name: form.name.trim(), categoryId: form.categoryId ? Number(form.categoryId) : null, unit: form.unit.trim() || "each", costPrice: form.costPrice || "0", sellingPrice: form.sellingPrice || "0", reorderPoint: Number(form.reorderPoint) || 0, reorderQty: Number(form.reorderQty) || 0, status: form.status, description: cleanOptional(form.description), notes: cleanOptional(form.notes) };
      } else if (entity === "warehouses") {
        payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), location: cleanOptional(form.location), manager: cleanOptional(form.manager), capacity: Number(form.capacity) || 0, status: form.status, notes: cleanOptional(form.notes) };
      } else {
        payload = { name: form.name.trim(), description: cleanOptional(form.description) };
      }
      return editing
        ? api.put<ApiResponse<Row>>(`/master-data/${entity}/${editing.id}`, payload)
        : api.post<ApiResponse<Row>>(`/master-data/${entity}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? `${meta.singular} updated` : `${meta.singular} created`, description: "The master record is now available across the platform." });
    },
    onError: (error: Error) => toast({ title: `Could not save ${meta.singular.toLowerCase()}`, description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: Row) => api.delete<ApiResponse<null>>(`/master-data/${entity}/${row.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data"] });
      toast({ title: `${meta.singular} deleted` });
    },
    onError: (error: Error) => toast({ title: `Could not delete ${meta.singular.toLowerCase()}`, description: error.message, variant: "destructive" }),
  });

  const filteredRows = useMemo(() => rows, [rows]);
  const openNew = () => { setEditing(null); setForm(blankFor(entity)); setDialogOpen(true); };
  const openEdit = (row: Row) => { setEditing(row); setForm(rowToForm(entity, row)); setDialogOpen(true); };
  const removeRow = (row: Row) => {
    const values = row as unknown as Record<string, unknown>;
    const name = String(values.name ?? values.sku ?? values.code ?? row.id);
    if (window.confirm(`Delete ${meta.singular.toLowerCase()} "${name}"? Records used by other transactions cannot be deleted.`)) deleteMutation.mutate(row);
  };
  const setField = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const columns = Object.keys(filteredRows[0] as object).filter((key) => !["description", "notes", "address"].includes(key));
    const csv = [columns.join(","), ...filteredRows.map((row) => columns.map((key) => `"${String((row as unknown as Record<string, unknown>)[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `omnierp-${entity}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Administration" }, { label: "Master Data Management" }]}>
      <div className="mx-auto max-w-[1600px] space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#06B6D4]"><Database className="h-3.5 w-3.5" />Data governance</div>
            <h1 className="text-2xl font-bold text-white">Master Data Management</h1>
            <p className="mt-1 text-sm text-white/40">One trusted source for customers, vendors, products, and operating locations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredRows.length} className="border-white/[0.1] bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white">Export CSV</Button>
            {permissions.canCreate && <Button size="sm" onClick={openNew} className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="h-3.5 w-3.5" />Add {meta.singular}</Button>}
          </div>
        </div>

        {!permissions.canView ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-8 text-center">
            <Archive className="mx-auto mb-3 h-8 w-8 text-amber-400" />
            <h2 className="font-semibold text-white">Master data access is restricted</h2>
            <p className="mt-1 text-sm text-white/40">Ask an administrator to grant the Master Data Management view permission.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Customers", value: summaryLoading ? "—" : String(summary.customerCount ?? 0), sub: `${summary.activeCustomers ?? 0} active`, icon: Users, color: "text-[#2563EB]" },
                { label: "Vendors", value: summaryLoading ? "—" : String(summary.vendorCount ?? 0), sub: `${summary.activeVendors ?? 0} active`, icon: UserRound, color: "text-violet-400" },
                { label: "Products", value: summaryLoading ? "—" : String(summary.productCount ?? 0), sub: `${summary.activeProducts ?? 0} active`, icon: Package, color: "text-emerald-400" },
                { label: "Locations", value: summaryLoading ? "—" : String(summary.warehouseCount ?? 0), sub: `${summary.categoryCount ?? 0} product categories`, icon: MapPin, color: "text-amber-400" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4">
                  <div className="flex items-start justify-between"><div><p className="text-xs text-white/40">{card.label}</p><p className="mt-1 text-2xl font-bold text-white">{card.value}</p><p className="mt-1 text-[11px] text-white/30">{card.sub}</p></div><card.icon className={`h-5 w-5 ${card.color}`} /></div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0f1e]">
              <div className="flex flex-wrap gap-1 border-b border-white/[0.07] bg-white/[0.015] p-2">
                {tabs.map((tab) => {
                  const Icon = entityMeta[tab].icon;
                  return <button key={tab} onClick={() => { setEntity(tab); setSearch(""); setStatus(""); }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${entity === tab ? "bg-[#2563EB]/20 text-white" : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"}`}><Icon className="h-3.5 w-3.5" />{entityMeta[tab].label}</button>;
                })}
              </div>
              <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 md:flex-row md:items-center">
                <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-white/25" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${meta.label.toLowerCase()}...`} className={`pl-9 ${inputClass}`} /></div>
                {entity !== "categories" && <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} md:w-40`}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>{entity === "customers" && <option value="blocked">Blocked</option>}{entity === "products" && <option value="discontinued">Discontinued</option>}{entity === "warehouses" && <option value="maintenance">Maintenance</option>}</select>}
                <div className="flex items-center gap-2 text-xs text-white/30"><RefreshCw className="h-3.5 w-3.5" />{currentQuery.isFetching ? "Refreshing..." : `${currentQuery.data?.total ?? rows.length} records`}</div>
              </div>
              <div className="border-b border-white/[0.07] px-4 py-3"><h2 className="font-semibold text-white">{meta.label}</h2><p className="mt-0.5 text-xs text-white/35">{meta.description}</p></div>
              {currentQuery.isLoading ? <LoadingRows /> : currentQuery.error ? <div className="p-12 text-center text-sm text-red-300">Could not load {meta.label.toLowerCase()}. Try refreshing the page.</div> : !filteredRows.length ? <div className="p-12 text-center"><Boxes className="mx-auto mb-3 h-8 w-8 text-white/15" /><p className="text-sm text-white/45">No {meta.label.toLowerCase()} found</p><p className="mt-1 text-xs text-white/25">{search ? "Try a different search." : `Add your first ${meta.singular.toLowerCase()} to get started.`}</p></div> : <MasterTable entity={entity} rows={filteredRows} canEdit={permissions.canEdit} canDelete={permissions.canDelete} onEdit={openEdit} onDelete={removeRow} />}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/[0.1] bg-[#0b1020] text-white sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? `Edit ${meta.singular}` : `Add ${meta.singular}`}</DialogTitle><DialogDescription className="text-white/40">Changes are saved to the canonical master record used by connected modules.</DialogDescription></DialogHeader>
          <MasterForm entity={entity} form={form} setField={setField} categories={(listQueries.categories.data?.data ?? []) as Category[]} />
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/[0.1] bg-transparent text-white/70">Cancel</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || (entity === "products" ? !form.sku?.trim() || !form.name?.trim() : entity === "warehouses" ? !form.code?.trim() || !form.name?.trim() : !form.name?.trim())} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create record"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function MasterTable({ entity, rows, canEdit, canDelete, onEdit, onDelete }: { entity: Entity; rows: Row[]; canEdit: boolean; canDelete: boolean; onEdit: (row: Row) => void; onDelete: (row: Row) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="border-b border-white/[0.05] bg-white/[0.02]">{(entity === "customers" ? ["Name", "Contact", "Tax ID", "Credit limit", "Status"] : entity === "vendors" ? ["Name", "Contact", "Tax ID", "Payment terms", "Status"] : entity === "products" ? ["SKU", "Product", "Category", "Pricing", "Status"] : entity === "warehouses" ? ["Code", "Warehouse", "Location", "Capacity", "Status"] : ["Category", "Description", "Created"]).map((heading) => <th key={heading} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-white/30">{heading}</th>)}<th className="w-24 px-4 py-3" /></tr></thead><tbody>{rows.map((row) => <MasterTableRow key={row.id} entity={entity} row={row} canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} />)}</tbody></table></div>;
}

function MasterTableRow({ entity, row, canEdit, canDelete, onEdit, onDelete }: { entity: Entity; row: Row; canEdit: boolean; canDelete: boolean; onEdit: (row: Row) => void; onDelete: (row: Row) => void }) {
  const cell = "px-4 py-3 text-sm text-white/65";
  const actions = <td className="px-4 py-3"><div className="flex justify-end gap-1">{canEdit && <button onClick={() => onEdit(row)} className="rounded p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>}{canDelete && <button onClick={() => onDelete(row)} className="rounded p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-300" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}{!canEdit && !canDelete && <MoreHorizontal className="ml-auto h-4 w-4 text-white/20" />}</div></td>;
  if (entity === "customers") { const item = row as Customer; return <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className={cell}><div className="font-medium text-white/85">{item.name}</div><div className="mt-0.5 text-xs text-white/30">{item.city || item.country || "No location"}</div></td><td className={cell}><div>{item.email || "—"}</div><div className="mt-0.5 text-xs text-white/30">{item.phone || ""}</div></td><td className={cell}>{item.taxId || "—"}</td><td className={cell}>{item.currency} {Number(item.creditLimit).toLocaleString()}</td><td className={cell}><StatusBadge value={item.status} /></td>{actions}</tr>; }
  if (entity === "vendors") { const item = row as Vendor; return <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className={cell}><div className="font-medium text-white/85">{item.name}</div><div className="mt-0.5 text-xs text-white/30">{item.city || item.country || "No location"}</div></td><td className={cell}><div>{item.email || "—"}</div><div className="mt-0.5 text-xs text-white/30">{item.phone || ""}</div></td><td className={cell}>{item.taxId || "—"}</td><td className={cell}>{item.paymentTerms || "—"}</td><td className={cell}><StatusBadge value={item.status} /></td>{actions}</tr>; }
  if (entity === "products") { const item = row as Product; return <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className={`${cell} font-mono text-xs text-[#06B6D4]`}>{item.sku}</td><td className={cell}><div className="font-medium text-white/85">{item.name}</div><div className="mt-0.5 text-xs text-white/30">{item.unit}</div></td><td className={cell}>{item.categoryName || "Uncategorized"}</td><td className={cell}><div>{Number(item.sellingPrice).toLocaleString()} sale</div><div className="mt-0.5 text-xs text-white/30">{Number(item.costPrice).toLocaleString()} cost</div></td><td className={cell}><StatusBadge value={item.status} /></td>{actions}</tr>; }
  if (entity === "warehouses") { const item = row as WarehouseRow; return <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className={`${cell} font-mono text-xs text-[#06B6D4]`}>{item.code}</td><td className={`${cell} font-medium text-white/85`}>{item.name}</td><td className={cell}>{item.location || "—"}{item.manager && <div className="mt-0.5 text-xs text-white/30">{item.manager}</div>}</td><td className={cell}>{item.capacity.toLocaleString()} units</td><td className={cell}><StatusBadge value={item.status} /></td>{actions}</tr>; }
  const item = row as Category;
  return <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className={`${cell} font-medium text-white/85`}>{item.name}</td><td className={cell}>{item.description || "—"}</td><td className={cell}>{new Date((item as unknown as { createdAt?: string }).createdAt ?? Date.now()).toLocaleDateString()}</td>{actions}</tr>;
}

function MasterForm({ entity, form, setField, categories }: { entity: Entity; form: FormState; setField: (key: string, value: string) => void; categories: Category[] }) {
  const field = (key: string, label: string, type = "text", placeholder?: string) => <div><Label className="text-xs text-white/55">{label}</Label><Input type={type} value={form[key] ?? ""} onChange={(e) => setField(key, e.target.value)} placeholder={placeholder} className={`mt-1 ${inputClass}`} /></div>;
  const select = (key: string, label: string, options: string[]) => <div><Label className="text-xs text-white/55">{label}</Label><select value={form[key] ?? ""} onChange={(e) => setField(key, e.target.value)} className={`${selectClass} mt-1`}>{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select></div>;
  const area = (key: string, label: string, placeholder?: string) => <div className="md:col-span-2"><Label className="text-xs text-white/55">{label}</Label><Textarea value={form[key] ?? ""} onChange={(e) => setField(key, e.target.value)} placeholder={placeholder} className={`mt-1 min-h-20 ${inputClass}`} /></div>;
  if (entity === "customers") return <div className="grid gap-4 md:grid-cols-2">{field("name", "Customer name *", "text", "Acme Corporation")}{field("email", "Email", "email", "billing@acme.com")}{field("phone", "Phone", "text", "+91 22 0000 0000")}{field("taxId", "Tax ID / GSTIN", "text", "27ABCDE1234F1Z5")}{field("currency", "Currency", "text", "INR")}{field("creditLimit", "Credit limit", "number", "0")}{select("status", "Status", ["active", "inactive", "blocked"])}{field("city", "City", "text", "Mumbai")}{field("country", "Country", "text", "India")}{area("address", "Address")}{area("notes", "Notes")}</div>;
  if (entity === "vendors") return <div className="grid gap-4 md:grid-cols-2">{field("name", "Vendor name *", "text", "Vertex Supply Co.")}{field("email", "Email", "email", "accounts@vendor.com")}{field("phone", "Phone", "text", "+91 22 0000 0000")}{field("taxId", "Tax ID / GSTIN", "text", "27ABCDE1234F1Z5")}{field("currency", "Currency", "text", "INR")}{field("paymentTerms", "Payment terms", "text", "Net 30")}{select("status", "Status", ["active", "inactive", "blocked"])}{field("city", "City", "text", "Pune")}{field("country", "Country", "text", "India")}{area("address", "Address")}{area("notes", "Notes")}</div>;
  if (entity === "products") return <div className="grid gap-4 md:grid-cols-2">{field("sku", "SKU *", "text", "SKU-1001")}{field("name", "Product name *", "text", "Industrial sensor")}{<div><Label className="text-xs text-white/55">Category</Label><select value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)} className={`${selectClass} mt-1`}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}{field("unit", "Unit", "text", "each")}{field("costPrice", "Cost price", "number", "0.00")}{field("sellingPrice", "Selling price", "number", "0.00")}{field("reorderPoint", "Reorder point", "number", "0")}{field("reorderQty", "Reorder quantity", "number", "0")}{select("status", "Status", ["active", "inactive", "discontinued"])}{area("description", "Description")}{area("notes", "Notes")}</div>;
  if (entity === "warehouses") return <div className="grid gap-4 md:grid-cols-2">{field("code", "Warehouse code *", "text", "WH-01")}{field("name", "Warehouse name *", "text", "Mumbai Distribution Center")}{field("location", "Location", "text", "Bhiwandi, Maharashtra")}{field("manager", "Manager", "text", "Priya Shah")}{field("capacity", "Capacity (units)", "number", "0")}{select("status", "Status", ["active", "inactive", "maintenance"])}{area("notes", "Notes")}</div>;
  return <div className="grid gap-4">{field("name", "Category name *", "text", "Electronics")}{area("description", "Description", "What this category contains")}</div>;
}