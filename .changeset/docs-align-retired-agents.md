---
'hotcrm': patch
---

Docs alignment: correct the metadata counts in the README, rewrite the AI copilot
pages as skill docs, and disclaim the archived Salesforce comparison.

The README advertised "2 AI agents (sales-copilot, service-copilot), 20 flows,
5 sharing rules" three paragraphs above a repository-layout block that correctly
called the AI surface skills-only with 23 flows. The real numbers, taken from
`objectstack.config.ts`, are **0 app-owned agents, 6 AI skills, 23 flows and 9
sharing rules**; both README passages now say that, and the `8 datasets` count was
added so the two lists agree.

The published `ai-copilot/sales-copilot` and `ai-copilot/service-copilot` pages (en,
zh-Hans, zh-Hant) still described two AI personas that were retired in #512 — "it
lives in the right-side chat panel and as inline buttons" for capabilities that ship
today as six skills on the platform `ask` assistant. They are rewritten as skill docs
at their existing URLs, with the activation rules taken from each skill's real
`triggerConditions` and the write paths named as the actual HotCRM actions
(`convert_lead`, `schedule_followup`, `escalate_case`, `close_case`) the skills call.
The AI Copilot index, the Skills page, the glossary's "Agent (AI)" entry, the
customization guide (which told developers to edit a long-deleted
`src/agents/sales-copilot.agent.ts`) and every inbound link label were updated to
match.

`docs/archive/2026-02/SALESFORCE_FEATURE_COMPARISON.md` now opens with a
retired-architecture banner. It describes a ~148-object, 13-package product and marks
`sla_policy`, `queue`, `email_to_case` and `pricebook` as implemented — none exist —
so its "~95% Salesforce parity" headline was actively misleading anyone evaluating the
repo. Finally `docs/ARCHITECTURE.md` was corrected: the diagram no longer draws the
deleted `src/agents` or the never-created `src/cubes`, the manifest table reads
`2.2.2` instead of `1.0.5`, and `requires` no longer lists the `ai` capability that
was removed in 2.2.0.
