---
'hotcrm': patch
---

Correct the platform-tool allowlist in `test/skills-integrity.test.ts`. The first
pass guessed the set from what the `@objectstack/mcp@16.1.0` bridge happens to
register, and got it wrong in both directions: it omitted `search_knowledge` — a
real platform tool, documented in 16.1.0's own
`spec/src/ai/knowledge-source.zod.ts` — so the guard would have failed a
legitimate reference; and it reasoned about excluding `create_record` /
`update_record` / `delete_record`, which are MCP-bridge tools absent from the
platform registry entirely, so there was nothing to exclude.

The list is now transcribed verbatim from `PLATFORM_PROVIDED_TOOL_NAMES` in
`@objectstack/spec@17.0.0-rc.0` — all 30 entries, verified equal to the upstream
set — with instructions to delete the literal and import it on the 17.0 upgrade.
Cross-checked against upstream's `ai-skill-tool-unresolved` rule (which ships in
17.0.0-rc.0, closing the gap this repo guarded locally): both give identical
verdicts on `search_knowledge`, `query_data`, `todo_write`,
`action_convert_lead`, `action_escalate_case`, `search_knowledgebase` and
`triage_case`.

Also corrects the claim that `search_knowledge` is undefined, in the
`customer_360` docstring, its changeset, and `code_examples.md`. The tool exists;
it stays out of the skill for a narrower reason — retrieval needs a declared
knowledge source, `AIKnowledgeSchema` mounts only on `AgentSchema.knowledge`, and
#512 deleted the agents, so a skills-only app has nowhere to declare one and the
tool would resolve but return nothing.
