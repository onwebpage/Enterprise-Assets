import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export const INV_WAREHOUSE_STATUSES = ["active", "inactive", "maintenance"] as const;
export type InvWarehouseStatus = (typeof INV_WAREHOUSE_STATUSES)[number];

export const INV_PRODUCT_STATUSES = ["active", "inactive", "discontinued"] as const;
export type InvProductStatus = (typeof INV_PRODUCT_STATUSES)[number];

export const INV_MOVEMENT_TYPES = ["receipt", "dispatch", "transfer", "adjustment"] as const;
export type InvMovementType = (typeof INV_MOVEMENT_TYPES)[number];

export const INV_TRANSFER_STATUSES = ["pending", "in_transit", "completed", "cancelled", "on_hold"] as const;
export type InvTransferStatus = (typeof INV_TRANSFER_STATUSES)[number];

export interface InvPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface InvSummary {
  totalSkus: number;
  warehouseCount: number;
  totalValue: string;
  lowStockCount: number;
  pendingTransfers: number;
}

export interface InvCategory {
  id: number;
  orgId: number | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvWarehouse {
  id: number;
  orgId: number | null;
  code: string;
  name: string;
  location: string | null;
  manager: string | null;
  capacity: number;
  status: InvWarehouseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  skuCount?: number;
  totalUnits?: string;
}

export interface InvProduct {
  id: number;
  orgId: number | null;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  reorderPoint: number;
  reorderQty: number;
  status: InvProductStatus;
  notes: string | null;
  totalOnHand?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvStockLevel {
  id: number;
  productId: number;
  warehouseId: number;
  qtyOnHand: string;
  qtyReserved: string;
  available: string;
  updatedAt: string;
  sku: string;
  productName: string;
  costPrice: string;
  reorderPoint: number;
  warehouseCode: string;
  warehouseName: string;
  stockValue: string;
  stockStatus: "ok" | "low" | "critical" | "oos";
}

export interface InvMovement {
  id: number;
  movementNumber: string;
  movementType: InvMovementType;
  qty: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  productId: number;
  warehouseId: number;
  sku: string;
  productName: string;
  warehouseCode: string;
}

export interface InvTransfer {
  id: number;
  transferNumber: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  fromWarehouseCode: string;
  toWarehouseCode: string;
  status: InvTransferStatus;
  transferDate: string;
  notes: string | null;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form value types
export interface InvWarehouseFormValues {
  code: string;
  name: string;
  location?: string | null;
  manager?: string | null;
  capacity?: number;
  status?: InvWarehouseStatus;
  notes?: string | null;
}

export interface InvProductFormValues {
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  unit?: string;
  costPrice?: string;
  sellingPrice?: string;
  reorderPoint?: number;
  reorderQty?: number;
  status?: InvProductStatus;
  notes?: string | null;
}

export interface InvMovementFormValues {
  productId: number;
  warehouseId: number;
  movementType: InvMovementType;
  qty: string;
  reference?: string | null;
  notes?: string | null;
}

export interface InvTransferFormValues {
  fromWarehouseId: number;
  toWarehouseId: number;
  transferDate: string;
  notes?: string | null;
  lines: { productId: number; qty: string }[];
}

// ── Query key factory ─────────────────────────────────────────────────────────

const QK = {
  perms:      ["inv", "my-permissions"],
  summary:    ["inv", "summary"],
  categories: ["inv", "categories"],
  warehouses: ["inv", "warehouses"],
  products:   (p?: object) => ["inv", "products", p ?? {}],
  stock:      (p?: object) => ["inv", "stock",    p ?? {}],
  movements:  (p?: object) => ["inv", "movements",p ?? {}],
  transfers:  (p?: object) => ["inv", "transfers",p ?? {}],
};

// ── Permissions ───────────────────────────────────────────────────────────────

export function useInvPermissions() {
  return useQuery<ApiResponse<InvPermissions>>({
    queryKey: QK.perms,
    queryFn:  () => api.get("/inventory/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useInvSummary() {
  return useQuery<ApiResponse<InvSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/inventory/summary"),
    staleTime: 30_000,
  });
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useInvCategories() {
  return useQuery<ApiResponse<InvCategory[]>>({
    queryKey: QK.categories,
    queryFn:  () => api.get("/inventory/categories"),
    staleTime: 60_000,
  });
}

export function useCreateInvCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      api.post<ApiResponse<InvCategory>>("/inventory/categories", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.categories }); },
  });
}

// ── Warehouses ────────────────────────────────────────────────────────────────

export function useInvWarehouses() {
  return useQuery<ApiResponse<InvWarehouse[]>>({
    queryKey: QK.warehouses,
    queryFn:  () => api.get("/inventory/warehouses"),
    staleTime: 30_000,
  });
}

export function useCreateInvWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvWarehouseFormValues) =>
      api.post<ApiResponse<InvWarehouse>>("/inventory/warehouses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.warehouses });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateInvWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InvWarehouseFormValues> }) =>
      api.put<ApiResponse<InvWarehouse>>(`/inventory/warehouses/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.warehouses }); },
  });
}

export function useDeleteInvWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/inventory/warehouses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.warehouses });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface InvProductsParams {
  search?: string;
  status?: string;
  categoryId?: number;
  page?: number;
  limit?: number;
}

export function useInvProducts(params: InvProductsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)     qs.set("search",     params.search);
  if (params.status)     qs.set("status",     params.status);
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<InvListResponse<InvProduct>>({
    queryKey: QK.products(params),
    queryFn:  () => api.get(`/inventory/products?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateInvProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvProductFormValues) =>
      api.post<ApiResponse<InvProduct>>("/inventory/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "products"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateInvProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InvProductFormValues> }) =>
      api.put<ApiResponse<InvProduct>>(`/inventory/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv", "products"] }); },
  });
}

export function useDeleteInvProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ id: number }>>(`/inventory/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "products"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Stock Levels ──────────────────────────────────────────────────────────────

export interface InvStockParams {
  search?: string;
  warehouseId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export function useInvStock(params: InvStockParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)      qs.set("search",      params.search);
  if (params.warehouseId) qs.set("warehouseId", String(params.warehouseId));
  if (params.status)      qs.set("status",      params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  return useQuery<InvListResponse<InvStockLevel>>({
    queryKey: QK.stock(params),
    queryFn:  () => api.get(`/inventory/stock?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

// ── Adjustments ───────────────────────────────────────────────────────────────

export function useCreateInvMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvMovementFormValues) =>
      api.post<ApiResponse<InvMovement>>("/inventory/stock/adjust", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "stock"] });
      qc.invalidateQueries({ queryKey: ["inv", "movements"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Movements ─────────────────────────────────────────────────────────────────

export interface InvMovementsParams {
  search?: string;
  movementType?: string;
  productId?: number;
  warehouseId?: number;
  page?: number;
  limit?: number;
}

export function useInvMovements(params: InvMovementsParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)       qs.set("search",       params.search);
  if (params.movementType) qs.set("movementType", params.movementType);
  if (params.productId)    qs.set("productId",    String(params.productId));
  if (params.warehouseId)  qs.set("warehouseId",  String(params.warehouseId));
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<InvListResponse<InvMovement>>({
    queryKey: QK.movements(params),
    queryFn:  () => api.get(`/inventory/movements?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export interface InvTransfersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useInvTransfers(params: InvTransfersParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));
  return useQuery<InvListResponse<InvTransfer>>({
    queryKey: QK.transfers(params),
    queryFn:  () => api.get(`/inventory/transfers?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateInvTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvTransferFormValues) =>
      api.post<ApiResponse<InvTransfer>>("/inventory/transfers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "transfers"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateInvTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: InvTransferStatus; notes?: string | null } }) =>
      api.put<ApiResponse<InvTransfer>>(`/inventory/transfers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "transfers"] });
      qc.invalidateQueries({ queryKey: ["inv", "stock"] });
      qc.invalidateQueries({ queryKey: ["inv", "movements"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
