---
'hotcrm': patch
---

Bump the whole `@objectstack/*` dependency line from `17.3.0` to `17.4.0` — all
21 pins (20 in `dependencies`, `@objectstack/formula` in `devDependencies`),
exact, no carets. objectstack#16186 is a caret-range supply-chain break and is
why this repo pins exact; `@objectstack/plugin-auth@17.4.0` carries
objectstack#16634's shipped guard, declaring all five better-auth dependencies
at exact `1.7.2` where `17.3.0` still declared them as `^1.7.2`.

The line moves as one unit on purpose. A cli bumped alone would lint against one
`@objectstack/spec` while the runtime resolved another, and any lint count
measured that way is a confound rather than a result.

**This bump is not neutral, and this changeset is not a claim that it is.**
`@objectstack/spec@17.4.0` renames `dashboard.refreshInterval` to
`refreshIntervalSeconds` (value unchanged, still seconds) — a breaking change
shipped as `minor` under the platform's launch-window convention, with the old
spelling left as a `retiredKey()` tombstone. Five dashboards in `src/dashboards/`
still author the retired spelling, so `validate`, `typecheck`, `build` and `lint`
all refuse the stack until they are migrated. The accompanying migration, the
platform's changed readonly-on-INSERT semantics, and the new `field-no-consumers`
lint family are sequenced separately; see the notes on the pull request that
carries this changeset.
