---
'hotcrm': patch
---

Stop documenting directories that no longer exist, and guard the class. `#512`
deleted `src/agents/` when the AI surface went skills-only, but seven maintainer
docs kept printing `src/agents/*.agent.ts` in their tree diagrams and
registration tables — `code_examples.md` still told authors to "add its name to
an agent in `src/agents/*.agent.ts`" after registering a skill. `src/cubes/` had
the same shape: dropped in favour of datasets (ADR-0021, noted in
`objectstack.config.ts`), still drawn in two trees. Also removes the skill
`permissions: [...]` key from the worked example — `SkillSchema` has no such
field and silently strips it (#511) — and corrects a stale flow count (20 → 23)
and the `*.action.ts` suffix (the convention is `*.actions.ts`).

Fills the gap left behind: the skill example now states which two sources a
`tools` name can resolve to (platform data tools, or `action_<name>` from an
`ai.exposed` Action), why `defineTool` is not a third one, and where the guard
lives. `ARCHITECTURE.md` gains the same note plus the missing `case_triage`
skill.

Adds a repo-tree guard to `test/docs-drift.test.ts`: every `src/<dir>/` path a
maintainer doc names must exist on disk (`docs/archive/` excluded — it is a
historical record). It caught a stray reference in this change's own first pass.
