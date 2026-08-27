---
'hotcrm': patch
---

Make the Executive dashboard's pipeline tile say what the shared factory says,
and add the guard that keeps it saying it.

`src/dashboards/shared-widgets.ts` exists so that "what counts as open pipeline"
is stated once: #539 deleted the three source-side copies of the pipeline funnel
by moving the definition into a factory the CRM, Sales and Executive dashboards
each call. The i18n side was never deduplicated — every dashboard still carries
its own `dashboards.<dashboard>.widgets.<widget>.description` in every locale, so
one factory-owned sentence is stored as twelve independently editable strings,
which is the exact shape #539 removed, one layer down.

It had already drifted, identically in all four bundles and in one direction:
the Executive entry read "by sales stage" where CRM and Sales read "at each sales
stage", and the same split existed in `zh-CN`, `es-ES` and `ja-JP`. Four bundles
drifting the same way is a translation lineage, not four typos — they were
rendered from one early copy. Four strings are aligned back to the factory's
wording, one per locale; `title` was already uniform and is untouched.

**This ships, so it is a `patch`.** Four user-visible strings under
`src/translations/` change, in four locales, and the shipped artifact changes
with them: the locale bundles compile into `dist/objectstack.json`, which the
same `pnpm verify` run that gates this PR prints as
`Artifact: dist/objectstack.json (1969.8 KB)`.

The change *is* a synonym, and that context is worth keeping — no user reads a
different meaning, and the Executive tile now reads exactly as the identical
tile already read on the CRM and Sales dashboards. But "synonym" is a statement
about severity, not about whether something shipped. The empty-frontmatter
exemption that `.github/workflows/changeset-check.yml` documents declares that a
PR publishes *nothing*, and every other empty-frontmatter changeset in this
directory earns that declaration the same way: test-only, prose-only, CI-only,
"no `src/` metadata changed". This one cannot borrow that sentence. Claiming it
anyway would put a false declaration in the release ledger, which is worse than
an over-counted patch.

The guard is `test/i18n-shared-widget-parity.test.ts`, and its rule is stated
against the source rather than as "all entries for a shared widget must match":

  a locale must group dashboards by description exactly the way the source
  groups them.

The blunt form would have been red on landing for a legitimate reason.
`avgDealSizeMetricWidget` takes `overrides` and Sales uses them — its tile is
pinned to the quarter, so its description ends "this quarter" while CRM's does
not, and all four bundles already reflect that correctly. Stating the invariant
as a partition catches both failure directions with one rule: forking a
description the factory unifies, and merging one the source deliberately keeps
apart. A second assertion anchors the baseline itself — for a factory-owned
widget the `en` bundle is not a translation but the same sentence, so it must
reproduce the literal byte for byte, which is what stops a family of entries from
agreeing with each other while all disagreeing with the code that renders them.

Nothing was watching this before: `pnpm lint --skip-i18n` skips the bundles, and
`test/i18n-references.test.ts` asserts key *coverage* — every authored surface
translated, every key resolving — never that two entries fed by one source string
still agree. Widget ids are discovered by invoking the factories the shared
module exports rather than being listed in the test, so a factory added later is
covered the day it lands.

Deliberately not done: giving the three dashboards one shared i18n key. That
would change how i18n keys are organised, which is a platform-convention question
beyond the drift this fixes.
