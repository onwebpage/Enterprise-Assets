import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationCategory =
  | "finance" | "inventory" | "hr" | "purchase" | "sales"
  | "manufacturing" | "workflow" | "documents" | "system" | "general";

export interface Notification {
  id: number;
  orgId: number | null;
  userId: number | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: number | null;
  actionUrl: string | null;
  read: boolean;
  readAt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byCategory: { category: string; count: number; unread: number }[];
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  total: number;
  page: number;
  pages: number;
}

export interface CreateNotificationPayload {
  title: string;
  body?: string | null;
  type?: NotificationType;
  category?: NotificationCategory;
  entityType?: string | null;
  entityId?: number | null;
  actionUrl?: string | null;
  userId?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  finance:       "Finance",
  inventory:     "Inventory",
  hr:            "HR & Payroll",
  purchase:      "Purchase",
  sales:         "Sales",
  manufacturing: "Manufacturing",
  workflow:      "Workflow",
  documents:     "Documents",
  system:        "System",
  general:       "General",
};

export const TYPE_COLORS: Record<NotificationType, string> = {
  info:    "bg-[#2563EB]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error:   "bg-rose-500",
};

// ── Query keys ────────────────────────────────────────────────────────────────

export const notifKeys = {
  all:     ["notifications"] as const,
  summary: () => [...notifKeys.all, "summary"] as const,
  list:    (params: object) => [...notifKeys.all, "list", params] as const,
};

// ── Summary ───────────────────────────────────────────────────────────────────

export function useNotificationSummary() {
  return useQuery({
    queryKey: notifKeys.summary(),
    queryFn: () =>
      api.get<ApiResponse<NotificationSummary>>("/notifications/summary").then((r) => r.data),
    refetchInterval: 30_000,
  });
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface NotificationListParams {
  page?:     number;
  limit?:    number;
  filter?:   "all" | "unread" | "archived";
  category?: string;
  search?:   string;
}

export function useNotifications(params: NotificationListParams = {}) {
  const qs = new URLSearchParams();
  if (params.page)                           qs.set("page",     String(params.page));
  if (params.limit)                          qs.set("limit",    String(params.limit));
  if (params.filter)                         qs.set("filter",   params.filter);
  if (params.category && params.category !== "all") qs.set("category", params.category);
  if (params.search)                         qs.set("search",   params.search);

  return useQuery({
    queryKey: notifKeys.list(params),
    queryFn: () =>
      api.get<NotificationListResponse>(`/notifications?${qs.toString()}`),
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNotificationPayload) =>
      api.post<ApiResponse<Notification>>("/notifications", payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}

// ── Mark read ─────────────────────────────────────────────────────────────────

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`, {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}

// ── Mark unread ───────────────────────────────────────────────────────────────

export function useMarkUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch<ApiResponse<Notification>>(`/notifications/${id}/unread`, {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}

// ── Mark all read ─────────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch<ApiResponse<{ message: string }>>("/notifications/read-all", {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}

// ── Archive ───────────────────────────────────────────────────────────────────

export function useArchiveNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch<ApiResponse<Notification>>(`/notifications/${id}/archive`, {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/notifications/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}
