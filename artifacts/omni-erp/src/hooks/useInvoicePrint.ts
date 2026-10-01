import { useQuery } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";
import type { ARCustomer, ARInvoice, ARListResponse, ARPayment } from "@/hooks/useAccountsReceivable";
import type { Organization } from "@/hooks/useSettings";
import type { InvoicePrintSource } from "@/lib/invoice-print/model";

/**
 * Everything a printed invoice needs, read fresh from the API: the invoice with
 * its lines, the organization (seller), the customer, and the payments recorded
 * against the invoice. The key sits under ["ar", "invoices"], so invoice and
 * payment mutations invalidate it along with the invoice list.
 */
export function invoicePrintSourceQuery(invoiceId: number) {
  return {
    queryKey: ["ar", "invoices", invoiceId, "print"] as const,
    queryFn: async (): Promise<InvoicePrintSource> => {
      const invoice = (await api.get<ApiResponse<ARInvoice>>(`/ar/invoices/${invoiceId}`)).data;
      const [organization, customer, payments] = await Promise.all([
        api.get<ApiResponse<Organization>>("/settings/org").then((r) => r.data),
        api.get<ApiResponse<ARCustomer>>(`/ar/customers/${invoice.customerId}`).then((r) => r.data),
        api.get<ARListResponse<ARPayment>>(`/ar/payments?invoiceId=${invoice.id}&limit=100`).then((r) => r.data),
      ]);
      return { invoice, organization, customer, payments };
    },
    staleTime: 0,
    retry: 1,
  };
}

export function useInvoicePrintSource(invoiceId: number | null) {
  return useQuery({
    ...invoicePrintSourceQuery(invoiceId ?? 0),
    enabled: invoiceId !== null,
  });
}
