---
'hotcrm': patch
---

The **⏰ SLA at Risk** tab no longer lists cases that have already been
resolved.

The tab selected on `is_closed == false`, but that flag is derived from
`status` as `status === 'closed'` and never flips on `resolved`. The flow that
owns SLA breach detection — `case_sla_monitor` — has always excluded both
statuses (`resolved` and `closed`). So the two surfaces disagreed about the
same case: the sweep would not flag a resolved case as breached, while the tab
still listed that case for a service agent to pick up. An agent working the
queue could be handed work the automation had already decided was finished, and
nothing on the screen said so.

The view now selects on the same predicate the sweep uses — `status not_in
['resolved', 'closed']` — so the surface a human reads and the surface that
acts answer this one question the same way. The priority half of the filter
(`high` / `critical`) is unchanged.

**What changes for a user:** a resolved high-priority case disappears from the
⏰ SLA at Risk tab. It was never actionable there — resolving a case is what
takes it out of SLA scope — so the tab now shows the work it claims to show.
Closed cases were already excluded and still are. Nothing else moves: the
**Cases by Status** kanban still has a `Resolved` column (that board's contract
is the lifecycle itself, and it is where a card lands when an agent drags one
across), and **My Open Cases** is unchanged.

This is the same defect #1145 fixed on the triage tab and its sharing rule, in
a fifth place. `test/live-work-predicate-parity.test.ts` pins every consumer of
"no longer live work" by name against one declared set, and `sla_at_risk` moves
from that file's boundary roster into its consumer roster here — so this
spelling cannot grow back quietly. `test/sla-at-risk-live-work.test.ts` is the
behavioural half: it runs the shipped view filter through a real engine on both
drivers, over a resolved case that satisfies every other clause, and asserts the
row does not come back.
