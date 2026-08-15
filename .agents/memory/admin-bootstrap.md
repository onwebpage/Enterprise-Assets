---
name: Admin bootstrap
description: Reliable initialization path for the standalone super-admin tables and default feature catalog.
---

The canonical initialization path for standalone administration data is the idempotent SQL bootstrap used by `scripts/setup.sh`: create the admin tables first, then seed the super-admin account and default feature/integration data.

**Why:** The standalone TypeScript admin seed script assumes package resolution for database dependencies that is not reliable when invoked from the workspace root in this imported pnpm layout. The SQL bootstrap is already designed to be rerun safely.

**How to apply:** When admin tables or default feature flags are missing after a destructive schema sync, run the existing admin setup SQL and its idempotent seed statements before debugging the admin UI or API.