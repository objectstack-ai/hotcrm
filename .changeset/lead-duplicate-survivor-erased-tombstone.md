---
'hotcrm': patch
---

Let an erasure complete against a lead a reviewer already closed as a confirmed
duplicate, without deleting the verdict they recorded.

Deleting a Contact — or the Account above it, which cascades — was refused
whenever any lead had been disqualified as a duplicate of that record:

```
DELETE /api/v1/data/crm_contact/<id>
→ 400 "Disqualifying a lead as Duplicate requires naming the surviving record
        and setting Duplicate Status to Confirmed"
```

This is the drain path of the Suspected Duplicates review queue, so every lead a
reviewer ever closed as a confirmed duplicate held its survivor hostage, and a
GDPR "delete this person" request against that contact could not be carried out.
#1072 had cleared the same wall for leads still carrying the machine's
`suspected` guess; the reviewer-closed case is the second, independent rule
sitting on the same path.

`crm_lead.duplicate_of_type` gains a third value, `erased` ("Erased Record"),
labelled in all four locale packs. When the engine's reference cleanup nulls the
pointer, `lead_duplicate_check` now splits on what the record already says:

- `duplicate_status: 'suspected'` (or no opinion) — the claim is retired whole,
  exactly as before. A machine's guess about a deleted record is worth nothing.
- `duplicate_status: 'confirmed'` — a person compared the two records and
  agreed, so the claim is **tombstoned** instead: the type becomes `erased` and
  the status stands. The lead goes on saying "confirmed duplicate of a record
  that has since been erased", which is a fact it could not state before.

The disqualification, its reason and the status all survive the delete, and both
delete paths — the contact directly, and the account cascading through it — now
complete.

No rule was relaxed to get there, which is the point rather than a detail. A
validation is evaluated against `{...previous, ...data}` and cannot see a
transition, so on the record "the pointer was erased" and "this claim never
named anyone" were the same state — every predicate taught to tolerate the first
also admitted the second, and `duplicate_disqualification_requires_survivor`
(#598) would have died with it. A distinct value makes the two states different
facts instead: the lookups' `requiredWhen` pairs only on `crm_lead` /
`crm_contact` so it never fires on a tombstone, and #598's rule asks for a
non-blank type plus `confirmed`, both of which a tombstoned lead still has. Both
predicates, the form's `visibleOn` and the hook-free rig that proves the rule is
declarative are all unchanged.

`erased` is written, never authored: the lead forms offer only the two object
types, so it cannot be picked, and it is stamped from exactly one line of
`src/objects/lead.hook.ts`. Both properties are pinned, the second by a source
scan that fails on a writer nobody thought to test. It is still labelled
everywhere the record is read, so a tombstoned lead shows "Erased Record" rather
than a raw enum value. Refs #1164, #1072, #1166, #598.
