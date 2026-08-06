---
'hotcrm': patch
---

Name the dashboard and the report that the sales pipeline page's "Forecasting
roll-up" list actually points at.

`content/docs/sales/pipeline-management.mdx` told a sales manager the forecast
view is built from a **Sales Dashboard** and a **Pipeline Coverage** report
holding a *quarter × stage* matrix. Neither was findable as written. There is no
dashboard called *Sales Dashboard*: the identifier is `sales_dashboard`, but the
label it renders under — and the label on its Sales sidebar entry — is **Sales
Performance**. And the Pipeline Coverage report's matrix has neither of the axes
the page named: `pipeline_coverage_by_quarter` puts **forecast category** down
the rows and **close quarter** across the columns, with amount and deal count in
each cell; `stage` appears only in the runtime filter that drops closed deals, so
it is not an axis at all. A reader who took the page at its word was reading the
matrix transposed and against the wrong dimension.

Both lines now carry the real label plus the metadata identifier behind it, in
all three locales, and the report line is worded the same way as the entry on
the reports page so the two pages no longer contradict each other. The Pipeline
Coverage line also states the report's own label, **Pipeline Coverage by
Forecast × Quarter**, which is how the report library lists it — the sidebar
shows the shorter **Pipeline Coverage**.
