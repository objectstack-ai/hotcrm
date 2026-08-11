---
'hotcrm': minor
---

Escalation now changes hands: an escalated case is routed to the least-loaded
holder of the `service_manager` position.

Until now an escalated case changed hands with nobody. `case_escalation`,
`case_escalation_on_create`, `case_sla_monitor` and the `escalate_case` screen
flow all write the same four fields — `is_escalated`, `escalation_reason`,
`escalated_date`, `status` — and none of them touched `owner_id`, so the agent
who could not get to the case in time was still the only person who could work
it. Since every priority carries an SLA clock, considerably more work was
landing in **Escalated Cases** still owned by whoever was already behind on it.

- **The hand-off.** A new `case_escalation_reassign` hook (`beforeUpdate` on
  `crm_case`, composed from `src/objects/_case-assignment.ts` — the single home
  for "who should own this case") moves the case to the holder of the
  `service_manager` position with the fewest open (neither `resolved` nor
  `closed`) cases. Least-loaded is self-balancing, so consecutive escalations
  spread across the team with no rotation counter to keep. Positions are flat,
  so the target is a POOL and not "the owner's manager": there is no reporting
  line to walk, and a flow could not do this at all —
  `{caseRecord.owner_id.manager}` interpolates to the literal `undefined`.
- **It costs no permission change.** The hand-off rides on the escalation
  update itself rather than issuing a second write, and that seam is invisible
  to the platform's `allowTransfer` guard — measured, with a negative control
  and the opposite reading for the `ctx.api` shape, in
  `test/case-assignment.test.ts`. `crm_case.allowTransfer` is NOT granted to
  any new profile; `service_agent` still holds transfer on `crm_task` alone.
- **It cannot loop.** Because it performs no operation of its own there is no
  second `record-after-update` for `case_escalation` or
  `case_status_side_effects` to re-fire on, and its predicate is the escalation
  TRANSITION rather than the `is_escalated` state that wedged a first-boot seed
  on 2026-07-06.
- **Three deliberate no-ops:** an unstaffed pool (the first-install norm — the
  case keeps its owner and the escalation completes), a case already owned by a
  pool member, and a write that names an owner itself. A denied pool read is
  swallowed for the same reason: reassignment must never reject an escalation.
- **The docs and the notification no longer say the opposite.** The escalation
  notice said `It remains assigned to you.`; it now states the rule and points
  at the record, so it is true whether or not the pool is staffed. The
  "the case is not reassigned" paragraphs in `content/docs/service/cases.mdx`,
  `content/docs/service/index.mdx`, `content/docs/service/sla-and-escalation.mdx`
  (each in all three locales), `content/docs/administration/automation.mdx` and
  the in-app `src/docs/crm_service.md` / `src/docs/crm_admin.md` were rewritten
  against the new behaviour — including `crm_admin.md`'s claim that critical
  cases reassign to "the owner's manager", which was never true.
