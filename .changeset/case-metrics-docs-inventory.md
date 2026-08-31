---
'hotcrm': patch
---

Correct the `case_metrics` inventory in the analytics docs — it listed three
measures for a dataset that declares eight, in all three locales.

`src/datasets/case.dataset.ts` has grown twice since these pages were written:
the knowledge-deflection family (`closed_count`, `kb_resolved_count`,
`kb_deflection_rate`) and the SLA-compliance family (`sla_met_count`,
`sla_compliance_rate`), plus the `resolved_article` dimension. The docs still
enumerated the pre-deflection three, so a reader — or an agent reading the docs
first, which is this repo's stated use — was taught that `kb_deflection_rate`
and `sla_compliance_rate` do not exist.

Two claims were not merely incomplete but false, and both were load-bearing
negatives that other prose reasons from:

- The cubes page stated there is `no "SLA met %"` and that `case_metrics`
  declares none. `sla_compliance_rate` is exactly that, and the Service
  dashboard's SLA gauge plots it.
- The same page stated there is "one count measure, not three", and that no
  pre-filtered measure exists. There are four count measures, three of them
  pre-filtered (`closed_count`, `kb_resolved_count`, `sla_met_count`).

The reports page's `case_metrics` sentence exists to explain why five unshipped
reports "ask the semantic layer for something it does not carry", so a stale
inventory there made a published argument unverifiable rather than merely
out of date.

The other eight rows of the same dataset table were re-checked against
`src/datasets/` and are accurate as written; only the Case Metrics row had
drifted.
