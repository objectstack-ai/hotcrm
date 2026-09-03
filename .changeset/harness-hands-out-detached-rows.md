---
---

`test/` only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). No `src/` metadata changed: no object, field, view, label, flow or hook. In
particular `quote_generation`'s graph is untouched.

The shared flow harness handed out the **stored row object itself** from `insert`,
`find` and `findOne`, and `update` mutates that same object with `Object.assign`. So a
variable an earlier node bound — a `get_record` output — was retro-mutated by a later
write in the same run, and any guard evaluated after that write read POST-write state.
`insert` / `find` / `findOne` now return a detached shallow copy.

What it produced: `quote_generation`'s `check_stage` has two conditional edges written
as an exact partition (`e4a` advance / `e4b` keep-stage, opposite polarity). The advance
branch writes `stage: 'proposal'` into the very object `vars.oppRecord` points at, so
`e4b` then read `proposal` and was satisfied too. Both edges were taken and
`notify_owner` — reachable from `e4b` and from `e5` — ran twice, against a flow whose
author got the partition right. Measured: harness 2, real `ObjectQL` 1; now 1. That is
the cheap direction, because something visible was wrong. The expensive direction is
silent: any predicate reading a field an earlier node in the same run wrote was being
evaluated against state no driver would ever show it.

The in-place write was documented as deliberate, and that documentation is why this
looked like a 19-file change. It conflated two independent contracts. `store` is the
INSPECTION surface and is LIVE — `update` mutates the stored row, and a fixture reads
the result back through the object it seeded. The METHODS are the DRIVER surface, and
what they hand back was never what that paragraph was about. Measured across all 19
files importing the harness: exactly **one** assertion anywhere depended on read-side
identity — `expect(inserted).toBe(engine.store.crm_forecast[0])` in
`test/flow-harness-declared-columns.test.ts`. The other 18 files read results back
through `store`, which this does not touch. That assertion is rewritten on CONTENT
(`toEqual`), with the detachment it used to assert in the opposite direction now pinned
explicitly; nothing was loosened, skipped or quarantined.

The contract is pinned in `test/flow-harness-declared-columns.test.ts`, including
against a real `SqliteWasmDriver` so the harness cannot drift from the shape it models
without a test noticing: an earlier read is not retro-mutated, two reads of one row are
two objects, a caller's mutation never reaches the store — and, as the other half,
`store` is still live for the seeded object.

Whether `notify_owner` should sit on two edges of a partition at all is a legibility
question, not a defect — the flow is correct on a real driver — and is deliberately
left alone.
