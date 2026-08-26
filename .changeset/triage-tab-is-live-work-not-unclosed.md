---
'hotcrm': patch
---

The **Unassigned — triage** tab and the triage sharing rule now mean *live
work*, not *not-yet-closed*. Both move from `is_closed == false` to
`status not in ['resolved', 'closed']`.

`is_closed` is derived from the status on every write, as
`effStatus === 'closed'` — so it never flips on **Resolved**. A case that was
resolved while still ownerless therefore satisfied both of the tab's filters
and stayed there indefinitely, in a queue whose own empty-state copy says the
rows are cases that "arrive with no owner" and whose purpose is "work waiting
for a human". A resolved case is neither. Two ordinary paths produced such
rows: an agent resolving an unowned case straight out of triage (finishing a
case is deliberately not claiming it, so no owner is recorded), and an imported
or seeded case that arrives already resolved.

**Two user-visible changes.**

*The tab is narrower.* Resolved ownerless cases no longer appear in
**Unassigned — triage**, so the tab's row count is the intake backlog again
rather than the backlog plus finished work nobody happened to close. **Closed**
ownerless cases were already excluded and still are; **Resolved** now joins
them.

*⚠️ The sharing grant is narrower — this is a TIGHTENING of access.* The
`Unassigned Cases — Triage` rule gives every holder of the **Service Agent**
position `edit` on unowned cases so they can pull one out of the queue. Because
it keyed on the same flag, it was also handing every agent edit rights on every
resolved ownerless case, permanently. Those grants are withdrawn on the next
reconcile. What an agent loses is the ability to *reopen* an already-resolved
unowned case; reopening one is now an administrator's move, exactly as
reopening a closed unowned case already was. Nothing else changes: an agent can
still see, work, resolve and claim an unowned case that is still open — access
is resolved against the stored row, so a case that is open when the agent
resolves it is reachable at that moment. It simply leaves the queue afterwards
instead of staying in it.

Four other consumers of this concept — the round-robin and escalation
load-balancing counts, and the hourly SLA sweep — already excluded both
statuses. This makes the app say it once. `Service Workflow`, `My Open Cases`,
`SLA at Risk` and the two critical-escalation sharing rules are deliberately
unchanged: the kanban groups *by* status, so **Resolved** is a column on that
board rather than stale backlog, and the rest are a separate question from this
one.
