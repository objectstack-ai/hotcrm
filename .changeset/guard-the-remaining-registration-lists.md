---
---

Tests only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
The diff adds two files under `test/` and this changeset; it opens no file `objectstack
build` reads — the build enters at `objectstack.config.ts` and reaches only
`objectstack.composition.ts` and `src/` — so the artifact and the documentation site are
unchanged. No object, field, hook, flow, view, page, dashboard, report, dataset, action,
skill, permission set, sharing rule, navigation entry, translation or seed row moved, and
⛔ `objectstack.composition.ts` itself is deliberately untouched: this card adds guards, it
changes no registration.

`objectstack.composition.ts` carries five explicit ordered arrays — `allHooks`, `allFlows`,
`allSkills`, `CrmSharingRules` and `CrmSeedData` — and for those the package barrel is
necessary and **not** sufficient: the entry must also be imported into that file and written
into the array by hand. A symbol that reaches the barrel and never the array is handed to
`defineStack()` by nobody. It is registered by nothing, every suite that reads the barrels
still sees it, and `pnpm validate` exits 0 and names it nowhere. The five stay
hand-maintained because their order interleaves the four packages, so this is a permanent
failure surface rather than one a refactor can remove.

`allFlows` got its guard in #1936. `test/registration-list-completeness.test.ts` now covers
the other four, in both directions, and the four criteria are not one rule repeated:
`allHooks` and `CrmSharingRules` flatten, so the unit that owes a registration is the
element rather than the export; `CrmSharingRules` carries one exemption, `CrmPositions`,
which is positions metadata the stack registers under `positions` and which the file
measures off the stack definition instead of excusing in a comment; and `CrmSeedData` needed
a ruling before it could be guarded at all, because its barrels export seed helpers, the
composition knob and a price table beside the seed families — so the rule is "every export
that IS a seed", with all ten non-seed exports named and reasoned in a roster that goes red
when it excuses a real seed or names an export that has gone.

Every rule was verified by making it fail: ten probes, one per rule per collection, each
planted on disk with the mutation proved by blob hash, run, then restored to the HEAD blob.
