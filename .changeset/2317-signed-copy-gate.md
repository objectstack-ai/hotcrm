---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A contract is activated, and a quote accepted, only with the customer's signed copy on file (#2317).** `crm_contract.signed_copy` is now required to move a contract to *Activated*, and `crm_quote.signed_copy` to move a quote to *Accepted*. The save is refused with the field named, and so is a record created straight into that status, and clearing the copy from one. Records already activated or accepted without a copy keep saving unrelated edits, in the console's Edit form too (objectstack#30184, measured on 18.5.0). The demo data ships a labelled sample signed copy on the activated contract and the accepted quote, with a Chinese file name in the zh-CN story. The 2026-11-05 ruling held this gate until objectstack#30184 shipped; 18.5.0 carries it.
