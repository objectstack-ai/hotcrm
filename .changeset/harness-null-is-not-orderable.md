---
'hotcrm': patch
---

The shared flow harness no longer orders NULL by string coercion, so a range
filter selects the rows a driver selects.

`test/helpers/flow-harness.ts` routed all four ordering operators through
`compare()`, whose fallback is `String(a) < String(b)`. `String(null)` is
`"null"`, so `compare(null, 0)` compared `"null"` against `"0"` — and
lexicographically `"n" > "0"`. The answer was not merely wrong, it was
**asymmetric**: the same null row was ADMITTED by `$gt` / `$gte` and REJECTED
by `$lt` / `$lte`. `"null"` sorts above any `2xxx` date string too, so a date
window was wrong the same way, and which half a sweep got wrong depended only
on the direction its window happened to be written in. A symmetric bug gets
noticed because everything shifts; this one stayed invisible.

**Measured over BOTH shipped drivers**, not reasoned from SQL. Three `crm_case`
rows through real `ObjectQL` on ObjectStack 17.2.0 — one valued, one with the
key omitted, one with the key written as an explicit `null` — under all four
operators. `SqliteWasmDriver` and `InMemoryDriver` returned the identical
selection every time: neither the null row nor the absent-key row is selected
by any of the four, in either direction. The two spellings are not
distinguishable here either — sqlite materialises the omitted key to `null`,
the memory driver leaves it sparse, and the four operators answer the same on
both shapes. So an unorderable value now satisfies none of the four, and an
unorderable operand never reaches the comparison at all (`compare(5, null)` was
`"5" < "null"`, which made `{ $lt: null }` select a row both drivers exclude).

This is what the repo's own flow authors had already written down —
`knowledge_article.view.ts` states that "`$lt` matches neither null nor an
absent key", and `opportunity-stagnation.flow.ts` relies on it to keep
unstamped rows out of a stagnation sweep. The harness was the one place that
disagreed with them.

**No shipped flow changed, and no assertion was weakened.** All 19 suites that
import the harness are green before and after — 350 tests, 0 failures either
way. That is not evidence the rule was already covered. Instrumented across
those 19 suites the new guard fires 9 times, and every one of the 9 is `$lt` or
`$lte` — the direction the string comparison happened to get right. The
over-admitting half, `$gt` / `$gte` silently keeping a row a driver drops, was
exercised by nothing at all, which is exactly why nothing went red. Six new
cases in `test/flow-harness-declared-columns.test.ts` cover it now; all six
fail against the previous harness.

`$eq` / `$ne` / `$in` / `$nin` are untouched: they are equality-shaped, the
store models `IS NULL` rather than SQL's unknown, and a sentinel pins that they
still behave. The `store`-stays-live contract preserved by #1490 is untouched
and still pinned.
