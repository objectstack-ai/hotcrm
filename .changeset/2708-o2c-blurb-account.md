---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The README and the docs describe Order to Cash as the account's, not the contract's (#2708).** Since #2557, plan steps, invoices and payments belong to the account, and an invoice or a payment names a contract only when there is one. The Order to Cash line of the apps table in `README.md` and `README.zh-CN.md`, on the docs homepage, and on the *Introduction* page, still described the module by its earlier shape.

FROM → TO for that line:

- English: FROM "Each contract's collection plan, invoices and payments: what is invoiced, paid and overdue." TO "Each account's collection plan, and its invoices and payments with or without a contract."
- Simplified Chinese: FROM 「每份合同的回款计划、发票和回款：开了多少票、收了多少钱、有没有逾期。」 TO 「每个客户的回款计划，以及发票和回款，有没有合同都可以。」
- The docs homepage's Traditional Chinese line changes the same way.
- The Order to Cash row of the apps table on the docs site's *Introduction* page, in English, Simplified and Traditional Chinese: FROM "Invoices and payments recorded against each contract's collection plan" TO "Each account's collection plan, and its invoices and payments with or without a contract".

Nothing in the app changes.
