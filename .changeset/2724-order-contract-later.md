---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: an order placed under a contract later passes the contract to its plan steps, invoices and payments (#2724).** Before, a plan step, an invoice or a payment took the order's contract only when the record itself was saved, so an order that got its contract afterwards (with **Draft Contract**, or by choosing its **Contract**) left those records without one, and the contract's **Planned**, **Invoiced** and **Received** missed them until each was saved again. Now the new flow **Order Contract Fills Its Rows** writes the order's contract onto the order's records that name none, and the contract's totals count them at once. A record that already names a contract keeps it, and the account and the existing refusals are unchanged. Changing the order to another contract, or clearing it, still moves no record. No backfill is needed: a plan step, an invoice or a payment could first name an order in the same unreleased cycle as this change (#2560, after v6.5.0), so no installed organization holds such a record without its order's contract. No setup is needed.
