import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CrmSummary = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  totalOpportunities: number;
  openOpportunities: number;
  wonOpportunities: number;
  pipelineValue: string;
  totalQuotations: number;
  sentQuotations: number;
  totalActivities: number;
  pendingActivities: number;
  totalCommunications: number;
  totalTargets: number;
  activeTargets: number;
};

export type CrmLead = {
  id: number;
  org_id: number;
  lead_number: string;
  first_name: string;
  last_name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  assigned_to: string | null;
  expected_value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  activity_count?: number;
  communication_count?: number;
};

export type CrmOpportunity = {
  id: number;
  org_id: number;
  opportunity_number: string;
  lead_id: number | null;
  name: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  stage: string;
  amount: string;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  activity_count?: number;
  quotation_count?: number;
};

export type CrmQuotation = {
  id: number;
  org_id: number;
  quotation_number: string;
  opportunity_id: number | null;
  lead_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  quotation_date: string;
  valid_until: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
};

export type CrmActivity = {
  id: number;
  org_id: number;
  lead_id: number | null;
  opportunity_id: number | null;
  activity_type: string;
  subject: string;
  description: string | null;
  activity_date: string;
  due_date: string | null;
  completed: boolean;
  completed_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
  opportunity_name?: string;
  opportunity_company?: string;
};

export type CrmCommunication = {
  id: number;
  org_id: number;
  lead_id: number | null;
  opportunity_id: number | null;
  communication_type: string;
  subject: string;
  body: string | null;
  communication_date: string;
  direction: string;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
};

export type CrmSalesTarget = {
  id: number;
  org_id: number;
  target_number: string;
  salesperson: string;
  period: string;
  period_start: string;
  period_end: string;
  target_amount: string;
  achieved_amount: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ── Query keys ─────────────────────────────────────────────────────────────────

const keys = {
  summary: ["crm", "summary"],
  leads: ["crm", "leads"],
  opportunities: ["crm", "opportunities"],
  quotations: ["crm", "quotations"],
  activities: ["crm", "activities"],
  communications: ["crm", "communications"],
  targets: ["crm", "targets"],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useCrmSummary() {
  return useQuery<ApiResponse<CrmSummary>>({
    queryKey: keys.summary,
    queryFn: () => api.get("/crm/summary"),
    staleTime: 15000,
  });
}

export function useCrmLeads() {
  return useQuery<ApiResponse<CrmLead[]>>({
    queryKey: keys.leads,
    queryFn: () => api.get("/crm/leads"),
    staleTime: 15000,
  });
}

export function useCrmOpportunities() {
  return useQuery<ApiResponse<CrmOpportunity[]>>({
    queryKey: keys.opportunities,
    queryFn: () => api.get("/crm/opportunities"),
    staleTime: 15000,
  });
}

export function useCrmQuotations() {
  return useQuery<ApiResponse<CrmQuotation[]>>({
    queryKey: keys.quotations,
    queryFn: () => api.get("/crm/quotations"),
    staleTime: 15000,
  });
}

export function useCrmActivities() {
  return useQuery<ApiResponse<CrmActivity[]>>({
    queryKey: keys.activities,
    queryFn: () => api.get("/crm/activities"),
    staleTime: 15000,
  });
}

export function useCrmCommunications() {
  return useQuery<ApiResponse<CrmCommunication[]>>({
    queryKey: keys.communications,
    queryFn: () => api.get("/crm/communications"),
    staleTime: 15000,
  });
}

export function useCrmSalesTargets() {
  return useQuery<ApiResponse<CrmSalesTarget[]>>({
    queryKey: keys.targets,
    queryFn: () => api.get("/crm/targets"),
    staleTime: 15000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

function mutation<T>(fn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc) });
}

// Leads
export function useCreateCrmLead() { return mutation((data: any) => api.post("/crm/leads", data)); }
export function useUpdateCrmLead() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/crm/leads/${id}`, data)); }
export function useConvertCrmLead() { return mutation((id: number) => api.post(`/crm/leads/${id}/convert`, {})); }
export function useDeleteCrmLead() { return mutation((id: number) => api.delete(`/crm/leads/${id}`)); }

// Opportunities
export function useCreateCrmOpportunity() { return mutation((data: any) => api.post("/crm/opportunities", data)); }
export function useUpdateCrmOpportunity() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/crm/opportunities/${id}`, data)); }
export function useDeleteCrmOpportunity() { return mutation((id: number) => api.delete(`/crm/opportunities/${id}`)); }

// Quotations
export function useCreateCrmQuotation() { return mutation((data: any) => api.post("/crm/quotations", data)); }
export function useUpdateCrmQuotation() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/crm/quotations/${id}`, data)); }
export function useDeleteCrmQuotation() { return mutation((id: number) => api.delete(`/crm/quotations/${id}`)); }

// Activities
export function useCreateCrmActivity() { return mutation((data: any) => api.post("/crm/activities", data)); }
export function useCompleteCrmActivity() { return mutation((id: number) => api.post(`/crm/activities/${id}/complete`, {})); }
export function useDeleteCrmActivity() { return mutation((id: number) => api.delete(`/crm/activities/${id}`)); }

// Communications
export function useCreateCrmCommunication() { return mutation((data: any) => api.post("/crm/communications", data)); }
export function useDeleteCrmCommunication() { return mutation((id: number) => api.delete(`/crm/communications/${id}`)); }

// Sales Targets
export function useCreateCrmTarget() { return mutation((data: any) => api.post("/crm/targets", data)); }
export function useUpdateCrmTarget() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/crm/targets/${id}`, data)); }
export function useDeleteCrmTarget() { return mutation((id: number) => api.delete(`/crm/targets/${id}`)); }