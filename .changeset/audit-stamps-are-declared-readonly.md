---
'hotcrm': patch
---

Declare the three audit stamps `readonly`: `crm_opportunity.approval_status`,
`crm_opportunity.approved_date` and `crm_campaign_member.added_date` leave the
editable surface for every non-system caller.

**What changes for a user.** These three columns can no longer be typed over on
a record form or through an ordinary API `PATCH`. Nothing else about them
changes: they are written, read and reported exactly as before, and every
existing writer still lands its write. A hand edit is not rejected with an
error — the platform drops the key and commits the rest of the update — so the
visible effect is that the value simply does not move.

**Why they can be declared, per column.** The #1435 writer-privilege audit
enumerated every writer, and #1666 / #1667 ruled on the result (director seat,
decision batch #74, 2026-09-07).

`approval_status` / `approved_date` are written only by the approval flow.
`opportunity_approval` declares `runAs: 'system'`, and
`opportunity_approval_on_create` inherits it by spreading that flow, so
`resolveRunDataContext` hands the engine `isSystem: true` and the readonly strip
branch is skipped outright. The `approval` node's own `approvalStatusField`
write runs inside those same system runs; seeds write on INSERT, which the strip
never touches.

`added_date` is written only by INSERTs — `campaign_enrollment`'s
`create_campaign_member` and `create_contact_member` nodes and the marketing
seed. The strip is an UPDATE-path rule, so an INSERT is exempt from it and the
enrollment flow does not need elevating to keep stamping the column.

**What is deliberately given up.** An administrator could previously unstick a
wedged approval by typing over `approval_status`. That escape hatch is gone on
purpose: a stuck approval is a platform or flow defect to be fixed as one, not a
reason to keep an audit stamp hand-editable. There is no bypass and no
admin-only branch. `added_date` had no comparable hatch to give up — the two
cards were the same principle but never the same decision.

**How it is held.** `test/audit-stamp-readonly.test.ts` runs the shipped flow
nodes at their own declared `runAs` over a real ObjectQL on the real schemas and
pins both halves of the conjunction: the legitimate writers still land their
stamps, and a plain user-context UPDATE of each column is stripped while a
control column lands. Ablating either declaration turns the file red.

Two comments elsewhere cited `added_date` as the reason a neighbouring column
must stay editable and are corrected with it —
`crm_event_attendee.invited_date` (which is open because nobody has ruled on it,
not because of a strip that never reaches an insert) and
`crm_account.last_activity_date` (which is the opposite shape: an UPDATE through
a hook's `ctx.api`, the one shape that genuinely cannot be readonly).
