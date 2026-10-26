---
"hotcrm": patch
---

**KPI tiles now say which period they count.** The same figure used to carry different numbers on different pages with nothing on the tile to explain why: Sales Home counts every record, CRM Overview and Sales Performance follow the dashboard's date picker (this quarter by default), and some tiles are pinned to a fixed window. Each KPI title now names its window, and the same measure over the same window has the same title everywhere. No number changes.

- **Sales Home:** Revenue (Won), Deals Won and Pipeline Value are now **Total Revenue (All Time)**, **Deals Won (All Time)** and **Open Pipeline (All Time)**.
- **CRM Overview:** Total Revenue, Active Deals, Won Deals and Avg Deal Size are now **Total Revenue (Selected Period)**, **Open Deals (Selected Period)**, **Deals Won (Selected Period)** and **Avg Deal Size (Selected Period)**.
- **Sales Performance:** Total Pipeline and Open Opportunities are now **Open Pipeline (Selected Period)** and **Open Deals (Selected Period)**; its Avg Deal Size, which was always pinned to this quarter, is now **Avg Deal Size (QTD)**.
- **Executive Overview** is unchanged: Total Revenue (YTD) already named its window.

The Chinese, Spanish and Japanese labels move with them, and the Dashboards, Quick Tour, Activities and Pipeline Management docs are updated in all three languages (#2291).
