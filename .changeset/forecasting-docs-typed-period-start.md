---
'hotcrm': patch
---

Stop the forecasting page promising that a period boundary is "always computed,
never typed" — a `period_start` you supply is kept exactly as you sent it.

`content/docs/sales/forecasting.mdx` taught both halves of the derivation in two
consecutive sentences: "Supply a `period_start` to snapshot a specific quarter or
month", then "Because the boundary is always computed, never typed, every
snapshot for the same quarter lines up exactly". Read together, those promise
that whatever `period_start` you send gets snapped onto the calendar boundary.
`forecast_derive_period` does no such thing — it fills blanks and never rewrites
a value that arrived with the record:

```
{ period: 'quarter' }                             → period_start 2026-07-01  (computed)
{ period: 'quarter', period_start: '2026-07-15' } → period_start 2026-07-15  (kept as sent)
                                                    period_label 'Q3 2026'
```

So a hand-written mid-quarter date is stored mid-quarter, labelled **Q3 2026**,
and then missed by every surface that pins `period_start` to the quarter's real
first day — the forecast list's *This Quarter* tab and the Sales dashboard's
*Quota Attainment by Rep* table both do.

The page now says what the hook does: the derivation lives in one place so the
snapshots that leave `period_start` blank all line up (which is what every
automated writer does — the nightly sweep sends `period` and nothing else), and
a supplied value is stored verbatim, with the advice to send the period's first
day or send nothing at all. Same edit on all three locale pages (`.mdx`,
`.zh-Hans.mdx`, `.zh-Hant.mdx`).

Documentation only — no metadata, hook or view behaviour changes. Both halves of
the boundary contract are now pinned in `test/hooks-runtime-service.test.ts`, so
the prose goes red with the handler if that behaviour is ever changed. Fixes #748.
