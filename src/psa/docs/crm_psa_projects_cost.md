---
title: Projects and Cost — Who Is Staffed and What Each Figure Counts
description: How staffing sets a project's manager and team, how an hour is costed, and which figures move on their own.
order: 1
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_project
  - object:crm_project_member
  - object:crm_rate_card
  - object:crm_timesheet
  - object:crm_time_entry
  - object:crm_expense
---

# Projects and Cost — Who Is Staffed and What Each Figure Counts

For project managers, the people staffed on projects, and finance. A project
is presales, delivery or internal work for an account; all three are staffed,
booked and costed the same way, so presales and internal effort show up as
cost too. A project may name the sales order it delivers in **Order**, beside
its contract, and the order's page then lists it under **Projects**.

## Staffing decides who reads and runs a project

- **The Project Manager comes from the staffing.** The person staffed with the
  responsibility *Project Manager* becomes the project's **Project Manager**:
  they edit the project, staff it, and approve its timesheets and expenses.
  The field cannot be typed on the project; change the staffing row instead.
- **Everyone staffed is the Team**, the Project Manager too, and reads the
  project. Removing a staffing row takes that access away.
- **The Team sees the customer, not the deal.** A team member reads every
  account, read-only, so the project's Account shows by name, without the
  account's Invoiced, Received, Unpaid and Uninvoiced. The
  Opportunity and the Order are left off their project page, the deal does
  not open for them, and Opportunities is not in their Project Delivery menu.
- **One row per person per project.** Staffing someone twice is refused.
- **Staff yourself first.** Until someone is staffed as Project Manager, a
  timesheet written on the project has no approver, and an expense report
  submitted on it goes to an administrator.
- **Only people staffed on a project can book hours on it.** An hour from
  anyone else is refused, naming the project.

## How an hour is costed

- **The rates are copied when the hour is written.** A time entry takes the
  **Cost Rate** and **Bill Rate** from the rate card on the person's staffing
  row and keeps them. A later change to the rate card never changes past cost;
  only hours written after it use the new rates.
- **A day card counts 8 hours.** A rate card priced per day is costed per hour
  at the day rate divided by 8.
- **A non-billable staffing bills nothing.** Their hours still cost.
- **Hours stay inside their timesheet.** An entry dated outside the
  timesheet's period is refused, and once the timesheet is submitted its
  entries can no longer be changed.
- **A week is entered line by line.** In **My Week**, an entry with its
  Project and Date and no Timesheet goes into your timesheet on that project
  whose period holds the date, or into a new draft one for that week, Monday
  to Sunday. Each project keeps its own timesheet and its own approver;
  **Submit This Week** submits them all at once, one by one.
- **Team members do not see cost.** Cost rates, entry cost and the project's
  cost figures are hidden from people staffed as team members; the bill side
  is shown.

## The figures that move on their own

Only **Planned Revenue** is typed in. The **Approved Budget** is the total of
the project's baseline budget version, and moves only when a version is
approved. Every other money figure on a project counts **approved** hours and
expenses only: a draft or a timesheet waiting for its approver is not cost
yet.

- **Labor Cost** and **Expense Cost** add up the approved hours and expenses.
  **Actual Cost** is the two together.
- **Budget Remaining** is the Approved Budget minus Actual Cost, and **Budget
  Used %** is Actual Cost as a share of it; it passes 100 when the project has
  spent more than its budget.
- **Gross Margin** is Planned Revenue minus Actual Cost.
- **Approved to Bill** is the billable side of the same approved hours and
  expenses, at the bill rates; Order to Cash invoices it.

How a project is approved, and what happens as its budget runs out, is the
next page.
