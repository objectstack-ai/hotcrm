---
'hotcrm': minor
---

A lead now records **what the prospect needs and roughly what it is worth**, and
conversion can be put behind a **sign-off** (REQ-0005, the `crm_lead` half of
REQ-0002's steps 6-7). Three new fields on `crm_lead`, all optional, all in the
**Qualification** group.

Until now the pipeline had no value at all before conversion. `Annual Revenue`
is the prospect *company's* turnover — a size signal, and the number lead
conversion copies onto the account it creates — so the first figure describing
the *deal* appeared only after conversion, on the opportunity, typed into the
conversion screen from memory. And nothing recorded what the prospect was
asking for: `Industry` says what they *are*, `Lead Source` says where they came
from, and neither routes, scores or reports on demand.

What a rep sees:

- **Need Type** — New Implementation · Expansion · Replacement · Renewal ·
  Consulting · Support & Maintenance · Other. A generic starter vocabulary; a
  customer's own demand taxonomy is picklist configuration on top of it, the
  same way `Industry` values are.
- **Estimated Amount** — the value of the demand, before qualification. Both
  fields are columns on **All Leads**, so the list filters and groups by either.
- **Conversion Approval** — read-only, and **Not Required** on every lead
  unless an admin arms the gate.
- The conversion screen's **Opportunity Amount** box now opens **prefilled from
  the lead's estimate** instead of blank. It stays an editable box: an estimate
  taken before qualification becomes a forecast number only when a person
  confirms it.

**The approval gate ships OFF, and turning it on is one line.** Out of the box
every lead reads *Not Required*, no approval request is ever opened, and
conversion behaves exactly as it did before — a single-seller install is not
forced through a sign-off. An admin arms it by changing the default value of
**Conversion Approval** from *Not Required* to *Pending*; from then on each new
lead opens a request routed to the `sales_manager` position (the new **Lead
Conversion Approval** flow), and until an approver signs it off the lead cannot
be converted — the **Convert Lead** button is withheld *and* a conversion
attempted over the API is refused with `RECORD_LOCKED`.

Arming the gate invalidates nothing. It is a transition gate, not an invariant:
what is refused is the act of converting, so a lead converted before the gate
existed is untouched, and a lead awaiting a decision stays fully workable —
calls, activity, notes, status and follow-ups all continue.

New user-facing page: **Sales Cloud › Lead Approval**, in all three doc
languages.
