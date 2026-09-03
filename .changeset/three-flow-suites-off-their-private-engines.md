---
'hotcrm': patch
---

Point `flow-conversion`, `flow-quote` and `flow-followup` at the shared flow
harness and delete the three private data engines they each carried.

No behaviour of the app changes — this is the runtime evidence for lead
conversion, quote generation and follow-up scheduling, and it was measuring
against a store no install has.

Each copy carried two defects the shared harness in `test/helpers/flow-harness.ts`
exists to close. The first is a **schemaless store**: `insert` did
`{ id, ...data }`, so a column nobody wrote was *absent* rather than `null`, and
an absent key is not a null one to a filter. Measured on the shared engine, a
seeded `crm_lead` fixture goes from the 11 columns it was written with to the 43
a materialising driver returns; a `crm_quote` created by the flow from 3 to 29.
The expensive direction of that gap is silent: a flow whose filter is wrong
against real rows passes here, because the fixture happens not to carry the
column the filter names.

The second is **equality-only predicates** — `Object.entries(where).every(([k, v])
=> r[k] === v)`. An operand like `{ $gt: 0 }` is an object compared with `===`
against a scalar, so it can never match: every `$in` / `$nin` / `$gt` / `$gte` /
`$lt` / `$lte` selected nothing, without throwing or warning. Measured over the
same three rows, `{ amount: { $gt: 10 } }` selects 2 on the shared engine and 0
on the copy just deleted; `{ status: { $in: ['qualified', 'new'] } }` selects 1
against 0. A sweep that selects nothing is indistinguishable from a sweep with
nothing to do, which is why this could sit in the repo's own runtime-coverage
evidence unnoticed.

**No assertion moved.** Every one of the eight cases passes unchanged on the
shared engine, and that is a measurement rather than luck: instrumenting the
data service records that the three flows issue 8 predicates between them and
that **none** carries an operator — they filter on `id`, on `name_normalized`
and on `email`, all scalar equality. The equality-only defect was therefore
*latent* in these three suites, not active. It was live the moment any of them
grew a range filter, and it is now closed for all three.

`test/runtime-coverage.test.ts` continues to name all three files as the runtime
evidence for those flows, and its bookkeeping needed no change: the flow names it
greps for (`lead_conversion`, `quote_generation`, `schedule_followup`) are still
present as executable code, now as the keys the flows are registered under.
