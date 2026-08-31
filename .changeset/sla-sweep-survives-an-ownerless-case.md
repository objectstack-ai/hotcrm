---
"hotcrm": patch
---

Case SLA Monitor: one unowned case no longer stops the whole hourly sweep

The scheduled SLA sweep alerts a breached case's owner, and it addressed
exactly one recipient — the case owner. But `owner_id` is optional on a case,
and an unowned case is an ordinary thing to have (this app ships a
`pnpm backfill:owner` script precisely because unowned rows happen, and both
the REST API and an import can create one).

When the sweep reached a breached case with no owner, the alert had nobody to
send to and failed — and the failure took the **entire run** with it, not just
that one case. Every breached case the sweep had not reached yet was silently
left unflagged until the next hour's run, which would die on the same case
again. Nothing retried, and the only trace was a terminal error in the flow's
run history. Measured: a sweep over five breached cases flagged two of them and
then stopped.

The sweep now checks whether a case has a reachable owner before sending the
alert. Two things follow, and the second is the point:

- An unowned breached case is **still flagged and escalated** exactly as
  before — `is_sla_violated`, `is_escalated`, `status`, and the escalation
  reason all still land on the record, so the breach shows up in views and
  reports where a service manager will find it. Only the push alert is skipped,
  and the flow's run summary now reports that skip against a named gate rather
  than just sending fewer alerts than there were cases.
- Every other breached case in the same run is now processed. That is the
  actual repair: the cost of one unowned case is one missing notification, not
  a dead sweep.

Who an unowned breach *should* alert — a service-manager role, say — is still
an open product question and is deliberately not answered here.
