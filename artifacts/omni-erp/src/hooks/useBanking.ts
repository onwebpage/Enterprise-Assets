import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const BANK_ACCOUNT_TYPES = ["checking", "savings", "credit", "cash"] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export const BANK_ACCOUNT_STATUSES = ["active", "inactive", "closed"] as const;
export type BankAccountStatus = (typeof BANK_ACCOUNT_STATUSES)[number];

export const BANK_TRANSACTION_TYPES = ["credit", "debit"] as const;
export type BankTransactionType = (typeof BANK_TRANSACTION_TYPES)[number];

export const BANK_TRANSACTION_STATUSES = ["unreconciled", "reconciled", "excluded"] as const;
export type BankTransactionStatus = (typeof BANK_TRANSACTION_STATUSES)[number];

export const RECONCILIATION_STATUSES = ["draft", "completed"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];
export const CHEQUE_BOOK_STATUSES = ["active", "closed"] as const;
export type ChequeBookStatus = (typeof CHEQUE_BOOK_STATUSES)[number];
export const CHEQUE_DIRECTIONS = ["issued", "received"] as const;
export type ChequeDirection = (typeof CHEQUE_DIRECTIONS)[number];
export const CHEQUE_STATUSES = ["pending", "cleared", "bounced", "cancelled"] as const;
export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BankAccount {
  id: number;
  orgId: number | null;
  name: string;
  accountNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  currency: string;
  currentBalance: string;
  accountType: BankAccountType;
  status: BankAccountStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: number;
  orgId: number | null;
  bankAccountId: number;
  accountName?: string | null;
  transactionDate: string;
  description: string;
  reference: string | null;
  amount: string;
  type: BankTransactionType;
  category: string | null;
  status: BankTransactionStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  source?: 'manual' | 'statement_import';
  importId?: number | null;
  matchedJournalEntryId?: number | null;
  matchConfidence?: string | null;
}

export interface BankReconciliation {
  id: number;
  orgId: number | null;
  bankAccountId: number;
  accountName?: string | null;
  statementDate: string;
  openingBalance: string;
  closingBalance: string;
  reconciledBalance: string;
  difference: string;
  status: ReconciliationStatus;
  notes: string | null;
  createdBy: number | null;
  completedAt: string | null;
  matchedTransactionIds?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface BankingSummary {
  totalBalance: string;
  accountCount: number;
  unreconciledCount: number;
  completedReconciliations: number;
}

export interface BankingPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Form types
export interface BankAccountFormValues {
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  currency?: string;
  currentBalance?: string;
  accountType?: BankAccountType;
  status?: BankAccountStatus;
  notes?: string | null;
}

export interface BankTransactionFormValues {
  bankAccountId: number;
  transactionDate: string;
  description: string;
  reference?: string | null;
  amount: string;
  type?: BankTransactionType;
  category?: string | null;
  notes?: string | null;
}

export interface BankReconciliationFormValues {
  bankAccountId: number;
  statementDate: string;
  openingBalance?: string;
  closingBalance: string;
  notes?: string | null;
  matchedTransactionIds?: number[];
}

export interface BankingListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReconciliationReport {
  total: number;
  matched: number;
  unreconciled: number;
  credits: string;
  debits: string;
}

export interface ChequeBook { id: number; orgId: number | null; bankAccountId: number; accountName?: string | null; name: string; prefix: string | null; startNumber: number; endNumber: number; nextNumber: number; issueDate: string; status: ChequeBookStatus; notes: string | null; usedCount: number; }
export interface Cheque { id: number; orgId: number | null; bankAccountId: number; accountName?: string | null; chequeBookId: number | null; bookName?: string | null; chequeNumber: string; direction: ChequeDirection; issueDate: string; chequeDate: string; partyName: string; amount: string; status: ChequeStatus; clearedDate: string | null; bouncedDate: string | null; bounceReason: string | null; reference: string | null; notes: string | null; journalEntryId: number | null; }
export interface ChequeBookFormValues { bankAccountId: number; name: string; prefix?: string | null; startNumber: number; endNumber: number; issueDate: string; notes?: string | null; }
export interface ChequeFormValues { bankAccountId: number; chequeBookId?: number | null; chequeNumber?: string; direction: ChequeDirection; issueDate: string; chequeDate: string; partyName: string; amount: string; reference?: string | null; notes?: string | null; journalEntryId?: number | null; }

// ── Query keys ────────────────────────────────────────────────────────────────

const QK = {
  permissions:       ["banking", "permissions"] as const,
  summary:           ["banking", "summary"] as const,
  accounts:          (p: object) => ["banking", "accounts", p] as const,
  transactions:      (p: object) => ["banking", "transactions", p] as const,
  reconciliations:   (p: object) => ["banking", "reconciliations", p] as const,
  reconciliation:    (id: number) => ["banking", "reconciliations", id] as const,
};

// ── Permissions & Summary ─────────────────────────────────────────────────────

export function useBankingPermissions() {
  return useQuery<ApiResponse<BankingPermissions>>({
    queryKey: QK.permissions,
    queryFn: () => api.get("/banking/my-permissions"),
    staleTime: 60_000,
  });
}

export function useBankingSummary() {
  return useQuery<ApiResponse<BankingSummary>>({
    queryKey: QK.summary,
    queryFn: () => api.get("/banking/summary"),
    staleTime: 30_000,
  });
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

export function useBankAccounts(params: { search?: string; status?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<BankingListResponse<BankAccount>>({
    queryKey: QK.accounts(params),
    queryFn:  () => api.get(`/banking/accounts?${qs}`),
    staleTime: 15_000,
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BankAccountFormValues) =>
      api.post<ApiResponse<BankAccount>>("/banking/accounts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "accounts"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BankAccountFormValues> }) =>
      api.put<ApiResponse<BankAccount>>(`/banking/accounts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "accounts"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/banking/accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "accounts"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function useBankTransactions(params: {
  search?: string; status?: string; type?: string;
  bankAccountId?: number; page?: number; limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (params.search)        qs.set("search",        params.search);
  if (params.status)        qs.set("status",        params.status);
  if (params.type)          qs.set("type",          params.type);
  if (params.bankAccountId) qs.set("bankAccountId", String(params.bankAccountId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<BankingListResponse<BankTransaction>>({
    queryKey: QK.transactions(params),
    queryFn:  () => api.get(`/banking/transactions?${qs}`),
    staleTime: 15_000,
  });
}

export function useCreateBankTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BankTransactionFormValues) =>
      api.post<ApiResponse<BankTransaction>>("/banking/transactions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
      qc.invalidateQueries({ queryKey: ["banking", "accounts"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateBankTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BankTransactionFormValues> }) =>
      api.put<ApiResponse<BankTransaction>>(`/banking/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
    },
  });
}

export function useDeleteBankTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/banking/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
      qc.invalidateQueries({ queryKey: ["banking", "accounts"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useImportBankStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bankAccountId: number; fileName: string; rows: Array<Record<string, string>> }) =>
      api.post<ApiResponse<{ batchId: number; imported: number; skipped: number }>>('/banking/statements/import', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['banking', 'accounts'] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useAutoMatchBankStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bankAccountId: number) => api.post<ApiResponse<{ scanned: number; matched: number; unmatched: number }>>('/banking/statements/auto-match', { bankAccountId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking', 'transactions'] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useBankReconciliationReport(bankAccountId?: number) {
  const query = bankAccountId ? `?bankAccountId=${bankAccountId}` : '';
  return useQuery<ApiResponse<ReconciliationReport>>({
    queryKey: ['banking', 'reports', 'reconciliation', bankAccountId ?? 'all'],
    queryFn: () => api.get(`/banking/reports/reconciliation${query}`),
    staleTime: 15_000,
  });
}

export function useChequeBooks() { return useQuery<ApiResponse<ChequeBook[]>>({ queryKey: ['banking', 'cheque-books'], queryFn: () => api.get('/banking/cheque-books') }); }
export function useCheques(params: { status?: string; direction?: string } = {}) {
  const query = new URLSearchParams(); if (params.status) query.set('status', params.status); if (params.direction) query.set('direction', params.direction);
  return useQuery<ApiResponse<Cheque[]>>({ queryKey: ['banking', 'cheques', params], queryFn: () => api.get(`/banking/cheques?${query}`) });
}
export function useCreateChequeBook() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: ChequeBookFormValues) => api.post<ApiResponse<ChequeBook>>('/banking/cheque-books', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['banking', 'cheque-books'] }) }); }
export function useCreateCheque() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: ChequeFormValues) => api.post<ApiResponse<Cheque>>('/banking/cheques', data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['banking', 'cheques'] }); qc.invalidateQueries({ queryKey: ['banking', 'cheque-books'] }); } }); }
export function useUpdateCheque() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Cheque> }) => api.put<ApiResponse<Cheque>>(`/banking/cheques/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['banking', 'cheques'] }) }); }
export function useChequeReport() { return useQuery<ApiResponse<Array<{ direction: ChequeDirection; status: ChequeStatus; count: number; amount: string }>>>({ queryKey: ['banking', 'cheques', 'report'], queryFn: () => api.get('/banking/cheques/report') }); }

// ── Reconciliations ───────────────────────────────────────────────────────────

export function useBankReconciliations(params: {
  status?: string; bankAccountId?: number; page?: number; limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (params.status)        qs.set("status",        params.status);
  if (params.bankAccountId) qs.set("bankAccountId", String(params.bankAccountId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<BankingListResponse<BankReconciliation>>({
    queryKey: QK.reconciliations(params),
    queryFn:  () => api.get(`/banking/reconciliations?${qs}`),
    staleTime: 15_000,
  });
}

export function useBankReconciliation(id: number | null) {
  return useQuery<ApiResponse<BankReconciliation>>({
    queryKey: QK.reconciliation(id!),
    queryFn:  () => api.get(`/banking/reconciliations/${id}`),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

export function useCreateBankReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BankReconciliationFormValues) =>
      api.post<ApiResponse<BankReconciliation>>("/banking/reconciliations", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "reconciliations"] });
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateBankReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BankReconciliationFormValues> }) =>
      api.put<ApiResponse<BankReconciliation>>(`/banking/reconciliations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "reconciliations"] });
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
    },
  });
}

export function useCompleteBankReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<BankReconciliation>>(`/banking/reconciliations/${id}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "reconciliations"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteBankReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/banking/reconciliations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "reconciliations"] });
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
