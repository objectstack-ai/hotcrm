#!/usr/bin/env bash
# wow1-live-schema.sh
#
# HotCRM "Wow #1" demo — proves the AI uses a brand-new field within
# seconds of an admin adding it. No restart, no redeploy, no retraining.
#
#  TIMELINE (target: under 30 seconds end-to-end)
#  --------------------------------------------------------------------
#  t=0   : Admin POSTs `add_field` to add `health_score` to crm_account.
#  t≈5s  : Sales rep asks Copilot:
#            "Show me the top 5 accounts by health score."
#  t≈10s : Copilot calls `describe_object('crm_account')`. The response
#          includes the new `health_score` field (re-read from metadata).
#  t≈15s : Copilot calls `query_records('crm_account', orderBy=[{ field:
#          'health_score', order: 'desc' }], limit: 5)`.
#  t≈20s : Copilot answers, citing record IDs, surfacing health_score.
#
# Requires hotcrm running on PORT (default 4001) with a bearer token in
# HOTCRM_TOKEN, AND a runtime that provides the `ai` capability.
#
# ⚠ THIS DOES NOT RUN AGAINST A PLAIN `pnpm dev` / `pnpm start`.
#
# ObjectStack 11.3.0 (ADR-0025 S2) removed `@objectstack/service-ai` from the
# open edition, so `objectstack.config.ts` deliberately omits `ai` from
# `requires` — see the comment there. Nothing mounts `/api/v1/ai/*` locally and
# every call below returns 404. The preflight makes that failure immediate and
# self-explanatory instead of a bare `curl: (22) 404` twenty lines in.
#
# Usage (against a runtime that provides the `ai` tier, e.g. objectos-runtime):
#   PORT=4001 HOTCRM_TOKEN=sk-... ./scripts/wow1-live-schema.sh

set -euo pipefail

PORT="${PORT:-4001}"
BASE="http://localhost:${PORT}"
TOKEN="${HOTCRM_TOKEN:?Set HOTCRM_TOKEN to a valid bearer token}"
AUTH="Authorization: Bearer ${TOKEN}"

say() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── 0. Preflight ───────────────────────────────────────────────────
curl -fsS -o /dev/null "${BASE}/api/v1/health" \
  || die "No hotcrm server answering on ${BASE}. Start one first (pnpm dev)."

AI_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE}/api/v1/ai/chat" \
  -H "${AUTH}" -H 'Content-Type: application/json' -d '{}')
if [ "${AI_STATUS}" = "404" ]; then
  die "$(cat <<'MSG'
This runtime does not mount /api/v1/ai/* — the demo cannot run here.

hotcrm drops `ai` from `requires` on purpose (objectstack.config.ts): under
ObjectStack 16 an unmet `requires` entry is fail-fast, and the open edition no
longer ships @objectstack/service-ai. The app is portable and runs anywhere;
the AI surface only exists on a runtime that provides the `ai` tier.

To run this demo, point PORT/HOTCRM_TOKEN at such a runtime (cloud's
objectos-runtime), or declare @objectstack/service-ai in your own stack.
MSG
)"
fi

# ── 1. Add a brand-new field to crm_account ────────────────────────
say "t=0   Adding 'health_score' field to crm_account..."
START=$(date +%s)
curl -fsS -X POST "${BASE}/api/v1/ai/tools/add_field/invoke" \
  -H "${AUTH}" -H 'Content-Type: application/json' \
  -d '{
    "objectName": "crm_account",
    "name": "health_score",
    "label": "Health Score",
    "type": "number",
    "required": false
  }' | jq .

# ── 2. Ask the Sales Copilot a question that needs the new field ──
say "t≈5s  Asking Sales Copilot to rank accounts by health_score..."
curl -fsS -X POST "${BASE}/api/v1/ai/chat" \
  -H "${AUTH}" -H 'Content-Type: application/json' \
  -d '{
    "stream": false,
    "agent": "sales_copilot",
    "messages": [
      { "role": "user",
        "content": "Which 5 accounts have the highest health_score right now? Cite the IDs." }
    ]
  }' | jq '{message: .message, toolCalls: [.toolCalls[]? | {name, arguments}]}'

END=$(date +%s)
say "Done in $((END - START))s. If toolCalls includes describe_object → query_records using health_score, Wow #1 ✅"
