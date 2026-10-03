---
'hotcrm': patch
---

Quote pricing and the nightly forecast snapshot now compute their amounts with CEL, the
expression language the platform declares for flow values, instead of the older `{…}`
template form. Nothing you see changes: a quote prices exactly as before (whole cents,
and a cleared discount still means no discount), and the forecast's pipeline, best case,
commit and closed-won totals are the same sums. An opportunity with no amount still
counts as 0, and an amount with cents keeps its cents. `objectstack validate --strict`
no longer reports these six expressions.
