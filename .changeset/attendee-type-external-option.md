---
'hotcrm': patch
---

Give an external guest an honest `attendee_type`, and make the type agree with
the column that is filled.

`crm_event_attendee` declared four ways to name a person in its
`attendee_resolves` rule — `crm_contact`, `crm_lead`, `sys_user`,
`external_name` — and only three values in `attendee_type` (`contact`, `lead`,
`user`, defaulting to `contact`). The two lists were authored separately and had
drifted, so the guest `external_name` exists for (a prospect's lawyer, in no CRM
object at all) had no honest type to be stored under. Measured on 17.0.0-rc.6
before this change, on a real engine:

```
insert { attendee_type: "contact", external_name: "the prospect's lawyer" }
  -> ACCEPTED
insert { external_name: "no type given" }          // type left to its default
  -> ACCEPTED, stored as attendee_type: "contact"
insert { attendee_type: "external", external_name: "Jane Roe" }
  -> ValidationError: Attendee Type must be one of: contact, lead, user
```

The stored row then claimed to be a Contact while pointing at no contact, and
every query that filters on the discriminator — "internal attendees only", named
in the object's own note — counted it in the wrong bucket. The activity actions
never write an external name, but the Console's attendee form writes all three
shapes above, which is what made this a live defect rather than dead metadata.

Now:

- `attendee_type` ships a fourth option, **External**, labelled in all four
  locale packs.
- `attendee_resolves` requires the column the type NAMES, and a new
  `attendee_type_exclusive` refuses any other party column on the same row. A
  row can no longer be filed under one type while naming another, in either
  direction.
- Both rules and the picklist are generated from ONE declared correspondence in
  `src/objects/event_attendee.object.ts`, so a fifth resolution cannot be added
  without its type, or a type without the column it names — the drift that
  caused this is no longer expressible.

Existing rows are unaffected in storage, and no seeded data changed: every
seeded attendee row already paired its type with its column, which
`test/attendee-type-resolution.test.ts` now sweeps and pins. That file also
drives the whole acceptance surface on a real kernel in both directions — the
newly legal external row is accepted, and each newly illegal shape is refused
with a `ValidationError` (`code: VALIDATION_FAILED`) reaching the caller. A row
naming two parties at once is now refused outright, which retires the one
documented cost of the #711 cascade work.

Refs #740.
