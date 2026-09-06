---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents). No `src/` metadata changed;
the app bundle is byte-identical.

Six test date helpers did their day arithmetic on the **local** calendar
(`getDate` / `setDate`) and rendered the result on the **UTC** one
(`toISOString`) — the shape PR #1507 fixed in one file. Nothing in this repo
pins `TZ`, so the suite was green because the runner sits at UTC, where the two
calendars coincide and the mixed and single-calendar spellings are
behaviourally identical.

The set was re-derived by text, and it is **six, not five**:
`test/flow-sla-ownerless-assignment.test.ts` carries the identical shape and
appears on neither originating card.

    test/helpers/hook-harness.ts                  daysFromNow()
    test/flow-scheduled.test.ts                   iso()
    test/flow-sla-ownerless-case.test.ts          iso()
    test/flow-sla-ownerless-assignment.test.ts    iso()
    test/flow-run-summary.test.ts                 day()
    test/flow-scheduled-org-partition.test.ts     day()

Which calendar to standardise on was **re-measured, not inherited**. Driving a
real `AutomationEngine` (`@objectstack/service-automation` 17.3.0) at a pinned
instant, a bare `{TODAY()}` resolves to the same UTC day in `UTC`,
`America/New_York`, `Europe/Berlin` and `Australia/Sydney`. UTC is the engine's
calendar for these call sites, so the helpers are now UTC throughout
(`getUTCDate` / `setUTCDate`).

The same probe **narrows** that conclusion, which is why re-taking it mattered:
only the zero-offset branch is UTC. `{TODAY() + N}` runs
`now.setDate(now.getDate() + N)` before `toISOString()`, so the shipped
resolver carries the very shape fixed here. Measured `{TODAY() + 120}` at
`2026-03-06T00:00:00Z`: `2026-07-04` at UTC, `2026-07-03` in
`America/New_York`. That is platform-side and is reported upstream, not
touched here.

`today()` in the shared harness is deliberately untouched: it is already
single-calendar UTC and agrees with the engine.

No `TZ` pin was added. Pinning `TZ=UTC` in `vitest.config.ts` would turn the
suite green by declaring the very environment default that hid the bug, across
all 156 test files, and would freeze the accident rather than remove the
dependence on it.

Measured over a 10-cell zone x instant matrix (three of them non-DST controls,
green in both phases), correcting the fixtures turns four `flow-scheduled`
assertions from RED to green and **un-masks** assertions that were previously
passing only because the fixture repeated the producer's own bug. Those
producers are HotCRM's `case` / `lead` / `opportunity` / `quote` / `task` hooks
and the platform's `{TODAY() ± N}` resolver; each is reported for its own card
rather than sanded down here.

⚠️ Worth knowing before re-checking this: no run at `TZ=UTC` can have teeth
against this class. Reproducing it needs a DST-observing zone AND an instant
inside its transition hour, which is why a one-point sweep clears it.
