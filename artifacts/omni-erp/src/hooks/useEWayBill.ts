import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const EWAY_BILL_STATUSES = ["draft", "generated", "cancelled", "expired"] as const;
export type EWayBillStatus = (typeof EWAY_BILL_STATUSES)[number];

export const SUPPLY_TYPES = ["outward", "inward"] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];

export const SUPPLY_SUB_TYPES = [
  "supply", "export", "job_work", "sez_supplies", "deemed_export",
  "import", "job_work_returns", "sales_return", "others",
] as const;
export type SupplySubType = (typeof SUPPLY_SUB_TYPES)[number];

export const DOC_TYPES = [
  "tax_invoice", "bill_of_supply", "credit_note", "debit_note",
  "bill_of_entry", "delivery_challan", "others",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const TRANSPORT_MODES = ["road", "rail", "air", "ship"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const VEHICLE_TYPES = ["regular", "over_dimensional_cargo"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ── Label maps ────────────────────────────────────────────────────────────────

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  outward: "Outward",
  inward:  "Inward",
};

export const SUPPLY_SUB_TYPE_LABELS: Record<SupplySubType, string> = {
  supply:            "Supply",
  export:            "Export",
  job_work:          "Job Work",
  sez_supplies:      "SEZ Supplies",
  deemed_export:     "Deemed Export",
  import:            "Import",
  job_work_returns:  "Job Work Returns",
  sales_return:      "Sales Return",
  others:            "Others",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  tax_invoice:      "Tax Invoice",
  bill_of_supply:   "Bill of Supply",
  credit_note:      "Credit Note",
  debit_note:       "Debit Note",
  bill_of_entry:    "Bill of Entry",
  delivery_challan: "Delivery Challan",
  others:           "Others",
};

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  road:  "Road",
  rail:  "Rail",
  air:   "Air",
  ship:  "Ship",
};

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface EWayBill {
  id: number;
  orgId: number | null;
  ewbNumber: string | null;
  status: EWayBillStatus;

  supplyType: SupplyType;
  supplySubType: SupplySubType;
  docType: DocType;
  docNumber: string;
  docDate: string;

  fromGstin: string | null;
  fromTradeName: string;
  fromAddress1: string | null;
  fromAddress2: string | null;
  fromPlace: string | null;
  fromPincode: string | null;
  fromState: string | null;

  toGstin: string | null;
  toTradeName: string;
  toAddress1: string | null;
  toAddress2: string | null;
  toPlace: string | null;
  toPincode: string | null;
  toState: string | null;
  placeOfDelivery: string | null;

  productName: string;
  productDesc: string | null;
  hsnCode: string | null;
  quantity: string;
  unit: string | null;

  totalValue: string;
  taxableValue: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cessRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  totalTaxAmount: string;

  transportMode: TransportMode;
  transporterId: string | null;
  transporterName: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  distance: number | null;

  validFrom: string | null;
  validUpto: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EWayBillSummary {
  total: number;
  generated: number;
  draft: number;
  cancelled: number;
  expired: number;
  totalValue: string;
  totalTax: string;
  expiringSoon: number;
}

export interface EWayBillPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface EWayBillFormValues {
  supplyType?: SupplyType;
  supplySubType?: SupplySubType;
  docType?: DocType;
  docNumber: string;
  docDate: string;

  fromGstin?: string | null;
  fromTradeName: string;
  fromAddress1?: string | null;
  fromAddress2?: string | null;
  fromPlace?: string | null;
  fromPincode?: string | null;
  fromState?: string | null;

  toGstin?: string | null;
  toTradeName: string;
  toAddress1?: string | null;
  toAddress2?: string | null;
  toPlace?: string | null;
  toPincode?: string | null;
  toState?: string | null;
  placeOfDelivery?: string | null;

  productName: string;
  productDesc?: string | null;
  hsnCode?: string | null;
  quantity?: string;
  unit?: string | null;

  totalValue: string;
  taxableValue: string;
  cgstRate?: string;
  sgstRate?: string;
  igstRate?: string;
  cessRate?: string;

  transportMode?: TransportMode;
  transporterId?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  vehicleType?: VehicleType;
  distance?: number | null;
  notes?: string | null;
}

export interface EWayBillListResponse {
  success: boolean;
  data: EWayBill[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query key helpers ─────────────────────────────────────────────────────────

const QK = {
  perms:   ["eway-bill", "my-permissions"],
  summary: ["eway-bill", "summary"],
  list:    (p?: object) => ["eway-bill", "list", p ?? {}],
  byId:    (id: number) => ["eway-bill", id],
};

// ── Permissions ───────────────────────────────────────────────────────────────

export function useEWayBillPermissions() {
  return useQuery<ApiResponse<EWayBillPermissions>>({
    queryKey: QK.perms,
    queryFn:  () => api.get("/eway-bill/my-permissions"),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useEWayBillSummary() {
  return useQuery<ApiResponse<EWayBillSummary>>({
    queryKey: QK.summary,
    queryFn:  () => api.get("/eway-bill/summary"),
    staleTime: 30_000,
  });
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface EWayBillListParams {
  search?: string;
  status?: string;
  supplyType?: string;
  transportMode?: string;
  page?: number;
  limit?: number;
}

export function useEWayBills(params: EWayBillListParams = {}) {
  const qs = new URLSearchParams();
  if (params.search)        qs.set("search",        params.search);
  if (params.status)        qs.set("status",        params.status);
  if (params.supplyType)    qs.set("supplyType",    params.supplyType);
  if (params.transportMode) qs.set("transportMode", params.transportMode);
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 25));

  return useQuery<EWayBillListResponse>({
    queryKey: QK.list(params),
    queryFn:  () => api.get(`/eway-bill?${qs}`),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useEWayBill(id: number | null) {
  return useQuery<ApiResponse<EWayBill>>({
    queryKey: QK.byId(id!),
    queryFn:  () => api.get(`/eway-bill/${id}`),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EWayBillFormValues) =>
      api.post<ApiResponse<EWayBill>>("/eway-bill", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eway-bill", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useUpdateEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EWayBillFormValues> }) =>
      api.put<ApiResponse<EWayBill>>(`/eway-bill/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["eway-bill", "list"] });
      qc.invalidateQueries({ queryKey: QK.byId(vars.id) });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useGenerateEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<EWayBill>>(`/eway-bill/${id}/generate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eway-bill", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useCancelEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancelReason }: { id: number; cancelReason: string }) =>
      api.post<ApiResponse<EWayBill>>(`/eway-bill/${id}/cancel`, { cancelReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eway-bill", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useExtendEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehicleNumber, vehicleType, reason }: { id: number; vehicleNumber?: string; vehicleType?: string; reason?: string }) =>
      api.post<ApiResponse<EWayBill>>(`/eway-bill/${id}/extend`, { vehicleNumber, vehicleType, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eway-bill", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useDeleteEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ id: number }>>(`/eway-bill/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eway-bill", "list"] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}
