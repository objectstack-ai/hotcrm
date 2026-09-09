---
---

Published assets only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page, dashboard or hook. The empty changeset is preferred over the label
because it is committed evidence that travels with the PR and it leaves both
steps of the gate running instead of skipping the job outright.

Re-capture both locale files of `assets/screenshots/hotcrm/sales-dashboard/`.

The published `en.jpg` was an English capture carrying a Simplified y-axis: its
*Monthly Revenue Trend* read `38万 / 28.5万 / 19万 / 9.5万`, character for
character the same as `zh-Hans.jpg`, while every other string on the frame —
sidebar, KPI tiles, funnel stages — was correctly English. The asset's own
`meta.yaml` carries `status: published`, i.e. cleared for public README and docs
use, and the repository README does render it.

Both files are replaced, captured from a booted app on seeded demo data at the id
route `/_console/apps/app.objectstack.hotcrm/dashboard/sales_dashboard`, in two
fresh browser contexts that differ in nothing but `navigator.language` (`en-US`
and `zh-CN`). Both measure 1408x964, matching the `viewport` the set already
declared, and both are real JPEG bytes, so the `.jpg` extension this set alone
uses stays truthful.

**The new pair carries identical y-axis labels, and that is the correct result.**
The card predicted the English axis would come back as `400K / 300K / …` against
a Simplified `40万 / 30万 / …`, generalising from the Executive Overview capture
in #1799. Measured here rather than inherited, that generalisation does not hold
for this chart: `monthly_revenue_trend` declares an explicit
`chartConfig.yAxis[0].format: '0,0'`, so it renders grouped digits
(`0 / 100,000 / 200,000 / 300,000 / 400,000`) in every UI language, while the
executive dashboard's `revenue_trend` declares no `chartConfig` at all and
therefore takes the locale-aware compact formatter. The same probe run against
that second chart returns `0/100K/200K/300K/400K` under `en-US` and
`0/10万/20万/30万/40万` under `zh-CN` — the control that proves the probe can see
`万` at all, which is what makes its absence here a property of this widget's
declared format rather than of the capture. `meta.yaml` now carries that chain,
so the next reader does not "restore" the Chinese axis onto an English asset.
