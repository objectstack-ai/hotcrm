---
'hotcrm': patch
---

Name all eight case list views on the SLA & Escalation page. The page told a
service manager that `crm_case` ships **seven** views and then hand-copied the
roster behind that count, and the copy was one view short: **Unassigned —
triage** was missing from the list, in all three faces (`en`, `zh-Hans`,
`zh-Hant`) on the same line.

The count and the roster are one sentence doing two jobs, and both went stale
together when the eighth view landed. Re-derived from the file the sentence
already cites, `src/views/case.view.ts`: the object declares a default `list:`
view (*All Cases*) plus seven `listViews` entries — *Service Workflow*, *SLA
Calendar*, *Case Timeline*, *My Open Cases*, *Unassigned — triage*, *Escalated
Cases*, *⏰ SLA at Risk* — which is eight. Two neighbours that look like views
in a grep are not: the `calendar:` block inside `list:` is that grid's calendar
visualization binding, and `web_to_case` is a `formViews` entry, not a list
view. The sibling Cases page already documented eight; this page is what
disagreed.

The missing view is the one a manager most needs named here: **Unassigned —
triage** is where a web-to-case submission lands when nobody holds the Service
Agent position, so a page about SLA deadlines that omits it hides the queue
where unowned cases run their clock down.

Nothing else in the paragraph moved. Its other claims were re-measured against
the same file and hold: no case list view filters on **SLA Violated**
(`is_sla_violated` appears in `case.view.ts` only as a column on *All Cases*),
so **Escalated Cases** is still the closest workable list, and the two surfaces
that do filter on a breach are still dashboard tiles rather than views.

Prose only — no metadata changed, and no view was added, renamed or removed.
