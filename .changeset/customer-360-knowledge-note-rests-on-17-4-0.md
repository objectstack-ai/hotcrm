---
---

Comment-only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents in its own comment, on par with the
`skip-changeset` label). The file is preferred over the label for the reason
`rescope-pin-claims-onto-the-17-4-0-pin.md` gave as a precaution one PR earlier — a file
lands inside the diff the Changeset Check compares against the base, where a label is a
separate write that a later group label PUT can strip without anyone noticing. That is no
longer hypothetical: on this PR the label was stripped by an auto-labeller's whole-set
write seconds after it was applied, leaving two failed check runs attached to the head
before the re-apply took.

Every changed line is inside the doc comment above `Customer360Skill` in
`src/skills/customer-360.skill.ts`. Proof rather than assertion: the repo's own
authored-source measure (`authoredText()` from `scripts/check-source-token-ratchet.mjs` —
comment-stripped and blank-stripped) is byte-identical across the change, 1,854 bytes on
both sides, while the raw file does differ (3,219 to 3,206 bytes). `pnpm hygiene:tokens`
reads exactly as it does on the base commit — business semantics ~85,799, interaction
layer ~38,585, authored total ~139,029, headroom ~971.

The comment justified leaving `search_knowledge` out of the skill's `tools` on a mechanism
`@objectstack/spec@17.4.0` no longer has: `AIKnowledgeSchema` is exported by no subpath,
and `AgentSchema.knowledge` is a rejecting tombstone whose own message says declaring
sources on an agent never scoped retrieval. Its conclusion — that a "skills-only" app has
nowhere to declare a source, so the tool "would resolve and return nothing" — was wrong
twice over: no app of *any* shape can declare a knowledge source (it is not one of the 26
governed metadata types and no stack collection carries one), and the tool does resolve,
measured by adding it and watching `objectstack lint` stay clean where a nonsense tool name
raises `ai-skill-tool-unresolved`.

The tool list itself is byte-identical — `search_knowledge` is still not declared, now for
the reason `content/docs/ai-copilot/knowledge-bases.mdx` already gives users: knowledge in
HotCRM is one ordinary object, read with the same record tools as everything else.
