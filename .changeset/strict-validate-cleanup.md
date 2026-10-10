---
'hotcrm': patch
---

Clear the `os validate --strict` findings that were dead metadata

The 17.6.0 upgrade left `os validate --strict` reporting 111 warnings. This
change clears 97 of them. The 14 that remain are deliberate, and each is listed
below with its reason.

- **List rows are now tinted as the docs said they were.** Nine `rowColor` maps
  wrote hex colours (`#dc2626`, …). The console resolves only colour names (or a
  full `bg-*` class), so no row was ever tinted. The maps now name the same hue
  (`red`, `orange`, `yellow`, `slate`, `green`, `blue`, `sky`, `teal`, `amber`,
  `purple`, `emerald`, `gray`). **What readers will see:** soft row tints by
  priority on *All Cases*, *Unassigned Triage* and the task list; by stage on
  *Open Deals*; by status on events and knowledge articles; by response on
  event attendees; and by rating on *High Priority* leads. The *Cases* and
  *Opportunities* pages already described these tints. Accounts declare an
  active/inactive tint too, but it belongs to a list the *All Accounts* landing
  tab does not use, so that tab is unchanged.
- **Dashboard widgets drop 86 `options` keys that no renderer reads**: tile
  icons and formats, table `columns` / `striped` / `density`, a `suffix`, the
  pivot's field keys and its `drillDown`, and the SLA gauge's
  green/amber/red `thresholds`. A dataset-bound widget takes its labels and
  formats from the dataset, and every removed `format` matched its measure's
  own, so no dashboard changes. The pivot never opened a drill-down drawer and
  the gauge never drew those bands. Two tests pinned these keys, and both
  changes go with the keys. `test/ownership-model.test.ts` loses its check of
  the pivot's drill-down columns, which would have run over nothing. In
  `test/sla-compliance-gauge.test.ts`, the band assertions go, and the gauge
  still pins its compliance measure, value and target line.
- **Four permission-set row-security policies drop `label` / `description`.**
  17.6.0 marks those keys as having no runtime effect. Their wording moves into
  a comment beside each policy.

Still reported, on purpose:

- `hierarchy-security` in `requires` (the enterprise capability). It stays
  declared under the #1378 ruling.
- Six approval nodes routed to positions. The warning is that an unstaffed
  position leaves a request waiting. That is a staffing fact about each
  deployment, not a metadata defect.
- Six `{…}` template expressions in *Quote Generation* and *Forecast
  Snapshot*. The lint says the template form keeps working. Moving the arithmetic
  to CEL changes how it divides, so that is its own change with its own tests.
- The *Ask the AI Assistant* card's `description` on Sales Home. A
  ruling-backed guard pinned it. A later change in this release (#1581) moves
  the paragraph into the card's body, which clears this finding too.
