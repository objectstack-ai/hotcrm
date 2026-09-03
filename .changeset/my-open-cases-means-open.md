---
'hotcrm': patch
---

**My Open Cases** now lists cases whose status is neither *Resolved* nor
*Closed*. It used to list every case that was not *Closed*, so an agent's
"open" queue carried their finished work as well as their live work.

The tab filtered on `is_closed`, which the case hook derives as
`status === 'closed'` — it never flips on *Resolved*. Measured on the seeded
demo population: of 38 cases, the old predicate returned 30 and 7 of those 30
were resolved; the new one returns 23. Nothing else changes — no case is added
to the tab, and the seven that leave it are reachable in *All Cases*, on the
*Service Workflow* board where *Resolved* is a column of its own, and by
searching. A resolved case is finished work awaiting closure, and the
mainstream reading of "open" in a service queue excludes it: Zendesk's open set
omits Solved, and ServiceNow's out-of-the-box *Open* filter is
`state not in (Resolved, Closed, Cancelled)`.

The two sharing rules that hand a service manager `edit` and a service director
`read` on critical cases are **unchanged**, deliberately. They also stand
through the whole `resolved → closed` window, and there that reach is the
feature: `resolved` means "the agent believes this is fixed", and reviewing it —
quality sampling, the call-back, a reopen when the fix did not hold — is
precisely what a manager does in that window. Both grants are narrow (critical
only) and bounded (closing the case ends them). The reasoning now sits beside
each rule in the source, and both stay pinned on the boundary roster of
`test/live-work-predicate-parity.test.ts`, so a later "consistency" pass that
tries to align them turns that guard red instead of quietly revoking access.
