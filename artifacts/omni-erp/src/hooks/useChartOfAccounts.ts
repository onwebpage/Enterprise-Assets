import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type NormalBalance = "Debit" | "Credit";
export type AccountStatus = "active" | "inactive";

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: number | null;
  balance: string;
  description: string | null;
  status: AccountStatus;
  orgId: number | null;
  createdAt: string;
  updatedAt: string;
  childCount: number;
}

export interface AccountParent {
  id: number;
  code: string;
  name: string;
  type: AccountType;
}

export interface AccountsListResponse {
  success: boolean;
  data: Account[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinancePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AccountFormValues {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId?: number | null;
  description?: string | null;
  status?: AccountStatus;
  balance?: string;
}

// Normal balance is determined by type — not user-editable
export function normalBalanceForType(type: AccountType): NormalBalance {
  return type === "Asset" || type === "Expense" ? "Debit" : "Credit";
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export interface AccountsParams {
  search?: string;
  type?: string;
  status?: string;
  parentId?: string;
  page?: number;
  limit?: number;
}

export function useAccounts(params: AccountsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)   qs.set("search",   params.search);
  if (params.type)     qs.set("type",     params.type);
  if (params.status)   qs.set("status",   params.status);
  if (params.parentId) qs.set("parentId", params.parentId);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 50));

  return useQuery<AccountsListResponse>({
    queryKey: ["finance", "accounts", params],
    queryFn:  () => api.get(`/finance/accounts?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useAccountParents() {
  return useQuery<ApiResponse<AccountParent[]>>({
    queryKey: ["finance", "accounts", "parents"],
    queryFn:  () => api.get("/finance/accounts/parents"),
    staleTime: 30_000,
  });
}

export function useFinancePermissions() {
  return useQuery<ApiResponse<FinancePermissions>>({
    queryKey: ["finance", "my-permissions"],
    queryFn:  () => api.get("/finance/accounts/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountFormValues) =>
      api.post<ApiResponse<Account>>("/finance/accounts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountFormValues }) =>
      api.put<ApiResponse<Account>>(`/finance/accounts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/finance/accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
    },
  });
}
