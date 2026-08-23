---
'hotcrm': patch
---

Say `*.actions.ts` everywhere, because that is what is on disk. The file-suffix
protocol contradicted itself: `AGENTS.md` drew the plural in its directory
diagram and then spelled the singular `*.action.ts` in four normative places —
the AI-Native rule, the Phase 2 implementation step, the Core File Types list,
and the Development Workflow step. On disk the plural wins outright: every
action file in the tree is `<entity>.actions.ts` (`campaign`, `case`, `contact`,
`global`, `knowledge_article`, `lead`, `opportunity`), and there is no
`*.action.ts` file anywhere. The disk is the source of truth, so the prose is
the drift — no file was renamed.

The contradiction was not confined to `AGENTS.md`, so this corrects the class
rather than one file. `README.md` stated the plural convention outright in its
layout section ("actions are the one plural") and then listed the singular twice
a few lines later; `.github/instructions/logic.md` and `ui.md` — the per-role
agent instructions — named the singular in their capability lists and worked
examples; and `content/docs/marketplace/fork-hotcrm.mdx` handed forkers a
file-suffix table telling them to create `src/actions/<entity>.action.ts`, in
all three locales. Nineteen occurrences across seven live files now agree.

Two things guard against the same drift returning. The Core File Types entry now
says *why* the suffix is plural — one file bundles an entity's actions, making
it the one plural suffix in an otherwise singular protocol, which is exactly why
readers keep "correcting" it. And the Development Workflow step now reads
`src/actions/{entity}.actions.ts`, matching its sibling steps and the bundling
rule; `{action}` implied one file per action, which no file on disk does.

Nothing mechanical enforces this suffix: registration is an explicit barrel
(`objectstack.config.ts` imports `./src/actions/index.js`), not a glob, so a
misnamed file is never silently dropped — it is simply off-convention until
someone hand-adds it to the barrel. `docs/archive/` still spells the singular
throughout and is deliberately untouched: that tree is a historical record by
its own README, and the docs-drift repo-tree guard already excludes it.
