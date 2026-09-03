---
'hotcrm': patch
---

Retire the StackBlitz browser demo and the second lockfile it existed for.

The "Try it in your browser (no install)" badge and its paragraph are gone from
the README, along with `.stackblitzrc`, `package-lock.json`, and the CI gate
that watched that lockfile (`scripts/check-stackblitz-lock.mjs`). HotCRM now has
exactly one lockfile — `pnpm-lock.yaml` — and one way to install it.

Why: the repo carried two lockfiles derived from one `package.json`, and only
one of them had an owner. Dependabot updates `package.json` and
`pnpm-lock.yaml` and has no way to know about the npm one, so every npm-ecosystem
dependency PR opened with the second lockfile already stale, failed the lock
gate as the first step after install, and could never go green no matter how
often it was rebased. Five of them stalled that way, the oldest since
2026-08-01, and a security update would have sat in the same trap.

The demo's install could not simply switch to pnpm. It ran `npm install
--omit=dev --omit=optional` because WebContainers cannot compile the native
`better-sqlite3` add-on, and the pnpm route is blocked in two measured places:
`package.json` declares `engines.pnpm: ">=10.0.0"` with `engine-strict=true` in
`.npmrc`, so any older pnpm is refused before the lockfile is even read, and
`pnpm-lock.yaml` is lockfileVersion 9.0, which pnpm 8 cannot parse at all.
pnpm's own remedy for the first is to install the required version globally,
which is the one operation the sandbox was already documented to forbid.

Nothing else in the repo read `package-lock.json`. Local development,
`pnpm verify`, CI, and the marketplace one-click install are unchanged; the
seeded dev credentials the README paragraph carried are documented in
`AGENTS.md`.
