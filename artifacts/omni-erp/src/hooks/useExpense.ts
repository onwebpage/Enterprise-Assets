import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExpenseSummary = {
  totalClaims: number;
  draftClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  reimbursedClaims: number;
  totalAmount: string;
  pendingAmount: string;
  totalItems: number;
  totalCategories: number;
  totalPolicies: number;
  activePolicies: number;
  totalReceipts: number;
};

export type ExpenseCategory = {
  id: number;
  org_id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExpensePolicy = {
  id: number;
  org_id: number;
  policy_number: string;
  name: string;
  policy_type: string;
  category: string | null;
  max_amount: string;
  per_diem_rate: string;
  approval_threshold: string;
  requires_receipt: boolean;
  requires_approval: boolean;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseItem = {
  id: number;
  org_id: number;
  claim_id: number;
  category_id: number | null;
  category_name: string;
  expense_date: string;
  description: string;
  amount: string;
  currency: string;
  payment_method: string | null;
  vendor: string | null;
  receipt_number: string | null;
  receipt_url: string | null;
  has_receipt: boolean;
  status: string;
  policy_check: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseClaim = {
  id: number;
  org_id: number;
  claim_number: string;
  employee_id: number;
  employee_name: string;
  department: string | null;
  title: string;
  description: string | null;
  claim_date: string;
  total_amount: string;
  status: string;
  submitted_date: string | null;
  approved_date: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  reimbursed_date: string | null;
  reimbursement_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  receipt_count?: number;
};

export type ExpenseClaimDetail = ExpenseClaim & {
  items: ExpenseItem[];
};

// ── Query keys ─────────────────────────────────────────────────────────────────

const keys = {
  summary: ["expense", "summary"],
  categories: ["expense", "categories"],
  policies: ["expense", "policies"],
  claims: ["expense", "claims"],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useExpenseSummary() {
  return useQuery<ApiResponse<ExpenseSummary>>({
    queryKey: keys.summary,
    queryFn: () => api.get("/expense/summary"),
    staleTime: 15000,
  });
}

export function useExpenseCategories() {
  return useQuery<ApiResponse<ExpenseCategory[]>>({
    queryKey: keys.categories,
    queryFn: () => api.get("/expense/categories"),
    staleTime: 15000,
  });
}

export function useExpensePolicies() {
  return useQuery<ApiResponse<ExpensePolicy[]>>({
    queryKey: keys.policies,
    queryFn: () => api.get("/expense/policies"),
    staleTime: 15000,
  });
}

export function useExpenseClaims() {
  return useQuery<ApiResponse<ExpenseClaim[]>>({
    queryKey: keys.claims,
    queryFn: () => api.get("/expense/claims"),
    staleTime: 15000,
  });
}

export function useExpenseClaim(id: number | null) {
  return useQuery<ApiResponse<ExpenseClaimDetail>>({
    queryKey: [...keys.claims, id],
    queryFn: () => api.get(`/expense/claims/${id}`),
    enabled: !!id,
    staleTime: 15000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

function mutation<T>(fn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc) });
}

// Categories
export function useCreateExpenseCategory() { return mutation((data: any) => api.post("/expense/categories", data)); }
export function useUpdateExpenseCategory() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/expense/categories/${id}`, data)); }
export function useDeleteExpenseCategory() { return mutation((id: number) => api.delete(`/expense/categories/${id}`)); }

// Policies
export function useCreateExpensePolicy() { return mutation((data: any) => api.post("/expense/policies", data)); }
export function useUpdateExpensePolicy() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/expense/policies/${id}`, data)); }
export function useDeleteExpensePolicy() { return mutation((id: number) => api.delete(`/expense/policies/${id}`)); }

// Claims
export function useCreateExpenseClaim() { return mutation((data: any) => api.post("/expense/claims", data)); }
export function useUpdateExpenseClaim() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/expense/claims/${id}`, data)); }
export function useSubmitExpenseClaim() { return mutation((id: number) => api.post(`/expense/claims/${id}/submit`, {})); }
export function useApproveExpenseClaim() { return mutation(({ id, notes }: { id: number; notes?: string }) => api.post(`/expense/claims/${id}/approve`, { notes })); }
export function useRejectExpenseClaim() { return mutation(({ id, notes }: { id: number; notes?: string }) => api.post(`/expense/claims/${id}/reject`, { notes })); }
export function useReimburseExpenseClaim() { return mutation(({ id, method }: { id: number; method?: string }) => api.post(`/expense/claims/${id}/reimburse`, { method })); }
export function useDeleteExpenseClaim() { return mutation((id: number) => api.delete(`/expense/claims/${id}`)); }