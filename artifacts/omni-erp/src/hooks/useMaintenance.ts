import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaintenanceSummary = {
  totalAssets: number;
  operationalAssets: number;
  underMaintenance: number;
  totalBreakdowns: number;
  openBreakdowns: number;
  totalSchedules: number;
  dueSchedules: number;
  totalWorkOrders: number;
  openWorkOrders: number;
  totalAmcs: number;
  activeAmcs: number;
  totalParts: number;
  lowStockParts: number;
  totalHistory: number;
};

export type MaintenanceAsset = {
  id: number;
  org_id: number;
  asset_number: string;
  name: string;
  asset_type: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  purchase_date: string | null;
  expected_life_months: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  schedule_count?: number;
  work_order_count?: number;
  breakdown_count?: number;
};

export type MaintenanceSchedule = {
  id: number;
  org_id: number;
  asset_id: number;
  asset_name?: string;
  asset_number?: string;
  schedule_number: string;
  schedule_type: string;
  title: string;
  frequency_type: string;
  frequency_value: number;
  last_run_date: string | null;
  next_due_date: string | null;
  assigned_to: string | null;
  estimated_hours: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceBreakdown = {
  id: number;
  org_id: number;
  asset_id: number;
  asset_name?: string;
  asset_number?: string;
  breakdown_number: string;
  breakdown_type: string;
  reported_date: string;
  reported_time: string | null;
  downtime_hours: string;
  root_cause: string | null;
  action_taken: string | null;
  status: string;
  resolved_date: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceWorkOrder = {
  id: number;
  org_id: number;
  work_order_number: string;
  asset_id: number;
  asset_name?: string;
  asset_number?: string;
  work_type: string;
  schedule_id: number | null;
  breakdown_id: number | null;
  amc_id: number | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  assigned_to: string | null;
  labor_cost: string;
  parts_cost: string;
  total_cost: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  part_count?: number;
};

export type MaintenanceAmc = {
  id: number;
  org_id: number;
  contract_number: string;
  vendor_name: string;
  title: string;
  start_date: string;
  end_date: string;
  contract_value: string;
  coverage: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceSparePart = {
  id: number;
  org_id: number;
  part_code: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity_on_hand: string;
  reorder_point: string;
  unit_cost: string;
  location: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceHistoryRecord = {
  id: number;
  org_id: number;
  asset_id: number;
  asset_name?: string;
  asset_number?: string;
  work_order_id: number | null;
  part_id: number | null;
  history_type: string;
  title: string;
  description: string | null;
  date_performed: string;
  technician: string | null;
  cost: string;
  hours_spent: string;
  notes: string | null;
  created_at: string;
};

// ── Query keys ─────────────────────────────────────────────────────────────────

const keys = {
  summary: ["maintenance", "summary"],
  assets: ["maintenance", "assets"],
  schedules: ["maintenance", "schedules"],
  breakdowns: ["maintenance", "breakdowns"],
  workOrders: ["maintenance", "work-orders"],
  amcs: ["maintenance", "amcs"],
  parts: ["maintenance", "parts"],
  history: ["maintenance", "history"],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useMaintenanceSummary() {
  return useQuery<ApiResponse<MaintenanceSummary>>({
    queryKey: keys.summary,
    queryFn: () => api.get("/maintenance/summary"),
    staleTime: 15000,
  });
}

export function useMaintenanceAssets() {
  return useQuery<ApiResponse<MaintenanceAsset[]>>({
    queryKey: keys.assets,
    queryFn: () => api.get("/maintenance/assets"),
    staleTime: 15000,
  });
}

export function useMaintenanceSchedules() {
  return useQuery<ApiResponse<MaintenanceSchedule[]>>({
    queryKey: keys.schedules,
    queryFn: () => api.get("/maintenance/schedules"),
    staleTime: 15000,
  });
}

export function useMaintenanceBreakdowns() {
  return useQuery<ApiResponse<MaintenanceBreakdown[]>>({
    queryKey: keys.breakdowns,
    queryFn: () => api.get("/maintenance/breakdowns"),
    staleTime: 15000,
  });
}

export function useMaintenanceWorkOrders() {
  return useQuery<ApiResponse<MaintenanceWorkOrder[]>>({
    queryKey: keys.workOrders,
    queryFn: () => api.get("/maintenance/work-orders"),
    staleTime: 15000,
  });
}

export function useMaintenanceAmcs() {
  return useQuery<ApiResponse<MaintenanceAmc[]>>({
    queryKey: keys.amcs,
    queryFn: () => api.get("/maintenance/amcs"),
    staleTime: 15000,
  });
}

export function useMaintenanceParts() {
  return useQuery<ApiResponse<MaintenanceSparePart[]>>({
    queryKey: keys.parts,
    queryFn: () => api.get("/maintenance/parts"),
    staleTime: 15000,
  });
}

export function useMaintenanceHistory() {
  return useQuery<ApiResponse<MaintenanceHistoryRecord[]>>({
    queryKey: keys.history,
    queryFn: () => api.get("/maintenance/history"),
    staleTime: 15000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

function mutation<T>(fn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc) });
}

// Assets
export function useCreateMaintenanceAsset() { return mutation((data: any) => api.post("/maintenance/assets", data)); }
export function useUpdateMaintenanceAsset() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/maintenance/assets/${id}`, data)); }
export function useDeleteMaintenanceAsset() { return mutation((id: number) => api.delete(`/maintenance/assets/${id}`)); }

// Schedules
export function useCreateMaintenanceSchedule() { return mutation((data: any) => api.post("/maintenance/schedules", data)); }
export function useUpdateMaintenanceSchedule() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/maintenance/schedules/${id}`, data)); }
export function useDeleteMaintenanceSchedule() { return mutation((id: number) => api.delete(`/maintenance/schedules/${id}`)); }

// Breakdowns
export function useCreateMaintenanceBreakdown() { return mutation((data: any) => api.post("/maintenance/breakdowns", data)); }
export function useUpdateMaintenanceBreakdown() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/maintenance/breakdowns/${id}`, data)); }
export function useResolveMaintenanceBreakdown() { return mutation((id: number) => api.post(`/maintenance/breakdowns/${id}/resolve`, {})); }
export function useDeleteMaintenanceBreakdown() { return mutation((id: number) => api.delete(`/maintenance/breakdowns/${id}`)); }

// Work Orders
export function useCreateMaintenanceWorkOrder() { return mutation((data: any) => api.post("/maintenance/work-orders", data)); }
export function useUpdateMaintenanceWorkOrder() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/maintenance/work-orders/${id}`, data)); }
export function useCompleteMaintenanceWorkOrder() { return mutation((id: number) => api.post(`/maintenance/work-orders/${id}/complete`, {})); }
export function useDeleteMaintenanceWorkOrder() { return mutation((id: number) => api.delete(`/maintenance/work-orders/${id}`)); }

// AMCs
export function useCreateMaintenanceAmc() { return mutation((data: any) => api.post("/maintenance/amcs", data)); }
export function useUpdateMaintenanceAmc() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/maintenance/amcs/${id}`, data)); }
export function useDeleteMaintenanceAmc() { return mutation((id: number) => api.delete(`/maintenance/amcs/${id}`)); }

// Spare Parts
export function useCreateMaintenancePart() { return mutation((data: any) => api.post("/maintenance/parts", data)); }
export function useUpdateMaintenancePart() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/maintenance/parts/${id}`, data)); }
export function useDeleteMaintenancePart() { return mutation((id: number) => api.delete(`/maintenance/parts/${id}`)); }