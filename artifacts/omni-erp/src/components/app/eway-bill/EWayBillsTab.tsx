import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, RefreshCw, Zap, XCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useEWayBills, useCreateEWayBill, useUpdateEWayBill, useGenerateEWayBill,
  useCancelEWayBill, useExtendEWayBill, useDeleteEWayBill, useEWayBillPermissions,
  type EWayBill, type EWayBillFormValues, type EWayBillStatus,
  SUPPLY_TYPE_LABELS, DOC_TYPE_LABELS, TRANSPORT_MODE_LABELS,
} from '@/hooks/useEWayBill';
import EWayBillFormModal from './EWayBillFormModal';
import { DeleteDialog, CancelDialog, ExtendDialog } from './EWayBillActionDialogs';

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<EWayBillStatus, string> = {
  draft:     'bg-white/[0.06] text-white/40 border-white/[0.08]',
  generated: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  cancelled: 'bg-red-500/12 text-red-400 border-red-500/25',
  expired:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
};

const STATUS_LABELS: Record<EWayBillStatus, string> = {
  draft: 'Draft', generated: 'Generated', cancelled: 'Cancelled', expired: 'Expired',
};

function StatusBadge({ status }: { status: EWayBillStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function fmtMoney(v: string) {
  const n = parseFloat(v ?? '0');
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '50%' : '70%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const PAGE_LIMIT = 25;

// ── Detail sheet ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-white/35 shrink-0 w-36">{label}</span>
      <span className="text-xs text-white/80 text-right">{value}</span>
    </div>
  );
}

function BillDetailSheet({ bill, onClose }: { bill: EWayBill; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="relative bg-[#0a0f1e] border-l border-white/[0.07] w-full max-w-sm h-full overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] sticky top-0 bg-[#0a0f1e] z-10">
          <div>
            <h3 className="text-sm font-semibold text-white">EWB {bill.ewbNumber ?? '—'}</h3>
            <StatusBadge status={bill.status as EWayBillStatus} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40">
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Supply</p>
            <DetailRow label="Supply Type"  value={SUPPLY_TYPE_LABELS[bill.supplyType]} />
            <DetailRow label="Doc Type"     value={DOC_TYPE_LABELS[bill.docType]} />
            <DetailRow label="Doc Number"   value={bill.docNumber} />
            <DetailRow label="Doc Date"     value={bill.docDate} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">From</p>
            <DetailRow label="Trade Name"   value={bill.fromTradeName} />
            <DetailRow label="GSTIN"        value={bill.fromGstin} />
            <DetailRow label="Address"      value={[bill.fromAddress1, bill.fromAddress2, bill.fromPlace, bill.fromState].filter(Boolean).join(', ')} />
            <DetailRow label="Pincode"      value={bill.fromPincode} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">To</p>
            <DetailRow label="Trade Name"   value={bill.toTradeName} />
            <DetailRow label="GSTIN"        value={bill.toGstin} />
            <DetailRow label="Address"      value={[bill.toAddress1, bill.toAddress2, bill.toPlace, bill.toState].filter(Boolean).join(', ')} />
            <DetailRow label="Pincode"      value={bill.toPincode} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Goods</p>
            <DetailRow label="Product"      value={bill.productName} />
            <DetailRow label="HSN"          value={bill.hsnCode} />
            <DetailRow label="Qty / Unit"   value={bill.unit ? `${bill.quantity} ${bill.unit}` : bill.quantity} />
            <DetailRow label="Total Value"  value={fmtMoney(bill.totalValue)} />
            <DetailRow label="Taxable Value" value={fmtMoney(bill.taxableValue)} />
            <DetailRow label="CGST"         value={bill.cgstAmount !== '0.00' ? `${bill.cgstRate}% = ${fmtMoney(bill.cgstAmount)}` : undefined} />
            <DetailRow label="SGST"         value={bill.sgstAmount !== '0.00' ? `${bill.sgstRate}% = ${fmtMoney(bill.sgstAmount)}` : undefined} />
            <DetailRow label="IGST"         value={bill.igstAmount !== '0.00' ? `${bill.igstRate}% = ${fmtMoney(bill.igstAmount)}` : undefined} />
            <DetailRow label="Cess"         value={bill.cessAmount !== '0.00' ? `${bill.cessRate}% = ${fmtMoney(bill.cessAmount)}` : undefined} />
            <DetailRow label="Total Tax"    value={fmtMoney(bill.totalTaxAmount)} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Transport</p>
            <DetailRow label="Mode"         value={TRANSPORT_MODE_LABELS[bill.transportMode]} />
            <DetailRow label="Vehicle"      value={bill.vehicleNumber} />
            <DetailRow label="Distance"     value={bill.distance ? `${bill.distance} km` : undefined} />
            <DetailRow label="Transporter"  value={bill.transporterName} />
          </div>
          {(bill.validFrom || bill.validUpto) && (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Validity</p>
              <DetailRow label="Valid From"   value={bill.validFrom} />
              <DetailRow label="Valid Upto"   value={bill.validUpto} />
            </div>
          )}
          {bill.cancelReason && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-[11px] text-red-400/80"><strong>Cancel reason:</strong> {bill.cancelReason}</p>
            </div>
          )}
          {bill.notes && (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-xs text-white/50">{bill.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────

export default function EWayBillsTab() {
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [page,          setPage]          = useState(1);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editBill,      setEditBill]      = useState<EWayBill | null>(null);
  const [viewBill,      setViewBill]      = useState<EWayBill | null>(null);
  const [deleteBill,    setDeleteBill]    = useState<EWayBill | null>(null);
  const [cancelBill,    setCancelBill]    = useState<EWayBill | null>(null);
  const [extendBill,    setExtendBill]    = useState<EWayBill | null>(null);
  const [formError,     setFormError]     = useState<string | null>(null);
  const [actionError,   setActionError]   = useState<string | null>(null);

  const { data: list, isLoading, isFetching, refetch } = useEWayBills({
    search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_LIMIT,
  });
  const { data: permsRes } = useEWayBillPermissions();
  const perms = permsRes?.data ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const createMut   = useCreateEWayBill();
  const updateMut   = useUpdateEWayBill();
  const generateMut = useGenerateEWayBill();
  const cancelMut   = useCancelEWayBill();
  const extendMut   = useExtendEWayBill();
  const deleteMut   = useDeleteEWayBill();

  const bills      = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  async function handleCreate(values: EWayBillFormValues) {
    setFormError(null);
    try { await createMut.mutateAsync(values); setCreateOpen(false); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to create E-Way Bill'); }
  }

  async function handleUpdate(values: EWayBillFormValues) {
    if (!editBill) return;
    setFormError(null);
    try { await updateMut.mutateAsync({ id: editBill.id, data: values }); setEditBill(null); }
    catch (e: any) { setFormError(e?.message ?? 'Failed to update E-Way Bill'); }
  }

  async function handleGenerate(bill: EWayBill) {
    setActionError(null);
    try { await generateMut.mutateAsync(bill.id); }
    catch (e: any) { setActionError(e?.message ?? 'Failed to generate'); }
  }

  async function handleCancel(reason: string) {
    if (!cancelBill) return;
    setActionError(null);
    try { await cancelMut.mutateAsync({ id: cancelBill.id, cancelReason: reason }); setCancelBill(null); }
    catch (e: any) { setActionError(e?.message ?? 'Failed to cancel'); }
  }

  async function handleExtend(vehicleNumber: string, reason: string) {
    if (!extendBill) return;
    setActionError(null);
    try { await extendMut.mutateAsync({ id: extendBill.id, vehicleNumber, reason }); setExtendBill(null); }
    catch (e: any) { setActionError(e?.message ?? 'Failed to extend'); }
  }

  async function handleDelete() {
    if (!deleteBill) return;
    setActionError(null);
    try { await deleteMut.mutateAsync(deleteBill.id); setDeleteBill(null); }
    catch (e: any) { setActionError(e?.message ?? 'Failed to delete'); }
  }

  const STATUS_FILTERS: { value: string; label: string; style: string }[] = [
    { value: 'draft',     label: 'Draft',     style: 'border-white/[0.1] text-white/40' },
    { value: 'generated', label: 'Generated', style: 'border-emerald-500/30 text-emerald-400' },
    { value: 'cancelled', label: 'Cancelled', style: 'border-red-500/30 text-red-400' },
    { value: 'expired',   label: 'Expired',   style: 'border-amber-500/30 text-amber-400' },
  ];

  return (
    <>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Search EWB no, doc no, party…" value={search} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {STATUS_FILTERS.map(({ value, label, style }) => (
              <button key={value} onClick={() => { setStatusFilter(statusFilter === value ? '' : value); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                  statusFilter === value ? style + ' bg-white/[0.05]' : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => refetch()} disabled={isFetching}
              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors disabled:opacity-40">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Bill
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['EWB Number', 'Document', 'From → To', 'Product', 'Value', 'Transport', 'Validity', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : bills.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center">
                  <p className="text-sm text-white/30">
                    {search || statusFilter ? 'No bills match your filters.' : 'No E-Way Bills yet. Create your first one.'}
                  </p>
                  {!search && !statusFilter && perms.canCreate && (
                    <Button size="sm" onClick={() => { setFormError(null); setCreateOpen(true); }}
                      className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 mt-3">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />New E-Way Bill
                    </Button>
                  )}
                </td></tr>
              ) : bills.map((b, i) => (
                <motion.tr key={b.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group last:border-0">

                  {/* EWB Number */}
                  <td className="px-4 py-3">
                    {b.ewbNumber
                      ? <span className="text-xs font-mono text-[#60a5fa]">{b.ewbNumber}</span>
                      : <span className="text-xs text-white/25 italic">Not generated</span>}
                  </td>

                  {/* Document */}
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-white/80">{b.docNumber}</div>
                    <div className="text-[11px] text-white/35">{b.docDate}</div>
                  </td>

                  {/* From → To */}
                  <td className="px-4 py-3 max-w-[160px]">
                    <div className="text-xs text-white/70 truncate">{b.fromTradeName}</div>
                    <div className="text-[11px] text-white/30">→ {b.toTradeName}</div>
                  </td>

                  {/* Product */}
                  <td className="px-4 py-3 max-w-[120px]">
                    <div className="text-xs text-white/70 truncate">{b.productName}</div>
                    {b.hsnCode && <div className="text-[11px] text-white/30">HSN: {b.hsnCode}</div>}
                  </td>

                  {/* Value */}
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-white/80 tabular-nums">{fmtMoney(b.totalValue)}</div>
                    <div className="text-[11px] text-white/30">Tax: {fmtMoney(b.totalTaxAmount)}</div>
                  </td>

                  {/* Transport */}
                  <td className="px-4 py-3">
                    <div className="text-xs text-white/60">{TRANSPORT_MODE_LABELS[b.transportMode]}</div>
                    {b.vehicleNumber && <div className="text-[11px] text-white/30 font-mono">{b.vehicleNumber}</div>}
                  </td>

                  {/* Validity */}
                  <td className="px-4 py-3">
                    {b.validUpto
                      ? <div className="text-[11px] text-white/40">{b.validUpto.slice(0, 16)}</div>
                      : <span className="text-[11px] text-white/25">—</span>}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status as EWayBillStatus} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewBill(b)} title="View details"
                        className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {perms.canEdit && b.status === 'draft' && (
                        <>
                          <button onClick={() => { setFormError(null); setEditBill(b); }} title="Edit"
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleGenerate(b)} title="Generate EWB"
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-emerald-400 transition-colors">
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {perms.canEdit && b.status === 'generated' && (
                        <>
                          <button onClick={() => { setActionError(null); setCancelBill(b); }} title="Cancel"
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-amber-400 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setActionError(null); setExtendBill(b); }} title="Extend validity"
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-cyan-400 transition-colors">
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {perms.canDelete && b.status === 'draft' && (
                        <button onClick={() => { setActionError(null); setDeleteBill(b); }} title="Delete"
                          className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
            {isLoading ? 'Loading…' : total === 0 ? 'No bills' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded text-xs transition-colors', p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>
                {p}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
              className="border-white/[0.1] bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05] h-7 text-xs px-2">Next →</Button>
          </div>
        </div>
      </div>

      {/* Modals & dialogs */}
      <EWayBillFormModal open={createOpen} onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate} isSubmitting={createMut.isPending} error={formError} />
      <EWayBillFormModal open={!!editBill} onClose={() => setEditBill(null)}
        onSubmit={handleUpdate} isSubmitting={updateMut.isPending} bill={editBill} error={formError} />

      {viewBill && <BillDetailSheet bill={viewBill} onClose={() => setViewBill(null)} />}

      <DeleteDialog open={!!deleteBill} onClose={() => setDeleteBill(null)}
        onConfirm={handleDelete} isLoading={deleteMut.isPending}
        billName={deleteBill?.docNumber} error={actionError} />
      <CancelDialog open={!!cancelBill} onClose={() => setCancelBill(null)}
        onConfirm={handleCancel} isLoading={cancelMut.isPending}
        ewbNumber={cancelBill?.ewbNumber} error={actionError} />
      <ExtendDialog open={!!extendBill} onClose={() => setExtendBill(null)}
        onConfirm={handleExtend} isLoading={extendMut.isPending}
        ewbNumber={extendBill?.ewbNumber} currentVehicle={extendBill?.vehicleNumber} error={actionError} />
    </>
  );
}
