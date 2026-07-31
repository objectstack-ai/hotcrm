---
'hotcrm': patch
---

Drop the last undefined tool reference from the AI skills and guard the class in
CI. `customer_360` declared `tools: ['search_knowledge']` — the survivor of the
eleven fictional tools issue #493 counted, which #512 missed because that skill
looked "already correct". The runtime silently drops an unresolved tool, so the
skill shipped with its only declared capability resolving to nothing while its
instructions promised an account + cases + opportunities + knowledge roll-up it
had no tool to read. Defining the missing tool would not have fixed it:
`ToolSchema` is a read-only Studio projection with no `implementation` and no
executor, so a hand-authored `search_knowledge` would validate, build, and still
never run. The knowledge base is `crm_knowledge_article`, a normal object, so the
skill now reads it with `query_records` alongside the rest of the profile.

Adds `test/skills-integrity.test.ts`: every skill tool must resolve to a platform
built-in or an `action_<name>` tool materialised from an Action that is
`ai.exposed` with a headless path; AI tool metadata cannot be used to satisfy a
dangling reference; and every skill handed off to in instructions must exist (the
defect that made `case_triage` point at a `response_drafting` skill that never
existed). Also corrects two stale skill docstrings that explained the read-only
posture of `case_triage` / `email_drafting` by calling `escalate_case`,
`close_case` and `send_email` `type: 'modal'` — all three were retyped to
flow/script since, and the real reason no tool is materialised is that none of
them opts in via `ai.exposed`.
