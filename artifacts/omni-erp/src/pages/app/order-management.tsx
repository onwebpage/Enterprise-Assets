import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ClipboardList, Clock3, FileText, PackageCheck, Plus,
  RefreshCw, ShoppingCart, Truck, X,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { cn } from "@/lib/utils";
import {
  DELIVERY_STATUSES, QUOTATION_STATUSES, SALES_ORDER_STATUSES,
  useBackOrders, useConvertQuotation, useCreateDelivery, useCreateQuotation,
  useCreateSalesOrder, useDeliveries, useOrderPurchaseOrders, useOrderSummary,
  useQuotations, useSalesOrder, useSalesOrders, type DeliveryStatus,
} from "@/hooks/useOrderManagement";

type Tab = "overview" | "sales" | "quotes" | "deliveries" | "backorders" | "purchases";
const today = new Date().toISOString().slice(0, 10);
const money = (value: string | number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const label = (value: string) => value.replaceAll("_", " ");

function Pill({ value }: { value: string }) {
  const color = value === "fulfilled" || value === "delivered" || value === "accepted"
    ? "bg-emerald-500/12 text-emerald-300 border-emerald-400/20"
    : value === "back_ordered" || value === "failed" || value === "rejected"
      ? "bg-red-500/12 text-red-300 border-red-400/20"
      : value === "partially_delivered" || value === "in_transit" || value === "sent"
        ? "bg-amber-500/12 text-amber-300 border-amber-400/20"
        : "bg-white/[0.06] text-white/55 border-white/[0.1]";
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", color)}>{label(value)}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0b1020] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.07] hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({ label: fieldLabel, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block space-y-1.5"><span className="text-xs text-white/45">{fieldLabel}</span><input {...props} className={cn("h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#2563EB]", props.className)} /></label>;
}

function Select({ label: fieldLabel, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <label className="block space-y-1.5"><span className="text-xs text-white/45">{fieldLabel}</span><select {...props} className="h-9 w-full rounded-lg border border-white/[0.1] bg-[#11182b] px-3 text-sm text-white outline-none focus:border-[#2563EB]">{children}</select></label>;
}

function LineEditor({ line, onChange, onRemove }: { line: any; onChange: (value: any) => void; onRemove?: () => void }) {
  return <div className="grid grid-cols-[1fr_90px_110px_28px] gap-2">
    <Input label="Item / description" value={line.description} onChange={e => onChange({ ...line, description: e.target.value })} placeholder="Product or service" />
    <Input label="Qty" type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => onChange({ ...line, quantity: e.target.value })} />
    <Input label="Unit price" type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => onChange({ ...line, unitPrice: e.target.value })} />
    <button type="button" onClick={onRemove} disabled={!onRemove} className="mt-6 rounded-lg text-white/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-20"><X className="mx-auto h-4 w-4" /></button>
  </div>;
}

function SalesOrderModal({ onClose }: { onClose: () => void }) {
  const create = useCreateSalesOrder();
  const [form, setForm] = useState({ customerName: "", customerEmail: "", orderDate: today, requestedDelivery: "", shippingAddress: "", notes: "", lines: [{ description: "", quantity: "1", unitPrice: "0", taxRate: "0" }] });
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    try { await create.mutateAsync(form); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create order"); }
  };
  return <Modal title="New sales order" onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-2 gap-3"><Input required label="Customer name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Customer or account" /><Input label="Customer email" type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="name@company.com" /><Input required label="Order date" type="date" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} /><Input label="Requested delivery" type="date" value={form.requestedDelivery} onChange={e => setForm({ ...form, requestedDelivery: e.target.value })} /></div>
    <Input label="Shipping address" value={form.shippingAddress} onChange={e => setForm({ ...form, shippingAddress: e.target.value })} placeholder="Destination address" />
    <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-medium text-white/70">Order lines</p><button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, { description: "", quantity: "1", unitPrice: "0", taxRate: "0" }] })} className="flex items-center gap-1 text-xs text-[#60a5fa]"><Plus className="h-3 w-3" />Add line</button></div>{form.lines.map((line, i) => <LineEditor key={i} line={line} onChange={value => setForm({ ...form, lines: form.lines.map((item, index) => index === i ? value : item) })} onRemove={form.lines.length > 1 ? () => setForm({ ...form, lines: form.lines.filter((_, index) => index !== i) }) : undefined} />)}</div>
    {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/50 hover:bg-white/[0.06]">Cancel</button><button disabled={create.isPending} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{create.isPending ? "Saving..." : "Create order"}</button></div>
  </form></Modal>;
}

function QuoteModal({ onClose }: { onClose: () => void }) {
  const create = useCreateQuotation();
  const [form, setForm] = useState({ customerName: "", customerEmail: "", quoteDate: today, expiryDate: "", notes: "", lines: [{ description: "", quantity: "1", unitPrice: "0", taxRate: "0" }] });
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); try { await create.mutateAsync(form); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create quotation"); } };
  return <Modal title="New quotation" onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-2 gap-3"><Input required label="Customer name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} /><Input label="Customer email" type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} /><Input required label="Quote date" type="date" value={form.quoteDate} onChange={e => setForm({ ...form, quoteDate: e.target.value })} /><Input label="Expiry date" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
    <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-medium text-white/70">Quotation lines</p><button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, { description: "", quantity: "1", unitPrice: "0", taxRate: "0" }] })} className="flex items-center gap-1 text-xs text-[#60a5fa]"><Plus className="h-3 w-3" />Add line</button></div>{form.lines.map((line, i) => <LineEditor key={i} line={line} onChange={value => setForm({ ...form, lines: form.lines.map((item, index) => index === i ? value : item) })} onRemove={form.lines.length > 1 ? () => setForm({ ...form, lines: form.lines.filter((_, index) => index !== i) }) : undefined} />)}</div>
    {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/50 hover:bg-white/[0.06]">Cancel</button><button disabled={create.isPending} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">{create.isPending ? "Saving..." : "Create quotation"}</button></div>
  </form></Modal>;
}

function DeliveryModal({ onClose }: { onClose: () => void }) {
  const { data: ordersRes } = useSalesOrders();
  const [orderId, setOrderId] = useState<number | null>(null);
  const { data: detailRes } = useSalesOrder(orderId);
  const create = useCreateDelivery();
  const order = detailRes?.data;
  const [form, setForm] = useState({ dispatchDate: today, estimatedDate: "", carrier: "", trackingNumber: "", status: "in_transit" as DeliveryStatus, quantity: "" });
  const [error, setError] = useState("");
  const selectedLine = order?.lines?.find(line => Number(line.orderedQty) > Number(line.deliveredQty));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!orderId || !selectedLine) { setError("Select an order with an outstanding line."); return; }
    try { await create.mutateAsync({ salesOrderId: orderId, ...form, estimatedDate: form.estimatedDate || null, lines: [{ salesOrderLineId: selectedLine.id, quantity: form.quantity || String(Number(selectedLine.orderedQty) - Number(selectedLine.deliveredQty)) }] }); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create delivery"); }
  };
  return <Modal title="Record delivery" onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <Select label="Sales order" value={orderId ?? ""} onChange={e => setOrderId(Number(e.target.value) || null)}><option value="">Select an order</option>{(ordersRes?.data ?? []).filter(orderRow => !["fulfilled", "cancelled"].includes(orderRow.status)).map(orderRow => <option key={orderRow.id} value={orderRow.id}>{orderRow.orderNumber} · {orderRow.customerName}</option>)}</Select>
    {selectedLine && <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-white/60"><p className="font-medium text-white">{selectedLine.description}</p><p className="mt-1">Remaining: <strong className="text-amber-300">{Number(selectedLine.orderedQty) - Number(selectedLine.deliveredQty)}</strong> {selectedLine.unit}</p></div>}
    <div className="grid grid-cols-2 gap-3"><Input required label="Dispatch date" type="date" value={form.dispatchDate} onChange={e => setForm({ ...form, dispatchDate: e.target.value })} /><Input label="Estimated delivery" type="date" value={form.estimatedDate} onChange={e => setForm({ ...form, estimatedDate: e.target.value })} /><Input label="Quantity delivered" type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="All remaining" /><Select label="Tracking status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as DeliveryStatus })}>{DELIVERY_STATUSES.map(status => <option key={status} value={status}>{label(status)}</option>)}</Select><Input label="Carrier" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="DHL, FedEx, own fleet" /><Input label="Tracking number" value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} /></div>
    {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/50 hover:bg-white/[0.06]">Cancel</button><button disabled={create.isPending} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">{create.isPending ? "Saving..." : "Record delivery"}</button></div>
  </form></Modal>;
}

function Overview({ onTab }: { onTab: (tab: Tab) => void }) {
  const { data, isLoading } = useOrderSummary();
  const summary = data?.data;
  const cards: Array<{ name: string; value: string | number; icon: React.ElementType; color: string }> = [
    { name: "Open sales orders", value: summary?.openSalesOrders ?? 0, icon: ClipboardList, color: "text-blue-300 bg-blue-500/10" },
    { name: "Sales order value", value: money(summary?.salesValue ?? "0"), icon: ShoppingCart, color: "text-violet-300 bg-violet-500/10" },
    { name: "Active deliveries", value: summary?.activeDeliveries ?? 0, icon: Truck, color: "text-emerald-300 bg-emerald-500/10" },
    { name: "Back-order lines", value: summary?.backOrders ?? 0, icon: Clock3, color: "text-amber-300 bg-amber-500/10" },
  ];
  return <div className="space-y-5"><div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(({ name, value, icon: Icon, color }) => <div key={name} className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-4"><div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", color)}><Icon className="h-4 w-4" /></div><p className="text-xs text-white/40">{name}</p><p className="mt-1 text-2xl font-bold text-white">{isLoading ? "—" : value}</p></div>)}</div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><button onClick={() => onTab("sales")} className="rounded-xl border border-blue-400/15 bg-blue-500/[0.06] p-4 text-left hover:bg-blue-500/10"><p className="text-sm font-semibold text-blue-200">Create sales order</p><p className="mt-1 text-xs text-white/40">Capture demand and track fulfillment.</p></button><button onClick={() => onTab("quotes")} className="rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-4 text-left hover:bg-violet-500/10"><p className="text-sm font-semibold text-violet-200">Start from quotation</p><p className="mt-1 text-xs text-white/40">Convert an accepted quote into an order.</p></button><button onClick={() => onTab("deliveries")} className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 text-left hover:bg-emerald-500/10"><p className="text-sm font-semibold text-emerald-200">Track deliveries</p><p className="mt-1 text-xs text-white/40">Record partial shipments and tracking numbers.</p></button></div>
  </div>;
}

export default function OrderManagement() {
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<"sales" | "quote" | "delivery" | null>(null);
  const sales = useSalesOrders();
  const quotes = useQuotations();
  const deliveries = useDeliveries();
  const backorders = useBackOrders();
  const purchases = useOrderPurchaseOrders();
  const convert = useConvertQuotation();
  const tabs: [Tab, string][] = [["overview", "Overview"], ["sales", "Sales Orders"], ["quotes", "Quotations"], ["deliveries", "Delivery Tracking"], ["backorders", "Back-orders"], ["purchases", "Purchase Orders"]];
  const openSales = useMemo(() => (sales.data?.data ?? []).filter(order => !["fulfilled", "cancelled"].includes(order.status)), [sales.data]);
  return <AppLayout breadcrumbs={[{ label: "Operations" }, { label: "Order Management" }]}>
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-tight text-white">Advanced Order Management</h1><p className="mt-1 text-sm text-white/40">Control the full order lifecycle from quotation to delivery.</p></div><div className="flex gap-2"><button onClick={() => setModal("quote")} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-white/65 hover:bg-white/[0.06]"><FileText className="h-3.5 w-3.5" />New quotation</button><button onClick={() => setModal("sales")} className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"><Plus className="h-3.5 w-3.5" />New sales order</button></div></div>
      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07]">{tabs.map(([id, name]) => <button key={id} onClick={() => setTab(id)} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm capitalize", tab === id ? "border-[#2563EB] text-white" : "border-transparent text-white/40 hover:text-white/70")}>{name}</button>)}</div>
      <motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "overview" && <Overview onTab={setTab} />}
        {tab === "sales" && <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><div className="flex items-center justify-between border-b border-white/[0.06] p-4"><div><h2 className="text-sm font-semibold text-white">Sales orders</h2><p className="text-xs text-white/35">Statuses update as deliveries are recorded.</p></div><button onClick={() => setModal("sales")} className="flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />New order</button></div><div className="overflow-x-auto"><table className="w-full min-w-[780px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wide text-white/30">{["Order", "Customer", "Date", "Requested", "Value", "Fulfillment", "Status"].map(head => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{(sales.data?.data ?? []).map(order => <tr key={order.id} className="border-b border-white/[0.04] text-sm"><td className="px-4 py-3 font-mono text-blue-300">{order.orderNumber}</td><td className="px-4 py-3 text-white/75">{order.customerName}</td><td className="px-4 py-3 text-white/45">{order.orderDate}</td><td className="px-4 py-3 text-white/45">{order.requestedDelivery ?? "—"}</td><td className="px-4 py-3 font-medium text-white">{money(order.totalAmount)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full bg-blue-400" style={{ width: `${order.fulfillment?.percent ?? 0}%` }} /></div><span className="text-[11px] text-white/45">{order.fulfillment?.percent ?? 0}%</span></div></td><td className="px-4 py-3"><Pill value={order.status} /></td></tr>)}{!sales.data?.data?.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">No sales orders yet. Create one or convert a quotation.</td></tr>}</tbody></table></div></div>}
        {tab === "quotes" && <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><div className="flex items-center justify-between border-b border-white/[0.06] p-4"><div><h2 className="text-sm font-semibold text-white">Quotations</h2><p className="text-xs text-white/35">Convert open quotations into confirmed sales orders.</p></div><button onClick={() => setModal("quote")} className="flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />New quotation</button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wide text-white/30">{["Quotation", "Customer", "Quote date", "Expiry", "Value", "Status", ""].map(head => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{(quotes.data?.data ?? []).map(quote => <tr key={quote.id} className="border-b border-white/[0.04] text-sm"><td className="px-4 py-3 font-mono text-violet-300">{quote.quoteNumber}</td><td className="px-4 py-3 text-white/75">{quote.customerName}</td><td className="px-4 py-3 text-white/45">{quote.quoteDate}</td><td className="px-4 py-3 text-white/45">{quote.expiryDate ?? "—"}</td><td className="px-4 py-3 font-medium text-white">{money(quote.totalAmount)}</td><td className="px-4 py-3"><Pill value={quote.status} /></td><td className="px-4 py-3 text-right">{!["converted", "rejected", "expired"].includes(quote.status) && <button disabled={convert.isPending} onClick={() => convert.mutate(quote.id)} className="inline-flex items-center gap-1 rounded-lg border border-blue-400/20 px-2.5 py-1.5 text-[11px] text-blue-300 hover:bg-blue-500/10"><ArrowRight className="h-3 w-3" />Convert</button>}</td></tr>)}{!quotes.data?.data?.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">No quotations yet.</td></tr>}</tbody></table></div></div>}
        {tab === "deliveries" && <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><div className="flex items-center justify-between border-b border-white/[0.06] p-4"><div><h2 className="text-sm font-semibold text-white">Delivery tracking</h2><p className="text-xs text-white/35">Every delivery updates the order fulfillment and back-order balance.</p></div><button onClick={() => setModal("delivery")} disabled={!openSales.length} className="flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Record delivery</button></div><div className="overflow-x-auto"><table className="w-full min-w-[780px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wide text-white/30">{["Delivery", "Order", "Customer", "Dispatch", "ETA", "Carrier / tracking", "Status"].map(head => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{(deliveries.data?.data ?? []).map(delivery => <tr key={delivery.id} className="border-b border-white/[0.04] text-sm"><td className="px-4 py-3 font-mono text-emerald-300">{delivery.deliveryNumber}</td><td className="px-4 py-3 text-blue-300">{delivery.orderNumber}</td><td className="px-4 py-3 text-white/70">{delivery.customerName}</td><td className="px-4 py-3 text-white/45">{delivery.dispatchDate}</td><td className="px-4 py-3 text-white/45">{delivery.estimatedDate ?? "—"}</td><td className="px-4 py-3 text-white/50">{delivery.carrier ?? "—"}{delivery.trackingNumber && <span className="block text-[11px] text-white/30">{delivery.trackingNumber}</span>}</td><td className="px-4 py-3"><Pill value={delivery.status} /></td></tr>)}{!deliveries.data?.data?.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">No deliveries recorded.</td></tr>}</tbody></table></div></div>}
        {tab === "backorders" && <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><div className="border-b border-white/[0.06] p-4"><h2 className="text-sm font-semibold text-white">Back-orders and outstanding quantities</h2><p className="text-xs text-white/35">Live remaining quantities across every sales order.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wide text-white/30">{["Order", "Customer", "Item", "Ordered", "Delivered", "Remaining", "Requested date", "Status"].map(head => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{(backorders.data?.data ?? []).map(row => <tr key={row.id} className="border-b border-white/[0.04] text-sm"><td className="px-4 py-3 font-mono text-blue-300">{row.orderNumber}</td><td className="px-4 py-3 text-white/70">{row.customerName}</td><td className="px-4 py-3 text-white/70">{row.description}</td><td className="px-4 py-3 text-white/45">{row.orderedQty} {row.unit}</td><td className="px-4 py-3 text-white/45">{row.deliveredQty} {row.unit}</td><td className="px-4 py-3 font-semibold text-amber-300">{row.remainingQty} {row.unit}</td><td className="px-4 py-3 text-white/45">{row.requestedDelivery ?? "—"}</td><td className="px-4 py-3"><Pill value={row.orderStatus} /></td></tr>)}{!backorders.data?.data?.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-white/30">No outstanding quantities.</td></tr>}</tbody></table></div></div>}
        {tab === "purchases" && <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1e]"><div className="flex items-center justify-between border-b border-white/[0.06] p-4"><div><h2 className="text-sm font-semibold text-white">Purchase orders</h2><p className="text-xs text-white/35">Inbound orders from the existing Purchase & Procurement module.</p></div><a href="/app/purchase" className="flex items-center gap-1 text-xs text-blue-300">Open procurement <ArrowRight className="h-3 w-3" /></a></div><div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wide text-white/30">{["PO", "Vendor", "Order date", "Expected", "Value", "Status"].map(head => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{(purchases.data?.data ?? []).map(order => <tr key={order.id} className="border-b border-white/[0.04] text-sm"><td className="px-4 py-3 font-mono text-blue-300">{order.poNumber}</td><td className="px-4 py-3 text-white/70">{order.vendorName}</td><td className="px-4 py-3 text-white/45">{order.orderDate}</td><td className="px-4 py-3 text-white/45">{order.expectedDelivery ?? "—"}</td><td className="px-4 py-3 font-medium text-white">{money(order.totalAmount)}</td><td className="px-4 py-3"><Pill value={order.status} /></td></tr>)}{!purchases.data?.data?.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-white/30">No purchase orders yet.</td></tr>}</tbody></table></div></div>}
      </motion.div>
    </div>
    {modal === "sales" && <SalesOrderModal onClose={() => setModal(null)} />}
    {modal === "quote" && <QuoteModal onClose={() => setModal(null)} />}
    {modal === "delivery" && <DeliveryModal onClose={() => setModal(null)} />}
  </AppLayout>;
}