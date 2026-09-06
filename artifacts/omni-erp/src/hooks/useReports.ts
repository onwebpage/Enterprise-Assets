import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportsPermissions {
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
}

export interface ReportsKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingAR: number;
  outstandingAP: number;
  inventoryValue: number;
  totalEmployees: number;
  latestPayroll: number;
  grossMargin: number;
}

export interface MonthlyTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ReportsOverview {
  kpis: ReportsKPIs;
  monthlyTrend: MonthlyTrendPoint[];
}

export interface AgingBucket {
  label: string;
  days: string;
  amount: number;
  count: number;
}

export interface ARAgingData {
  aging: AgingBucket[];
  topCustomers: { name: string; amount: number }[];
  totalOutstanding: number;
  invoiceCount: number;
}

export interface APAgingData {
  aging: AgingBucket[];
  topVendors: { name: string; amount: number }[];
  totalOutstanding: number;
  billCount: number;
}

export interface InventoryData {
  byCategory: { category: string; productCount: number; totalValue: number; totalQty: number }[];
  statusSummary: { status: string; count: number }[];
  lowStock: { sku: string; name: string; reorderPoint: number; onHand: number }[];
}

export interface HRAnalyticsData {
  byDept: { deptName: string; count: number; totalSalary: number }[];
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  payrollTrend: { month: string; totalNet: number }[];
}

export interface PurchaseAnalyticsData {
  byVendor: { vendorName: string; orderCount: number; totalAmount: number }[];
  byStatus: { status: string; count: number; total: number }[];
  monthlyTrend: { month: string; amount: number }[];
}

export interface PowerBiConfig {
  configured: boolean;
  tenantId?: string;
  clientId?: string;
  workspaceId?: string;
  reportId?: string;
  datasetId?: string | null;
  embedUrl?: string | null;
  enabled: boolean;
  hasClientSecret: boolean;
  updatedAt?: string;
}

export interface PowerBiEmbed {
  token: string;
  expiration: string | null;
  embedUrl: string | null;
  reportId: string;
  datasetId: string | null;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useReportsPermissions() {
  return useQuery({
    queryKey: ["reports", "permissions"],
    queryFn: () => api.get<ApiResponse<ReportsPermissions>>("/reports/my-permissions"),
    select: (d) => d.data,
    staleTime: 5 * 60_000,
  });
}

export function useReportsOverview(months = 12) {
  return useQuery({
    queryKey: ["reports", "overview", months],
    queryFn: () => api.get<ApiResponse<ReportsOverview>>(`/reports/overview?months=${months}`),
    select: (d) => d.data,
    staleTime: 60_000,
  });
}

export function useReportsARaging() {
  return useQuery({
    queryKey: ["reports", "ar-aging"],
    queryFn: () => api.get<ApiResponse<ARAgingData>>("/reports/ar-aging"),
    select: (d) => d.data,
    staleTime: 60_000,
  });
}

export function useReportsAPaging() {
  return useQuery({
    queryKey: ["reports", "ap-aging"],
    queryFn: () => api.get<ApiResponse<APAgingData>>("/reports/ap-aging"),
    select: (d) => d.data,
    staleTime: 60_000,
  });
}

export function useReportsInventory() {
  return useQuery({
    queryKey: ["reports", "inventory"],
    queryFn: () => api.get<ApiResponse<InventoryData>>("/reports/inventory"),
    select: (d) => d.data,
    staleTime: 60_000,
  });
}

export function useReportsHR() {
  return useQuery({
    queryKey: ["reports", "hr"],
    queryFn: () => api.get<ApiResponse<HRAnalyticsData>>("/reports/hr"),
    select: (d) => d.data,
    staleTime: 60_000,
  });
}

export function useReportsPurchase() {
  return useQuery({
    queryKey: ["reports", "purchase"],
    queryFn: () => api.get<ApiResponse<PurchaseAnalyticsData>>("/reports/purchase"),
    select: (d) => d.data,
    staleTime: 60_000,
  });
}

export function usePowerBiConfig() {
  return useQuery({
    queryKey: ["reports", "powerbi", "config"],
    queryFn: () => api.get<ApiResponse<PowerBiConfig>>("/reports/powerbi/config"),
    select: (response) => response.data,
  });
}

export function useSavePowerBiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put<ApiResponse<PowerBiConfig>>("/reports/powerbi/config", payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["reports", "powerbi"] }); },
  });
}

export function usePowerBiConnectionTest() {
  return useMutation({
    mutationFn: () => api.post<ApiResponse<{ connected: boolean; message: string }>>("/reports/powerbi/test", {}),
  });
}

export function usePowerBiEmbedToken(enabled = false) {
  return useQuery({
    queryKey: ["reports", "powerbi", "embed-token"],
    queryFn: () => api.get<ApiResponse<PowerBiEmbed>>("/reports/powerbi/embed-token"),
    select: (response) => response.data,
    enabled,
    retry: false,
  });
}
