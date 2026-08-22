#!/bin/bash
# Runs automatically after every task merge.
# Uses 'push' (no --force) so any destructive schema change fails here
# and requires an operator to run scripts/setup.sh with FORCE_DB_PUSH=true.
set -e
pnpm install --frozen-lockfile
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react
pnpm --filter @workspace/db run push
# Ensure admin tables exist (idempotent CREATE TABLE IF NOT EXISTS)
psql "$DATABASE_URL" -f scripts/setup-admin-db.sql
# Ensure WMS tables exist (idempotent CREATE TABLE IF NOT EXISTS)
psql "$DATABASE_URL" -f scripts/setup-wms.sql
# Ensure Budget & Cost tables exist (idempotent CREATE TABLE IF NOT EXISTS)
psql "$DATABASE_URL" -f scripts/setup-budget-cost.sql
# Ensure Quality Management tables exist (idempotent CREATE TABLE IF NOT EXISTS)
psql "$DATABASE_URL" -f scripts/setup-quality.sql
