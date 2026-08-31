import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

export type IntercompanyRelationshipStatus = "active" | "inactive";
export type IntercompanyTransactionStatus = "draft" | "posted" | "settled" | "eliminated" | "void";

export interface IntercompanyCompany {
  id: number;
  name: string;
  legalName: string | null;
  currency: string | null;
  type: string | null;
  status: string;
}

export interface CompanyFormValues {
  name: string;
  legalName?: string | null;
  currency: string;
  type: "Parent" | "Subsidiary";
  status: "active" | "inactive";
  country?: string | null;
  gstin?: string | null;
}

export interface IntercompanyAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  balance: string;
}

export interface IntercompanyRelationship {
  id: number;
  fromOrgId: number;
  toOrgId: number;
  fromDueFromAccountId: number;
  toDueToAccountId: number;
  currency: string;
  status: IntercompanyRelationshipStatus;
  notes: string | null;
  createdAt: string;
  fromCompany: string;
  toCompany: string;
}

export interface IntercompanyTransaction {
  id: number;
  relationshipId: number;
  transactionNumber: string;
  fromOrgId: number;
  toOrgId: number;
  transactionDate: string;
  dueDate: string | null;
  description: string;
  reference: string | null;
  amount: string;
  currency: string;
  fromSettlementAccountId: number;
  toSettlementAccountId: number;
  status: IntercompanyTransactionStatus;
  fromJournalEntryId: number | null;
  toJournalEntryId: number | null;
  postedAt: string | null;
  settledAt: string | null;
  eliminatedAt: string | null;
  createdAt: string;
  fromCompany: string;
  toCompany: string;
}

export interface IntercompanyPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageCompanies: boolean;
}

export interface RelationshipFormValues {
  fromOrgId: number;
  toOrgId: number;
  fromDueFromAccountId: number;
  toDueToAccountId: number;
  currency: string;
  status?: IntercompanyRelationshipStatus;
  notes?: string | null;
}

export interface TransactionFormValues {
  relationshipId: number;
  transactionDate: string;
  dueDate?: string | null;
  description: string;
  reference?: string | null;
  amount: number;
  currency: string;
  fromSettlementAccountId: number;
  toSettlementAccountId: number;
}

const KEY = ["finance", "intercompany"] as const;

export function useIntercompanyPermissions() {
  return useQuery<ApiResponse<IntercompanyPermissions>>({
    queryKey: [...KEY, "permissions"],
    queryFn: () => api.get("/finance/intercompany/permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useIntercompanyCompanies() {
  return useQuery<ApiResponse<IntercompanyCompany[]>>({
    queryKey: [...KEY, "companies"],
    queryFn: () => api.get("/finance/intercompany/companies"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateIntercompanyCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyFormValues) => api.post<ApiResponse<IntercompanyCompany>>("/finance/intercompany/companies", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateIntercompanyCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompanyFormValues }) =>
      api.put<ApiResponse<IntercompanyCompany>>(`/finance/intercompany/companies/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteIntercompanyCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/intercompany/companies/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useIntercompanyAccounts(orgId?: number) {
  return useQuery<ApiResponse<IntercompanyAccount[]>>({
    queryKey: [...KEY, "accounts", orgId],
    queryFn: () => api.get(`/finance/intercompany/accounts?orgId=${orgId}`),
    enabled: Number.isInteger(orgId) && Number(orgId) > 0,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useIntercompanyRelationships() {
  return useQuery<ApiResponse<IntercompanyRelationship[]>>({
    queryKey: [...KEY, "relationships"],
    queryFn: () => api.get("/finance/intercompany/relationships"),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useIntercompanySummary() {
  return useQuery<ApiResponse<{
    relationshipCount: number;
    transactionCount: number;
    totalAmount: number;
    openAmount: number;
    postedAmount: number;
    draftCount: number;
    postedCount: number;
    eliminationCount: number;
  }>>({
    queryKey: [...KEY, "summary"],
    queryFn: () => api.get("/finance/intercompany/summary"),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useIntercompanyTransactions(filters: { status?: string; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
  return useQuery<ApiResponse<IntercompanyTransaction[]>>({
    queryKey: [...KEY, "transactions", filters],
    queryFn: () => api.get(`/finance/intercompany/transactions?${qs}`),
    staleTime: 10_000,
    retry: 1,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["finance", "ledger"] });
  qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
}

export function useCreateIntercompanyRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RelationshipFormValues) => api.post<ApiResponse<IntercompanyRelationship>>("/finance/intercompany/relationships", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateIntercompanyRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RelationshipFormValues }) =>
      api.put<ApiResponse<IntercompanyRelationship>>(`/finance/intercompany/relationships/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteIntercompanyRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/intercompany/relationships/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateIntercompanyTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionFormValues) => api.post<ApiResponse<IntercompanyTransaction>>("/finance/intercompany/transactions", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateIntercompanyTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionFormValues }) =>
      api.put<ApiResponse<IntercompanyTransaction>>(`/finance/intercompany/transactions/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteIntercompanyTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/intercompany/transactions/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useIntercompanyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: "post" | "settle" | "eliminate"; notes?: string }) =>
      api.post<ApiResponse<IntercompanyTransaction>>(`/finance/intercompany/transactions/${id}/${action}`, notes ? { notes } : {}),
    onSuccess: () => invalidate(qc),
  });
}