---
'hotcrm': patch
---

Upgrade `@changesets/cli` to 3.x, and keep HotCRM versioning itself while doing it.

`@changesets/cli` 3.0.0 ships 18 breaking changes. Three of them land on this repo,
and two would have landed **silently** — which is why this is the upgrade rather
than the bare dependency bump dependabot proposed.

**Private packages are no longer versioned by default.** `hotcrm` is `private: true`
and versions *itself* through changesets; `CHANGELOG.md`, the release notes this app
publishes, is written by `changeset version` and by nothing else. Measured on a
private single-package fixture with a pending changeset and no `privatePackages`
option: the command exits **0**, prints "All files have been updated. Review them and
commit at your leisure", and then leaves the version untouched, writes no
`CHANGELOG.md`, and does not even consume the changeset. `.changeset/config.json` now
sets `privatePackages: { version: true, tag: false }` — the 2.x default, restored
explicitly — and `test/changeset-version-wrapper.test.ts` runs the real CLI against a
fixture carrying this repo's own config, so a future default cannot quietly move it
back.

**The formatter option was renamed, so turning it off had to be re-stated.** 3.x
replaces `prettier` with `format`. A leftover `prettier` key is accepted in silence —
no error, no warning — and formatting returns at its `auto` default, which is exactly
what re-mangles field names inside already-published release notes. `format: false`
now carries what `prettier: false` used to.

**`changeset version` exits 1 when there is nothing to release** (2.x exited 0).
Running it with nothing pending is an ordinary answer at release time, not a broken
release, so `pnpm changeset:version` goes through `scripts/changeset-version.mjs`,
which reports that one outcome as "nothing to release" and exits 0. It is identified
by the sentinel line the CLI prints on exactly that path, never by the exit code
alone, so every other failure — a misspelled `--ignore` package, a malformed config,
an unwritable tree — still exits non-zero.

**Node floor, FROM `>=22` TO `^22.11 || ^24 || >=26`.** 3.x requires the latter, and
`>=22` admitted 22.0–22.10, which it rejects. This corrects a declaration that was
already false with `engine-strict=true` in `.npmrc` rather than narrowing real
support: CI runs `22.x`, `.nvmrc` pins 22, and both resolve above 22.11.
