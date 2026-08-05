---
'hotcrm': patch
---

Retranslates the Chinese forecasting pages against the current English page, and
adds a CI guard so a translation can no longer silently drop a callout.

`content/docs/sales/forecasting.zh-Hans.mdx` / `.zh-Hant.mdx` carried drift that
predates #627 — it survived both #735 and #742, which only touched the paragraphs
those issues were about. Three of the divergences were wrong rather than merely
stale, and every zh reader got the wrong model of how a forecast is built:

- **The buckets were described backwards.** Both pages called pipeline / best case
  / commit "相互独立的桶 / 相互獨立的桶" — mutually independent buckets answering
  different questions. They are **nested**: `forecast-snapshot.flow.ts` sums
  best case as `forecast_category` in `['best_case', 'commit']` and commit as
  `forecast_category = 'commit'`, both inside the open-pipeline set, and
  `forecast.object.ts` states the ladder outright ("the buckets are CUMULATIVE —
  each is a subset of the one above it"). A reader who added the three numbers
  together — the natural thing to do with independent buckets — double- and
  triple-counted the same deals.
- **The retired probability threshold was still there.** "承诺（按惯例 ≥ 80% 概率）
  / 承諾（按慣例 ≥ 80% 機率）" names a boundary no writer applies. #590 removed
  exactly this shape from the field descriptions ("Was 'probability >= 60%', which
  named a threshold no writer applied and which disagreed with the stage →
  forecast_category map that actually classifies deals") and the English page has
  not carried it since. The stored `forecast_category` column, derived from
  `stage`, is the single boundary — the same one the *Closing This Quarter* view
  and the *Pipeline by Forecast Category* chart use. The claim is deleted, not
  softened.
- **The #614 warning box was missing entirely.** "Always scope a roll-up to one
  period" — the trap where a chart adds a quarter's quota to a month's to last
  quarter's, the defect that shipped on `quota_attainment_by_rep` — had no
  counterpart in either locale.

Two smaller corrections came out of the same pass: the field table said
`period_start` is something you supply (all three period fields are derived), and
the derivation section had lost both the "leave `period_start` out and the
snapshot lands on the calendar period containing its snapshot date" case and the
paragraph on why a computed boundary is what makes "this quarter" filters work.
The paragraph explaining that Forecast Category follows Stage automatically was
absent too.

Terminology follows the table #735 aligned (配额 / 達成率（%）/ 覆蓋倍數 /
数据集 vs 資料集 / 快照), and the app's own zh labels for the bucket vocabulary
(预测类别 / 預測類別, 最佳情况 / 最佳情況, 承诺 / 承諾). #742's AI-source paragraph
and Source annotation are preserved word for word — they were measured against the
runtime and are not part of this drift.

The guard is the part that keeps the third divergence from recurring anywhere in
the docs: `test/docs-drift.test.ts` now requires every translated page to carry
the same number of callouts as its English page. A `> …` box is where a page puts
the trap someone already fell into, so a translation that drops one drops the
warning. The rule counts blockquote **blocks**, not `> ` lines — CJK text wraps at
different widths, and a line-based count reports six other pages as drifted while
they have every box. Measured across the tree: 2 mismatches before this change,
both of them these two pages, and 0 after.

Fixes #736. Follows #627 / #735 / #742, and mirrors #685 for the dashboards pages.
