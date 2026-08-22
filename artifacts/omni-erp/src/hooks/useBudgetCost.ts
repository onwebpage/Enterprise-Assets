import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BudgetCostSummary = {
  activeBudgets: number;
  budgetAmount: string;
  costCentres: number;
  profitCentres: number;
  openVariances: number;
  varianceAmount: string;
  productCosts: number;
  activeForecasts: number;
};

export type CostCentre = {
  id: number;
  org_id: number;
  code: string;
  name: string;
  department_id: number | null;
  department_name?: string | null;
  manager: string | null;
  description: string | null;
  is_active: boolean;
};

export type ProfitCentre = {
  id: number;
  org_id: number;
  code: string;
  name: string;
  parent_id: number | null;
  parent_name?: string | null;
  manager: string | null;
  is_active: boolean;
};

export type Budget = {
  id: number;
  org_id: number;
  budget_number: string;
  name: string;
  fiscal_year: number;
  period_type: string;
  budget_type: string;
  status: string;
  cost_centre_id: number | null;
  cost_centre_code?: string | null;
  cost_centre_name?: string | null;
  profit_centre_id: number | null;
  profit_centre_code?: string | null;
  profit_centre_name?: string | null;
  total_amount: string;
  line_count?: number;
  line_total?: string;
  notes: string | null;
  created_at: string;
};

export type BudgetDetail = Budget & {
  lines: Array<{
    id: number;
    account_id: number;
    account_code: string;
    account_name: string;
    cost_centre_id: number | null;
    profit_centre_id: number | null;
    period_index: number;
    amount: string;
    description: string | null;
  }>;
};

export type ProductCosting = {
  id: number;
  org_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  standard_cost: string;
  last_actual_cost: string;
  is_active: boolean;
  line_count?: number;
  component_total?: string;
};

export type CostVariance = {
  id: number;
  org_id: number;
  variance_number: string;
  variance_type: string;
  product_id: number | null;
  product_name?: string | null;
  sku?: string | null;
  account_id: number | null;
  account_code?: string | null;
  account_name?: string | null;
  cost_centre_id: number | null;
  cost_centre_code?: string | null;
  profit_centre_id: number | null;
  profit_centre_code?: string | null;
  period: string;
  standard_amount: string;
  actual_amount: string;
  variance_amount: string;
  variance_pct: string;
  reason: string | null;
  action: string | null;
  status: string;
};

export type Forecast = {
  id: number;
  org_id: number;
  forecast_number: string;
  name: string;
  method: string;
  status: string;
  currency: string;
  line_count?: number;
  line_total?: string;
  notes: string | null;
};

// ── Query keys ─────────────────────────────────────────────────────────────────

const keys = {
  summary: ["budget-cost", "summary"],
  costCentres: ["budget-cost", "cost-centres"],
  profitCentres: ["budget-cost", "profit-centres"],
  budgets: ["budget-cost", "budgets"],
  costings: ["budget-cost", "product-costings"],
  variances: ["budget-cost", "variances"],
  forecasts: ["budget-cost", "forecasts"],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useBudgetCostSummary() {
  return useQuery<ApiResponse<BudgetCostSummary>>({
    queryKey: keys.summary,
    queryFn: () => api.get("/budget-cost/summary"),
    staleTime: 15000,
  });
}

export function useCostCentres() {
  return useQuery<ApiResponse<CostCentre[]>>({
    queryKey: keys.costCentres,
    queryFn: () => api.get("/budget-cost/cost-centres"),
    staleTime: 15000,
  });
}

export function useProfitCentres() {
  return useQuery<ApiResponse<ProfitCentre[]>>({
    queryKey: keys.profitCentres,
    queryFn: () => api.get("/budget-cost/profit-centres"),
    staleTime: 15000,
  });
}

export function useBudgets() {
  return useQuery<ApiResponse<Budget[]>>({
    queryKey: keys.budgets,
    queryFn: () => api.get("/budget-cost/budgets"),
    staleTime: 15000,
  });
}

export function useBudget(id: number | null) {
  return useQuery<ApiResponse<BudgetDetail>>({
    queryKey: [...keys.budgets, id],
    queryFn: () => api.get(`/budget-cost/budgets/${id}`),
    enabled: !!id,
    staleTime: 15000,
  });
}

export function useProductCostings() {
  return useQuery<ApiResponse<ProductCosting[]>>({
    queryKey: keys.costings,
    queryFn: () => api.get("/budget-cost/product-costings"),
    staleTime: 15000,
  });
}

export function useVariances() {
  return useQuery<ApiResponse<CostVariance[]>>({
    queryKey: keys.variances,
    queryFn: () => api.get("/budget-cost/variances"),
    staleTime: 15000,
  });
}

export function useForecasts() {
  return useQuery<ApiResponse<Forecast[]>>({
    queryKey: keys.forecasts,
    queryFn: () => api.get("/budget-cost/forecasts"),
    staleTime: 15000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

function mutation<T>(fn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc) });
}

// Cost centres
export function useCreateCostCentre() { return mutation((data: any) => api.post("/budget-cost/cost-centres", data)); }
export function useUpdateCostCentre() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/budget-cost/cost-centres/${id}`, data)); }
export function useDeleteCostCentre() { return mutation((id: number) => api.delete(`/budget-cost/cost-centres/${id}`)); }

// Profit centres
export function useCreateProfitCentre() { return mutation((data: any) => api.post("/budget-cost/profit-centres", data)); }
export function useUpdateProfitCentre() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/budget-cost/profit-centres/${id}`, data)); }
export function useDeleteProfitCentre() { return mutation((id: number) => api.delete(`/budget-cost/profit-centres/${id}`)); }

// Budgets
export function useCreateBudget() { return mutation((data: any) => api.post("/budget-cost/budgets", data)); }
export function useUpdateBudget() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/budget-cost/budgets/${id}`, data)); }
export function useActivateBudget() { return mutation((id: number) => api.post(`/budget-cost/budgets/${id}/activate`, {})); }
export function useCloseBudget() { return mutation((id: number) => api.post(`/budget-cost/budgets/${id}/close`, {})); }

// Product costings
export function useCreateCosting() { return mutation((data: any) => api.post("/budget-cost/product-costings", data)); }
export function useUpdateCosting() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/budget-cost/product-costings/${id}`, data)); }
export function useRecalculateCosting() { return mutation((id: number) => api.post(`/budget-cost/product-costings/${id}/recalculate`, {})); }
export function useDeleteCosting() { return mutation((id: number) => api.delete(`/budget-cost/product-costings/${id}`)); }

// Variances
export function useCreateVariance() { return mutation((data: any) => api.post("/budget-cost/variances", data)); }
export function useUpdateVariance() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/budget-cost/variances/${id}`, data)); }
export function useDeleteVariance() { return mutation((id: number) => api.delete(`/budget-cost/variances/${id}`)); }

// Forecasts
export function useCreateForecast() { return mutation((data: any) => api.post("/budget-cost/forecasts", data)); }
export function useUpdateForecast() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/budget-cost/forecasts/${id}`, data)); }
export function useApproveForecast() { return mutation((id: number) => api.post(`/budget-cost/forecasts/${id}/approve`, {})); }
export function useGenerateForecast() { return mutation((id: number) => api.post(`/budget-cost/forecasts/${id}/generate`, {})); }
export function useDeleteForecast() { return mutation((id: number) => api.delete(`/budget-cost/forecasts/${id}`)); }