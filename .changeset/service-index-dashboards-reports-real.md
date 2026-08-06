---
'hotcrm': patch
---

Write the service index page's "Standard dashboards & reports" section to what
the app actually ships. All four bullets on
`content/docs/service/index.mdx` (and its `zh-Hans` / `zh-Hant` translations)
were wrong, in two different ways.

The dashboard bullet promised a **top agents** tile and an **oldest open cases**
tile. Neither exists on `service_dashboard`, and neither is simply a widget
nobody built yet: `case_metrics` — the dataset every service widget and report
binds — declares no owner dimension, so nothing in analytics can rank agents,
and every tile on that dashboard aggregates the dataset rather than listing
records, so the oldest individual cases cannot be shown there either.
`content/docs/service/cases.mdx` had already said exactly that about the agent
half, so a reader comparing the two service pages was told both that a
leaderboard exists and that it cannot. The bullet now names the ten tiles the
dashboard ships — Open Cases, Critical Cases, Avg Resolution Time, SLA
Violations, Cases by Status / Priority / Origin, Daily Case Volume, SLA
Compliance and Open Cases by Priority — and says why the other two are absent.

The three report bullets named reports that carry different labels in
`src/reports/case.report.ts`: **Cases Opened by Priority × Day** had its two
dimensions the wrong way round (priority is the rows, the day is the columns —
the SLA page already wrote it correctly), **Cases by Status and Priority** was
spelled with a `×`, and **SLA Performance Report** was missing the last word of
its own name. A reader searching the reports list for any of the three found
nothing. The SLA bullet also still promised "% of cases resolved within SLA
target": that measure does not exist. The report gives case count, **SLA
Violation Rate** and average resolution time by priority, over closed cases
only.

No metadata changed. Whether the product *should* offer an agent ranking or an
oldest-cases queue is a product question this leaves open — it would mean adding
a dimension to `case_metrics` first.
