import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const VP_VENDOR_STATUSES = ["active", "inactive", "pending", "preferred", "blocked"] as const;
export type VpVendorStatus = (typeof VP_VENDOR_STATUSES)[number];

export const VP_BILL_STATUSES = ["draft", "pending", "approved", "paid", "overdue"] as const;
export type VpBillStatus = (typeof VP_BILL_STATUSES)[number];

export const VP_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type VpTicketStatus = (typeof VP_TICKET_STATUSES)[number];

export const VP_TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type VpTicketPriority = (typeof VP_TICKET_PRIORITIES)[number];

export const VP_TICKET_CATEGORIES = [
  "billing", "delivery", "quality", "returns", "compliance", "general", "other",
] as const;
export type VpTicketCategory = (typeof VP_TICKET_CATEGORIES)[number];

export const VP_AVATAR_COLORS = ["blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "slate"] as const;
export type VpAvatarColor = (typeof VP_AVATAR_COLORS)[number];

export const VP_VENDOR_CATEGORIES = [
  "Electronics", "Raw Materials", "Machinery", "Logistics", "Software",
  "Services", "Office Supplies", "Chemicals", "Packaging", "Other",
];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface VpPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface VpSummary {
  totalVendors: number;
  activeVendors: number;
  preferredVendors: number;
  totalBills: number;
  outstanding: string;
  openTickets: number;
  resolvedTickets: number;
  avgOnTimePct: string;
}

export interface VpVendor {
  id: number;
  vendorCode: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  category: string | null;
  status: VpVendorStatus;
  avatarColor: VpAvatarColor;
  rating: string | null;
  onTimePct: string | null;
  notes: string | null;
  portalEnabled: boolean;
  inviteSentAt: string | null;
  billCount: number;
  ticketCount: number;
  openTickets: number;
  outstanding: string;
  totalSpend: string;
  createdAt: string;
  updatedAt: string;
}

export interface VpBill {
  id: number;
  billNumber: string;
  billDate: string;
  dueDate: string | null;
  amount: string;
  paidAmount: string;
  currency: string;
  status: VpBillStatus;
  poReference: string | null;
  description: string | null;
  notes: string | null;
  paidAt: string | null;
  vendorId: number;
  vendorName: string;
  vendorEmail: string;
  vendorCompany: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VpTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string | null;
  category: VpTicketCategory;
  priority: VpTicketPriority;
  status: VpTicketStatus;
  assignedTo: number | null;
  resolvedAt: string | null;
  closedAt: string | null;
  vendorId: number;
  vendorName: string;
  vendorEmail: string;
  vendorCompany: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VpTicketMessage {
  id: number;
  ticketId: number;
  senderType: "vendor" | "staff";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface VpActivity {
  type: "vendor_joined" | "bill_updated" | "ticket_updated" | "ticket_message";
  id: string;
  label: string;
  sub: string;
  status?: string;
  priority?: string;
  amount?: string;
  senderType?: string;
  at: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

const BASE = "vendor-portal";

export function useVpPermissions() {
  return useQuery<VpPermissions>({
    queryKey: [BASE, "permissions"],
    queryFn: async () => {
      const r = await api.get<ApiResponse<VpPermissions>>(`/${BASE}/my-permissions`);
      return r.data;
    },
  });
}

export function useVpSummary() {
  return useQuery<VpSummary>({
    queryKey: [BASE, "summary"],
    queryFn: async () => {
      const r = await api.get<ApiResponse<VpSummary>>(`/${BASE}/summary`);
      return r.data;
    },
  });
}

export function useVpActivity(limit = 20) {
  return useQuery<VpActivity[]>({
    queryKey: [BASE, "activity", limit],
    queryFn: async () => {
      const r = await api.get<ApiResponse<VpActivity[]>>(`/${BASE}/activity?limit=${limit}`);
      return r.data;
    },
  });
}

// Vendors
export function useVpVendors(search?: string, status?: string) {
  return useQuery<VpVendor[]>({
    queryKey: [BASE, "vendors", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const qs = params.toString();
      const r = await api.get<ApiResponse<VpVendor[]>>(`/${BASE}/vendors${qs ? `?${qs}` : ""}`);
      return r.data;
    },
  });
}

export function useCreateVpVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/${BASE}/vendors`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useUpdateVpVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.put(`/${BASE}/vendors/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useDeleteVpVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/${BASE}/vendors/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useInviteVpVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/${BASE}/vendors/${id}/invite`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useToggleVpVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/${BASE}/vendors/${id}/toggle`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

// Bills
export function useVpBills(search?: string, status?: string, vendorId?: number) {
  return useQuery<VpBill[]>({
    queryKey: [BASE, "bills", search, status, vendorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (vendorId !== undefined) params.set("vendorId", String(vendorId));
      const qs = params.toString();
      const r = await api.get<ApiResponse<VpBill[]>>(`/${BASE}/bills${qs ? `?${qs}` : ""}`);
      return r.data;
    },
  });
}

export function useCreateVpBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/${BASE}/bills`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useUpdateVpBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.put(`/${BASE}/bills/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useDeleteVpBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/${BASE}/bills/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

// Tickets
export function useVpTickets(search?: string, status?: string, priority?: string, vendorId?: number) {
  return useQuery<VpTicket[]>({
    queryKey: [BASE, "tickets", search, status, priority, vendorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (vendorId !== undefined) params.set("vendorId", String(vendorId));
      const qs = params.toString();
      const r = await api.get<ApiResponse<VpTicket[]>>(`/${BASE}/tickets${qs ? `?${qs}` : ""}`);
      return r.data;
    },
  });
}

export function useCreateVpTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/${BASE}/tickets`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useUpdateVpTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.put(`/${BASE}/tickets/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [BASE] }); },
  });
}

export function useVpTicketMessages(ticketId: number | null) {
  return useQuery<VpTicketMessage[]>({
    queryKey: [BASE, "ticket-messages", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const r = await api.get<ApiResponse<VpTicketMessage[]>>(`/${BASE}/tickets/${ticketId}/messages`);
      return r.data;
    },
  });
}

export function useAddVpTicketMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: number; data: Record<string, unknown> }) =>
      api.post(`/${BASE}/tickets/${ticketId}/messages`, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: [BASE, "ticket-messages", vars.ticketId] });
      qc.invalidateQueries({ queryKey: [BASE, "tickets"] });
      qc.invalidateQueries({ queryKey: [BASE, "activity"] });
    },
  });
}
