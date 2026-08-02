import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const MFG_WORK_CENTER_STATUSES = ["active", "idle", "maintenance", "inactive"] as const;
export type MfgWorkCenterStatus = (typeof MFG_WORK_CENTER_STATUSES)[number];

export const MFG_WORK_CENTER_TYPES = ["machine", "labor", "tool", "assembly"] as const;
export type MfgWorkCenterType = (typeof MFG_WORK_CENTER_TYPES)[number];

export const MFG_BOM_STATUSES = ["draft", "active", "archived"] as const;
export type MfgBomStatus = (typeof MFG_BOM_STATUSES)[number];

export const MFG_WO_STATUSES = ["planned", "scheduled", "in_progress", "done", "cancelled"] as const;
export type MfgWorkOrderStatus = (typeof MFG_WO_STATUSES)[number];

export const MFG_WO_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type MfgWorkOrderPriority = (typeof MFG_WO_PRIORITIES)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MfgPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MfgSummary {
  activeWOs: number;
  totalWorkCenters: number;
  activeBOMs: number;
  behindSchedule: number;
  unitsProduced: string;
}

export interface MfgWorkCenter {
  id: number;
  orgId: number | null;
  code: string;
  name: string;
  type: MfgWorkCenterType;
  description: string | null;
  capacity: string;
  costPerHour: string;
  operator: string | null;
  status: MfgWorkCenterStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  activeWOs?: number;
}

export interface MfgBOMLine {
  id: number;
  bomId: number;
  sequence: number;
  componentName: string;
  componentSku: string | null;
  qty: string;
  unit: string;
  notes: string | null;
  createdAt: string;
}

export interface MfgBOM {
  id: number;
  orgId: number | null;
  bomNumber: string;
  productName: string;
  productSku: string | null;
  outputQty: string;
  unit: string;
  version: string;
  status: MfgBomStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  lineCount?: number;
  lines?: MfgBOMLine[];
}

export interface MfgWorkOrder {
  id: number;
  orgId: number | null;
  woNumber: string;
  bomId: number | null;
  productName: string;
  workCenterId: number | null;
  plannedQty: string;
  producedQty: string;
  priority: MfgWorkOrderPriority;
  status: MfgWorkOrderStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  bomNumber?: string | null;
  workCenterCode?: string | null;
  workCenterName?: string | null;
}

// ── Insert/Update types ───────────────────────────────────────────────────────

export interface InsertWorkCenter {
  code: string;
  name: string;
  type?: MfgWorkCenterType;
  description?: string | null;
  capacity?: string;
  costPerHour?: string;
  operator?: string | null;
  status?: MfgWorkCenterStatus;
  notes?: string | null;
}

export interface InsertBOMLine {
  sequence?: number;
  componentName: string;
  componentSku?: string | null;
  qty: string;
  unit?: string;
  notes?: string | null;
}

export interface InsertBOM {
  productName: string;
  productSku?: string | null;
  outputQty?: string;
  unit?: string;
  version?: string;
  status?: MfgBomStatus;
  notes?: string | null;
  lines?: InsertBOMLine[];
}

export interface InsertWorkOrder {
  bomId?: number | null;
  productName: string;
  workCenterId?: number | null;
  plannedQty: string;
  priority?: MfgWorkOrderPriority;
  status?: MfgWorkOrderStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  notes?: string | null;
}

export interface UpdateWorkOrder extends Partial<InsertWorkOrder> {
  producedQty?: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
}

// ── Hooks: Permissions ────────────────────────────────────────────────────────

export function useMfgPermissions() {
  return useQuery<ApiResponse<MfgPermissions>>({
    queryKey: ["mfg", "permissions"],
    queryFn: () => api.get("/manufacturing/my-permissions"),
  });
}

// ── Hooks: Summary ────────────────────────────────────────────────────────────

export function useMfgSummary() {
  return useQuery<ApiResponse<MfgSummary>>({
    queryKey: ["mfg", "summary"],
    queryFn: () => api.get("/manufacturing/summary"),
  });
}

// ── Hooks: Work Centers ───────────────────────────────────────────────────────

export function useMfgWorkCenters(params?: { search?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  return useQuery<ApiResponse<MfgWorkCenter[]>>({
    queryKey: ["mfg", "work-centers", params],
    queryFn: () => api.get(`/manufacturing/work-centers?${qs}`),
  });
}

export function useCreateWorkCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertWorkCenter) => api.post("/manufacturing/work-centers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

export function useUpdateWorkCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertWorkCenter> }) =>
      api.put(`/manufacturing/work-centers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

export function useDeleteWorkCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/manufacturing/work-centers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

// ── Hooks: BOMs ───────────────────────────────────────────────────────────────

export function useMfgBOMs(params?: { search?: string; status?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.page)   qs.set("page", String(params.page));
  return useQuery<ApiResponse<MfgBOM[]> & { total?: number; totalPages?: number }>({
    queryKey: ["mfg", "boms", params],
    queryFn: () => api.get(`/manufacturing/boms?${qs}`),
  });
}

export function useMfgBOM(id: number | null) {
  return useQuery<ApiResponse<MfgBOM>>({
    queryKey: ["mfg", "boms", id],
    queryFn: () => api.get(`/manufacturing/boms/${id}`),
    enabled: id !== null,
  });
}

export function useCreateBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertBOM) => api.post("/manufacturing/boms", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

export function useUpdateBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertBOM> }) =>
      api.put(`/manufacturing/boms/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

export function useDeleteBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/manufacturing/boms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

// ── Hooks: Work Orders ────────────────────────────────────────────────────────

export function useMfgWorkOrders(params?: { search?: string; status?: string; priority?: string; workCenterId?: number; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.search)       qs.set("search",       params.search);
  if (params?.status)       qs.set("status",       params.status);
  if (params?.priority)     qs.set("priority",     params.priority);
  if (params?.workCenterId) qs.set("workCenterId", String(params.workCenterId));
  if (params?.page)         qs.set("page",         String(params.page));
  return useQuery<ApiResponse<MfgWorkOrder[]> & { total?: number; totalPages?: number }>({
    queryKey: ["mfg", "work-orders", params],
    queryFn: () => api.get(`/manufacturing/work-orders?${qs}`),
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertWorkOrder) => api.post("/manufacturing/work-orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkOrder }) =>
      api.put(`/manufacturing/work-orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/manufacturing/work-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfg"] }); },
  });
}
