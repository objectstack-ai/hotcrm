---
'hotcrm': patch
---

Repair the verification pipeline: fake-green CI checks, a dead e2e suite, and
the runtime test coverage gaps (#495).

**CI checks that checked nothing.** `code-quality.yml`'s three greps scanned
`packages/` — a directory this repo has never had — each with
`continue-on-error: true`. They are replaced by `scripts/check-source-hygiene.mjs`,
which scans the real tree (`src`, `test`, `e2e`, `scripts`), fails on a hit, and
fails loudly if a scanned directory ever disappears. `deploy-docs.yml` copied
`QUICKSTART.md` and `PROJECT_SUMMARY.md` unguarded — neither exists, so every
triggering push failed the workflow. `continue-on-error` is off `pnpm lint` in
both workflows (`objectstack lint` already exits 0 on warnings, so the flag only
hid real errors). The orphaned `.eslintrc.json` is removed — no `eslint` package
was installed anywhere to read it — and CONTRIBUTING now says what `pnpm lint`
actually does. `.github/labeler.yml` had seven rules, three of which pointed at
paths that have never existed and one (`ui`) at a label the repo does not have;
globs are repointed and `test/labeler-config.test.ts` fails on a glob that
matches nothing. `apps/docs` (Next.js, 231 mdx pages, its own lockfile) is
compiled by a new `docs-app.yml` workflow — nothing built it before.

**The e2e suite could not run.** `playwright.config.ts` pointed `baseURL` at
port 4004 while the server serves 4001, declared no `webServer`, and no workflow
ran playwright. Both specs also treated the data API's 401 as a pass, so even on
the right port they could only prove a route was mounted. The suite now boots the
server itself, authenticates for real via a shared `globalSetup`, and asserts
unconditionally — including that the data API *is* gated, which the old
`[200, 401, 403]` assertion would have let a public-data regression through.
`retries`/`trace` are configured for CI and `e2e.yml` runs it. 11 specs pass
against a cold database.

**Typecheck blind spots.** `tsconfig.json` covered only `src/`, so `test/`,
`e2e/` and `scripts/` — including the 606-line analytics-reconcile tool — were
never typechecked. Widening `include` surfaced 45 real errors, all fixed; the
module mode moves to `preserve`/`bundler` (nothing here is emitted by tsc) and
`noEmit` is pinned so no stray `tsc` can scatter output into the `dist/` the
marketplace publishes. `tsx` is now a real dependency behind
`pnpm reconcile:analytics` — the command the script documented could not run.
`scripts/wow1-live-schema.sh` preflights the `ai` capability it needs and
explains why a local server does not provide it.

**Runtime coverage.** Hooks went from 4 of 24 tested to 24 of 24, and flows from
3 of 20 to 17 of 20 (all six scheduled sweeps included). Statement coverage of
the hook handlers goes from 23% to 95%, functions from 22% to 95%, and
`vitest.config.ts` gains thresholds set just under those numbers. Shared
harnesses replace three divergent copies of the in-memory data engine and add the
query operators the old ones lacked — an equality-only engine silently matches
nothing for the `$lt`/`$nin` filters every scheduled sweep uses, so those flows
could not have been tested against it. `test/runtime-coverage.test.ts` fails when
a hook or flow arrives with no runtime test.

**Defect these tests surfaced.** Conditional edges nested inside a `loop` body
never evaluate: `applyConversionsToFlow` rewrites a bare string condition into a
CEL envelope only for a flow's top-level edges, so a loop-nested condition falls
through to the engine's legacy path and is string-compared
(`'existingStallTask' === 'null'` → false). `opportunity_stagnation`,
`contract_renewal` and `campaign_enrollment` are inert past that gate. The
behaviour is pinned and documented in `test/flow-scheduled.test.ts` rather than
fixed here — the fix changes what these production sweeps do (they would begin
creating tasks, opportunities and notifications) and belongs in its own change.
