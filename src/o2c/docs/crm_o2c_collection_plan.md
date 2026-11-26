---
title: Collection Plan — What Sales Sees After the Contract
description: The payment plans planned from an order or a contract, who may change them, and what Invoiced, Received and Open count.
order: 1
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_billing_milestone
  - object:crm_sales_order
  - object:crm_contract
---

# Collection Plan — What Sales Sees After the Contract

For sales reps and managers. Order to Cash shows, on each order and contract,
whether it has been invoiced, whether it has been paid, and what is overdue.
Finance keeps the books elsewhere and records its invoices and payments here;
the one thing sales keeps is the **collection plan**, a list of **billing
milestones**.

A milestone belongs to an **account** and names the **order** or the
**contract** it plans; a milestone with neither is refused. Choosing the order
or the contract fills in the account.

**One deal's plan hangs in one place: on the order when there is one, and on
the contract only when there is no order.** Nothing stops you from planning
the same deal twice, once on each, so do not: the account's figures would not
count it twice, but the two pages would each show a plan.

When the order sits under a contract (a framework or subscription contract),
a milestone of the order takes that contract too. The order's page then shows
its own plan, and the contract's page totals the plans of all its orders. A
milestone that names an order and a different contract is refused, and so is
one whose order and contract belong to different accounts.

An order that gets its contract only after its milestones were saved (with
**Draft Contract**, or by choosing the order's **Contract**) passes it to the
milestones, invoices and payments that name no contract yet, so the
contract's page counts them at once. When the order moves to another
contract, the milestones that carried the old one move with it; when the
order's contract is cleared, they are cleared too, and the order's next
contract fills them. A milestone that names any other contract stays where it
is. Each milestone's history shows the change.

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
**Collection Plan → Payment Plans** in **Sales**, lists the
milestones whose **Planned Date** falls in the current calendar month. It
changes on the first of each month.

## Totals on the order

The order carries **Planned**, **Invoiced** and **Received**, in its
**Pricing** section, counted exactly as the contract's are, over the
milestones, invoices and payments that name the order. They leave the order
when the module is disabled. Deal results count the order's own total, never
these figures.

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
payment is saved, and nobody edits them. Everyone who reads a contract
reads its totals; the account's take a role that works with the customer's
money (sales, finance, marketing, service, project managers, administrators).
Someone who holds only CRM User, the set every member gets, or a consultant
reads the account without them.
