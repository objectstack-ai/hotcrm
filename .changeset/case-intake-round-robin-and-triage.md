---
'hotcrm': patch
---

Give inbound cases an owner, and make the case that has none visible.

A web-to-case submission arrived ownerless by design — the guest-sanitisation
branch of `case_sla_defaults` strips a client-supplied `owner_id`, correctly,
because a public form must not choose its own owner — and then had nowhere to
go. ObjectStack has no queue engine (`sys_queue` does not exist; the `queue`
sharing-recipient and approver enum members are deprecated upstream), and
HotCRM had no substitute for cases, so an inbound case landed with nobody
accountable for it and no view that could even list it. Non-portal cases were
unaffected: those default to their creator.

Two things ship together, because either alone leaves a silent state.

**`case_auto_assign`** assigns an ownerless new case to the service agent with
the fewest OPEN cases — a load-balanced round-robin needing no rotation
counter, copied from the `lead_auto_assign` precedent that already does this for
inbound leads. The pool is whoever holds the `service_agent` position
(`sys_user_position`). It writes `owner_id`, the one ownership column since
#548, so the assigned agent really owns the case rather than being named on it.
Load counts exclude `resolved` and `closed` (not `is_closed`, which only flips
on `closed` and would keep finished work counting against an agent — the same
`$nin` predicate `case_sla_monitor` settled on). It runs at priority 250, after
the guest strip at 200: `lead_auto_assign` shipped below its strip and had every
web-to-lead assigned and then un-assigned, so the ordering is pinned rather than
assumed.

**`Unassigned — triage`**, a pinned list view on `crm_case`, is the other half.
The pool is EMPTY on a fresh install — `sys_user_position` membership is runtime
data — and assignment also stands down when the read is denied, which is the
normal anonymous-form case. Both leave the case ownerless, which is the right
behaviour (intake must never be blocked) and was previously invisible. The view
filters `owner_id is_null` and excludes closed cases, so its row count is the
intake backlog. Label and empty state are authored in all four locales.

No permission-model change. Stamping another user's `owner_id` is a transfer,
denied by the platform's #3004 guard without `allowTransfer`, and whether that
gate applies is a property of the SEAM rather than of the object — so it was
measured rather than inherited: against a real ObjectQL with a recorder on the
same middleware seam the security plugin uses, a `crm_case` insert whose
`beforeInsert` hook stamped `owner_id` reached the middleware with no `owner_id`
at all, while the stored row carried the assigned agent. `crm_case.allowTransfer`
is therefore neither needed nor granted. The measurement is pinned, with a
negative control, in `test/case-assignment.test.ts`; if a platform release ever
moves the guard downstream of the hook phase, that test goes red rather than the
feature failing quietly in production.

⚠️ This is explicitly an **app-level stopgap**. It lives alone in
`src/objects/_case-assignment.ts` — the single home for "who should own this
case", so the escalation-reassignment work in #1070 extends it instead of
authoring a second ownership path — and that module is the code to delete, not
adapt, when a platform queue or assignment-rule engine lands. Fixes #596.
