---
'hotcrm': patch
---

Correct the Opportunities page where the new add picker falsified it. The **Products**
panel on an opportunity's *Related* tab now carries an **Add** button, so the two
passages that told a reader nothing on the deal screen adds a line item were wrong the
moment that button landed. Fixed in all three locales.

Read this beside the two changesets it ships with.
`opportunities-line-items-real-route.md` documented yesterday's behaviour honestly —
nothing on the opportunity screen adds a line item, so a line reaches a deal through an
import, the API, or the hand-typed **Amount**. `opportunity-products-panel-adds-a-line.md`
then made that false on the same day by authoring `RecordRelatedListProps.add` on
`opp_products`. This changeset supersedes the first: where the two disagree, the panel
has the button.

It is a correction, not a rewrite. The *Line items — what's actually being sold* passage
makes seven distinct claims and only three of them flipped. Still true and still on the
page: there is no **Add Product** *action* anywhere in the app — what landed is a
*picker*, which is the second of the exactly two ways a related list can carry a button,
and the page had already taught that distinction, so the correction is written from it;
`crm_opportunity_line_item` still has no list view of its own; permission was never the
constraint, since a rep's profile grants create on the object; and typing the **Amount**
by hand is still a supported route, not a workaround. Import and the API still write
these rows — they are simply no longer the only route.

What the pages gain is what the picker actually does: it offers the product catalog
filtered to active products, so a retired product cannot be sold onto a new deal, and
the row it creates arrives complete and priced — quantity 1, the product's list price as
the unit price, no discount — for the rep to adjust from there.

The button is not given a Chinese name. The picker deliberately authors no `add.label`,
so the button renders the platform's own localized "Add", a string that lives outside
this repo's translation packs and that has no Traditional Chinese rendering to source at
all. Rather than coin one, the Chinese pages name the button as the surrounding prose
already names *View all* and **Products** and say that its label follows the reader's
interface language.

No timing claim is made about the opportunity **Amount** after a line lands.
`opportunity_amount_rollup` is `async: true` with `onError: 'log'`, so the roll-up is not
in the same transaction; that is pre-existing and deliberate, and describing the lag
would be a different card.

Documentation only. No `src/` change, and no gate or test was added:
`test/docs-drift.test.ts` names these three files but pins the large-deal amount
condition, so nothing in `pnpm verify` reads this prose and a pin added here would be
guarding page metadata with prose, which is how a sibling check already went vacuous.
