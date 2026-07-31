---
'hotcrm': patch
---

Record the matrix reports' date-bucket intent and drop the empty `—` column
(#523). The v9 single-form migration dropped `groupingsAcross[].dateGranularity`
and never carried it to the dataset dimensions, so every date axis groups by the
raw timestamp — one column per distinct value. Re-declaring it turns out to be
blocked on the platform, not on us, and the blockage was measured rather than
assumed: on the pinned @objectstack 16.1 a bucketed dimension does not bucket the
axis, it EMPTIES the surface. A granular dimension is refused by
NativeSQLStrategy, so the query falls to the auto-bridged `executeAggregate`,
which calls `engine.aggregate()` with no ExecutionContext — sharing then
composes `id = '__deny_all__'` for every private object (all of ours), and
`lead_metrics` goes 21 rows → 0. A `Field.datetime()` column additionally buckets
to a single NULL, because SQLite stores it as epoch millis and 16.1 formats it
with a bare `strftime()`. Both are fixed in 17.0.0-rc.0 (#3602/#3597 and
driver-sql's epoch normalisation), so the declarations belong with that upgrade,
not ahead of it — which is also why #500 could not honour `dateGranularity`.

So this ships what 16.1 can honour and pins the rest: the intended bucket for
every date dimension (and for each matrix report's axis, including the dedicated
quarter dimension `pipeline_coverage_by_quarter` needs — `close_date` is shared
with the revenue trends, which want month) now lives in a new guard,
`test/dataset-granularity.test.ts`. It fails today if anyone re-declares a bucket
on 16.x, and flips to demanding every declaration the moment the platform pin
crosses 17, so the upgrade cannot go green with the migration unfinished.
`lead_inflow_by_month_source` and `cases_opened_by_day_priority` now exclude
records with no date, which is what produced the headerless `—` column (the lead
report loses it: 21 groups → 20, no null bucket). Three report comments that
described a `dateGranularity` no dataset declares are corrected.
