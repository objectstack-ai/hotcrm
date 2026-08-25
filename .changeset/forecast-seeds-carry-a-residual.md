---
'hotcrm': patch
---

The seeded forecast module now opens on numbers instead of zeros. A fresh
install showed seven forecast snapshots of which six carried `0` for
`commit_amount`, `best_case_amount` and `pipeline_amount`, so four of the
thirteen columns the Forecasts list renders were dead on day one — `coverage_ratio`
among them, since it divides by the pipeline figure. Closed-versus-quota alone
is a scoreboard; a sales manager opening the module could not see the one thing
it exists to answer, which is whether the number is going to be made.

The zeros came from a stated theory — a closed period has no pipeline left — and
that is the one reading a period-END snapshot cannot have. A period ends with
deals still open, which is exactly what the seeds' own notes describe ("two
enterprise deals slipped into the next quarter"). Each settled period now carries
the residual that was still open on its closing day, in the cumulative shape the
object defines and the scheduled `forecast_snapshot` sweep writes: pipeline is a
superset of best case, which is a superset of commit. The residual is deliberately
a remainder rather than a mid-period book — smaller than what the period actually
closed — so the settled rows read as settled and only the current period shows a
full pipeline.

`coverage_ratio` follows for every period with a quota still to make. It stays 0
on the three periods that over-attained (106%, 109%, 105%), which is not a
leftover of this defect but the formula's documented behaviour: with the quota
already met there is no gap left to cover.

The current quarter is untouched. That window has exactly one producer — the
scheduled `forecast_snapshot` sweep — and `demo-bootstrap` documents its own
correctness as depending on the seeds staying out of it, so the demo dataset
still ships no row there.
