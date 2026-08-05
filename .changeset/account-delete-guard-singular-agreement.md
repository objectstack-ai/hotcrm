---
'hotcrm': patch
---

Make the customer-account delete guard agree with itself when exactly one
opportunity blocks. The refusal switched its noun on the count but left the verb
and the closing pronoun plural, so a single open deal produced:

```
DELETE /api/v1/data/crm_account/<id>
→ 400 "Cannot delete customer account: 1 open opportunity still reference it.
        Close or reassign them first."
```

Both halves were wrong for one record — "still reference" for a singular subject,
and "them" pointing at a single opportunity the reader then has to go and find.
The plural case was already correct and reads the same as before. Now:

```
1 blocker  → "Cannot delete customer account: 1 open opportunity still
              references it. Close or reassign it first."
2 blockers → "Cannot delete customer account: 2 open opportunities still
              reference it. Close or reassign them first."
```

Wording only — the guard refuses exactly the same deletes, counts the same open
opportunities, and names the same account. The two sentences are now written out
per branch in `src/objects/account.hook.ts` rather than stitched from a noun
suffix, because agreement here runs across three words at once, and both are
measured end-to-end against a real kernel in
`test/cascade-guard-messages.test.ts`. Refs #721.
