---
title: Opportunities — Stages, Alerts & Approvals
description: Opportunity stages, the stalled-deal nudge, the won-deal alert and large-deal approvals — every automated rule and threshold.
order: 2
# sources: flows/objects this doc documents. Thresholds here are guarded by
# test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:opportunity_approval
  - flow:opportunity_stagnation
  - flow:opportunity_won_alert
  - object:crm_opportunity
---

# Opportunities — Stages, Alerts & Approvals

For sales representatives and sales managers. This covers working a deal from
its first stage to a close, and — more importantly — the rules the system
applies automatically along the way.

## Stages

Opportunities advance through these stages. The arrows are the moves the app
treats as normal; a move off them still saves, and the save comes back with a
warning. Any open stage can close straight to **Closed Won** or **Closed Lost**,
so a deal won early saves without one. **Closed Won** and **Closed Lost** are
where a deal ends.

```mermaid
stateDiagram-v2
  state "Prospecting" as prospecting
  state "Qualification" as qualification
  state "Needs Analysis" as needs_analysis
  state "Proposal" as proposal
  state "Negotiation" as negotiation
  state "Closed Won" as closed_won
  state "Closed Lost" as closed_lost
  prospecting --> qualification
  prospecting --> proposal
  prospecting --> closed_won
  prospecting --> closed_lost
  qualification --> needs_analysis
  qualification --> proposal
  qualification --> closed_won
  qualification --> closed_lost
  needs_analysis --> proposal
  needs_analysis --> closed_won
  needs_analysis --> closed_lost
  proposal --> negotiation
  proposal --> closed_won
  proposal --> closed_lost
  negotiation --> closed_won
  negotiation --> closed_lost
```

New opportunities start at **10% probability**. Keep the **amount**, **stage**,
and **close date** current — the automation below keys off all three.

## Stalled-deal nudge (automatic)

Where the deployment has switched scheduled work on (an administrator setting),
a daily **07:30** sweep finds any open opportunity that has sat in its current
stage for **more than 14 days**. The owner is notified — the owner alone, not
their manager — and a **high-priority follow-up task** is created. Advance the
stage or re-qualify the deal to clear it.

## Won-deal alert (automatic)

When a deal of **$100,000** or more is marked **Closed Won**, the owner is
notified automatically — the owner alone, not their manager. A deal at exactly
$100,000 counts: the large-deal line is inclusive everywhere.

## Large-deal approval — when a deal pauses for sign-off

Deals above a threshold **lock and wait** for approval. There is no "submit"
step — the moment a deal's **amount** reaches $100K, it routes for approval
automatically, and you can't move it forward until each required approver signs
off.

| Deal amount | Required approval |
|---|---|
| **$100,000 or more** | Sales Manager review |
| **> $500,000** | Sales Manager **and** Sales Director sign-off |

While an approval is pending, the opportunity is **locked** and its
**Approval Status** shows the live state. A blue banner under the stage path
says the deal was sent for approval, to whom (a Sales Manager, or a Sales
Manager and then a Sales Director over $500,000), and that **Recall**, above
the title, withdraws the request. On full approval it is stamped
**Approved** (with date). On rejection it is stamped **Rejected** — the deal
is unlocked; revise it and save to resubmit. Either way you hear the outcome
once in the app — **Request approved** or **Request rejected**, with the
approver's comment — and once by email. If someone else's save sent your deal
for approval, that notice goes to them, and you get **Deal approved** or
**Deal rejected** in the app instead. The
submitter can also **Recall** a pending request to unlock the deal; the next save
resubmits it. Approvers act from their **Approvals → Inbox**.

**A deal of $100K or more is won only once it is approved.** Moving it to
**Closed Won** is refused unless its **Approval Status** is **Approved** —
whether the request is pending, was rejected, was recalled, or was never sent
(**Not Required**, as on a deal that was imported, or raised over the line in
the same save that closes it). Save the deal without closing it to send it for
approval, then close it once approved. Accepting a quote closes its deal as
won, so the same rule holds a quote's acceptance. Losing a deal needs no
approval.

> **Known limit.** The rule does not know whether the Large Deal Approval flow
> is switched on. If an administrator switches that flow off, no deal of $100K
> or more can be closed won by hand, because nothing can approve it.

---

## Private deals

Tick **Private** on a deal and only its owner can see it. That includes the
people who otherwise read every deal in the organisation, such as a Sales
Manager or a Marketing User: the deal drops out of their lists and reports, and
a link to it opens a page saying the record does not exist or may have been
deleted. Nothing is wrong with the deal; it is hidden from them. To share it
again, the owner clears **Private**.

**Related:** a deal starts life as a lead — see [Leads](./crm_sales_leads.md);
once it is won, the relationship continues as a contract — see
[Contracts](./crm_sales_contracts.md); the tasks, calls and meetings that move
it along — see [Activities](./crm_sales_activities.md).
