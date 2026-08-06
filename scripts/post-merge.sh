#!/bin/bash
# Runs automatically after every task merge.
# Uses 'push' (no --force) so any destructive schema change fails here
# and requires an operator to run scripts/setup.sh with FORCE_DB_PUSH=true.
set -e
pnpm install --frozen-lockfile
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react
pnpm --filter @workspace/db run push
