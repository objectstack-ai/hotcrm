---
'hotcrm': patch
---

Wow #1 demo now names the platform `ask` agent instead of the retired
`sales_copilot`

The flagship "live schema" demo still POSTed `"agent": "sales_copilot"` to
`/api/v1/ai/chat` in four places — the runnable script and all three locale
docs. That agent was retired in #512 (app-authored agents removed; the surface
is skills-only per ADR-0063 §2), so `loadAgent()` refuses the name and the call
errors: `scripts/wow1-live-schema.sh` runs under `curl -fsS` and aborted at
step 2, and the docs shipped the same body as copy-pasteable curl. All four now
name the platform agent `ask`, and the surrounding prose describes the real
architecture — HotCRM's `live_data` skill riding on `ask`, not an app-authored
copilot.

A new guard in `test/docs-drift.test.ts` pins every `agent:` / `defaultAgent:`
value appearing in a doc code fence or a demo script against the platform agent
set read from the spec (`AgentSchema.shape.surface`), so a self-named agent
cannot reappear in a sample a reader is invited to paste into a terminal.
