---
"hotcrm": patch
---

**Two more refusals show users field and stage labels instead of API names (#2338, items 14 and 15).**

- Editing a converted lead's identity or conversion fields now tells the user which fields by their labels: "Cannot change Company on converted lead Ada Lovelace - Acme; only its Description and Notes can still be edited. Make changes on the converted records instead." Before, the console showed "(attempted: company)".
- Adding, changing or removing a line item on a closed deal now names the stage by its label: "Opportunity Acme Renewal is closed (Closed Won), so its line items can no longer be added, changed or removed." Before, it showed "closed (closed_won)".

Both keep the error code `RECORD_LOCKED` (409). The diagnostic `message` that API callers and logs read is unchanged and still carries the API names and the attempted fields; the user sentence rides `userMessage`, as it already did for the closed-deal and settled-quote freezes. No data migration is needed.
