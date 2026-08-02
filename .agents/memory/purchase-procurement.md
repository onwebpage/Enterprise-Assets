---
name: Purchase & Procurement module
description: Schema, backend routes, frontend hook/components/page for the Purchase & Procurement module.
---

## Rule
Purchase & Procurement module is fully built and wired. RBAC module name is exactly `"Purchase & Procurement"`.

## Tables (lib/db/src/schema/purchase.ts)
- `purchaseVendors` — vendor master (separate from AP `apVendors`)
- `purchaseOrders` + `purchaseOrderLines` — PO header + line items
- `goodsReceiptNotes` + `goodsReceiptLines` — GRN after receiving goods
- `purchaseRFQs` — request for quotation

## Auto-generated numbers
- `PO-XXXX`, `GRN-XXXX`, `RFQ-XXXX`, `VND-XXXX` — count-based, padded to 4 digits, per orgId.

## Business rules
- Received POs cannot be edited or deleted.
- Accepted GRNs cannot be deleted.
- Converted RFQs cannot be edited or deleted.
- Vendor with existing POs cannot be deleted.
- Creating a GRN updates `purchaseOrderLines.receivedQty` and auto-sets PO status to `partial` or `received`.

## Files
- Backend: `artifacts/api-server/src/routes/purchase.ts`
- Hook: `artifacts/omni-erp/src/hooks/usePurchase.ts`
- Page: `artifacts/omni-erp/src/pages/app/purchase.tsx`
- Components: `artifacts/omni-erp/src/components/app/purchase/` — VendorsTab, OrdersTab, GRNTab, RFQTab, PurchaseOrderFormModal, PurchaseVendorFormModal, PurchaseGRNFormModal, PurchaseRFQFormModal, PurchaseDeleteDialog

**Why:** Module follows the standard ERP architecture pattern used by all other modules in the project.
