import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TreasurySummary = {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: string;
  availableBalance: string;
  totalPositions: number;
  totalForecasts: number;
  totalPayments: number;
  paymentsDue: string;
  paidPayments: number;
  totalCollections: number;
  collectionsDue: string;
  receivedCollections: number;
  totalTransfers: number;
  executedTransfers: number;
};

export type TreasuryAccount = {
  id: number;
  org_id: number;
  name: string;
  account_number: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  currency: string;
  current_balance: string;
  available_balance: string;
  account_type: string;
  status: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TreasuryPosition = {
  id: number;
  org_id: number;
  account_id: number;
  position_date: string;
  opening_balance: string;
  closing_balance: string;
  net_cashflow: string;
  currency: string;
  notes: string | null;
  account_name?: string;
  created_at: string;
  updated_at: string;
};

export type TreasuryForecast = {
  id: number;
  org_id: number;
  account_id: number;
  forecast_date: string;
  projected_inflow: string;
  projected_outflow: string;
  net_cashflow: string;
  projected_balance: string;
  confidence: string;
  scenario: string;
  notes: string | null;
  account_name?: string;
  created_at: string;
  updated_at: string;
};

export type TreasuryPayment = {
  id: number;
  org_id: number;
  payment_number: string;
  account_id: number | null;
  payee_name: string;
  vendor_name: string | null;
  amount: string;
  currency: string;
  payment_date: string;
  method: string;
  category: string;
  reference: string | null;
  status: string;
  paid_date: string | null;
  notes: string | null;
  account_name?: string;
  created_at: string;
  updated_at: string;
};

export type TreasuryCollection = {
  id: number;
  org_id: number;
  collection_number: string;
  account_id: number | null;
  payer_name: string;
  customer_name: string | null;
  amount: string;
  currency: string;
  collection_date: string;
  method: string;
  category: string;
  reference: string | null;
  status: string;
  received_date: string | null;
  notes: string | null;
  account_name?: string;
  created_at: string;
  updated_at: string;
};

export type TreasuryTransfer = {
  id: number;
  org_id: number;
  transfer_number: string;
  from_account_id: number;
  to_account_id: number;
  amount: string;
  currency: string;
  transfer_date: string;
  status: string;
  reference: string | null;
  notes: string | null;
  from_account_name?: string;
  to_account_name?: string;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ── Query keys ─────────────────────────────────────────────────────────────────

const keys = {
  summary: ["cash-treasury", "summary"],
  accounts: ["cash-treasury", "accounts"],
  positions: ["cash-treasury", "positions"],
  forecasts: ["cash-treasury", "forecasts"],
  payments: ["cash-treasury", "payments"],
  collections: ["cash-treasury", "collections"],
  transfers: ["cash-treasury", "transfers"],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useTreasurySummary() {
  return useQuery<ApiResponse<TreasurySummary>>({
    queryKey: keys.summary,
    queryFn: () => api.get("/cash-treasury/summary"),
    staleTime: 15000,
  });
}

export function useTreasuryAccounts() {
  return useQuery<ApiResponse<TreasuryAccount[]>>({
    queryKey: keys.accounts,
    queryFn: () => api.get("/cash-treasury/accounts"),
    staleTime: 15000,
  });
}

export function useTreasuryPositions() {
  return useQuery<ApiResponse<TreasuryPosition[]>>({
    queryKey: keys.positions,
    queryFn: () => api.get("/cash-treasury/positions"),
    staleTime: 15000,
  });
}

export function useTreasuryForecasts() {
  return useQuery<ApiResponse<TreasuryForecast[]>>({
    queryKey: keys.forecasts,
    queryFn: () => api.get("/cash-treasury/forecasts"),
    staleTime: 15000,
  });
}

export function useTreasuryPayments() {
  return useQuery<ApiResponse<TreasuryPayment[]>>({
    queryKey: keys.payments,
    queryFn: () => api.get("/cash-treasury/payments"),
    staleTime: 15000,
  });
}

export function useTreasuryCollections() {
  return useQuery<ApiResponse<TreasuryCollection[]>>({
    queryKey: keys.collections,
    queryFn: () => api.get("/cash-treasury/collections"),
    staleTime: 15000,
  });
}

export function useTreasuryTransfers() {
  return useQuery<ApiResponse<TreasuryTransfer[]>>({
    queryKey: keys.transfers,
    queryFn: () => api.get("/cash-treasury/transfers"),
    staleTime: 15000,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

function mutation<T>(fn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc) });
}

// Accounts
export function useCreateTreasuryAccount() { return mutation((data: any) => api.post("/cash-treasury/accounts", data)); }
export function useUpdateTreasuryAccount() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/cash-treasury/accounts/${id}`, data)); }
export function useDeleteTreasuryAccount() { return mutation((id: number) => api.delete(`/cash-treasury/accounts/${id}`)); }

// Positions
export function useCreateTreasuryPosition() { return mutation((data: any) => api.post("/cash-treasury/positions", data)); }
export function useDeleteTreasuryPosition() { return mutation((id: number) => api.delete(`/cash-treasury/positions/${id}`)); }

// Forecasts
export function useCreateTreasuryForecast() { return mutation((data: any) => api.post("/cash-treasury/forecasts", data)); }
export function useDeleteTreasuryForecast() { return mutation((id: number) => api.delete(`/cash-treasury/forecasts/${id}`)); }

// Payments
export function useCreateTreasuryPayment() { return mutation((data: any) => api.post("/cash-treasury/payments", data)); }
export function useUpdateTreasuryPayment() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/cash-treasury/payments/${id}`, data)); }
export function useApproveTreasuryPayment() { return mutation((id: number) => api.post(`/cash-treasury/payments/${id}/approve`, {})); }
export function useMarkPaymentPaid() { return mutation((id: number) => api.post(`/cash-treasury/payments/${id}/mark-paid`, {})); }
export function useDeleteTreasuryPayment() { return mutation((id: number) => api.delete(`/cash-treasury/payments/${id}`)); }

// Collections
export function useCreateTreasuryCollection() { return mutation((data: any) => api.post("/cash-treasury/collections", data)); }
export function useUpdateTreasuryCollection() { return mutation(({ id, data }: { id: number; data: any }) => api.put(`/cash-treasury/collections/${id}`, data)); }
export function useMarkCollectionReceived() { return mutation((id: number) => api.post(`/cash-treasury/collections/${id}/mark-received`, {})); }
export function useDeleteTreasuryCollection() { return mutation((id: number) => api.delete(`/cash-treasury/collections/${id}`)); }

// Transfers
export function useCreateTreasuryTransfer() { return mutation((data: any) => api.post("/cash-treasury/transfers", data)); }
export function useAuthorizeTransfer() { return mutation((id: number) => api.post(`/cash-treasury/transfers/${id}/authorize`, {})); }
export function useExecuteTransfer() { return mutation((id: number) => api.post(`/cash-treasury/transfers/${id}/execute`, {})); }
export function useDeleteTreasuryTransfer() { return mutation((id: number) => api.delete(`/cash-treasury/transfers/${id}`)); }