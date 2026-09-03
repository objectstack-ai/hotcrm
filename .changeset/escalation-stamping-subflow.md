---
'hotcrm': patch
---

Declare `crm_case.is_escalated` and `escalated_date` `readonly: true`, and move
the write that needed elevation into a dedicated `runAs: 'system'` sub-flow
instead of elevating the screen flow a person clicks (#1434, maintainer-approved
decision batch #21 ②).

**Nothing users see changes.** The Escalate Case action behaves as before: the
agent types a reason, the case flips to escalated with `priority: 'critical'`,
and the escalation flags get stamped. What changes is who makes each write.

Both stamped columns are written only by flows, never typed by anyone, so
`readonly: true` is the honest declaration — but the platform's readonly strip
is one branch of the UPDATE path (`if (!opCtx.context?.isSystem)`, over
CALLER-supplied keys), so a flow write to a readonly column survives exactly
when that flow's effective `runAs` is `'system'`. `escalate_case` is invoked
from the UI by a person and must keep running as that person, so declaring the
fields readonly would previously have silently dropped the escalation the agent
just confirmed — while the flow still reported success. That was the whole
reason the `STAMPED_NOT_TYPED` guard exemption existed.

The fix elevates the **write**, not the **flow**. `escalate_case` keeps
`runAs: 'user'` and writes only what the agent may legitimately write —
`escalation_reason` (their own screen input), `priority` and `status`. The two
stamps move into the new `case_escalation_stamp` flow (`runAs: 'system'`, one
`update_record`, exactly two columns), reached through a `subflow` node. The
option of giving the whole screen flow `runAs: 'system'` was costed and
explicitly not adopted: it would elevate every write the flow makes and stop it
carrying the acting user's context downstream.

With the cause removed rather than documented, the `STAMPED_NOT_TYPED` exemption
is **deleted**, along with the counter-pins in
`test/readonly-write-semantics.test.ts` and
`test/case-create-form-narrowing.test.ts` that existed to keep its justification
honest. `test/metadata-references.test.ts`'s guard now skips both fields for the
right reason — they are declared readonly — rather than via an exemption list.

Three things were measured on a real engine rather than assumed, and all three
are pinned in `test/readonly-write-semantics.test.ts`:

- **The ruling's premise** — a callee flow's own `runAs` governs its writes
  rather than inheriting the caller's context. A `runAs: 'system'` callee
  invoked from a `runAs: 'user'` parent has its write to a readonly column
  survive; the *same* callee declared `runAs: 'user'` is stripped, so it is the
  callee's declaration that decides and not the subflow hop.
- **The elevation is scoped to the child run.** In the same run in which the
  child's stamp lands, the parent's own later write to an identical readonly
  column is still stripped — the screen flow really does keep the acting user's
  context, which is the property this change exists to protect.
- **The write order.** Splitting one `update_record` in two creates an ordering
  constraint the single node did not have: `escalation_reason_required` rejects
  any write whose merged record has `is_escalated == true` with a blank reason.
  The reason is therefore written **first** and the stamp **second**. The
  counterfactual is measured too — stamping first is refused by that validation,
  and because the subflow reports its child's failure the run aborts before the
  reason is written either, losing the whole escalation.

`status: 'escalated'` deliberately stays in the user-context node: besides being
user-writable, it is the transition both escalation hooks key off
(`case_escalation_reassign` and `case_status_side_effects`), so keeping it there
keeps the ownership hand-off and the follow-up tasks firing from the acting
user's write exactly as before. `escalation_reason` stays writable for the
inverse reason — declaring it readonly would make the platform strip what the
agent just typed, which is this card's own harm turned onto user input.

`close_case` keeps its long-standing flow-level `runAs: 'system'` and now says
in the file that it is a historical precedent rather than a policy, so it stops
being citable as a pattern for elevating the next screen flow.
