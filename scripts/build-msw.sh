#!/usr/bin/env bash
# build-msw.sh — Build HotCRM Studio in MSW (Mock Service Worker) mode for static hosting (e.g. Vercel)
#
# This script:
#   1. Compiles all ObjectStack metadata into dist/objectstack.json
#   2. Copies the pre-built Studio SPA (with MSW) into dist/studio/
#   3. Places objectstack.json alongside the SPA so it can be loaded at runtime
#
# Usage:
#   pnpm -w run build:msw
#
# The output in dist/studio/ is a fully self-contained static site that runs
# entirely in the browser — no server, database, or Redis required.

set -euo pipefail

STUDIO_PKG="node_modules/@objectstack/studio/dist"
OUT_DIR="dist/studio"

# 0. Verify Studio package is installed
if [ ! -d "$STUDIO_PKG" ]; then
  echo "✗ Studio package not found at $STUDIO_PKG. Run pnpm install first." >&2
  exit 1
fi

# 1. Compile metadata
echo "▸ Compiling ObjectStack metadata..."
if ! pnpm exec objectstack compile --output dist/objectstack.json; then
  echo "✗ Failed to compile ObjectStack metadata. Check objectstack.config.ts for errors." >&2
  exit 1
fi

# 2. Prepare output directory
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# 3. Copy Studio static assets
echo "▸ Copying Studio SPA..."
cp -r "$STUDIO_PKG"/* "$OUT_DIR"/

# 4. Place compiled metadata where Studio expects it
cp dist/objectstack.json "$OUT_DIR"/objectstack.json

echo ""
echo "✓ MSW build complete → $OUT_DIR/"
echo "  Serve with: npx serve $OUT_DIR"
