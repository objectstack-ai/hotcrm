---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: a payment recorded from a payment plan keeps it (#2755).** Before, **New** on the **Payments** tab of a payment plan opened a payment whose **Payment Plan** was already chosen but hidden behind "Select Account first", and choosing the **Account** emptied it. The payment was saved under the account alone, so the plan's **Received** did not move, and nothing said so. Now the payment plan stays chosen and visible, and the saved payment counts toward it.

On the payment form:

- FROM **Payment Plan** locked until an **Account** is chosen, and listing only that account's TO open from the start and listing every account's payment plans.
- FROM choosing a payment plan filling nothing TO it filling in the **Account**.
- FROM a payment naming another account's payment plan being saved TO it being refused, with a message naming the plan, as another account's invoice already was. The message is in English, Chinese, Spanish and Japanese.

A payment written through the API that still names an invoice (the field is hidden since #2806):

- FROM an invoice of the payment's account whose payment plan is another account's being refused by the plan, which the write never named, TO it being refused by the invoice: "INV-… counts toward …, a payment plan of another account. Correct the invoice's payment plan, or choose another invoice." In English, Chinese, Spanish and Japanese.
- FROM another account's invoice, named with only a contract, being refused by the order the invoice carries TO it being refused by the invoice.

A payment opened from a payment plan's page still needs its **Account** chosen by hand until the platform fills it from the page it was opened on. No setup is needed, and no saved payment changes.

The Invoices and Payments manual and the Invoices and Payments page of the documentation site, in English, Simplified and Traditional Chinese, say so.
