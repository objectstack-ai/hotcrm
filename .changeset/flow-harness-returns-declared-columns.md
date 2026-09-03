---
---

Test harness only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration `.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` change of any kind: no object, field, view,
label, profile, flow or hook handler moved.

`test/helpers/flow-harness.ts` backs every runtime flow test with an in-memory
store that was **schemaless**: `insert` did `{ id, ...data }` and the array held
exactly what was written, so a column nobody wrote was **absent** from the row.
No driver returns that shape. A materialising driver returns every DECLARED
column, system columns included, with `null` where nothing set one — and an
absent key is not a null one to a filter.

Both directions of that difference had already cost real work. A **correct**
change to `forecast_snapshot` — pinning its bucket fetches to the snapshot
row's own organization (`{currentForecast.organization_id}`, #1372) — went red
across two files describing a sweep abort no install can have. And the
direction that costs more, which nothing had bitten yet: a flow whose filter is
**wrong** against real rows passes here, because the fixture happens not to
carry the column the filter names. The repo had been paying for it one column
at a time — `flow-scheduled.test.ts` stated `owner_id: null` by hand in two
places so `demo_bootstrap`'s `{ owner_id: null }` sweep could see a seeded row
at all, and `forecast-manual-override.test.ts` had just added a third hand-note
for `organization_id`.

The store now fills every unset declared column with `null`, on all three
routes a row can arrive by: the seed, `insert`, and a direct push into `store`
after the harness is built (the warm-boot seed replay does exactly that). The
column list is **derived from the platform's own registry** —
`applySystemFields` over `objectstack.config` plus `@objectstack/platform-objects`
— not hand-maintained, so it moves when an object under `src/objects/` gains a
field and there is nothing to remember.

Measured rather than assumed, and re-measured by the new
`test/flow-harness-declared-columns.test.ts` on every run: over a real
`SqliteWasmDriver` through `ObjectQL`, for all twelve of the eighteen app
objects whose validations admit a minimal row, the store's shape equals the
driver's exactly — no column missing, none extra. Both driver shapes ship
(`driver-memory` and `driver-mongodb` store only what was written and hand back
the sparse shape, which is why `test/sla-at-risk-live-work.test.ts` runs its
predicate over both); the harness models the **materialising** shape, because
that is what the shipped app runs on and it is the shape under which a wrong
filter fails loudly instead of passing by accident.

The column set is posture-independent — `applySystemFields` returns identical
field descriptors for `multiTenant` true and false, `organization_id` included.
What the posture decides is whether the WRITE is allowed: under
`OS_TENANCY_POSTURE=isolated` a system write carrying no organization is
refused outright, so the organization-less row this harness serves cannot exist
there. The harness is faithful to the `single` (default) posture — the one the
community app ships in.

Four hand-declared workarounds are retired, which is the proof the fix reached
the producer rather than the fixtures: the two `owner_id: null` seed notes in
`flow-scheduled.test.ts`, its `inNoOrganization()` helper, and
`forecast-manual-override.test.ts`'s `organization_id: null` on its forecast
template and four opportunity rows. Nine assertions moved to the faithful shape
— four `toBeUndefined()` reads of a column nobody wrote became `toBeNull()`,
and five whole-row `toEqual` comparisons now build their expected row with the
same derivation the store uses (`declaredRow`). None was loosened, skipped or
quarantined.

No flow test turned genuinely red. Corroborated independently: every column
named in a `filter` or a write across all 26 registered flows is declared on
the object it names, so the latent direction this change exists to expose has
no instance in the shipped flows today.
