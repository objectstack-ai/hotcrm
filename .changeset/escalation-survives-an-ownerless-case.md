---
"hotcrm": patch
---

Case Escalation: a critical case with no owner no longer ends its run in failure

Both escalation flows — `case_escalation` (a case turned critical) and
`case_escalation_on_create` (a case raised critical, the phone-in P1 path) —
notify the case's owner after escalating, and they addressed exactly one
recipient. But `owner_id` is optional on a case, and an unowned case is an
ordinary thing to have (this app ships a `pnpm backfill:owner` script precisely
because unowned rows happen, and both the REST API and an import can create
one).

When either flow reached a critical case with no owner, the notification had
nobody to send to and failed. Measured on all three shapes an empty owner takes
— the column never written, an explicit null, and a blank/whitespace value —
in both flows.

**This is a narrower fault than the SLA sweep's (#1405), and the difference is
structural rather than a matter of degree.** The SLA monitor's work happens
inside a loop over up to 500 cases with no per-iteration containment, so one
unowned case there killed every breached case queued behind it. These two flows
are record-change flows with no loop: one unowned case ends only its own run.
Do not read this as "the same defect" without that qualifier.

What was actually lost was the notification plus a terminal failure in run
history where nobody looks. The escalation itself always landed — it is written
before the notification — and it still does: the check gates only the
notification, and an unowned critical case is still flagged `is_escalated`,
moved to `escalated`, stamped with an escalation date and reason, and so still
appears in the views and reports where a service manager finds it. The run
summary now reports the skipped notification against a named gate rather than
simply sending nothing.

Worth stating plainly, because it makes this case different from the SLA
sweep's: the recipient here is read **before** the escalation is written, so it
is deliberately the agent the case is being handed off **from**. When there is
no such person, "notify the previous owner" has no one to mean. Skipping it
loses nothing a reader would have wanted — unlike the SLA sweep, where the
skipped alert was the only notice anyone would get.

Who an unowned escalation *should* reach — a service-manager role, say — is
still an open product question and is deliberately not answered here.
