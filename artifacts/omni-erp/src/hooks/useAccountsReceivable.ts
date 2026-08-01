import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export const AR_CUSTOMER_STATUSES = ["active", "inactive", "blocked"] as const;
export type ARCustomerStatus = (typeof AR_CUSTOMER_STATUSES)[number];

export const AR_INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "void"] as const;
export type ARInvoiceStatus = (typeof AR_INVOICE_STATUSES)[number];

export const AR_PAYMENT_METHODS = ["bank_transfer", "check", "cash", "card", "other"] as const;
export type ARPaymentMethod = (typeof AR_PAYMENT_METHODS)[number];

export interface ARCustomer {
  id: number;
  orgId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  creditLimit: string;
  currency: string;
  status: ARCustomerStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  invoiceCount?: number;
  totalOutstanding?: string;
}

export interface ARInvoiceLine {
  id: number;
  invoiceId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sequence: number;
}

export interface ARInvoice {
  id: number;
  orgId: number | null;
  customerId: number;
  customerName?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: ARInvoiceStatus;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  lines?: ARInvoiceLine[];
}

export interface ARPayment {
  id: number;
  orgId: number | null;
  invoiceId: number;
  customerId: number;
  invoiceNumber?: string;
  customerName?: string;
  paymentDate: string;
  amount: string;
  method: ARPaymentMethod;
  reference: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface ARSummary {
  totalReceivable: string;
  totalOverdue: string;
  paidThisMonth: string;
  draftCount: number;
  overdueCount: number;
  customerCount: number;
}

export interface ARPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Form value types
export interface ARCustomerFormValues {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  creditLimit?: string;
  currency?: string;
  status?: ARCustomerStatus;
  notes?: string | null;
}

export interface ARInvoiceLineFormValues {
  description: string;
  quantity: string;
  unitPrice: string;
  sequence?: number;
}

export interface ARInvoiceFormValues {
  customerId: number;
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  status?: ARInvoiceStatus;
  taxAmount?: string;
  notes?: string | null;
  lines: ARInvoiceLineFormValues[];
}

export interface ARPaymentFormValues {
  invoiceId: number;
  paymentDate: string;
  amount: string;
  method?: ARPaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

// List response shape
export interface ARListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query key helpers ─────────────────────────────────────────────────────────

const QK = {
  perms:     ["ar", "my-permissions"],
  summary:   ["ar", "summary"],
  customers: (p?: object) => ["ar", "customers", p ?? {}],
  invoices:  (p?: object) => ["ar", "invoices",  p ?? {}],
  payments:  (p?: object) => ["ar", "payments",  p ?? {}],
};

// ── Permissions ───────────────────────────────────────────────────────────────

export function useARPermissions() {
  return useQuery<ApiResponse<ARPermissions>>({
    queryKey: QK.perms,
    queryFn:  () => api.get("/ar/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useARSummary() {
  return useQuery<ApiResponse<ARSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/ar/summary"),
    staleTime: 30_000,
  });
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface ARCustomersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useARCustomers(params: ARCustomersParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<ARListResponse<ARCustomer>>({
    queryKey: QK.customers(params),
    queryFn:  () => api.get(`/ar/customers?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateARCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ARCustomerFormValues) =>
      api.post<ApiResponse<ARCustomer>>("/ar/customers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "customers"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateARCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ARCustomerFormValues }) =>
      api.put<ApiResponse<ARCustomer>>(`/ar/customers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "customers"] });
    },
  });
}

export function useDeleteARCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/ar/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "customers"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export interface ARInvoicesParams {
  search?: string;
  status?: string;
  customerId?: number;
  page?: number;
  limit?: number;
}

export function useARInvoices(params: ARInvoicesParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)     qs.set("search",     params.search);
  if (params.status)     qs.set("status",     params.status);
  if (params.customerId) qs.set("customerId", String(params.customerId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<ARListResponse<ARInvoice>>({
    queryKey: QK.invoices(params),
    queryFn:  () => api.get(`/ar/invoices?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useARInvoice(id: number | null) {
  return useQuery<ApiResponse<ARInvoice>>({
    queryKey: ["ar", "invoices", id],
    queryFn:  () => api.get(`/ar/invoices/${id}`),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

export function useCreateARInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ARInvoiceFormValues) =>
      api.post<ApiResponse<ARInvoice>>("/ar/invoices", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateARInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ARInvoiceFormValues> & { status?: ARInvoiceStatus } }) =>
      api.put<ApiResponse<ARInvoice>>(`/ar/invoices/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteARInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/ar/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface ARPaymentsParams {
  search?: string;
  invoiceId?: number;
  customerId?: number;
  page?: number;
  limit?: number;
}

export function useARPayments(params: ARPaymentsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)     qs.set("search",     params.search);
  if (params.invoiceId)  qs.set("invoiceId",  String(params.invoiceId));
  if (params.customerId) qs.set("customerId", String(params.customerId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<ARListResponse<ARPayment>>({
    queryKey: QK.payments(params),
    queryFn:  () => api.get(`/ar/payments?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateARPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ARPaymentFormValues) =>
      api.post<ApiResponse<ARPayment>>("/ar/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "payments"] });
      qc.invalidateQueries({ queryKey: ["ar", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateARPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ARPaymentFormValues> }) =>
      api.put<ApiResponse<ARPayment>>(`/ar/payments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "payments"] });
      qc.invalidateQueries({ queryKey: ["ar", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteARPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/ar/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar", "payments"] });
      qc.invalidateQueries({ queryKey: ["ar", "invoices"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
