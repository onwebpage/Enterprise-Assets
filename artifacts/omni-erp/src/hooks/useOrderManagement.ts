import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

export const SALES_ORDER_STATUSES = ["draft", "confirmed", "processing", "partially_delivered", "fulfilled", "back_ordered", "cancelled"] as const;
export const QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "expired", "converted"] as const;
export const DELIVERY_STATUSES = ["pending", "picked", "packed", "in_transit", "delivered", "failed"] as const;

export type SalesOrderStatus = typeof SALES_ORDER_STATUSES[number];
export type QuotationStatus = typeof QUOTATION_STATUSES[number];
export type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export interface OrderLineInput {
  itemCode?: string | null;
  description: string;
  unit?: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
}

export interface SalesOrder {
  id: number; orderNumber: string; quotationId: number | null; customerName: string; customerEmail: string | null;
  orderDate: string; requestedDelivery: string | null; shippingAddress: string | null; currency: string;
  subtotal: string; taxAmount: string; totalAmount: string; status: SalesOrderStatus; paymentStatus: string;
  notes: string | null; createdAt: string; updatedAt: string;
  fulfillment?: { ordered: string; delivered: string; percent: number };
  lines?: SalesOrderLine[];
}
export interface SalesOrderLine {
  id: number; salesOrderId: number; itemCode: string | null; description: string; unit: string;
  orderedQty: string; deliveredQty: string; unitPrice: string; totalAmount: string;
}
export interface Quotation {
  id: number; quoteNumber: string; customerName: string; customerEmail: string | null;
  quoteDate: string; expiryDate: string | null; totalAmount: string; status: QuotationStatus;
  convertedOrderId: number | null; notes: string | null;
}
export interface Delivery {
  id: number; deliveryNumber: string; salesOrderId: number; orderNumber: string; customerName: string;
  dispatchDate: string; estimatedDate: string | null; actualDate: string | null; carrier: string | null;
  trackingNumber: string | null; status: DeliveryStatus; notes: string | null;
}
export interface BackOrder {
  id: number; salesOrderId: number; orderNumber: string; customerName: string; requestedDelivery: string | null;
  orderStatus: string; itemCode: string | null; description: string; unit: string; orderedQty: string;
  deliveredQty: string; remainingQty: string;
}
export interface PurchaseOrder {
  id: number; poNumber: string; vendorName: string; orderDate: string; expectedDelivery: string | null;
  totalAmount: string; status: string;
}
export interface OrderSummary {
  salesOrders: number; openSalesOrders: number; salesValue: string; quotations: number; pendingQuotations: number;
  activeDeliveries: number; backOrders: number; purchaseOrders: number;
}

const keys = {
  all: ["order-management"],
  summary: ["order-management", "summary"],
  sales: ["order-management", "sales-orders"],
  quotes: ["order-management", "quotations"],
  deliveries: ["order-management", "deliveries"],
  backOrders: ["order-management", "back-orders"],
  purchases: ["order-management", "purchase-orders"],
};

export function useOrderSummary() {
  return useQuery<ApiResponse<OrderSummary>>({ queryKey: keys.summary, queryFn: () => api.get("/order-management/summary"), staleTime: 15_000 });
}
export function useSalesOrders() {
  return useQuery<{ success: boolean; data: SalesOrder[] }>({ queryKey: keys.sales, queryFn: () => api.get("/order-management/sales-orders"), staleTime: 10_000 });
}
export function useSalesOrder(id: number | null) {
  return useQuery<ApiResponse<SalesOrder>>({
    queryKey: [...keys.sales, id],
    queryFn: () => api.get(`/order-management/sales-orders/${id}`),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}
export function useQuotations() {
  return useQuery<{ success: boolean; data: Quotation[] }>({ queryKey: keys.quotes, queryFn: () => api.get("/order-management/quotations"), staleTime: 10_000 });
}
export function useDeliveries() {
  return useQuery<{ success: boolean; data: Delivery[] }>({ queryKey: keys.deliveries, queryFn: () => api.get("/order-management/deliveries"), staleTime: 10_000 });
}
export function useBackOrders() {
  return useQuery<{ success: boolean; data: BackOrder[] }>({ queryKey: keys.backOrders, queryFn: () => api.get("/order-management/back-orders"), staleTime: 10_000 });
}
export function useOrderPurchaseOrders() {
  return useQuery<{ success: boolean; data: PurchaseOrder[] }>({ queryKey: keys.purchases, queryFn: () => api.get("/order-management/purchase-orders"), staleTime: 15_000 });
}

function refresh(qc: ReturnType<typeof useQueryClient>) {
  [keys.all].forEach(queryKey => qc.invalidateQueries({ queryKey }));
}
export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post<ApiResponse<SalesOrder>>("/order-management/sales-orders", data), onSuccess: () => refresh(qc) });
}
export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post<ApiResponse<Quotation>>("/order-management/quotations", data), onSuccess: () => refresh(qc) });
}
export function useConvertQuotation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => api.post<ApiResponse<SalesOrder>>(`/order-management/quotations/${id}/convert`, {}), onSuccess: () => refresh(qc) });
}
export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post<ApiResponse<Delivery>>("/order-management/deliveries", data), onSuccess: () => refresh(qc) });
}
export function useUpdateDelivery() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => api.put<ApiResponse<Delivery>>(`/order-management/deliveries/${id}`, data), onSuccess: () => refresh(qc) });
}