---
title: Using the Assistant — What It Can Do in HotCRM
description: The HotCRM skills the platform assistant uses, what each one does when you ask, and what it will not do on its own.
order: 3
# sources: the skills this doc describes. Each section is pinned to its skill
# by test/docs-ai-skills.test.ts; build ignores unknown frontmatter keys.
sources:
  - skill:live_data
  - skill:lead_qualification
  - skill:revenue_forecasting
  - skill:customer_360
  - skill:email_drafting
  - skill:case_triage
  - skill:expense_filing
  - skill:expense_check
---

# Using the Assistant — What It Can Do in HotCRM

For everyone whose deployment runs the platform's assistant. HotCRM does not
ship an assistant of its own: the assistant is the platform's, and it is
available on ObjectOS Cloud and Enterprise. A self-hosted open-source install
has none, and this page does not apply there.

What HotCRM adds is **skills**: instructions that teach the assistant how this
CRM works. You never pick one. Ask in plain language, and the assistant uses
whichever skill fits; some start on their own when you are looking at the
record they are for.

## The rules the skills follow

- **It reads as you.** The assistant sees exactly the records and fields you
  can see, and nothing else. It cannot show you a deal you are not allowed to
  open.
- **It reads the current shape first.** Before it searches a record type, it
  looks up that type's fields, so a field your administrator added a minute ago
  is used straight away.
- **It cites what it read.** Answers name the records they come from, so you
  can open them and check. When the data cannot support an answer, it says so
  instead of estimating.
- **It changes data only through HotCRM's own buttons,** with the same
  permissions and audit trail as clicking them yourself, and only the ones
  named below. Everything else it recommends, and you do.

## Live Data Access

Answers questions about any CRM record: lists, single records, counts, sums
and averages. "How many open cases does Acme have?", "list my deals closing
this month". It reads only; it changes nothing.

## Lead Qualification

Scores a lead from 0 to 100 on budget, authority, need and timeline, with one
line per criterion naming what it read, and recommends one next step. It starts
on its own when you are on a lead.

It can act, through two of the lead's buttons. With a score of 70 or more
and your agreement, it runs **Convert Lead**, and asks you to confirm first,
because a conversion cannot be undone from the assistant. Otherwise, or when
you want to nurture the lead, it runs **Schedule Follow-up** with the date it
recommends and says why that date.

## Revenue Forecasting

Summarises the pipeline by stage for the period you name (the current quarter
if you name none), lists the deals at risk (a close date already past, no
activity for 30 days or more, or a stage that has not moved for longer than
usual) and forecasts revenue as a range, from committed deals only up to the
full pipeline weighted by **Probability (%)**. It can draw a chart when a chart
says it better. It starts on its own on opportunities and dashboards, and it
reads only.

These are the assistant's own estimates from live deals. The figures on the
dashboards are defined in [Metrics](./crm_analytics_metrics.md).

## Customer 360

Builds one profile of an account: its contacts, open cases, open deals, and the
published knowledge articles that match those cases. The answer comes in three
parts (account snapshot, active work, risks and notes), and every risk names the
record behind it. It reads only.

## Email Drafting

Writes an email from the contact's real details and recent history: a short
subject naming the concrete value, a personal first line, one clear ask, and
two subject lines to choose from. It **cannot send**. Paste the draft into
**Send Email** on the contact, review it, and send it yourself.

## Case Triage

On a case, proposes a priority and the one reason that drove it, weighing the
customer's tier, whether they are blocked, the time left on the SLA and the
tone of their latest message. It cannot escalate or close a case: it points you
to **Escalate Case** or **Close Case** and offers the reason or resolution text
for you to paste. It starts on its own when you are on a case, on installs with
the service module.

## Expense Filing

Files expenses for the person who spent the money, on installs with the
expense module. Give it a receipt, or tell it what you spent, and it creates
the expense as a Draft marked as written by an agent, after checking that the
same receipt number, or the same date, amount and merchant, is not already
there. It gives you a one-time link to attach the receipt to the expense.
Where the connection does not offer files, it asks you to attach the receipt
on the expense's page.

It reads the company's active expense standards and writes what it found
into the expense's **Review Notes**, for example a hotel night over the limit,
and "No findings" when there is nothing to report. A finding never stops you from
submitting. It is there for the approver to read. These notes are written while the expense
is still a Draft on no report, because an expense locks once it is sent. It
can also draft a travel request with its legs.

It can act through the expense buttons, and it asks you before each one that
sends something to an approver or cannot be undone:
**Submit for Reimbursement**, **Submit for a Trip**, an expense report's
**Submit**, a travel request's **Submit**, **Cancel Trip** and **Close**. **Back to Draft**
on a rejected report it runs when you ask, and tells you. It never approves,
rejects or marks anything as paid.

## Expense Check

Helps an approver or finance read an expense report before deciding. It lists
the expenses that deserve a look: over a standard (naming the standard and the
numbers), a possible duplicate, a missing receipt, and a trip spent over its
estimate. It also quotes the Review Notes the spender's assistant left on each
expense. It reads only. A report under approval is locked, so it changes
nothing on it. Instead it offers a short text you can paste into your own approval
comment. It never approves, rejects, sends back or marks paid: you do that
with the report's own buttons.

---

**Related:** where the assistant fits in your day — see
[Getting Started](./crm_getting_started.md).
