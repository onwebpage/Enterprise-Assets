import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export const AP_VENDOR_STATUSES = ["active", "inactive", "blocked"] as const;
export type APVendorStatus = (typeof AP_VENDOR_STATUSES)[number];

export const AP_BILL_STATUSES = ["draft", "received", "partial", "paid", "overdue", "void"] as const;
export type APBillStatus = (typeof AP_BILL_STATUSES)[number];

export const AP_PAYMENT_METHODS = ["bank_transfer", "check", "cash", "card", "other"] as const;
export type APPaymentMethod = (typeof AP_PAYMENT_METHODS)[number];

export interface APVendor {
  id: number;
  orgId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  currency: string;
  paymentTerms: string | null;
  status: APVendorStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  billCount?: number;
  totalOutstanding?: string;
}

export interface APBillLine {
  id: number;
  billId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sequence: number;
}

export interface APBill {
  id: number;
  orgId: number | null;
  vendorId: number;
  vendorName?: string;
  billNumber: string;
  issueDate: string;
  dueDate: string;
  status: APBillStatus;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  lines?: APBillLine[];
}

export interface APPayment {
  id: number;
  orgId: number | null;
  billId: number;
  vendorId: number;
  billNumber?: string;
  vendorName?: string;
  paymentDate: string;
  amount: string;
  method: APPaymentMethod;
  reference: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface APSummary {
  totalPayable: string;
  totalOverdue: string;
  paidThisMonth: string;
  draftCount: number;
  overdueCount: number;
  vendorCount: number;
}

export interface APPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Form value types
export interface APVendorFormValues {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  currency?: string;
  paymentTerms?: string | null;
  status?: APVendorStatus;
  notes?: string | null;
}

export interface APBillLineFormValues {
  description: string;
  quantity: string;
  unitPrice: string;
  sequence?: number;
}

export interface APBillFormValues {
  vendorId: number;
  billNumber?: string;
  issueDate: string;
  dueDate: string;
  status?: APBillStatus;
  taxAmount?: string;
  notes?: string | null;
  lines: APBillLineFormValues[];
}

export interface APPaymentFormValues {
  billId: number;
  paymentDate: string;
  amount: string;
  method?: APPaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export interface APListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query key helpers ─────────────────────────────────────────────────────────

const QK = {
  perms:   ["ap", "my-permissions"],
  summary: ["ap", "summary"],
  vendors: (p?: object) => ["ap", "vendors", p ?? {}],
  bills:   (p?: object) => ["ap", "bills",   p ?? {}],
  payments: (p?: object) => ["ap", "payments", p ?? {}],
};

// ── Permissions ───────────────────────────────────────────────────────────────

export function useAPPermissions() {
  return useQuery<ApiResponse<APPermissions>>({
    queryKey: QK.perms,
    queryFn:  () => api.get("/ap/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useAPSummary() {
  return useQuery<ApiResponse<APSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/ap/summary"),
    staleTime: 30_000,
  });
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export interface APVendorsParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useAPVendors(params: APVendorsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<APListResponse<APVendor>>({
    queryKey: QK.vendors(params),
    queryFn:  () => api.get(`/ap/vendors?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateAPVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: APVendorFormValues) =>
      api.post<ApiResponse<APVendor>>("/ap/vendors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "vendors"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateAPVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: APVendorFormValues }) =>
      api.put<ApiResponse<APVendor>>(`/ap/vendors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "vendors"] });
    },
  });
}

export function useDeleteAPVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/ap/vendors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "vendors"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Bills ─────────────────────────────────────────────────────────────────────

export interface APBillsParams {
  search?: string;
  status?: string;
  vendorId?: number;
  page?: number;
  limit?: number;
}

export function useAPBills(params: APBillsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)   qs.set("search",   params.search);
  if (params.status)   qs.set("status",   params.status);
  if (params.vendorId) qs.set("vendorId", String(params.vendorId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<APListResponse<APBill>>({
    queryKey: QK.bills(params),
    queryFn:  () => api.get(`/ap/bills?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useAPBill(id: number | null) {
  return useQuery<ApiResponse<APBill>>({
    queryKey: ["ap", "bills", id],
    queryFn:  () => api.get(`/ap/bills/${id}`),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

export function useCreateAPBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: APBillFormValues) =>
      api.post<ApiResponse<APBill>>("/ap/bills", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "bills"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateAPBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<APBillFormValues> & { status?: APBillStatus } }) =>
      api.put<ApiResponse<APBill>>(`/ap/bills/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "bills"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteAPBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/ap/bills/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "bills"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface APPaymentsParams {
  billId?: number;
  vendorId?: number;
  page?: number;
  limit?: number;
}

export function useAPPayments(params: APPaymentsParams = {}) {
  const qs = new URLSearchParams();
  if (params.billId)   qs.set("billId",   String(params.billId));
  if (params.vendorId) qs.set("vendorId", String(params.vendorId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<APListResponse<APPayment>>({
    queryKey: QK.payments(params),
    queryFn:  () => api.get(`/ap/payments?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateAPPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: APPaymentFormValues) =>
      api.post<ApiResponse<APPayment>>("/ap/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "payments"] });
      qc.invalidateQueries({ queryKey: ["ap", "bills"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateAPPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<APPaymentFormValues> }) =>
      api.put<ApiResponse<APPayment>>(`/ap/payments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "payments"] });
      qc.invalidateQueries({ queryKey: ["ap", "bills"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteAPPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/ap/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap", "payments"] });
      qc.invalidateQueries({ queryKey: ["ap", "bills"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
