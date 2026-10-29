---
title: Activities — Tasks, Calls & Meetings
description: Tasks, logged calls and meetings, scheduled follow-ups, and the automation behind them — reminders, urgent alerts and the activity clock.
order: 4
# sources: flows/objects this doc documents. Build ignores unknown
# frontmatter keys.
sources:
  - flow:task_urgent_alert
  - flow:task_due_reminder
  - flow:schedule_followup
  - object:crm_task
  - object:crm_event
---

# Activities — Tasks, Calls & Meetings

For sales reps, service staff and their managers. HotCRM keeps two kinds of
activity: **tasks** are things still to do, and **events** are calls and
meetings, planned or held. This page covers how each is created and the rules
that act on them.

## Logging a call or a meeting

Leads, contacts, accounts, opportunities and cases each carry three buttons:

- **Log a Call** and **Log a Meeting** record something that already happened.
  The event is saved as **held**, and the people you name are added as its
  attendees. You are added as the organizer, and the contact or lead you start
  from is added for you, so **Contact Attendees** is only for anyone else.
- **Schedule a Meeting** books one in the future. It is saved as **planned**
  and appears in **My Calendar**.

The event is linked to the record you started from, so it shows in that
record's related lists and on the calendar views under **Events**.

## Held events keep the activity clock honest

Only a **held** event counts as contact with the customer. When one is saved,
HotCRM stamps the date on the records it touches:

- the account's **Last Activity Date**, even when you logged the call on one of
  its contacts, opportunities or cases, since the date walks up to the account;
- the lead's or contact's **Last Contacted** date;
- a case's **First Response Date**, the first time anything is held against it.

A meeting that is only **planned** changes none of these, because it has not
happened yet. That is deliberate: the "quiet account" figures and the churn
report read these dates, and a meeting booked for next quarter must not make a
silent customer look busy. See [Metrics](./crm_analytics_metrics.md).

## Scheduling a follow-up from a lead

**Schedule Follow-up** on a lead asks for the next step, a due date, and
optionally the activity type, priority and notes. It creates the task, owned by
you and linked to the lead, and sets the lead's **Next Follow-up Date** to the
same day, so the **🔥 Hot Leads** tab on **Leads**, which sorts by that date,
reflects the commitment you actually made.

## Tasks

Creating a task with **Urgent** priority immediately notifies its owner. Routine
follow-up tasks (e.g. from the stalled-deal nudge) are created as **High**
priority.

**Complete** on a task marks it done and stamps the completion date. Your open
tasks are in **My Work → My Tasks**.

## Reminders (automatic)

Give a task a **Reminder Date/Time** and, where the deployment has switched
scheduled work on (an administrator setting), an **hourly** sweep notifies the
owner once that time has passed, in the app and by email. Each task is reminded
once. A reminder later than the task's due date is refused: a reminder has to
fire before the deadline.

## Do Not Call

A lead or contact flagged **Do Not Call** cannot have a **Call** task scheduled
against it: the save is refused and says why. Recording a call that already
happened is still allowed. Clear the flag on the record first if the person has
asked to be called again.

---

**Related:** the deals these activities move forward — see
[Opportunities](./crm_sales_opportunities.md); where you find your open work —
see [Getting Started](./crm_getting_started.md).
