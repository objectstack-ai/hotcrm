---
'hotcrm': minor
---

Move the platform line to ObjectStack **17.0.0 GA** (from `17.0.0-rc.6`) and absorb
the four behaviour changes that arrive with it. All 12 `@objectstack/*` entries move
together, and `objectstack.manifest.json` `specVersion` / `objectstack.config.ts`
`engines.protocol` follow the pin.

Three of the four are invisible in the release's conventional-commit markers — the
delta carries no `feat!` / `fix!` / `refactor!` at all — and each was measured on the
two builds side by side rather than read off a changelog.

**1. A `where` on a `formula` field now throws.** `assertFilterIsMaterializable` is new
in `@objectstack/objectql@17.0.0` (absent at rc.6, with `assertListComparandShapes`,
`lowerWhereFilterArray` and `INVALID_FILTER` as unchanged positive controls). Every
call site that reaches it — `find`, `findOne`, `count`, `aggregate`, `update`,
`delete` — can newly raise `400 INVALID_FIELD` for input it used to accept with a
`200` and a wrong answer. **HotCRM is unaffected**: all 19 `Field.formula` fields
across 12 objects were checked against every predicate surface in the app
(`where:` on `ctx.api`, `filter:` in flow node config, saved-view and page-component
`filter:`, in all four spellings the engine lowers) and **no predicate names a formula
field**. No query changed; nothing needed denormalising.

**2. `exportOptions` is now the object form `{ formats: [...] }`** (spec #8010,
maintainer ruling 2026-08-12). The bare array HotCRM authored is the legacy spelling
and still parses, but it *lifts* at parse — so `z.input` accepts both while `z.output`
only ever yields the object. The five list views now author the canonical form. This
one was quietly dangerous: the `allowExport` coverage guard tested the legacy array's
`.length`, read `undefined` on every surface, and reported 23 bulk-egress grants as
gratuitous — an inverted security verdict, not a silent one. Grants and surfaces are
unchanged; only the reader was wrong.

**3. `PERMISSION_DENIED` now carries a localized end-user message.** The sentence
naming the operation and object moved to `developerMessage`, the machine-readable
facts to `details`, and `message` became a four-locale user-facing string from the new
`BUILTIN_OPERATION_MESSAGES` table. Refusal assertions now read the ADR-0112 envelope
(`code` + `status` + `details`) instead of message text.

**4. `update()` on an id that matches no row rejects instead of resolving `null`**
(`RECORD_NOT_FOUND` / 404; measured both ways with a live-id control). This one is a
real behaviour fix, not just a test update: `mass_update_stage` iterates a selection,
and an uncaught rejection on the first stale id left **every selected row behind it
unattempted** — and because re-running aborted at the same row, the selection could
never be covered from the UI at all. The body now records a miss per row and rejects
once at the end, so live rows are written whatever their position in the selection and
the error still names every id it could not update. The catch is deliberately
cause-agnostic: a host rejection crosses the QuickJS boundary as `{ name, message }`
only, so a body cannot test for `RECORD_NOT_FOUND` and must not sniff engine wording.

Also verified clear on GA, by measurement rather than assumption: all 18 objects
author `sharingModel` (the new `security-owd-unset` door publishes them all), and no
`viewKind` / `defineViewItem` usage exists for the `views:`-container-only tighten to
reject.
