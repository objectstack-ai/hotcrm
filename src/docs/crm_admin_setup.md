---
title: Go-Live Checklist — Setting HotCRM Up
description: The order to take HotCRM live in — demo data, people, positions, permission sets, scheduled work and your own data — and what each step changes.
order: 0
# sources: the setup surface this doc walks through. Build ignores unknown
# frontmatter keys.
sources:
  - position:crm_positions
  - permission_set:crm_user
  - permission_set:system_admin
---

# Go-Live Checklist — Setting HotCRM Up

For the administrator taking HotCRM live. Work through the steps in order: each
one relies on the one before it. The rules behind each step (who sees what,
where each threshold lives) are on the other pages of this manual; this page is
the order to apply them in.

## 1. Decide about the demo data

A new HotCRM organization is filled with a demo company on its first start:
accounts, contacts, leads, deals, cases, quotes and the rest, so the dashboards
have something to show. The demo records are handed to the first
administrator. There is no switch in Setup for this; the build decides:

- the standard build seeds the demo company into the organization;
- the multi-organization build gives each new organization the product
  catalogue and nothing else.

On the standard build, clear out the demo records you do not want **before**
you import your own: an import matches rows to the records already there, so
a real account that shares a demo account's name would update the demo record
instead of creating yours. See [Importing Data](./crm_admin_data_import.md).

## 2. Bring people in

Create your colleagues under **Setup → People & Organization → Users**, or
invite them under **Invitations**. A new user holds no HotCRM access until the
next two steps give them some; until then, HotCRM sends them to the platform's
access page instead of an empty app.

## 3. Give each person a position

Positions decide most of what a person can do, and they drive the automation
too. Open **Setup → Access Control → Positions**, open a position, and add its
holders. A person may hold more than one. Holding a position gives its
permission sets to the holder; a position with no permission set only widens
which records a holder can see.

Three positions are routing pools, and the automation does nothing useful
until they are staffed:

- **Sales Representative** — a new lead that arrives with no owner, such as
  one from a web form, goes to the holder with the fewest open leads.
- **Service Agent** — new cases with no owner go to the holder with the fewest
  open cases. While nobody holds it, new cases stay unassigned.
- **Service Manager** — an escalated case goes to the holder with the fewest
  open cases.

Two more carry approvals: a **Sales Manager** approves new accounts, lead
conversions and large deals, and a **Sales Director** also signs off the
largest deals. Put your regional reps in **NA Sales Team** or **EU Sales Team**
as well, so they can edit the accounts in their territory.
What each position opens up is in [Access](./crm_admin_access.md).

## 4. Check the permission sets

Positions hand out the everyday sets. Two sets are worth checking by hand under
**Setup → Access Control → Permission Sets**:

- **System Administrator** — give it to the people who run HotCRM. It opens
  this manual and grants list export, which the platform's own administrator
  access does not.
- **CRM User** — HotCRM's floor for every member: their own leads, accounts,
  deals, tasks and events, and read access to products, campaigns and
  knowledge. Someone who holds no position needs at least this set to work in
  HotCRM.

## 5. Switch on scheduled work

The daily and hourly sweeps (stalled deals, expiring quotes and contracts, SLA
breaches, renewal and task reminders) do not run until the deployment switches
scheduled work on. Until then nothing expires and no reminder goes out. How to
switch it on, and every schedule it starts, is in
[Automation](./crm_admin_automation.md).

## 6. Bring in your data

Import accounts first, then contacts, then leads. The order, the matching rules
and the refusals you may meet are in [Importing Data](./crm_admin_data_import.md).

## 7. Check it as your users

**Setup → People & Organization → Users** lets you impersonate a user from the
row menu. Sign in as one person of each job and check that HotCRM opens where
the [Getting Started](./crm_getting_started.md) page says it does for them, and
that the sidebar shows what they need. An entry missing for someone is almost
always a position or permission set missing from step 3 or 4.
