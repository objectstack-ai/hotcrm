---
'hotcrm': patch
---

The forecasting guide now documents the attainment field that ships, and stops
contradicting where a current-quarter snapshot comes from.

`content/docs/sales/forecasting.mdx` told admins that attainment "is computed in
the report layer; no dedicated field". `crm_forecast.attainment_pct` has been a
formula field on every snapshot — `closed_amount ÷ quota × 100`, guarded so a
zero or missing quota reads `0.00` instead of erroring — and it is a column on
all three forecast list views and a field on the record form. `coverage_ratio`
sits beside it with the same shape. An admin
following the old bullet rebuilt in a report something the object already
computed per row, and was never told about the zero-quota guard.

The rewritten bullet also states why the per-row field and the dashboard number
are deliberately different: `attainment_pct` is per row on a 0–100 scale, while
the `forecast_metrics` dataset's **Attainment** measure is `closed ÷ quota` as a
0–1 ratio that sums both sides first, so a group of reps is weighted by the
quota each carries rather than averaging per-row percentages. They also part
ways on a missing quota — the field reads `0.00`, the ratio measure returns no
value at all.

Same-page corrections made while that bullet was being rewritten, all of them
statements #702 left stale:

- **Where the current quarter comes from.** The seeds ship settled quarters and
  the current month only; the nightly sweep is the sole automated writer of a
  current-quarter row.
- **When rows appear.** On a freshly seeded org there are no current-quarter
  rows until the 03:00 sweep has run once, so *Quota Attainment by Rep* is
  legitimately empty until then — stated on the roll-up bullet as well.
- **Who writes quota.** Nothing does. Quota is the hand-maintained denominator
  of attainment and stays blank on every row the sweep opens.
- The FAQ "Can a forecast roll up from opportunities automatically?" answered as
  though you had to build that flow yourself. The **Forecast Snapshot** flow has
  shipped since #590 and re-sums the four amount columns nightly; quota is the
  exception, and stored amounts are still never recomputed on read.

Both Chinese translations carry the same corrections. Documentation only — no
metadata, flow or dataset changed.

Fixes #627.
