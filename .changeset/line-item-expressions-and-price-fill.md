---
'hotcrm': patch
---

Fix the line-item expression authoring and de-duplicate the price-fill hook
(#514 items 8, 3 and 15 — the two `*_line_item` objects only).

`crm_quote_line_item.total_price` was `record.subtotal * (1 + tax_rate/100)`,
and `subtotal` is itself a FORMULA — so the total depended on the platform
hydrating another computed field first, the hazard written up at
`lead.object.ts:61-64`. It is now composed from the same stored fields
`subtotal` reads, with the tax multiplier applied on top. The arithmetic is
unchanged (4 × 100 at 10% line discount and 8% tax is still 388.80); what
changes is that it no longer depends on evaluation order.

`crm_opportunity_line_item`'s `unit_price_positive` compared `record.unit_price
< 0` with no null guard. Strict CEL ABORTS on `null < 0` instead of evaluating
it false, so the rule was inert on a blank price — it never fired at all. It now
carries the same `!= null &&` guard its quote-side twin has always had. The
guard only narrows the predicate, so no previously-accepted record starts
failing; a blank price is still caught by the field's own `required`.

Both line-item objects and `crm_campaign_member` also had their expressions
authored with the wrong tag: formula fields used `P` (the predicate alias) and
`campaign_member`'s validation used a raw `{ dialect: 'cel', source }` object
because the file never imported `P`. `F`, `P` and `cel` are all aliases of the
same tagged template, so this was invisible at runtime and only ever misled
readers. Formulas now use `F`, conditions use `P`.

Finally, `opportunity_line_item.hook.ts` and `quote_line_item.hook.ts` carried
near-verbatim copies of the same price-fill handler, differing only in comments
— the shape that lets a fix land on one object and silently skip the other. Both
now build their hook from `_line-item-price-fill.ts`. The sharing happens at
authoring time only: the handler body closes over nothing but its own `ctx`, so
it still lowers to a body-only sandbox callable (the two lowered bodies in
`dist/objectstack.json` are byte-identical). The rollup hooks next door look
alike but compute genuinely different totals, so they stay separate.

Guarded by a new `test/line-item-conventions.test.ts` — deliberately its own
file rather than more surface on the high-churn `metadata-references.test.ts`.
It pins all four: formula fields must use `F` and conditions `P` across every
`*.object.ts` (a source-text check, because the tags are runtime-identical), no
line-item formula may read another formula field, both `unit_price_positive`
rules must be null-guarded, and the two price-fill handlers must remain one
implementation — asserted both on handler source and on a shared behavioural
scenario table run against each object.
