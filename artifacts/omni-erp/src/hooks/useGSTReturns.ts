/**
 * Dedicated hooks for the GST Returns module.
 * Re-exports the shared hooks from useGST and adds Returns-specific ones.
 */
import { useQuery } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Returns Summary ───────────────────────────────────────────────────────────

export interface GSTReturnsByType {
  returnType: string;
  count: number;
  filed: number;
  pending: number;
  overdue: number;
  totalTax: string;
}

export interface GSTReturnDueSoon {
  id: number;
  returnType: string;
  period: string;
  dueDate: string;
  status: string;
}

export interface GSTReturnsSummary {
  totalReturns: number;
  draftCount: number;
  pendingCount: number;
  filedCount: number;
  overdueCount: number;
  totalTaxLiability: string;
  totalItc: string;
  netPayable: string;
  totalTaxableValue: string;
  totalCgst: string;
  totalSgst: string;
  totalIgst: string;
  totalCess: string;
  byType: GSTReturnsByType[];
  dueSoon: GSTReturnDueSoon[];
}

export function useGSTReturnsSummary() {
  return useQuery<ApiResponse<GSTReturnsSummary>>({
    queryKey: ["gst", "returns-summary"],
    queryFn:  () => api.get("/gst/returns-summary"),
    staleTime: 30_000,
  });
}

// Re-export everything from useGST so pages only need one import
export * from "./useGST";
