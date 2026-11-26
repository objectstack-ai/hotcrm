# Money, number and date formats

One convention for how HotCRM shows amounts, counts, percentages and dates, so the same
number reads the same way on a dashboard, a list and a record page (#2370).
Each rule names the metadata that carries it. The platform owns the rendering; this page
only says which declared key HotCRM sets, and which gaps were measured on platform 18.2.0
and left to the platform.

## The rules

| What | How it reads | Carried by |
| --- | --- | --- |
| An amount of money on a record or in a list | with the currency and its minor unit: `$86,400.00` | a `Field.currency()` field, no `currencyConfig` (the tenant currency) |
| An amount on a KPI tile, chart or dashboard table | with the currency, whole units: `$1,290,000` | the dataset measure's `format: '0,0'`; the currency comes from the tenant |
| An amount computed by a formula | as an amount of money | the formula's `returnType: 'currency'` |
| A count of units (a line's quantity) | a whole number: `4` | `Field.number({ scale: 0 })` |
| A percentage on a record | the percentage, at the field's `scale` | `Field.percent()` |
| A ratio on a dashboard | a whole percentage: `67%` | the measure's `format: '0%'` |
| A date that bounds a commitment (quote date, expiry, a price book's validity) | always with the year, never relative: `Nov 27, '26` | the field's `format: 'short'` |
| Any other date | the console default: the year shown when it is not this year | nothing |

## Currency: the tenant's, never written in metadata

Every amount in HotCRM is in the tenant's default currency: no field declares a
`currencyConfig`, and no measure declares a `currency`. Multi-currency is the platform's
(objectstack epic #8345, REQ-0009 *Disposition* D); `price_book.object.ts` states the same
rule for price books.

- The symbol is set once, by an administrator, in **Setup → Settings → Localization →
  Default currency**. The platform fills it when an organization is created, from the
  creator's language or region; when nothing can be derived it stays empty and every amount
  reads as a plain number (`1,290,000`). A dev server seeded on a host with no locale is in
  that state.
- With it set, the dashboards carry it with no metadata of ours: the analytics service puts
  the tenant currency on a measure over a currency field (measured on 18.2.0: Executive
  Overview's Total Revenue (YTD) read `$1,290,000` after the setting was saved, and `1,290,000`
  before).
- ⛔ No `$` in a `format` pattern, no `currency: 'USD'` on a measure, no `prefix` on a
  metric: each one pins a currency the tenant did not choose.

## Whole units on KPI tiles

A KPI is read at a glance, so it drops the cents. Dataset measures over an amount declare
`format: '0,0'` (`opportunity_metrics`, `forecast_metrics`, `product_metrics`, `account_metrics`).
An `object-metric` on a page has no measure, so it carries the same pattern itself; without it
the rep's custom home page showed `1,220,000.00` beside the dashboards' `1,220,000`. No page
carries one since #2740 deleted that page.

## Measured on 18.2.0 and left to the platform

These were measured while writing this page and are not worked around here (AGENTS.md,
*A bad platform default is fixed at the default*):

- A formula with `returnType: 'currency'` still renders as a bare grouped number (`24,000`
  beside `$6,000.00`) in the list, the related list and the record page. The key is declared
  anyway: it is the spec's statement that the value is money. *(Fixed by 18.5.0: measured on
  a project's Financials, Actual Cost reads `¥0.00` beside Planned Revenue's `¥120,000.00`.)*
- A `Field.percent()` draws a progress bar beside the percentage in a list and on a record
  page. No field or page key turns it off.
- A metric tile prints the measure's label (`Total Amount`) under its value, not the widget's
  `description`.

## Measured on 18.5.0 and left to the platform

Measured for hotcrm#2569 (a project's Financials, a timesheet's totals, Projects Overview,
billing milestones; zh-CN, tenant currency CNY). Not worked around here either:

- **A roll-up of an amount reads as a bare number.** Every `Field.summary` over a currency
  field (17 in `src/`: Approved Budget `78,000.00` beside Planned Revenue `¥120,000.00`, a
  timesheet's Total Cost, a billing milestone's Invoiced and Received) carries no currency.
  A summary may declare `currencyConfig`, but `currencyMode: 'dynamic'` is admitted only over
  a stored home amount (`homeAmount.field`, objectstack#33659): on a summary over a plain
  `Field.currency`, the tenant's currency, `objectstack validate` refuses it ("… is not a stored
  home amount, so its rows are not known to be in the home currency"). `fixed` would name a
  currency the tenant did not choose. Platform card: objectstack#35045.
- **A derived dataset measure has no currency.** A measure's `currency` takes only an ISO
  code, and the analytics service puts the tenant currency only on a measure over a currency
  field, so `actual_cost_sum` (derived from two sums of summaries) reads without the currency on
  Projects Overview. Platform card: objectstack#35046.
- **A formula cannot return a percentage.** `returnType` is `number`, `text`, `boolean`,
  `date` or `currency`, so Budget Used and Gross Margin % read `14.5`, not `14.5%`. Platform
  card: objectstack#35047.

