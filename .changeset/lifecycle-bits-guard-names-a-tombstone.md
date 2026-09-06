---
'hotcrm': patch
---

Correct the `authorization-coverage` lifecycle-bits guard, whose comment described a
platform state the pinned spec has left behind, and make its assertion non-vacuous.

The guard scans every permission grant for `allowRestore: true` / `allowPurge: true`.
Its comment said those were "RBAC-gated" bits "whose operations do not exist yet" —
live-but-unenforced. On the pinned `@objectstack/spec` 17.3.0 they are neither: ADR-0049
enforce-or-remove **retired** both keys (objectstack#12497), and the schema now refuses
them at parse time. Measured against the installed package, `allowRestore: true` comes
back with the platform's own prescription:

> `objects.<object>.allowRestore` was removed in @objectstack/spec 17 (ADR-0049) — the
> `restore` ObjectQL operation it claimed to gate has never shipped (roadmap M2), so
> granting the bit delivered nothing. Delete the key …

Only `true` is refused. The `false` that the pre-retirement schema defaulted into every
artifact the published 17.x toolchain built parses as inert residue and is stripped
(objectstack#12840) — so `=== true` is both what the scan tests and the only value worth
testing for. The comment now says all of that, cites the retirement, and says why the
guard **stays**: `validate` and `build` reject such a source earlier in `pnpm verify`,
but `pnpm typecheck` does not — `src/profiles/*.profile.ts` are untyped object literals
and the suite reads the raw `objectstack.config` rather than a schema-parsed object, so
nothing gives the literal a contextual type and a bare `pnpm test` still trips here.
objectstack#1883 stays open as the M2 lifecycle anchor, and the keys return with it as
bits that really are enforced.

The steady state of this guard is an empty result, which a real pass and a collapsed
input look identical in. It now carries the same guard-the-guard assertion its immediate
neighbour (`allowTransfer`) has carried all along — the population being scanned must be
non-empty — so the green says which of the two it is. No new check surface: the sibling
pattern, applied to the assertion already in the file.
