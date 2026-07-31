---
'hotcrm': patch
---

Make the stalled-deal sweep actually fire (#489). `crm_opportunity.days_in_stage`
was a plain number column that nothing ever incremented — the lifecycle hook
reset it to 0 on a stage change and no sweep raised it — so
`opportunity_stagnation`'s `days_in_stage > 14` filter matched only the rows the
seed had hardcoded, and real deals could rot in a stage forever without a nudge.

Opportunities now carry `stage_entry_date`, a stored date stamped by the
lifecycle hook on insert and on every stage change. `days_in_stage` becomes a
formula counting from it, correct on every read with no nightly full-table pass.
Because a formula is evaluated after the query and is not a real column, the
sweep now predicates on `stage_entry_date < TODAY() − 14` — the same test,
against something the data engine can see — and the "Stale Opportunities" view,
which can express neither a formula predicate nor a relative date, becomes an
open-deals list ordered longest-in-stage first with `days_in_stage` on show.

Two guards in `test/metadata-references.test.ts` keep the class from returning:
no list view may filter or sort on a formula field, and no flow data node may
filter on one. The second instance they caught is fixed here too — the quarterly
forecast view's `attainment_pct` tiebreaker was a dead sort key, now
`closed_amount`.
