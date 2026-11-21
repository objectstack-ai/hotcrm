---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: an order placed under a contract later passes the contract to its plan steps, invoices and payments (#2724).** Before, a plan step, an invoice or a payment took the order's contract only when the record itself was saved, so an order that got its contract afterwards (with **Draft Contract**, or by choosing its **Contract**) left those records without one, and the contract's **Planned**, **Invoiced** and **Received** missed them until each was saved again. Now the new flow **Order Contract Fills Its Rows** writes the order's contract onto the order's records that name none, and the contract's totals count them at once. A record that already names a contract keeps it, and the account and the existing refusals are unchanged. Changing the order to another contract, or clearing it, still moves no record. Records saved before the upgrade are filled the next time their order's contract is set; no setup is needed.
