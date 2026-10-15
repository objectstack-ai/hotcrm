---
"hotcrm": patch
---

**A closed opportunity no longer takes new line items.** A closed-won or closed-lost deal was
already locked, but its line items were not: a rep could add a product line to it from the
Products panel, change the quantity or price of an existing line, or move a line onto it from an
open deal, and the save went through. The deal kept its closed Amount, so its lines no longer
added up to it.

Adding a line to a closed deal, changing one of its lines, or moving a line onto or off a closed
deal is now refused with *"Opportunity Acme Renewal is closed (closed_won), so its line items can
no longer be added or changed."* (409, `RECORD_LOCKED`), the same lock the deal's own fields
have. An open deal takes line changes as before. Seed data and other system writes that carry no
signed-in user are not affected, and the one-time line-number back-fill
(`scripts/backfill-line-number.ts`) still numbers the lines of closed deals.

Not changed: removing a line from a closed deal is still allowed, and deleting a closed deal still
deletes its lines. Whether a single line may be removed is an open decision on #2078.
