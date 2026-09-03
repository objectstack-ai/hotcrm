---
'hotcrm': patch
---

Staff the demo org's two case-routing pools, so the case features that decide
**who ends up holding the case** finally do something on a demo box.

`pnpm demo:staff` created three people — two territory reps and a sales manager
— and nobody in the service line. Two shipped hooks pick an owner out of a
position pool: `case_auto_assign` round-robins an ownerless case (a web-to-case
submission, an email import) to the least-loaded `service_agent`, and
`case_escalation_reassign` hands an escalating case to the least-loaded
`service_manager`. With both pools empty, both took their no-op path every
single time: intake landed ownerless in the triage tab and an escalation was
only a flag, a status and a message. Nothing in the demo showed either feature
working.

Two rows are added — one service agent, one service manager — and they light
four things that were dark:

- `case_auto_assign` (intake round-robin) now places a case;
- `case_escalation_reassign` now moves an escalating case to a manager;
- `case_escalation_sharing` gets its first holder, so a manager reads and edits
  the open critical cases they do not own;
- `case_unassigned_triage_sharing` gets its first holder, so an agent can see
  the unowned backlog they are meant to pull from.

**`case_director_sharing` is not among them, and that is not an oversight.**
That rule shares with `service_director`, which stays unstaffed: measured, its
holder count is still zero, and the test now pins that zero so nobody staffs the
director "to finish the set".

This is a *decision* about the demo org, not a tidy-up, and the fence that says
so is strengthened in the same change rather than merely opened. Staffing a
position needs a maintainer ruling — #640 established that and the 2026-08-31
ruling is what crossing it looks like. `test/demo-staffing.test.ts` still refuses
the other six leadership positions, and its failure message now has to explain
the *distinction* instead of stating a blanket: a position is staffed only when
a shipped hook picks an owner out of it, so an empty pool means a code path that
never runs at all — not merely a bench nobody sits on. Each pool is pinned at
exactly one holder, the two pools must be different people, and the file header
of `src/sharing/demo-staffing.ts` now states in its opening lines that a row
exists to make a mechanism visible and that this table is not an org chart.

Nothing ships to a customer install: the staffing table is deliberately outside
the published artifact, and the guard that keeps it there is unchanged.
