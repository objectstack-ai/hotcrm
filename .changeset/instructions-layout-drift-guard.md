---
---

Agent briefs and a test only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, flow or hook.

`.github/instructions/logic.md` told the next backend agent to put its hook and
its action under `packages/crm/src/` — two lines, both from the retired
multi-package layout that `docs/archive/README.md` exists to keep out of current
docs. There is no `packages/` directory in hotcrm. The hook example now points at
`src/objects/opportunity.hook.ts`, which is where the seventeen real `*.hook.ts`
files live (`src/hooks/` is a re-export barrel, not their home), and the action
example at `src/actions/ai_briefing.actions.ts`.

The half that matters more is the guard, because these six per-role briefs sat
outside every gate in the repo — nothing under `test/`, `scripts/` or
`package.json` referenced the directory at all, which is why this drifted
unnoticed. `test/docs-src-tree-paths.test.ts` now covers them on two axes: the
`src/<dir>/` names-implies-exists check the maintainer and product docs already
get, and a ban on `packages/…` paths keyed on the fact that no such directory
exists — so a real `packages/` landing here throws and demands a rewrite instead
of going on banning correct prose.

The second rule is not decoration. The existing extractor wants a directory
(`src/([a-z][a-z0-9_]*)/`) and the defect names a file directly under `src/`, so
it captured nothing from the unfixed brief and its assertion was green over it:
adding the path to `TREE_DOCS` without widening the pattern would have shipped a
guard that cannot fail on the defect it was added for. The ban was observed
failing on the unfixed input before it was accepted.

`.github/instructions/architect.md` still carries the layout and is recorded as a
tracked pending entry naming #1518, under an equality assertion that goes red in
both directions — a new file picking it up, or that file being cleaned up without
the entry being removed. Its remedy is not a path rewrite: the references live in
its standing dependency rules and its mandatory output template, and the same
example routes files to artifact kinds that have no directory here.
