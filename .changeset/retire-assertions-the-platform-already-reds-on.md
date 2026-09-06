---
---

Retire eleven local test assertions whose defects `objectstack lint` already
reports at **error** severity — it exits 1 on each one today, with no
`--strict` and nothing waiting on a release. Test-only: no metadata, no
suppression, no severity change, and no new test.

Nine assertions come out, across five files, each carrying the three-gate
evidence surveys #1613 and #1621 measured (non-vacuous · reachable ·
subsuming) plus a fresh exit-1 observation on the pinned
`@objectstack/lint@17.3.0` at this branch's base:

- `analytics-integrity` — report chart yAxis (`chart-measure-unknown`), widget
  dataset/values/dimensions (`widget-dataset-unknown`,
  `widget-measure-unknown`), and date-macro placeholders
  (`filter-token-unknown`).
- `view-references` — list sorts (`sort-field-unknown`) and view/page filter
  tokens (`filter-token-unknown`).
- `action-references` — row/bulk action names (`action-name-undefined`).
- `authorization-coverage` — `controlled_by_parent` parent derivation
  (`security-controlled-by-parent-no-relation`).
- `sharing-seeding` — the seed-every-rule sweep
  (`sharing-rule-unlowerable-condition`,
  `sharing-rule-runtime-variable-condition`).
- `readonly-write-semantics` — the readonly half of the `escalate_case` write
  assertion (`flow-update-readonly-field`); its exact-write-set pin stays,
  because no platform rule pins which editable columns that node writes.

Ten further rows the surveys listed were measured again here and **kept**: on
each of them the local assertion catches defects the platform rule does not,
so retiring it would have lost coverage silently.
