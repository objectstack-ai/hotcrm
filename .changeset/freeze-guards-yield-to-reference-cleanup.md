---
'hotcrm': patch
---

A frozen record no longer makes the people it references undeletable. The three
freeze/lock guards — the converted-lead lock, the closed-opportunity freeze and
the accepted/expired quote freeze — now yield to the engine's reference-cleanup
write, so a delete that has to clear a link on a settled record completes
instead of being refused:

```
DELETE /api/v1/data/crm_contact/<id>
→ was 400 "Opportunity … is closed (closed_won) and frozen, so its link(s)
           primary_contact cannot be cleared — which also blocks deleting the
           record(s) they point at."
→ now 200, with the closed deal's primary_contact cleared and nothing else
      about the deal touched.
```

The engine implements `deleteBehavior: 'set_null'` by UPDATING the row that
holds the lookup, so "delete this contact" reaches the holder's `beforeUpdate`
looking exactly like a user editing a settled record — which is what these
guards exist to refuse. The consequence was not cosmetic: a contact whose only
referent was a **closed** opportunity could never be deleted, and because
`crm_contact.crm_account` is a master-detail with `deleteBehavior: 'cascade'`,
that contact's **account** could not be deleted either. The only ways out were
destroying sales history or asking an admin for a system write. The same shape
blocked deleting anything a **converted lead** or an **accepted quote** pointed
at.

The yield is deliberately narrow. A write passes only when **every** one of its
non-system changes is a declared reference field going from a value to `null` —
the shape measured from the engine on 17.0.0-rc.6, which is
`{ id, <link>: null, updated_at, updated_by }`. Anything else is still refused,
verbatim as before:

* a business field changed alongside the cleared link;
* a link repointed to a different record;
* an ordinary edit to a frozen record's business fields;
* a `null` written over a field that is not a declared link.

What changes for a reader of the data: a settled record can now lose a link
without anyone having edited it, because the record it pointed at was deleted.
That is the accepted cost of being able to carry out a "delete this person"
request. The refusal messages for cleared links are gone — nothing produces
them any more — while every other refusal these guards raise is unchanged.

Refs #720, #693.
