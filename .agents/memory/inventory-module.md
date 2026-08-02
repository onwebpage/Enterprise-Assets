---
name: Inventory & Warehouse module
description: Schema, routes, hooks, and page for the Inventory module — tables, API paths, RBAC name, and key business rules.
---

# Inventory & Warehouse Module

## RBAC module name
`"Inventory"` — used in `requirePermission` and the `/my-permissions` endpoint.

## API prefix
`/api/inventory`

## Tables (lib/db/src/schema/inventory.ts)
- `inv_categories` — product category master
- `inv_warehouses` — warehouse/location master (code, capacity, status)
- `inv_products` — SKU master (sku unique per org, costPrice, reorderPoint)
- `inv_stock_levels` — qtyOnHand + qtyReserved per product×warehouse; updated atomically by movements
- `inv_movements` — immutable log; movementNumber auto-generated (MV-XXXX)
- `inv_transfers` — inter-warehouse orders; transferNumber auto-generated (TF-XXXX)
- `inv_transfer_lines` — line items per transfer

## Key business rules
- `stockStatus` is derived server-side in `/stock`: oos (≤0), critical (≤50% reorder), low (≤reorder), ok
- Transfer `completed` status atomically moves stock and logs two movements (FROM/TO with suffix)
- Completed/cancelled transfers are immutable
- Products with on-hand stock cannot be deleted
- Warehouses with stock cannot be deleted
- SKU unique per org; warehouse code unique per org

## Seed
`cd lib/db && pnpm run seed:inventory` — populates demo data (10 products, 4 warehouses, 11 stock rows, 8 movements, 3 transfers)

## Frontend files
- `artifacts/omni-erp/src/hooks/useInventory.ts` — all React Query hooks
- `artifacts/omni-erp/src/pages/app/inventory.tsx` — full page with dialogs

**Why:** drizzle-kit push hangs on interactive tty — pipe empty stdin: `echo "" | npx drizzle-kit push --force`
