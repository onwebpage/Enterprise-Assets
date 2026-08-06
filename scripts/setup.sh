#!/bin/bash
# Bootstrap script: push schema and seed initial data.
# Safe to re-run — seed is idempotent (upserts).
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🗄️  Building shared libraries..."
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react

echo "⬆️  Pushing database schema..."
pnpm --filter @workspace/db run push-force

echo "🌱 Seeding initial data..."
pnpm --filter @workspace/db run seed

echo ""
echo "✅ Setup complete!"
echo "   Login: admin@omnierp.io / Admin@1234"
echo ""
echo "Start the app with:"
echo "   pnpm --filter @workspace/api-server run dev"
echo "   pnpm --filter @workspace/omni-erp run dev"
