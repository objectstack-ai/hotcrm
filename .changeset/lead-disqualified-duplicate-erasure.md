---
'hotcrm': patch
---

Let a contact (and the account above it) be deleted when a lead was already
disqualified as its duplicate. Erasing the surviving record is now possible on
every lead that names it, not just the open ones.

A lead closed with `disqualification_reason: 'duplicate'` made the record it
named undeletable. Deleting that contact rolled the whole delete back:

```
DELETE /api/v1/data/crm_contact/<id>
→ "Disqualifying a lead as Duplicate requires naming the surviving record
   and setting Duplicate Status to Confirmed"
```

Two rules sat on that one path and each was satisfied by breaking the other.
Clearing the lookup left `duplicate_of_type` half-stated, so the cleanup retired
the whole claim — and retiring the claim removed the very `duplicate_of_type`
the disqualification rule requires. A GDPR erasure with no way to carry it out,
on the ordinary drain path of the duplicate review queue: every lead a reviewer
ever closed as a confirmed duplicate held its survivor hostage, and because
`crm_contact.crm_account` cascades, the account above it too.

The deadlock is broken at the pairing, not at the verdict. On a lead closed as a
duplicate the claim now STANDS — `duplicate_of_type` and `duplicate_status` stay
— and the type/lookup pairing stands down for that lead alone. The record keeps
saying "confirmed duplicate of a contact" while the pointer to the erased
contact is gone, which is what an erasure is supposed to leave behind: the
recorded verdict is never rewritten, no field or option value is added, and the
lead stays editable and re-pointable afterwards.

What still refuses a duplicate disqualification that names nobody — the reason
`duplicate_disqualification_requires_survivor` exists — moved rather than
disappeared. With the pairing standing down, "the pointer was erased" and "this
claim never named anyone" are the same record, and a validation is evaluated
against exactly that record, so it cannot tell them apart. A hook can, because
it also sees the previous row. `lead_duplicate_check` now clears an unbacked
discriminator on any write that ASSERTS such a claim, which makes the existing
rule refuse it with its existing sentence — so closing a lead as a duplicate of
nobody is still impossible, on insert and on update, and the pairing itself is
untouched for every lead that is not disqualified as a duplicate. Refs #1164,
#598, #1072.
