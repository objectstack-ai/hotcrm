---
title: Invoices and Payments — Who Writes Them and What Overdue Means
description: Finance's records on an account, how a due date is filled, what Unpaid and Uninvoiced count, what is overdue, and importing.
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

Invoices and payments belong to the **account**, and they run **in
parallel**: a payment names no invoice. An invoice names the order or the
contract it bills; a payment names the **payment plan** it collects, or the
order or the contract it pays. One invoice for several orders, or an advance
that matches nothing yet, names only the account.

The Accounts Receivable position enters and imports them on every account. It
reads every account and edits none: reading the account is enough to write its
invoices and payments.

## Rules the screens do not show

- **Account, order and contract.** Choosing an order or a contract fills in
  its account; on a payment, so does choosing a payment plan. An order or a
  contract of another account is refused, naming it. An order under a
  contract brings its contract: one that names a different contract is
  refused, and so is an order and a contract of two different accounts. When a payment names a payment plan but no order or
  contract, they are filled in from the plan, so the order's and the
  contract's totals count the same payments the plan does.
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
- **Invoiced** counts **Issued** invoices only. A **Cancelled** invoice leaves
  every figure.
- **Unpaid and Uninvoiced.** On an order, **Unpaid** is the order's amount
  minus **Received**, and **Uninvoiced** its amount minus **Invoiced**, never
  below zero; on a contract they read the same from its **Order Amount** (its
  **Confirmed** and **Completed** orders) when it has such an order, else from
  its **Contract Value**. A payment above
  what is owed is accepted, typed or imported, and Unpaid stops at zero. The
  account's two figures add up each order's and contract's own: see the
  collection plan guide.
- **Confirming again never takes an order below its figures.** An order sent
  back to **Draft** whose **Total Price** is now below its **Received** or its
  **Invoiced** cannot be confirmed: the refusal says which figure is above the
  total. Deal with the overpayment or the invoices first (cancel or correct an
  invoice, or raise the total), then confirm. A first confirm, and any edit of
  an order already confirmed, are not checked.
- **Overdue** is a payment plan's, not an invoice's. **Follow-up → Overdue
  Payment Plans** in the **Order to Cash** app lists the payment plans whose
  **Planned Date** is before today and that still have an **Open** amount.
- **A payment names one payment plan at most.** A receipt that settles several
  plans is one payment row per plan; there is no allocation.
- **A payment's payment plan must belong to its account.** The payment form
  lists every account's payment plans; one of another account is refused on
  save, naming it.

## Importing

Finance imports with **Invoice Import (CSV)** and **Payment Import (CSV)**.
The **ERP Reference** column is the key: a row whose reference is already on a
record updates that record instead of adding one. Every imported row reads
**Source: Import** and carries **Synced At**, the time of the import. Accounts
are named by their name, orders by their number (SO-0001) or their
**External Reference**, contracts by their number (CTR-0001) and payment
plans by their name. A row needs an account, an order or a contract: the
**Account** column may stay empty when the order or the contract (or, for a
payment, the payment plan) fills it. The payment file has no **Invoice**
column and the invoice file no **Billing Milestone** column. One receipt
split across two orders is two payment rows, each with its own **ERP
Reference**: agree the reference rule with whoever exports the file (for
example the receipt's key plus the order number).

**A milestone name used on more than one contract fails the row** ("matches
more than one record"): the import looks the name up across every contract.
An account name used by more than one account fails the same way.
Put the milestone's record ID in that column instead, the end of the address
of its page.
