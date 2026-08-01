import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type JEStatus = "draft" | "posted" | "void";

export interface JournalEntryLine {
  id:             number;
  journalEntryId: number;
  accountId:      number;
  accountCode:    string;
  accountName:    string;
  accountType:    string;
  normalBalance:  string;
  description:    string | null;
  debit:          string;
  credit:         string;
  sequence:       number;
}

export interface JournalEntry {
  id:          number;
  orgId:       number | null;
  entryNumber: string;
  date:        string;
  reference:   string | null;
  memo:        string;
  status:      JEStatus;
  totalDebit:  string;
  totalCredit: string;
  createdBy:   number | null;
  createdAt:   string;
  updatedAt:   string;
  lines?:      JournalEntryLine[];
}

export interface JournalEntriesListResponse {
  success:    boolean;
  data:       JournalEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface LedgerLine {
  id:            number;
  date:          string;
  entryNumber:   string;
  reference:     string | null;
  memo:          string;
  description:   string | null;
  debit:         string;
  credit:        string;
  sequence:      number;
  jeId:          number;
  runningBalance: number;
}

export interface AccountLedgerResponse {
  success:            boolean;
  account:            {
    id:            number;
    code:          string;
    name:          string;
    type:          string;
    normalBalance: string;
    balance:       string;
  };
  openingBalance:     number;
  closingBalance:     number;
  totalDebitInRange:  number;
  totalCreditInRange: number;
  data:               LedgerLine[];
  total:              number;
  page:               number;
  limit:              number;
  totalPages:         number;
}

export interface LedgerSummaryRow {
  accountId:      number;
  accountCode:    string;
  accountName:    string;
  accountType:    string;
  normalBalance:  string;
  currentBalance: string;
  totalDebit:     string;
  totalCredit:    string;
  lineCount:      number;
}

export interface LedgerSummaryResponse {
  success: boolean;
  data:    LedgerSummaryRow[];
}

export interface JournalEntryLineFormValues {
  accountId:   number;
  description: string;
  debit:       string;
  credit:      string;
}

export interface JournalEntryFormValues {
  date:      string;
  reference: string;
  memo:      string;
  lines:     JournalEntryLineFormValues[];
}

// ── Query keys ────────────────────────────────────────────────────────────────

const GL_KEY = ["finance", "ledger"] as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

export interface JournalEntriesParams {
  search?:    string;
  dateFrom?:  string;
  dateTo?:    string;
  accountId?: string;
  status?:    string;
  page?:      number;
  limit?:     number;
}

export function useJournalEntries(params: JournalEntriesParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)    qs.set("search",    params.search);
  if (params.dateFrom)  qs.set("dateFrom",  params.dateFrom);
  if (params.dateTo)    qs.set("dateTo",    params.dateTo);
  if (params.accountId) qs.set("accountId", params.accountId);
  if (params.status)    qs.set("status",    params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 50));

  return useQuery<JournalEntriesListResponse>({
    queryKey: [...GL_KEY, "entries", params],
    queryFn:  () => api.get(`/finance/ledger/journal-entries?${qs}`),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useJournalEntry(id: number | null) {
  return useQuery<ApiResponse<JournalEntry>>({
    queryKey: [...GL_KEY, "entries", id],
    queryFn:  () => api.get(`/finance/ledger/journal-entries/${id}`),
    enabled:  id !== null,
    staleTime: 10_000,
  });
}

export interface AccountEntriesParams {
  accountId: string;
  dateFrom?: string;
  dateTo?:   string;
  page?:     number;
  limit?:    number;
}

export function useAccountLedger(params: AccountEntriesParams | null) {
  const qs = new URLSearchParams();
  if (params) {
    qs.set("accountId", params.accountId);
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo)   qs.set("dateTo",   params.dateTo);
    qs.set("page",  String(params.page  ?? 1));
    qs.set("limit", String(params.limit ?? 100));
  }

  return useQuery<AccountLedgerResponse>({
    queryKey: [...GL_KEY, "account-entries", params],
    queryFn:  () => api.get(`/finance/ledger/account-entries?${qs}`),
    enabled:  params !== null,
    staleTime: 10_000,
    retry: 1,
  });
}

export interface LedgerSummaryParams {
  dateFrom?: string;
  dateTo?:   string;
}

export function useLedgerSummary(params: LedgerSummaryParams = {}) {
  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo)   qs.set("dateTo",   params.dateTo);

  return useQuery<LedgerSummaryResponse>({
    queryKey: [...GL_KEY, "summary", params],
    queryFn:  () => api.get(`/finance/ledger/summary?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useGLPermissions() {
  return useQuery<ApiResponse<{ canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>>({
    queryKey: [...GL_KEY, "my-permissions"],
    queryFn:  () => api.get("/finance/ledger/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: JournalEntryFormValues) =>
      api.post<ApiResponse<JournalEntry>>("/finance/ledger/journal-entries", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GL_KEY });
      qc.invalidateQueries({ queryKey: ["finance", "accounts"] }); // balances may change after post
    },
  });
}

export function useUpdateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: JournalEntryFormValues }) =>
      api.put<ApiResponse<JournalEntry>>(`/finance/ledger/journal-entries/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GL_KEY });
    },
  });
}

export function usePostJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<JournalEntry>>(`/finance/ledger/journal-entries/${id}/post`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GL_KEY });
      qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
    },
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/finance/ledger/journal-entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GL_KEY });
    },
  });
}
