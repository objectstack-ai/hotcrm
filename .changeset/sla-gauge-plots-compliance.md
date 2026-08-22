---
'hotcrm': patch
---

Make the service dashboard's SLA gauge plot compliance, the quantity its title,
its description, its success colouring and its 0.95 target line all name.

It plotted `avg_sla_violated` — the complement — and asked the renderer to flip
it back with `options: { invert: true }`. On the seeded demo org, whose 8 closed
cases are all within SLA, the gauge read:

```
SLA 达成率
本期 SLA 内解决工单的占比
0.0%
SLA Violation Rate      ← the measure's own label, printed under the number
```

beside violation rates of 40–70% elsewhere on the same page. On an org with real
misses it would have read the other way round: SLA breaches climbing toward 95%
would have rendered green and "on target".

`invert` was never a declared key. `DashboardWidgetOptionsSchema` ends in
`.passthrough()` ("declared query keys + open renderer extras"), so the flag
parsed, validated, linted and shipped while doing nothing, and no gate in this
repo or upstream could say so. The fix is therefore a measure that *means*
compliance rather than a renderer flag, and the key is removed rather than left
pretending to work:

- `case_metrics` gains `sla_met_count` (closed cases with `is_sla_violated:
  false`) and `sla_compliance_rate`, a derived `ratio` of it over the existing
  `closed_count`. A ratio of two counts rather than `1 - avg_sla_violated`
  because `DerivedMeasureOp` operands are measure names only — there is no
  literal `1` to subtract from — which makes this the spec's sanctioned
  spelling, the same one `kb_deflection_rate` already uses.
- The gauge binds to `sla_compliance_rate`. Its threshold ladder and target line
  are unchanged: they were always written for compliance, and it was the plotted
  value that disagreed with them.

The measure's own label renders directly under the number, so it now reads `SLA
Compliance Rate` instead of contradicting the title above it. Widget titles and
descriptions were already correct in all four locales and are untouched.

`test/sla-compliance-gauge.test.ts` runs the shipped measures and the shipped
widget binding through the real analytics executor on both drivers this app runs
on — over controlled rows, and over the actual seeded case records, where the
gauge now reads 100%. Refs #1213.
