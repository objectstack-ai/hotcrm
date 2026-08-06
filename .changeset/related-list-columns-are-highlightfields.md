---
'hotcrm': patch
---

Correct what `src/views/event_attendee.view.ts` claims a detail-page related
list reads, and pin the metadata that actually curates one.

The file header justified the attendee grid and form with a mechanism it stated
as fact — "the related list renders THIS view's columns, and the quick-create
modal renders THIS form … for the same reason `crm_campaign_member` has them" —
and it was the only written account of that rendering path in this repo.
`crm_campaign_member` has no view metadata at all, so the cited precedent was a
counter-example, and #944 asked which half was wrong. Measured against the
shipped Console (17.0.0-rc.3), the answer is the mechanism:

- **A related list never reads the child's `list` view.** It takes its columns
  from the child's lookup field (`relatedListColumns`, authored nowhere in this
  app), then falls back to the child object's `highlightFields` minus the lookup
  the panel is scoped by, capped at six, with columns that are empty on every
  fetched row dropped. Only an object with no `highlightFields` reaches a
  heuristic over the whole field map — which is title-ish names first and audit
  columns last, not "every column in declaration order".
- **The `form` half is real.** The Console merges a view bundle's `form` onto
  the object definition, and the drawer a related list opens renders its
  sections. What it buys is the section split and the field order: with no form
  the drawer already drops `autonumber`, `formula` and `summary` fields in
  create mode and sections the rest by the object's own `fieldGroups`, so the
  raw autonumber was never on offer.

So the campaign detail page's **Campaign Members** panel is not degraded and
never was: it renders Lead / Contact / Status / Response Date off
`crm_campaign_member.highlightFields`. Adding a member view would not have
changed one column of it. Nothing user-visible changes here — the header is
rewritten to what was measured, and `test/view-references.test.ts` now pins the
load-bearing metadata for every object reached only through a parent (the two
junctions and the two line items): `highlightFields` must exist, resolve, and
survive dropping the panel's own scope field, so that deleting it — the one
change that really would leave a panel leading with `CM-00001` — fails a test
instead of shipping.

Refs #944.
