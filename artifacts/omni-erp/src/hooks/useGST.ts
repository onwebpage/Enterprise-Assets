import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const TAX_RATE_TYPES = ["cgst", "sgst", "igst", "utgst", "cess", "vat", "service_tax", "other"] as const;
export type TaxRateType = (typeof TAX_RATE_TYPES)[number];

export const GST_RETURN_TYPES = ["gstr1", "gstr3b", "gstr9", "gstr2a", "gstr4", "gstr6"] as const;
export type GSTReturnType = (typeof GST_RETURN_TYPES)[number];

export const GST_RETURN_STATUSES = ["draft", "pending", "filed", "overdue", "revised"] as const;
export type GSTReturnStatus = (typeof GST_RETURN_STATUSES)[number];

export const GST_ENTRY_TYPES = ["b2b", "b2c_large", "b2c_small", "export", "import", "rcm", "nil_exempt", "other"] as const;
export type GSTEntryType = (typeof GST_ENTRY_TYPES)[number];

export const TDS_ENTRY_TYPES = ["tds", "tcs"] as const;
export type TDSEntryType = (typeof TDS_ENTRY_TYPES)[number];

export const TDS_STATUSES = ["deducted", "deposited", "filed", "pending"] as const;
export type TDSStatus = (typeof TDS_STATUSES)[number];

export const TAX_PAYMENT_TYPES = ["gst", "tds", "tcs", "advance_tax", "self_assessment"] as const;
export type TaxPaymentType = (typeof TAX_PAYMENT_TYPES)[number];

export const TAX_PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export type TaxPaymentStatus = (typeof TAX_PAYMENT_STATUSES)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface TaxRate {
  id: number;
  orgId: number | null;
  name: string;
  type: TaxRateType;
  rate: string;
  hsnSacCode: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GSTReturn {
  id: number;
  orgId: number | null;
  returnType: GSTReturnType;
  period: string;
  dueDate: string;
  submissionDate: string | null;
  status: GSTReturnStatus;
  gstin: string | null;
  totalTaxableValue: string;
  totalCgst: string;
  totalSgst: string;
  totalIgst: string;
  totalCess: string;
  totalTaxLiability: string;
  totalItc: string;
  netPayable: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  entries?: GSTReturnEntry[];
}

export interface GSTReturnEntry {
  id: number;
  returnId: number;
  orgId: number | null;
  entryType: GSTEntryType;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  partyGstin: string | null;
  partyName: string | null;
  placeOfSupply: string | null;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  totalTax: string;
  notes: string | null;
  createdAt: string;
}

export interface TDSEntry {
  id: number;
  orgId: number | null;
  entryType: TDSEntryType;
  section: string;
  partyName: string;
  partyPan: string | null;
  transactionDate: string;
  grossAmount: string;
  taxRate: string;
  taxAmount: string;
  netAmount: string;
  depositDate: string | null;
  challanNumber: string | null;
  assessmentYear: string | null;
  status: TDSStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxPayment {
  id: number;
  orgId: number | null;
  paymentType: TaxPaymentType;
  period: string;
  paymentDate: string;
  amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
  interest: string;
  penalty: string;
  challanNumber: string | null;
  bankReference: string | null;
  status: TaxPaymentStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GSTSummary {
  totalGstCollected: string;
  totalItc: string;
  netPayable: string;
  ytdPaid: string;
  pendingFilings: number;
  overdueFilings: number;
  pendingTds: string;
  activeTaxRates: number;
  currentPeriod: string;
}

export interface GSTPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Form value types
export interface TaxRateFormValues {
  name: string;
  type?: TaxRateType;
  rate: string;
  hsnSacCode?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface GSTReturnFormValues {
  returnType: GSTReturnType;
  period: string;
  dueDate: string;
  submissionDate?: string | null;
  status?: GSTReturnStatus;
  gstin?: string | null;
  totalTaxableValue?: string;
  totalCgst?: string;
  totalSgst?: string;
  totalIgst?: string;
  totalCess?: string;
  totalItc?: string;
  notes?: string | null;
}

export interface GSTReturnEntryFormValues {
  returnId: number;
  entryType?: GSTEntryType;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  partyGstin?: string | null;
  partyName?: string | null;
  placeOfSupply?: string | null;
  taxableValue?: string;
  cgstAmount?: string;
  sgstAmount?: string;
  igstAmount?: string;
  cessAmount?: string;
  notes?: string | null;
}

export interface TDSEntryFormValues {
  entryType?: TDSEntryType;
  section: string;
  partyName: string;
  partyPan?: string | null;
  transactionDate: string;
  grossAmount: string;
  taxRate: string;
  depositDate?: string | null;
  challanNumber?: string | null;
  assessmentYear?: string | null;
  status?: TDSStatus;
  notes?: string | null;
}

export interface TaxPaymentFormValues {
  paymentType?: TaxPaymentType;
  period: string;
  paymentDate: string;
  amount: string;
  cgst?: string;
  sgst?: string;
  igst?: string;
  cess?: string;
  interest?: string;
  penalty?: string;
  challanNumber?: string | null;
  bankReference?: string | null;
  status?: TaxPaymentStatus;
  notes?: string | null;
}

export interface GSTListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query key helpers ─────────────────────────────────────────────────────────

const QK = {
  perms:      ["gst", "my-permissions"],
  summary:    ["gst", "summary"],
  taxRates:   (p?: object) => ["gst", "tax-rates", p ?? {}],
  returns:    (p?: object) => ["gst", "returns",   p ?? {}],
  returnById: (id: number) => ["gst", "returns", id],
  entries:    (returnId: number, p?: object) => ["gst", "returns", returnId, "entries", p ?? {}],
  tds:        (p?: object) => ["gst", "tds",      p ?? {}],
  payments:   (p?: object) => ["gst", "payments", p ?? {}],
};

// ── Permissions ───────────────────────────────────────────────────────────────

export function useGSTPermissions() {
  return useQuery<ApiResponse<GSTPermissions>>({
    queryKey: QK.perms,
    queryFn:  () => api.get("/gst/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useGSTSummary() {
  return useQuery<ApiResponse<GSTSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/gst/summary"),
    staleTime: 30_000,
  });
}

// ── Tax Rates ─────────────────────────────────────────────────────────────────

export interface TaxRatesParams {
  search?: string;
  type?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export function useTaxRates(params: TaxRatesParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)              qs.set("search",   params.search);
  if (params.type)                qs.set("type",     params.type);
  if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<GSTListResponse<TaxRate>>({
    queryKey: QK.taxRates(params),
    queryFn:  () => api.get(`/gst/tax-rates?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TaxRateFormValues) =>
      api.post<ApiResponse<TaxRate>>("/gst/tax-rates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "tax-rates"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaxRateFormValues> }) =>
      api.put<ApiResponse<TaxRate>>(`/gst/tax-rates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "tax-rates"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/gst/tax-rates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "tax-rates"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── GST Returns ───────────────────────────────────────────────────────────────

export interface GSTReturnsParams {
  search?: string;
  status?: string;
  returnType?: string;
  period?: string;
  page?: number;
  limit?: number;
}

export function useGSTReturns(params: GSTReturnsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)     qs.set("search",     params.search);
  if (params.status)     qs.set("status",     params.status);
  if (params.returnType) qs.set("returnType", params.returnType);
  if (params.period)     qs.set("period",     params.period);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<GSTListResponse<GSTReturn>>({
    queryKey: QK.returns(params),
    queryFn:  () => api.get(`/gst/returns?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useGSTReturn(id: number | null) {
  return useQuery<ApiResponse<GSTReturn>>({
    queryKey: QK.returnById(id!),
    queryFn:  () => api.get(`/gst/returns/${id}`),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

export function useCreateGSTReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GSTReturnFormValues) =>
      api.post<ApiResponse<GSTReturn>>("/gst/returns", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "returns"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateGSTReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GSTReturnFormValues> }) =>
      api.put<ApiResponse<GSTReturn>>(`/gst/returns/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "returns"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useSubmitGSTReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<GSTReturn>>(`/gst/returns/${id}/submit`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "returns"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteGSTReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/gst/returns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "returns"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// Return Entries
export function useGSTReturnEntries(returnId: number | null) {
  return useQuery<GSTListResponse<GSTReturnEntry>>({
    queryKey: QK.entries(returnId!),
    queryFn:  () => api.get(`/gst/returns/${returnId}/entries?limit=100`),
    enabled: returnId !== null,
    staleTime: 10_000,
  });
}

export function useCreateGSTReturnEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, data }: { returnId: number; data: Omit<GSTReturnEntryFormValues, 'returnId'> }) =>
      api.post<ApiResponse<GSTReturnEntry>>(`/gst/returns/${returnId}/entries`, { ...data, returnId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["gst", "returns", vars.returnId, "entries"] });
      qc.invalidateQueries({ queryKey: ["gst", "returns"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteGSTReturnEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; returnId: number }) =>
      api.delete<ApiResponse<{ id: number }>>(`/gst/entries/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["gst", "returns", vars.returnId, "entries"] });
      qc.invalidateQueries({ queryKey: ["gst", "returns"] });
    },
  });
}

// ── TDS / TCS Entries ─────────────────────────────────────────────────────────

export interface TDSParams {
  search?: string;
  status?: string;
  entryType?: string;
  section?: string;
  page?: number;
  limit?: number;
}

export function useTDSEntries(params: TDSParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)    qs.set("search",    params.search);
  if (params.status)    qs.set("status",    params.status);
  if (params.entryType) qs.set("entryType", params.entryType);
  if (params.section)   qs.set("section",   params.section);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<GSTListResponse<TDSEntry>>({
    queryKey: QK.tds(params),
    queryFn:  () => api.get(`/gst/tds?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateTDSEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TDSEntryFormValues) =>
      api.post<ApiResponse<TDSEntry>>("/gst/tds", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "tds"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateTDSEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TDSEntryFormValues> }) =>
      api.put<ApiResponse<TDSEntry>>(`/gst/tds/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "tds"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteTDSEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/gst/tds/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "tds"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Tax Payments ──────────────────────────────────────────────────────────────

export interface TaxPaymentsParams {
  search?: string;
  status?: string;
  paymentType?: string;
  period?: string;
  page?: number;
  limit?: number;
}

export function useTaxPayments(params: TaxPaymentsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)      qs.set("search",      params.search);
  if (params.status)      qs.set("status",      params.status);
  if (params.paymentType) qs.set("paymentType", params.paymentType);
  if (params.period)      qs.set("period",      params.period);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<GSTListResponse<TaxPayment>>({
    queryKey: QK.payments(params),
    queryFn:  () => api.get(`/gst/payments?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateTaxPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TaxPaymentFormValues) =>
      api.post<ApiResponse<TaxPayment>>("/gst/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "payments"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateTaxPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaxPaymentFormValues> }) =>
      api.put<ApiResponse<TaxPayment>>(`/gst/payments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "payments"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteTaxPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/gst/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gst", "payments"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
