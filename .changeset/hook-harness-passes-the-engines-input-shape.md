---
---

Test infrastructure only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata behaviour changed: no object,
field, view, label or hook handler logic.

The fast hook harness now hands a handler the object shape the ENGINE hands it.
`test/helpers/hook-harness.ts` used to pass `ctx.input` as a plain object;
ObjectQL passes `{ data, options }` behind a flat-record Proxy
(`installFlatInput`, `@objectstack/objectql` `src/hook-wrappers.ts`). The two
are identical for reads and assignments and differ for everything else, so any
hook defect living in that difference was structurally invisible to roughly 270
assertions **while they reported success**.

That is not hypothetical. #1133: fifteen `delete` statements across two intake
hooks were silent no-ops in production, because the Proxy declares no
`deleteProperty` trap and the delete lands on the wrapper one level above the
record. The tests asserting that strip passed the entire time — on a plain
object `delete` genuinely works — so a security control read as enforced, in
code and in its tests, and did nothing.

The fix routes the harness through the engine's own wrapper rather than
imitating it. `installFlatInput` is not exported (measured: it is in
`dist/index.mjs` and `dist/core.mjs`, in neither `.d.ts`, and absent from the
bundle's export list), which appeared to leave only two routes — a local
reimplementation that rots the moment upstream changes a trap, or booting a real
kernel per assertion, which costs exactly the speed that makes this harness worth
having. There is a third: `wrapDeclarativeHook`, the function that *calls*
`installFlatInput`, **is** exported. Driving it yields the genuine Proxy with no
kernel and no copy, so there is nothing to drift — a change upstream arrives with
the next dependency bump instead of being silently absorbed.

`data` is installed as the caller's own record object rather than a copy, which
is why every existing call site and assertion works unchanged. `id` is
additionally hoisted onto the wrapper because the Proxy's `get` answers `id`
from there and never consults `data` — measured; without the hoist the seven
hooks that read `ctx.input.id` would go red against a harness that is wrong
rather than against a defect.

`test/hook-input-shape.test.ts` is the new pin, and it was verified to fail
against the pre-#1295 harness rather than merely asserted to. Restoring the old
plain-object shape turns 5 of its 12 cases red: the `delete` no-op that #1133
shipped under, the two cases that read that no-op from the other side (`delete`
reporting success while doing nothing, and assign-then-delete keeping the
assigned value), the wrapper-shape case, and the `id`-from-the-wrapper case. The
remaining 7 pass under both shapes by construction — reads, assignments, `has`,
`ownKeys` and `getOwnPropertyDescriptor` are exactly the operations a plain
object and the Proxy agree on, which is why the old harness looked trustworthy.

The pin also covers the traps the failure mode generalises to, and carries an
executable contrast case asserting that a plain object still honours `delete`,
so the reason the pin matters cannot quietly stop being true. Its header states
how to read each direction of failure: `delete` becoming effective means the
engine grew a `deleteProperty` trap (upstream objectstack#12277) and the
assign-instead-of-delete repairs should be re-read, not that the assertion
should be relaxed.

Landing the shape changed no verdict anywhere in the suite (135 files / 2931
tests, green before and after), because PR #1294 had already replaced the last
live `delete input.<field>` with an assignment. The change is prophylactic: it
removes the blind spot rather than fixing a live defect.

Residual, stated rather than hidden: 39 call sites across 14 test files build a
hook ctx inline instead of through `makeCtx`, so they still pass a plain object
and keep the old blind spot. Two of them — the ones this card names, in
`test/case-assignment.test.ts` — are converted here; the rest are outside this
card's file fence and are reported for separate triage.
