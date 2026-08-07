---
'hotcrm': patch
---

Recalling a Large Deal Approval no longer marks the opportunity **Rejected**.

Withdrawing an approval request left the two halves of the record contradicting
each other: the request was correctly `recalled`, while the opportunity's
**Approval Status** read `rejected`. Anything driven by that field — the deal
banner, pipeline and win/loss reporting, and any automation keyed on the
status — counted every withdrawal as a deal that had been turned down. The
owner was also emailed "your opportunity was not approved", for a request they
had withdrawn themselves.

Two independent causes, both in HotCRM's own metadata:

- **`crm_opportunity.approval_status` did not offer `recalled`.** An approval
  node with `approvalStatusField` makes the platform mirror the request's own
  status string onto the record, unmapped; a value the picklist does not
  declare is refused by the engine and the mirror swallows the refusal. The
  option now exists (labelled in all four locales), so the mirror lands. This
  also repairs a second path that has no other writer at all: when a flow run
  dies, the platform abandons its pending request as `recalled` and mirrors
  that without resuming anything — previously leaving the deal stuck showing
  *In Approval* forever.
- **The `opportunity_approval` flow read only one meaning of its `reject`
  branch.** A recall resumes the run down the same `reject` edge a genuine
  rejection uses, distinguished only by the resume envelope's
  `decision: 'recall'`. The flow now reads it: a recall routes to a new
  `mark_recalled` step (status only, no "deal rejected" notification), while
  every real rejection — including the automatic one past the revision limit —
  keeps its existing behaviour.

New status value: **Recalled** / 已撤回 / Retirada / 取り消し済み. A recalled
deal is not re-submitted automatically; the amount threshold re-submits on the
next save only from *Not Required*, exactly as a rejected deal behaves today.
