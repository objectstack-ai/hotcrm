---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: confirming an order again refuses a Total Price below what it has already invoiced or received (#2827).** Since #2826 a confirmed order's amount changes only by sending it back to Draft and confirming again; that move could take the total below what had been received or invoiced, and **Unpaid** or **Uninvoiced** then sat at zero over a real overpayment while the payment plan no longer added up.

FROM → TO:

- **Draft → Confirmed, with something already invoiced or received.** FROM confirmed at any total. TO refused when the new **Total Price** is below **Received** ("This order's Total Price is below what was already received (Received). Deal with the overpayment or the invoices first, then confirm.") or below **Invoiced** ("… below what was already invoiced (Invoiced). Cancel or correct the invoices first, then confirm."), shown on **Total Price**. A total equal to the figure confirms. Example: with 10,000 received, a total of 8,000 is refused; a total of 12,000 confirms and **Unpaid** reads 2,000.

A first confirm (nothing invoiced or received), and any edit or status move of an order already confirmed, are not checked, so an order confirmed below its figures before this release keeps its status. The rule is the Order to Cash module's: a tenant without the module has neither the figures nor the rule. The messages are in English, Chinese, Japanese and Spanish; they name the fields rather than the amounts, because the platform does not yet put record values into a rule's message, and the order's page shows **Total Price**, **Invoiced** and **Received** side by side. No setup is needed.
