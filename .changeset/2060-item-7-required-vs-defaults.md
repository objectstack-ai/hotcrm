---
"hotcrm": patch
---

**Three New forms no longer make you type a value the app fills in for you.**

- **Opportunity line item.** Leave **Sales Price** blank and the line takes the product's **List Price**, which you can still change. Before, the form refused to save with "Please check the highlighted fields: Sales Price", although the app already defaulted a blank price to the list price for lines added any other way.
- **Quote.** Leave **Expiration Date** blank and the quote expires 30 days after its **Quote Date**. The form now says "Set automatically when saved." under the field, as it already did for **Quote Date**. Before, the form refused to save until you picked a date.
- **Forecast.** Leave **Period End** blank and it is filled in from **Period** and **Period Start**. Leave **Snapshot Date** blank and it is today, with the same "Set automatically when saved." note. Before, the form refused to save until you filled both in. **Period Start** is still asked for.

Nothing else changes. A date or price you enter yourself is kept, and the existing rules still apply to it. Saving a quote or forecast with its Expiration Date or Snapshot Date cleared is still refused. Clearing a line's Sales Price is still refused too, but the message now names the field `unit_price` rather than "Sales Price". An import's dry-run preview no longer reports a blank Sales Price, Expiration Date, Period End or Snapshot Date as an error, so the preview agrees with the import itself, which already filled them in.

The documentation now says so too: the quotes page lists the 30-day default, the forecasting page says a blank snapshot date is today, and the automation page says these two defaults are declared on their fields rather than computed by a hook.
