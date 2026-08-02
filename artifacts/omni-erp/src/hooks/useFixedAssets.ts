import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const ASSET_STATUSES = ["active", "fully_depreciated", "disposed", "under_maintenance"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const DEPRECIATION_METHODS = ["straight_line", "declining_balance", "sum_of_years_digits"] as const;
export type DepreciationMethod = (typeof DEPRECIATION_METHODS)[number];

export const ASSET_CATEGORIES = ["land", "buildings", "machinery", "vehicles", "furniture", "computers", "other"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FixedAsset {
  id: number;
  orgId: number | null;
  assetNumber: string;
  name: string;
  category: AssetCategory;
  description: string | null;
  purchaseDate: string;
  purchaseCost: string;
  salvageValue: string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: string;
  currentBookValue: string;
  status: AssetStatus;
  location: string | null;
  serialNumber: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDepreciationEntry {
  id: number;
  assetId: number;
  assetName?: string | null;
  assetNumber?: string | null;
  orgId: number | null;
  periodDate: string;
  depreciationAmount: string;
  accumulatedDepreciation: string;
  bookValue: string;
  posted: boolean;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface AssetsSummary {
  totalCost: string;
  totalBookValue: string;
  totalAccumulated: string;
  activeCount: number;
  fullyDepreciatedCount: number;
  unpostedCount: number;
}

export interface AssetsPermissions {
  assets: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
  depreciation: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
}

// Form types
export interface FixedAssetFormValues {
  name: string;
  assetNumber?: string;
  category?: AssetCategory;
  description?: string | null;
  purchaseDate: string;
  purchaseCost: string;
  salvageValue?: string;
  usefulLifeMonths?: number;
  depreciationMethod?: DepreciationMethod;
  status?: AssetStatus;
  location?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
}

export interface AssetsListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const QK = {
  permissions:   ["assets", "permissions"] as const,
  summary:       ["assets", "summary"] as const,
  assets:        (p: object) => ["assets", "list", p] as const,
  entries:       (p: object) => ["assets", "depreciation", p] as const,
};

// ── Permissions & Summary ─────────────────────────────────────────────────────

export function useAssetsPermissions() {
  return useQuery<ApiResponse<AssetsPermissions>>({
    queryKey: QK.permissions,
    queryFn: () => api.get("/assets/my-permissions"),
    staleTime: 60_000,
  });
}

export function useAssetsSummary() {
  return useQuery<ApiResponse<AssetsSummary>>({
    queryKey: QK.summary,
    queryFn: () => api.get("/assets/summary"),
    staleTime: 30_000,
  });
}

// ── Fixed Assets ──────────────────────────────────────────────────────────────

export function useFixedAssets(params: {
  search?: string; status?: string; category?: string; page?: number; limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (params.search)   qs.set("search",   params.search);
  if (params.status)   qs.set("status",   params.status);
  if (params.category) qs.set("category", params.category);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<AssetsListResponse<FixedAsset>>({
    queryKey: QK.assets(params),
    queryFn:  () => api.get(`/assets?${qs}`),
    staleTime: 15_000,
  });
}

export function useCreateFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FixedAssetFormValues) =>
      api.post<ApiResponse<FixedAsset>>("/assets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FixedAssetFormValues> }) =>
      api.put<ApiResponse<FixedAsset>>(`/assets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Depreciation Entries ──────────────────────────────────────────────────────

export function useDepreciationEntries(params: {
  assetId?: number; posted?: boolean; period?: string; page?: number; limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (params.assetId !== undefined) qs.set("assetId", String(params.assetId));
  if (params.posted  !== undefined) qs.set("posted",  String(params.posted));
  if (params.period)                qs.set("period",  params.period);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  return useQuery<AssetsListResponse<AssetDepreciationEntry>>({
    queryKey: QK.entries(params),
    queryFn:  () => api.get(`/assets/depreciation/entries?${qs}`),
    staleTime: 15_000,
  });
}

export function useRunDepreciation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { assetId?: number; periodDate: string }) =>
      api.post<ApiResponse<{ created: AssetDepreciationEntry[]; skipped: { assetId: number; reason: string }[] }>>(
        "/assets/depreciation/run", data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", "depreciation"] });
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function usePostDepreciation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryIds: number[]) =>
      api.post<ApiResponse<{ posted: number }>>("/assets/depreciation/post", { entryIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", "depreciation"] });
      qc.invalidateQueries({ queryKey: ["assets", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteDepreciationEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/assets/depreciation/entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", "depreciation"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
