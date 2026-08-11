---
'hotcrm': patch
---

Add a CI step that fails the build when `objectstack lint` reports any
`i18n/missing-*` issue, closing a gate blind spot (#1018).

`objectstack lint` only fails its own exit code on rule-level *errors* —
warnings and suggestions are printed but never gate. Most `i18n/missing-*`
findings are warnings (only a default-locale gap is an error), so a
translation-coverage regression could merge with a fully green `Quality
Checks` run. PR #1080 did exactly that: it merged 25 enumerated
`i18n/missing-page` warnings through green CI, and #1084 zeroed that debt the
same day — which is what makes today the right moment to gate it, since the
baseline is zero.

`scripts/check-lint-i18n-gate.mjs` runs the real `objectstack lint --json`
pass, counts issues whose rule starts with `i18n/missing-`, and exits
non-zero when that count is not zero. It is wired into `pnpm verify` (new
`lint:i18n-gate` script, run right after `lint`) and into both CI workflows
(`ci.yml`'s `Build and Test` job and `code-quality.yml`'s `Quality Checks`
job) as a dedicated step, plus a real end-to-end run in
`test/lint-i18n-gate.test.ts` so a regression is also caught by `pnpm test`.

Deliberately scoped to only the `i18n/missing-*` rule family: the other ~153
pre-existing lint warnings/suggestions in this repo are untouched and remain
out of gate. Making the underlying lint rule itself error-severity would be a
`packages/lint` (upstream) change and is out of this repo's reach.
