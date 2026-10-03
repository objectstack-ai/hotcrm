---
'hotcrm': patch
---

**Currency fields no longer declare `scale`.** ObjectStack's next release refuses `scale` on a
`currency` field: a currency amount's decimal places come from its currency's ISO 4217 minor unit
(2 for USD), not from a field setting. The refusal has no automatic conversion, so an app that
keeps the key cannot load on that release. `scale` is removed from all 23 money fields: account
revenue and purchasing budget, campaign costs and revenue, contract value, forecast amounts, lead
amounts, opportunity amount and expected revenue, product price and cost, and the quote totals.
`scale` on number, percent, formula and roll-up fields is unchanged.

What changes at the current ObjectStack 17.4.0:

- **Totals show whole units for a while.** List-view summary footers on money columns (for example
  the **Amount** total under **Open Deals**) and the **Revenue (Won)** and **Pipeline
  Value** tiles on **Sales Home** read the field's `scale` for their decimals. They show
  `2,017,500` instead of `2,017,500.00` until the console takes decimals from the currency. That
  console fix ships with ObjectStack's next release. Record cells are unaffected: they
  already use the currency's own decimals.
- **More-precise money writes are accepted.** A money value with more than 2 decimals used to be
  rejected with "must have at most 2 decimal places". It is now accepted as written, which is the
  platform's rule for currency fields from the next release on. The **Generate Quote** flow still
  rounds its discount and total to whole cents, so quote amounts are unchanged.
