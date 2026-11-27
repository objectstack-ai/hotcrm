---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: invoices and payments run in parallel; Unpaid and Uninvoiced replace the Receivable Balance; overdue is read off the payment plan; a confirmed order gets its payment plan (#2806).** Before, a payment named the invoice it paid, every invoice carried Paid, Open and Overpaid, the contract and the account showed one **Receivable Balance** (the Open of the issued invoices), and **Overdue Invoices** listed late invoices. Finance had to match each receipt to an invoice before any figure moved, and an advance or a receipt for several invoices never lowered the balance. Now a payment names the payment plan, the order or the contract it pays, and what is owed and what is late are read off the deal.

FROM → TO:

- **Payment.** FROM an **Invoice** field, with the payment's plan step taken from the invoice. TO no **Invoice** field: a payment names its **Payment Plan**, its **Order** or its **Contract**, or the account alone. The invoice's page no longer lists payments.
- **Invoice.** FROM **Payment Plan**, **Paid**, **Open** and **Overpaid** on the form and the page. TO none of them: an invoice names the order or the contract it bills. The fields are hidden, not deleted, and keep their stored values; the rules that guard them still hold for an import or an API write.
- **Payment plan.** FROM **Invoiced**, **Received** and **Open**, with Open computed when read. TO **Received** and **Open**, Open stored on the step so any list filters and sorts on it. The step's page no longer lists invoices.
- **Order, contract and account.** FROM **Receivable Balance** on the contract and the account. TO **Unpaid** (amount minus Received) and **Uninvoiced** (amount minus Invoiced), never below zero, on the order (from its **Total Price**), the contract and the account. A contract with orders owes what was ordered under it: its figures read from its **Order Amount**, not its **Contract Value**, so a framework contract worth 1,000,000 with 600,000 ordered and 100,000 invoiced reads Uninvoiced 500,000 (the maintainer's ruling of 2026-11-27); a contract with no order reads them from its **Contract Value**. An invoice or a payment entered on an order already takes the order's contract on save (form, import and API alike), and an order given its contract later passes it to its records, so the contract's **Invoiced** and **Received** count what was recorded on its orders, each record once. The account's two figures add up, once per deal, every **Confirmed** or **Completed** order and every **Activated** or **Expired** contract that has no order; a contract with orders counts through its orders, so a framework contract's ceiling is never owed. The labels avoid "Receivable" in English.
- **Follow-up.** FROM **Overdue Invoices** (issued invoices past their due date with an amount open). TO **Overdue Payment Plans** (plan steps past their planned date with an amount open), in the **Order to Cash** app and as a tab of **Payment Plans**.
- **Confirming an order.** FROM nothing. TO a payment plan step created when an order becomes **Confirmed** and has none: the order's total, planned for today plus its payment terms (Due on Receipt, or no terms, today). Confirming again adds none. When the total changes later, the step follows it only while it is the order's one step and nothing is received; otherwise the order shows **Payment Plan Differs** until its steps add up to the total. Instalments stay manual.
- **Import.** FROM an **Invoice** column in the payment file and a **Billing Milestone** column in the invoice file. TO neither (the templates in `assets/import-templates/` drop them). One receipt split across two orders is two payment rows, each with its own unique **ERP Reference**: agree the reference rule with the integrator, for example the receipt's key plus the order number.

Permission sets: CRM User and Project Team Member hide **Unpaid** and **Uninvoiced** on the account, as they hid the Receivable Balance; every set that read the Receivable Balance reads the two new figures. A permission set of your own that named `receivable_balance` must name `unpaid_amount` and `uninvoiced_amount` instead.

**Upgrading an environment.** The new stored figures hold nothing on the rows saved before the upgrade until each row is next written. After the upgrade, run, in this order:

1. `os migrate summary-nulls --apply`
2. `os migrate stored-expressions --object crm_sales_order --object crm_contract --object crm_billing_milestone --object crm_account --apply`
3. `pnpm exec tsx scripts/compare-unpaid-receivable.ts --url <your environment> --email <admin> --password <password>`, which prints each account's old Receivable Balance beside its new Unpaid and Uninvoiced. It writes nothing.

An invoice or payment saved before the upgrade that names only the contract of a deal that has an order is counted by the contract, not by the order, so the account's Unpaid and Uninvoiced do not see it: name the order on it to count it. The comparison script shows such accounts as a gap between the old and new figures.

The Order to Cash manuals, the Order to Cash pages of the documentation site, the FAQ, the quick tour, the subscription scenario, the modules page and the Project Delivery notes, in English, Simplified and Traditional Chinese, say so; the field labels are in English, Chinese, Spanish and Japanese.
