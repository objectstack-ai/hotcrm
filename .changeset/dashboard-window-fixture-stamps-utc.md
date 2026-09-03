---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed; the app bundle is
byte-identical.

`test/dashboard-date-range-window.test.ts` failed 5 of its 13 tests on a clean
checkout for any contributor whose local date was ahead of UTC, and was green in
CI only because CI runs UTC.

The window was never the problem. Measured on 17.2.0: `{today}` and
`{N_days_ago}` are resolved server-side on UTC calendar days —
`@objectstack/core`'s `resolveFilterToken()` buckets the process instant with
`proxyDay(now, ctx.timezone)` → `calendarPartsInTzOrUtc()`, which falls back to
`getUTC*` unless the request declares a timezone. The host zone (`TZ`) is not an
input: at one fixed instant `{today}` resolves to the same `2026-09-02` under
`TZ=UTC` and `TZ=Asia/Shanghai`. The only override is
`ExecutionContext.timezone`, which `service-analytics` defaults as
`selection.timezone ?? context?.timezone ?? 'UTC'` and which HotCRM never sets.

The fixture was the problem. It stamped each seeded case at LOCAL noon of its
day offset, on the claim that noon is "never closer than 12 hours to any
boundary". Against a UTC boundary local noon is up to 14 hours away, so east of
UTC the newest row landed on the NEXT UTC day and fell outside `$lte {today}` —
one row dropped from every windowed count, which is every one of the five
failures.

Fixtures are now stamped at UTC noon, the same calendar the window is resolved
on, and the bare-date probe for objectstack#3777 is spelled from `getUTC*` (a
locally-spelled bare date named yesterday's UTC day west of UTC — the same
defect with the opposite sign, which no one had run into yet). `TZ` is NOT
pinned in `vitest.config.ts`: the ambient zone stays a live signal, and the
suite now passes in it rather than being shielded from it. Verified across 7
zones (−11:00 through +14:00, including +05:45 and +10:30) × 4 instants: 28/28
green, where the pre-fix suite failed 5/13 at `TZ=Asia/Shanghai`.

Two tests were added, because a semantics nobody writes down cannot be relied
on. One asserts the boundary — `{today}` keeps a row stamped at 12:00Z today and
`{yesterday}` drops exactly that row, which separates end-of-UTC-day from
midnight-UTC and from a ceiling resolved on another calendar. The other flips
`TZ` across five zones and holds every fixture stamp at `12:00:00.000Z`; without
it the regression is invisible to a UTC runner, where local noon and UTC noon are
the same instant.
