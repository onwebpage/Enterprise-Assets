import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roleId: number | null;
  orgId: number | null;
  roleName: string | null;
}

export interface Organization {
  id: number;
  name: string;
  legalName: string | null;
  taxId: string | null;
  industry: string | null;
  foundedYear: number | null;
  employeeCount: number | null;
  currency: string | null;
  fiscalYearStart: string | null;
  country: string | null;
  gstin: string | null;
  logoUrl: string | null;
  status: string;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: number;
  userId: number;
  notifEmail: boolean;
  notifPush: boolean;
  notifInvoices: boolean;
  notifPayroll: boolean;
  notifAlerts: boolean;
  notifReports: boolean;
  sessionTimeout: boolean;
  ipWhitelist: boolean;
  auditLog: boolean;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  updatedAt: string;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: ["settings", "profile"],
    queryFn: () => api.get<ApiResponse<UserProfile>>("/settings/profile").then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, "firstName" | "lastName" | "phone">>) =>
      api.put<ApiResponse<UserProfile>>("/settings/profile", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "profile"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post<ApiResponse<{ message: string }>>("/settings/change-password", data).then((r) => r.data),
  });
}

export function useToggleMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      api.patch<ApiResponse<UserProfile>>("/settings/mfa", { enabled }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "profile"] });
    },
  });
}

// ── Organization ──────────────────────────────────────────────────────────────

export function useOrgSettings() {
  return useQuery({
    queryKey: ["settings", "org"],
    queryFn: () => api.get<ApiResponse<Organization>>("/settings/org").then((r) => r.data),
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Organization>) =>
      api.put<ApiResponse<Organization>>("/settings/org", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "org"] });
    },
  });
}

// ── Preferences ───────────────────────────────────────────────────────────────

export function usePreferences() {
  return useQuery({
    queryKey: ["settings", "preferences"],
    queryFn: () =>
      api.get<ApiResponse<UserPreferences>>("/settings/preferences").then((r) => r.data),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      api.put<ApiResponse<UserPreferences>>("/settings/preferences", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "preferences"] });
    },
  });
}
