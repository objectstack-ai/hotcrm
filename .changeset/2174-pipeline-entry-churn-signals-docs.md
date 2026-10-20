---
"hotcrm": patch
---

**The Sales docs now send readers to the kanban board the way the app reaches it, and describe Customer Churn Signals by the panels it shows.** Nothing in the app changes; both corrections were measured in the running app first, in all three locales.

- **The kanban board.** The Pipeline Management and Opportunities pages told readers to open a **Pipeline** sidebar entry, which the app has not had since the sidebar was regrouped. The board is the **Sales Pipeline** tab on the list page that **Sales › Opportunities** opens. The pages, and the daily row of the recommended cadence, now say that.
- **Customer Churn Signals.** The Pipeline Management page described this report as "open cases + low NPS". The report reads no cases and no NPS. It shows four panels: **CSM-Flagged Accounts**, **At-Risk Accounts** (no activity in 60+ days), **Silent High-Value Accounts** (strategic and enterprise accounts quiet for 90+ days) and **Recently Lost Opportunities** (closed-lost in the last 30 days).
- The test that held the old daily-row wording in place now requires the real entry and tab, and checks that the board still has no sidebar entry of its own.
