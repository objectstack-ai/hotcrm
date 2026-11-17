---
title: Collection Plan — What Sales Sees After the Contract
description: The billing milestones planned from a contract, who may change them, and what Invoiced, Received and Open count.
order: 1
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_billing_milestone
  - object:crm_contract
---

# Collection Plan — What Sales Sees After the Contract

For sales reps and managers. Order to Cash shows, on each contract, whether it
has been invoiced, whether it has been paid, and what is overdue. Finance keeps
the books elsewhere and records its invoices and payments here; the one thing
sales keeps is the contract's **collection plan**, a list of **billing
milestones**.

A milestone belongs to the contract's **account** and names the contract it
plans; a milestone without a contract is refused. Choosing the contract fills
in the account.

## Who may change the plan

Reps, sales managers and administrators add, change and remove the milestones
of any account they can read; editing the account or the contract is not
needed. Everyone who can read an account and its contracts reads its
milestones. Finance reads them and never changes them.

## What the figures count

| Figure | What it counts |
| --- | --- |
| **Invoiced** | The invoices linked to the milestone whose status is **Issued**. A cancelled invoice does not count. |
| **Received** | Payments linked to the milestone: those finance linked directly, and every payment against an invoice of the milestone. |
| **Open** | **Planned Amount** minus **Received**. Below zero means more was received than planned. |

None of them is typed in: they move when finance saves an invoice or a payment.
A payment against an invoice takes the invoice's milestone automatically. If
finance later moves the invoice to another milestone, payments already
recorded keep the old one until the invoice is chosen again on them.

**Accepted Date** is the day the customer signed a milestone off. A person
records it; nothing sets it for you.

## Planned This Month

**Follow-up → Planned This Month** in the **Order to Cash** app, also a tab of
**Collection Plan → Billing Milestones** in **Sales**, lists the
milestones whose **Planned Date** falls in the current calendar month. It
changes on the first of each month.

## Totals on the contract and the account

The contract carries **Planned**, **Invoiced**, **Received** and
**Receivable Balance** over the records that name it; the account carries
**Invoiced**, **Received** and **Receivable Balance** over all its invoices and
payments, including those with no contract. **Invoiced** counts issued
invoices only. **Receivable Balance** is what the customer still owes on the
open invoices: the **Open** amount of the issued invoices, summed. A payment
not yet set against an invoice, such as an advance, counts in **Received**
only. On the contract they sit in the **Contract Value** section, and on the
account in **Financials**. They move whenever a milestone, an invoice or a
payment is saved, and nobody edits them.
