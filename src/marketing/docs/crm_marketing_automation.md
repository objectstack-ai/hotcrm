---
title: Campaign Automation — Enrolment & Auto-Completion
description: When each campaign flow runs, what it does, what it refuses, and what is kept up to date for you.
order: 2
# sources: the flows this doc documents. The completion schedule is guarded by
# test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:campaign_enrollment
  - flow:campaign_lead_member_enroll
  - flow:campaign_contact_member_enroll
  - flow:campaign_completion
---

# Campaign Automation — Enrolment & Auto-Completion

For marketers and the administrators who support them. Three things put people
on campaigns or close campaigns. Two are buttons a person presses; one runs on
a schedule. None of them sends an email: a campaign records who it reached, and
the sending happens in your email tool.

## Enroll Members — a whole segment at once

**When it runs:** when you press **Enroll Members** on a campaign. The button is
offered while the campaign is **Planning** or **In Progress**, and only to
people who may add campaign members (Marketing User and the administrators). No
schedule runs it: the segment is chosen on its screen, and a scheduled run would
have nobody to choose it.

**What it does:** its screen asks two things. First whether to enroll **leads**
or **contacts** (one side per run), then the segment on that side: leads by
status (*New*, *Contacted* or *Qualified*), contacts by department. It then adds
everyone in that segment who has an email address and has not opted out of
email; a lead must also not be converted already, because a converted lead is
now a contact. Each new member starts at **Sent**.

**What it skips and refuses:** anyone already on the campaign is skipped, so
running it again tops the campaign up and never counts a person twice. If the
campaign is no longer open, nobody is added and the run says so. If anyone in
the segment is refused (for example, by permission), the run ends with both
counts, how many were enrolled and how many were refused, and the refused
people are not on the campaign.

## Add to Campaign — the people you picked

**When it runs:** when you run **Add to Campaign** on leads or contacts: on
**All Leads** or **All Contacts**, tick rows and run it from the selection
toolbar, or run it on one row from that row's menu. You pick the campaign. It
is offered to the same people as **Enroll Members**.

**What it does:** adds each person you picked as a member at **Sent**, one by
one. Someone already on that campaign is skipped, and the run still reports
success for them.

**What it refuses:** a campaign that is not **Planning** or **In Progress**, and
a person who has opted out of email. Nobody is added, the campaign's numbers do
not move, and the message names the campaign or the person. The same two
refusals apply however else a member is created: **New** on a campaign's
member list, an import, or the API.

## Campaign Auto-Completion — every night

**When it runs:** every day at **02:00**, where the deployment has switched
scheduled work on. A default install boots it unbound: there, a campaign stays
**In Progress** past its **End Date** until someone changes it, so complete it
yourself.

**What it does:** sets every **In Progress** campaign whose **End Date** has
passed to **Completed**. It changes the status and nothing else; the campaign
takes no new members from then on.

## Kept up to date for you

These are not flows you run, and they run on every install:

- **The campaign's numbers** are recomputed whenever a member is added, answers
  or is removed, whenever one of its leads is converted, and whenever a deal
  that names the campaign is saved or deleted. What each number counts is in
  [Campaigns](./crm_marketing_campaigns.md).
- **Converted members.** When a lead is converted, each of its memberships at
  **Sent** or **Responded** becomes **Converted**.
- **Opt-outs.** Setting a member to **Unsubscribed** ticks **Email Opt Out** on
  that lead or contact, so both buttons above leave them out from then on.

---

**Related:** how a lead is converted — see [Leads](./crm_sales_leads.md).
