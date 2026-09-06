---
---

Re-scope thirty-three source comments that asserted, in the present tense, that
`17.2.0` **is the version this repo pins**. It is not, and has not been since PR
#1577 moved all twelve `@objectstack/*` dependencies to 17.3.0 — so each of
those sentences was telling a maintainer, in the place they read before acting,
that a measurement was taken on the current pin when it was not.

This is the **third** recurrence of the same defect (#1460 at the 17.2.0 bump,
#1467 nine more it missed, now this at 17.3.0), and it is handled the way the
first two were ruled.

Deliberately **not** a find-and-replace to 17.3.0. A measurement that has not
been re-taken cannot be relabelled with a version it was never taken on:
renumbering would convert *stale* claims into *fabricated* ones — strictly
worse, because the original text at least dated itself honestly. Each occurrence
took one of two routes:

- **Re-measured on 17.3.0**, then written as a current reading. Fifteen
  occurrences, backed by the nine measurement-pinning test files, which run
  green on 17.3.0, and by re-reading the quoted engine internals in the
  installed tree: the readonly strip is still guarded by
  `if (!opCtx.context?.isSystem)` in `@objectstack/objectql`, and
  `resolveRunDataContext` in `@objectstack/service-automation` still returns
  `isSystem: true` for `runAs: 'system'` and only for it.
- **Re-scoped to date itself honestly**, saying which pin the reading was taken
  on and stating plainly that it has not been re-taken since.

One re-measurement came back **changed** and is re-stated rather than carried
over: the `@objectstack/objectql` runtime export list is **147 names on 17.3.0**
where the 17.2.0 taking counted 103. It is a control for "the list does not
carry `installFlatInput`", not a fact the harness depends on, and the
load-bearing half — absent from the export list and from both `.d.*` files — is
unchanged.

Two occurrences were false in a second way and are corrected:
`test/i18n-references.test.ts` claimed the repo pins `17.1.0` (two bumps stale)
and read "the KPI labels are not authorable" as a current fact; whether
`translatePage` widened on 17.3.0 is now marked unmeasured rather than answered
by guess. `src/views/task.view.ts` carried a four-row fixture count that was not
re-taken, so the counts are labelled a 17.2.0 reading while the throw/resolve
verdict beside them is re-confirmed on the current pin.

Of the 89 lines under `src/` `test/` `docs/` that named `17.2.0`, 33 carried a
present-tense pin claim and are re-scoped here. The other 56 say only "measured
on 17.2.0" — historically true, and untouched. So are the `.changeset/`
entries, which are records of what a past change did.

Comments and one design document's prose only — no metadata, schema, assertion
or behaviour change. Verified mechanically: with the repo's own
`stripComments()`, the comment-stripped text of all twenty-two changed `.ts`
files is byte-identical before and after.
