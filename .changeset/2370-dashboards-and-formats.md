---
"hotcrm": minor
---

**Dashboards say what they count, and amounts, quantities and dates read one way (#2370).**

- The two SLA tiles on Customer Service state their base. **Open Cases Past SLA** counts open cases only, so a case closed late leaves the count when it closes. **SLA Met (Closed Cases)** is the rate over closed cases. The SLA report is now **SLA on Closed Cases**.
- **Revenue Trend** appears once, on Executive Overview. CRM Overview and Sales Performance no longer repeat it.
- The CRM Overview tile that summed catalog list prices is now **List Price by Category**, with a description saying it is not sales.
- **Opportunity Funnel by Owner** is split by owner: one row per rep, one column per stage, a Total per rep, and a bar chart of amount by rep.
- **Quota Attainment by Rep** says when it fills: after the nightly forecast snapshot opens the quarter and a manager sets each quota.
- Each report's sidebar entry carries the report's own title, in every language the app ships.
- Sales Home's amount KPIs read in whole units, like the dashboards. Line item quantities are whole numbers, and a fractional quantity is refused. Quote dates and price book validity show the year and are never relative. A quote line's related list shows the discount instead of a second subtotal.

The currency symbol on every amount comes from **Setup → Settings → Localization → Default currency**. See `docs/developers/number-formats.md`.
