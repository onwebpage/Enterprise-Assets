import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const TDS_ENTRY_TYPES = ["tds", "tcs"] as const;
export type TDSEntryType = (typeof TDS_ENTRY_TYPES)[number];

export const TDS_STATUSES = ["deducted", "deposited", "filed", "pending"] as const;
export type TDSStatus = (typeof TDS_STATUSES)[number];

export const TDS_PAYMENT_TYPES = ["tds", "tcs"] as const;
export type TDSPaymentType = (typeof TDS_PAYMENT_TYPES)[number];

export const TAX_PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export type TaxPaymentStatus = (typeof TAX_PAYMENT_STATUSES)[number];

// ── TDS Sections reference data ───────────────────────────────────────────────

export const TDS_SECTIONS = [
  { code: "192",    label: "Salary",                            rate: "Slab" },
  { code: "193",    label: "Interest on Securities",            rate: "10%" },
  { code: "194",    label: "Dividends",                         rate: "10%" },
  { code: "194A",   label: "Interest other than securities",    rate: "10%" },
  { code: "194B",   label: "Lottery/Crossword Winnings",        rate: "30%" },
  { code: "194BB",  label: "Horse Race Winnings",               rate: "30%" },
  { code: "194C",   label: "Contractor/Sub-contractor",         rate: "1%/2%" },
  { code: "194D",   label: "Insurance Commission",              rate: "5%" },
  { code: "194DA",  label: "Life Insurance Policy",             rate: "5%" },
  { code: "194E",   label: "Non-Resident Sportsman/Association", rate: "20%" },
  { code: "194EE",  label: "NSS Deposits",                      rate: "10%" },
  { code: "194F",   label: "Mutual Fund Repurchase",            rate: "20%" },
  { code: "194G",   label: "Commission on Lottery Tickets",     rate: "5%" },
  { code: "194H",   label: "Commission / Brokerage",            rate: "5%" },
  { code: "194I",   label: "Rent",                              rate: "10%/2%" },
  { code: "194IA",  label: "Rent of Plant/Machinery",           rate: "2%" },
  { code: "194IB",  label: "Rent (Individual/HUF)",             rate: "5%" },
  { code: "194IC",  label: "Joint Development Agreements",      rate: "10%" },
  { code: "194J",   label: "Professional/Technical Fees",       rate: "10%/2%" },
  { code: "194K",   label: "Income from Mutual Funds",          rate: "10%" },
  { code: "194LA",  label: "Compensation for Immovable Property", rate: "10%" },
  { code: "194LB",  label: "Interest (Infrastructure Bonds)",   rate: "5%" },
  { code: "194LC",  label: "Interest (Foreign Currency Loans)", rate: "5%" },
  { code: "194LD",  label: "Interest (G-Sec/Bonds/NRI)",        rate: "5%" },
  { code: "194N",   label: "Cash Withdrawal",                   rate: "2%" },
  { code: "194O",   label: "E-Commerce Participants",           rate: "1%" },
  { code: "194P",   label: "Senior Citizen (Tax on Salary)",    rate: "Slab" },
  { code: "194Q",   label: "Goods Purchase >₹50L",              rate: "0.1%" },
  { code: "194R",   label: "Perquisites/Benefits",              rate: "10%" },
  { code: "194S",   label: "Virtual Digital Assets (VDA/Crypto)", rate: "1%" },
] as const;

export const TCS_SECTIONS = [
  { code: "206C(1)",   label: "Timber / Forest Produce",        rate: "2.5%/5%" },
  { code: "206C(1C)",  label: "Tendu Leaves",                   rate: "5%" },
  { code: "206C(1F)",  label: "Motor Vehicle Sale >₹10L",       rate: "1%" },
  { code: "206C(1G)",  label: "Foreign Remittance (LRS)",       rate: "5%/20%" },
  { code: "206C(1H)",  label: "Sale of Goods >₹50Cr",          rate: "0.1%" },
  { code: "206C(1I)",  label: "E-Commerce Operator",            rate: "1%" },
  { code: "206C(2)",   label: "Scrap",                          rate: "1%" },
  { code: "206C(3)",   label: "Minerals (Coal/Lignite/Iron Ore)", rate: "1%" },
  { code: "206C(4)",   label: "Alcoholic Liquor",               rate: "1%" },
  { code: "206C(6)",   label: "Parking Lot/Toll/Mining",        rate: "2%" },
] as const;

// ── Interfaces ────────────────────────────────────────────────────────────────

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

export interface TDSPayment {
  id: number;
  orgId: number | null;
  paymentType: TDSPaymentType;
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

export interface TDSSummary {
  tds: { totalDeducted: string; totalGross: string; count: number };
  tcs: { totalCollected: string; totalGross: string; count: number };
  pendingDeposit: { amount: string; count: number };
  ytdPaid: { amount: string; count: number };
  statusBreakdown: { status: TDSStatus; count: number; amount: string }[];
  topSections: { section: string; entryType: string; count: number; totalTax: string; totalGross: string }[];
  recentEntries: TDSEntry[];
}

export interface TDSPermissions {
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
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

export interface TDSPaymentFormValues {
  paymentType: TDSPaymentType;
  period: string;
  paymentDate: string;
  amount: string;
  interest?: string;
  penalty?: string;
  challanNumber?: string | null;
  bankReference?: string | null;
  status?: TaxPaymentStatus;
  notes?: string | null;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const QK = {
  summary:    ["tds", "summary"] as const,
  permissions: ["tds", "permissions"] as const,
  entries:    (p?: object) => ["tds", "entries", p ?? {}] as const,
  payments:   (p?: object) => ["tds", "payments", p ?? {}] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTDSSummary() {
  return useQuery<ApiResponse<TDSSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/tds/summary"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTDSPermissions() {
  return useQuery<ApiResponse<TDSPermissions>>({
    queryKey: QK.permissions,
    queryFn:  () => api.get("/tds/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

export interface TDSEntriesParams {
  search?: string;
  status?: string;
  entryType?: string;
  section?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function useTDSEntries(params: TDSEntriesParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)    qs.set("search",    params.search);
  if (params.status)    qs.set("status",    params.status);
  if (params.entryType) qs.set("entryType", params.entryType);
  if (params.section)   qs.set("section",   params.section);
  if (params.dateFrom)  qs.set("dateFrom",  params.dateFrom);
  if (params.dateTo)    qs.set("dateTo",    params.dateTo);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<ListResponse<TDSEntry>>({
    queryKey: QK.entries(params),
    queryFn:  () => api.get(`/tds/entries?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateTDSEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TDSEntryFormValues) =>
      api.post<ApiResponse<TDSEntry>>("/tds/entries", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tds", "entries"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateTDSEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TDSEntryFormValues> }) =>
      api.put<ApiResponse<TDSEntry>>(`/tds/entries/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tds", "entries"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteTDSEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/tds/entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tds", "entries"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export interface TDSPaymentsParams {
  search?: string;
  status?: string;
  paymentType?: string;
  period?: string;
  page?: number;
  limit?: number;
}

export function useTDSPayments(params: TDSPaymentsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)      qs.set("search",      params.search);
  if (params.status)      qs.set("status",      params.status);
  if (params.paymentType) qs.set("paymentType", params.paymentType);
  if (params.period)      qs.set("period",      params.period);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<ListResponse<TDSPayment>>({
    queryKey: QK.payments(params),
    queryFn:  () => api.get(`/tds/payments?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateTDSPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TDSPaymentFormValues) =>
      api.post<ApiResponse<TDSPayment>>("/tds/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tds", "payments"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateTDSPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TDSPaymentFormValues> }) =>
      api.put<ApiResponse<TDSPayment>>(`/tds/payments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tds", "payments"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteTDSPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/tds/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tds", "payments"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
