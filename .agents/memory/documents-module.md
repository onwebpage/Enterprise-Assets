---
name: Document Management module
description: Schema, API routes, hooks, and frontend page for the Documents module in OmniERP.
---

## RBAC module name
`"Documents"` — used in `requirePermission(MODULE, ...)` calls.
The admin role has no DB row in `permissions` for this module — access is granted via the bypass that returns all-true for super-admins. This is expected.

## Key route paths (all under `/api/docs`)
- `GET  /my-permissions` — no module guard (fetches by role)
- `GET  /summary` — totals card data
- `GET/POST /folders`, `PUT/DELETE /folders/:id`
- `GET/POST /files`, `GET/PUT/DELETE /files/:id`
- `POST /files/:id/star` — toggle (not PATCH)
- `POST /files/:id/archive` — toggle active↔archived
- `POST /files/:id/move` — body `{ folderId }`
- `GET/POST /files/:id/shares`, `DELETE /files/:id/shares/:shareId`
- `GET /files/:id/versions`

## Download pattern
`DocRow` is a standalone component (not inline in a loop).
`useDocDocument(downloading ? id : null)` is valid — null disables the query.
`fileContent` is base64-encoded; decode with `atob` + `Uint8Array`, cast to `string` first to satisfy TS.

## Demo seed
6 folders (Contracts, Invoices, HR Documents, Financial Reports, Compliance, Product Assets) and 16 documents seeded via `/api/docs/folders` and `/api/docs/files`.

**Why:** psql-applied schema; drizzle-kit push times out.
