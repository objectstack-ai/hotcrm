---
title: Sales Process & Rules
description: Lead routing, conversion, opportunity stages, large-deal approvals, and quotes — including every automated rule and threshold.
# sources: flows/objects this doc documents. Thresholds here are guarded by
# test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:lead_assignment
  - flow:lead_conversion
  - flow:opportunity_approval
  - flow:opportunity_stagnation
  - flow:opportunity_won_alert
  - flow:quote_generation
  - flow:quote_expiration
  - flow:task_urgent_alert
  - flow:contract_renewal
  - flow:contract_expiration
  - object:crm_lead
  - object:crm_opportunity
  - object:crm_quote
  - object:crm_contract
---

# Sales Process & Rules

For sales representatives and sales managers. This covers the motion from a raw
lead to a closed deal, and — more importantly — the rules the system applies
automatically along the way.

## 1. New leads route themselves

When a lead is created, HotCRM scores its urgency and sets a follow-up deadline
automatically:

| Lead Score | Follow-up SLA | What happens |
|---|---|---|
| **Hot** — 4★ or higher | **1 day** | Manager is alerted to *assign within 24h*. |
| Everything else | **3 days** | Lead is queued for assignment. |

**Lead Score** is the 1–5 star field on each lead (shown as *Lead Score* in the
UI). A score of 4★ or more marks the lead "hot" and triggers the 1-day SLA.

Every new lead lands in the **sales-manager queue**. Ownership is assigned by a
manager — there is no automatic territory or round-robin assignment, so a lead
sits in the queue until someone claims or assigns it. **Lead status** moves
`New → Contacted → Qualified → Unqualified`.

## 2. Converting a qualified lead

Use **Convert** on a qualified lead. A short screen asks whether to create an
opportunity (and for its name and amount). On confirm, the system creates:

- an **Account** from the lead's company,
- a **Contact** from the lead's name and details, and
- optionally an **Opportunity** with the name/amount you entered.

You don't re-key anything — company and contact details carry over from the lead.

## 3. Working an opportunity

Opportunities advance through these stages:

```
Prospecting → Qualification → Needs Analysis → Proposal → Negotiation → Closed Won / Closed Lost
```

New opportunities start at **10% probability**. Keep the **amount**, **stage**,
and **close date** current — the automation below keys off all three.

### Stalled-deal nudge (automatic)
A daily **07:30** sweep finds any open opportunity that has sat in its current
stage for **more than 14 days**. The owner and their manager are notified, and a
**high-priority follow-up task** is created. Advance the stage or re-qualify the
deal to clear it.

### Won-deal alert (automatic)
When a deal over **$100,000** is marked **Closed Won**, the owner and manager are
notified automatically.

## 4. Large-deal approval — when a deal pauses for sign-off

Deals above a threshold **lock and wait** for approval. There is no "submit"
step — the moment a deal's **amount** crosses $100K, it routes for approval
automatically, and you can't move it forward until each required approver signs
off.

| Deal amount | Required approval |
|---|---|
| **> $100,000** | Sales Manager review |
| **> $500,000** | Sales Manager **and** Sales Director sign-off |

While an approval is pending, the opportunity is **locked** and its
**Approval Status** shows the live state. On full approval it is stamped
**Approved** (with date) and you're notified. On rejection it is stamped
**Rejected** — revise and resubmit. Approvers act from their **Approvals → Inbox**.

## 5. Quotes

Generate a quote from an opportunity. The quote screen asks for:

- **Quote name**
- **Valid for (days)** — default **30**
- **Discount %** — default **0**

The system computes the math for you: subtotal = the opportunity amount,
discount amount = subtotal × discount %, and **total = amount × (1 − discount%)**.

### Quote auto-expiration (automatic)
A daily **01:00** job marks any still-open quote past its expiration date as
**Expired**. Re-issue a fresh quote if the deal is still live.

## 6. After the win: contracts & renewals

Closing a deal isn't the end of the relationship — it's the start of a contract
you'll eventually renew. Two automatic jobs make sure a contract never lapses
unnoticed.

### Renewal reminders (automatic)
Each contract carries its own **Renewal Notice Days** — how far ahead to start
the renewal conversation. A daily sweep finds **activated** contracts whose
**end date** has entered that notice window and:

- creates a **high-priority renewal task** for the owner (due on the contract's
  end date), and
- notifies the owner to start the renewal conversation.

### Auto-renewal → a deal already in your pipeline (automatic)
If a contract has **Auto-Renewal** switched on, the same sweep also opens a
renewal **opportunity** (type *Existing Customer — Renewal*), pre-filled from
the contract value — so the renewal is already sitting in your pipeline to work,
not something you have to remember to create.

### Expiration (automatic)
A contract that passes its **end date** without being renewed is automatically
marked **Expired**, and the owner is notified. Renew before the end date to
avoid the lapse.

## 7. Tasks

Creating a task with **Urgent** priority immediately notifies its owner. Routine
follow-up tasks (e.g. from the stalled-deal nudge) are created as **High**
priority.

---

**Related:** record visibility (who can see whose opportunities) and how to
change any threshold above are covered in **[Administration](crm_admin.md)**.
