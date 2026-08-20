import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

export type WmsBin = { id:number; warehouse_id:number; warehouse_code:string; warehouse_name:string; code:string; name:string; zone:string|null; bin_type:string; capacity:string; barcode:string|null; is_active:boolean; lot_units:string; lot_count:number };
export type WmsProduct = { id:number; sku:string; name:string; unit:string };
export type WmsSummary = { activeBins:number; activeLots:number; lotUnits:string; availableSerials:number; openReceipts:number; openCounts:number; expiringLots:number };
export type WmsReceipt = { id:number; receipt_number:string; warehouse_id:number; warehouse_code:string; supplier_name:string|null; receipt_date:string; status:string; line_count:number; accepted_units:string; created_at:string };
export type WmsLot = { id:number; product_id:number; sku:string; product_name:string; warehouse_code:string; bin_code:string|null; lot_number:string; expiry_date:string|null; qty_on_hand:string; status:string };
export type WmsSerial = { id:number; serial_number:string; sku:string; product_name:string; warehouse_code:string; bin_code:string|null; status:string };
export type WmsCount = { id:number; count_number:string; warehouse_id:number; warehouse_code:string; bin_code:string|null; status:string; scheduled_date:string; line_count:number; open_lines:number; variance_units:string };
export type WmsCountDetail = WmsCount & { lines: Array<{ id:number; product_id:number; sku:string; product_name:string; expected_qty:string; counted_qty:string|null; variance_qty:string|null; bin_code:string|null; notes:string|null }> };

const keys = {
  summary: ["wms","summary"],
  bins: ["wms","bins"],
  barcodes: ["wms","barcodes"],
  lots: ["wms","lots"],
  serials: ["wms","serials"],
  receipts: ["wms","receipts"],
  counts: ["wms","counts"],
};
const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  Object.values(keys).forEach(queryKey => qc.invalidateQueries({ queryKey }));
};

export function useWmsSummary() { return useQuery<ApiResponse<WmsSummary>>({ queryKey:keys.summary, queryFn:()=>api.get("/wms/summary"), staleTime:15000 }); }
export function useWmsBins(search="") { return useQuery<ApiResponse<WmsBin[]>>({ queryKey:[...keys.bins,search], queryFn:()=>api.get(`/wms/bins?search=${encodeURIComponent(search)}`), staleTime:15000 }); }
export function useWmsBarcodes(search="") { return useQuery<ApiResponse<any[]>>({ queryKey:[...keys.barcodes,search], queryFn:()=>api.get(`/wms/barcodes?search=${encodeURIComponent(search)}`), staleTime:15000 }); }
export function useWmsLots(search="") { return useQuery<ApiResponse<WmsLot[]>>({ queryKey:[...keys.lots,search], queryFn:()=>api.get(`/wms/lots?search=${encodeURIComponent(search)}`), staleTime:15000 }); }
export function useWmsSerials(search="") { return useQuery<ApiResponse<WmsSerial[]>>({ queryKey:[...keys.serials,search], queryFn:()=>api.get(`/wms/serials?search=${encodeURIComponent(search)}`), staleTime:15000 }); }
export function useWmsReceipts() { return useQuery<ApiResponse<WmsReceipt[]>>({ queryKey:keys.receipts, queryFn:()=>api.get("/wms/receipts"), staleTime:15000 }); }
export function useWmsCounts() { return useQuery<ApiResponse<WmsCount[]>>({ queryKey:keys.counts, queryFn:()=>api.get("/wms/cycle-counts"), staleTime:15000 }); }
export function useWmsCount(id:number|null) { return useQuery<ApiResponse<WmsCountDetail>>({ queryKey:[...keys.counts,id], queryFn:()=>api.get(`/wms/cycle-counts/${id}`), enabled:!!id }); }

function mutation<T>(fn:(data:T)=>Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn:fn, onSuccess:()=>invalidate(qc) });
}
export function useCreateWmsBin() { return mutation((data:any)=>api.post("/wms/bins",data)); }
export function useUpdateWmsBin() { return mutation(({id,data}:{id:number;data:any})=>api.put(`/wms/bins/${id}`,data)); }
export function useDeleteWmsBin() { return mutation((id:number)=>api.delete(`/wms/bins/${id}`)); }
export function useCreateWmsBarcode() { return mutation((data:any)=>api.post("/wms/barcodes",data)); }
export function useDeleteWmsBarcode() { return mutation((id:number)=>api.delete(`/wms/barcodes/${id}`)); }
export function useCreateWmsReceipt() { return mutation((data:any)=>api.post("/wms/receipts",data)); }
export function usePutawayWmsReceipt() { return mutation((id:number)=>api.put(`/wms/receipts/${id}/putaway`,{})); }
export function useCreateWmsCount() { return mutation((data:any)=>api.post("/wms/cycle-counts",data)); }
export function useUpdateWmsCountLine() { return mutation(({countId,lineId,data}:{countId:number;lineId:number;data:any})=>api.put(`/wms/cycle-counts/${countId}/lines/${lineId}`,data)); }
export function useCompleteWmsCount() { return mutation((id:number)=>api.put(`/wms/cycle-counts/${id}/complete`,{})); }
export function useBinTransfer() { return mutation((data:any)=>api.post("/wms/bin-transfers",data)); }
export function useScanWmsCode() { return useMutation({ mutationFn:(code:string)=>api.get<ApiResponse<any>>(`/wms/scan?code=${encodeURIComponent(code)}`) }); }