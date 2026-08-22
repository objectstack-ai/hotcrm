---
'hotcrm': patch
---

Write the analytics landing page to source, and retire the "four built-in cubes"
vocabulary from the eight pages that still carried it.

`content/docs/analytics/index.mdx` is the first screen a reader of the analytics
docs sees, and every count on it named something else. It advertised **4 cubes**
(*Sales*, *Pipeline*, *Service*, *Marketing* — four names that exist nowhere in
the app; the semantic layer is the nine datasets in `src/datasets/`, which the
analytics service compiles into cubes internally, ADR-0021), **4 dashboards**
(there are five — *Sales Activity* was missing), **10+ reports across leads,
deals, cases, contracts** (there are exactly ten, and none of them is a contract
report: no dataset reads `crm_contract`, so none can be built), a report called
*Pipeline by Stage* (a shared dashboard tile and a chart title — the report is
**Opportunities by Stage**) and an **Analytics** navigation group (the group is
called **Insights**, and it holds CRM Overview, Forecasts, Pipeline Coverage,
Lead Inflow and SLA Performance — nothing in it is called *Dashboards*,
*Reports* or *Cubes*). The "AI Copilot reads directly from cubes" claim now says
what this app declares — no skill names a dataset, cube or measure, and the one
that answers data questions aggregates over records — and leaves the platform
side undecided rather than asserting it in either direction.

The same retired vocabulary is gone from eight further pages: `whats-new` now
lists the nine datasets it actually shipped, `getting-started/for-developers`
draws `datasets/` instead of the `src/cubes/` directory removed in #492, and
`reference/performance-and-limits` plus `reference/faq` state the refresh cadence
the app really declares — each dashboard's own `refreshInterval`, 60 s on
Customer Service, 180 s on Sales Performance, 300 s on the other three — in place
of an "every 5 min incremental / nightly full" figure nothing in `src/`
configures, and of a manual refresh button no dashboard declares.
`sales/pipeline-management`, `getting-started/introduction`,
`marketplace/fork-hotcrm` and `administration/sandbox-and-releases` were renames
only. The glossary's definition of the *cube* concept is deliberately untouched:
the concept is real, and only its misapplication to this app was not.

Documentation only in all three locales; no metadata changed.
`test/docs-analytics-vocabulary.test.ts` now derives every count and product name
on these pages from `src/` and fails the build when the app and the page disagree.
Refs #976 #977.
