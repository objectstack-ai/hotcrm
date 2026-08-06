---
'hotcrm': patch
---

The two analytics pages that still said 「轉換率」 in Traditional Chinese now say
「轉化率」, matching their Simplified twins line for line.

`#844` swept the lead **convert** verb to 转化 / 轉化 across every Chinese page,
but its "not part of this issue" list excluded the analytics **conversion rate**
phrase on the grounds that it is a metric name rather than the convert verb. On
the baseline that reason does not hold:

- **No Simplified page anywhere says 转换率.** The Simplified twins of both
  lines already read 转化率 — `content/docs/analytics/cubes.zh-Hans.mdx:124` and
  `content/docs/analytics/reports.zh-Hans.mdx:32` — so the exclusion did not
  protect a metric spelling, it just left the Traditional side behind.
- **Conversion rate has no label surface to be a metric name against.** The
  phrase appears nowhere under `src/`; it is prose each page translates for
  itself, so there is no locale-pack entry giving it a word contract independent
  of the convert verb. The nearest anchors the pack does provide both follow
  转化: `crm_forecast.num_converted_leads.label` is 「已转化线索数」 and the
  dashboard's `open_leads.title` is 「未转化线索」
  (`src/translations/zh-CN.ts`).
- **The exclusion left each page contradicting itself.**
  `content/docs/analytics/cubes.zh-Hant.mdx` said 「轉化數量」 at `:108` and
  「轉換率」 sixteen lines later; `content/docs/analytics/reports.zh-Hant.mdx`
  said 「轉換率」 in one table row at `:32` and 「轉化」 in another at `:59` —
  both halves fixed by #844 — which is exactly the half-right page #801 objected
  to.

`test/docs-conversion-rate-spelling.test.ts` keeps it from drifting back. No
locale-pack key exists for the phrase, so the check lives where the claim does —
it sweeps every Chinese page for the rejected spelling and, separately, asserts
the two pages still state the metric, so deleting the sentence fails as loudly as
mis-spelling it.

Two lines changed, both Traditional. State-transition 转换 / 轉換, data-type
coercion and contract activation keep their spelling everywhere — they are a
different word that happens to share the old convert translation, and #844's
reading of that boundary is unchanged. English and Simplified pages were already
right, and nothing under `src/` changed.

Fixes #905.
