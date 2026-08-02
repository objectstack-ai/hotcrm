---
'hotcrm': patch
---

Fix the Sales dashboard's **Quota Attainment by Rep** table, which showed every
rep a quota several times larger than their real one. `crm_forecast` stores one
snapshot per owner **per period** — a current quarter, a current month and every
settled period before them — and the table aggregated all of them at once, so it
added a quarter's quota to a month's quota to last quarter's quota and labelled
the total "Quota". On the shipped seed data a rep with a real 1,500,000 quarterly
quota was shown 7,940,000, and attainment read 90% where the truth was 55%.

The table is now pinned to the current quarter
(`period` = `quarter` **and** `period_start` = the current quarter's first day),
so Quota, Closed and Attainment are the numbers for the quarter in progress. Both
halves of that key are needed: the period type alone still sums every quarter
ever snapshotted, and the start date alone still merges the quarter row with the
month row that opens the same quarter. Its description now says "current-quarter"
in all four locales, and the Forecasting guide spells out the rule for anyone
building their own roll-up.

For the few hours between a quarter boundary and the 03:00 snapshot sweep that
opens the new quarter's row, the table is empty rather than showing the previous
quarter's attainment under a header that says this one.

A new guard (`test/forecast-period-scope.test.ts`) fails the build for any widget
or report that aggregates `forecast_metrics` without either grouping by period or
filtering to a single one, and runs the shipped widget through the real analytics
path to check the number it produces. Fixes #614.
