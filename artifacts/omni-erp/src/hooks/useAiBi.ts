import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiBiReport = {
  text: string;
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useAiInsights() {
  return useQuery<ApiResponse<AiBiReport>>({
    queryKey: ["ai-bi", "insights"],
    queryFn: () => api.get("/ai-bi/insights"),
    staleTime: 30000,
  });
}

export function useSalesForecast() {
  return useQuery<ApiResponse<AiBiReport>>({
    queryKey: ["ai-bi", "sales-forecast"],
    queryFn: () => api.get("/ai-bi/sales-forecast"),
    staleTime: 30000,
  });
}

export function useCashFlowPrediction() {
  return useQuery<ApiResponse<AiBiReport>>({
    queryKey: ["ai-bi", "cash-flow"],
    queryFn: () => api.get("/ai-bi/cash-flow"),
    staleTime: 30000,
  });
}

export function useInventoryPrediction() {
  return useQuery<ApiResponse<AiBiReport>>({
    queryKey: ["ai-bi", "inventory-prediction"],
    queryFn: () => api.get("/ai-bi/inventory-prediction"),
    staleTime: 30000,
  });
}

export function useAnomalyReport() {
  return useQuery<ApiResponse<AiBiReport>>({
    queryKey: ["ai-bi", "anomalies"],
    queryFn: () => api.get("/ai-bi/anomalies"),
    staleTime: 30000,
  });
}

export function useKpiAnalysis() {
  return useQuery<ApiResponse<AiBiReport>>({
    queryKey: ["ai-bi", "kpi"],
    queryFn: () => api.get("/ai-bi/kpi"),
    staleTime: 30000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

export function useGenerateReport() {
  return useMutation({
    mutationFn: (message: string) => api.post<ApiResponse<AiBiReport>>("/ai-bi/report", { message }),
  });
}