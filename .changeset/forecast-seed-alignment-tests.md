---
'hotcrm': patch
---

Add regression tests pinning forecast seed calendar alignment (#530).

The "This Quarter" forecast view rendered empty because seeded quarterly
snapshots carried relative `period_start` dates (`daysAgo(45)` →
mid-month values like 2026-06-13) that an exact-match
`period_start equals {current_quarter_start}` filter can never hit. The
seeds were rewritten to real calendar periods in #516 and the view's
unresolvable token filter removed in #515, but nothing in CI guarded the
invariant — it had already regressed silently once.

`test/forecast-seeds.test.ts` now asserts that every seeded forecast
snapshot starts exactly on its calendar quarter/month boundary, that
`period_end` closes the same period, that `period_label` matches the
dialect `forecast.hook.ts` derives (`Q3 2026` / `Aug 2026`), that a
snapshot exists for the current calendar quarter (the row any
this-quarter filter must be able to match), and that `period_label`
values stay unique since they are the seed upsert identity. Verified to
fail 6/8 against the pre-#516 seed data.
