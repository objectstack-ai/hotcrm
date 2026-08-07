---
'hotcrm': patch
---

Opportunity and quote line items now have a readable record title instead of a raw record id.

Neither line-item object declared a record title, and a line item is only ever seen as a row
in someone else's panel — it has no navigation entry and no page of its own — so the title is
the whole of what a user reads about it. The "Opportunity Line Items" card in the reference
rail on an opportunity's detail page listed bare record ids (`1I4gIPKsDXQIqQv3`, …) where the
priced product line should be, while the Quotes and Open Tasks cards beside it read fine.

Both `crm_opportunity_line_item` and `crm_quote_line_item` now declare the line's own
`description` as their `nameField`, so lookup pickers, global search, record drawers and
related lists all label a line by what it sells rather than by its id. That is the field the
platform already derived as the title for these objects; declaring it makes the derivation
explicit, so a consumer that does not run the derivation reaches the same answer.

The reference rail needed a second, separate fix: it resolves a preview row's label from the
entry's own `displayField` and a fixed list of record keys, never from the object's declared
`nameField`. The line-item entry on the opportunity detail page now declares
`displayField: 'description'`, pointing at the same field the object titles itself by.

Note for authors: `description` is optional on a line, so a line saved without one still has
no title and falls back to its id.
