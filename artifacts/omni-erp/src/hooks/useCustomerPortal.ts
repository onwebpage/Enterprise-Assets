import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const CP_CUSTOMER_STATUSES = ["active", "inactive", "pending"] as const;
export type CpCustomerStatus = (typeof CP_CUSTOMER_STATUSES)[number];

export const CP_INVOICE_STATUSES = ["draft", "sent", "viewed", "paid", "overdue"] as const;
export type CpInvoiceStatus = (typeof CP_INVOICE_STATUSES)[number];

export const CP_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type CpTicketStatus = (typeof CP_TICKET_STATUSES)[number];

export const CP_TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type CpTicketPriority = (typeof CP_TICKET_PRIORITIES)[number];

export const CP_TICKET_CATEGORIES = ["billing", "technical", "general", "returns", "shipping", "other"] as const;
export type CpTicketCategory = (typeof CP_TICKET_CATEGORIES)[number];

export const CP_AVATAR_COLORS = ["blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "slate"] as const;
export type CpAvatarColor = (typeof CP_AVATAR_COLORS)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CpPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CpSummary {
  totalCustomers: number;
  activeCustomers: number;
  totalInvoices: number;
  outstanding: string;
  openTickets: number;
  resolvedTickets: number;
}

export interface CpCustomer {
  id: number;
  customerCode: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: CpCustomerStatus;
  avatarColor: CpAvatarColor;
  notes: string | null;
  lastLogin: string | null;
  portalEnabled: boolean;
  inviteSentAt: string | null;
  invoiceCount: number;
  ticketCount: number;
  openTickets: number;
  outstanding: string;
  createdAt: string;
  updatedAt: string;
}

export interface CpInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  amount: string;
  paidAmount: string;
  currency: string;
  status: CpInvoiceStatus;
  description: string | null;
  notes: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerCompany: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CpTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string | null;
  category: CpTicketCategory;
  priority: CpTicketPriority;
  status: CpTicketStatus;
  assignedTo: number | null;
  resolvedAt: string | null;
  closedAt: string | null;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerCompany: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CpTicketMessage {
  id: number;
  ticketId: number;
  senderType: "customer" | "staff";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface CpActivityEvent {
  type: "customer_joined" | "invoice_updated" | "ticket_updated" | "ticket_message";
  id: string;
  label: string;
  sub: string;
  status?: string;
  priority?: string;
  senderType?: string;
  amount?: string;
  at: string;
}

export interface InsertCpCustomer {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status?: CpCustomerStatus;
  avatarColor?: CpAvatarColor;
  notes?: string;
  portalEnabled?: boolean;
}

export interface InsertCpInvoice {
  customerId: number;
  invoiceDate: string;
  dueDate?: string;
  amount: string | number;
  paidAmount?: string | number;
  currency?: string;
  status?: CpInvoiceStatus;
  description?: string;
  notes?: string;
}

export interface InsertCpTicket {
  customerId: number;
  subject: string;
  description?: string;
  category?: CpTicketCategory;
  priority?: CpTicketPriority;
}

export interface UpdateCpTicket {
  subject?: string;
  category?: CpTicketCategory;
  priority?: CpTicketPriority;
  status?: CpTicketStatus;
  assignedTo?: number | null;
}

// ── Permissions ───────────────────────────────────────────────────────────────

export function useCpPermissions() {
  return useQuery<{ data: CpPermissions }>({
    queryKey: ["cp", "permissions"],
    queryFn: () => api.get("/customer-portal/my-permissions"),
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useCpSummary() {
  return useQuery<{ data: CpSummary }>({
    queryKey: ["cp", "summary"],
    queryFn: () => api.get("/customer-portal/summary"),
  });
}

// ── Activity ──────────────────────────────────────────────────────────────────

export function useCpActivity(limit = 20) {
  return useQuery<{ data: CpActivityEvent[] }>({
    queryKey: ["cp", "activity", limit],
    queryFn: () => api.get(`/customer-portal/activity?limit=${limit}`),
  });
}

// ── Customers ─────────────────────────────────────────────────────────────────

export function useCpCustomers(params?: { search?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status",  params.status);
  return useQuery<{ data: CpCustomer[] }>({
    queryKey: ["cp", "customers", params],
    queryFn: () => api.get(`/customer-portal/customers${qs.toString() ? "?" + qs : ""}`),
  });
}

export function useCpCustomer(id: number | null) {
  return useQuery<{ data: CpCustomer }>({
    queryKey: ["cp", "customers", id],
    queryFn: () => api.get(`/customer-portal/customers/${id}`),
    enabled: id !== null,
  });
}

export function useCreateCpCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertCpCustomer) => api.post("/customer-portal/customers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useUpdateCpCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCpCustomer> }) =>
      api.put(`/customer-portal/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useDeleteCpCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/customer-portal/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useInviteCpCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/customer-portal/customers/${id}/invite`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useToggleCpCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/customer-portal/customers/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function useCpInvoices(params?: { search?: string; status?: string; customerId?: number }) {
  const qs = new URLSearchParams();
  if (params?.search)     qs.set("search",     params.search);
  if (params?.status)     qs.set("status",     params.status);
  if (params?.customerId) qs.set("customerId", String(params.customerId));
  return useQuery<{ data: CpInvoice[] }>({
    queryKey: ["cp", "invoices", params],
    queryFn: () => api.get(`/customer-portal/invoices${qs.toString() ? "?" + qs : ""}`),
  });
}

export function useCreateCpInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertCpInvoice) => api.post("/customer-portal/invoices", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useUpdateCpInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCpInvoice> }) =>
      api.put(`/customer-portal/invoices/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useDeleteCpInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/customer-portal/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export function useCpTickets(params?: { search?: string; status?: string; priority?: string; customerId?: number }) {
  const qs = new URLSearchParams();
  if (params?.search)     qs.set("search",     params.search);
  if (params?.status)     qs.set("status",     params.status);
  if (params?.priority)   qs.set("priority",   params.priority);
  if (params?.customerId) qs.set("customerId", String(params.customerId));
  return useQuery<{ data: CpTicket[] }>({
    queryKey: ["cp", "tickets", params],
    queryFn: () => api.get(`/customer-portal/tickets${qs.toString() ? "?" + qs : ""}`),
  });
}

export function useCpTicketMessages(ticketId: number | null) {
  return useQuery<{ data: CpTicketMessage[] }>({
    queryKey: ["cp", "ticket-messages", ticketId],
    queryFn: () => api.get(`/customer-portal/tickets/${ticketId}/messages`),
    enabled: ticketId !== null,
  });
}

export function useCreateCpTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertCpTicket) => api.post("/customer-portal/tickets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useUpdateCpTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCpTicket }) =>
      api.put(`/customer-portal/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cp"] }),
  });
}

export function useAddCpTicketMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: number; data: { senderType?: string; senderName: string; message: string } }) =>
      api.post(`/customer-portal/tickets/${ticketId}/messages`, data),
    onSuccess: (_r, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ["cp", "ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["cp", "tickets"] });
      qc.invalidateQueries({ queryKey: ["cp", "activity"] });
    },
  });
}
