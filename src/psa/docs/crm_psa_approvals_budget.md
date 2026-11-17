---
title: Approvals, Budget Status and the Lock — Who Decides
description: Who approves a project, a timesheet, an expense and a travel request, when a budget warns, and what the lock stops.
order: 2
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_project
  - object:crm_project_budget
  - object:crm_project_budget_line
  - object:crm_timesheet
  - object:crm_expense
  - object:crm_expense_request
---

# Approvals, Budget Status and the Lock — Who Decides

For project managers, finance, the project directors and the PMO. Every
approval here is decided from the **Inbox** under **My Work**; nobody sets
**Approved** or **Rejected** by hand. Only an administrator can, to repair a
record whose approval cannot run.

## Who approves what

- **A project** is sent by setting **In Approval**, and only with its
  budget's **version 1** ready: lines, a total above zero, every labor line
  with a rate card and hours, every other line with a quantity. Version 1 goes
  with the project. Any **Project Director** or **PMO** holder decides, and
  the first to decide decides for all. A version 1 of **100,000** or more then
  goes to the **Finance Controllers** too.
- **A budget top-up** (version 2 or later, with its **Reason**) is sent by
  setting the version **In Approval**. A Project Director or PMO holder
  decides, then the **Finance Controllers** too when it raises the Approved
  Budget by **10 %** or more.
- **A timesheet** goes to its project's Project Manager when it is submitted.
- **An expense on a project** goes to the Project Manager when it is
  submitted, then, at **2,000** or more, to the Finance Controllers. An
  expense with no project goes to the spender's own manager instead (the
  **Expenses** manual).
- **A travel request on a project** goes to the Project Manager when it is
  submitted, and to nobody after: one step, whatever the amount. A request
  with no project goes to the traveler's own manager. The project page lists
  the project's travel requests under **Related**; they add nothing to its
  cost, which arrives with the expenses.
- **Nobody approves their own.** A Project Manager's own timesheet, expense or
  travel request goes to an administrator.
- **Rejected** sends the record back for revision; the sender can also
  **recall** it from their Inbox while it waits, which puts it back to Draft.
- **While it waits, the record is locked**: nobody edits it until it is
  decided.

## The approved budget is a version, not a figure

Nobody types the **Approved Budget**: it is the total of the project's
**baseline**, the budget version approved last. Plan a change as a new
version, from the project's **Related** tab or **Budgets** under
**Projects**: only one version is open at a time,
its lines lock once it is sent, and when it is approved it becomes the
baseline and the one before it is **Superseded**. A raise moves **Budget
Status** at once, so a project is put back **On Track** only through that
approval.

## Budget Status and the notices

**Budget Status** follows the approved cost on its own: **On Track** below 80 %
of the Approved Budget, **Warning** from 80 %, **Exceeded** from 100 %. A
project with no budget has none.

- **The moment it crosses into Warning or Exceeded**, the Project Manager and
  every Finance Controller get one inbox notice and one email.
- **Once per crossing.** A project that stays in Warning while more hours are
  approved sends nothing more. One that falls back (a budget raised, an expense
  rejected) and crosses again is told again.
- **The notice is in each person's own language**, the one on their user
  record, not the one picked in the console's menu.

## The lock

The notice proposes the lock; a person decides, and nothing ticks it on its
own. While **Lock Time and Expenses** is ticked on a project, no timesheet on
it can be submitted, **whoever submits it**, administrators included, and an
expense submitted on it goes back to Draft with an inbox notice to its
spender. Drafts can still be written. Untick it, after a top-up is approved for
example, and submissions are taken again. A travel request is a plan, not
spend: the lock does not stop one, and the Project Manager decides it as usual.

A **Closed** or **Cancelled** project takes nothing new at all: no timesheet
can be created on it or moved onto it, and a draft already there can be edited
but not submitted, administrators included. The expense's Project picker does
not offer such a project, nor does a travel request's, and an expense
submitted on one goes back to Draft with an inbox notice. A **Completed** project still takes late bookings; tick
the lock to stop them.

The **Projects Overview** dashboard, under **Projects**, shows the same figures
across every project: what its tiles count is the next page.
