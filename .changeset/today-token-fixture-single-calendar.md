---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents). No `src/` metadata changed;
the app bundle is byte-identical.

`test/flow-filter-today-token.test.ts` spelled its fixture dates on two
calendars at once: `ymd()` did the day arithmetic on the **local** calendar
(`new Date()` / `getDate()` / `setDate()`) and rendered the result on the
**UTC** one (`toISOString().slice(0, 10)`). Nothing in the repo pins `TZ`, so
the suite was green because the CI runner happens to sit at UTC — where the two
calendars coincide and the split is invisible.

Which calendar to standardise on was not a free choice, so both consumers were
measured on 17.2.0 rather than assumed. `service-automation`'s `resolveToken()`
renders a bare `{TODAY()}` as `new Date().toISOString().slice(0, 10)` — the UTC
calendar day, with no reference to the ambient zone. `@objectstack/core`'s
`{today}` filter macro resolves through `proxyDay(now, ctx.timezone)`, and the
context a bare `ql.find()` carries here has no `timezone`, so it falls back to
the UTC parts. Both tokens the file asserts against mean "the UTC day", so the
helper is now UTC throughout (`setUTCDate` / `getUTCDate`). Local-throughout was
the other internally-consistent option and is measurably wrong here: it
disagrees with the engine in every zone whose local date differs from the UTC
date.

The bug was latent, not hypothetical, and it is now reproduced rather than
argued. Local `setDate` keeps the wall-clock time, so a "spring forward" day is
23h long and the shifted instant lands one UTC day later than intended. In the
hour after a transition that collapses `ymd(-1)` onto `ymd(0)`, putting the
`k_yesterday` seed exactly ON the `$lt` boundary the file asserts across: the
sweep leaves it `activated` instead of `expired` and notifies one owner instead
of two. Measured over a zone x instant matrix, this file, before and after:

    America/New_York     2026-03-08T23:00:00Z   RED -> green
    America/Los_Angeles  2026-03-08T23:00:00Z   RED -> green
    Europe/Berlin        2026-03-29T23:00:00Z   RED -> green
    America/Santiago     2026-09-06T23:00:00Z   RED -> green
    Pacific/Auckland     2026-09-26T23:00:00Z   RED -> green
    Australia/Sydney     2026-10-03T23:00:00Z   RED -> green

80 cells (10 zones x 8 instants): 6 red before, 0 red after. Widened by direct
arithmetic over 34 zones x every 30 minutes of 2026 (595,680 pairs), the old
spelling flips an assertion in 47 of them across 22 zones; the new one flips
none.

No `TZ` pin was added. Pinning `TZ=UTC` in `vitest.config.ts` would have turned
this green by declaring the very environment default that hid it, across all
156 test files, and would have frozen the accident instead of removing the
dependence on it — the ambient zone stays a live signal.

⚠️ Worth knowing before re-checking this: no run at `TZ=UTC` can have teeth
against this class of bug. Local and UTC coincide there, so a mixed-calendar
helper and a single-calendar one are indistinguishable. Reproducing it needs a
DST-observing zone AND an instant inside that zone's transition hour, which is
why a one-point sweep cleared it.
