---
name: Master Data Management
description: Architecture and safety rules for the Administration master-data module.
---

Master Data Management intentionally operates on the existing AR, AP, and Inventory
tables rather than introducing duplicate records. Every route must scope reads and
mutations to the authenticated organization, validate normalized inputs, and protect
records referenced by transactions or inventory activity from deletion.

**Why:** Master records are shared by downstream accounting and inventory workflows;
duplicate models would create inconsistent customer, vendor, product, and warehouse
data, while destructive deletes would break historical transactions.

**How to apply:** Keep the RBAC module name exactly `Master Data Management`, preserve
the per-action permissions, maintain case-insensitive organization-scoped uniqueness,
and write non-blocking audit events for successful mutations.