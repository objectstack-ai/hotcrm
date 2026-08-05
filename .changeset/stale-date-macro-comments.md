---
---

No user-visible change: four source comments are corrected, nothing else. The
diff's non-comment content is empty, proved two ways (every changed diff line is
a `//` line; the comment-stripped emit of each file is byte-identical before and
after).

Four comments still asserted that "the list data path resolves no date macros".
That was measured on @objectstack 16.1.0 and expired at 17.0.0-rc.0, when
`resolveFilterTokens()` was wired into the ObjectQL **read** path (objectql
#3582) ahead of the middleware chain, covering `find` / `findOne` / `count` /
`aggregate` — saved-view filters included. `test/forecast-current-quarter-view.test.ts`
already pins both filter shapes against a real engine on the pinned
17.0.0-rc.2 (the `period_start` equality from #730, the `close_date` range from
#743), so the corrected comments cite that measurement instead of re-asserting
from prose:

- `src/dashboards/sales.dashboard.ts` — kept the analytics-path verification,
  replaced the asymmetry claim, and deleted the instruction it ended on ("Do not
  generalise from one path to the other"), which told the next author to
  preserve a distinction that no longer exists. Its dangling cross-reference to
  a since-rewritten comment in `src/views/forecast.view.ts` now points at what
  that view actually says.
- `src/data/revenue.seed.ts` — the claim that calendar-true `period_start`
  values make a `{this_quarter_start}` filter "match the seeded row" was wrong
  three ways: `{this_quarter_start}` was never in the token vocabulary (it is
  `{current_quarter_start}`, and the misspelling now throws `Unresolvable filter
  placeholder`), the filter was removed in #515 and only returned in #730, and
  per #702 these seeds deliberately ship no current-quarter row for it to match.
  Replaced with what those values are actually for; the `period_label` dialect
  point (#490) is untouched.
- `src/views/opportunity.view.ts` (`stale_opportunities`) — the comment gave two
  independent reasons for not expressing the 14-day cut. The date-macro half has
  expired; the other half has **not** (`days_in_stage` is a formula field
  evaluated after the query, so the data engine can neither filter nor sort on
  it) and is kept. The rewrite states explicitly that correcting the comment
  decides nothing about the filter — expressing the cut as
  `stage_entry_date <= {14_days_ago}` is a behaviour change, filed separately.
  The file had been self-contradictory since #743 added working date-macro
  bounds fifteen lines below.
- `src/views/knowledge_article.view.ts` (`stale_articles`) — the cross-referenced
  "same trap", resting on the same expired premise, corrected in the same pass.

Fixes #744.
