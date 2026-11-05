---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash now holds a contract's collection plan, its invoices and its payments (REQ-0007, #2315).** Three new objects sit under the contract: *Billing Milestones* (the plan: what is due, when, and how much of it has been invoiced, received and is still open), *Invoices* and *Payments*, each linked to the contract's account. A payment names its invoice and takes the invoice's plan step; an invoice with no due date takes the contract's payment terms. A *Bill* is a payment method of its own and needs a maturity date.

Reps get two views, *Overdue Invoices* and *Planned This Month*, and see the plan, invoices and payments as tabs on the contract and account pages. Finance enters invoices and payments by hand or imports them from the ERP; the two import mappings key on the ERP reference, so importing the same file twice updates the rows instead of duplicating them (templates in `assets/import-templates/`). A new *Accounts Receivable* position and permission set (`ar_accountant`) carries the finance access; reps and managers read invoices and payments and keep the plan. Labels ship in en, zh-CN, ja-JP and es-ES, with an in-app manual and docs under *Order to Cash*.

The contract and account totals arrive with #2416. A tenant that does not use the module disables the package.
