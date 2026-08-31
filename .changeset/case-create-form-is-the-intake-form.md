---
"hotcrm": patch
---

The case form no longer lets the person raising a case author the case's own lifecycle.

Creating a case used to open a three-tab dialog — Case / SLA / Resolution — whose SLA
and Resolution tabs carried `sla_due_date`, `first_response_date`, `is_sla_violated`,
`is_escalated`, `escalation_reason`, `resolution`, `customer_feedback` and the rest of
the fields the service lifecycle maintains. None of those were read-only, and the SLA
hook only fills `sla_due_date` when the incoming record has none, so a case could be
raised with its SLA deadline already set and its violation flag already ticked. The
create form is now the Case section alone: subject, account, contact, status, priority,
origin, owner and description — the facts a person actually has at intake.

The lifecycle fields keep every surface they belong on. The queue still shows and sorts
on the SLA deadline, the SLA calendar still lays cases out on it, the timeline still
runs from created to closed, and the record page still shows escalation and resolution.

One consequence to know about: `internal_notes`, `customer_rating` and
`customer_feedback` left with the Resolution section and have no other form to be
edited on yet.
