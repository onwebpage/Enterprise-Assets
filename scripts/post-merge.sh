#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react
pnpm --filter @workspace/db run push-force
