---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**A contract and its account now show what has been planned, invoiced and received, and what is still owed (REQ-0007, #2416).** The contract carries *Planned*, *Invoiced*, *Received* and *Receivable Balance*; the account carries *Invoiced*, *Received* and *Receivable Balance* across all its contracts. *Invoiced* counts issued invoices only, and the balance is what is still open on the issued invoices, so an advance not yet set against an invoice shows in *Received* and leaves the balance alone. On the contract the totals sit in its Contract Value section, on the account in Financials. The Order to Cash module adds the fields to the two core objects, so they leave with it when a tenant disables the module. Everyone who reads the contract or the account reads them, and nobody edits them. Labels ship in en, zh-CN, ja-JP and es-ES; the Order to Cash docs and manual describe them.
