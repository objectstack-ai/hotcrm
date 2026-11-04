---
title: Products & Price Books — The Catalog Behind Every Line
description: What a product carries, how its price reaches a deal or a quote, how to retire one, and what price books do today.
order: 2
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_product
  - object:crm_price_book
  - object:crm_price_book_entry
  - object:crm_opportunity_line_item
  - object:crm_quote_line_item
---

# Products & Price Books — The Catalog Behind Every Line

For sales representatives, sales managers and whoever keeps the catalog. A
product is anything you sell: software, hardware, a service, a subscription, a
support plan. Deals and quotes price their lines from it, so a catalog kept
right is a quote that is right the first time.

## What a product carries

- **Product Code** is given to every product when it is saved, so each one has
  a short reference that never changes.
- **SKU** is stored in capitals, however it was typed.
- **Category** says how the product is delivered, **Product Family** where it
  sits in your portfolio; reports slice the product mix by both.
- **List Price** is the published price, and **Cost** what it costs you.

Two pricing rules hold on every save. A negative **List Price** is refused, and
so is a **List Price** below the **Cost**: a product that loses money on every
sale is a typing mistake far more often than a plan.

HotCRM keeps no stock and no billing schedule on a product. Nothing counts down
when a deal is won, and how a subscription is billed belongs to the contract:
see [Billing Hand-off](./crm_revenue_billing_handoff.md).

## How a product's price reaches a line

When you pick a product on a deal's line item or a quote's line item, the
line's **List Price** is copied from the product. On a new line, **Sales Price**
starts at that list price too; change it to the price you negotiated, and it
stays yours.

Later changes to the catalog do not reach lines already written. Raise a
product's **List Price** and the deals and quotes you have already priced keep
the price they were given; a line picks up the new list price only when its
product is picked again. A product's name is the one exception: rename a product
and every line that sold it shows the new name, closed deals and settled quotes
included, because a name is not a figure.

## Retiring a product

A product that has been sold cannot be deleted. Once it is on any deal's line
item or any quote's line item, past ones included, the delete is refused and
the message says how many lines hold it. Turn off **Active** instead: the
product stays on every deal and quote that sold it, and **Active** tells your
team it is no longer offered.

## Price books

A **price book** is a named list of prices, so the same product can carry a
different price for a different audience: a partner tier, a region, a
promotion. A book holds one **entry** per product, with that product's
**List Price** in the book and whether the entry is **Active**.

- **One standard book.** Exactly one book is marked **Standard**. A second book
  cannot be marked **Standard**, and the standard book can neither lose the mark
  nor be deleted; to stop using it, turn off **Active**. HotCRM's sample data
  includes a book named *Standard* with an entry for every sample product. A
  product you add later gets no entry in it by itself: add one by hand.
- **One entry per product, per book.** A second entry for a product the book
  already prices is refused, and the message names the book and the product so
  you can edit the existing entry instead. The same product can have an entry in
  every book.
- **Validity.** **Valid From** and **Valid To** record the window a book is
  meant for. Either may stay empty, and **Valid To** may not fall before
  **Valid From**. Nothing switches a book on or off by these dates yet.
- **Who maintains them.** Administrators, and sales managers for the books
  they own; sales reps read every book.

**What price books do not do yet:** quotes and deals do not read them. A line
still takes its list price from the product, as described above. Choosing a
book on a quote, and pricing its lines from that book, is the next step of this
feature; this page will describe it when it ships.

---

**Related:** how a quote totals its lines and expires — see
[Quotes](./crm_revenue_quotes.md).
