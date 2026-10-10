---
---

Repository layout only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). The compiled artifact is unchanged, and not by argument: `dist/objectstack.json`
built on this branch is **byte-identical** to the one built on the base commit
(590b095), verified with `cmp` and recorded in the PR body. No object, field, hook, flow,
view, page, dashboard, report, dataset, action, skill, permission set, sharing rule,
navigation entry, translation or seed row changed, and the seed replay order is the same
19 datasets in the same sequence.

What moved is where the source files sit. Every authored file under `src/` is now in the
directory of the package that owns it — `src/sales/` (the `type: app` package),
`src/service/`, `src/revenue/`, `src/marketing/` — implementing ADR-0130 and
`docs/architecture/module-split-plan.md` items 6–9: a directory under `src/` **is** a
package, there is no `packages/` level and no `shared/`. A `*.hook.ts` now sits beside the
`*.object.ts` it names, which is what enforces the rule that a hook may not attach to
another package's object; a file may import from its own directory or from `src/sales/`,
never sideways between modules.

No manifest, no `composeStacks`, no per-package `index.ts`, no navigation change — those
are the packaging PR. `objectstack.config.ts` keeps its single `defineStack()`, and the
collection step it consumes is the new `objectstack.composition.ts` (a separate module
because the config file may carry no named export: the build parses it against a strict
stack schema and fails on any key but the default).
