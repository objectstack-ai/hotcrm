---
'hotcrm': patch
---

Re-weight every phantom name on the **Cubes** and **Reports** analytics pages, all
three locales of each. The prose on both pages was already honest — its headings say
outright that the reports are published nowhere — but the typography contradicted it,
and a reader who skims bold runs reads the typography.

### What was wrong

The repo reserves **bold** for names the app really has and *italics* for a name a
reader arrives with that the product does not carry; a phantom must still be named —
say where the thing really lives, never delete it silently. Measured against the
declared labels under `src/` (every `label:` / `title:` string literal, 2936 of them),
`analytics/reports` carried **20** bolded names per locale that resolve to nothing,
and `analytics/cubes` **9** — 87 bold runs across the six pages.

They were not a long tail of near-misses. They were whole sections of report names:
*Forecast vs Actual*, *Win/Loss Analysis*, *Big Deals Won*, *Sales Cycle Length*,
*Discount Approval Activity*, *Lead Conversion Funnel*, *Aged Leads*,
*Lead Source ROI*, *Case Volume by Origin*, *Case Resolution Time*,
*Top Accounts by Case Volume*, *Reopened Cases*, *CSAT by Agent*,
*Contracts Expiring*, *Active Contracts by Product*, *Renewal Pipeline*,
*Campaign ROI*, *Campaign Engagement* — plus *Top Performing Reps*, which the page
itself introduces as a name whose real one is different, and the retired
*Customer Satisfaction* rating, bolded on both pages inside the sentence that says it
was retired. On `cubes` the *Name by name* list under the marketing section bolded
eight metric names that are questions a reader arrives with, one of them beside a real
formula field on the same line.

### What changed

Every one of those 87 runs is now italic, at the same site in English, Simplified and
Traditional Chinese — nothing was deleted, and every phantom still names where the
real thing lives. Three sites needed judgement rather than a sweep:

- *Campaign spend*, *cost per lead* and *cost per opportunity* now sit in italics
  beside **ROI %** in bold, on the same line: the ROI percentage is a real formula
  field on `crm_campaign`, the three spend figures are carried by no field at all.
- *Persona (job role)* is italic; the **Title** field it points at stays bold.
- The bullet that called **period** a real field on `crm_campaign` was corrected
  rather than re-marked. The campaign carries **Start Date** and **End Date** and no
  Period field, so italicising the word alone would have left a sentence that reads
  "real fields on `crm_campaign`" over a name that is not one.

Nothing under `src/` changed, no count on any page moved, and the bold runs that name
something real — 72 on `reports`, 36 on `cubes` — were re-read against source and left
alone.
