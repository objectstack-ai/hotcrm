---
"hotcrm": patch
---

**A settled quote's line-item refusal names the status by its label (#2338, item 16).**

Adding, changing or removing a line item on an accepted or expired quote now tells the user "Quote QTE-0007 - Acme Renewal is Accepted, so its line items can no longer be added, changed or removed." Before, the console showed the status's API value, "is accepted".

The error code stays `RECORD_LOCKED` (409). The diagnostic `message` that API callers and logs read is unchanged and still carries the API value; the user sentence rides `userMessage`, as it already does for the quote's own freeze and the closed-deal line freeze. No data migration is needed.
