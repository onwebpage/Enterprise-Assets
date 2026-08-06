#!/bin/bash
# Bootstrap script: push schema and seed initial data.
# Safe to re-run — seed is idempotent (upserts).
#
# By default uses 'push' (interactive, fails on destructive changes).
# Set FORCE_DB_PUSH=true only when you have reviewed the pending DDL
# and intentionally want to apply destructive changes unattended.
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🗄️  Building shared libraries..."
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react

echo "⬆️  Pushing database schema..."
if [ "${FORCE_DB_PUSH}" = "true" ]; then
  echo "    ⚠️  FORCE_DB_PUSH=true — destructive changes will be applied without confirmation."
  pnpm --filter @workspace/db run push-force
else
  pnpm --filter @workspace/db run push
fi

echo "🌱 Seeding initial data..."
pnpm --filter @workspace/db run seed

echo ""
echo "✅ Setup complete!"
echo "   Login: admin@omnierp.io / Admin@1234"
echo ""
echo "Start the app with:"
echo "   pnpm --filter @workspace/api-server run dev"
echo "   pnpm --filter @workspace/omni-erp run dev"
