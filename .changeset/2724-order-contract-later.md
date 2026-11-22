---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: an order's plan steps, invoices and payments follow the order's contract (#2724).** Before, a plan step, an invoice or a payment took the order's contract only when the record itself was saved. An order that got its contract afterwards (with **Draft Contract**, or by choosing its **Contract**) left those records without one, and an order moved to another contract left them under the old one, so the contract pages counted them in the wrong place until each record was edited by hand. Now the new flow **Order Contract Follows to Its Rows** keeps them with the order. Records that name no contract take the order's new contract. Records that carried the previous contract move to the new one, so the old contract's **Planned**, **Invoiced** and **Received** fall and the new one's rise. When the order's contract is cleared, those records are cleared too, and the order's next contract fills them. A record that names any other contract stays where it is, and the account and the existing refusals are unchanged. The flow writes for whoever edits the order, so a sales rep's order edit changes the **Contract** of finance's invoices and payments, and nothing else on them. The **Contract** field of plan steps, invoices and payments now keeps history, so each record shows the change. No backfill is needed: plan steps, invoices and payments could first name an order in this same unreleased cycle (#2560, after v6.5.0), so no installed organization holds such a record. No setup is needed.
