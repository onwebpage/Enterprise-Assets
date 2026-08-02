import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse, type ApiListResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const EINV_INVOICE_STATUSES = ["draft", "submitted", "acknowledged", "rejected", "cancelled"] as const;
export type EInvInvoiceStatus = (typeof EINV_INVOICE_STATUSES)[number];

export const EINV_INVOICE_TYPES = ["B2B", "B2C", "EXPORT", "B2BUR", "SEZWP", "SEZWOP"] as const;
export type EInvInvoiceType = (typeof EINV_INVOICE_TYPES)[number];

export const EINV_SUPPLY_TYPES = ["regular", "deemed_export", "sez_supplies", "reverse_charge"] as const;
export type EInvSupplyType = (typeof EINV_SUPPLY_TYPES)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface EInvBuyer {
  id: number;
  orgId: number | null;
  name: string;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EInvInvoiceLine {
  id: number;
  invoiceId: number;
  description: string;
  hsnCode: string | null;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxableAmount: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  cessRate: string;
  cessAmount: string;
  totalAmount: string;
  sequence: number;
  createdAt: string;
}

export interface EInvInvoice {
  id: number;
  orgId: number | null;
  invoiceNumber: string;
  invoiceType: EInvInvoiceType;
  supplyType: EInvSupplyType;
  buyerId: number | null;
  buyerName?: string | null;
  buyerGstin?: string | null;
  issueDate: string;
  placeOfSupply: string | null;
  irn: string | null;
  ackNumber: string | null;
  ackDate: string | null;
  qrCode: string | null;
  subtotal: string;
  totalDiscount: string;
  totalTaxable: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  totalAmount: string;
  status: EInvInvoiceStatus;
  cancelReason: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  lines?: EInvInvoiceLine[];
}

export interface EInvSummary {
  totalInvoices: number;
  acknowledged: number;
  pending: number;
  cancelled: number;
  totalValue: string;
  totalTax: string;
}

export interface EInvPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ── Form value types ──────────────────────────────────────────────────────────

export interface EInvLineFormValues {
  description: string;
  hsnCode?: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cessRate: string;
  sequence?: number;
}

export interface EInvInvoiceFormValues {
  invoiceNumber?: string;
  invoiceType: EInvInvoiceType;
  supplyType: EInvSupplyType;
  buyerId?: number | null;
  issueDate: string;
  placeOfSupply?: string;
  notes?: string;
  lines: EInvLineFormValues[];
}

export interface EInvBuyerFormValues {
  name: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  notes?: string;
  isActive?: boolean;
}

export interface EInvSubmitFormValues {
  irn?: string;
  ackNumber?: string;
  ackDate?: string;
  qrCode?: string;
}

export interface EInvCancelFormValues {
  cancelReason: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const QK = {
  summary:   ["einv", "summary"] as const,
  perms:     ["einv", "permissions"] as const,
  buyers:    (p: object) => ["einv", "buyers", p] as const,
  invoices:  (p: object) => ["einv", "invoices", p] as const,
  invoice:   (id: number) => ["einv", "invoice", id] as const,
};

// ── Hooks: permissions & summary ──────────────────────────────────────────────

export function useEInvPermissions() {
  return useQuery<ApiResponse<EInvPermissions>>({
    queryKey: QK.perms,
    queryFn:  () => api.get("/einvoice/my-permissions"),
    staleTime: 60_000,
  });
}

export function useEInvSummary() {
  return useQuery<ApiResponse<EInvSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/einvoice/summary"),
    staleTime: 30_000,
  });
}

// ── Hooks: buyers ─────────────────────────────────────────────────────────────

export interface BuyerListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useEInvBuyers(params: BuyerListParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ApiListResponse<EInvBuyer>>({
    queryKey: QK.buyers(params),
    queryFn:  () => api.get(`/einvoice/buyers?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateEInvBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EInvBuyerFormValues) =>
      api.post<ApiResponse<EInvBuyer>>("/einvoice/buyers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["einv", "buyers"] }),
  });
}

export function useUpdateEInvBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EInvBuyerFormValues> }) =>
      api.put<ApiResponse<EInvBuyer>>(`/einvoice/buyers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["einv", "buyers"] }),
  });
}

export function useDeleteEInvBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/einvoice/buyers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["einv", "buyers"] }),
  });
}

// ── Hooks: invoices ───────────────────────────────────────────────────────────

export interface InvoiceListParams {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function useEInvInvoices(params: InvoiceListParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.type)   qs.set("type",   params.type);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ApiListResponse<EInvInvoice>>({
    queryKey: QK.invoices(params),
    queryFn:  () => api.get(`/einvoice/invoices?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useEInvInvoice(id: number | null) {
  return useQuery<ApiResponse<EInvInvoice>>({
    queryKey: QK.invoice(id!),
    queryFn:  () => api.get(`/einvoice/invoices/${id}`),
    enabled:  id !== null,
    staleTime: 15_000,
  });
}

export function useCreateEInvInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EInvInvoiceFormValues) =>
      api.post<ApiResponse<EInvInvoice>>("/einvoice/invoices", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["einv", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateEInvInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EInvInvoiceFormValues> }) =>
      api.put<ApiResponse<EInvInvoice>>(`/einvoice/invoices/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["einv", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.invoice(id) });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useSubmitEInvInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EInvSubmitFormValues }) =>
      api.post<ApiResponse<EInvInvoice>>(`/einvoice/invoices/${id}/submit`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["einv", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useAcknowledgeEInvInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EInvSubmitFormValues }) =>
      api.post<ApiResponse<EInvInvoice>>(`/einvoice/invoices/${id}/acknowledge`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["einv", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useCancelEInvInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post<ApiResponse<EInvInvoice>>(`/einvoice/invoices/${id}/cancel`, { cancelReason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["einv", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteEInvInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/einvoice/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["einv", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
