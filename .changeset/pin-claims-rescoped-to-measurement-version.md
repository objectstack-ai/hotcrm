---
---

Re-scope sixteen source comments that asserted `17.1.0` **is the version this
repo pins**. It is not, and has not been since PR #1442 moved every
`@objectstack/*` to 17.2.0 — so each of those sentences was telling a
maintainer, in the place they read before acting, that a measurement was taken
on the current pin when it was not.

Deliberately **not** a find-and-replace to 17.2.0. None of these measurements
had been re-taken, so renumbering them would have converted sixteen *stale*
claims into sixteen *fabricated* ones — strictly worse, because the original
text at least dated itself honestly. Instead each sentence is re-scoped to the
pin it was actually taken on, and says plainly whether the shape has been
re-measured since.

Four of the sixteen were re-measured on 17.2.0 rather than merely re-scoped,
because the rest of the test suite leans on them:

- `test/helpers/hook-harness.ts` — the ADR-0104 reference-value table (still
  holds, both the warn-first and strict postures) and the `installFlatInput`
  export finding (still internal; `wrapDeclarativeHook` still exported).
- `test/readonly-write-semantics.test.ts` — what `readonly: true` actually
  strips (still holds: the strip is one branch of the UPDATE path, over
  caller-supplied keys only, and insert stays exempt).

Both re-measurements came back **unchanged**, which is what lets the three
comments resting on the readonly finding say so instead of leaving a standing
question mark.

Two claims were additionally false in a second way and are corrected:
`readonly-write-semantics.test.ts` still described 17.2.0 as a proposed
dependabot bump after it had landed; and `tenant-admin.profile.ts` carries three
hand-copied control counts that no longer reproduce. The control counts are kept
at their measured values with a note that they are period figures and not
current totals — refreshing them would have been the same laundering this change
exists to avoid.

The other ~40 occurrences that say only "measured on 17.1.0" are historically
true and are untouched.

Comments only — no metadata, schema or behaviour change.
