---
'hotcrm': patch
---

Retired the `crm_opportunity.competitors` placeholder picklist — the field whose
entire option set was the invented `Competitor A` / `Competitor B` /
`Competitor C`, shipped as production metadata and translated into all four
locale packs.

Measured before removing it: the field had no reader anywhere in the app — no
list-view column, filter, detail-page section, dashboard, report, dataset, flow,
hook, validation rule or AI skill named it — and no seed row ever set a value.
Its only surface was one slot on the opportunity edit form, so a rep could fill
it in and never see it again. Re-spelling the options would have kept a
write-only field alive; giving it a display surface would have been new
capability, which the ruling on #1061 excluded.

What competitive data the app keeps is unchanged and now honestly documented:
the `Lost to Competitor` closed-lost reason with the free-text `Loss Details`
beside it.

Also in this change:

- The `competition` field group ("Competition & Campaigns") held nothing but
  `competitors` and the campaign lookup, so it is now `campaign` / "Campaigns"
  in the object and in all four locale packs.
- The docs no longer claim the Copilot consumes competitor data: two pages said
  the AI reads this field to surface win strategies, and `src/skills/` never
  named it.
- New guard `test/placeholder-picklist-options.test.ts` fails on any option
  label shaped like a serial placeholder (`Vendor A`, `競合 A`), in the object
  metadata or in any locale pack, and pins the retired field out of both.
