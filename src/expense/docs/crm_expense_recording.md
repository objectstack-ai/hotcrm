---
title: Expenses — Recording, Approval and Projects
description: Recording what you spent with its receipt, who approves it, and what reaches a project's cost.
order: 1
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_expense
---

# Expenses — Recording, Approval and Projects

For everyone who spends money for the company, their managers, and finance.
An expense is one cost with its receipt. You record it, submit it, and the
right person approves it from their **Inbox**.

## Recording an expense

Open **My Expenses** in the **Expenses** app and choose **New**: the
**Description**, the **Date**, the **Category**, the **Amount**, and, if you
like, the **Merchant**, the **Receipt Number** and who **Paid By** (you, the
default, or the company). Attach the receipt in the **Files** tab. On a
project, pick the **Project** too; leave it empty for anything else.

Amounts are in your organization's currency. Convert a receipt in another
currency before you enter it.

**Source** says how the record arrived: typed by a person, written by an
agent, or imported. It decides nothing.

## Who approves it

Set **Status** to **Submitted**. The expense is locked while it waits.

- **With a project**: the project's **Project Manager** decides.
- **Without a project**: your **manager** decides, the manager on your user
  record. With no manager there, the **Finance Controllers** decide instead.
- **2,000 or more**: the **Finance Controllers** decide too, after the first
  approver, and the expense counts only once they approve.
- **Nobody approves their own.** A Project Manager's own expense on their
  project goes to an administrator.

The approver is written into **Approver** when you submit, and the expense
appears under their **Expenses to Approve**. **Rejected** sends it back: move
it to **Draft**, correct it and submit it again. You can also **recall** it
from your Inbox while it waits. Nobody sets **Approved** or **Rejected** by
hand; only an administrator can, to repair an expense whose approval cannot
run.

## Projects

When Project Delivery is in use, an approved expense on a project counts in
the project's **Expense Cost**, and in **Approved to Bill** when it is
**Billable**. Paid by the company counts too.

- The **Project** picker offers only projects that are not **Closed** or
  **Cancelled**.
- An expense submitted on a project that is **Closed**, **Cancelled**, or has
  **Lock Time and Expenses** ticked goes straight back to **Draft**, and you
  get an Inbox notice naming the project. Keep it as a draft, or move it to an
  open project and submit it there.

When Project Delivery is switched off, the **Project** field leaves the
expense, and every expense goes to the spender's manager.
