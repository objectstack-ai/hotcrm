---
title: Getting Started — Your First Day
description: Where HotCRM opens for you, the My Work queue, the approvals Inbox, and where help and the assistant live.
order: 2
# sources: the navigation this doc describes. Build ignores unknown
# frontmatter keys.
sources:
  - app:crm_enterprise
  - app:crm_service
  - app:crm_marketing
---

# Getting Started — Your First Day

For everyone opening HotCRM for the first time. The [Overview](./crm_overview.md)
explains what the four areas are for; this page is about the screens: where the
app opens, where your own work waits for you, and where to look when you are
stuck.

## Where HotCRM opens

HotCRM is three apps, one per line of work: the Sales app, the Service app and
the Marketing app (while the marketing module is enabled). Your launcher offers
the ones your job uses. HotCRM opens on the home page, whose *Your apps* row
lists them; the app switcher moves you between them. Each app opens on the
first entry your sidebar shows:

| You are | Your launcher offers | The app opens on |
|---|---|---|
| A sales rep | the Sales app | **Sales Home** — your own figures, your leads, open deals and open tasks, and your upcoming events |
| A service agent or service manager | the Service app | **Service Overview** — the case dashboard, the app's first entry |
| A marketer | the Sales app and the Marketing app | **Home** (the **Executive Overview** dashboard) in Sales, **Campaigns** in Marketing |
| A sales manager or an administrator | all three | **Home** in Sales, **Service Overview** in Service, **Campaigns** in Marketing |

The sidebar only shows what you are allowed to read and what your job uses: a
sales rep sees no cases, and finds **Knowledge** at the end of **Sales**; a
service agent sees no pipeline dashboards and no deal lists. The launcher is
about what your job uses, not what you may open: an app it leaves out still
opens from its address, and a link to a record opens it in the app you are in.
If you expected an entry and it is not there, your access is the reason, not a
fault — ask your administrator.

## Your own work: My Work

**My Work** collects the records that are yours, so you rarely need to search
for them:

- **My Tasks** — your open tasks, the next thing to do first. Tasks the system
  creates for you (a follow-up on a stalled deal, an escalation) land here too;
  see [Activities](./crm_sales_activities.md).
- **My Deals** and **My Leads** — the opportunities and leads you own. Service
  staff, who own no deals, see **My Leads** only.
- **My Calendar** — your meetings and calls.
- **Inbox** — approval requests waiting on you (below).
- **My Cases** — the cases you own, for service staff.

Each app has a **My Work** of its own. The Sales app holds all of these but
**My Cases**; the Service app holds **My Cases**, **Inbox**, **My Tasks** and
**My Calendar**; the Marketing app holds **Inbox** and **My Tasks**.

Each of these opens a list page whose tabs across the top offer other views of
the same records, such as all tasks or the pipeline board. A different view is
a tab there, not another sidebar entry.

## Approvals: the Inbox

Some records stop and wait for a person: a large deal, a new account, a lead
conversion that needs sign-off. When one waits on **you**, it appears in
**My Work → Inbox**; open it there to approve or reject. The record's owner
is notified of the outcome. While a request is pending, the record it is about
is locked against edits. What triggers each approval is on the page
for that record, for example [Opportunities](./crm_sales_opportunities.md).

## Notifications

The bell at the top right holds the alerts HotCRM sends you: a new lead
assigned to you, an urgent task, a won deal, a reminder that is due. Many of
them also arrive by email. Each one links to the record it is about.

## Finding a record

The search box at the top (**Ctrl+K**, or **⌘K** on a Mac) finds records,
lists, dashboards and reports by name, and lists the records you opened
recently.

## Asking the assistant

Where your deployment runs the platform's assistant (ObjectOS Cloud and
Enterprise), you can ask it about your CRM in plain language: "which of my
deals are at risk?", "give me the full picture of Acme", "qualify this lead".
It reads only what you can read, and the few changes it can make go through
the same buttons you would press. What it can do here, and which buttons, is in
[Using the assistant](./crm_ai_skills.md).
A self-hosted open-source install ships without the assistant, so the panel is
not there.

## Help

**Help**, the last group in each app's sidebar, holds that app's manuals: in
the Sales app this one, the Admin Manual and the Revenue Manual; in the
Service app the Service Manual; in the Marketing app the Marketing Manual. Which
guide to read for your job is in the [Overview](./crm_overview.md). The group
starts collapsed: click **Help** to open it.
