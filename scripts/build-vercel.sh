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
#   4. Copy SPA static assets to public/ for direct serving by Vercel's CDN
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

# ---------------------------------------------------------------------------
# Copy SPA static assets to public/ so Vercel serves them directly from CDN
# instead of routing through the serverless function.
#
# Vercel's routing order: redirects → headers → filesystem → rewrites
# Files in public/ (the outputDirectory) are matched at the "filesystem"
# step, BEFORE rewrites, so they bypass the API handler entirely.
#
# Only asset files (JS, CSS, fonts, images) are copied — NOT index.html.
# SPA entry points must still go through the API handler for proper
# client-side routing fallback.
# ---------------------------------------------------------------------------

echo "▸ Copying SPA static assets to public/ for direct CDN serving..."

# Console SPA (@object-ui/console)
CONSOLE_DIST="node_modules/@object-ui/console/dist"
if [ -d "$CONSOLE_DIST/assets" ]; then
  mkdir -p public/console/assets
  cp -r "$CONSOLE_DIST/assets/"* public/console/assets/
  echo "  ✓ Console assets copied to public/console/assets/"
  # Copy manifest.json if present (referenced by <link rel="manifest">)
  if [ -f "$CONSOLE_DIST/manifest.json" ]; then
    cp "$CONSOLE_DIST/manifest.json" public/console/manifest.json
    echo "  ✓ Console manifest.json copied"
  fi
else
  echo "  ⚠ Console dist/assets not found — skipping"
fi

# Studio SPA (@objectstack/studio)
STUDIO_DIST="node_modules/@objectstack/studio/dist"
if [ -d "$STUDIO_DIST/assets" ]; then
  mkdir -p public/_studio/assets
  cp -r "$STUDIO_DIST/assets/"* public/_studio/assets/
  echo "  ✓ Studio assets copied to public/_studio/assets/"
  # Copy vite.svg favicon if present
  if [ -f "$STUDIO_DIST/vite.svg" ]; then
    cp "$STUDIO_DIST/vite.svg" public/_studio/vite.svg
    echo "  ✓ Studio vite.svg copied"
  fi
else
  echo "  ⚠ Studio dist/assets not found — skipping"
fi

echo "✓ Vercel build complete."
