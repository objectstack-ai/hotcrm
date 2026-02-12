#!/bin/bash
# check-stats.sh — Single source of truth for HotCRM project statistics
# Usage: bash scripts/check-stats.sh
# This script counts objects, hooks, actions, tests, and other metadata files
# to provide accurate metrics for documentation.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== HotCRM Project Statistics ==="
echo ""

# Count object files
OBJECT_COUNT=$(find packages -name '*.object.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "📦 Business Objects: $OBJECT_COUNT"

# Count hook files
HOOK_COUNT=$(find packages -name '*.hook.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "⚡ Hook Files: $HOOK_COUNT"

# Count action files
ACTION_COUNT=$(find packages -name '*.action.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "🎯 Action Files: $ACTION_COUNT"

# Count test files
TEST_FILE_COUNT=$(find packages -name '*.test.ts' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "🧪 Test Files: $TEST_FILE_COUNT"

# Count page files
PAGE_COUNT=$(find packages -name '*.page.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "📄 Page Layouts: $PAGE_COUNT"

# Count view files
VIEW_COUNT=$(find packages -name '*.view.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "📋 List Views: $VIEW_COUNT"

# Count dashboard files
DASHBOARD_COUNT=$(find packages -name '*.dashboard.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "📊 Dashboards: $DASHBOARD_COUNT"

# Count form files
FORM_COUNT=$(find packages -name '*.form.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "📝 Form Views: $FORM_COUNT"

# Count workflow files
WORKFLOW_COUNT=$(find packages -name '*.workflow.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "🔄 Workflow Files: $WORKFLOW_COUNT"

# Count state machine files
SM_COUNT=$(find packages -name '*.statemachine.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "🔀 State Machines: $SM_COUNT"

# Count permission files
PERM_COUNT=$(find packages -name '*.permission.ts' ! -name '*.test.*' ! -path '*/node_modules/*' | wc -l | tr -d ' ')
echo "🔒 Permission Sets: $PERM_COUNT"

echo ""
echo "=== Per-Package Breakdown ==="
echo ""

for pkg in crm finance hr marketing products support ai; do
  if [ -d "packages/$pkg" ]; then
    OBJ=$(find "packages/$pkg/src" -name '*.object.ts' ! -name '*.test.*' ! -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
    HK=$(find "packages/$pkg/src" -name '*.hook.ts' ! -name '*.test.*' ! -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
    ACT=$(find "packages/$pkg/src" -name '*.action.ts' ! -name '*.test.*' ! -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
    TST=$(find "packages/$pkg" -name '*.test.ts' ! -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
    PG=$(find "packages/$pkg/src" -name '*.page.ts' ! -name '*.test.*' ! -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
    VW=$(find "packages/$pkg/src" -name '*.view.ts' ! -name '*.test.*' ! -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
    printf "%-12s Objects: %2s | Hooks: %2s | Actions: %2s | Pages: %2s | Views: %2s | Tests: %2s\n" \
      "$pkg" "$OBJ" "$HK" "$ACT" "$PG" "$VW" "$TST"
  fi
done

echo ""
echo "=== Spec Version ==="
SPEC_VER=$(node -e "console.log(require('./packages/crm/node_modules/@objectstack/spec/package.json').version)" 2>/dev/null \
  || node -e "console.log(require('./node_modules/@objectstack/spec/package.json').version)" 2>/dev/null \
  || grep -m1 '"@objectstack/spec"' package.json | grep -oP '\d+\.\d+\.\d+' \
  || echo "unknown")
echo "@objectstack/spec: v$SPEC_VER"

echo ""
echo "Done. Use these numbers to keep documentation consistent."
