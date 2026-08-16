---
'hotcrm': patch
---

A lead flagged as a duplicate no longer makes the contact (or lead) it
duplicates undeletable.

`lead_duplicate_check` flags a new lead automatically whenever its email matches
an existing contact, writing `duplicate_of_type` alongside the lookup that names
the survivor. That pair is enforced by `requiredWhen` on `crm_lead`, and both
lookups take the platform default `deleteBehavior: 'set_null'` — which the
engine performs by updating the lead. So deleting the survivor cleared one half
of the pair, left the discriminator behind, and the lead broke its own rule on
the write the engine had just made:

```
DELETE contact with an open duplicate lead → Duplicate Of Contact is required
DELETE the account above that contact      → Duplicate Of Contact is required
DELETE the survivor in a lead↔lead pair    → Duplicate Of Lead is required
```

No conversion, no freeze and no user action were needed to reach it: a lead that
merely re-used a contact's email was enough, which is exactly the case the
dedupe exists to catch. Because contacts hang off accounts as master-detail, the
account above the contact could not be deleted either — a "delete this person"
erasure request with no way to carry it out, and an error naming a field on an
object the caller never addressed.

The lead now retires the claim whole: when a write leaves the named lookup
blank, `duplicate_of_type` and `duplicate_status` go with it, so a lead that no
longer duplicates anything stops saying it does. The pairing rule itself is
unchanged and still refuses any record that names a type without naming a
record, on create and on edit alike; the prior duplicate verdict remains
readable in the field history of Duplicate Status.

One case is deliberately unchanged: a lead already **disqualified** as a
duplicate still blocks the delete, now via the separate rule that requires a
disqualified duplicate to name its survivor. That needs its own decision and is
tracked separately.
