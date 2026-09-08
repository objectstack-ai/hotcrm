---
'hotcrm': patch
---

Give the opportunity **Products** panel a route to add a line item. A rep can now
itemise a deal from the deal's own screen instead of typing the **Amount** by hand.

`crm_opportunity_line_item` was declared live everywhere except where it counted.
Three profiles granted `allowCreate`; the Opportunities documentation described the
deal amount rolling up from line items; `billing-handoff.flow.ts`'s `load_line_items`
read them on every won deal and every activated contract. Nothing in the app could
create one — no action, no list view, no navigation entry, no seed, no flow write —
so that read returned the empty set for every deal in the product. This is the shape
ADR-0049 enforce-or-remove exists to eliminate, and the resolution here is to make
the capability reachable rather than to withdraw the declaration.

The *Products* panel on the *Related* tab now carries an **Add** button that opens a
picker over the product catalog, restricted to active products, and links the chosen
product through the line item's own `crm_product` lookup. Purely authored metadata —
`RecordRelatedListProps.add`, which the platform already offered; no platform change,
no new object, no permission change, and the panel's columns, limit and label are
untouched.

The part worth stating, because it is what makes a picker sufficient rather than a
half-measure: `add` writes a row carrying exactly two values, the parent deal and the
picked product. On this object that would leave `quantity` and `unit_price` unset, and
both are required and NOT NULL. The row is complete anyway, because
`quantity` defaults to `1` and `discount` to `0` on the fields themselves, and the
existing `beforeInsert` price fill stamps `list_price` from the chosen product and
defaults the negotiated `unit_price` to it — and a product's own `list_price` is
required, so that fill can never come up empty. A product picked from the dialog
therefore lands as a priced line of one, `total_price` computed, ready to be edited
into the real quantity and negotiated price. `test/opportunity-line-item-add-picker.test.ts`
measures that end to end on a real engine, with an ablation that unbinds the price
fill and shows the same insert refused, so the assertion cannot pass vacuously.

Behaviour that does **not** change: the billing hand-off already degraded gracefully
on a deal with no lines — it delivers `line_items: []` rather than failing — so this
adds content to a payload that was always well-formed, and no receiver contract moves.
The typed **Amount** remains a supported route; nothing forces itemisation.

⚠️ Superseding, in this same release, part of the documentation shipped by the entry
above about the phantom **Add Product** button: the Opportunities page now says in two
places that nothing on this screen adds a line item and that a line item reaches a deal
only through an import or the API. That was accurate when it was written and is not any
more. Correcting those two passages, in all three locales, is deliberately not bundled
here — it is a documentation change against a page this change does not own, and is
reported for its own card rather than ridden in on a `src/` PR.
