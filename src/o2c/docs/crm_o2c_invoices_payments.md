---
title: Invoices and Payments — Who Writes Them and What Overdue Means
description: Finance's records on a contract, how a due date is filled, when an invoice is overdue, and importing.
order: 2
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_invoice
  - object:crm_payment
---

# Invoices and Payments — Who Writes Them and What Overdue Means

For sales, and for finance (the **Accounts Receivable** position). Invoices
and payments are finance's records of what it issued and received in its own
system. Finance enters or imports them; sales reads them and never writes one,
so every figure a rep sees is one finance wrote.

## Rules the screens do not show

- **Due Date.** Left empty, it is filled on save: the **Issue Date** plus the
  contract's **Payment Terms** (Net 15, 30, 60 or 90 days; Due on Receipt is
  the issue date). A date finance enters is kept.
- **Open** on an invoice is **Amount** minus **Paid**, kept up to date whenever
  a payment against it is saved. A **Cancelled** invoice is open for nothing
  and leaves every figure.
- **Overdue.** **Order to Cash → Invoices → Overdue Invoices** lists the
  **Issued** invoices whose **Due Date** is before today and that still have an
  **Open** amount.
- **One payment per invoice.** A receipt that pays several invoices is one
  payment row per invoice; there is no allocation.
- **A payment's invoice must belong to its contract.** Otherwise the save is
  refused, naming the invoice.

## Importing

Finance imports with **Invoice Import (CSV)** and **Payment Import (CSV)**.
The **ERP Reference** column is the key: a row whose reference is already on a
record updates that record instead of adding one. Every imported row reads
**Source: Import** and carries **Synced At**, the time of the import. Contracts
are named by their number (CTR-0001), invoices by their number and milestones
by their name.
