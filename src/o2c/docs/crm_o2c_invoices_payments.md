---
title: Invoices and Payments — Who Writes Them and What Overdue Means
description: Finance's records on an account, how a due date is filled, when an invoice is overdue, and importing.
order: 2
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_invoice
  - object:crm_payment
  - object:crm_sales_order
---

# Invoices and Payments — Who Writes Them and What Overdue Means

For sales, and for finance (the **Accounts Receivable** position). Invoices
and payments are finance's records of what it issued and received in its own
system. Finance enters or imports them; sales reads them and never writes one,
so every figure a rep sees is one finance wrote.

Invoices and payments belong to the **account**. The order and the contract
are optional: an invoice for one order names that order; one invoice for
several orders, or an advance that matches no invoice yet, names only the
account.

The Accounts Receivable position enters and imports them on every account. It
reads every account and edits none: reading the account is enough to write its
invoices and payments.

## Rules the screens do not show

- **Account, order and contract.** Choosing an order or a contract fills in
  its account. On a payment, so does choosing an invoice or a payment
  plan, and an invoice also fills in its contract when the payment has
  none. A save that sets a payment's invoice, when the invoice counts toward a
  payment plan, gives the payment that milestone, replacing one it named: the
  milestone's **Received** counts the payments that point at it, so a payment
  that paid the invoice must count where the invoice does. A payment keeps its
  own milestone only when its invoice has none, or it has no invoice (an
  advance). An order or a contract of another
  account is refused, naming it. An order under a contract brings its
  contract: one that names a different contract is refused, and so is an
  order and a contract of two different accounts. When an invoice names a milestone but no order or
  contract, or a payment names an invoice or a milestone but none, they are
  filled in from it, so the order's and the contract's totals count the same
  records the milestone and the invoice do.
- **An invoice's payment plan must belong to its account.** Choosing a
  milestone on an invoice fills in its account. The invoice form lists every
  account's milestones; one of another account is refused on save. The message
  names the milestone, or the order or contract it filled in while the invoice
  still has it.
- **The order's contract carries to its invoices and payments.** When an order
  gets its contract after its invoices and payments were saved (with **Draft
  Contract**, or by choosing the order's **Contract**), those that name no
  contract take it, and the contract's totals count them at once. When the
  order moves to another contract, those that carried the old one move with
  it; when the order's contract is cleared, they are cleared too, and the
  order's next contract fills them. One that names any other contract stays
  where it is. This happens whoever edits the order: a sales rep's order edit
  changes the **Contract** of finance's invoices and payments, and nothing
  else on them. Each record's history shows the change.
- **Due Date.** Left empty, it is filled on save: the **Issue Date** plus the
  **Payment Terms** of the contract, or of the order when there is no contract
  or it has no terms (Net 15, 30, 60 or 90 days; Due on Receipt is the issue
  date). A date finance enters is kept. An invoice with neither has no terms to
  read: type its due date.
- **Open** on an invoice is **Amount** minus **Paid**, never below zero, kept
  up to date whenever a payment against it is saved. A **Cancelled** invoice is
  open for nothing and leaves every figure.
- **Overpaid.** A payment above what is open is accepted, typed or imported.
  The invoice counts as fully paid (**Open** zero) and the excess shows in
  **Overpaid**. It is not set against other invoices, and no **Receivable
  Balance** goes below zero because of it.
- **Overdue.** **Follow-up → Overdue Invoices** in the **Order to Cash** app lists the
  **Issued** invoices whose **Due Date** is before today and that still have an
  **Open** amount.
- **One payment per invoice.** A receipt that pays several invoices is one
  payment row per invoice; there is no allocation.
- **A payment's invoice and payment plan must belong to its account.**
  The payment form lists every account's invoices and milestones; one of
  another account is refused on save, naming it. An invoice of the payment's
  account whose own milestone is another account's is refused by the invoice
  (the milestone came from it): correct the invoice's milestone, or choose
  another invoice.

## Importing

Finance imports with **Invoice Import (CSV)** and **Payment Import (CSV)**.
The **ERP Reference** column is the key: a row whose reference is already on a
record updates that record instead of adding one. Every imported row reads
**Source: Import** and carries **Synced At**, the time of the import. Accounts
are named by their name, orders by their number (SO-0001) or their
**External Reference**, contracts by their number (CTR-0001), invoices by
their number and milestones by their name. A row needs an account, an order or
a contract: the **Account** column may stay empty when the order or the
contract (or, for a payment, the invoice) fills it.

**A milestone name used on more than one contract fails the row** ("matches
more than one record"): the import looks the name up across every contract.
An account name used by more than one account fails the same way.
Put the milestone's record ID in that column instead, the end of the address
of its page.
