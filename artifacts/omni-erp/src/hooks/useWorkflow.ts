import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const WF_TRIGGER_TYPES = ["manual", "schedule", "event"] as const;
export type WfTriggerType = (typeof WF_TRIGGER_TYPES)[number];

export const WF_STATUSES = ["draft", "active", "paused"] as const;
export type WfStatus = (typeof WF_STATUSES)[number];

export const WF_ACTION_TYPES = [
  "send_notification",
  "send_email",
  "update_record",
  "create_record",
  "approve_reject",
  "condition",
  "delay",
  "webhook",
] as const;
export type WfActionType = (typeof WF_ACTION_TYPES)[number];

export const WF_INSTANCE_STATUSES = ["running", "completed", "failed", "cancelled"] as const;
export type WfInstanceStatus = (typeof WF_INSTANCE_STATUSES)[number];

export const WF_CATEGORIES = [
  "Finance", "Inventory", "Sales", "HR", "Tax", "Purchase",
  "Manufacturing", "Reports", "General",
] as const;
export type WfCategory = (typeof WF_CATEGORIES)[number];

export const WF_ACTION_LABELS: Record<WfActionType, string> = {
  send_notification: "Send Notification",
  send_email:        "Send Email",
  update_record:     "Update Record",
  create_record:     "Create Record",
  approve_reject:    "Approve / Reject",
  condition:         "Condition Branch",
  delay:             "Delay / Wait",
  webhook:           "Webhook Call",
};

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WfPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface WfSummary {
  total: number;
  active: number;
  todayRuns: number;
  todaySuccess: number;
  successRate: number;
}

export interface WfStepData {
  id?: number;
  name: string;
  actionType: WfActionType;
  actionConfig: Record<string, unknown>;
  conditionConfig: Record<string, unknown>;
  isEnabled: boolean;
  stepOrder?: number;
}

export interface WfDefinition {
  id: number;
  orgId: number | null;
  name: string;
  description: string | null;
  category: WfCategory;
  triggerType: WfTriggerType;
  triggerConfig: Record<string, unknown>;
  status: WfStatus;
  runCount: number;
  successCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  stepCount?: number;
  steps?: WfStepData[];
}

export interface WfInstanceLog {
  id: number;
  instanceId: number;
  stepId: number | null;
  stepName: string;
  stepOrder: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  output: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
}

export interface WfInstance {
  id: number;
  workflowId: number;
  status: WfInstanceStatus;
  triggerType: string;
  triggerData?: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  workflowName: string | null;
  workflowCategory: string | null;
  logs?: WfInstanceLog[];
}

export interface InsertWfDefinition {
  name: string;
  description?: string | null;
  category?: WfCategory;
  triggerType?: WfTriggerType;
  triggerConfig?: Record<string, unknown>;
  status?: WfStatus;
  steps?: WfStepData[];
}

export type UpdateWfDefinition = Partial<InsertWfDefinition>;

// ── Hooks: Permissions ────────────────────────────────────────────────────────

export function useWfPermissions() {
  return useQuery<ApiResponse<WfPermissions>>({
    queryKey: ["workflow", "permissions"],
    queryFn: () => api.get("/workflow/my-permissions"),
    staleTime: 60_000,
  });
}

// ── Hooks: Summary ────────────────────────────────────────────────────────────

export function useWfSummary() {
  return useQuery<ApiResponse<WfSummary>>({
    queryKey: ["workflow", "summary"],
    queryFn: () => api.get("/workflow/summary"),
  });
}

// ── Hooks: Definitions ────────────────────────────────────────────────────────

export function useWfDefinitions(params?: {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search)   qs.set("search",   params.search);
  if (params?.status)   qs.set("status",   params.status);
  if (params?.category) qs.set("category", params.category);
  if (params?.page)     qs.set("page",     String(params.page));
  return useQuery<ApiResponse<WfDefinition[]> & { total?: number; totalPages?: number }>({
    queryKey: ["workflow", "definitions", params],
    queryFn: () => api.get(`/workflow/definitions?${qs}`),
  });
}

export function useWfDefinition(id: number | null) {
  return useQuery<ApiResponse<WfDefinition>>({
    queryKey: ["workflow", "definitions", id],
    queryFn: () => api.get(`/workflow/definitions/${id}`),
    enabled: id !== null,
  });
}

export function useCreateWfDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertWfDefinition) => api.post("/workflow/definitions", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow"] }); },
  });
}

export function useUpdateWfDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWfDefinition }) =>
      api.put(`/workflow/definitions/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow"] }); },
  });
}

export function useDeleteWfDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/workflow/definitions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow"] }); },
  });
}

export function useToggleWfDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/workflow/definitions/${id}/toggle`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow"] }); },
  });
}

export function usePublishWfDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/workflow/definitions/${id}/publish`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow"] }); },
  });
}

export function useTriggerWfDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: Record<string, unknown> }) =>
      api.post(`/workflow/definitions/${id}/trigger`, data ?? {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow"] }); },
  });
}

// ── Hooks: Instances ──────────────────────────────────────────────────────────

export function useWfInstances(params?: {
  workflowId?: number;
  status?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.workflowId) qs.set("workflowId", String(params.workflowId));
  if (params?.status)     qs.set("status",     params.status);
  if (params?.page)       qs.set("page",       String(params.page));
  return useQuery<ApiResponse<WfInstance[]> & { total?: number }>({
    queryKey: ["workflow", "instances", params],
    queryFn: () => api.get(`/workflow/instances?${qs}`),
  });
}

export function useWfInstance(id: number | null) {
  return useQuery<ApiResponse<WfInstance>>({
    queryKey: ["workflow", "instances", id],
    queryFn: () => api.get(`/workflow/instances/${id}`),
    enabled: id !== null,
  });
}
