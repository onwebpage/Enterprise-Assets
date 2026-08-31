import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

export type CurrencyStatus = "active" | "inactive";
export type FxRateType = "spot" | "closing" | "average";
export type FxRateStatus = "active" | "inactive";
export type RevaluationStatus = "draft" | "posted" | "void";

export interface FinanceCurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  status: CurrencyStatus;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceExchangeRate {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveDate: string;
  rateType: FxRateType;
  source: string;
  status: FxRateStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevaluationLineInput {
  accountId: number;
  currency: string;
  foreignBalance: number;
  previousRate: number;
  currentRate: number;
}

export interface RevaluationRun {
  id: number;
  orgId: number;
  organizationName: string;
  runNumber: string;
  valuationDate: string;
  baseCurrency: string;
  gainLossAccountId: number;
  status: RevaluationStatus;
  totalGainLoss: string;
  journalEntryId: number | null;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  lines?: RevaluationLine[];
}

export interface RevaluationLine {
  id: number;
  runId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  currency: string;
  foreignBalance: string;
  previousRate: string;
  currentRate: string;
  previousFunctionalAmount: string;
  currentFunctionalAmount: string;
  gainLoss: string;
}

export interface CurrencyFormValues {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  status: CurrencyStatus;
}

export interface RateFormValues {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  rateType: FxRateType;
  source: string;
  status: FxRateStatus;
  notes?: string | null;
}

export interface RevaluationFormValues {
  orgId: number;
  valuationDate: string;
  baseCurrency: string;
  gainLossAccountId: number;
  notes?: string | null;
  lines: RevaluationLineInput[];
}

export interface MultiCurrencyPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ConversionResult {
  amount: number;
  convertedAmount: number;
  rate: number;
  direction: "direct" | "inverse";
  rateDate: string;
  rateType: FxRateType;
}

const MC_KEY = ["finance", "multi-currency"] as const;

export function useMultiCurrencyPermissions() {
  return useQuery<ApiResponse<MultiCurrencyPermissions>>({
    queryKey: [...MC_KEY, "permissions"],
    queryFn: () => api.get("/finance/multi-currency/permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useMultiCurrencySummary() {
  return useQuery<ApiResponse<{
    currencyCount: number;
    activeCurrencyCount: number;
    activeRateCount: number;
    latestRateDate: string | null;
    revaluationCount: number;
    draftRevaluationCount: number;
    postedGainLoss: number;
  }>>({
    queryKey: [...MC_KEY, "summary"],
    queryFn: () => api.get("/finance/multi-currency/summary"),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useFinanceCurrencies() {
  return useQuery<ApiResponse<FinanceCurrency[]>>({
    queryKey: [...MC_KEY, "currencies"],
    queryFn: () => api.get("/finance/multi-currency/currencies"),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useExchangeRates(filters: { fromCurrency?: string; toCurrency?: string; status?: string; search?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.fromCurrency) params.set("fromCurrency", filters.fromCurrency);
  if (filters.toCurrency) params.set("toCurrency", filters.toCurrency);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  return useQuery<ApiResponse<FinanceExchangeRate[]>>({
    queryKey: [...MC_KEY, "rates", filters],
    queryFn: () => api.get(`/finance/multi-currency/rates?${params}`),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useRevaluationRuns() {
  return useQuery<ApiResponse<RevaluationRun[]>>({
    queryKey: [...MC_KEY, "revaluations"],
    queryFn: () => api.get("/finance/multi-currency/revaluations"),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useRevaluationDetail(id?: number) {
  return useQuery<ApiResponse<RevaluationRun>>({
    queryKey: [...MC_KEY, "revaluation", id],
    queryFn: () => api.get(`/finance/multi-currency/revaluations/${id}`),
    enabled: Number.isInteger(id) && Number(id) > 0,
    staleTime: 10_000,
    retry: 1,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: MC_KEY });
  qc.invalidateQueries({ queryKey: ["finance", "ledger"] });
  qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
  qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
}

export function useCreateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CurrencyFormValues) => api.post<ApiResponse<FinanceCurrency>>("/finance/multi-currency/currencies", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CurrencyFormValues }) =>
      api.put<ApiResponse<FinanceCurrency>>(`/finance/multi-currency/currencies/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/multi-currency/currencies/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateExchangeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RateFormValues) => api.post<ApiResponse<FinanceExchangeRate>>("/finance/multi-currency/rates", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateExchangeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RateFormValues }) =>
      api.put<ApiResponse<FinanceExchangeRate>>(`/finance/multi-currency/rates/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteExchangeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/multi-currency/rates/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useConvertCurrency() {
  return useMutation({
    mutationFn: (data: { fromCurrency: string; toCurrency: string; amount: number; asOfDate?: string; rateType?: FxRateType }) =>
      api.post<ApiResponse<ConversionResult>>("/finance/multi-currency/convert", data),
  });
}

export function useCreateRevaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RevaluationFormValues) => api.post<ApiResponse<RevaluationRun>>("/finance/multi-currency/revaluations", data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateRevaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RevaluationFormValues }) =>
      api.put<ApiResponse<RevaluationRun>>(`/finance/multi-currency/revaluations/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteRevaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/finance/multi-currency/revaluations/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useRevaluationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "post" | "void" }) =>
      api.post<ApiResponse<RevaluationRun | { id: number; status: string }>>(`/finance/multi-currency/revaluations/${id}/${action}`, {}),
    onSuccess: () => invalidate(qc),
  });
}