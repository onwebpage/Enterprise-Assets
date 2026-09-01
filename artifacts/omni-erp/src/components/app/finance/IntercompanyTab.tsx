import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight, Building2, CheckCircle2, ChevronRight, CircleDollarSign,
  Edit3, FileCheck2, Link2, Loader2, Plus, RefreshCw, Search, ShieldOff,
  Trash2, X, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useCreateIntercompanyRelationship, useCreateIntercompanyTransaction,
  useDeleteIntercompanyRelationship, useDeleteIntercompanyTransaction,
  useIntercompanyAccounts, useIntercompanyCompanies, useIntercompanyPermissions,
  useIntercompanyRelationships, useIntercompanySummary, useIntercompanyTransactions,
  useIntercompanyAction, useUpdateIntercompanyRelationship, useUpdateIntercompanyTransaction,
  type IntercompanyCompany, type IntercompanyRelationship, type IntercompanyTransaction,
  type CompanyFormValues, type RelationshipFormValues, type TransactionFormValues,
  useCreateIntercompanyCompany, useDeleteIntercompanyCompany, useUpdateIntercompanyCompany,
} from "@/hooks/useIntercompany";
import { formatINR } from "@/lib/currency";

const TODAY = new Date().toISOString().slice(0, 10);
const EMPTY_RELATIONSHIP: RelationshipFormValues = {
  fromOrgId: 0, toOrgId: 0, fromDueFromAccountId: 0, toDueToAccountId: 0, currency: "INR", notes: "",
};
const EMPTY_TRANSACTION: TransactionFormValues = {
  relationshipId: 0, transactionDate: TODAY, dueDate: "", description: "", reference: "",
  amount: 0, currency: "INR", fromSettlementAccountId: 0, toSettlementAccountId: 0,
};
const EMPTY_COMPANY: CompanyFormValues = {
  name: "", legalName: "", currency: "INR", type: "Subsidiary", status: "active", country: "", gstin: "",
};

function money(amount: string | number, currency = "INR") {
  return currency === "INR"
    ? formatINR(amount)
    : new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount) || 0);
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TRANSACTION_STATUS: Record<IntercompanyTransaction["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-white/[0.07] text-white/60 border-white/10" },
  posted: { label: "Posted", className: "bg-blue-500/12 text-blue-300 border-blue-500/25" },
  settled: { label: "Settled", className: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
  eliminated: { label: "Eliminated", className: "bg-purple-500/12 text-purple-300 border-purple-500/25" },
  void: { label: "Void", className: "bg-red-500/12 text-red-300 border-red-500/25" },
};

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{children}</label>;
}

function NativeSelect({ value, onChange, children, disabled = false }: {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
    className="h-9 w-full rounded-md border border-white/[0.1] bg-[#11172b] px-3 text-sm text-white outline-none focus:border-[#2563EB]/60 disabled:opacity-50">
    {children}
  </select>;
}

function AccountOptions({ accounts, type }: { accounts: { id: number; code: string; name: string; type: string }[]; type?: string }) {
  return <>{accounts.filter((account) => !type || account.type === type).map((account) =>
    <option key={account.id} value={account.id}>{account.code} — {account.name}{type ? "" : ` (${account.type})`}</option>
  )}</>;
}

function CompanyDialog({ open, onClose, editCompany, onSaved }: {
  open: boolean;
  onClose: () => void;
  editCompany: { id: number; name: string; legalName: string | null; currency: string | null; type: string | null; status: string } | null;
  onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<CompanyFormValues>(EMPTY_COMPANY);
  const [error, setError] = useState("");
  const create = useCreateIntercompanyCompany();
  const update = useUpdateIntercompanyCompany();

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(editCompany ? {
      name: editCompany.name, legalName: editCompany.legalName ?? "", currency: editCompany.currency ?? "INR",
      type: editCompany.type === "Parent" ? "Parent" : "Subsidiary",
      status: editCompany.status === "inactive" ? "inactive" : "active",
    } : { ...EMPTY_COMPANY });
  }, [open, editCompany]);

  function set<K extends keyof CompanyFormValues>(key: K, value: CompanyFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    setError("");
    if (!form.name.trim()) { setError("Company name is required."); return; }
    if (form.currency.length !== 3) { setError("Currency must be a three-letter code."); return; }
    try {
      const data = { ...form, name: form.name.trim(), legalName: form.legalName?.trim() || null, currency: form.currency.toUpperCase() };
      if (editCompany) await update.mutateAsync({ id: editCompany.id, data });
      else await create.mutateAsync(data);
      onSaved(editCompany ? "Company updated" : "Company created");
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Could not save company.");
      toast({ title: "Could not save company", description: err?.message, variant: "destructive" });
    }
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-lg">
      <DialogHeader><DialogTitle className="text-white">{editCompany ? "Edit company" : "Add company"}</DialogTitle><DialogDescription className="text-white/45">Company records are shared with Finance and used as intercompany ledger entities.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5"><FieldLabel>Company name</FieldLabel><Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Regional subsidiary" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></div>
        <div className="space-y-1.5"><FieldLabel>Legal name</FieldLabel><Input value={form.legalName ?? ""} onChange={(event) => set("legalName", event.target.value)} placeholder="Optional registered name" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><FieldLabel>Currency</FieldLabel><Input maxLength={3} value={form.currency} onChange={(event) => set("currency", event.target.value.toUpperCase())} className="bg-white/[0.04] border-white/[0.1] text-white uppercase" /></div>
          <div className="space-y-1.5"><FieldLabel>Type</FieldLabel><NativeSelect value={form.type} onChange={(value) => set("type", value as CompanyFormValues["type"])}><option value="Parent">Parent</option><option value="Subsidiary">Subsidiary</option></NativeSelect></div>
          <div className="space-y-1.5"><FieldLabel>Status</FieldLabel><NativeSelect value={form.status} onChange={(value) => set("status", value as CompanyFormValues["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{create.isPending || update.isPending ? "Saving…" : editCompany ? "Save changes" : "Create company"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function RelationshipDialog({ open, onClose, editRelationship, onSaved }: {
  open: boolean;
  onClose: () => void;
  editRelationship: IntercompanyRelationship | null;
  onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const { data: companiesRes } = useIntercompanyCompanies();
  const [form, setForm] = useState<RelationshipFormValues>(EMPTY_RELATIONSHIP);
  const [error, setError] = useState("");
  const companies = companiesRes?.data ?? [];
  const fromAccountsRes = useIntercompanyAccounts(form.fromOrgId);
  const toAccountsRes = useIntercompanyAccounts(form.toOrgId);
  const fromAccounts = fromAccountsRes.data?.data ?? [];
  const toAccounts = toAccountsRes.data?.data ?? [];
  const create = useCreateIntercompanyRelationship();
  const update = useUpdateIntercompanyRelationship();

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(editRelationship ? {
      fromOrgId: editRelationship.fromOrgId, toOrgId: editRelationship.toOrgId,
      fromDueFromAccountId: editRelationship.fromDueFromAccountId, toDueToAccountId: editRelationship.toDueToAccountId,
      currency: editRelationship.currency, status: editRelationship.status, notes: editRelationship.notes ?? "",
    } : {
      ...EMPTY_RELATIONSHIP, fromOrgId: companies[0]?.id ?? 0, toOrgId: companies[1]?.id ?? 0,
      currency: companies[0]?.currency ?? "INR",
    });
  }, [open, editRelationship, companiesRes]);

  function set<K extends keyof RelationshipFormValues>(key: K, value: RelationshipFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    setError("");
    if (!form.fromOrgId || !form.toOrgId) { setError("Select both companies."); return; }
    if (form.fromOrgId === form.toOrgId) { setError("A company cannot transact with itself."); return; }
    if (!form.fromDueFromAccountId || !form.toDueToAccountId) { setError("Select the due-from and due-to accounts."); return; }
    try {
      const data = { ...form, notes: form.notes?.trim() || null, currency: form.currency.toUpperCase() };
      if (editRelationship) await update.mutateAsync({ id: editRelationship.id, data });
      else await create.mutateAsync(data);
      onSaved(editRelationship ? "Relationship updated" : "Relationship created");
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Could not save the relationship.");
      toast({ title: "Could not save relationship", description: err?.message, variant: "destructive" });
    }
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-xl">
      <DialogHeader>
        <DialogTitle className="text-white">{editRelationship ? "Edit company relationship" : "Add company relationship"}</DialogTitle>
        <DialogDescription className="text-white/45">Configure the due-from and due-to control accounts used when transfers post.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><FieldLabel>Sending company</FieldLabel><NativeSelect value={form.fromOrgId} onChange={(value) => { set("fromOrgId", Number(value)); set("fromDueFromAccountId", 0); }} disabled={!!editRelationship}><option value={0}>Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><FieldLabel>Receiving company</FieldLabel><NativeSelect value={form.toOrgId} onChange={(value) => { set("toOrgId", Number(value)); set("toDueToAccountId", 0); }} disabled={!!editRelationship}><option value={0}>Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</NativeSelect></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><FieldLabel>Due-from account · sender</FieldLabel><NativeSelect value={form.fromDueFromAccountId} onChange={(value) => set("fromDueFromAccountId", Number(value))} disabled={!form.fromOrgId || fromAccountsRes.isLoading}><option value={0}>{fromAccountsRes.isLoading ? "Loading accounts…" : "Select Asset account"}</option><AccountOptions accounts={fromAccounts} type="Asset" /></NativeSelect><p className="text-[11px] text-white/30">Asset account used by the sending company.</p></div>
          <div className="space-y-1.5"><FieldLabel>Due-to account · receiver</FieldLabel><NativeSelect value={form.toDueToAccountId} onChange={(value) => set("toDueToAccountId", Number(value))} disabled={!form.toOrgId || toAccountsRes.isLoading}><option value={0}>{toAccountsRes.isLoading ? "Loading accounts…" : "Select Liability account"}</option><AccountOptions accounts={toAccounts} type="Liability" /></NativeSelect><p className="text-[11px] text-white/30">Liability account used by the receiving company.</p></div>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <div className="space-y-1.5"><FieldLabel>Currency</FieldLabel><Input maxLength={3} value={form.currency} onChange={(event) => set("currency", event.target.value.toUpperCase())} className="bg-white/[0.04] border-white/[0.1] text-white uppercase" /></div>
          <div className="space-y-1.5"><FieldLabel>Notes</FieldLabel><Input value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} placeholder="Optional relationship note" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></div>
        </div>
        {editRelationship && <div className="space-y-1.5"><FieldLabel>Status</FieldLabel><NativeSelect value={form.status ?? "active"} onChange={(value) => set("status", value as "active" | "inactive")}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></div>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{create.isPending || update.isPending ? "Saving…" : editRelationship ? "Save changes" : "Add relationship"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function TransactionDialog({ open, onClose, editTransaction, relationships, onSaved }: {
  open: boolean;
  onClose: () => void;
  editTransaction: IntercompanyTransaction | null;
  relationships: IntercompanyRelationship[];
  onSaved: (message: string) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<TransactionFormValues>(EMPTY_TRANSACTION);
  const [error, setError] = useState("");
  const relationship = relationships.find((item) => item.id === form.relationshipId);
  const fromAccountsRes = useIntercompanyAccounts(relationship?.fromOrgId);
  const toAccountsRes = useIntercompanyAccounts(relationship?.toOrgId);
  const fromAccounts = fromAccountsRes.data?.data ?? [];
  const toAccounts = toAccountsRes.data?.data ?? [];
  const create = useCreateIntercompanyTransaction();
  const update = useUpdateIntercompanyTransaction();

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(editTransaction ? {
      relationshipId: editTransaction.relationshipId, transactionDate: editTransaction.transactionDate,
      dueDate: editTransaction.dueDate ?? "", description: editTransaction.description, reference: editTransaction.reference ?? "",
      amount: Number(editTransaction.amount), currency: editTransaction.currency,
      fromSettlementAccountId: editTransaction.fromSettlementAccountId, toSettlementAccountId: editTransaction.toSettlementAccountId,
    } : {
      ...EMPTY_TRANSACTION, relationshipId: relationships.find((item) => item.status === "active")?.id ?? 0,
    });
  }, [open, editTransaction, relationships]);

  function set<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    setError("");
    if (!form.relationshipId || !form.fromSettlementAccountId || !form.toSettlementAccountId) { setError("Select a relationship and both settlement accounts."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!form.amount || form.amount <= 0) { setError("Amount must be greater than zero."); return; }
    if (form.dueDate && form.dueDate < form.transactionDate) { setError("Due date cannot be before transaction date."); return; }
    try {
      const data = { ...form, description: form.description.trim(), reference: form.reference?.trim() || null, dueDate: form.dueDate || null };
      if (editTransaction) await update.mutateAsync({ id: editTransaction.id, data });
      else await create.mutateAsync(data);
      onSaved(editTransaction ? "Transaction updated" : "Transaction created");
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Could not save the transaction.");
      toast({ title: "Could not save transaction", description: err?.message, variant: "destructive" });
    }
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-xl">
      <DialogHeader><DialogTitle className="text-white">{editTransaction ? "Edit intercompany transaction" : "New intercompany transaction"}</DialogTitle><DialogDescription className="text-white/45">Save as draft first, then post to create balanced journal entries in both companies.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5"><FieldLabel>Company relationship</FieldLabel><NativeSelect value={form.relationshipId} onChange={(value) => { const id = Number(value); const next = relationships.find((item) => item.id === id); set("relationshipId", id); set("currency", next?.currency ?? "INR"); set("fromSettlementAccountId", 0); set("toSettlementAccountId", 0); }} disabled={!!editTransaction}><option value={0}>Select active relationship</option>{relationships.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.fromCompany} → {item.toCompany} · {item.currency}</option>)}</NativeSelect></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><FieldLabel>Transaction date</FieldLabel><Input type="date" value={form.transactionDate} onChange={(event) => set("transactionDate", event.target.value)} className="bg-white/[0.04] border-white/[0.1] text-white" /></div>
          <div className="space-y-1.5"><FieldLabel>Due date</FieldLabel><Input type="date" value={form.dueDate ?? ""} onChange={(event) => set("dueDate", event.target.value)} className="bg-white/[0.04] border-white/[0.1] text-white" /></div>
          <div className="space-y-1.5"><FieldLabel>Amount ({form.currency})</FieldLabel><Input type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(event) => set("amount", Number(event.target.value))} className="bg-white/[0.04] border-white/[0.1] text-white" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><FieldLabel>Sender settlement account</FieldLabel><NativeSelect value={form.fromSettlementAccountId} onChange={(value) => set("fromSettlementAccountId", Number(value))} disabled={!relationship || fromAccountsRes.isLoading}><option value={0}>{fromAccountsRes.isLoading ? "Loading accounts…" : "Select account to credit"}</option><AccountOptions accounts={fromAccounts} /></NativeSelect></div>
          <div className="space-y-1.5"><FieldLabel>Receiver settlement account</FieldLabel><NativeSelect value={form.toSettlementAccountId} onChange={(value) => set("toSettlementAccountId", Number(value))} disabled={!relationship || toAccountsRes.isLoading}><option value={0}>{toAccountsRes.isLoading ? "Loading accounts…" : "Select account to debit"}</option><AccountOptions accounts={toAccounts} /></NativeSelect></div>
        </div>
        <div className="grid grid-cols-[1fr_150px] gap-3">
          <div className="space-y-1.5"><FieldLabel>Description</FieldLabel><Input value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Shared services recharge" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></div>
          <div className="space-y-1.5"><FieldLabel>Reference</FieldLabel><Input value={form.reference ?? ""} onChange={(event) => set("reference", event.target.value)} placeholder="IC-REF-01" className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25" /></div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button><Button onClick={save} disabled={create.isPending || update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{create.isPending || update.isPending ? "Saving…" : editTransaction ? "Save changes" : "Save draft"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export default function IntercompanyTab() {
  const { toast } = useToast();
  const { data: permissionsRes } = useIntercompanyPermissions();
  const { data: companiesRes } = useIntercompanyCompanies();
  const { data: relationshipsRes, isLoading: relationshipsLoading, refetch: refetchRelationships } = useIntercompanyRelationships();
  const { data: summaryRes, isLoading: summaryLoading } = useIntercompanySummary();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data: transactionsRes, isLoading: transactionsLoading, isFetching, refetch } = useIntercompanyTransactions({ search: search || undefined, status: status || undefined });
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [editRelationship, setEditRelationship] = useState<IntercompanyRelationship | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<IntercompanyCompany | null>(null);
  const [showCompanies, setShowCompanies] = useState(true);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<IntercompanyTransaction | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const deleteRelationship = useDeleteIntercompanyRelationship();
  const deleteCompany = useDeleteIntercompanyCompany();
  const deleteTransaction = useDeleteIntercompanyTransaction();
  const actionMutation = useIntercompanyAction();
  const perms = permissionsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false, canManageCompanies: false };
  const relationships = relationshipsRes?.data ?? [];
  const transactions = transactionsRes?.data ?? [];
  const companies = companiesRes?.data ?? [];
  const summary = summaryRes?.data;

  if (permissionsRes && !perms.canView) {
    return <div className="flex flex-col items-center justify-center py-20 text-center gap-3"><ShieldOff className="w-8 h-8 text-white/20" /><p className="text-sm text-white/30">You don't have permission to view intercompany finance.</p></div>;
  }

  async function relationshipAction(relationship: IntercompanyRelationship, action: "edit" | "delete") {
    if (action === "edit") { setEditRelationship(relationship); setRelationshipOpen(true); return; }
    if (!window.confirm(`Delete the ${relationship.fromCompany} → ${relationship.toCompany} relationship?`)) return;
    try { await deleteRelationship.mutateAsync(relationship.id); toast({ title: "Relationship deleted" }); }
    catch (err: any) { toast({ title: "Could not delete relationship", description: err?.message, variant: "destructive" }); }
  }

  async function companyAction(company: IntercompanyCompany, action: "edit" | "delete") {
    if (action === "edit") { setEditCompany(company); setCompanyOpen(true); return; }
    if (!window.confirm(`Delete ${company.name}? Companies with business history cannot be deleted.`)) return;
    try { await deleteCompany.mutateAsync(company.id); toast({ title: "Company deleted" }); }
    catch (err: any) { toast({ title: "Could not delete company", description: err?.message, variant: "destructive" }); }
  }

  async function transactionAction(transaction: IntercompanyTransaction, action: "edit" | "delete" | "post" | "settle" | "eliminate") {
    if (action === "edit") { setEditTransaction(transaction); setTransactionOpen(true); return; }
    const labels = { post: "post", settle: "settle", eliminate: "eliminate", delete: "delete" };
    if (!window.confirm(`${labels[action][0].toUpperCase()}${labels[action].slice(1)} ${transaction.transactionNumber}?`)) return;
    try {
      if (action === "delete") await deleteTransaction.mutateAsync(transaction.id);
      else await actionMutation.mutateAsync({ id: transaction.id, action });
      toast({ title: `${transaction.transactionNumber} ${action === "delete" ? "deleted" : `${labels[action]}d`}` });
    } catch (err: any) { toast({ title: "Transaction action failed", description: err?.message, variant: "destructive" }); }
  }

  function openNewRelationship() { setEditRelationship(null); setRelationshipOpen(true); }
  function openNewTransaction() { setEditTransaction(null); setTransactionOpen(true); }

  return <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Companies", value: companies.length || "—", icon: Building2, color: "text-white" },
        { label: "Active relationships", value: summaryLoading ? "…" : summary?.relationshipCount ?? 0, icon: Link2, color: "text-[#60A5FA]" },
        { label: "Open exposure", value: summaryLoading ? "…" : summary ? money(summary.openAmount) : "—", icon: CircleDollarSign, color: "text-amber-400" },
        { label: "Eliminated", value: summaryLoading ? "…" : summary?.eliminationCount ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
      ].map((card) => <div key={card.label} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4"><div className="flex items-center justify-between"><p className="text-xs text-white/40">{card.label}</p><card.icon className={cn("w-4 h-4", card.color)} /></div><p className={cn("text-2xl font-bold mt-2", card.color)}>{card.value}</p></div>)}
    </div>

    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div><h3 className="text-sm font-semibold text-white">Companies</h3><p className="text-xs text-white/35 mt-0.5">Active legal entities available for group finance.</p></div>
        <div className="flex items-center gap-2">{perms.canManageCompanies && <Button size="sm" onClick={() => { setEditCompany(null); setCompanyOpen(true); }} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8"><Plus className="w-3.5 h-3.5 mr-1.5" />Add company</Button>}<button onClick={() => setShowCompanies((value) => !value)} className="p-1.5 rounded hover:bg-white/[0.07] text-white/35">{showCompanies ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button></div>
      </div>
      {showCompanies && <div className="overflow-x-auto">{companies.length === 0 ? <div className="p-8 text-center text-sm text-white/35">No active companies found.</div> : <table className="w-full min-w-[650px]"><thead><tr className="border-b border-white/[0.05]">{["Company", "Type", "Currency", "Status", "Actions"].map((heading) => <th key={heading} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-5 py-3">{heading}</th>)}</tr></thead><tbody>{companies.map((company) => <tr key={company.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"><td className="px-5 py-3"><p className="text-sm font-medium text-white">{company.name}</p><p className="text-xs text-white/30 mt-0.5">{company.legalName || "No legal name supplied"}</p></td><td className="px-5 py-3 text-xs text-white/55">{company.type || "Subsidiary"}</td><td className="px-5 py-3 text-sm text-white/60">{company.currency || "INR"}</td><td className="px-5 py-3"><Badge className={company.status === "active" ? "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" : "bg-white/[0.06] text-white/40 border-white/10"}>{company.status}</Badge></td><td className="px-5 py-3"><div className="flex items-center gap-1">{perms.canManageCompanies && <><button onClick={() => companyAction(company, "edit")} title="Edit company" className="p-1.5 rounded text-white/35 hover:bg-white/[0.07] hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button><button onClick={() => companyAction(company, "delete")} title="Delete company" className="p-1.5 rounded text-white/35 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-3.5 w-3.5" /></button></>}</div></td></tr>)}</tbody></table>}</div>}
    </div>

    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div><h3 className="text-sm font-semibold text-white">Company relationships</h3><p className="text-xs text-white/35 mt-0.5">Directional control accounts that power paired intercompany postings.</p></div>
        <div className="flex items-center gap-2">{perms.canCreate && <Button size="sm" onClick={openNewRelationship} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8"><Plus className="w-3.5 h-3.5 mr-1.5" />Add relationship</Button>}<button onClick={() => setShowRelationships((value) => !value)} className="p-1.5 rounded hover:bg-white/[0.07] text-white/35">{showRelationships ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button></div>
      </div>
      {showRelationships && <div className="overflow-x-auto">
        {relationshipsLoading ? <div className="p-8 text-center text-xs text-white/35"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading relationships…</div> : relationships.length === 0 ? <div className="p-8 text-center"><ArrowLeftRight className="w-7 h-7 mx-auto text-white/15 mb-2" /><p className="text-sm text-white/35">No company relationships configured.</p><p className="text-xs text-white/20 mt-1">Add a relationship before creating an intercompany transaction.</p></div> : <table className="w-full min-w-[780px]"><thead><tr className="border-b border-white/[0.05]">{["Direction", "Control accounts", "Currency", "Status", "Actions"].map((heading) => <th key={heading} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-5 py-3">{heading}</th>)}</tr></thead><tbody>{relationships.map((relationship) => <tr key={relationship.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"><td className="px-5 py-3"><div className="flex items-center gap-2 text-sm text-white"><span>{relationship.fromCompany}</span><ArrowLeftRight className="w-3.5 h-3.5 text-[#60A5FA]" /><span>{relationship.toCompany}</span></div><p className="text-[11px] text-white/30 mt-1">Transfers flow in this direction</p></td><td className="px-5 py-3 text-xs text-white/50">Due-from #{relationship.fromDueFromAccountId}<br />Due-to #{relationship.toDueToAccountId}</td><td className="px-5 py-3 text-sm text-white/60">{relationship.currency}</td><td className="px-5 py-3"><Badge className={relationship.status === "active" ? "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" : "bg-white/[0.06] text-white/40 border-white/10"}>{relationship.status === "active" ? "Active" : "Inactive"}</Badge></td><td className="px-5 py-3"><div className="flex items-center gap-1">{perms.canEdit && <button onClick={() => relationshipAction(relationship, "edit")} title="Edit relationship" className="p-1.5 rounded text-white/35 hover:bg-white/[0.07] hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>}{perms.canDelete && <button onClick={() => relationshipAction(relationship, "delete")} title="Delete relationship" className="p-1.5 rounded text-white/35 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}</div></td></tr>)}</tbody></table>}
      </div>}
    </div>

    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
        <div><h3 className="text-sm font-semibold text-white">Intercompany transactions</h3><p className="text-xs text-white/35 mt-0.5">Post, settle, and eliminate balanced entries across both ledgers.</p></div>
        <div className="relative min-w-[180px] max-w-xs flex-1 ml-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions…" className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" /></div>
        <NativeSelect value={status} onChange={setStatus}><option value="">All statuses</option>{Object.entries(TRANSACTION_STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</NativeSelect>
        <button onClick={() => { refetch(); refetchRelationships(); }} title="Refresh" className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /></button>
        {perms.canCreate && <Button size="sm" onClick={openNewTransaction} disabled={!relationships.some((item) => item.status === "active")} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8"><Plus className="w-3.5 h-3.5 mr-1.5" />New transaction</Button>}
      </div>
      <div className="px-5 py-3 border-b border-white/[0.06] flex flex-wrap items-center gap-4 text-xs text-white/35"><span>{summary?.transactionCount ?? 0} total transaction{summary?.transactionCount === 1 ? "" : "s"}</span><span>·</span><span>{summary?.draftCount ?? 0} drafts</span><span>·</span><span>{summary?.postedCount ?? 0} posted or settled</span><span className="ml-auto text-white/25">Every post creates one journal entry per company</span></div>
      <div className="overflow-x-auto">
        {transactionsLoading ? <div className="p-10 text-center text-xs text-white/35"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading transactions…</div> : transactions.length === 0 ? <div className="p-12 text-center"><FileCheck2 className="w-7 h-7 mx-auto text-white/15 mb-2" /><p className="text-sm text-white/35">No intercompany transactions found.</p><p className="text-xs text-white/20 mt-1">{relationships.length ? "Create a draft to begin the paired posting workflow." : "Configure a company relationship first."}</p></div> : <table className="w-full min-w-[1000px]"><thead><tr className="border-b border-white/[0.05]">{["Transaction", "Direction", "Date", "Amount", "Status", "Journal entries", "Actions"].map((heading) => <th key={heading} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{heading}</th>)}</tr></thead><tbody>{transactions.map((transaction) => {
          const config = TRANSACTION_STATUS[transaction.status];
          return <tr key={transaction.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"><td className="px-4 py-3"><p className="text-sm font-medium text-white">{transaction.transactionNumber}</p><p className="text-xs text-white/35 mt-0.5 max-w-[190px] truncate">{transaction.description}</p></td><td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-white/55"><span>{transaction.fromCompany}</span><ArrowLeftRight className="w-3 h-3 text-[#60A5FA]" /><span>{transaction.toCompany}</span></div></td><td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{dateLabel(transaction.transactionDate)}<br /><span className="text-white/25">Due {dateLabel(transaction.dueDate)}</span></td><td className="px-4 py-3 text-sm font-medium text-white tabular-nums">{money(transaction.amount, transaction.currency)}</td><td className="px-4 py-3"><Badge className={config.className}>{config.label}</Badge></td><td className="px-4 py-3 text-xs text-white/40">{transaction.fromJournalEntryId && transaction.toJournalEntryId ? <span className="text-emerald-400/80">JE-{transaction.fromJournalEntryId} · JE-{transaction.toJournalEntryId}</span> : "Not posted"}</td><td className="px-4 py-3"><div className="flex items-center gap-1">
            {perms.canEdit && transaction.status === "draft" && <><button onClick={() => transactionAction(transaction, "post")} title="Post paired entries" className="p-1.5 rounded text-blue-300/70 hover:bg-blue-500/10 hover:text-blue-300"><Zap className="w-3.5 h-3.5" /></button><button onClick={() => transactionAction(transaction, "edit")} title="Edit draft" className="p-1.5 rounded text-white/35 hover:bg-white/[0.07] hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button></>}
            {perms.canEdit && transaction.status === "posted" && <button onClick={() => transactionAction(transaction, "settle")} title="Mark settled" className="p-1.5 rounded text-emerald-300/70 hover:bg-emerald-500/10 hover:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /></button>}
            {perms.canEdit && (transaction.status === "posted" || transaction.status === "settled") && <button onClick={() => transactionAction(transaction, "eliminate")} title="Eliminate" className="p-1.5 rounded text-purple-300/70 hover:bg-purple-500/10 hover:text-purple-300"><FileCheck2 className="w-3.5 h-3.5" /></button>}
            {perms.canDelete && transaction.status === "draft" && <button onClick={() => transactionAction(transaction, "delete")} title="Delete draft" className="p-1.5 rounded text-white/35 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div></td></tr>;
        })}</tbody></table>}
      </div>
      <div className="px-4 py-3 border-t border-white/[0.06] text-xs text-white/30">Open amount includes draft and posted transactions; eliminations are retained in the audit trail.</div>
    </div>
    <RelationshipDialog open={relationshipOpen} onClose={() => setRelationshipOpen(false)} editRelationship={editRelationship} onSaved={(message) => toast({ title: message })} />
    <CompanyDialog open={companyOpen} onClose={() => setCompanyOpen(false)} editCompany={editCompany} onSaved={(message) => toast({ title: message })} />
    <TransactionDialog open={transactionOpen} onClose={() => setTransactionOpen(false)} editTransaction={editTransaction} relationships={relationships} onSaved={(message) => toast({ title: message })} />
  </div>;
}