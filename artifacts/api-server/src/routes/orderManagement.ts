/**
 * /api/order-management — Advanced Order Management
 *
 * Sales orders, customer quotations, quotation conversion, delivery tracking,
 * partial delivery, back-order visibility, and purchase-order visibility.
 */
import { Router } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db, permissions, roles, purchaseOrders, purchaseVendors,
  orderQuotations, orderQuotationLines, orderSalesOrders,
  orderSalesOrderLines, orderDeliveries, orderDeliveryLines,
} from "@workspace/db";
import {
  insertQuotationSchema, insertSalesOrderSchema, updateSalesOrderSchema,
  insertDeliverySchema, updateDeliverySchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Order Management";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => value.toFixed(2);

async function nextNumber(table: any, column: any, orgId: number, prefix: string) {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(table).where(eq(table.orgId, orgId));
  return `${prefix}-${String((row?.count ?? 0) + 1).padStart(4, "0")}`;
}

function calculateLines(lines: Array<{ itemCode?: string | null; description: string; unit?: string; quantity?: string; unitPrice?: string; taxRate?: string; sequence?: number }>) {
  let subtotal = 0;
  const values = lines.map((line, index) => {
    const quantity = Number(line.quantity ?? "1");
    const unitPrice = Number(line.unitPrice ?? "0");
    const taxRate = Number(line.taxRate ?? "0");
    const amount = quantity * unitPrice;
    const taxAmount = amount * taxRate / 100;
    subtotal += amount;
    return {
      itemCode: line.itemCode ?? null,
      description: line.description,
      unit: line.unit ?? "pcs",
      quantity: String(quantity),
      unitPrice: money(unitPrice),
      taxRate: taxRate.toFixed(4),
      taxAmount: money(taxAmount),
      amount: money(amount),
      totalAmount: money(amount + taxAmount),
      sequence: line.sequence ?? index,
    };
  });
  return { values, subtotal };
}

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [permission] = await db.select().from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`)).limit(1);
    res.json({ success: true, data: permission
      ? { canView: permission.canView, canCreate: permission.canCreate, canEdit: permission.canEdit, canDelete: permission.canDelete }
      : { canView: false, canCreate: false, canEdit: false, canDelete: false } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const [[sales], [quotes], [deliveries], [backorders], [purchases]] = await Promise.all([
      db.select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where status not in ('fulfilled','cancelled'))::int`,
        value: sql<string>`coalesce(sum(total_amount) filter (where status not in ('cancelled')), 0)::text`,
      }).from(orderSalesOrders).where(eq(orderSalesOrders.orgId, orgId)),
      db.select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where status in ('draft','sent'))::int`,
      }).from(orderQuotations).where(eq(orderQuotations.orgId, orgId)),
      db.select({ active: sql<number>`count(*) filter (where status not in ('delivered','failed'))::int` })
        .from(orderDeliveries).where(eq(orderDeliveries.orgId, orgId)),
      db.select({ total: sql<number>`count(*)::int` }).from(orderSalesOrderLines)
        .innerJoin(orderSalesOrders, eq(orderSalesOrderLines.salesOrderId, orderSalesOrders.id))
        .where(and(eq(orderSalesOrders.orgId, orgId), sql`${orderSalesOrderLines.orderedQty} > ${orderSalesOrderLines.deliveredQty}`)),
      db.select({ total: sql<number>`count(*)::int` }).from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId)),
    ]);
    res.json({ success: true, data: {
      salesOrders: sales.total, openSalesOrders: sales.open, salesValue: sales.value,
      quotations: quotes.total, pendingQuotations: quotes.pending,
      activeDeliveries: deliveries.active, backOrders: backorders.total, purchaseOrders: purchases.total,
    }});
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch order management summary" });
  }
});

router.get("/sales-orders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filters: any[] = [eq(orderSalesOrders.orgId, orgId)];
    if (status) filters.push(eq(orderSalesOrders.status, status));
    if (search) filters.push(or(ilike(orderSalesOrders.orderNumber, `%${search}%`), ilike(orderSalesOrders.customerName, `%${search}%`)));
    const rows = await db.select().from(orderSalesOrders).where(and(...filters)).orderBy(desc(orderSalesOrders.createdAt));
    const ids = rows.map(row => row.id);
    const lineCounts = ids.length ? await db.select({
      salesOrderId: orderSalesOrderLines.salesOrderId,
      ordered: sql<string>`coalesce(sum(${orderSalesOrderLines.orderedQty}), 0)::text`,
      delivered: sql<string>`coalesce(sum(${orderSalesOrderLines.deliveredQty}), 0)::text`,
    }).from(orderSalesOrderLines).where(sql`${orderSalesOrderLines.salesOrderId} = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .groupBy(orderSalesOrderLines.salesOrderId) : [];
    const progress = Object.fromEntries(lineCounts.map(row => [row.salesOrderId, {
      ordered: row.ordered, delivered: row.delivered,
      percent: Number(row.ordered) ? Math.min(100, Math.round(Number(row.delivered) / Number(row.ordered) * 100)) : 0,
    }]));
    res.json({ success: true, data: rows.map(row => ({ ...row, fulfillment: progress[row.id] ?? { ordered: "0", delivered: "0", percent: 0 } })), total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch sales orders" });
  }
});

router.get("/sales-orders/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [order] = await db.select().from(orderSalesOrders)
      .where(and(eq(orderSalesOrders.id, id), eq(orderSalesOrders.orgId, req.user!.orgId!))).limit(1);
    if (!order) { res.status(404).json({ success: false, error: "Sales order not found" }); return; }
    const [lines, deliveries] = await Promise.all([
      db.select().from(orderSalesOrderLines).where(eq(orderSalesOrderLines.salesOrderId, id)).orderBy(orderSalesOrderLines.sequence),
      db.select().from(orderDeliveries).where(eq(orderDeliveries.salesOrderId, id)).orderBy(desc(orderDeliveries.createdAt)),
    ]);
    res.json({ success: true, data: { ...order, lines, deliveries } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch sales order" });
  }
});

router.post("/sales-orders", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertSalesOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const { values, subtotal } = calculateLines(d.lines);
    const taxAmount = values.reduce((sum, line) => sum + Number(line.taxAmount), 0);
    const created = await db.transaction(async tx => {
      const [order] = await tx.insert(orderSalesOrders).values({
        orgId, orderNumber: await nextNumber(orderSalesOrders, orderSalesOrders.orderNumber, orgId, "SO"),
        quotationId: d.quotationId ?? null, customerName: d.customerName, customerEmail: d.customerEmail ?? null,
        orderDate: d.orderDate, requestedDelivery: d.requestedDelivery ?? null, shippingAddress: d.shippingAddress ?? null,
        currency: d.currency ?? "INR", subtotal: money(subtotal), taxAmount: money(taxAmount), totalAmount: money(subtotal + taxAmount),
        status: d.status ?? "draft", paymentStatus: d.paymentStatus ?? "pending", notes: d.notes ?? null, createdBy: req.user!.userId,
      }).returning();
      const lines = await tx.insert(orderSalesOrderLines).values(values.map(line => ({
        salesOrderId: order.id, itemCode: line.itemCode, description: line.description, unit: line.unit,
        orderedQty: line.quantity, deliveredQty: "0", unitPrice: line.unitPrice, taxRate: line.taxRate,
        taxAmount: line.taxAmount, amount: line.amount, totalAmount: line.totalAmount, sequence: line.sequence,
      }))).returning();
      return { ...order, lines };
    });
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create sales order" });
  }
});

router.put("/sales-orders/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateSalesOrderSchema.safeParse(req.body);
  if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select().from(orderSalesOrders).where(and(eq(orderSalesOrders.id, id), eq(orderSalesOrders.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Sales order not found" }); return; }
    if (!["draft", "confirmed"].includes(existing.status) && parsed.data.lines) {
      res.status(409).json({ success: false, error: "Only draft or confirmed orders can have lines edited." }); return;
    }
    const d = parsed.data;
    const updates: any = { updatedAt: new Date() };
    for (const key of ["customerName", "customerEmail", "orderDate", "requestedDelivery", "shippingAddress", "currency", "status", "paymentStatus", "notes"] as const) {
      if (d[key] !== undefined) updates[key] = d[key];
    }
    if (d.lines) {
      const { values, subtotal } = calculateLines(d.lines);
      const taxAmount = values.reduce((sum, line) => sum + Number(line.taxAmount), 0);
      updates.subtotal = money(subtotal); updates.taxAmount = money(taxAmount); updates.totalAmount = money(subtotal + taxAmount);
      await db.delete(orderSalesOrderLines).where(eq(orderSalesOrderLines.salesOrderId, id));
      await db.insert(orderSalesOrderLines).values(values.map(line => ({
        salesOrderId: id, itemCode: line.itemCode, description: line.description, unit: line.unit,
        orderedQty: line.quantity, deliveredQty: "0", unitPrice: line.unitPrice, taxRate: line.taxRate,
        taxAmount: line.taxAmount, amount: line.amount, totalAmount: line.totalAmount, sequence: line.sequence,
      })));
    }
    const [updated] = await db.update(orderSalesOrders).set(updates).where(eq(orderSalesOrders.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update sales order" });
  }
});

router.delete("/sales-orders/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [order] = await db.select({ id: orderSalesOrders.id, status: orderSalesOrders.status }).from(orderSalesOrders)
      .where(and(eq(orderSalesOrders.id, id), eq(orderSalesOrders.orgId, req.user!.orgId!))).limit(1);
    if (!order) { res.status(404).json({ success: false, error: "Sales order not found" }); return; }
    if (order.status !== "draft") { res.status(409).json({ success: false, error: "Only draft orders can be deleted." }); return; }
    await db.delete(orderSalesOrders).where(eq(orderSalesOrders.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete sales order" });
  }
});

router.get("/quotations", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const search = String(req.query.search ?? "").trim();
    const filters: any[] = [eq(orderQuotations.orgId, orgId)];
    if (search) filters.push(or(ilike(orderQuotations.quoteNumber, `%${search}%`), ilike(orderQuotations.customerName, `%${search}%`)));
    const rows = await db.select().from(orderQuotations).where(and(...filters)).orderBy(desc(orderQuotations.createdAt));
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch quotations" });
  }
});

router.post("/quotations", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertQuotationSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const { values, subtotal } = calculateLines(d.lines);
    const taxAmount = values.reduce((sum, line) => sum + Number(line.taxAmount), 0);
    const created = await db.transaction(async tx => {
      const [quote] = await tx.insert(orderQuotations).values({
        orgId, quoteNumber: await nextNumber(orderQuotations, orderQuotations.quoteNumber, orgId, "QT"),
        customerName: d.customerName, customerEmail: d.customerEmail ?? null, quoteDate: d.quoteDate,
        expiryDate: d.expiryDate ?? null, currency: d.currency ?? "INR", subtotal: money(subtotal),
        taxAmount: money(taxAmount), totalAmount: money(subtotal + taxAmount), status: d.status ?? "draft",
        notes: d.notes ?? null, createdBy: req.user!.userId,
      }).returning();
      const lines = await tx.insert(orderQuotationLines).values(values.map(line => ({
        quotationId: quote.id, ...line,
      }))).returning();
      return { ...quote, lines };
    });
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create quotation" });
  }
});

router.post("/quotations/:id/convert", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const result = await db.transaction(async tx => {
      const [quote] = await tx.select().from(orderQuotations)
        .where(and(eq(orderQuotations.id, id), eq(orderQuotations.orgId, orgId))).limit(1);
      if (!quote) throw new Error("Quotation not found");
      if (quote.status === "converted" || quote.convertedOrderId) throw new Error("Quotation has already been converted");
      if (quote.status === "rejected" || quote.status === "expired") throw new Error("Only open quotations can be converted");
      const lines = await tx.select().from(orderQuotationLines).where(eq(orderQuotationLines.quotationId, id)).orderBy(orderQuotationLines.sequence);
      const [order] = await tx.insert(orderSalesOrders).values({
        orgId, orderNumber: await nextNumber(orderSalesOrders, orderSalesOrders.orderNumber, orgId, "SO"),
        quotationId: quote.id, customerName: quote.customerName, customerEmail: quote.customerEmail,
        orderDate: today(), currency: quote.currency, subtotal: quote.subtotal, taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount, status: "confirmed", paymentStatus: "pending", notes: quote.notes, createdBy: req.user!.userId,
      }).returning();
      await tx.insert(orderSalesOrderLines).values(lines.map(line => ({
        salesOrderId: order.id, itemCode: line.itemCode, description: line.description, unit: line.unit,
        orderedQty: line.quantity, deliveredQty: "0", unitPrice: line.unitPrice, taxRate: line.taxRate,
        taxAmount: line.taxAmount, amount: line.amount, totalAmount: line.totalAmount, sequence: line.sequence,
      })));
      await tx.update(orderQuotations).set({ status: "converted", convertedOrderId: order.id, updatedAt: new Date() }).where(eq(orderQuotations.id, id));
      return order;
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to convert quotation";
    res.status(message.includes("not found") ? 404 : 409).json({ success: false, error: message });
  }
});

router.get("/deliveries", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: orderDeliveries.id, deliveryNumber: orderDeliveries.deliveryNumber,
      salesOrderId: orderDeliveries.salesOrderId, orderNumber: orderSalesOrders.orderNumber,
      customerName: orderSalesOrders.customerName, dispatchDate: orderDeliveries.dispatchDate,
      estimatedDate: orderDeliveries.estimatedDate, actualDate: orderDeliveries.actualDate,
      carrier: orderDeliveries.carrier, trackingNumber: orderDeliveries.trackingNumber,
      status: orderDeliveries.status, notes: orderDeliveries.notes, createdAt: orderDeliveries.createdAt,
    }).from(orderDeliveries).innerJoin(orderSalesOrders, eq(orderDeliveries.salesOrderId, orderSalesOrders.id))
      .where(eq(orderDeliveries.orgId, req.user!.orgId!)).orderBy(desc(orderDeliveries.createdAt));
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch deliveries" });
  }
});

router.post("/deliveries", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertDeliverySchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const d = parsed.data;
    const created = await db.transaction(async tx => {
      const [order] = await tx.select().from(orderSalesOrders)
        .where(and(eq(orderSalesOrders.id, d.salesOrderId), eq(orderSalesOrders.orgId, orgId))).limit(1);
      if (!order) throw new Error("Sales order not found");
      if (order.status === "cancelled" || order.status === "fulfilled") throw new Error("This order cannot receive another delivery");
      const orderLines = await tx.select().from(orderSalesOrderLines).where(eq(orderSalesOrderLines.salesOrderId, d.salesOrderId));
      const lineMap = new Map(orderLines.map(line => [line.id, line]));
      for (const line of d.lines) {
        const source = lineMap.get(line.salesOrderLineId);
        if (!source) throw new Error("Delivery line does not belong to this order");
        const remaining = Number(source.orderedQty) - Number(source.deliveredQty);
        if (Number(line.quantity) <= 0 || Number(line.quantity) > remaining) {
          throw new Error(`${source.description}: delivery quantity exceeds remaining quantity (${remaining})`);
        }
      }
      const [delivery] = await tx.insert(orderDeliveries).values({
        orgId, salesOrderId: d.salesOrderId,
        deliveryNumber: await nextNumber(orderDeliveries, orderDeliveries.deliveryNumber, orgId, "DEL"),
        dispatchDate: d.dispatchDate, estimatedDate: d.estimatedDate ?? null, actualDate: d.actualDate ?? null,
        carrier: d.carrier ?? null, trackingNumber: d.trackingNumber ?? null, status: d.status ?? "pending",
        notes: d.notes ?? null, createdBy: req.user!.userId,
      }).returning();
      await tx.insert(orderDeliveryLines).values(d.lines.map(line => ({
        deliveryId: delivery.id, salesOrderLineId: line.salesOrderLineId, quantity: line.quantity,
      })));
      for (const line of d.lines) {
        const source = lineMap.get(line.salesOrderLineId)!;
        const delivered = Number(source.deliveredQty) + Number(line.quantity);
        await tx.update(orderSalesOrderLines).set({ deliveredQty: String(delivered) }).where(eq(orderSalesOrderLines.id, source.id));
      }
      const fresh = await tx.select().from(orderSalesOrderLines).where(eq(orderSalesOrderLines.salesOrderId, d.salesOrderId));
      const allDelivered = fresh.every(line => Number(line.deliveredQty) >= Number(line.orderedQty));
      const anyDelivered = fresh.some(line => Number(line.deliveredQty) > 0);
      const hasPastDueBalance = order.requestedDelivery && order.requestedDelivery < today() && !allDelivered;
      await tx.update(orderSalesOrders).set({
        status: allDelivered ? "fulfilled" : hasPastDueBalance ? "back_ordered" : anyDelivered ? "partially_delivered" : order.status,
        updatedAt: new Date(),
      }).where(eq(orderSalesOrders.id, order.id));
      return delivery;
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create delivery";
    res.status(message.includes("not found") ? 404 : 409).json({ success: false, error: message });
  }
});

router.put("/deliveries/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateDeliverySchema.safeParse(req.body);
  if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: orderDeliveries.id }).from(orderDeliveries)
      .where(and(eq(orderDeliveries.id, id), eq(orderDeliveries.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Delivery not found" }); return; }
    const [updated] = await db.update(orderDeliveries).set({ ...parsed.data, updatedAt: new Date() }).where(eq(orderDeliveries.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update delivery" });
  }
});

router.get("/back-orders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: orderSalesOrderLines.id, salesOrderId: orderSalesOrders.id, orderNumber: orderSalesOrders.orderNumber,
      customerName: orderSalesOrders.customerName, requestedDelivery: orderSalesOrders.requestedDelivery,
      orderStatus: orderSalesOrders.status, itemCode: orderSalesOrderLines.itemCode,
      description: orderSalesOrderLines.description, unit: orderSalesOrderLines.unit,
      orderedQty: orderSalesOrderLines.orderedQty, deliveredQty: orderSalesOrderLines.deliveredQty,
      remainingQty: sql<string>`${orderSalesOrderLines.orderedQty} - ${orderSalesOrderLines.deliveredQty}`,
    }).from(orderSalesOrderLines).innerJoin(orderSalesOrders, eq(orderSalesOrderLines.salesOrderId, orderSalesOrders.id))
      .where(and(eq(orderSalesOrders.orgId, req.user!.orgId!), sql`${orderSalesOrderLines.orderedQty} > ${orderSalesOrderLines.deliveredQty}`))
      .orderBy(orderSalesOrders.requestedDelivery);
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch back-orders" });
  }
});

router.get("/purchase-orders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: purchaseOrders.id, poNumber: purchaseOrders.poNumber, vendorName: purchaseVendors.name,
      orderDate: purchaseOrders.orderDate, expectedDelivery: purchaseOrders.expectedDelivery,
      totalAmount: purchaseOrders.totalAmount, status: purchaseOrders.status,
    }).from(purchaseOrders).innerJoin(purchaseVendors, eq(purchaseOrders.vendorId, purchaseVendors.id))
      .where(eq(purchaseOrders.orgId, req.user!.orgId!)).orderBy(desc(purchaseOrders.createdAt));
    res.json({ success: true, data: rows, total: rows.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch purchase orders" });
  }
});

export default router;