---
'hotcrm': patch
---

`crm_forecast.period_start` now states its calendar-boundary constraint on the
field itself, in the record form's Snapshot section, instead of only surfacing
it when a bad write is refused.

#1081 (#1008) made a hand-filled `period_start` off a calendar-period boundary
a rejected write, enforced by two rules that are unchanged by this PR:

- `period_start_first_of_period` — "Period Start must be the first day of the
  period — e.g. 2026-08-01 for Aug 2026."
- `quarter_starts_on_quarter_boundary` — "A quarterly forecast must start on a
  quarter boundary — January 1, April 1, July 1 or October 1."

`period_start` now carries a `description` echoing those same two messages, and
a matching `help` entry lands in all four locale packs (`en`, `zh-CN`, `es-ES`,
`ja-JP`), which is what `test/i18n-references.test.ts` requires for any field
that carries a `description`.

`period_end` is also editable on the Snapshot section (measured — it is not
readonly, and `forecast.hook.ts` only derives it when a write leaves it unset),
so it gets its own `description` + four-locale `help` too — but for the rule
actually bound to it, `period_end_after_start` ("Period End must be after
Period Start."), not `period_start`'s calendar-boundary rules, which do not
apply to it.

No validation rule changed.
