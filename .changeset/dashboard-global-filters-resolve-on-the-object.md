---
'hotcrm': patch
---

Write down what a dashboard filter actually filters — the rule the docs left a
careful reader to guess wrong.

`content/docs/analytics/dashboards.mdx` (and its two locale twins) now say, in
one paragraph under **What you can change**, that a dashboard filter is matched
against the **object** behind each widget's dataset rather than against that
dataset's declared dimensions, and is ANDed into the query of every widget bound
to it. Four consequences follow, and all four were previously recorded nowhere a
reader could reach — only as inline comments in `src/dashboards/executive.dashboard.ts`
and `src/dashboards/crm.dashboard.ts`:

- the filter needs no dataset dimension: Customer Service offers an **Agent**
  filter on `case_metrics`, which declares no owner dimension, because `owner_id`
  is a field on the case;
- naming a field there confers no ability to **group by** it, which is why
  *SLA & Escalation* is right that no report and no dashboard widget breaks cases
  down by agent — the two sentences describe different paths, not a contradiction;
- a filter naming a field a widget's own object lacks would ask that widget's
  query for a column that does not exist;
- so a widget that cannot answer a filter opts out of it by name, via
  `filterBindings`, rather than quietly ignoring it.

The behaviour was established by browser measurement on ObjectStack 17.1.0 and
re-confirmed on the installed 17.3.0 line before being published as a current
fact: `@objectstack/service-analytics` merges the dashboard's filters into each
widget's query as `runtimeFilter`, and a filter member the dataset does not
declare falls through to the raw object column, while a widget dimension that is
not a declared dataset dimension is a hard authoring error.

The same section also now states what a date-range window means, which was
asserted in `test/dashboard-date-range-window.test.ts` and written on no page:
windows resolve server-side on UTC calendar days, so "last 7 days" is the seven
UTC calendar days ending with today's UTC date, both ends inclusive, and the
reader's own clock does not enter into it.

No metadata changed. No dashboard, dataset or object was touched.
