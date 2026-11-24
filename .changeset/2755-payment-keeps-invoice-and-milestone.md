---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: a payment recorded from an invoice or a billing milestone keeps it (#2755).** Before, **New** on the **Payments** tab of an invoice or of a billing milestone opened a payment whose **Invoice** or **Billing Milestone** was already chosen but hidden behind "Select Account first", and choosing the **Account** emptied it. The payment was saved under the account alone, so the invoice's **Paid** and **Open** and the milestone's **Received** did not move, and nothing said so. Now the invoice or the milestone stays chosen and visible, and the saved payment counts toward it.

On the payment form:

- FROM **Invoice** and **Billing Milestone** locked until an **Account** is chosen, and listing only that account's TO both open from the start and listing every account's invoices and milestones.
- FROM choosing an invoice or a milestone filling nothing TO choosing either filling in its **Account**, and an invoice also its **Contract** and **Billing Milestone** when the payment has none.
- FROM a payment naming another account's milestone being saved TO it being refused, with a message naming the milestone, as another account's invoice already was. The message is in English, Chinese, Spanish and Japanese.

A payment opened from an invoice's or a milestone's page still needs its **Account** chosen by hand until the platform fills it from the page it was opened on. No setup is needed, and no saved payment changes.

The Invoices and Payments manual and the Invoices and Payments page of the documentation site, in English, Simplified and Traditional Chinese, say so.
