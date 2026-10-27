---
"hotcrm": minor
---

**Ten KPI tiles now say whether the number went up or down (#2296).** The comparison is computed by the platform from the data, not typed into the dashboard.

- Tiles that follow the date picker compare with the window just before the one the picker selects ("16% vs previous period"): on CRM Overview, Total Revenue, Deals Won and Avg Deal Size (Selected Period); on Sales Performance, Open Pipeline (Selected Period); on Customer Service, Open Cases, Avg Resolution Time and SLA Violations. When the reader picks All time there is nothing to compare with, and the tile shows its number alone.
- Tiles with their own calendar window compare with the same span last year ("vs last year"): Total Revenue (YTD) on Executive Overview, Closed Won (QTD) and Avg Deal Size (QTD) on Sales Performance. Their windows now end today, which is what year-to-date and quarter-to-date always meant.

A tile whose comparison window has no records shows a dash instead of a percentage. The tiles on Sales Activity and Sales Home have no date window, so they still show the number alone.
