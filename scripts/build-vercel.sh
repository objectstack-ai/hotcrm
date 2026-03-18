#!/usr/bin/env bash
# build-vercel.sh — Build all HotCRM packages for Vercel serverless deployment
#
# This script replaces the inline buildCommand in vercel.json to stay within
# Vercel's 256-character limit for that field.
#
# Steps:
#   1. Build the core package first (other packages depend on it)
#   2. Patch the console plugin (dereference pnpm symlinks)
#   3. Build all business packages in parallel
#
# Usage (called automatically by Vercel via vercel.json):
#   bash scripts/build-vercel.sh

set -euo pipefail

echo "▸ Building @hotcrm/core..."
pnpm --filter @hotcrm/core build

echo "▸ Patching console plugin..."
node scripts/patch-console-plugin.cjs

echo "▸ Building business packages..."
pnpm --filter @hotcrm/ai \
     --filter @hotcrm/crm \
     --filter @hotcrm/finance \
     --filter @hotcrm/marketing \
     --filter @hotcrm/products \
     --filter @hotcrm/support \
     --filter @hotcrm/hr \
     --filter @hotcrm/analytics \
     --filter @hotcrm/integration \
     --filter @hotcrm/community \
     --filter @hotcrm/healthcare \
     --filter @hotcrm/real-estate \
     --filter @hotcrm/education \
     --filter @hotcrm/financial-services \
     build

echo "✓ Vercel build complete."
