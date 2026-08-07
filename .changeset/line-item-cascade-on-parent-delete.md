---
'hotcrm': patch
---

Let an opportunity or a quote that carries product lines be deleted again. Once a
rep itemised a deal — which is the ordinary state of any deal priced from the
product catalog — the parent record refused to delete, and the refusal handed the
API caller an internal authoring instruction:

```
DELETE /api/v1/data/crm_opportunity/<id>
→ 409 {"error":"Cannot delete crm_opportunity (<id>): 1 dependent
       crm_opportunity_line_item record(s) reference it via crm_opportunity
       (crm_opportunity is required, so it cannot be cleared). Delete or reassign
       them first, or set deleteBehavior:'cascade' on
       crm_opportunity_line_item.crm_opportunity.","code":"DELETE_RESTRICTED"}
```

`crm_quote` produced the same sentence with the nouns swapped. The only way
through was to delete every line by hand first.

The cause was a default nobody wrote down. `crm_opportunity_line_item
.crm_opportunity` and `crm_quote_line_item.crm_quote` declared no
`deleteBehavior`, so both took `Field.lookup`'s spec default of `set_null` — and
the engine's referential pass escalates a `set_null` default on a **required**
lookup to `restrict`, because a NOT NULL column cannot be cleared. Nothing in
either object's source said "refuse to delete the parent"; the behaviour came
entirely from the unwritten default.

Both parent lookups now declare `deleteBehavior: 'cascade'`. A line item is
subordinate by construction, and both objects already said so: their headers
state that a line has no meaning apart from its deal, and the rollup hooks derive
`crm_opportunity.amount` and the quote's subtotal/total **from** the line set. A
line whose parent is gone denotes nothing and would keep a deleted deal's revenue
alive in every line-level report.

**What changes for you:** deleting an opportunity or a quote now also removes its
product lines, so line-level revenue reporting drops accordingly — deliberately,
since the deal is gone. Nothing else on these objects changed: the `crm_product`
lookup stays on the restricting default, so retiring a catalog product that
priced any line is still refused ("Set is_active=false to retire instead"), and
lines belonging to other deals are never touched. This is deliberately *not* the
answer taken for campaign members and meeting attendees, whose parent lookups
keep restricting — a campaign's member list and a meeting's attendee list are
those records' historical evidence, while a price line is not. Refs #727.
