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

export const PURCHASE_REQUISITION_STATUSES = ["draft", "submitted", "approved", "rejected", "converted", "cancelled"] as const;
export type PurchaseRequisitionStatus = (typeof PURCHASE_REQUISITION_STATUSES)[number];
export const PURCHASE_QUOTE_STATUSES = ["draft", "submitted", "awarded", "rejected", "expired"] as const;
export type PurchaseQuoteStatus = (typeof PURCHASE_QUOTE_STATUSES)[number];
export const PURCHASE_INVOICE_STATUSES = ["draft", "received", "matched", "exception", "approved", "partially_paid", "paid", "blocked"] as const;
export type PurchaseInvoiceStatus = (typeof PURCHASE_INVOICE_STATUSES)[number];
export const PURCHASE_PAYMENT_STATUSES = ["draft", "initiated", "processing", "paid", "failed", "cancelled"] as const;
export type PurchasePaymentStatus = (typeof PURCHASE_PAYMENT_STATUSES)[number];
export const PURCHASE_PAYMENT_METHODS = ["razorpay", "bank_transfer", "manual"] as const;
export type PurchasePaymentMethod = (typeof PURCHASE_PAYMENT_METHODS)[number];

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

export interface SourceToPaySummary {
  requisitions: { total: number; pendingApproval: number; approved: number; committed: string };
  invoices: { total: number; exceptions: number; awaitingApproval: number; outstanding: string };
  payments: { total: number; pending: number; paid: string };
  quotes: { total: number; active: number };
  razorpayConfigured: boolean;
}

export interface PurchaseRequisitionLine {
  id: number; requisitionId: number; itemCode: string | null; description: string; unit: string;
  quantity: string; estimatedUnitPrice: string; taxRate: string; totalEstimate: string; sequence: number; createdAt: string;
}
export interface PurchaseRequisition {
  id: number; orgId: number | null; requisitionNumber: string; requestedBy: number | null; department: string;
  costCenter: string | null; neededBy: string; justification: string; estimatedAmount: string;
  status: PurchaseRequisitionStatus; approvedBy: number | null; approvedAt: string | null;
  rejectionReason: string | null; convertedPoId: number | null; lines?: PurchaseRequisitionLine[];
  createdAt: string; updatedAt: string;
}
export interface PurchaseQuoteLine {
  id: number; quoteId: number; itemCode: string | null; description: string; unit: string; quantity: string;
  unitPrice: string; taxRate: string; taxAmount: string; totalAmount: string; sequence: number; createdAt: string;
}
export interface PurchaseQuote {
  id: number; rfqId: number; vendorId: number; vendorName: string; quoteNumber: string; quoteDate: string;
  validUntil: string | null; subtotal: string; taxAmount: string; totalAmount: string; deliveryDays: number | null;
  paymentTerms: string | null; status: PurchaseQuoteStatus; awardReason: string | null; lines?: PurchaseQuoteLine[];
  createdAt: string;
}
export interface PurchaseRfqInvite {
  id: number; rfqId: number; vendorId: number; vendorName: string; status: string; invitedAt: string;
  respondedAt: string | null; notes: string | null;
}
export interface PurchaseInvoiceLine {
  id: number; invoiceId: number; poLineId: number | null; description: string; quantity: string;
  unitPrice: string; taxRate: string; taxAmount: string; amount: string; sequence: number; createdAt: string;
}
export interface PurchaseInvoice {
  id: number; orgId: number | null; invoiceNumber: string; vendorId: number; vendorName: string; poId: number | null;
  grnId: number | null; invoiceDate: string; dueDate: string | null; currency: string; subtotal: string;
  taxAmount: string; totalAmount: string; status: PurchaseInvoiceStatus; matchStatus: string; matchVariance: string;
  notes: string | null; lines?: PurchaseInvoiceLine[]; createdAt: string; updatedAt: string;
}
export interface PurchasePayment {
  id: number; paymentNumber: string; invoiceId: number; invoiceNumber: string; vendorId: number; vendorName: string;
  amount: string; paymentDate: string; method: PurchasePaymentMethod; status: PurchasePaymentStatus;
  providerOrderId: string | null; providerPaymentId: string | null; failureReason: string | null;
  notes: string | null; paidAt: string | null; createdAt: string;
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

export interface PurchaseRequisitionFormValues {
  department: string; costCenter?: string | null; neededBy: string; justification: string;
  status?: PurchaseRequisitionStatus; lines: Array<{ itemCode?: string | null; description: string; unit?: string; quantity: string; estimatedUnitPrice: string; taxRate?: string; sequence?: number }>;
}
export interface PurchaseQuoteFormValues {
  rfqId: number; vendorId: number; quoteNumber: string; quoteDate: string; validUntil?: string | null;
  deliveryDays?: number | null; paymentTerms?: string | null; status?: PurchaseQuoteStatus;
  lines: Array<{ itemCode?: string | null; description: string; unit?: string; quantity: string; unitPrice: string; taxRate?: string; sequence?: number }>;
}
export interface PurchaseInvoiceFormValues {
  invoiceNumber: string; vendorId: number; poId?: number | null; grnId?: number | null; invoiceDate: string;
  dueDate?: string | null; currency?: string; notes?: string | null;
  lines: Array<{ poLineId?: number | null; description: string; quantity: string; unitPrice: string; taxRate?: string; sequence?: number }>;
}
export interface PurchasePaymentFormValues {
  invoiceId: number; amount: string; paymentDate: string; method: PurchasePaymentMethod; notes?: string | null;
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
  sourceSummary: ["purchase", "source-to-pay", "summary"] as const,
  permissions: ["purchase", "permissions"] as const,
  vendors:     (p?: object) => ["purchase", "vendors", p ?? {}] as const,
  orders:      (p?: object) => ["purchase", "orders",  p ?? {}] as const,
  order:       (id: number) => ["purchase", "order",   id]      as const,
  grns:        (p?: object) => ["purchase", "grns",    p ?? {}] as const,
  rfqs:        (p?: object) => ["purchase", "rfqs",    p ?? {}] as const,
  requisitions: (p?: object) => ["purchase", "requisitions", p ?? {}] as const,
  requisition: (id: number) => ["purchase", "requisition", id] as const,
  invites: (id: number) => ["purchase", "rfq-invites", id] as const,
  quotes: (id: number) => ["purchase", "quotes", id] as const,
  invoices: (p?: object) => ["purchase", "invoices", p ?? {}] as const,
  invoice: (id: number) => ["purchase", "invoice", id] as const,
  payments: (p?: object) => ["purchase", "payments", p ?? {}] as const,
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

export function useSourceToPaySummary() {
  return useQuery<ApiResponse<SourceToPaySummary>>({
    queryKey: QK.sourceSummary,
    queryFn: () => api.get("/purchase/source-to-pay/summary"),
    staleTime: 15_000,
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

// Requisitions
export interface RequisitionParams { search?: string; status?: string; page?: number; limit?: number; }

export function usePurchaseRequisitions(params: RequisitionParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<ListResponse<PurchaseRequisition>>({
    queryKey: QK.requisitions(params),
    queryFn: () => api.get(`/purchase/requisitions?${qs}`),
    staleTime: 15_000,
  });
}

export function usePurchaseRequisition(id: number | null) {
  return useQuery<ApiResponse<PurchaseRequisition>>({
    queryKey: QK.requisition(id ?? 0),
    queryFn: () => api.get(`/purchase/requisitions/${id}`),
    enabled: !!id,
    staleTime: 15_000,
  });
}

function invalidateSourceToPay(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["purchase", "source-to-pay"] });
  qc.invalidateQueries({ queryKey: ["purchase", "requisitions"] });
  qc.invalidateQueries({ queryKey: ["purchase", "rfqs"] });
  qc.invalidateQueries({ queryKey: ["purchase", "orders"] });
  qc.invalidateQueries({ queryKey: ["purchase", "invoices"] });
  qc.invalidateQueries({ queryKey: ["purchase", "payments"] });
  qc.invalidateQueries({ queryKey: QK.summary });
}

export function useCreatePurchaseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseRequisitionFormValues) => api.post<ApiResponse<PurchaseRequisition>>("/purchase/requisitions", data),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useUpdatePurchaseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PurchaseRequisitionFormValues> }) => api.put<ApiResponse<PurchaseRequisition>>(`/purchase/requisitions/${id}`, data),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useDeletePurchaseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/purchase/requisitions/${id}`),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useApprovePurchaseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ApiResponse<PurchaseRequisition>>(`/purchase/requisitions/${id}/approve`, {}),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useRejectPurchaseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => api.post<ApiResponse<PurchaseRequisition>>(`/purchase/requisitions/${id}/reject`, { reason }),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useConvertPurchaseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vendorId }: { id: number; vendorId: number }) => api.post<ApiResponse<{ requisition: PurchaseRequisition; purchaseOrder: PurchaseOrder }>>(`/purchase/requisitions/${id}/convert`, { vendorId }),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}

// RFQ supplier comparison
export function usePurchaseRfqInvites(rfqId: number | null) {
  return useQuery<ApiResponse<PurchaseRfqInvite[]>>({
    queryKey: QK.invites(rfqId ?? 0),
    queryFn: () => api.get(`/purchase/rfqs/${rfqId}/invites`),
    enabled: !!rfqId,
    staleTime: 15_000,
  });
}
export function useInviteRfqVendors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, vendorIds }: { rfqId: number; vendorIds: number[] }) => api.post<ApiResponse<PurchaseRfqInvite[]>>(`/purchase/rfqs/${rfqId}/invites`, { vendorIds }),
    onSuccess: (_, variables) => { qc.invalidateQueries({ queryKey: QK.invites(variables.rfqId) }); },
  });
}
export function usePurchaseRfqQuotes(rfqId: number | null) {
  return useQuery<ApiResponse<PurchaseQuote[]>>({
    queryKey: QK.quotes(rfqId ?? 0),
    queryFn: () => api.get(`/purchase/rfqs/${rfqId}/quotes`),
    enabled: !!rfqId,
    staleTime: 15_000,
  });
}
export function useCreatePurchaseQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseQuoteFormValues) => api.post<ApiResponse<PurchaseQuote>>(`/purchase/rfqs/${data.rfqId}/quotes`, data),
    onSuccess: (_, variables) => { qc.invalidateQueries({ queryKey: QK.quotes(variables.rfqId) }); qc.invalidateQueries({ queryKey: ["purchase", "rfqs"] }); qc.invalidateQueries({ queryKey: QK.sourceSummary }); },
  });
}
export function useUpdatePurchaseQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PurchaseQuoteFormValues> }) => api.put<ApiResponse<PurchaseQuote>>(`/purchase/quotes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase", "quotes"] }); qc.invalidateQueries({ queryKey: QK.sourceSummary }); },
  });
}
export function useAwardPurchaseQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, quoteId, awardReason }: { rfqId: number; quoteId: number; awardReason: string }) => api.post<ApiResponse<PurchaseOrder>>(`/purchase/rfqs/${rfqId}/award`, { quoteId, awardReason }),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}

// Supplier invoices
export interface PurchaseInvoiceParams { search?: string; status?: string; }
export function usePurchaseInvoices(params: PurchaseInvoiceParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  return useQuery<ListResponse<PurchaseInvoice>>({
    queryKey: QK.invoices(params),
    queryFn: () => api.get(`/purchase/invoices?${qs}`),
    staleTime: 15_000,
  });
}
export function usePurchaseInvoice(id: number | null) {
  return useQuery<ApiResponse<PurchaseInvoice>>({
    queryKey: QK.invoice(id ?? 0),
    queryFn: () => api.get(`/purchase/invoices/${id}`),
    enabled: !!id,
  });
}
export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseInvoiceFormValues) => api.post<ApiResponse<PurchaseInvoice>>("/purchase/invoices", data),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useUpdatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { dueDate?: string | null; notes?: string | null; status?: PurchaseInvoiceStatus } }) => api.put<ApiResponse<PurchaseInvoice>>(`/purchase/invoices/${id}`, data),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useDeletePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/purchase/invoices/${id}`),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useMatchPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ApiResponse<unknown>>(`/purchase/invoices/${id}/match`, {}),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useApprovePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ApiResponse<PurchaseInvoice>>(`/purchase/invoices/${id}/approve`, {}),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}

// Vendor payments
export function usePurchasePayments(params: { status?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  return useQuery<ListResponse<PurchasePayment>>({
    queryKey: QK.payments(params),
    queryFn: () => api.get(`/purchase/payments?${qs}`),
    staleTime: 15_000,
  });
}
export function useCreatePurchasePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchasePaymentFormValues) => api.post<ApiResponse<PurchasePayment>>("/purchase/payments", data),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useCreateRazorpayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ApiResponse<{ payment: PurchasePayment; razorpayOrderId: string; keyId: string }>>(`/purchase/payments/${id}/razorpay-order`, {}),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useMarkPurchasePaymentPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, providerPaymentId }: { id: number; providerPaymentId?: string }) => api.post<ApiResponse<PurchasePayment>>(`/purchase/payments/${id}/mark-paid`, { providerPaymentId }),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
export function useFailPurchasePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post<ApiResponse<PurchasePayment>>(`/purchase/payments/${id}/fail`, { reason }),
    onSuccess: () => invalidateSourceToPay(qc),
  });
}
