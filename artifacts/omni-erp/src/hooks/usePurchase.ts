import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PURCHASE_VENDOR_STATUSES = ["active", "inactive", "blocked"] as const;
export type PurchaseVendorStatus = (typeof PURCHASE_VENDOR_STATUSES)[number];

export const PURCHASE_VENDOR_CATEGORIES = ["goods", "services", "both"] as const;
export type PurchaseVendorCategory = (typeof PURCHASE_VENDOR_CATEGORIES)[number];

export const PURCHASE_ORDER_STATUSES = ["draft", "sent", "confirmed", "partial", "received", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const GRN_STATUSES = ["draft", "received", "accepted", "rejected"] as const;
export type GRNStatus = (typeof GRN_STATUSES)[number];

export const RFQ_STATUSES = ["draft", "sent", "responded", "converted", "cancelled"] as const;
export type RFQStatus = (typeof RFQ_STATUSES)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PurchaseVendor {
  id: number;
  orgId: number | null;
  code: string | null;
  name: string;
  category: PurchaseVendorCategory;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  currency: string;
  paymentTerms: string | null;
  creditLimit: string | null;
  status: PurchaseVendorStatus;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLine {
  id: number;
  poId: number;
  itemCode: string | null;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  amount: string;
  totalAmount: string;
  receivedQty: string;
  sequence: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: number;
  orgId: number | null;
  vendorId: number;
  vendorName: string;
  vendorGstin?: string | null;
  vendorEmail?: string | null;
  poNumber: string;
  orderDate: string;
  expectedDelivery: string | null;
  deliveryAddress: string | null;
  currency: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  termsConditions: string | null;
  lines?: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface GRNLine {
  id: number;
  grnId: number;
  poLineId: number;
  description: string;
  orderedQty: string;
  receivedQty: string;
  acceptedQty: string;
  rejectedQty: string;
  unit: string;
  notes: string | null;
  sequence: number;
  createdAt: string;
}

export interface GoodsReceiptNote {
  id: number;
  orgId: number | null;
  poId: number;
  poNumber: string;
  vendorId: number;
  vendorName: string;
  grnNumber: string;
  receiptDate: string;
  status: GRNStatus;
  notes: string | null;
  lines?: GRNLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRFQ {
  id: number;
  orgId: number | null;
  vendorId: number | null;
  vendorName: string | null;
  rfqNumber: string;
  rfqDate: string;
  dueDate: string | null;
  itemsDescription: string | null;
  estimatedValue: string | null;
  status: RFQStatus;
  convertedPoId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseSummary {
  totalOrders: number;
  totalValue: string;
  totalVendors: number;
  activeVendors: number;
  totalGRNs: number;
  pendingGRNs: number;
  totalRFQs: number;
  openRFQs: number;
  statusBreakdown: { status: PurchaseOrderStatus; count: number }[];
  topVendors: { vendorId: number; vendorName: string; poCount: number; totalValue: string }[];
  recentOrders: { id: number; poNumber: string; vendorName: string; orderDate: string; totalAmount: string; status: PurchaseOrderStatus }[];
}

export interface PurchasePermissions {
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
}

// Form value interfaces
export interface PurchaseOrderLineFormValues {
  itemCode?: string | null;
  description: string;
  unit?: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
  sequence?: number;
}

export interface PurchaseVendorFormValues {
  code?: string | null;
  name: string;
  category?: PurchaseVendorCategory;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  currency?: string;
  paymentTerms?: string | null;
  creditLimit?: string | null;
  status?: PurchaseVendorStatus;
  notes?: string | null;
}

export interface PurchaseOrderFormValues {
  vendorId: number;
  poNumber?: string;
  orderDate: string;
  expectedDelivery?: string | null;
  deliveryAddress?: string | null;
  currency?: string;
  status?: PurchaseOrderStatus;
  taxAmount?: string;
  notes?: string | null;
  termsConditions?: string | null;
  lines: PurchaseOrderLineFormValues[];
}

export interface GRNLineFormValues {
  poLineId: number;
  description: string;
  orderedQty?: string;
  receivedQty?: string;
  acceptedQty?: string;
  rejectedQty?: string;
  unit?: string;
  notes?: string | null;
  sequence?: number;
}

export interface GRNFormValues {
  poId: number;
  grnNumber?: string;
  receiptDate: string;
  status?: GRNStatus;
  notes?: string | null;
  lines: GRNLineFormValues[];
}

export interface RFQFormValues {
  vendorId?: number | null;
  rfqNumber?: string;
  rfqDate: string;
  dueDate?: string | null;
  itemsDescription?: string | null;
  estimatedValue?: string | null;
  status?: RFQStatus;
  notes?: string | null;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

const QK = {
  summary:     ["purchase", "summary"] as const,
  permissions: ["purchase", "permissions"] as const,
  vendors:     (p?: object) => ["purchase", "vendors", p ?? {}] as const,
  orders:      (p?: object) => ["purchase", "orders",  p ?? {}] as const,
  order:       (id: number) => ["purchase", "order",   id]      as const,
  grns:        (p?: object) => ["purchase", "grns",    p ?? {}] as const,
  rfqs:        (p?: object) => ["purchase", "rfqs",    p ?? {}] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function usePurchaseSummary() {
  return useQuery<ApiResponse<PurchaseSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/purchase/summary"),
    staleTime: 30_000,
  });
}

export function usePurchasePermissions() {
  return useQuery<ApiResponse<PurchasePermissions>>({
    queryKey: QK.permissions,
    queryFn:  () => api.get("/purchase/my-permissions"),
    staleTime: 60_000,
  });
}

// Vendors
export interface VendorParams { search?: string; status?: string; category?: string; page?: number; limit?: number; }

export function usePurchaseVendors(params: VendorParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)   qs.set("search",   params.search);
  if (params.status)   qs.set("status",   params.status);
  if (params.category) qs.set("category", params.category);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ListResponse<PurchaseVendor>>({
    queryKey: QK.vendors(params),
    queryFn:  () => api.get(`/purchase/vendors?${qs}`),
    staleTime: 15_000,
  });
}

export function useCreatePurchaseVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseVendorFormValues) => api.post<ApiResponse<PurchaseVendor>>("/purchase/vendors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "vendors"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdatePurchaseVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PurchaseVendorFormValues> }) =>
      api.put<ApiResponse<PurchaseVendor>>(`/purchase/vendors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "vendors"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeletePurchaseVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/purchase/vendors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "vendors"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// Purchase Orders
export interface OrderParams { search?: string; status?: string; vendorId?: number; page?: number; limit?: number; }

export function usePurchaseOrders(params: OrderParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)   qs.set("search",   params.search);
  if (params.status)   qs.set("status",   params.status);
  if (params.vendorId) qs.set("vendorId", String(params.vendorId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ListResponse<PurchaseOrder>>({
    queryKey: QK.orders(params),
    queryFn:  () => api.get(`/purchase/orders?${qs}`),
    staleTime: 15_000,
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery<ApiResponse<PurchaseOrder>>({
    queryKey: QK.order(id),
    queryFn:  () => api.get(`/purchase/orders/${id}`),
    enabled:  id > 0,
    staleTime: 15_000,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseOrderFormValues) => api.post<ApiResponse<PurchaseOrder>>("/purchase/orders", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "orders"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PurchaseOrderFormValues> }) =>
      api.put<ApiResponse<PurchaseOrder>>(`/purchase/orders/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["purchase", "orders"] });
      qc.invalidateQueries({ queryKey: QK.order(id) });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/purchase/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "orders"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// GRNs
export interface GRNParams { search?: string; status?: string; poId?: number; page?: number; limit?: number; }

export function useGRNs(params: GRNParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.poId)   qs.set("poId",   String(params.poId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ListResponse<GoodsReceiptNote>>({
    queryKey: QK.grns(params),
    queryFn:  () => api.get(`/purchase/grns?${qs}`),
    staleTime: 15_000,
  });
}

export function useCreateGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GRNFormValues) => api.post<ApiResponse<GoodsReceiptNote>>("/purchase/grns", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "grns"] });
      qc.invalidateQueries({ queryKey: ["purchase", "orders"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { receiptDate?: string; status?: GRNStatus; notes?: string | null } }) =>
      api.put<ApiResponse<GoodsReceiptNote>>(`/purchase/grns/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "grns"] });
    },
  });
}

export function useDeleteGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/purchase/grns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "grns"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// RFQs
export interface RFQParams { search?: string; status?: string; page?: number; limit?: number; }

export function usePurchaseRFQs(params: RFQParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ListResponse<PurchaseRFQ>>({
    queryKey: QK.rfqs(params),
    queryFn:  () => api.get(`/purchase/rfqs?${qs}`),
    staleTime: 15_000,
  });
}

export function useCreateRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RFQFormValues) => api.post<ApiResponse<PurchaseRFQ>>("/purchase/rfqs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "rfqs"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RFQFormValues> }) =>
      api.put<ApiResponse<PurchaseRFQ>>(`/purchase/rfqs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "rfqs"] });
    },
  });
}

export function useDeleteRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/purchase/rfqs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "rfqs"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
