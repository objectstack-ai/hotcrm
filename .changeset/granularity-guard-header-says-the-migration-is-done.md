---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Every changed line in the diff sits inside the file
header's block comment: `test/dataset-granularity.test.ts` is byte-identical
from `type AnyRec` onward, and its copyright line and imports are byte-identical
too. No assertion, fixture, import, `INTENDED_BUCKET`, `REPORT_DATE_AXIS` or
`GAP_OWNERS` entry was touched — the two-faced guard mechanism is correct and
stays exactly as it is.

`test/dataset-granularity.test.ts`'s header carried two present-tense sentences
that had stopped being true:

- "every date axis has been grouping by the raw timestamp … **ever since**" —
  it is not. All six `INTENDED_BUCKET` entries are declared on their dataset
  dimensions: `lead.dataset.ts:15` (month), `case.dataset.ts:20` (day),
  `account.dataset.ts:14` (month), `opportunity.dataset.ts:38` (month) and `:39`
  (quarter), `event.dataset.ts:41` (week). Those six are also the *only*
  `dateGranularity` declarations under `src/datasets/`.
- "Re-declaring them is **blocked on the platform, not on us**" — it is not
  blocked, and this was the one written as a live constraint. The guard already
  runs its 17+ face: `pnpm exec vitest run test/dataset-granularity.test.ts`
  reports 7 passed / 1 skipped, with both `on @objectstack 17+ — buckets must be
  declared` cases green and the 16.x face skipped.

**The 16.x history is preserved as history, because it is accurate about 16.x.**
It is not asserted to have been wrong; it is re-framed from a live reason into
the record of why the migration waited, and each of its two gaps now names the
release that closed it — measured here rather than inherited from the card:

- **upstream #3602 / #3597** (the granular dimension leaving `NativeSQLStrategy`
  for a bridge that dropped the `ExecutionContext`, so sharing composed
  `{ id: '__deny_all__' }`): `@objectstack/service-analytics` CHANGELOG carries
  `1f8390b … (#3597)`, `415254c … (#3602)` and the `587fc91` ExecutionContext
  bridge entry under its **`17.0.0-rc.0`** heading, republished under
  **`17.0.0`** GA. Nothing between that heading and the pinned 17.3.0 reverts
  them — the 17.1/17.2/17.3 entries only add read-scope doors (`b0d7d54`,
  `967402a`, `5c7cbe3`, `a40c0f9`), and `a40c0f9` extends #3602's own label-lookup
  scoping rather than undoing it.
- **the bare-`strftime()` NULL** on an epoch-millis `Field.datetime()` column:
  closed by `c8124e5` (upstream #3912/#3942, "give `Field.datetime` one UTC
  storage form per dialect") in `@objectstack/driver-sql` under its
  **`17.0.0-rc.1`** heading, republished under **`17.0.0`** GA and carried into
  `@objectstack/driver-sqlite-wasm` as `Updated dependencies [c8124e5]` under the
  same two headings. SQLite now stores ISO text, which `strftime` parses.

The app pins all of `@objectstack/service-analytics`,
`@objectstack/driver-sqlite-wasm`, `@objectstack/driver-sql` and
`@objectstack/spec` at exactly **17.3.0**, so both headings are covered. This is
deliberately *not* the #1636 shape (fixed upstream, absent from the installed
build): the installed `service-analytics` build itself carries the fix — its
`dist` binds `context: ctx.context` into the aggregate bridge and references
`getReadScope` — and `@objectstack/spec` 17.3.0 declares `dateGranularity` on the
dataset dimension schema.

The header's second gap also gains an upstream number it never had: it is
#3912/#3942, the same pair the `event_metrics.start_datetime` note directly
below records as "released as of 17.0.0 GA" (PR #1663). The header and that note
now give one answer instead of two.

Same failure class as #1643, #1368, #1648 and #1655: a closed defect restated as
a live reason.
