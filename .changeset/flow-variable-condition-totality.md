---
"hotcrm": patch
---

Fix two automations that could stop running mid-flow, and pin the property that
prevents it.

**Enroll Leads in Campaign** aborted whenever the campaign it was launched from
had been deleted — or was hidden from the running user by a sharing rule —
between clicking the action and the flow reaching its "Campaign Open?" gate. The
gate read the campaign's status off a record that was no longer there, the run
was recorded as failed, and not one lead was enrolled. It now reaches a verdict
on every shape and simply enrols nobody when the campaign cannot be read.

**Lead Conversion Process** aborted at "Create Opportunity?" whenever the
conversion screen came back without an answer for that checkbox — the ordinary
case when the user leaves it alone. The lead was never marked converted and no
account, contact or opportunity survived the run. The flow now starts from the
same default the screen shows ("no opportunity"), so an unanswered checkbox
converts the lead exactly as leaving it clear was always meant to.

Two scheduled automations were hardened against the same class of failure before
it could bite: **Contract Renewal** (a contract whose renewal-notice days or
auto-renewal flag were never written would have taken the whole 500-contract
sweep down with it) and the **Large Deal Approval** tier gate.
