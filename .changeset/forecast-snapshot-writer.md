---
"hotcrm": minor
---

Forecasting now produces real data. HotCRM documented a nightly forecast job for
several releases, but nothing anywhere actually created a forecast snapshot — the
Forecast object, the attainment and coverage formulas, the Forecast Metrics
dataset and the dashboard's "Quota Attainment by Rep" table all ran on three
hand-seeded demo rows, so on a live org the whole forecasting story was empty.

The new **Forecast Snapshot** scheduled flow runs nightly at 03:00 and writes one
current-quarter snapshot per active opportunity owner: open pipeline, best case,
commit and closed-won totals, aggregated from that owner's opportunities closing
inside the quarter. Re-runs refresh the same row rather than adding another, so a
snapshot tracks the pipeline down as well as up, and `quota` is never touched —
it stays hand-maintained until a quota model exists.

Two supporting changes make that possible and honest:

- The Forecast object now derives `period_start` (alongside the `period_end` and
  `period_label` it already derived), so any writer can ask for "this quarter"
  and get a calendar-true window instead of hand-computing a boundary and
  drifting off it.
- `best_case_amount` and `commit_amount` are documented as what they now
  measure: the deal's stored **Forecast Category**, the same boundary the
  "Closing This Quarter" list view and the pipeline-by-category chart use. The
  old field descriptions named probability thresholds that no writer applied and
  that disagreed with how deals are actually categorised.
