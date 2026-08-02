import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  usePurchaseOrders, usePurchaseVendors, useCreatePurchaseOrder, useUpdatePurchaseOrder,
  useDeletePurchaseOrder, usePurchasePermissions, usePurchaseOrder, useCreateGRN,
  type PurchaseOrder, type PurchaseOrderFormValues, type PurchaseOrderStatus, type GRNFormValues,
} from '@/hooks/usePurchase';
import PurchaseOrderFormModal from './PurchaseOrderFormModal';
import PurchaseGRNFormModal from './PurchaseGRNFormModal';
import PurchaseDeleteDialog from './PurchaseDeleteDialog';

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft:     'bg-white/[0.06] text-white/40 border-white/[0.1]',
  sent:      'bg-blue-500/12 text-blue-400 border-blue-500/25',
  confirmed: 'bg-violet-500/12 text-violet-400 border-violet-500/25',
  partial:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
  received:  'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  cancelled: 'bg-red-500/12 text-red-400 border-red-500/25',
};

const PAGE_LIMIT = 25;

function fmtINR(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 10_00_000) return `₹${(n/10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${(n/1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return <>{Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="border-b border-white/[0.04]">
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} className="px-4 py-3"><div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '60%' : '70%' }} /></td>
      ))}
    </tr>
  ))}</>;
}

export default function OrdersTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editOrder, setEditOrder]     = useState<PurchaseOrder | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);
  const [grnOrder, setGrnOrder]       = useState<PurchaseOrder | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
  const [formError, setFormError]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [grnError, setGrnError]       = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = usePurchaseOrders({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: vendorsRes } = usePurchaseVendors({ limit: 200 });
  const { data: orderDetail } = usePurchaseOrder(selectedOrderId);
  const { data: permsRes }   = usePurchasePermissions();
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const deleteMut = useDeletePurchaseOrder();
  const grnMut    = useCreateGRN();

  const orders     = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const vendors    = vendorsRes?.data ?? [];
  const perms      = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: PurchaseOrderFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create order'); }
  }
  async function handleUpdate(values: PurchaseOrderFormValues) {
    if (!editOrder) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editOrder.id, data: values }); setEditOrder(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update order'); }
  }
  async function handleDelete() {
    if (!deleteOrder) return;
    setDeleteError(null);
    try { await deleteMut.mutateAsync(deleteOrder.id); setDeleteOrder(null); }
    catch (e: any) { setDeleteError(e?.message ?? 'Failed to delete order'); }
  }
  async function handleGRN(values: GRNFormValues) {
    setGrnError(null);
    try { await grnMut.mutateAsync(values); setGrnOrder(null); }
    catch (e: any) { setGrnError(e?.message ?? 'Failed to create GRN'); }
  }

  function openGRN(order: PurchaseOrder) {
    setGrnOrder(null);
    setGrnError(null);
    setSelectedOrderId(order.id);
    // wait for detail to load
    setTimeout(() => setGrnOrder(order), 50);
  }

  // Use detail (with lines) if available
  const grnOrderWithLines = grnOrder
    ? (orderDetail?.data?.id === grnOrder.id ? orderDetail.data : grnOrder)
    : null;

  const STATUSES: PurchaseOrderStatus[] = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search PO number, vendor…"
              className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(['', ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                  statusFilter === s ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/60')}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => refetch()}
              className={cn('p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/60 transition-colors', isFetching && 'animate-spin')}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New PO
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['PO Number', 'Vendor', 'Order Date', 'Delivery', 'Total', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <p className="text-white/25 text-sm">No purchase orders found</p>
                  {perms.canCreate && (
                    <button onClick={() => setCreateOpen(true)} className="mt-2 text-xs text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2">Create first PO</button>
                  )}
                </td></tr>
              ) : orders.map((o) => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] group transition-colors">
                  <td className="px-4 py-3 text-[#60a5fa] font-mono text-sm font-semibold">{o.poNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-white/80 font-medium truncate max-w-[160px]">{o.vendorName}</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{o.orderDate}</td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{o.expectedDelivery || '—'}</td>
                  <td className="px-4 py-3 text-white/80 tabular-nums font-semibold text-right">{fmtINR(o.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', STATUS_COLORS[o.status as PurchaseOrderStatus])}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canCreate && !['received','cancelled'].includes(o.status) && (
                        <button onClick={() => openGRN(o)}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors" title="Receive Goods">
                          <PackageCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canEdit && !['received','cancelled'].includes(o.status) && (
                        <button onClick={() => { setFormError(null); setEditOrder(o); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      )}
                      {perms.canDelete && o.status !== 'received' && (
                        <button onClick={() => { setDeleteError(null); setDeleteOrder(o); }}
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {isLoading ? 'Loading…' : total === 0 ? 'No orders' : `${(page-1)*PAGE_LIMIT+1}–${Math.min(page*PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i+1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded text-xs transition-colors', p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>{p}</button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">Next →</Button>
          </div>
        </div>
      </div>

      <PurchaseOrderFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        isSubmitting={createMut.isPending} vendors={vendors} error={formError} />
      <PurchaseOrderFormModal open={!!editOrder} onClose={() => setEditOrder(null)} onSubmit={handleUpdate}
        isSubmitting={updateMut.isPending} order={editOrder} vendors={vendors} error={formError} />
      <PurchaseGRNFormModal open={!!grnOrder} onClose={() => setGrnOrder(null)} onSubmit={handleGRN}
        isSubmitting={grnMut.isPending} order={grnOrderWithLines} error={grnError} />
      <PurchaseDeleteDialog open={!!deleteOrder} onClose={() => setDeleteOrder(null)} onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
        title="Delete Purchase Order"
        description={`Delete PO "${deleteOrder?.poNumber}"? This cannot be undone. Received orders cannot be deleted.`}
        error={deleteError} />
    </>
  );
}
