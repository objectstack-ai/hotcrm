# REQ-0009: Price books — more than one price per product, chosen per quote; multi-currency waits for the platform

- **Status**: Triaged
- **Source**: Maintainer (internal) — product direction from the 2026-10-26 module-expansion review, not a customer intake
- **Raised**: 2026-10-26
- **Disposition**: **B standard-enhancement** inside `revenue`. One item is **D defer** — multi-currency — with the platform card objectstack-ai/objectstack#8345 as its trigger.
- **Traceability**: design — this record's *Product response*; cards — hotcrm#2313 (phase 1), hotcrm#2318 (phases 2–3); changesets — to be filled in per phase.

## Requirement

Set in the module-expansion review of 2026-10-26 (the same review as REQ-0008); in substance:

1. A product needs more than one price: a standard list, a partner or tier price, a regional
   price, a promotional price with a validity window.
2. A quote chooses which price book it prices from, and its lines take that book's price as the
   list price they discount from.
3. The maintainer asked whether multi-currency should wait for the platform. Ruled: **wait**
   (`module-split-plan.md`, *Decisions recorded (2026-10-26)*, item 14).

## Standard product analysis

**What exists.** `crm_product` (`src/revenue/objects/product.object.ts`) carries one `list_price`
and one `cost`, both `Field.currency`, with the `list_price ≥ cost` validation and the
"referenced product cannot be deleted" hook. `crm_quote_line_item` copies `list_price` from the
product and discounts it to `unit_price`; the quote rolls the lines up. There is one price per
product, for everyone, in the tenant's default currency.

**What the platform offers, and does not.** On `@objectstack/spec` 18.1.0 a `currency` field's
value is a bare number; `currencyConfig.currencyMode` is `dynamic` (display in the tenant default
currency) or `fixed` (one ISO code for the field). There is no per-record currency, no exchange-rate
table, no conversion in datasets or reports. Lookups, master-detail, `requiredWhen`, picklists and
`Field.summary` are all there, which is all a price book needs.

**The gap.** Tiered, regional and promotional pricing cannot be expressed; every rep sees and quotes
one price.

## Disposition & rationale

**B — standard, inside `revenue`.** A price book is a standard CPQ construct every mainstream CRM
ships, it is one of the two capabilities a quoting module must have to be called CPQ, and it is
pure metadata on the pin: two objects, one lookup on the quote, one rule on the line.

**D — multi-currency, deferred to the platform.** Per-record currency, exchange rates and converted
reporting are platform capability (AGENTS.md *Scope* rules 1 and 2). ⛔ Not simulated here with a
text field and a rate field. **Revisit trigger**: a published `@objectstack/*` release carrying a
per-record currency and an exchange-rate table — the platform card is objectstack-ai/objectstack#8345
(exchange rates, home-currency conversion, converted roll-ups; `pm:on-hold` since 2026-10-08 on the
maintainer's word 「8345 多币种暂时不是重点，暂停」, so no second card is filed). Until then a price book has no currency of its own; every amount is in the tenant default currency, as
every amount in HotCRM is today.

## Product response

- **Phase 1 — the objects.** `crm_price_book` (name, description, `is_active`, `is_standard`,
  `valid_from` / `valid_to`; sharing `public_read`) and `crm_price_book_entry`
  (`crm_price_book` master-detail, `crm_product` lookup, `list_price`, `is_active`; one entry per
  product per book, enforced by a hook beside the object). A seed `Standard` book is created from
  every product's `list_price`, so an upgraded tenant quotes exactly what it quoted before.
  `crm_product.list_price` stays as the standard book's source and the `≥ cost` rule stays on it.
- **Phase 2 — the quote.** `crm_price_book` lookup on `crm_quote`, defaulting to the standard book;
  a line's `list_price` is read from the chosen book's entry for its product (hook on
  `crm_quote_line_item`), and a product without an entry in that book is refused on the line, naming
  the book. The quote's book is frozen with the quote once it is `accepted` / `expired` (the existing
  freeze, one more field).
- **Phase 3 — the surface.** Price-book list and record pages with the entry related list; an
  *Add products* screen flow on a book; the product record page lists its entries. Permission sets:
  sales manager and admin edit books, reps read; the four locale packs carry every label.
- **Docs** under `content/docs/revenue/`, English first, then `.zh-Hans.mdx` and `.zh-Hant.mdx`.

## Acceptance

- On `pnpm dev`: a manager creates a *Partner* book with one entry 20% under the standard price; a
  rep quotes the same product from the standard book and from the partner book and the two lines
  show the two list prices; quoting a product the partner book lacks is refused naming the book;
  an existing quote's lines keep their prices after the book is edited. `pnpm verify` green; one
  changeset per PR; the browser pass recorded in each PR.
- The deferred item is closed by objectstack-ai/objectstack#8345's release and a separate record, not by this one.
- This record is closed as **Shipped** when phase 3 is on `main`.
