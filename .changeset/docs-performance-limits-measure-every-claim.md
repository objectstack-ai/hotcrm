---
'hotcrm': patch
---

Measure every claim on the Performance & Limits reference page against the app
and the installed platform, in all three locales. The page carried roughly sixty
quota figures, an archive API, a per-field indexing toggle and a pagination
recipe — none of which had ever been checked against anything, and four of which
were advice a reader could act on and get a wrong answer from:

- **The pagination sample could not have worked.** It printed
  `GET /api/v1/opportunities?limit=200&cursor=…`. `query.cursor` was removed in
  `@objectstack/spec` 17 (#4286, ADR-0049) and is now rejected by name — the
  removal note records that no driver ever implemented keyset pagination, so the
  cursor was accepted and ignored and every page came back identical, meaning a
  caller looping "until `hasMore` is false" never terminated. The path was wrong
  too: the data plane is `/api/v1/data/<object>` with the `crm_`-prefixed name.
  Now `limit` / `offset`, plus a keyset expressed as an ordinary `where`
  predicate posted to `POST /api/v1/data/crm_opportunity/query`.
- **"Mark the field indexed" named a flag that never built an index.**
  `FieldSchema` rejects `indexed` by name — *"a field-level index flag built no
  index (#2377). Declare the index in the object's `indexes[]`."* Indexes are an
  object-level declaration, and HotCRM already ships sixteen of them across
  fifteen objects.
- **There is no archive API.** Archiving itself is real —
  `ObjectSchema.lifecycle.archive` with `after` / `to` / `keep`, swept by
  ObjectQL's ADR-0057 archiver — but it is a metadata declaration, no object in
  `src/` carries one, and archived rows live in the datasource named by
  `archive.to` rather than behind a record route.
- **The session defaults were the opposite of the truth.** Idle, absolute and
  concurrent-session controls exist (ADR-0069 D4, `@objectstack/plugin-auth`),
  but `0` means off for each and off is the default; the page presented
  5 sessions / 30 min / 12 hr as active defaults.

The quota tables stay, and nothing was deleted — a removed claim and a false one
look identical to the next reader. Each table now states whether anything
enforces it, and every row with a source names it: the 10,000-row bulk ceiling is
`MAX_BULK_PER_ROW_HOOK_ROWS`, search fields come from each object's
`searchableFields` (no top-30 cap), the flow loop ceiling is 100,000 rather than
2,000, file sizes are per-field `maxSize` values this app really sets, and no
inbound rate limit is configured at all. The email-and-calendar quota table is
marked *(not shipped)*, matching the guide. Part of #1119.
