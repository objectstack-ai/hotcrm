---
"hotcrm": patch
---

**An accepted or expired quote no longer takes new line items.** The quote itself was already
frozen once the customer accepted it (or it expired), but its line items were not: a rep could
add a line from the quote's Line Items panel, or change the quantity or price of an existing
one, and the save went through. The quote kept its accepted subtotal and total, so its lines no
longer added up to it, while the contract drafted from it carried the accepted figure.

Adding a line to an accepted or expired quote, changing one of its lines, or moving a line onto
or off such a quote is now refused with *"Quote QTE-0007 - Annual Renewal is accepted, so its
line items can no longer be added or changed."* (409, `RECORD_LOCKED`). A draft, in-review,
presented or rejected quote takes line changes as before. Imports and other system writes are
not affected, and the one-time line-number back-fill (`scripts/backfill-line-number.ts`) still
numbers the lines of settled quotes.

Not changed: removing a line from an accepted or expired quote is still allowed, and deleting
such a quote still deletes its lines. Whether a single line may be removed is an open decision
on #2060.
