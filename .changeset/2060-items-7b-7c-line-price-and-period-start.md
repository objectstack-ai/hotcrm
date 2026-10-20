---
"hotcrm": patch
---

**A quote line no longer asks for a Sales Price, and a mid-month forecast start gets one clear message.**

- **Quote line item.** Leave **Sales Price** blank and the line takes the product's **List Price**, which you can still change. Before, the New Quote Line Item form refused to save with "Please check the highlighted fields: Sales Price", although a quote line added any other way already got the list price. Opportunity line items have worked this way since the previous release, and the two now behave the same.
- **Forecast.** A **Period Start** that is not the first day of its period is still refused, and the message now names **Period Start** only. Before, a start such as 2026-10-15 also drew "Period End must be the last day of the period", even with **Period End** left blank, or when the end you typed was the month's real last day. Once **Period Start** is on the 1st (on a quarter boundary for a quarterly forecast), a **Period End** you type is checked as before.

Nothing else changes. A price you type is kept, and clearing a quote line's Sales Price is still refused; as on opportunity lines, that message names the field `unit_price` rather than "Sales Price". An import's dry-run preview no longer reports a blank Sales Price on a quote line as an error. The forecasting page now says that a start off its boundary is the only thing reported.
