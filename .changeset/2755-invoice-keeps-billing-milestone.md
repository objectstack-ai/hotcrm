---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: an invoice recorded from a payment plan keeps it (#2755).** Before, **New** on the **Invoices** tab of a payment plan opened an invoice whose **Payment Plan** was already chosen but hidden behind "Select Account first", and choosing the **Account** emptied it. The invoice was saved under the account alone, so the milestone's **Invoiced** did not move, and nothing said so. Now the milestone stays chosen and visible, and the saved invoice counts toward it.

On the invoice form:

- FROM **Payment Plan** locked until an **Account** is chosen, and listing only that account's milestones TO open from the start and listing every account's milestones.
- FROM choosing a milestone filling nothing until the invoice was saved TO choosing one filling in its **Account**, and its **Order** and **Contract** when the invoice has none.
- FROM an invoice naming another account's milestone being saved TO it being refused. The message names the milestone, or the order or contract the milestone filled in while the invoice still has it. This holds for an import and an API write too. The message is in English, Chinese, Spanish and Japanese.

An invoice opened from a milestone's page still needs its **Account** chosen by hand until the platform fills it from the page it was opened on. No setup is needed, and no saved invoice changes.

The Invoices and Payments manual and the Invoices and Payments page of the documentation site, in English, Simplified and Traditional Chinese, say so.
