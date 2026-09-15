---
---

Tests only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
The diff touches two files under `test/`, one under `.github/tasks/`, and this changeset. It
opens no file `objectstack build` reads — the build enters at `objectstack.config.ts` and
reaches only `objectstack.composition.ts` and `src/` — so the artifact and the documentation
site are unchanged. No object, field, hook, flow, view, page, dashboard, report, dataset,
action, skill, permission set, sharing rule, navigation entry, translation or seed row moved,
and ⛔ `src/` is deliberately untouched: the `src/psa/` skeleton this card required existed
only inside the ablation, which restored to the HEAD tree.

`PACKAGES` in `test/helpers/src-roster.ts` was a hand-written four-element list, and
`metadataDirs()` filtered that list against disk. A fifth package landing under `src/` was
therefore invisible to it, and to all fifteen importers built on it, with nothing anywhere
going red — the roster and the guards standing on it went blind together. `src/psa/` is that
fifth package, already planned, and its own plan promises every guard that walks the package
directories covers PSA "from the first file … with no new guard written".

The roster is now read off disk: a package is a directory under `src/` carrying an `objects/`
directory, the predicate `docs-src-tree-paths.test.ts` already uses, which drops the ADR-0046
in-product docs path out by its shape rather than by a hand-kept exclusion. The merged views
(`CrmObjects`, `CrmFlows`, …) cannot follow — an ES module cannot widen its own import list
at run time — so leaving them alone would have moved the defect one export along instead of
fixing it; they are now declared once in a `BARRELS` map that is checked against the derived
roster at module load, and the criterion itself carries an anti-phantom check for a directory
holding metadata but no `objects/`.

`flow-registration-completeness.test.ts` claimed in writing that seeding `src/psa/flows/`
would fail its anti-phantom assertion. It would not have: both sides of that comparison were
hand-written. That assertion is unchanged and is now true; the comment says so and records
the correction. Six ablation legs measured it, each mutation proved on disk by blob hash
before the run: the pre-fix roster stayed green under both seeds, the derived one goes red
under all three, and the restore leg returned the tree to its HEAD blobs.
