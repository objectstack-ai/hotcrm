---
'hotcrm': patch
---

Write the analytics reports page's Sales / Revenue / Marketing sections and the
whole cubes page to source, in all three locales.

**Thirteen report names, none of them published (#962).** `src/reports/` ships ten
reports and the page's remaining three sections named thirteen that exist nowhere,
while the six real ones — `account.report.ts`'s **Accounts by Industry and Type**,
`churn.report.ts`'s **Customer Churn Signals** and the four in
`opportunity.report.ts` — had never appeared on the page at all. Two of the
thirteen were real names attached to the wrong thing: **Pipeline by Stage** is the
funnel tile shared by CRM Overview / Sales Performance / Executive Overview
(`src/dashboards/shared-widgets.ts`) and the chart title of the real report
**Opportunities by Stage**, and **Stale Opportunities** is the *Stale* list view
(`src/views/opportunity.view.ts`), which applies no 14-day cut — it ranks every
open deal by **Stage Entry Date**, the 14 days belonging to the
`opportunity_stagnation` flow. Each remaining name is now judged individually
against the semantic layer: *Forecast vs Actual*, *Win/Loss Analysis*, *Big Deals
Won* and the renewal pipeline are a custom report away, while *Sales Cycle
Length*, *Discount Approval Activity* and the three contract reports cannot be
built at all — no dataset reads `crm_contract` or either line-item object, and the
one duration on the deal, **Days in Current Stage**, is a post-query formula that
nothing can aggregate. The subscription example, the permissions bullet and the
manager tips no longer name reports that do not exist.

**The four built-in cubes do not exist (#965).** The page was built on *Sales*,
*Pipeline*, *Service* and *Marketing* cubes; this app declares no cube at all —
every semantic definition is a `defineDataset(...)` under `src/datasets/`, and the
analytics service compiles each one into its cube internally (ADR-0021, and
`objectstack.config.ts` registers no `analyticsCubes`). The page now lists the nine
real datasets with their actual dimensions and measures, folds Sales and Pipeline
into the single `opportunity_metrics` they both described, and names per item what
is unreachable and why — weighted pipeline (the **Expected Revenue** field carries
it per record, no measure aggregates it), average discount (a line-item percent no
dataset reads), product/family, account tier and size, team and region (positions
and **Billing Country**, i.e. access-control machinery), day/week/year grains, and
snapshot dates (nothing snapshots the pipeline; `forecast_metrics` holds the only
per-period rows). **Marketing has no data source**: `crm_campaign` and
`crm_campaign_member` carry the spend, the counters and the **ROI %** / **Response
Rate %** formulas on the record, and no dataset reads either, so nothing aggregates
them and `crm_opportunity.crm_campaign` cannot attribute revenue either.

The platform-side sections are left explicitly unclaimed rather than declared
false: the drag-and-drop cube UI, the refresh cadence and the cube access log are
runtime questions this repo cannot answer, so the page says so and points the
reader at their deployment. What it does state is the app-side half — no skill
under `src/skills/` names a dataset or a cube, and **Live Data Access** answers
data questions through the platform's object tools (`describe_object`,
`aggregate_data`, …), not off a compiled cube — and that a new cube here starts as
a new dataset in source.

Documentation only; nothing under `src/` changed.
