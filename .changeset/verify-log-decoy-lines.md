---
---

Test-infrastructure only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label).

A green `pnpm verify` run emitted **64 lines carrying the `✗` failure marker**,
and every one of them was a gate's own failure path driven by a fixture. The
run exited 0 throughout. `execFileSync` and `execSync` compute
`inheritStderr = !options.stdio`: with no explicit `stdio` they capture the
child's stderr into `error.stderr` **and** re-write those same bytes to the
parent's stderr, so a gate self-test printed gate-shaped failure text straight
into the log a reader is meant to trust.

Every gate-spawning site under `test/` now pins
`stdio: ['ignore', 'pipe', 'pipe']`, the shape
`test/source-hygiene-size-advisory.test.ts` already used. Because
`error.stderr` is populated identically either way, this removes only the echo:
no assertion on a gate's failure text changed, and none was weakened. Measured
64 marker lines before, 0 after.

`test/verify-log-decoy-pin.test.ts` keeps it that way — it fails the moment a
new spawn site inherits stderr, naming the file and line, and carries a live
control that re-measures the leak (1 line inherited, 0 pinned) rather than
trusting the mechanism to stay put.
