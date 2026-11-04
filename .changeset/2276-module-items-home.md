---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The last four revenue and marketing items now belong to their modules (#2276).** The **Generate Quote** flow and the **Product Metrics** dataset behind the CRM Overview **Top Products** tile now ship in **HotCRM Revenue** (`app.objectstack.hotcrm.revenue`), and the two flows that add a lead or a contact to a campaign ship in **HotCRM Marketing** (`app.objectstack.hotcrm.marketing`), as `GET /api/v1/packages` and Studio report. Until now the HotCRM app package registered them, because the platform judged an app action's flow and a dashboard tile's dataset one package at a time (objectstack-ai/objectstack#25514). ObjectStack 18.2.0, which HotCRM already runs on, resolves both against the whole artifact.

Nothing a user sees changes. **Generate Quote** on an opportunity, and **Add to Campaign** on a lead or a contact, open the same flows; the **Top Products** tile shows the same totals per product category.
