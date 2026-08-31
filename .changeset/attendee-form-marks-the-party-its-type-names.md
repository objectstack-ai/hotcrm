---
'hotcrm': patch
---

Mark the attendee party column the chosen Attendee Type names as required, at
the form, so filling one in stops being something the save discovers.

`crm_event_attendee` already declares one correspondence between
`attendee_type` and the column that type names, and two validation rules
enforce it: `attendee_resolves` (the named column must be filled) and
`attendee_type_exclusive` (no other party column may be). Both stay exactly as
they are — they are the contract every writer meets, REST included. What is new
is a `requiredWhen` on each of the four party columns, generated from the same
`ATTENDEE_RESOLUTIONS` table the rules are, so the Console marks `Contact*`
when the type is Contact and moves the star to `Lead*` the moment the type
changes. A Contact row with no contact on it is now answered while someone is
looking at the form, not after a round trip.

The duplication with `attendee_resolves` is deliberate and it is visible: a
write that omits the named column now answers twice, once per layer. Measured
on 17.1.0 against the running app, `POST {crm_event, attendee_type: "lead"}`
returned one `_record` rule violation before and two entries after — the field
one, `crm_lead: Lead is required`, plus the unchanged rule. **The accepted set
is unchanged**: every correct shape still lands, every wrong one is still
refused, and a partial update that touches neither column still returns 200.
Naming the field is what buys the star.

### What was measured and deliberately not shipped

The other half of the proposal — `visibleWhen` on the four columns, so the form
shows only the column the type names — was built and driven in a browser, and
it is **not** in this change. The Console hides a populated field without
clearing it and submits the stale value anyway. Fill Contact, switch the type
to Lead, save, and the write carries both columns; the row is refused,
correctly, by a message naming a column that is no longer on screen to clear.
On the edit path it is worse than a puzzle: a stored `contact` row re-sends its
`crm_contact` on every attempt, so it can never be retyped through the Console
at all. Nothing in `@objectstack/spec` 17.1.0 or the shipped Console clears a
value when its field goes invisible, so the hint cannot be paired into safety
from this app. Today's form shows the offending column, which is what makes
the refusal actionable.

`test/attendee-type-resolution.test.ts` pins both halves: every party column
carries a total `requiredWhen` naming its own type and none of them carries a
`visibleWhen`, with the measurement written where the next author will find it.
