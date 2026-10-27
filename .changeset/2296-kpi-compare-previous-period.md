---
"hotcrm": minor
---

**Seven KPI tiles now say whether the number went up or down (#2296).** On CRM Overview, Total Revenue, Deals Won and Avg Deal Size (Selected Period); on Sales Performance, Open Pipeline (Selected Period); on Customer Service, Open Cases, Avg Resolution Time and SLA Violations. Each tile shows the change against the window just before the one the date picker selects ("16% vs previous period"), computed by the platform from the data rather than typed into the dashboard. When the reader picks All time there is nothing to compare with, and the tile shows its number alone. A tile whose previous window has no records shows a dash instead of a percentage.

The tiles pinned to their own year-to-date or quarter-to-date window (Total Revenue (YTD), Closed Won (QTD), Avg Deal Size (QTD)) and the tiles on dashboards with no date picker (Sales Activity, Sales Home) still show the number alone.
