---
---

No user-visible change: one new test file, one comment added beside an existing
assertion. No metadata, flow, object or view is touched — in particular none of
the sites spelling `{TODAY()}` are edited, because the measurement below says
they do not need to be.

**Settles #1107: `{TODAY()}` in a flow filter still works on 17.0.0-rc.6.**

The question was live because rc.6 changed the token's treatment underneath this
repo. ObjectQL's read path classifies `{TODAY()}` as `kind: 'unknown'` and
throws `UnknownFilterTokenError` (`FILTER_TOKEN_UNKNOWN`, 400); on rc.2 the same
string was classified as nothing at all and reached the driver as a literal.
Sixteen files in `src/` spell the token, six of them in live sweep filters —
including the nightly `forecast_snapshot` window — and nothing in the suite
could tell whether those sweeps had been throwing since the rc.5 → rc.6 bump.

The answer, measured by execution rather than by reading lint hints:
`service-automation` consumes the token before the query is issued. Its
`interpolateFilter()` resolves `TODAY()` / `NOW()` and their day offsets to a
`YYYY-MM-DD` string while building a data node's filter, so what reaches the
query layer is a date literal. Every shipped filter site was run through a real
`AutomationEngine` over a real ObjectQL and every one of them arrived resolved.

Worth recording, because it is the part that is easy to get backwards: there is
only ONE query path. ObjectQL registers itself as the kernel's `'data'` service,
which is the same service the flow nodes call, so a flow query and a hand-written
`ql.find()` hit the same token gate. Flows survive because of a pre-pass, not
because of a second path. The two layers therefore hold different vocabularies on
purpose — the automation template evaluator knows `TODAY()`, ObjectQL's filter
vocabulary knows `{today}` — and either half moving breaks the sweeps.

`test/flow-filter-today-token.test.ts` pins all of it by running it: the rc.6
rejection itself, the `{today}` half ObjectQL does resolve, `contract_expiration`
end-to-end against a real engine (past-due rows expire, the row ending *today*
does not), and a census that executes every `{TODAY()…}` filter site the flows
ship, so a new one is covered the day it is written. Two cases pin that the guard
can go red: a token the pre-pass does not consume reaches the query layer
verbatim (proving the check can observe that), and one neither layer knows fails
the run outright (proving the refusal is caught, not silently dropped).

The existing guard at `test/forecast-seeds.test.ts:201` asserts the filter's
literal shape and never executes it — green under both possible answers, and
green even if a release removed `TODAY()` support entirely. It stays, as the
spelling guard it is, now with a comment saying so and pointing at the execution
guard beside it.
