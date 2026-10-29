---
title: Campaigns — Members, Responses & ROI
description: A campaign's status, what each member status means, what every number on the campaign counts, and what ROI includes.
order: 1
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_campaign
  - object:crm_campaign_member
---

# Campaigns — Members, Responses & ROI

For marketers, and for the sales team that reads what marketing is running. A
campaign is one marketing effort (an email, a webinar, a trade show) with a
budget, a run of dates and a list of the people it reached. This page explains
what its numbers count, so you can trust them or know when not to.

## A campaign's status

| Status | What it means |
| --- | --- |
| **Planning** | Being prepared. It can already take members. |
| **In Progress** | Running. It takes members, and their answers are recorded. |
| **Completed** | Over. It takes no new members, so its member counts stay as they closed; a deal that names it and is won later still adds to its revenue. |
| **Aborted** | Called off before it finished. It takes no new members. |

An **In Progress** campaign whose **End Date** has passed is set to
**Completed** for you: see [Campaign Automation](./crm_marketing_automation.md).
You can also complete one yourself when it ends early.

Two rules hold on every save: **End Date** must be after **Start Date**, and
both are required. An **Actual Cost** above the **Budgeted Cost** does not stop
a save; it is there for you to notice.

## Members and their status

A **campaign member** is one person on one campaign: either a lead or a
contact, never both, and only once per campaign. A person enrolled once as a
lead and once as a contact is two memberships. How people get onto a campaign
is in [Campaign Automation](./crm_marketing_automation.md).

| Member status | What it means | What sets it |
| --- | --- | --- |
| **Sent** | The campaign reached them. Every new member starts here. | Enrolment |
| **Responded** | They answered: replied, registered, downloaded. | **Mark Responded** on the member, by someone who may edit members |
| **Converted** | Their lead became a customer. | Automatic, when that lead is converted |
| **Unsubscribed** | They asked to stop hearing from you. | Someone who may edit members, on the member |

Most members stay at **Sent**. A member at **Sent** or **Responded** whose lead
is converted becomes **Converted** for you; an **Unsubscribed** member never
does. Setting a member to **Unsubscribed** also ticks **Email Opt Out** on that
lead or contact, which keeps them out of every later campaign.

HotCRM does not track opens, clicks or bounces. What it can observe is a person
answering and a lead converting, and those are the statuses it has.

## What the numbers count

The numbers sit on the campaign itself, and they are kept current as members
are added, answer or leave, as their leads convert, and as deals name the
campaign. A running campaign shows real figures; you do not wait for it to end.

- **Number Sent** — every member of the campaign, whatever their status.
- **Number of Responses** — members who responded, whatever their status now:
  **Responded** and **Converted** members, and a member who responded and later
  became **Unsubscribed** still counts as a response.
- **Response Rate %** — responses as a share of the number sent.
- **Number of Leads** — the different leads among the members.
- **Converted Leads** — how many of those leads have been converted.
- **Opportunities Created** — deals whose **Campaign** is this campaign.
- **Won Opportunities** — how many of those deals are **Closed Won**.
- **Actual Revenue** — the amounts of those won deals, added up.

## What ROI counts

**ROI %** is (**Actual Revenue** − **Actual Cost**) ÷ **Actual Cost**, as a
percentage. Three things follow from that:

- **Only won deals count.** Open pipeline is never added to **Actual Revenue**,
  however promising.
- **Only deals that name the campaign count.** A deal is credited to a campaign
  by its **Campaign** field, one campaign per deal. Set it on the deal: nothing
  fills it in for you, converting a lead included, and a deal without it earns
  the campaign nothing.
- **ROI is 0 until you enter a cost.** With no **Actual Cost**, there is
  nothing to measure a return against, and **ROI %** reads 0. Enter the cost as
  soon as you know it.

---

**Related:** how a deal moves to **Closed Won** — see
[Opportunities](./crm_sales_opportunities.md).
