---
'hotcrm': patch
---

Point the Activities page at the dashboard that actually reports activity volume.

`content/docs/sales/activities.mdx` (and its zh-Hans / zh-Hant siblings) promised
an **"Activities per rep this week"** widget on the **Sales Dashboard**. All three
parts of that sentence were wrong, so a reader following it found nothing:

- The sales dashboard (`sales_dashboard`, labelled **Sales Performance**) has no
  activity widget of any kind — every one of its fifteen widgets is bound to
  `opportunity_metrics` or `forecast_metrics`.
- Activity volume lives on a different dashboard entirely, **Sales Activity**
  (`sales_activity_dashboard`, shipped with #592), whose per-rep widget is called
  **Activity by Rep**.
- **Activity by Rep** is not windowed to a week. Sales Activity deliberately ships
  no date-range picker at all, and the week-by-week read is a separate chart,
  **Activity Volume by Week**.

The row now names the real dashboard and the real widget, and says what the widget
actually counts: logged interactions per owner — events that reached **Held**, so
the calls and meetings that really happened, *not* tasks. Completed tasks are a
separate number on the same dashboard, the **Tasks Completed** tile — a distinction
the old row hid behind the word "activities" on a page about tasks.
