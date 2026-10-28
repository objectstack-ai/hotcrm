---
title: Billing Hand-off — When a Won Deal Goes to Billing
description: Where HotCRM's part ends, the two moments a deal is handed to your billing system, and what travels with it.
order: 3
# sources: the flows this doc documents. The two moments are pinned to the
# flows' start conditions by test/docs-drift.test.ts; build ignores unknown
# frontmatter keys.
sources:
  - flow:billing_handoff_closed_won
  - flow:billing_handoff_contract_activated
  - object:crm_opportunity
  - object:crm_contract
---

# Billing Hand-off — When a Won Deal Goes to Billing

For sales representatives, sales managers and the administrator who connects
HotCRM to billing. HotCRM runs the commercial side of a sale: finding the
customer, agreeing the price, signing the contract. It does not invoice. There
are no orders, invoices or payments in HotCRM; your billing system keeps those,
and HotCRM tells it when there is something to bill.

## The two moments

HotCRM tells your billing system twice, each time a record **crosses into** a
state:

| When | What it says |
| --- | --- |
| A deal's **Stage** becomes **Closed Won** | We won this deal. |
| A contract's **Status** becomes **Activated** | This agreement is in force, on these terms. |

Each moment is sent once. A won deal keeps being edited afterwards (a PO number
added, an owner changed), and none of those saves sends it again. A deal that is
moved out of **Closed Won** and later won again crosses a second time, and is
sent a second time.

Most billing teams act on one of the two. For subscriptions it is usually the
contract, because that is the message that carries the billing terms. Contracts
are described in [Contracts](./crm_sales_contracts.md), deals in
[Opportunities](./crm_sales_opportunities.md).

## What travels with it

Each message is one complete package, so billing never has to come back and ask:

- **The record itself.** For a won deal: its name, amount, close date, type and
  owner. For a contract: its number, type, dates and term, its value, and the
  two fields that are there for billing, **Billing Frequency** and
  **Payment Terms**, with whether it renews automatically and when it was
  signed.
- **The customer.** The account's name and account number, its billing address
  and country, phone and website: what billing needs to open the customer.
- **What was sold.** Every line item of the deal: product, description,
  quantity, list price, sales price, discount and line total. A contract sends
  the line items of the deal it came from; a contract made without a deal sends
  an empty list.

The package is a fixed list. A field your administrator adds to accounts or
deals is not sent until the hand-off itself is changed, so billing never
receives a surprise.

## What does not come back

Nothing flows back into HotCRM. No field here tells you whether an invoice was
raised or paid, and none pretends to. HotCRM keeps no stock figure either:
closing a deal reduces no inventory.

## For the administrator

- **Delivery is retried.** The message is queued, not sent from your save, and
  a receiver that is down receives it when it comes back. Every attempt is
  logged by the platform as an HTTP delivery; there is no *Billing* entry in
  HotCRM's own navigation.
- **Where it is sent is set at deployment.** The address and the signing secret
  are part of the app as deployed, not a Setup screen: changing them is a
  rebuild and redeploy. Until they are set, the messages go to an example
  address, fail, and are logged as failed, so an unconnected hand-off is
  visible rather than silent.
