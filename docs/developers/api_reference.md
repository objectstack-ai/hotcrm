# HotCRM Object Reference

> Where this repository's object and field inventory lives, and how to read it from source.

Object definitions live in `src/objects/*.object.ts`. All business object names use the `crm_` prefix.

## Current objects

The object roster is deliberately **not** restated here — `src/objects/*.object.ts` is
its source of truth, one file per object, each registering its `crm_`-prefixed `name`.
The model spans four business domains: Sales, Service, Marketing, and Revenue.
*Supersedes the hand-maintained fifteen-name roster that stood here, which had already
drifted three objects behind the tree — 2026-08-31 ruling, item 5.*

## Object fields

Field lists are deliberately **not** restated here either — the `fields:` block of each
`src/objects/*.object.ts` is their source of truth, and it carries the label, type and
constraints that a name-only transcript drops.
*Supersedes the fifteen hand-copied `Key fields:` lists that stood here, twelve of which
named at least one field that does not exist on disk — the same ruling, item 5, which
names an object's fields beside the roster itself.*

## Verification

Regenerate confidence after object changes with:

```bash
pnpm validate
pnpm typecheck
```

`pnpm validate` is authoritative for object count and field count.
