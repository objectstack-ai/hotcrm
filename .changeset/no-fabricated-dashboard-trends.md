---
'hotcrm': patch
---

Stop the CRM, Sales and Service dashboards showing invented period-over-period
trends. Twelve KPI tiles across those three dashboards carried a hardcoded
delta — `trend: { value: 12.5, direction: 'up', label: 'vs last month' }` and
eleven more like it — that no query ever produced and nothing ever recomputed.
They rendered the same "+12.5% vs last month" against every dataset, on every
tenant, including a freshly seeded database where the claim was provably false,
and they moved in the wrong direction as often as the right one.

A period-over-period delta is a measurement: it can only come from comparing
this period's result against the previous period's. Until the console can run
that comparison for dataset metrics (widget `compareTo`), a tile now shows the
number it actually measured and nothing else. This is the rule the Executive
dashboard already followed — its own fabricated percentages were removed in
#500 — so all four dashboards are finally honest in the same way.

A new guard in `test/analytics-integrity.test.ts` walks every dashboard widget
and fails on any `trend` carrying a literal number, at any nesting depth, so
hand-typed deltas cannot reappear in metadata. Fixes #587.
