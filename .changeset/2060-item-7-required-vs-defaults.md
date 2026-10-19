---
"hotcrm": patch
---

**Three New forms no longer make you type a value the app fills in for you.**

- **Opportunity line item.** Leave **Sales Price** blank and the line takes the product's **List Price**, which you can still change. Before, the form refused to save with "Please check the highlighted fields: Sales Price", although the app has always defaulted a blank price to the list price for lines added any other way.
- **Quote.** Leave **Expiration Date** blank and the quote expires 30 days after its **Quote Date**. The form now says "Set automatically when saved." under the field, as it already did for **Quote Date**. Before, the form refused to save until you picked a date.
- **Forecast.** Leave **Period End** blank and it is filled in from **Period** and **Period Start**. Leave **Snapshot Date** blank and it is today, with the same "Set automatically when saved." note. Before, the form refused to save until you filled both in. **Period Start** is still asked for.

Nothing else changes. A date or price you enter yourself is kept, and the existing rules still apply to it. Saving a quote or forecast with its Expiration Date or Snapshot Date cleared is still refused. Clearing a line's Sales Price is still refused too, but the message now names the field `unit_price` rather than "Sales Price". A quote imported without an expiration date, or a forecast imported without a snapshot date, now gets the same default even when the import runs with automations turned off.
