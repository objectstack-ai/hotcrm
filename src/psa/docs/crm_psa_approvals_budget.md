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

**These approvals need approvals on the deployment.** The request, and the
Inbox it is decided in, come with the deployment's approvals. On a deployment
that does not include them, nobody is asked and nobody but an administrator can
decide: a timesheet or expense report that is submitted stays **Submitted**,
and a project sent **In Approval** stays there, while its approver's own
decision is refused with a message sending them to an Inbox that is not there.
An administrator then sets the decision on the record itself, its **Status**
to **Approved** or **Rejected**. An approved timesheet or expense report counts
in the project's cost from then on, and an approved project takes its version 1
as its Approved Budget.

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
- **An expense report on a project** goes to the Project Manager when it is
  submitted, then, at a total of **2,000** or more, to the Finance
  Controllers. Submit for Reimbursement puts each project's expenses on a
  report of their own; a report with no project goes to the spender's own
  manager instead (the **Expenses** manual).
- **A travel request on a project** goes to the Project Manager when it is
  submitted, and to nobody after: one step, whatever the amount. A request
  with no project goes to the traveler's own manager. The project page lists
  the project's travel requests under **Related**; they add nothing to its
  cost, which arrives with the expenses.
- **Nobody approves their own.** A Project Manager's own timesheet, expense
  report or travel request goes to an administrator.
- **Rejected** sends the record back for revision; the sender can also
  **recall** it from their Inbox while it waits, which puts it back to Draft.
- **While it waits, the record is locked**: nobody edits it until it is
  decided.

**A one-person organization.** Nobody approves a request they submitted, an
administrator included, so a timesheet, or an expense report or travel request
on a project, needs a second user who can approve it: the project's Project Manager, or an
administrator. An expense report of **2,000** or more also needs a Finance
Controller or an administrator. A timesheet keeps the approver it was created
with, so one created while you were its project's Project Manager goes to an
administrator other than you. Until that person has been added, what you
submit waits in **Submitted** and nobody can decide it: recall it from your
Inbox, and submit it again once they have been added.

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
  report rejected) and crosses again is told again.
- **The notice is in each person's own language**, the one on their user
  record, not the one picked in the console's menu.

## The lock

The notice proposes the lock; a person decides, and nothing ticks it on its
own. While **Lock Time and Expenses** is ticked on a project, no timesheet on
it can be submitted, **whoever submits it**, administrators included, and nor
can an expense report on it: the submission is refused with the reason, and the
report stays a Draft. Drafts can still be written. Untick it, after a top-up is approved for
example, and submissions are taken again. A travel request is a plan, not
spend: the lock does not stop one, and the Project Manager decides it as usual.

A **Closed** or **Cancelled** project takes nothing new at all: no timesheet
can be created on it or moved onto it, and a draft already there can be edited
but not submitted, administrators included. The expense's Project picker does
not offer such a project, nor does a travel request's, and an expense report
already on one cannot be submitted: the submission is refused with the reason,
and the report stays a Draft. A **Completed** project still takes late
bookings; tick the lock to stop them.

The **Projects Overview** dashboard, under **Projects**, shows the same figures
across every project: what its tiles count is the next page.
