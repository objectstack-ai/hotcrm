---
'hotcrm': patch
---

Cases you create now count in "Cases Opened by Priority × Day" and in the Customer Service dashboard's date range

A case created in the app or through the REST API never showed up in the
**Cases Opened by Priority × Day** report or inside the **Customer Service**
dashboard's date range. Both read the case's **Created Date** field, and nothing
filled that field in on a real case: only the demo data set it. So a new case
stored no Created Date, the report left it out, and the dashboard range skipped
it. Managers saw the 38 demo cases and none of their own.

**FROM → TO.** Cases now use one creation timestamp, the platform's own
`created_at`, which is recorded on every case however it is raised. This is the
same change opportunities got earlier (#575).

- `crm_case.created_date` is removed. Read `created_at` instead, the field every
  object already carries. An integration that read `created_date` through the
  API should switch to `created_at`.
- The `case_metrics` dataset's day dimension is now `created_at` (label
  **Created**, still bucketed by day). It was `created_date`. A saved query or
  widget that grouped by `created_date` should group by `created_at`.
- **Cases Opened by Priority × Day** buckets on `created_at` and no longer
  filters anything out. The Customer Service dashboard's date range and its
  **Daily Case Volume** chart use `created_at`. So does the **Case Timeline**
  view, whose bars now start on the day each case was created. Before, a case
  created in the app had no start date there.
- **Resolution Time (Hours)** is measured from `created_at` to **Closed Date**.
- The **SLA & Priority** group on a case has six fields instead of seven.
  **Created Date** is no longer one of them, and the four language packs no
  longer translate it.

The demo data keeps its history. The seeded cases now set `created_at` to the
day each one was opened. Since `@objectstack/*` 17.7.0 the platform keeps that
value when a fresh database is seeded, so the report and the dashboard spread
the demo cases over their own days, not the day you ran the demo.
