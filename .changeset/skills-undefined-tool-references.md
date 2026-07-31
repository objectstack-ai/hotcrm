---
'hotcrm': patch
---

Give `customer_360` the tools its instructions always assumed, and guard skill
tool references in CI. Its whole tool list was `tools: ['search_knowledge']`
while the instructions promised an account + cases + opportunities + knowledge
roll-up — the skill could not fetch a single record. It now reads accounts,
contacts, cases and opportunities with the platform data tools, and the
knowledge base with `query_records`, since `crm_knowledge_article` is a normal
object.

`search_knowledge` itself is a real platform tool — it is in
`PLATFORM_PROVIDED_TOOL_NAMES` and was documented in 16.1.0's
`spec/src/ai/knowledge-source.zod.ts`. Issue #493 listed it as undefined and an
earlier draft of this change repeated that; both were wrong. It is left out for
a narrower reason: retrieval needs a declared knowledge source, `AIKnowledgeSchema`
mounts only on `AgentSchema.knowledge`, and #512 deleted the agents — so a
skills-only app has nowhere to declare one and the tool would resolve but return
nothing.

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
