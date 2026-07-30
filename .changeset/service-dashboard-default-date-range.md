---
'hotcrm': patch
---

Fix the Customer Service dashboard rendering all zeros.

`service_dashboard` opened with every KPI at 0 and every chart reporting no rows,
with 38 cases in the system. The reported cause — a `last_30_days` default that
was narrower than the seeded case history — is not what was happening.

`crm_case.created_date` is a `Field.datetime()`, and on the SQLite path
`driver-sql` 16.1.0 coerces datetime filter values to epoch-millisecond INTEGERs
(`coerceFilterValue`), on the documented assumption that datetime columns are
stored as INTEGER ms. They are not: every datetime in the demo database is ISO
TEXT, including the platform's own `created_at` / `updated_at` audit columns.
SQLite orders every INTEGER before every TEXT, so on a datetime column
`col >= <int>` is true for every row and `col <= <int>` is true for none. The
runtime ANDs the dashboard range into every widget query, so the `$lte` half
zeroed the entire dashboard — at any preset. Measured against the running 16.1.0
console: `$gte` alone returns all 38 cases, `$lte` alone returns 0, both bounds
return 0, in every date format tried.

The `dateRange` block is therefore removed rather than widened. The dashboard now
renders real data (30 open / 7 critical / 45.0h average resolution / 3 SLA
breaches, all charts populated). The cost is visible and intentional: this
dashboard has no date picker until datetime filtering is fixed upstream, and the
commented-out block plus a CI guard mark the spot.

The CRM, Sales and Executive dashboards are untouched — they window `close_date`,
a `Field.date()`, which compares as TEXT on both sides and works. That, not the
preset, is why Service was the outlier.

Also documents that the `daily_case_volume` widget's `$gte: '{30_days_ago}'`
floor is inert for the same reason, so the chart currently plots every case.

A guard in `metadata-references.test.ts` now fails if any dashboard windows a
`datetime` field, and checks the range field exists on the objects its widgets
aggregate.
