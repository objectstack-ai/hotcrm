---
'hotcrm': patch
---

A deal's line items can no longer be changed while an approval locks the deal, so its amount keeps matching its lines

While a deal waits on its **Large Deal Approval**, the deal itself is locked. Its line items were not: a rep could
still add a product, change a line's quantity, sales price or discount, or remove a line. The line was saved, but the
deal's **Amount** could not follow it, because the approval lock also refused the automatic amount update. The deal
then showed one amount (and the approver was asked to sign off on it) while its lines added up to another. The
only trace was an error in the server log.

- **A line write on a locked deal is now refused, and nothing is saved.** Adding, changing, moving or removing a
  line of a deal under approval answers "Opportunity *name* is locked while an approval is in progress, so its line
  items cannot be added, changed or removed until that approval is complete." The REST API refuses the same write
  with `409 RECORD_LOCKED`. This is the same rule a closed deal and an accepted quote already apply to their lines.
- **The same applies while a status-change (won/lost) request is waiting for approval**, on an install that turns
  that approval on, because it locks the deal the same way.
- **Nothing else changes.** A deal that is not under approval takes lines as before, and its amount follows them.
  Once the approval is decided (approved or rejected), the lines can be edited again. A qualification approval does
  not lock the deal, so it does not hold the lines either. Deleting the whole deal still deletes its lines.
- No data migration is needed: a fresh install has no deal whose amount differs from its lines.
