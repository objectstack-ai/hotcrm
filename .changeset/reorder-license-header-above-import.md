---
'hotcrm': patch
---

Move the copyright header back to line 1 in `src/objects/case.object.ts`,
`src/objects/product.object.ts` and `src/objects/opportunity.object.ts`,
where the `import { F, P } from '@objectstack/spec'` line had ended up
above it.

No behavioral change: `F` and `P` (the `cel`-tagged-template aliases for
formula/predicate expressions) are used productively in all three files —
`` F`...` `` for computed-field formulas, `` P`...` `` for validation
conditions and `visible`/`requiredWhen` predicates — so the import itself
is untouched, only its position relative to the header moves.
