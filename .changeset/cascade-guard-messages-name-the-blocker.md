---
'hotcrm': patch
---

Make a blocked delete name the record that actually blocked it. A cascade guard
answered with the child's own point of view, so the refusal named an object — and
sometimes an operation — the caller had never touched:

```
DELETE /api/v1/data/crm_account/<id>
→ 400 "Cannot delete contact: still referenced by 1 open opportunity(ies), …"

DELETE /api/v1/data/crm_opportunity/<id>
→ 400 "Cannot edit a converted lead (attempted: converted_opportunity).
        Make changes on the converted records instead."
```

Both refusals were correct — the records really were still referenced — but the
first told an account deleter they had asked to delete a contact, and the second
reported a *delete* of an *opportunity* as an *edit* of a *lead*, advising the
caller to go and change the record they had just tried to remove. Either way the
reader went looking at the wrong record.

Each guard has two invocation contexts and no way to tell them apart. The contact
delete guard runs on a direct delete **and** as a cascade child of an account
delete; the converted-lead, closed-opportunity and frozen-quote locks run on a
hand edit **and** on the engine's referential clear, which implements `set_null`
by *updating* the row that holds the lookup. Measured on 17.0.0-rc.2, the hook
context carries no cascade marker at all — so every refusal is now phrased from
the **blocking relationship**, which is true in both contexts:

```
Contact Ada Lovelace (<id>) is still referenced by 1 open opportunity(ies),
0 active quote(s), 0 active contract(s), so it cannot be deleted — and neither
can its account, because deleting an account deletes its contacts. Close or
reassign those records first.

Converted lead Bo Chen (<id>) is locked, so its link(s) converted_opportunity
cannot be cleared — which also blocks deleting the record(s) they point at.
Delete the lead first, or have an admin clear the link with a system write.
```

The same construction was found on two guards the report did not cover, both
reachable with the same two REST calls: deleting a contact that a **closed**
opportunity names as its primary contact, and deleting an opportunity an
**accepted** quote references. Those refusals now name the frozen record and the
link too, and every lock still names the record it refuses plus the fields that
were attempted when the write really was an edit.

**Nothing about what is refused changes** — the same deletes are still blocked,
for the same reasons, and the same records survive. This is wording only. Refs
#693.
