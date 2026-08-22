import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QcSummary = {
  totalInspections: number;
  openIncoming: number;
  openInProcess: number;
  openFinished: number;
  failedInspections: number;
  openRejections: number;
  rejectedUnits: string;
  openCapas: number;
  issuedCertificates: number;
};

export type QcParameter = {
  id: number;
  org_id: number;
  code: string;
  name: string;
  parameter_type: string;
  unit: string | null;
  min_value: string | null;
  max_value: string | null;
  allowed_values: string | null;
  description: string | null;
  is_active: boolean;
};

export type QcInspection = {
  id: number;
  org_id: number;
  inspection_number: string;
  inspection_type: string;
  product_id: number;
  product_name: string;
  sku: string;
  warehouse_id: number | null;
  warehouse_code: string | null;
  warehouse_name: string | null;
  reference_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity: string;
  inspected_qty: string;
  passed_qty: string;
  rejected_qty: string;
  status: string;
  inspector: string | null;
  inspection_date: string | null;
  notes: string | null;
  line_count?: number;
  failed_lines?: number;
  created_at: string;
};

export type QcInspectionDetail = QcInspection & {
  lines: Array<{
    id: number;
    parameter_id: number;
    parameter_code: string;
    parameter_name: string;
    parameter_type: string;
    unit: string | null;
    min_value: string | null;
    max_value: string | null;
    allowed_values: string | null;
    measured_value: string | null;
    expected_value: string | null;
    result: string;
    notes: string | null;
  }>;
};

export type QcRejection = {
  id: number;
  org_id: number;
  rejection_number: string;
  inspection_id: number | null;
  inspection_number: string | null;
  product_id: number;
  product_name: string;
  sku: string;
  warehouse_id: number | null;
  warehouse_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity: string;
  reason: string;
  disposition: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type QcCapa = {
  id: number;
  org_id: number;
  capa_number: string;
  capa_type: string;
  title: string;
  description: string | null;
  source_type: string | null;
  source_id: number | null;
  priority: string;
  status: string;
  root_cause: string | null;
  action_plan: string | null;
  assigned_to: string | null;
  due_date: string | null;
  closed_date: string | null;
  effectiveness_check: string | null;
  notes: string | null;
  created_at: string;
};

export type QcCertificate = {
  id: number;
  org_id: number;
  certificate_number: string;
  product_id: number;
  product_name: string;
  sku: string;
  inspection_id: number | null;
  inspection_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  certificate_type: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issued_by: string | null;
  notes: string | null;
  line_count?: number;
  created_at: string;
};

export type QcCertificateDetail = QcCertificate & {
  lines: Array<{
    id: number;
    parameter_id: number;
    parameter_code: string;
    parameter_name: string;
    unit: string | null;
    measured_value: string | null;
    expected_value: string | null;
    result: string;
    notes: string | null;
  }>;
};

// ── Query keys ─────────────────────────────────────────────────────────────────

const keys = {
  summary: ["quality", "summary"],
  parameters: ["quality", "parameters"],
  inspections: ["quality", "inspections"],
  rejections: ["quality", "rejections"],
  capas: ["quality", "capas"],
  certificates: ["quality", "certificates"],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useQcSummary() {
  return useQuery<ApiResponse<QcSummary>>({
    queryKey: keys.summary,
    queryFn: () => api.get("/quality/summary"),
    staleTime: 15000,
  });
}

export function useQcParameters() {
  return useQuery<ApiResponse<QcParameter[]>>({
    queryKey: keys.parameters,
    queryFn: () => api.get("/quality/parameters"),
    staleTime: 15000,
  });
}

export function useQcInspections(type?: string, status?: string) {
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (status) qs.set("status", status);
  return useQuery<ApiResponse<QcInspection[]>>({
    queryKey: [...keys.inspections, type ?? "", status ?? ""],
    queryFn: () => api.get(`/quality/inspections?${qs}`),
    staleTime: 15000,
  });
}

export function useQcInspection(id: number | null) {
  return useQuery<ApiResponse<QcInspectionDetail>>({
    queryKey: [...keys.inspections, id],
    queryFn: () => api.get(`/quality/inspections/${id}`),
    enabled: !!id,
    staleTime: 15000,
  });
}

export function useQcRejections() {
  return useQuery<ApiResponse<QcRejection[]>>({
    queryKey: keys.rejections,
    queryFn: () => api.get("/quality/rejections"),
    staleTime: 15000,
  });
}

export function useQcCapas() {
  return useQuery<ApiResponse<QcCapa[]>>({
    queryKey: keys.capas,
    queryFn: () => api.get("/quality/capas"),
    staleTime: 15000,
  });
}

export function useQcCertificates() {
  return useQuery<ApiResponse<QcCertificate[]>>({
    queryKey: keys.certificates,
    queryFn: () => api.get("/quality/certificates"),
    staleTime: 15000,
  });
}

export function useQcCertificate(id: number | null) {
  return useQuery<ApiResponse<QcCertificateDetail>>({
    queryKey: [...keys.certificates, id],
    queryFn: () => api.get(`/quality/certificates/${id}`),
    enabled: !!id,
    staleTime: 15000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

function mutation<T>(fn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc) });
}

// Parameters
export function useCreateQcParameter() { return mutation((data: any) => api.post("/quality/parameters", data)); }
export function useUpdateQcParameter() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/quality/parameters/${id}`, data)); }
export function useDeleteQcParameter() { return mutation((id: number) => api.delete(`/quality/parameters/${id}`)); }

// Inspections
export function useCreateQcInspection() { return mutation((data: any) => api.post("/quality/inspections", data)); }
export function useUpdateQcInspection() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/quality/inspections/${id}`, data)); }
export function useCompleteQcInspection() { return mutation((id: number) => api.post(`/quality/inspections/${id}/complete`, {})); }
export function useDeleteQcInspection() { return mutation((id: number) => api.delete(`/quality/inspections/${id}`)); }

// Rejections
export function useCreateQcRejection() { return mutation((data: any) => api.post("/quality/rejections", data)); }
export function useUpdateQcRejection() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/quality/rejections/${id}`, data)); }
export function useDeleteQcRejection() { return mutation((id: number) => api.delete(`/quality/rejections/${id}`)); }

// CAPAs
export function useCreateQcCapa() { return mutation((data: any) => api.post("/quality/capas", data)); }
export function useUpdateQcCapa() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/quality/capas/${id}`, data)); }
export function useCloseQcCapa() { return mutation((id: number) => api.post(`/quality/capas/${id}/close`, {})); }
export function useDeleteQcCapa() { return mutation((id: number) => api.delete(`/quality/capas/${id}`)); }

// Certificates
export function useCreateQcCertificate() { return mutation((data: any) => api.post("/quality/certificates", data)); }
export function useUpdateQcCertificate() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/quality/certificates/${id}`, data)); }
export function useIssueQcCertificate() { return mutation((id: number) => api.post(`/quality/certificates/${id}/issue`, {})); }
export function useDeleteQcCertificate() { return mutation((id: number) => api.delete(`/quality/certificates/${id}`)); }