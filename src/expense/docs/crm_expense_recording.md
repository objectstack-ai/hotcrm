---
title: Expenses — Recording, Reports and Projects
description: Recording what you spent with its receipt, sending it on an expense report, who approves it, its payment back, what reaches a project's cost, and what an assistant does for you.
order: 1
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_expense
  - object:crm_expense_report
  - object:crm_expense_standard
  - skill:expense_filing
  - skill:expense_check
---

# Expenses — Recording, Reports and Projects

For everyone who spends money for the company, their managers, and finance.
An expense is one cost with its receipt. You record your expenses, send them
together on an **expense report**, the right people approve the report from
their **Inbox**, and finance marks it paid once you have been paid back.

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

An expense's **Status** is not yours to set: it follows the report the
expense is on.

**Review Notes** is where an assistant, or you, writes what a check of the
expense found: above a standard, a receipt number seen before, a missing
receipt. The approver reads it in the expense list on the report. HotCRM
writes nothing there itself, and it locks with the rest of the expense once
the report is sent, so notes are written on each expense **before** it is
sent. The report has **Review Notes** of its own, but a report under approval
is locked as a whole, the approver included: its notes can be written only
while the report is back in Draft.

## Submitting for reimbursement

Select the expenses in **My Expenses** and choose **Submit for
Reimbursement**. For one expense, the same button is on its record page.
There is nothing else to fill in: the expenses go on an expense report, and
the report is submitted in the same click.

- **One report per project.** The expenses of each project go on a report of
  their own, which names the project, and the expenses with no project on one
  more report. A trip that touched two projects makes two reports, so each
  project manager decides only their own project's spend.
- The report's **Title** is the expenses' date range. **Total** adds every
  expense on it; **To Pay Back** adds only the ones you paid yourself.
- Only your own expenses, on no report yet and not approved, can be
  submitted. If any selected expense is not, nothing is submitted and the
  message names each one.

### Expenses of a trip

If the expenses belong to a trip you asked for, choose **Submit for a Trip**
instead (beside **Submit for Reimbursement**, on the record page and in the
selection bar) and pick the travel request. It offers only your own
**Approved** requests. The report is made and submitted exactly as above, and
it names the request. A trip can be reported in several reports; a report
names one request at most. **Submit for Reimbursement** stays one click for an
expense with no trip.

The request can't be added to a report afterwards: choose it when you submit.

Follow your reports in **My Reports**.

## Who approves it

- **With a project**: the project's **Project Manager** decides.
- **Without a project**: your **manager** decides, the manager on your user
  record. With no manager there, the **Finance Controllers** decide instead.
- **A total of 2,000 or more**: the **Finance Controllers** decide too, after
  the first approver, and the report counts only once they approve.
- **Nobody approves their own.** A Project Manager's own report on their
  project goes to an administrator.

**A one-person organization.** Nobody approves a report they submitted, an
administrator included, so a report needs a second user who can approve it:
your manager, a Finance Controller or an administrator, or for a report on a
project, the project's Project Manager or an administrator. A total of
**2,000** or more also needs a Finance Controller or an administrator. Until
that person has been added, a submitted report waits in **Submitted** and
nobody can decide it: recall it from your Inbox, and submit it again once they
have been added.

The approver is written into the report's **Approver**, and the report
appears under their **Reports to Approve**; they can open each expense on it.
While the report waits, it and its expenses are locked.

- **Recall** the report from your Inbox while it waits: it goes back to
  **Draft** with its expenses, which you can change again. **Submit** sends
  it again.
- **Rejected** sends it back. **Back to Draft** reopens it, its expenses with
  it; correct them and **Submit** again.
- Nobody sets **Approved** or **Rejected** by hand; only an administrator
  can, to repair a report whose approval cannot run.

Only a draft report can be deleted. Its expenses stay, free to be submitted
again.

An administrator can also delete a report that is waiting for approval or was
rejected, to repair. Its expenses go back to **Draft**, free to be submitted
again. An approved or paid report cannot be deleted, by an administrator
either: it stays on record with its expenses.

## Paying it back

An approved report appears under **Reports to Pay** for the **Finance
Controllers** and **AR Accountants**. Once the employee has been paid back,
finance chooses **Mark as Paid** and enters the date and, if there is one, the
payment's reference. This records the payment; it moves no money and posts
nothing. A paid report can no longer be changed, and its expenses stay
**Approved**.

## Expense standards

**Expense Standards**, in the Expenses app, lists the company's standards for
spending: a **Name**, the **Category** it is about (empty for any category), a
**Limit** and what it is counted **Per** (night, day, item or trip), who and
where it **Applies To**, in words, and **Details**. A standard with no limit
is a rule in words, such as "second-class rail".

- Everyone who has the Expenses app reads every standard. The **Finance
  Controllers** and **AR Accountants** add, change and delete them, and
  retire one by clearing **Active**; administrators can too.
- **A standard is advice.** HotCRM never compares an expense with a standard:
  an expense above one saves and is submitted like any other. An assistant
  reads the standards, compares, and writes what it found in the expense's
  **Review Notes**; the approver decides.

## With an assistant

Where your deployment runs the platform's assistant, or you connect your own
agent over MCP, two skills teach it this module (see
[Using the Assistant](./crm_ai_skills.md)):

- **Expense Filing**, for you as the person who spent: show it a receipt and
  it records the expense with **Source** Agent, checks for the same receipt
  number or the same date, amount and merchant, gives you a one-time link to
  attach the receipt, reads the standards and writes what it found into the
  expense's **Review Notes**. It can draft a travel request too. It runs
  **Submit for Reimbursement**, **Submit for a Trip** and the other sending
  steps only after you say yes.
- **Expense Check**, for the approver and finance: it lists what in a report
  deserves a look (over a standard, a possible duplicate, a missing receipt, a
  trip over its estimate) and changes nothing. It offers a short text you may
  put in your own approval comment, and it never approves, rejects or marks
  paid.

**Mark as Paid** stays a person's: no assistant is offered it.

## Projects

When Project Delivery is in use, an approved expense on a project counts in
the project's **Expense Cost**, and in **Approved to Bill** when it is
**Billable**. Paid by the company counts too. Marking the report paid changes
nothing there.

- The **Project** picker offers only projects that are not **Closed** or
  **Cancelled**.
- A report on a project that is **Closed**, **Cancelled**, or has **Lock Time
  and Expenses** ticked cannot be submitted: **Submit** is refused with the
  reason, and the report stays in **Draft**. On a locked project, submit the
  report again once the lock is lifted. On a closed or cancelled one, delete
  the report, move its expenses to an open project, and submit them again.
- **Submit for Reimbursement** and **Submit for a Trip** send the other
  projects' reports as usual. The report of such a project is created and
  stays in **Draft** in **My Reports** with its expenses on it, and the click
  ends with an error naming that report, not with a success message.
- An expense's **Project** cannot change while the expense is on a report,
  even a Draft one: the report goes to the approver of the project it was
  sent with. To move an expense to another project, delete the draft report,
  which frees its expenses, then change the project and submit again.

When Project Delivery is switched off, the **Project** field leaves the
expense and the report, every selection makes one report, and every report
goes to the spender's manager.

## Upgrading from per-expense approval

Before expense reports, each expense was submitted and approved on its own.
After the upgrade:

- An expense that was **approved** stays approved and keeps counting in its
  project's cost. It is on no report, so it has no payment record.
- A **draft** expense is submitted for reimbursement like any other.
- A **rejected** expense is submitted for reimbursement like any other: an
  expense that is on no report and not approved is set back to **Draft** and
  reported like the rest.
- An expense that was **waiting for approval** cannot be decided any more:
  approving its old request answers that the approval can no longer be
  resumed. The spender selects the expense and chooses **Submit for
  Reimbursement**, and the report goes to its approver as usual. Then recall
  the old request from the Inbox so it leaves the approver's list; the
  spender or an administrator can recall it, before or after. Recalling it
  alone leaves the expense **Submitted** until it is reported.
