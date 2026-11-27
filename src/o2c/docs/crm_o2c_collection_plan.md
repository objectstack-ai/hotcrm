---
title: Collection Plan — What Sales Sees After the Contract
description: The payment plans planned from an order or a contract, the one a confirmed order gets, who may change them, and what Received, Open, Unpaid and Uninvoiced count.
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

## The plan a confirmed order gets

When an order becomes **Confirmed** and has no payment plan yet, HotCRM adds
one: the order's **Total Price**, planned for today plus the order's
**Payment Terms** (Net 15, 30, 60 or 90 days; Due on Receipt, or no terms,
today). An order that already has a plan gets none, and confirming it again
adds none. Instalments stay yours to plan: change the plan's amount and add
the other steps.

When the order's total changes later, a plan that is the order's only one and
has received nothing follows the new total. Otherwise the plan stays as it
is, and the order shows **Payment Plan Differs** while it has plans that add
up to anything other than its total: change, split or add plans until they
match.

## Who may change the plan

Reps, sales managers and administrators add, change and remove the milestones
of any account they can read; editing the account or the contract is not
needed. Everyone who can read an account and its contracts reads its
milestones. Finance reads them and never changes them.

## What the figures count

| Figure | What it counts |
| --- | --- |
| **Received** | The payments that name the milestone. |
| **Open** | **Planned Amount** minus **Received**. Below zero means more was received than planned. |

Neither is typed in: they move when finance saves a payment. Invoices run
beside the plan and name the order or the contract, not a milestone.

**Accepted Date** is the day the customer signed a milestone off. A person
records it; nothing sets it for you.

## Planned This Month and Overdue Payment Plans

**Follow-up → Planned This Month** in the **Order to Cash** app, also a tab of
**Collection Plan → Payment Plans** in **Sales**, lists the
milestones whose **Planned Date** falls in the current calendar month. It
changes on the first of each month.

**Follow-up → Overdue Payment Plans** lists the milestones whose **Planned
Date** is before today and that still have an **Open** amount, the oldest
first. **Open** can be filtered on in any list of payment plans.

## Totals on the order

The order carries **Planned**, **Invoiced**, **Received**, **Unpaid** and
**Uninvoiced**, in its **Pricing** section, over the milestones, invoices and
payments that name the order. **Invoiced** counts issued invoices only.
**Unpaid** is the order's **Total Price** minus **Received**, and
**Uninvoiced** its total minus **Invoiced**, neither below zero. They leave
the order when the module is disabled. Deal results count the order's own
total, never these figures.

## Totals on the contract and the account

The contract carries **Planned**, **Invoiced**, **Received**, **Unpaid** and
**Uninvoiced** over the records that name it. An invoice or a payment entered
on an order takes the order's contract, so the contract counts what was
recorded on its orders, each record once. A contract with orders owes what
was ordered: Unpaid and Uninvoiced read from its **Order Amount**, the total
of its **Confirmed** and **Completed** orders. A contract with no such order
(none at all, or only Draft and Cancelled ones) reads them from its
**Contract Value**. So a framework contract worth 1,000,000 with 600,000
ordered and 100,000 invoiced reads Uninvoiced 500,000; a Draft order under it
adds nothing until it is confirmed. The account carries **Invoiced** and **Received** over all its
invoices and payments, including those with no order or contract.

The account's **Unpaid** and **Uninvoiced** add up the figures of the deals it
has signed, each deal once:

- every **Confirmed** or **Completed** order of the account, and
- every **Activated** or **Expired** contract that has no order.

A contract with orders counts through its orders, not its value, so a
framework contract's ceiling is never owed. Draft and cancelled orders, and
contracts not yet signed, count nothing. An advance that names only the
account counts in **Received** and lowers no deal's Unpaid until finance
names the order, the contract or the plan it pays.

On the contract the totals sit in the **Contract Value** section, and on the
account in **Financials**. They move whenever a milestone, an invoice, a
payment, an order or a contract is saved, and nobody edits them. Everyone who
reads a contract reads its totals; the account's take a role that works with
the customer's money (sales, finance, marketing, service, project managers,
administrators). Someone who holds only CRM User, the set every member gets,
or a consultant reads the account without them.
