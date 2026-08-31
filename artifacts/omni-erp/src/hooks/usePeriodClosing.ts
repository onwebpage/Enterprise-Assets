import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

export type PeriodStatus = "open" | "soft_closed" | "closed";

export interface ClosingAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  balance: string;
}

export interface YearEndClosing {
  id: number;
  periodId: number;
  fiscalYear: number;
  closingDate: string;
  netIncome: string;
  status: "completed";
  journalEntryId: number;
  retainedEarningsAccountId: number;
  completedAt: string;
  periodName?: string;
}

export interface FinancialPeriod {
  id: number;
  orgId: number | null;
  fiscalYear: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  isYearEnd: boolean;
  notes: string | null;
  closedAt: string | null;
  closedBy: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  closing: YearEndClosing | null;
  draftEntries?: number;
  entries?: number;
}

export interface ClosingPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PeriodFormValues {
  fiscalYear: number;
  name: string;
  startDate: string;
  endDate: string;
  isYearEnd: boolean;
  notes?: string | null;
}

const KEY = ["finance", "period-closing"] as const;

export function useClosingPermissions() {
  return useQuery<ApiResponse<ClosingPermissions>>({
    queryKey: [...KEY, "permissions"],
    queryFn: () => api.get("/finance/closing/permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useClosingPeriods(filters: { status?: string; fiscalYear?: string; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.fiscalYear) qs.set("fiscalYear", filters.fiscalYear);
  if (filters.search) qs.set("search", filters.search);
  return useQuery<{
    success: boolean;
    data: FinancialPeriod[];
    summary: { total: number; open: number; softClosed: number; closed: number; yearEndClosed: number };
  }>({
    queryKey: [...KEY, "periods", filters],
    queryFn: () => api.get(`/finance/closing/periods?${qs}`),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useClosingAccounts() {
  return useQuery<ApiResponse<ClosingAccount[]>>({
    queryKey: [...KEY, "accounts"],
    queryFn: () => api.get("/finance/closing/accounts"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useYearEndClosings() {
  return useQuery<ApiResponse<YearEndClosing[]>>({
    queryKey: [...KEY, "closings"],
    queryFn: () => api.get("/finance/closing/closings"),
    staleTime: 10_000,
    retry: 1,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["finance", "ledger"] });
  qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
}

export function useCreateClosingPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PeriodFormValues) => api.post<ApiResponse<FinancialPeriod>>("/finance/closing/periods", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateClosingPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PeriodFormValues }) =>
      api.put<ApiResponse<FinancialPeriod>>(`/finance/closing/periods/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteClosingPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/closing/periods/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useChangeClosingPeriodStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "soft-close" | "close" | "reopen" }) =>
      api.post<ApiResponse<FinancialPeriod>>(`/finance/closing/periods/${id}/${action}`, {}),
    onSuccess: () => invalidate(qc),
  });
}

export function useRunYearEndClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, retainedEarningsAccountId, notes }: { id: number; retainedEarningsAccountId: number; notes?: string | null }) =>
      api.post<ApiResponse<YearEndClosing>>(`/finance/closing/periods/${id}/year-end-close`, { retainedEarningsAccountId, notes }),
    onSuccess: () => invalidate(qc),
  });
}