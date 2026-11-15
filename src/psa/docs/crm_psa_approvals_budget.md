---
title: Approvals, Budget Status and the Lock — Who Decides
description: Who approves a project, a timesheet and an expense, when a budget warns, and what the lock stops.
order: 2
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_project
  - object:crm_timesheet
  - object:crm_expense
---

# Approvals, Budget Status and the Lock — Who Decides

For project managers, finance, the project directors and the PMO. Every
approval here is decided from the **Inbox** under **My Work**; nobody sets
**Approved** or **Rejected** by hand. Only an administrator can, to repair a
record whose approval cannot run.

## Who approves what

- **A project** is sent by setting **In Approval**, and only with an
  **Approved Budget**. Any **Project Director** or **PMO** holder decides, and
  the first to decide decides for all. A budget of **100,000** or more then
  goes to the **Finance Controllers** too.
- **A timesheet** goes to its project's Project Manager when it is submitted.
- **An expense** goes to the Project Manager, then, at **2,000** or more, to
  the Finance Controllers.
- **Nobody approves their own.** A Project Manager's own timesheet or expense
  goes to an administrator.
- **Rejected** sends the record back for revision; the sender can also
  **recall** it from their Inbox while it waits, which puts it back to Draft.
- **While it waits, the record is locked**: nobody edits it until it is
  decided.

## The approved budget is finance's

From **In Approval** on, the Approved Budget is the figure the project was
approved on. Only a **Finance Controller** can change it then; anyone else is
refused and told to ask finance. A raise moves **Budget Status** at once, so a
project is put back **On Track** only with finance's say.

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
own. While **Lock Time and Expenses** is ticked on a project, no timesheet or
expense on it can be submitted, **whoever submits it**, administrators
included. Drafts can still be written. Untick it, after finance has set a new
budget for example, and submissions are taken again.

A **Closed** or **Cancelled** project takes nothing new at all: no timesheet
or expense can be created on it or moved onto it, and a draft already there
can be edited but not submitted, administrators included. A **Completed**
project still takes late bookings; tick the lock to stop them.

The **Projects Overview** dashboard, under **Projects**, shows the same figures
across every project: what its tiles count is the next page.
