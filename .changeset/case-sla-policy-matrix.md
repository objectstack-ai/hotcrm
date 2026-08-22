---
'hotcrm': minor
---

Give every case an SLA clock, from a priority × account-tier matrix, and move
the first-response stamp to a single writer that every touchpoint passes through
(#595).

**The SLA matrix.** The app's entire SLA logic was one line — `critical` ⇒
`sla_due_date = now + 4h` — so High, Medium and Low cases got no due date at
all. That was not a cosmetic gap: `case_sla_monitor`, the hourly breach sweep,
selects cases whose `sla_due_date` is in the past, and a blank date never is.
Three of the four priorities could therefore not breach, not because the sweep
excluded them but because they had no deadline to miss. `crm_account.tier` — the
obvious driver, with four options declared on the account object — was read by
nothing outside `src/views/account.view.ts`.

`case_sla_defaults` now stamps `sla_due_date` on every case with a recognised
priority, from a sixteen-cell table of hours:

| | Strategic | Enterprise | Mid-Market | SMB |
| --- | --- | --- | --- | --- |
| **Critical** | 4 | 4 | 4 | 4 |
| **High** | 6 | 8 | 8 | 8 |
| **Medium** | 24 | 36 | 48 | 48 |
| **Low** | 96 | 120 | 168 | 168 |

The **Critical row is flat at four hours deliberately**. Every critical case used
to get four hours whatever the account, so letting tier stretch that row would
have *removed* a deadline from work that already had one; flat keeps the change
a strict superset — nothing loses a clock, three priorities gain one. No cell is
looser than the per-priority target the docs have always published (High 8h,
Medium 2 days, Low 7 days): the lowest tier gets exactly that and the higher
tiers get tighter. An unreadable or unclassified account falls back to the `smb`
column (the tier field's own default), because inventing a *tighter* deadline
out of a permission error would manufacture breaches; anonymous web-to-case,
which can create a case and read nothing else, is the ordinary example. A
priority the table has no row for still gets no due date, rather than a guessed
one.

**These are calendar hours, and the code and docs now say so out loud.** This
app has no business-hours calendar, no working-day definition and no holiday
list, and the platform ships no such service — so a P1 raised at 5pm on a Friday
is due at 9pm that same Friday, and a Low case raised on the 23rd of December
runs its week down over the holidays. The assumption is stated in
`src/objects/_case-sla.ts`, in the hook body beside the numbers, on the case
object's `sla_due_date` field, and across the SLA, cases, setup, FAQ and
glossary pages in all three doc locales. The offset is also added as elapsed
milliseconds rather than `setHours(getHours() + n)`, which does *local* calendar
arithmetic — on a DST-observing host that silently turned "+4 hours" into 3 or 5,
and a 168-hour clock crosses a transition twice a year by construction.

The table is written twice on purpose — `src/objects/_case-sla.ts` for the seed
generator, and a hand-copied mirror inside the hook body, because L2 hook bodies
run body-only in the QuickJS sandbox and a module constant arrives there as
`undefined`. `test/case-sla-matrix.test.ts` pins all sixteen cells by driving the
shipped handler, so neither copy can move without the other.

Seeded case due dates are now derived from the matrix and the seeded account's
tier instead of being hand-typed, and `test/seed-consistency.test.ts` re-derives
them. Demo cases older than their target are consequently past due — which is
what a breach is, and what the hourly sweep exists to notice.

**First response.** `crm_case.first_response_date` was stamped from the
`log_call` / `log_meeting` action body, so it was written only when an
interaction was recorded through those two buttons; an event created any other
way left the metric null, under a comment asking every future author to remember
to stamp it too. The stamp now lives in `event_activity_bubble`
(`src/objects/event.hook.ts`), which already fires on exactly the right
condition — a `crm_event` on its transition into `held` — and already resolves
`related_to_case`. Both actions still stamp the case, because their body writes
the event this hook watches; they simply no longer each carry a copy of the rule.
Two writers racing on a "first" timestamp is how it becomes a "last" one.

Two things are still deliberately not a first response: a **status change** (an
agent can move a case to *In Progress* and investigate for an hour while the
customer hears nothing) and a meeting merely **booked**, which is `planned`
rather than held.

**Not included:** escalation still does not reassign. The flow-template
dot-walk limitation that blocks it is unchanged, and routing a case to the
`service_manager` pool needs a transfer grant and a re-entrancy story of its own;
it is filed as follow-up work rather than bolted on here.
