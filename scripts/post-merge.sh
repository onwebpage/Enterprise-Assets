#!/bin/bash
# Runs automatically after every task merge.
# Uses 'push' (no --force) so any destructive schema change fails here
# and requires an operator to run scripts/setup.sh with FORCE_DB_PUSH=true.
set -e
DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"
if [ -z "$DB_URL" ]; then
  echo "SUPABASE_DB_URL or DATABASE_URL must be set."
  exit 1
fi
pnpm install --frozen-lockfile
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react
pnpm --filter @workspace/db run push
# Ensure all supplemental module tables exist (idempotent CREATE TABLE IF NOT EXISTS)
for schema_file in scripts/setup-*.sql; do
  psql "$DB_URL" -f "$schema_file"
done
