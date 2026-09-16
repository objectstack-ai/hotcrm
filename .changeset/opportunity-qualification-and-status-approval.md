---
'hotcrm': minor
---

An opportunity now records **whether it is worth pursuing**, **the customer's own
procurement calendar**, **the story behind the deal**, and **whether a won/lost call has
been signed off**. Eighteen new fields on `crm_opportunity`, two new derived sections, a
new list view, and a status-change approval gate that ships switched off (REQ-0006 — the
`crm_opportunity` half of REQ-0002's steps 8 through 14).

**Qualification.** *Will Bid*, *Controllability*, *Priority*, *Deal Level* and
*Involves Subcontracting* (with a note), in their own **Qualification** section. This is
the triage vocabulary of any seller that cannot pursue every deal, and nothing on the
object carried it before: *Forecast Category* answers a different question — it is the
roll-up bucket, derived from the stage — and a judgement about whether to chase a deal is
not a forecast. The values are generic on purpose; a grading scale of your own is
configuration on top of them.

**The customer's procurement calendar.** *Customer Initiation Date*, *Expected Tender
Date* and *Expected Signing Date*, with the amounts expected at tender and at signing.
*Close Date* is a single date and it is **our** forecast close — it could never carry
three distinct buyer-side events, which is what an outsourcing seller actually plans
against. A new **Tender This Quarter** list view windows the tender date alone, so "deals
whose tender lands this quarter" is one tab and touches the forecast close date nowhere.

**Deal Narrative** — *Customer Background*, *Project Background*, *Risk Analysis* and
*Payment Terms*, in their own section. Everything a rep wanted to write about a deal used
to collapse into one *Description* field; split apart, each part is reviewable on its own.

**Business Line**, beside *Opportunity Type* rather than inside it: type's values are a
relationship taxonomy (new business, renewal, expansion) that reporting already reads, and
a line-of-business classification is a different axis. Generic delivery-model values only.

**Status Change Approval**, and the flow behind it. With the gate armed, declaring a deal
*Won* or *Lost* is a **request** — the rep sets *Requested Status* with the win/loss
reason, the request appears in the approval inbox HotCRM already mounts, and the stage
moves only when the request is approved. Irreversible transitions are the ones worth
gating, and the approval this app had could not see them: it keys on amount alone, so a
$10K deal reached *Closed Won* with no sign-off at all. **The gate ships off.** Its switch
is the field default on *Status Change Approval*, shipped as *Not Required*, so no deal is
ever born pending, the flow's start condition is false for every record, and amount-tiered
approval behaves exactly as it does today. An install arms the gate by changing that one
default; deals that predate the arming are untouched.
