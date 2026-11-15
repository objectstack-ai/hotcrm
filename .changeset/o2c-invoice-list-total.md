---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The All Invoices list no longer totals Amount, which counted cancelled invoices (hotcrm#2463).** Its footer now totals Paid and Open only; a cancelled invoice is open for nothing. The invoice and payment import guide and the in-app manual (en, zh-Hans, zh-Hant) also warn that a billing milestone name used on more than one contract fails the import row, and say to put the step's record ID in that column instead, until the platform resolves the name within the row's contract (objectstack#33523).
