---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: plan steps, invoices and payments may cite a sales order, and the order page shows what is planned, invoiced and received (REQ-0010 stage 2, #2560).** A product sale has no contract to hang its money on. Now the order is the place: a billing milestone, an invoice or a payment can name the order it belongs to, and the order's page lists them and sums them.

- **New optional field:** **Order** (`crm_sales_order`) on `crm_billing_milestone`, `crm_invoice` and `crm_payment`, beside **Contract**. Only the orders of the row's account are offered; choosing one fills in the account, and the order's contract when the order sits under one.
- **A plan step names an order or a contract**, FROM → TO: the rule `billing_milestone_contract` ("Choose the contract this step belongs to") becomes `billing_milestone_source` ("Choose the order or the contract this step belongs to"). Invoices and payments may still name neither.
- **Stamping:** the account comes from the order or the contract, and an account of another customer is refused, naming the order or the contract. A row that cites an order under a contract takes that contract, so a framework contract's page totals everything under its orders, each row counted once; a row naming a different contract than its order's is refused, and so is an order and a contract of two different accounts. An invoice or payment that names a milestone (or, for a payment, an invoice) but no order takes the order from it.
- **Invoice due date:** left empty, it is the issue date plus the contract's payment terms, else the order's, else it stays as typed.
- **On the order page:** **Planned**, **Invoiced** and **Received** in the **Pricing** section, counted as the contract's are, and the **Billing Milestones**, **Invoices** and **Payments** tabs. They are contributed by the Order to Cash module and leave with it when an administrator disables the module; the order works as before. Deal results still count the order's own total, never these figures.
- **Imports:** **Invoice Import (CSV)** and **Payment Import (CSV)** gain an optional **Order** column, matched by the order number (SO-0001) or the order's External Reference; the templates in `assets/import-templates/` carry it.
- One deal's plan hangs in one place: on the order when there is one, on the contract only when there is no order. The manual says so; nothing blocks it.
- **Demo data:** Globex's Seat Expansion Order, which has no contract, carries a two-step plan, an invoice and a payment.
- **Upgrade:** nothing to do. The three Order columns are new and nullable, so an upgrade only adds them; no existing row, total or figure moves, and no `os migrate apply` step is needed.
