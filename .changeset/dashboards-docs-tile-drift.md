---
'hotcrm': patch
---

The dashboards documentation now lists the tiles the app actually ships, and a CI rule keeps it that way.

`content/docs/analytics/dashboards.mdx` described a different product. Of the tiles
it named, CRM Overview and Executive Overview overlapped the registered metadata on
**zero**; the page advertised "Forecast vs Quota — gauge", "Net New ARR", "CSAT and
NPS", "Customer Acquisition Cost", "Activity Heatmap" and "Slipping Deals", several
of which are not measures any dataset defines. It also asserted that *"the Cases
Approaching SLA tile is the most-clicked widget on this dashboard"* — a tile that
does not exist, quantified by click telemetry this repo does not collect. That claim
is **deleted**, not restated more softly: an unmeasured superlative is the same
defect as a hand-typed trend percentage (#587).

The page now describes the five dashboards that are registered — CRM Overview, Sales
Performance, **Sales Activity** (added by #592, and undocumented until now),
Customer Service and Executive Overview — tile by tile, under their own `label`s, and
keeps the "built for / answers" framing that was the genuinely useful part. Three
further corrections of substance:

- No KPI tile shows a period-over-period delta on any dashboard (#500, #587), so the
  "trend vs prior week" lines are gone rather than reattached to real tiles.
- Sales Activity and Customer Service have **no date-range picker**, deliberately —
  a datetime-column range zeroes every widget on the current platform (#460). The
  page said all dashboards could be filtered by date; it now says which can, and why
  the other two cannot.
- The capability list that promised tile export to image/PDF, weekly PDF
  subscriptions, dashboard-level threshold alerts and scheduled snapshot decks is
  replaced by the controls each dashboard actually declares (date range, global
  filters, refresh interval), since nothing in this app implements the rest.

`test/docs-drift.test.ts` gains a dashboards rule so this class fails at PR time
instead of in front of a customer: every tile bullet inside a dashboard's section
must resolve to a widget `title` on that dashboard, every `**Name** tile` reference
in the prose must resolve to a widget on some dashboard, and every registered
dashboard must have a section on the page — the last of which is what a fifth
dashboard shipping undocumented would have tripped. Three vacuity assertions keep
the rule from passing over zero input.

The `zh-Hans` / `zh-Hant` translations of this page still carry the old text and are
tracked separately; the guard is written so they join it as a one-line change once
retranslated.

Refs #610.
