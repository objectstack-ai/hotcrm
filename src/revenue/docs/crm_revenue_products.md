---
title: Products & Price Books — The Catalog Behind Every Line
description: What a product carries, how its price reaches a deal or a quote through a price book, how to retire one, and how price books work.
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

When you pick a product on a line, the line's **List Price** is filled in:

- on a **deal's** line item, from the product's own **List Price**;
- on a **quote's** line item, from the product's entry in the quote's
  **Price Book** (see *Quoting from a price book* below).

On a new line, **Sales Price** starts at that list price too; change it to the
price you negotiated, and it stays yours.

Later price changes do not reach lines already written. Raise a product's
**List Price**, or reprice its entry in a book, and the deals and quotes you
have already priced keep the price they were given; a line picks up the new
list price only when its product is picked again. A product's name is the one exception: rename a product
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
  includes a book named *Standard* with an entry for every sample product. An
  organization whose sample data is in Simplified Chinese gets the same sample
  catalogue with Chinese names instead, at the same prices, and its book is
  named *标准价格表*. The
  standard book follows the catalogue: a product you add gets its entry there
  at its **List Price** when it is saved, and a change of the product's
  **List Price** reprices that entry.
- **One entry per product, per book.** A second entry for a product the book
  already prices is refused, and the message names the book and the product so
  you can edit the existing entry instead. The same product can have an entry in
  every book.
- **Validity.** **Valid From** and **Valid To** record the window a book is
  meant for. Either may stay empty, and **Valid To** may not fall before
  **Valid From**. Nothing switches a book on or off by these dates yet.
- **Who maintains them.** Administrators, and sales managers for the books
  they own; sales reps read every book.
- **Add Products.** On a book's page, **Add Products** gives every active
  product the book does not price yet an entry at one percentage of its
  **List Price** (80 for 20% below it). Products the book already prices keep
  their price. It adds each entry as you, so it works only on a book you may
  edit; on any other book every product is refused, and the run says so.

## Quoting from a price book

- **A new quote prices from the standard book** unless you pick another active
  book in its **Price Book** field before adding lines.
- **A product the quote's book does not price is refused** on the line, naming
  the book and the product. An inactive entry counts as no price.
- **A quote's book cannot change once it has line items**: remove them, change
  the book, and add them again. A settled quote's book is frozen with it.
- **A book any quote prices from cannot be deleted**; turn off **Active** to
  take it out of the quote's picker.
- **Deals do not read books**: a deal's line takes the product's **List Price**.
- A quote created before quotes read price books has no **Price Book**; its new
  lines price from the standard book.

---

**Related:** how a quote totals its lines and expires — see
[Quotes](./crm_revenue_quotes.md).
