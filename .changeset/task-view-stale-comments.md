---
---

No user-visible change: two source comments in `src/views/task.view.ts` are
corrected, nothing else. The diff's non-comment content is empty, proved two
ways (every changed diff line is a `//` line; the comment-stripped emit of the
file is byte-identical before and after).

Same defect class as #744 / PR #773 — the fifth file, missed by that pass. Both
comments rested on the pre-17.0 premise that the list data path interpolates no
templates, and they contradicted each other about it fifteen lines apart:
`todays_tasks` said `{current_user_id}` does not interpolate, `overdue_tasks`
said only `{current_user_id}` does. `resolveFilterTokens()` was wired into the
ObjectQL read path at 17.0.0-rc.0 (objectql #3582) ahead of the middleware
chain, covering `find` / `findOne` / `count` / `aggregate` — saved-view filters
included — so both readings are stale.

Corrections are anchored to measurements on the pinned 17.0.0-rc.2, not to
replacement prose:

- `todays_tasks` — the retired reason is replaced by what a real engine does.
  `{current_user_id}` resolves (#784's two-probe split: `{current_org_id}`
  returned 0 rows, so the filter is not dropped; `{current_user_id}` returned
  every seeded task, so it is not a literal compare). `{TODAY()}` was never in
  the vocabulary — the canonical spelling is `{today}` — and, measured here, it
  is not rejected either: the placeholder grammar admits only word characters,
  so `classifyFilterToken('{TODAY()}')` returns null and the string reaches the
  driver verbatim. Over a four-row fixture, `due_date < '{today}'` selected the
  two past-due rows, `{TODAY}` threw `UnknownFilterTokenError`, and `{TODAY()}`
  matched all four including one due next week. The comment's separate claim
  that the sort "puts urgent at top" is corrected too: the shipped sort is
  `due_date`-major and `priority_rank` only breaks ties within a due date.
- `overdue_tasks` — the two reasons are split. The `is_overdue` half still
  holds (`task.hook.ts:68` stamps it in `beforeSave`, and nothing re-stamps it),
  and is kept; the date-macro half is retired, along with the follow-up it
  implied that an hourly re-stamping flow is the only route to a truly-overdue
  gauge.

Both rewrites state explicitly that correcting a comment decides nothing about
the filter: giving either view a `{today}` bound, an owner condition, or a
different label is a behaviour change on #770's line for the task views.

Fixes #782.
