---
'hotcrm': patch
---

Delete the phantom **Add Product** button from the Opportunities page and say how a
line item actually reaches a deal — in all three locales.

The detail-layout list carried "**Line Items** — with an **Add Product** button."
No action of that name is declared anywhere in `src/`. The list the bullet described
is `opp_products`, a `record:related_list` inside the *Related* tab's accordion,
and its authored properties are `objectName`, `relationshipField`, `columns` and
`limit` — nothing else. `RecordRelatedListProps` (`@objectstack/spec/ui` 17.3.0)
declares exactly two ways a related list can carry a button, `actions` and `add`,
and this list authors neither, so it renders its rows and the *View all* link that
`showViewAll` defaults on, and no button at all. The panel's declared label is
**Products**, which is what the bullet now calls it.

Deleting the clause on its own would have traded a false statement for a dangling
promise, because **Line items — what's actually being sold** further up the same
page tells a reader "Each opportunity can have line items". So that section now
states the measured route: nothing on this screen adds one; there is no line-item
entry in the sidebar either, because `crm_opportunity_line_item` has no list view
of its own and no navigation entry; permission is not the constraint, since a rep's
profile grants create on the object; nothing in `src/` creates a line item (the two
flow references in `billing-handoff` both *read* them through `get_record`, and no
seed dataset makes one). What is left is an import or the API — and the typed
**Amount** the same section already documents as an equal alternative.

Whether the app ought to offer that button is a question about `src/`, not about
this page, and is filed separately rather than answered here. Documentation only:
`src/pages/opportunity_detail.page.ts` is correct as authored, and no gate or test
was added.
