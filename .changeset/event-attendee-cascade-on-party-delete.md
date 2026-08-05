---
'hotcrm': patch
---

Let a contact, lead or colleague who attended a meeting be deleted again. This is
the second half of the defect fixed for campaign members: `crm_event_attendee`
has the identical construction, and anyone who had ever been logged as a meeting
attendee was **permanently undeletable** — through the API and through the UI —
with a refusal naming an object the caller had not touched:

```
DELETE /api/v1/data/crm_lead/<id>
→ 400 {"error":"An attendee must point at a Contact, a Lead, a User, or name an
       external guest","code":"VALIDATION_FAILED","object":"crm_lead"}
```

The cause was a default nobody wrote down. The three party lookups
(`crm_contact`, `crm_lead`, `sys_user`) declared no `deleteBehavior`, so all
three took `Field.lookup`'s spec default of `set_null`. Deleting the person made
the engine's referential pass clear that column, the cleared row instantly
violated `attendee_resolves` — the rule the same object declares — and the whole
delete rolled back. The rule's `external_name` escape hatch rescued nothing,
because the activity actions that create attendees always write a party
reference and never an external name. Since logging a meeting is an ordinary
part of the sales flow, ordinary use reached it, and a GDPR-style "delete this
person" request could not be served at all.

All three party lookups now declare `deleteBehavior: 'cascade'`. An attendee row
is a junction row whose whole meaning is "this person was in this room"; once the
person is gone the row denotes nothing, so deleting a contact, a lead or a user
now removes their attendance with them.

**What changes for you:** deleting a contact, lead or user silently removes their
`crm_event_attendee` rows, so a meeting's attendee list loses that person and
attendance-based counts drop accordingly — deliberately, since the person is
gone. The meeting itself is untouched, as are attendee rows naming anybody else
and external-guest rows, which name no CRM record at all. The `sys_user` lookup
gets the same treatment on purpose: account erasure runs through better-auth's
`delete-user` / `admin/remove-user` routes onto the same delete path, and every
other user reference in the app already degrades on deletion, so this junction is
not the place to start vetoing it — deactivation (ban / unban), not deletion,
remains the ordinary offboarding path and is unaffected. Deleting a **meeting**
that still has attendees is still refused, now visibly the only refusal left, and
it names the real obstacle: a meeting's attendee list is its historical record.
Refs #711, #696.
