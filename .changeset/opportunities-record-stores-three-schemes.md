---
'hotcrm': patch
---

Split **What an opportunity record stores** into the three things that actually
organise `crm_opportunity`'s fields, and stop calling the object's field groups
"the detail screen" — in all three locales.

The section opened with "The detail screen has 7 sections:" above a seven-row
table. The seven are the object's **`fieldGroups`**, and the detail screen is not
where a reader meets them: the *Details* tab of `src/pages/opportunity_detail.page.ts`
declares **three** sections holding **seven** fields, and the form
(`src/views/opportunity.view.ts`) declares **four**. No two of the three agree.

The mislabel is not cosmetic. `fieldGroups` never reaches an authored
`record:details` at all — the derivation lives in the console's page synthesizer,
the path that fabricates a page for an object that has none authored, and an
authored page opts out of it (`test/field-groups-coverage.test.ts`). So a reader
who opened a deal looking for the **Financials** section that table promised would
not find it on the Details tab, or anywhere else on the screen.

The section now follows the shape `content/docs/service/cases.mdx` already carries:
one opening sentence naming all three schemes, then *The object's field groups*,
*The detail screen* and *The form*, each with its own table.

Four of the seven field-group rows were also wrong, which is why they are restated
from the object rather than relabelled in place — relabelling the table as an
accurate description of `fieldGroups` while it misstated four rows would have
asserted the error more confidently than the original did. **Probability (%)** is
in *Sales Process*, not *Financials*; *Sales Process* also holds **Approval Status**
and **Approved Date**, and there is no *created date* field on an opportunity;
the campaign field's label is **Campaign**, not *Source campaign*; and
*Forecast & Metrics* holds **Days in Current Stage**, **Private** and
**Forecast Category** rather than *line item totals* (not a field on this object)
and **Approval Status** (one group further up). Every row is now read off
`src/objects/opportunity.object.ts`, by declared label.

No `src/` metadata changed: the object, the page and the view are correct as
authored, and this is the documentation catching up with them. No gate or test was
added.
