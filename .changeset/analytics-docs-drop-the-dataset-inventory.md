---
'hotcrm': patch
---

Retire the cubes/dataset inventory from `content/docs/analytics`, in all three
locales, and rewrite the pages around it as a business-concept introduction.

`analytics/cubes` carried a nine-row table transcribing every dataset's
dimensions and measures, and `analytics/reports` repeated the same roster in
prose. Neither had a producer: `src/datasets/` declares those names, nothing
compares the pages against it, and this neighbourhood has paid for that four
times (#610, #965, #977, #1228 — the last one turned two load-bearing negative
sentences into falsehoods about a measure the dashboards were already plotting).
The single source of truth is the self-describing metadata, so the pages now
point at it and say why, rather than carrying a second copy that is correct only
on the day it is typed.

What the pages keep is the analysis. `analytics/reports` used its `case_metrics`
inventory as an argument — five unshipped reports "cannot be built" — so each of
those arguments was rewritten to rest on the one specific fact that actually
carries it (no owner dimension, no join to `crm_account`, no measure over
`customer_rating`, nothing recording a reopen) instead of on the completeness of
a transcribed list. The same rewrite runs through the sales, service and
marketing sections of `analytics/cubes`: what the layer answers, and where it
stops, stated as business questions. The shipped report and dashboard rosters are
untouched — those are things a user can see in the product, which is the line
that separates a documentable navigation fact from a hand-copied semantic layer.

No guard is added and no test changes. With the inventory gone there is no drift
left to pin, and gate-type mechanisms belong to the platform rather than to this
repo. The three existing wording pins (analytics vocabulary, dashboard tiles,
conversion-rate spelling) are unchanged and still green.
