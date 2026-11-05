---
title: Quotes — Generation & Expiration
description: Generating a quote from an opportunity, how its totals are computed, its status, and automatic expiration.
order: 1
# sources: flows/objects this doc documents. Defaults and schedules here are
# guarded by test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:quote_generation
  - flow:quote_expiration
  - object:crm_quote
---

# Quotes — Generation & Expiration

For sales representatives and sales managers. A quote prices a deal for the
customer; this guide covers what the system fills in for you and what it does
on its own.

## Generating a quote

Generate a quote from an opportunity. The quote screen asks for:

- **Quote name**
- **Valid for (days)** — default **30**
- **Discount %** — default **0**

The system computes the math for you: subtotal = the opportunity amount,
discount amount = subtotal × discount %, and **total = amount × (1 − discount%)**.

When you submit, the dialog shows **Quote Created**: the quote is saved as a
**Draft**, and its name is a link that opens it. **Submit** on that screen just
closes the dialog; the quote is already there either way.

## Quote status

A quote usually moves along these arrows. A move off them still saves, and the
save comes back with a warning that spells out the usual path. **Accepted** and **Expired** are where a quote ends; a
rejected quote can go back to **Draft** to be reworked.

```mermaid
stateDiagram-v2
  state "Draft" as draft
  state "In Review" as in_review
  state "Presented" as presented
  state "Accepted" as accepted
  state "Rejected" as rejected
  state "Expired" as expired
  draft --> in_review
  draft --> presented
  draft --> expired
  in_review --> draft
  in_review --> presented
  in_review --> rejected
  in_review --> expired
  presented --> accepted
  presented --> rejected
  presented --> expired
  rejected --> draft
```

### Moving a quote along

Each arrow you take by hand has a button on the quote, shown only on the
statuses it leaves from: **Submit for Review** on a Draft, **Mark Presented** on
a quote In Review, **Accept** on a Presented quote, **Reject** on a quote In
Review or Presented, and **Revise** (back to Draft) on a quote In Review or
Rejected. **Accept** asks first, because it cannot be walked back from the
quote: it freezes the quote, closes its opportunity as won and drafts a
contract. The buttons are offered to whoever may edit the quote. The move to
**Expired** has no button; the daily job below makes it. The move from **Draft**
straight to **Presented** is made by printing the quote (below).

A new quote starts as **Draft**, **In Review** or **Presented**. The New form
does not offer Accepted, Rejected or Expired, and a save that creates a quote at
one of them is refused.

### Settled quotes

An **Accepted**, **Rejected** or **Expired** quote is settled. It shows no
**Edit**, and its line items show no **New**. Only its **Internal Notes** can
still be changed. A **Rejected** quote is reworked by clicking **Revise**: it goes
back to **Draft**, where its fields and lines can be edited again.

## Printing a quote

**Print Quote**, on the quote and in the quote list's row menu, prints the quote
as a document and files the PDF under the quote's **Attachments**, in your name.
It is offered to whoever may edit the quote and attach files to it.

Printing is presenting: when the PDF is filed, a **Draft** or **In Review**
quote moves to **Presented**. A quote in any other status keeps it, so you can
print it again as often as you need, and a file you attach yourself changes
nothing. The move is an ordinary save made by you, so a quote with no
**Contact** is printed and filed but stays where it was, with no message that
says so. Check the status after printing; fill in the contact and print again.

## Filing the signed copy

When the customer signs the quote, upload what they sent back to the quote's
**Signed Copy**, best while it is still **Presented**: once accepted, a quote is
frozen. The signed copy is recorded, not yet required: **Accept** still works
without one.

## When a quote is accepted

Accepting a quote wins its opportunity and drafts a **contract** from it. A
moment later you get a notice, **Contract drafted**, with the contract number
and a **View** link to it. The contract's term and contract type are starting
values, so check them before you activate it.

## Quote auto-expiration (automatic)

Where the deployment has switched scheduled work on, a daily **01:00** job marks
any still-open quote past its expiration date as **Expired**. A default install
boots that job unbound, and a lapsed quote keeps its status until someone
changes it. Re-issue a fresh quote if the deal is still live.

---

**Related:** the deal a quote prices — see
[Opportunities](./crm_sales_opportunities.md).
