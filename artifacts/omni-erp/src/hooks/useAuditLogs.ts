import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  orgId: number | null;
  userId: number | null;
  userEmail: string;
  userName: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  entityName: string | null;
  description: string;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: string;
}

export interface AuditStats {
  total: number;
  last24h: number;
  uniqueUsers: number;
  byModule: { module: string; count: number }[];
  byAction: { action: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface AuditListResponse {
  success: boolean;
  data: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

export interface AuditFilters {
  search?: string;
  module?: string;
  action?: string;
  status?: string;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const AUDIT_MODULES = [
  "Authentication", "Finance", "Accounts Receivable", "Accounts Payable",
  "Banking", "Fixed Assets", "GST & Tax", "Purchase & Procurement",
  "Inventory", "Manufacturing", "HR & Payroll", "Sales & CRM",
  "Documents", "Workflow Automation", "Customer Portal", "Vendor Portal",
  "User Management", "Roles & Permissions", "Settings", "System",
] as const;

export const AUDIT_ACTIONS = [
  "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE",
  "VIEW", "EXPORT", "IMPORT", "APPROVE", "REJECT",
  "SUBMIT", "CANCEL", "ARCHIVE", "RESTORE",
] as const;

export const ACTION_COLORS: Record<string, string> = {
  CREATE:  "text-emerald-400 bg-emerald-400/10",
  UPDATE:  "text-[#2563EB] bg-[#2563EB]/10",
  DELETE:  "text-rose-400 bg-rose-400/10",
  LOGIN:   "text-cyan-400 bg-cyan-400/10",
  LOGOUT:  "text-white/50 bg-white/5",
  VIEW:    "text-white/40 bg-white/5",
  EXPORT:  "text-violet-400 bg-violet-400/10",
  IMPORT:  "text-violet-400 bg-violet-400/10",
  APPROVE: "text-emerald-400 bg-emerald-400/10",
  REJECT:  "text-rose-400 bg-rose-400/10",
  SUBMIT:  "text-amber-400 bg-amber-400/10",
  CANCEL:  "text-amber-400 bg-amber-400/10",
  ARCHIVE: "text-white/50 bg-white/5",
  RESTORE: "text-cyan-400 bg-cyan-400/10",
};

export const STATUS_COLORS: Record<string, string> = {
  success: "text-emerald-400 bg-emerald-400/10",
  failure: "text-rose-400 bg-rose-400/10",
  warning: "text-amber-400 bg-amber-400/10",
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAuditStats() {
  return useQuery({
    queryKey: ["audit", "stats"],
    queryFn: () =>
      api.get<ApiResponse<AuditStats>>("/audit/stats").then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useAuditLogs(filters: AuditFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search)   params.set("search",   filters.search);
  if (filters.module)   params.set("module",   filters.module);
  if (filters.action)   params.set("action",   filters.action);
  if (filters.status)   params.set("status",   filters.status);
  if (filters.userId)   params.set("userId",   String(filters.userId));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)   params.set("dateTo",   filters.dateTo);
  if (filters.page)     params.set("page",     String(filters.page));
  if (filters.limit)    params.set("limit",    String(filters.limit));

  const qs = params.toString();
  return useQuery({
    queryKey: ["audit", "list", filters],
    queryFn: () =>
      api.get<AuditListResponse>(`/audit${qs ? `?${qs}` : ""}`),
  });
}

export function useAuditLog(id: number | null) {
  return useQuery({
    queryKey: ["audit", "detail", id],
    queryFn: () =>
      api.get<ApiResponse<AuditLog>>(`/audit/${id}`).then((r) => r.data),
    enabled: id !== null,
  });
}

export function useCreateAuditLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      module: string; action: string; description: string;
      entityType?: string; entityId?: number; entityName?: string;
      oldValues?: string; newValues?: string; status?: string;
    }) =>
      api.post<ApiResponse<AuditLog>>("/audit", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
