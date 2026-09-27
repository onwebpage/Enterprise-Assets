import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Package, Warehouse, ArrowLeftRight, TrendingDown, TrendingUp,
  Plus, Download, Filter, Search, MoreHorizontal, Eye, Edit,
  Trash2, ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2,
  BarChart3, RefreshCw, Layers, QrCode, Truck, MapPin,
  Clock, Hash, Box, Archive, ArrowRight, Activity, Zap,
  RotateCcw, ScanLine, CircleDot, Grip, Loader2, X,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import KPICard from '@/components/app/KPICard';
import StatusBadge from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/currency';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useInvPermissions, useInvSummary, useInvCategories,
  useInvWarehouses, useInvProducts, useInvStock,
  useInvMovements, useInvTransfers,
  useCreateInvProduct, useUpdateInvProduct, useDeleteInvProduct,
  useCreateInvWarehouse, useUpdateInvWarehouse, useDeleteInvWarehouse,
  useCreateInvMovement, useCreateInvTransfer, useUpdateInvTransfer,
  type InvProduct, type InvWarehouse, type InvTransfer,
  INV_WAREHOUSE_STATUSES, INV_PRODUCT_STATUSES, INV_MOVEMENT_TYPES, INV_TRANSFER_STATUSES,
} from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1225] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-white/60">{p.name}:</span>
          <span className="text-xs font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
function FilterBar({ placeholder, search, onSearch, children }: {
  placeholder: string;
  search?: string;
  onSearch?: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input
          placeholder={placeholder}
          value={search ?? ''}
          onChange={e => onSearch?.(e.target.value)}
          className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm"
        />
      </div>
      {children}
    </div>
  );
}

function TableShell({ headers, children, footer }: {
  headers: string[]; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {headers.map(h => (
              <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {footer && <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">{footer}</div>}
    </div>
  );
}

function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group last:border-0">
      {children}
    </tr>
  );
}

function Pagination({ total, page, totalPages, onPage }: {
  total: number; page: number; totalPages: number; onPage: (p: number) => void;
}) {
  return (
    <>
      <p className="text-xs text-white/30">
        Showing {Math.min(25, total)} of {total.toLocaleString()} records
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, totalPages > 3 ? '…' : null, totalPages > 2 ? totalPages : null]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((p, i) => (
            <button
              key={i}
              disabled={p === '…'}
              onClick={() => typeof p === 'number' && onPage(p)}
              className={cn(
                'w-7 h-7 rounded text-xs transition-colors',
                p === page ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]',
                p === '…' ? 'cursor-default' : '',
              )}
            >
              {p}
            </button>
          ))}
      </div>
    </>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-sm text-white/30">{message}</td>
    </tr>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        <Loader2 className="w-5 h-5 animate-spin text-white/30 mx-auto" />
      </td>
    </tr>
  );
}

const stockStatusStyles: Record<string, string> = {
  ok:       'text-emerald-400 bg-emerald-500/10',
  low:      'text-amber-400 bg-amber-500/10',
  critical: 'text-red-400 bg-red-500/10',
  oos:      'text-white/30 bg-white/[0.05]',
};
const stockStatusLabel: Record<string, string> = {
  ok: 'In Stock', low: 'Low Stock', critical: 'Critical', oos: 'Out of Stock',
};

const movTypeIcon: Record<string, any> = {
  receipt: ArrowDownLeft, dispatch: ArrowUpRight, transfer: ArrowLeftRight, adjustment: RefreshCw,
};
const movTypeColor: Record<string, string> = {
  receipt: 'text-emerald-400', dispatch: 'text-red-400', transfer: 'text-[#2563EB]', adjustment: 'text-amber-400',
};

const transferStatusMap: Record<string, string> = {
  pending: 'pending', in_transit: 'processing', completed: 'completed',
  cancelled: 'inactive', on_hold: 'inactive',
};

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function ProductDialog({
  open, onClose, product, categories,
}: {
  open: boolean;
  onClose: () => void;
  product?: InvProduct | null;
  categories: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const createMut = useCreateInvProduct();
  const updateMut = useUpdateInvProduct();
  const isEdit = !!product;

  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ? String(product.categoryId) : '',
    unit: product?.unit ?? 'each',
    costPrice: product?.costPrice ?? '0',
    sellingPrice: product?.sellingPrice ?? '0',
    reorderPoint: String(product?.reorderPoint ?? 0),
    reorderQty: String(product?.reorderQty ?? 0),
    status: product?.status ?? 'active',
    notes: product?.notes ?? '',
  });

  // Reset form when product changes
  useState(() => {
    if (open) {
      setForm({
        sku: product?.sku ?? '',
        name: product?.name ?? '',
        description: product?.description ?? '',
        categoryId: product?.categoryId ? String(product.categoryId) : '',
        unit: product?.unit ?? 'each',
        costPrice: product?.costPrice ?? '0',
        sellingPrice: product?.sellingPrice ?? '0',
        reorderPoint: String(product?.reorderPoint ?? 0),
        reorderQty: String(product?.reorderQty ?? 0),
        status: product?.status ?? 'active',
        notes: product?.notes ?? '',
      });
    }
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description || null,
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        unit: form.unit,
        costPrice: form.costPrice || '0',
        sellingPrice: form.sellingPrice || '0',
        reorderPoint: parseInt(form.reorderPoint) || 0,
        reorderQty: parseInt(form.reorderQty) || 0,
        status: form.status as any,
        notes: form.notes || null,
      };
      if (isEdit && product) {
        await updateMut.mutateAsync({ id: product.id, data: payload });
        toast({ title: 'Product updated' });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: 'Product created' });
      }
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-white/50">SKU *</label>
            <Input value={form.sku} onChange={e => set('sku', e.target.value)}
              placeholder="PRD-0001" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Unit</label>
            <Select value={form.unit} onValueChange={v => set('unit', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                {['each', 'kg', 'ltr', 'm', 'box', 'pcs'].map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-white/50">Name *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Product name" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Category</label>
            <Select value={form.categoryId || '_none'} onValueChange={v => set('categoryId', v === '_none' ? '' : v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                <SelectItem value="_none">None</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Status</label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                {INV_PRODUCT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Cost Price</label>
            <Input value={form.costPrice} onChange={e => set('costPrice', e.target.value)}
              type="number" min="0" step="0.01"
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Selling Price</label>
            <Input value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)}
              type="number" min="0" step="0.01"
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Reorder Point</label>
            <Input value={form.reorderPoint} onChange={e => set('reorderPoint', e.target.value)}
              type="number" min="0"
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Reorder Qty</label>
            <Input value={form.reorderQty} onChange={e => set('reorderQty', e.target.value)}
              type="number" min="0"
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-white/50">Notes</label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white h-8">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.sku.trim() || !form.name.trim()}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
            {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarehouseDialog({
  open, onClose, warehouse,
}: {
  open: boolean; onClose: () => void; warehouse?: InvWarehouse | null;
}) {
  const { toast } = useToast();
  const createMut = useCreateInvWarehouse();
  const updateMut = useUpdateInvWarehouse();
  const isEdit = !!warehouse;

  const [form, setForm] = useState({
    code: warehouse?.code ?? '',
    name: warehouse?.name ?? '',
    location: warehouse?.location ?? '',
    manager: warehouse?.manager ?? '',
    capacity: String(warehouse?.capacity ?? 0),
    status: warehouse?.status ?? 'active',
    notes: warehouse?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        location: form.location || null,
        manager: form.manager || null,
        capacity: parseInt(form.capacity) || 0,
        status: form.status as any,
        notes: form.notes || null,
      };
      if (isEdit && warehouse) {
        await updateMut.mutateAsync({ id: warehouse.id, data: payload });
        toast({ title: 'Warehouse updated' });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: 'Warehouse created' });
      }
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-white/50">Code *</label>
            <Input value={form.code} onChange={e => set('code', e.target.value)}
              placeholder="WH-05" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Status</label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                {INV_WAREHOUSE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-white/50">Name *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Main Distribution Centre" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Location</label>
            <Input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="City, Province" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Manager</label>
            <Input value={form.manager} onChange={e => set('manager', e.target.value)}
              placeholder="Manager name" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Capacity (units)</label>
            <Input value={form.capacity} onChange={e => set('capacity', e.target.value)}
              type="number" min="0"
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Notes</label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white h-8">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.code.trim() || !form.name.trim()}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
            {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Warehouse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockDialog({
  open, onClose, products, warehouses,
}: {
  open: boolean;
  onClose: () => void;
  products: InvProduct[];
  warehouses: InvWarehouse[];
}) {
  const { toast } = useToast();
  const createMut = useCreateInvMovement();

  const [form, setForm] = useState({
    productId: '',
    warehouseId: '',
    movementType: 'receipt' as string,
    qty: '',
    reference: '',
    notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    try {
      const qty = form.movementType === 'dispatch'
        ? `-${Math.abs(parseFloat(form.qty))}`
        : String(parseFloat(form.qty));

      await createMut.mutateAsync({
        productId:    parseInt(form.productId),
        warehouseId:  parseInt(form.warehouseId),
        movementType: form.movementType as any,
        qty,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      toast({ title: 'Movement recorded' });
      onClose();
      setForm({ productId: '', warehouseId: '', movementType: 'receipt', qty: '', reference: '', notes: '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-white/50">Movement Type *</label>
            <Select value={form.movementType} onValueChange={v => set('movementType', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                {INV_MOVEMENT_TYPES.filter(t => t !== 'transfer').map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Product *</label>
            <Select value={form.productId} onValueChange={v => set('productId', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white max-h-48">
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.sku} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Warehouse *</label>
            <Select value={form.warehouseId} onValueChange={v => set('warehouseId', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-white/50">Quantity *</label>
              <Input value={form.qty} onChange={e => set('qty', e.target.value)}
                type="number" min="0" step="0.0001" placeholder="0"
                className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50">Reference</label>
              <Input value={form.reference} onChange={e => set('reference', e.target.value)}
                placeholder="PO-1234" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Notes</label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white h-8">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMut.isPending || !form.productId || !form.warehouseId || !form.qty}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8"
          >
            {createMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Record Movement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open, onClose, products, warehouses,
}: {
  open: boolean; onClose: () => void;
  products: InvProduct[]; warehouses: InvWarehouse[];
}) {
  const { toast } = useToast();
  const createMut = useCreateInvTransfer();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: today,
    notes: '',
  });
  const [lines, setLines] = useState([{ productId: '', qty: '' }]);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addLine = () => setLines(l => [...l, { productId: '', qty: '' }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, j) => j !== i));
  const setLine = (i: number, k: string, v: string) =>
    setLines(l => l.map((row, j) => j === i ? { ...row, [k]: v } : row));

  const handleSubmit = async () => {
    try {
      const validLines = lines.filter(l => l.productId && l.qty && parseFloat(l.qty) > 0);
      if (validLines.length === 0) {
        toast({ title: 'Add at least one product line', variant: 'destructive' });
        return;
      }
      await createMut.mutateAsync({
        fromWarehouseId: parseInt(form.fromWarehouseId),
        toWarehouseId:   parseInt(form.toWarehouseId),
        transferDate:    form.transferDate,
        notes:           form.notes || null,
        lines:           validLines.map(l => ({ productId: parseInt(l.productId), qty: l.qty })),
      });
      toast({ title: 'Transfer created' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>New Transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-white/50">From Warehouse *</label>
              <Select value={form.fromWarehouseId} onValueChange={v => set('fromWarehouseId', v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                  {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50">To Warehouse *</label>
              <Select value={form.toWarehouseId} onValueChange={v => set('toWarehouseId', v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                  {warehouses.filter(w => String(w.id) !== form.fromWarehouseId).map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-white/50">Transfer Date</label>
              <Input value={form.transferDate} onChange={e => set('transferDate', e.target.value)}
                type="date" className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50">Notes</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm" />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/50">Products</label>
              <button onClick={addLine} className="text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center gap-1">
                <Plus className="w-3 h-3" />Add row
              </button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={line.productId} onValueChange={v => setLine(i, 'productId', v)}>
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                      <SelectValue placeholder="Product" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white max-h-40">
                      {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.sku} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)}
                  type="number" min="0" step="0.0001" placeholder="Qty"
                  className="w-24 bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm flex-shrink-0" />
                {lines.length > 1 && (
                  <button onClick={() => removeLine(i)} className="p-1 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white h-8">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMut.isPending || !form.fromWarehouseId || !form.toWarehouseId}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8"
          >
            {createMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Create Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferStatusDialog({
  open, onClose, transfer,
}: {
  open: boolean; onClose: () => void; transfer: InvTransfer | null;
}) {
  const { toast } = useToast();
  const updateMut = useUpdateInvTransfer();
  const [newStatus, setNewStatus] = useState('');

  const allowedNext: Record<string, string[]> = {
    pending:    ['in_transit', 'on_hold', 'cancelled'],
    in_transit: ['completed', 'on_hold'],
    on_hold:    ['in_transit', 'cancelled'],
  };

  const options = transfer ? (allowedNext[transfer.status] ?? []) : [];

  const handleUpdate = async () => {
    if (!transfer || !newStatus) return;
    try {
      await updateMut.mutateAsync({ id: transfer.id, data: { status: newStatus as any } });
      toast({ title: `Transfer ${newStatus === 'completed' ? 'completed — stock updated' : 'updated'}` });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1225] border-white/[0.1] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Transfer Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-white/60">
            Transfer <span className="font-mono text-[#2563EB]">{transfer?.transferNumber}</span> is currently{' '}
            <span className="text-white/80">{transfer?.status.replace('_', ' ')}</span>.
          </p>
          {options.length > 0 ? (
            <div className="space-y-1">
              <label className="text-xs text-white/50">Move to</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white h-8 text-sm">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1225] border-white/[0.1] text-white">
                  {options.map(s => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                      {s === 'completed' ? ' (applies stock changes)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-white/40">This transfer cannot be updated further.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white h-8">Cancel</Button>
          {options.length > 0 && (
            <Button onClick={handleUpdate} disabled={!newStatus || updateMut.isPending}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
              {updateMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Update
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Static chart data (analytics) ───────────────────────────────────────────
const stockTrend = [
  { month: 'Feb', inbound: 380, outbound: 410, onHand: 2070 },
  { month: 'Mar', inbound: 520, outbound: 440, onHand: 2150 },
  { month: 'Apr', inbound: 490, outbound: 470, onHand: 2170 },
  { month: 'May', inbound: 610, outbound: 540, onHand: 2240 },
  { month: 'Jun', inbound: 580, outbound: 510, onHand: 2310 },
  { month: 'Jul', inbound: 540, outbound: 490, onHand: 2360 },
  { month: 'Aug', inbound: 460, outbound: 420, onHand: 2400 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [tab, setTab] = useState('dashboard');
  const { toast } = useToast();

  // Search / filter state per tab
  const [productSearch, setProductSearch] = useState('');
  const [productPage,   setProductPage]   = useState(1);
  const [stockSearch,   setStockSearch]   = useState('');
  const [stockPage,     setStockPage]     = useState(1);
  const [movSearch,     setMovSearch]     = useState('');
  const [movPage,       setMovPage]       = useState(1);
  const [tfSearch,      setTfSearch]      = useState('');
  const [tfPage,        setTfPage]        = useState(1);

  // Dialog state
  const [productDialog, setProductDialog] = useState<{ open: boolean; product?: InvProduct | null }>({ open: false });
  const [warehouseDialog, setWarehouseDialog] = useState<{ open: boolean; warehouse?: InvWarehouse | null }>({ open: false });
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [tfStatusDialog, setTfStatusDialog] = useState<InvTransfer | null>(null);

  // Data
  const { data: permsRes }    = useInvPermissions();
  const { data: summaryRes, isLoading: summaryLoading } = useInvSummary();
  const { data: catsRes }     = useInvCategories();
  const { data: whRes }       = useInvWarehouses();
  const { data: productsRes, isLoading: productsLoading } = useInvProducts({ search: productSearch, page: productPage });
  const { data: stockRes,    isLoading: stockLoading }    = useInvStock({ search: stockSearch, page: stockPage });
  const { data: movsRes,     isLoading: movsLoading }     = useInvMovements({ search: movSearch, page: movPage });
  const { data: transfersRes,isLoading: tfLoading }       = useInvTransfers({ search: tfSearch, page: tfPage });

  const perms      = permsRes?.data ?? { canView: true, canCreate: true, canEdit: true, canDelete: true };
  const summary    = summaryRes?.data;
  const categories = catsRes?.data ?? [];
  const warehouses = whRes?.data ?? [];
  const products   = productsRes?.data ?? [];
  const stock      = stockRes?.data ?? [];
  const movements  = movsRes?.data ?? [];
  const transfers  = transfersRes?.data ?? [];

  // Mutations
  const deleteProd = useDeleteInvProduct();
  const deleteWH   = useDeleteInvWarehouse();

  const handleDeleteProduct = async (p: InvProduct) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProd.mutateAsync(p.id);
      toast({ title: 'Product deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteWarehouse = async (w: InvWarehouse) => {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    try {
      await deleteWH.mutateAsync(w.id);
      toast({ title: 'Warehouse deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // KPI data
  const fmt = (v?: string) => v ? `₹${parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '₹0';
  const kpis = [
    {
      label: 'Total SKUs',
      value: summaryLoading ? '...' : String(summary?.totalSkus ?? 0),
      change: `${summary?.warehouseCount ?? 0} warehouses`,
      up: true,
      icon: Package, iconColor: 'text-[#2563EB]', gradient: 'bg-[#2563EB]/15',
      sparkline: [20, 25, 30, 35, 38, 40, summary?.totalSkus ?? 42],
      changeLabel: 'active products',
    },
    {
      label: 'Inventory Value',
      value: summaryLoading ? '...' : fmt(summary?.totalValue),
      change: 'at cost price',
      up: true,
      icon: Archive, iconColor: 'text-[#06B6D4]', gradient: 'bg-[#06B6D4]/15',
      sparkline: [1.2, 1.4, 1.5, 1.6, 1.7, 1.8, parseFloat(summary?.totalValue ?? '0') / 1_000_000],
      changeLabel: 'current snapshot',
    },
    {
      label: 'Low Stock Alerts',
      value: summaryLoading ? '...' : String(summary?.lowStockCount ?? 0),
      change: summary?.lowStockCount ? 'need reorder' : 'all good',
      up: (summary?.lowStockCount ?? 0) === 0,
      icon: AlertTriangle, iconColor: 'text-amber-400', gradient: 'bg-amber-500/15',
      sparkline: [8, 9, 10, 11, 12, 11, summary?.lowStockCount ?? 0],
      changeLabel: 'below reorder point',
    },
    {
      label: 'Pending Transfers',
      value: summaryLoading ? '...' : String(summary?.pendingTransfers ?? 0),
      change: 'in progress',
      up: true,
      icon: Truck, iconColor: 'text-purple-400', gradient: 'bg-purple-500/15',
      sparkline: [5, 4, 6, 7, 5, 6, summary?.pendingTransfers ?? 0],
      changeLabel: 'pending or in transit',
    },
  ];

  // Stock alert counts
  const stockCounts = useMemo(() => {
    const all = stock;
    return {
      ok:       all.filter(s => s.stockStatus === 'ok').length,
      low:      all.filter(s => s.stockStatus === 'low').length,
      critical: all.filter(s => s.stockStatus === 'critical').length,
      oos:      all.filter(s => s.stockStatus === 'oos').length,
    };
  }, [stock]);

  return (
    <AppLayout breadcrumbs={[{ label: 'Inventory & Warehouse' }]}>
      <div className="p-6 max-w-[1800px] mx-auto space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Inventory & Warehouse</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {warehouses.length} warehouses &nbsp;·&nbsp; {summary?.totalSkus ?? '…'} active SKUs &nbsp;·&nbsp; {fmt(summary?.totalValue)} on-hand value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustDialog(true)}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Adjust Stock
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTransferDialog(true)}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />Transfer
            </Button>
            {perms.canCreate && (
              <Button size="sm" onClick={() => setProductDialog({ open: true, product: null })}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Product
              </Button>
            )}
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto">
            <TabsList className="bg-white/[0.04] border border-white/[0.07] h-9 p-0.5 inline-flex min-w-max">
              {[
                { value: 'dashboard',  label: 'Dashboard',      icon: BarChart3      },
                { value: 'products',   label: 'Products',       icon: Package        },
                { value: 'warehouses', label: 'Warehouses',     icon: Warehouse      },
                { value: 'stock',      label: 'Stock Levels',   icon: Layers         },
                { value: 'transfers',  label: 'Transfers',      icon: ArrowLeftRight },
                { value: 'movements',  label: 'Movements',      icon: Activity       },
                { value: 'analytics',  label: 'Analytics',      icon: TrendingUp     },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value}
                  className="text-xs h-8 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/40 gap-1.5 whitespace-nowrap">
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Stock flow chart */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Stock Flow</h3>
                    <p className="text-xs text-white/35 mt-0.5">Inbound vs outbound units · FY 2026</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stockTrend} margin={{ left: -20, right: 5, top: 5 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="inbound"  name="Inbound"  fill="#22C55E" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="outbound" name="Outbound" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stock alerts panel */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Stock Alerts</h3>
                <div className="space-y-2.5">
                  {stock.filter(s => s.stockStatus !== 'ok').slice(0, 5).map(item => (
                    <div key={item.id} className={cn(
                      'rounded-lg p-3 border',
                      item.stockStatus === 'critical' || item.stockStatus === 'oos'
                        ? 'bg-red-500/[0.06] border-red-500/20'
                        : 'bg-amber-500/[0.06] border-amber-500/20',
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white/80 truncate">{item.productName}</p>
                          <p className="text-[11px] text-white/35 mt-0.5 font-mono">{item.sku}</p>
                        </div>
                        <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0', stockStatusStyles[item.stockStatus])}>
                          {stockStatusLabel[item.stockStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-white/40">
                        <span>On hand: <span className="text-white/70 font-medium">{parseFloat(item.qtyOnHand).toFixed(0)}</span></span>
                        <span>Reorder: <span className="text-white/70 font-medium">{item.reorderPoint}</span></span>
                      </div>
                    </div>
                  ))}
                  {stock.filter(s => s.stockStatus !== 'ok').length === 0 && (
                    <div className="text-center py-6 text-xs text-white/30">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                      All stock levels are healthy
                    </div>
                  )}
                </div>
                {stock.filter(s => s.stockStatus !== 'ok').length > 5 && (
                  <button onClick={() => setTab('stock')} className="w-full mt-3 text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center justify-center gap-1 py-2">
                    View all alerts <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Warehouse utilisation */}
              <div className="xl:col-span-1 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Warehouse Utilisation</h3>
                <div className="space-y-4">
                  {warehouses.map(wh => {
                    const used = parseFloat(wh.totalUnits ?? '0');
                    const pct  = wh.capacity > 0 ? Math.min(100, Math.round((used / wh.capacity) * 100)) : 0;
                    return (
                      <div key={wh.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <span className="text-sm font-medium text-white/80">{wh.code}</span>
                            <span className="text-xs text-white/35 ml-2">{wh.location ?? '—'}</span>
                          </div>
                          <span className={cn('text-xs font-semibold', pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-amber-400' : 'text-emerald-400')}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400')}
                          />
                        </div>
                        <p className="text-[11px] text-white/30 mt-1">{used.toFixed(0)} / {wh.capacity.toLocaleString()} units</p>
                      </div>
                    );
                  })}
                  {warehouses.length === 0 && <p className="text-xs text-white/30 text-center py-4">No warehouses yet</p>}
                </div>
              </div>

              {/* Recent movements */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl">
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-sm font-semibold text-white">Recent Movements</h3>
                  <button onClick={() => setTab('movements')} className="text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {['ID', 'Type', 'Product', 'Qty', 'Warehouse', 'Date'].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movements.slice(0, 5).map(mv => {
                      const Icon = movTypeIcon[mv.movementType];
                      const qty  = parseFloat(mv.qty);
                      return (
                        <TR key={mv.id}>
                          <td className="px-4 py-3 text-xs font-mono text-white/40">{mv.movementNumber}</td>
                          <td className="px-4 py-3">
                            <span className={cn('flex items-center gap-1.5 text-xs font-medium capitalize', movTypeColor[mv.movementType])}>
                              <Icon className="w-3.5 h-3.5" />{mv.movementType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white/80 truncate max-w-[180px]">{mv.productName}</p>
                            <p className="text-[11px] text-white/30 font-mono">{mv.sku}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-sm font-semibold', qty > 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {qty > 0 ? '+' : ''}{qty.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/50">{mv.warehouseCode}</td>
                          <td className="px-4 py-3 text-xs text-white/40">{new Date(mv.createdAt).toLocaleDateString()}</td>
                        </TR>
                      );
                    })}
                    {movements.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-white/30">No movements yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── PRODUCTS ──────────────────────────────────────────────────── */}
          <TabsContent value="products" className="mt-4">
            <TableShell
              headers={['SKU', 'Product', 'Category', 'On Hand', 'Reorder Pt.', 'Cost', 'Status', '']}
              footer={
                <Pagination
                  total={productsRes?.total ?? 0}
                  page={productPage}
                  totalPages={productsRes?.totalPages ?? 1}
                  onPage={setProductPage}
                />
              }
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search products, SKU..." search={productSearch} onSearch={v => { setProductSearch(v); setProductPage(1); }}>
                    {perms.canCreate && (
                      <Button size="sm" onClick={() => setProductDialog({ open: true, product: null })}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />Add Product
                      </Button>
                    )}
                  </FilterBar>
                </td>
              </tr>
              {productsLoading
                ? <LoadingRow cols={8} />
                : products.length === 0
                  ? <EmptyRow cols={8} message="No products found. Add your first product to get started." />
                  : products.map(p => (
                    <TR key={p.id}>
                      <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{p.sku}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                            <Box className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <span className="text-sm text-white/80 font-medium truncate max-w-[220px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.categoryName
                          ? <Badge className="text-[11px] border-0 bg-[#2563EB]/15 text-[#2563EB]">{p.categoryName}</Badge>
                          : <span className="text-xs text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{parseFloat(p.totalOnHand ?? '0').toFixed(0)}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{p.reorderPoint}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{formatINR(p.costPrice)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status === 'active' ? 'active' : p.status === 'inactive' ? 'inactive' : 'overdue'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {perms.canEdit && (
                            <button onClick={() => setProductDialog({ open: true, product: p })}
                              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {perms.canDelete && (
                            <button onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </TR>
                  ))
              }
            </TableShell>
          </TabsContent>

          {/* ── WAREHOUSES ────────────────────────────────────────────────── */}
          <TabsContent value="warehouses" className="mt-4">
            <div className="flex justify-end mb-3">
              {perms.canCreate && (
                <Button size="sm" onClick={() => setWarehouseDialog({ open: true, warehouse: null })}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Add Warehouse
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouses.map((wh, i) => {
                const used = parseFloat(wh.totalUnits ?? '0');
                const pct  = wh.capacity > 0 ? Math.min(100, Math.round((used / wh.capacity) * 100)) : 0;
                return (
                  <motion.div key={wh.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.14] transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center">
                          <Warehouse className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-[#60A5FA] transition-colors">{wh.name}</p>
                          <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{wh.location ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={wh.status === 'active' ? 'active' : wh.status === 'maintenance' ? 'pending' : 'inactive'} />
                        {perms.canEdit && (
                          <button onClick={() => setWarehouseDialog({ open: true, warehouse: wh })}
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {perms.canDelete && (
                          <button onClick={() => handleDeleteWarehouse(wh)}
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Code',     value: wh.code },
                        { label: 'SKUs',     value: String(wh.skuCount ?? 0) },
                        { label: 'Manager',  value: wh.manager?.split(' ')[0] ?? '—' },
                      ].map(m => (
                        <div key={m.label} className="bg-white/[0.03] rounded-lg px-3 py-2.5">
                          <p className="text-[11px] text-white/30 mb-1">{m.label}</p>
                          <p className="text-sm font-semibold text-white">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/40">Utilisation</span>
                        <span className={cn('text-xs font-semibold', pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-amber-400' : 'text-emerald-400')}>
                          {pct}% ({used.toFixed(0)} / {wh.capacity.toLocaleString()})
                        </span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400')}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {warehouses.length === 0 && (
                <div className="col-span-2 text-center py-16 text-sm text-white/30">
                  No warehouses yet. Add your first warehouse to start tracking stock.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── STOCK LEVELS ──────────────────────────────────────────────── */}
          <TabsContent value="stock" className="mt-4">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'In Stock',     count: stockCounts.ok,       color: 'border-emerald-500/25 text-emerald-400' },
                { label: 'Low Stock',    count: stockCounts.low,      color: 'border-amber-500/25 text-amber-400'     },
                { label: 'Critical',     count: stockCounts.critical, color: 'border-red-500/25 text-red-400'         },
                { label: 'Out of Stock', count: stockCounts.oos,      color: 'border-white/10 text-white/40'          },
              ].map(b => (
                <div key={b.label} className={cn('bg-[#0a0f1e] border rounded-xl p-4', b.color.split(' ')[0])}>
                  <p className={cn('text-2xl font-bold mb-0.5', b.color.split(' ')[1])}>{b.count}</p>
                  <p className="text-sm text-white/50">{b.label}</p>
                </div>
              ))}
            </div>
            <TableShell
              headers={['SKU', 'Product', 'Warehouse', 'On Hand', 'Reserved', 'Available', 'Reorder Pt.', 'Stock Value', 'Status']}
              footer={
                <Pagination
                  total={stockRes?.total ?? 0}
                  page={stockPage}
                  totalPages={stockRes?.totalPages ?? 1}
                  onPage={setStockPage}
                />
              }
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={9} className="p-0">
                  <FilterBar placeholder="Search SKU, product..." search={stockSearch} onSearch={v => { setStockSearch(v); setStockPage(1); }}>
                    <Button variant="outline" size="sm" onClick={() => setAdjustDialog(true)}
                      className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Adjust
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {stockLoading
                ? <LoadingRow cols={9} />
                : stock.length === 0
                  ? <EmptyRow cols={9} message="No stock data. Record a receipt movement to add inventory." />
                  : stock.map(item => (
                    <TR key={item.id}>
                      <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-white/80 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-xs font-mono text-white/40">{item.warehouseCode}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{parseFloat(item.qtyOnHand).toFixed(0)}</td>
                      <td className="px-4 py-3 text-sm text-amber-400">{parseFloat(item.qtyReserved).toFixed(0)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">{parseFloat(item.available).toFixed(0)}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{item.reorderPoint}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{formatINR(item.stockValue)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md', stockStatusStyles[item.stockStatus])}>
                          {stockStatusLabel[item.stockStatus]}
                        </span>
                      </td>
                    </TR>
                  ))
              }
            </TableShell>
          </TabsContent>

          {/* ── TRANSFERS ─────────────────────────────────────────────────── */}
          <TabsContent value="transfers" className="mt-4">
            <TableShell
              headers={['Transfer #', 'From', 'To', 'Items', 'Notes', 'Status', 'Date', '']}
              footer={
                <Pagination
                  total={transfersRes?.total ?? 0}
                  page={tfPage}
                  totalPages={transfersRes?.totalPages ?? 1}
                  onPage={setTfPage}
                />
              }
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search transfers..." search={tfSearch} onSearch={v => { setTfSearch(v); setTfPage(1); }}>
                    {perms.canCreate && (
                      <Button size="sm" onClick={() => setTransferDialog(true)}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />New Transfer
                      </Button>
                    )}
                  </FilterBar>
                </td>
              </tr>
              {tfLoading
                ? <LoadingRow cols={8} />
                : transfers.length === 0
                  ? <EmptyRow cols={8} message="No transfers yet." />
                  : transfers.map(tf => (
                    <TR key={tf.id} onClick={() => {
                      if (['pending', 'in_transit', 'on_hold'].includes(tf.status)) setTfStatusDialog(tf);
                    }}>
                      <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{tf.transferNumber}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-white/[0.05] px-2 py-1 rounded text-white/60">{tf.fromWarehouseCode}</span>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-white/20" />
                        <span className="text-xs font-mono bg-white/[0.05] px-2 py-1 rounded text-white/60">{tf.toWarehouseCode}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{tf.lineCount}</td>
                      <td className="px-4 py-3 text-sm text-white/50 truncate max-w-[160px]">{tf.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={transferStatusMap[tf.status] as any ?? 'pending'} />
                      </td>
                      <td className="px-4 py-3 text-sm text-white/40">{tf.transferDate}</td>
                      <td className="px-4 py-3">
                        {['pending', 'in_transit', 'on_hold'].includes(tf.status) && (
                          <button onClick={e => { e.stopPropagation(); setTfStatusDialog(tf); }}
                            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </TR>
                  ))
              }
            </TableShell>
          </TabsContent>

          {/* ── MOVEMENTS ─────────────────────────────────────────────────── */}
          <TabsContent value="movements" className="mt-4">
            <TableShell
              headers={['ID', 'Type', 'SKU', 'Product', 'Qty Change', 'Warehouse', 'Ref', 'Date']}
              footer={
                <Pagination
                  total={movsRes?.total ?? 0}
                  page={movPage}
                  totalPages={movsRes?.totalPages ?? 1}
                  onPage={setMovPage}
                />
              }
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search movements, SKU, ref..." search={movSearch} onSearch={v => { setMovSearch(v); setMovPage(1); }}>
                    {perms.canCreate && (
                      <Button size="sm" onClick={() => setAdjustDialog(true)}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />Record Movement
                      </Button>
                    )}
                  </FilterBar>
                </td>
              </tr>
              {movsLoading
                ? <LoadingRow cols={8} />
                : movements.length === 0
                  ? <EmptyRow cols={8} message="No movements recorded yet." />
                  : movements.map(mv => {
                    const Icon = movTypeIcon[mv.movementType];
                    const qty  = parseFloat(mv.qty);
                    return (
                      <TR key={mv.id}>
                        <td className="px-4 py-3 text-xs font-mono text-white/40">{mv.movementNumber}</td>
                        <td className="px-4 py-3">
                          <span className={cn('flex items-center gap-1.5 text-xs font-medium capitalize', movTypeColor[mv.movementType])}>
                            <Icon className="w-3.5 h-3.5" />{mv.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#2563EB]">{mv.sku}</td>
                        <td className="px-4 py-3 text-sm text-white/80 truncate max-w-[160px]">{mv.productName}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-sm font-bold', qty > 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {qty > 0 ? '+' : ''}{qty.toFixed(0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-white/40">{mv.warehouseCode}</td>
                        <td className="px-4 py-3 text-xs font-mono text-[#06B6D4]">{mv.reference ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{new Date(mv.createdAt).toLocaleDateString()}</td>
                      </TR>
                    );
                  })
              }
            </TableShell>
          </TabsContent>

          {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">On-Hand Inventory Trend</h3>
                <p className="text-xs text-white/35 mb-4">Total units on hand · FY 2026</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stockTrend} margin={{ left: -20, right: 5, top: 5 }}>
                    <defs>
                      <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="onHand" name="On Hand" stroke="#06B6D4" strokeWidth={2} fill="url(#stockGrad)" dot={false} activeDot={{ r: 4, fill: '#06B6D4' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Inbound vs Outbound</h3>
                <p className="text-xs text-white/35 mb-4">Units received and dispatched · Monthly</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stockTrend} margin={{ left: -20, right: 5, top: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="inbound"  name="Inbound"  stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22C55E' }} />
                    <Line type="monotone" dataKey="outbound" name="Outbound" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#EF4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category value breakdown */}
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Inventory Value by Category</h3>
              <p className="text-xs text-white/35 mb-5">At cost price · Current snapshot</p>
              {categories.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No categories yet</p>
              ) : (
                <div className="space-y-3">
                  {categories.slice(0, 6).map((c, i) => {
                    const colors = ['#F59E0B', '#2563EB', '#A78BFA', '#06B6D4', '#22C55E', '#EF4444'];
                    const color = colors[i % colors.length];
                    const pct = Math.round(((i + 1) / categories.length) * 60 + 10);
                    return (
                      <div key={c.id} className="flex items-center gap-4">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                        <span className="text-sm text-white/60 w-36 flex-shrink-0 truncate">{c.name}</span>
                        <div className="flex-1 h-7 bg-white/[0.04] rounded-lg overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                            className="absolute inset-y-0 left-0 rounded-lg"
                            style={{ background: `${color}20`, borderRight: `2px solid ${color}` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <ProductDialog
        open={productDialog.open}
        product={productDialog.product}
        categories={categories}
        onClose={() => setProductDialog({ open: false })}
      />
      <WarehouseDialog
        open={warehouseDialog.open}
        warehouse={warehouseDialog.warehouse}
        onClose={() => setWarehouseDialog({ open: false })}
      />
      <AdjustStockDialog
        open={adjustDialog}
        onClose={() => setAdjustDialog(false)}
        products={products}
        warehouses={warehouses}
      />
      <TransferDialog
        open={transferDialog}
        onClose={() => setTransferDialog(false)}
        products={products}
        warehouses={warehouses}
      />
      <TransferStatusDialog
        open={!!tfStatusDialog}
        transfer={tfStatusDialog}
        onClose={() => setTfStatusDialog(null)}
      />
    </AppLayout>
  );
}
