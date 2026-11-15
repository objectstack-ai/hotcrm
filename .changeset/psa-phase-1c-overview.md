---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Project Delivery overview and manual (#2316, phase 1c).** The Project Delivery app now has a **Projects Overview** dashboard under Projects: budget, actual cost, budget used, margin by project, projects by budget status and by status, approved hours by week, and each person's billable share. The money tiles count the projects that are spending (Active, On Hold, Completed) and approved cost only; the hours tiles count approved timesheets only. Budget Used is the portfolio's total cost over its total budget, so a large project weighs more than a small one. The dashboard has no date picker, because a running project would fall out of its own figures. It counts what the viewer can read: a project manager sees the projects they manage, while finance, project directors and the PMO see every project. Someone staffed only as a team member cannot read project cost, so the entry is left out of their sidebar. Two datasets back it, `project_financials` (one row per project) and `time_utilization` (one row per timesheet, by the week it starts), and timesheets gain a **Billable Hours** total beside Total Hours. A **Project Delivery Manual** under Help explains the rules the screens do not show: staffing, how an hour is costed, who approves what, budget status and the lock, and what the dashboard counts. It is in en and zh-CN, the dashboards and cubes pages in the docs cover the new dashboard and datasets in en, zh-Hans and zh-Hant, and labels are in en, zh-CN, ja-JP and es-ES. Nothing changes on the executive dashboard.
