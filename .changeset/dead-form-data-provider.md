---
'hotcrm': patch
---

Remove the `form.data` provider from all twelve view files. A form binds to its
object and record through the route context, so the block never wired anything —
the platform's own `liveness-dead-property` rule flagged every one of them.
Verified before removal, not taken on the validator's word: with the blocks gone,
a lead record's edit form still binds on 16.1.0 (8 inputs, 7 populated from the
record). Adds two guards — no view may reintroduce `form.data`, and every view
must still resolve its object from the list provider now that the `form.data`
fallback is gone. Clears the last 12 validate warnings; `pnpm verify` goes from
15 warnings to 3 (all pre-existing).
