---
title: Collection Plan — What Sales Sees After the Contract
description: A contract's billing milestones, who may change them, and what Invoiced, Received and Open count.
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

## Who may change the plan

You may add, change and remove the milestones of any contract whose account
you may edit. Everyone who can read a contract reads its milestones. Finance
reads them and never changes them.

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

**Order to Cash → Billing Milestones → Planned This Month** lists the
milestones whose **Planned Date** falls in the current calendar month. It
changes on the first of each month.
