---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Reps keep the collection plan, and finance enters invoices and payments (#2462).** Billing Milestones, Invoices and Payments now ask only read access to their contract for a write (`writeRequiresMasterRead`, ObjectStack 18.5.0, objectstack#33250). A sales rep adds, edits and removes the plan steps of any contract they can read, and the Accounts Receivable position enters and imports invoices and payments on every contract, without either being given edit on the contract. Each still writes only what their permission set allows: reps never write an invoice or a payment, finance never changes the plan, and someone who cannot read a contract writes none of the three. The "for now, an administrator enters them" notes are gone from the Order to Cash docs and the in-app manual in every language.
