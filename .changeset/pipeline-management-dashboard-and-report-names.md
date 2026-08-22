---
'hotcrm': patch
---

Write the sales pipeline page's remaining dashboard and report references to what
the app actually ships — one phantom capability, four wrong report names, and a
tile that cannot exist.

`content/docs/sales/pipeline-management.mdx` (and both zh pages) carried three
separate drifts, all of which sent a reader looking for something that is not
there.

**The weighted forecast is a list-view total, not a dashboard number.** The page
told a sales manager that a *Sales Dashboard* "sums Expected Revenue across the
open pipeline". Neither half held. There is no dashboard by that name — the real
one is `sales_dashboard`, labelled **Sales Performance**, the same phantom #985
removed from the roll-up list one section further down. And no dashboard widget
can sum expected revenue at all: the `opportunity_metrics` dataset in
`src/datasets/opportunity.dataset.ts` declares no measure over
`expected_revenue`, and every amount measure it does expose (**Total Amount**,
**Avg Deal Size**, **Won Revenue**, **Lost Revenue**) reads the raw `amount`
field. The **Total Pipeline** tile is therefore the *unweighted* open pipeline,
and a reader who took the page at its word was reading a number short of a
probability coefficient while being told it was the weighted forecast. Where the
weighted sum genuinely lives is the opportunity list views: **Open Deals** and
**All Opportunities** each declare
`{ field: 'expected_revenue', summary: 'sum' }` in
`src/views/opportunity.view.ts`, which is how
`content/docs/sales/opportunities.mdx` already describes them. The page now says
that, and says plainly why the dashboard cannot match it.

**The reports table named a sidebar group that does not exist and four reports
by names nothing carries.** The group is **Insights**
(`src/apps/crm.app.ts`), not *Reports*, and it pins three reports — Pipeline
Coverage, Lead Inflow, SLA Performance — beside the CRM Overview dashboard and
Forecasts, so only the first row of the table is reachable from the nav at all;
the rest open from the reports screen. The four drifted rows now carry the
labels `src/reports/opportunity.report.ts` declares — **Pipeline Coverage by
Forecast × Quarter**, **Opportunity Funnel by Owner → Stage**, **Won
Opportunities by Owner** — and the coverage row's axes are stated the way #985
just landed them one section below (forecast category down the rows, close
quarter across the columns) instead of the transposed *quarter × stage*. The
same truncated names in the cadence table and the manager tips were completed to
match, including the zh pages' invented Chinese report names, which no
translation file backs.

**There is no *top deals* tile, and there cannot be one.** The roll-up list
named three Sales Performance widgets; two are real (**Pipeline by Stage**,
**Win Rate (12M)**) and the third was removed on purpose. A dashboard `table`
binds to an analytics dataset and can only aggregate — it cannot list raw
records (ADR-0021) — so the old **Top Open Opportunities** table produced one
summary row rather than a deal ranking and was replaced by **Open Pipeline by
Owner**. The Row 5 comment in `src/dashboards/sales.dashboard.ts` records the
swap; the page now states it and points a reader wanting a deal-by-deal ranking
at an opportunity list view.

Docs only — no `src/` change.
