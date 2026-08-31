import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

export type ControlCategory = "reconciliation" | "approval" | "segregation_of_duties" | "period_close" | "journal_review" | "access" | "other";
export type ControlFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "event";
export type ControlRisk = "low" | "medium" | "high" | "critical";
export type ControlStatus = "active" | "inactive";
export type RunStatus = "pending" | "in_progress" | "completed" | "waived";
export type RunResult = "pending" | "passed" | "failed" | "partial";
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionStatus = "open" | "investigating" | "resolved" | "accepted";

export interface ControlUser {
  id: number;
  name: string;
  email: string;
}

export interface ControlRun {
  id: number;
  controlId: number;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  status: RunStatus;
  result: RunResult;
  performedBy: number | null;
  reviewedBy: number | null;
  performedByName?: string | null;
  reviewedByName?: string | null;
  performedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
  evidenceReference: string | null;
  exceptionCount: number;
  createdAt: string;
}

export interface ControlException {
  id: number;
  controlRunId: number;
  exceptionNumber: string;
  title: string;
  description: string | null;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  assignedTo: number | null;
  assignedToName?: string | null;
  dueDate: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface FinancialControl {
  id: number;
  controlNumber: string;
  name: string;
  description: string | null;
  category: ControlCategory;
  frequency: ControlFrequency;
  riskLevel: ControlRisk;
  ownerId: number | null;
  reviewerId: number | null;
  ownerName?: string | null;
  reviewerName?: string | null;
  threshold: string | null;
  dueDay: number | null;
  status: ControlStatus;
  latestRun: ControlRun | null;
  runCount: number;
  runs?: ControlRun[];
  exceptions?: ControlException[];
}

export interface ControlPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ControlSummary {
  totalControls: number;
  activeControls: number;
  pendingRuns: number;
  openExceptions: number;
  highRiskExceptions: number;
  completedRuns: number;
  passedRuns: number;
  passRate: number;
}

export interface ControlFormValues {
  name: string;
  description?: string | null;
  category: ControlCategory;
  frequency: ControlFrequency;
  riskLevel: ControlRisk;
  ownerId?: number | null;
  reviewerId?: number | null;
  threshold?: number | null;
  dueDay?: number | null;
  status: ControlStatus;
}

export interface RunFormValues {
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  notes?: string | null;
  evidenceReference?: string | null;
}

export interface RunUpdateValues {
  status: RunStatus;
  result: RunResult;
  notes?: string | null;
  evidenceReference?: string | null;
  reviewedBy?: number | null;
}

export interface ExceptionFormValues {
  title: string;
  description?: string | null;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  assignedTo?: number | null;
  dueDate?: string | null;
  resolution?: string | null;
}

const KEY = ["finance", "controls"] as const;

export function useFinancialControlPermissions() {
  return useQuery<ApiResponse<ControlPermissions>>({
    queryKey: [...KEY, "permissions"],
    queryFn: () => api.get("/finance/controls/permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useFinancialControlSummary() {
  return useQuery<ApiResponse<ControlSummary>>({
    queryKey: [...KEY, "summary"],
    queryFn: () => api.get("/finance/controls/summary"),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useFinancialControlUsers() {
  return useQuery<ApiResponse<ControlUser[]>>({
    queryKey: [...KEY, "users"],
    queryFn: () => api.get("/finance/controls/users"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useFinancialControls(filters: { search?: string; status?: string; category?: string; riskLevel?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && query.set(key, value));
  return useQuery<{ success: boolean; data: FinancialControl[]; total: number }>({
    queryKey: [...KEY, "list", filters],
    queryFn: () => api.get(`/finance/controls?${query}`),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useFinancialControlDetail(id: number | null) {
  return useQuery<ApiResponse<FinancialControl>>({
    queryKey: [...KEY, "detail", id],
    queryFn: () => api.get(`/finance/controls/${id}`),
    enabled: Number.isInteger(id),
    staleTime: 5_000,
    retry: 1,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["finance", "ledger"] });
}

export function useCreateFinancialControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ControlFormValues) => api.post<ApiResponse<FinancialControl>>("/finance/controls", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateFinancialControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ControlFormValues }) => api.put<ApiResponse<FinancialControl>>(`/finance/controls/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteFinancialControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/controls/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateControlRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ controlId, data }: { controlId: number; data: RunFormValues }) => api.post<ApiResponse<ControlRun>>(`/finance/controls/${controlId}/runs`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateControlRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RunUpdateValues }) => api.put<ApiResponse<ControlRun>>(`/finance/controls/runs/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteControlRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/controls/runs/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateControlException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, data }: { runId: number; data: ExceptionFormValues }) => api.post<ApiResponse<ControlException>>(`/finance/controls/runs/${runId}/exceptions`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateControlException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExceptionFormValues }) => api.put<ApiResponse<ControlException>>(`/finance/controls/exceptions/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteControlException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/controls/exceptions/${id}`),
    onSuccess: () => invalidate(qc),
  });
}