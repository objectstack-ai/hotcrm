---
'hotcrm': patch
---

Make record-change flow conditions TOTAL, so three automations stop silently
failing to run on Mongo- and memory-backed installs.

A flow's start/edge condition is bare CEL, and strict CEL aborts the whole
expression on a key that is not present — not just on a null one. The
record-change trigger builds the flow's `record` as the mutation payload with
the **driver's post-write row** overlaid, and `previous` from the driver's prior
row, so on a datasource that stores only the columns a row was written with
(`driver-memory`, `driver-mongodb`; the SQL family is column-complete and
unaffected) an unwritten field arrives genuinely MISSING. Three conditions read
such a field with no guard, and were measured aborting end-to-end:

- **`case_escalation_on_create`** — a case created critical is stored with no
  `escalated_date` column, so `record.escalated_date == null` aborted and a
  phone-in P1 was never escalated. That is the flow's core population.
- **`contact_welcome`** — `owner`'s `os.user.id` default cannot evaluate on a
  write that carries no user (seed data, integrations, any system context), so
  the row has no `owner` column and `record.owner != null` aborted; no seeded
  contact ever produced a welcome prompt.
- **`lead_assignment`** — `rating` is neither required nor defaulted, so
  `record.rating >= 4` aborted and an unrated lead got no SLA stamp and no
  alert at all.

The failure was quiet because CEL's `&&` absorbs an error beside a `false`
operand: these conditions answered correctly for every record they were meant
to skip, and blew up only on the records they were meant to act on. The run is
recorded as failed and logged at ERROR, but the write itself succeeds and
nothing user-visible says the automation did not happen.

Every `record.x` / `previous.x` read in a record-change flow condition now
carries a `has(...)` guard, and every ordering comparison additionally carries
`!= null` (an explicit null passes `has()` and then aborts with
`no such overload: dyn<null> > int`). The rewrites are conservative — verified
across the full cross-product of absent/null/valued shapes, they return the
same answer as before wherever the original returned one at all. Two places
needed a judgement call and say so in-file: `lead_assignment`'s two branches
must PARTITION, so the standard branch absorbs an unreadable rating rather than
both branches going false and dropping the lead silently; and
`opportunity_won_alert` guards `previous.stage` fail-closed, because that term
exists solely to stop a repeat congratulations blast to management.

Adds `test/flow-condition-totality.test.ts`, which enforces the rule three
ways: a structural sweep for the guards, a measured sweep that runs every
condition through the real `AutomationEngine.evaluateCondition` across the
shapes a sparse driver produces, and end-to-end tests that boot a real ObjectQL
over `InMemoryDriver` with the real record-change trigger and reproduce each of
the three defects. It also pins the counter-fact to
`test/sharing-seeding.test.ts`: `has()` is correct here and is *rejected* on the
sharing surface, which compiles its conditions to pushdown filters instead of
interpreting them — so neither conclusion can be carried across. Refs #633,
#630.
