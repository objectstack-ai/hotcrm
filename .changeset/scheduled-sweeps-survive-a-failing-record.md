---
'hotcrm': patch
---

Scheduled sweeps no longer abort on their first failing record.

A `loop` body had no error handling of its own. The container iterates with a
bare `await` and carries no `try`/`catch` at all, so the first item whose node
fails ends the **whole** run: every later item goes unprocessed, and the work
already done is not even reported. Measured by the platform on the real engine
— a 5-item sweep failing at item 3 touched 3 items and reported `acted: 0`.

That is a live behaviour defect, not a style one. One un-notifiable owner in
`task_due_reminder` silently dropped every later reminder that hour; one
un-claimable seeded row in `demo_bootstrap` stopped all twelve claim passes,
every ten minutes, for as long as that row existed.

Ten flows and twenty-two loops now contain the failure per iteration: the body
is wrapped in a `try_catch` whose `catch` is a single no-op handler, so a
failing item is skipped and the sweep carries on with the next one. The failed
attempt's own steps stay in the run log ahead of the handler's, so a skipped
item is visible with its own failure step rather than silently absent. The
wrapper is one helper, `guarded()` in `src/flows/_guarded-iteration.ts`, called
at each loop site.

Affected: `demo_bootstrap`, `forecast_snapshot`, `contract_renewal`,
`campaign_enrollment`, `case_sla_monitor`, `opportunity_stagnation`,
`contract_expiration`, `task_due_reminder`, `campaign_completion` and
`quote_expiration`. Nine are scheduled sweeps; `campaign_enrollment` is the
user-invoked bulk enrolment behind the Enroll Members action, and it gains the
same containment — a bulk enrolment that stops halfway leaves the operator with
no record of which members were added.

No behaviour changes for a run in which nothing fails. `objectstack lint`'s
`flow-loop-body-uncontained` count goes from 42 to 0.
