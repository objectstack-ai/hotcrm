---
'hotcrm': patch
---

Retranslates the Chinese dashboards pages against the corrected English page, and
extends the CI tile guard to cover them.

`content/docs/analytics/dashboards.mdx` was rewritten in #610 to describe the five
dashboards the app actually registers. The two locale copies were left behind and
still carried the whole of the original defect for every zh reader:

- "四个仪表盘 / 四個儀表板" — five are registered. `sales_activity_dashboard`
  (added in #592) had no section at all in either locale.
- Tiles that do not exist, in both files: `Slipping Deals`, `Cases Approaching SLA`,
  `Customer Satisfaction (CSAT)`, `Net New ARR`, `CSAT and NPS`, `Forecast vs Quota`,
  `Pipeline Coverage`, `Customer Acquisition Cost` and the rest of the invented
  lists — none of them a widget any dashboard ships, several of them not even a
  measure any dataset defines.
- A fabricated usage statistic: "*Cases Approaching SLA* 磁贴是此仪表盘上点击最多的
  小部件". The tile does not exist, and this repo collects no click telemetry, so
  the sentence was a confident quantitative claim measured by nothing. It is
  deleted, not softened.
- Trend claims ("过去 30 天，趋势", "与上周对比的趋势") that no tile makes — the
  renderer shows no period-over-period delta on any KPI tile.

Both pages are now a translation of the current English text: the five real
dashboards and their real widget titles, the real controls (no date picker on
Sales Activity or Customer Service, and why), and the shared-definition and
opt-out notes. Terminology follows the neighbouring zh analytics pages
(多维数据集 / 多維資料集, 磁贴 / 磁貼, 小部件 / 小工具); the zh-Hant page also drops the
mis-converted 磚貼 for 磁貼, the form the rest of the zh-Hant docs already use.

The guard is what keeps this from happening a third time:
`test/docs-drift.test.ts` now reads all three pages, not just the English one. Its
extraction was already locale-agnostic — the section headings carry each
dashboard's own English `label` and the bold tile names stay in English in every
locale — so both rules now bite per locale. A tile named in a zh page that no
dashboard ships fails the build, and registering a sixth dashboard fails until all
three pages document it.

Fixes #685. Follows #610.
