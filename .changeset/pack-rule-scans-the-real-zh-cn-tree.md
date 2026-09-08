---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed: no object, field, view,
label, page, hook or translation string. The one file this PR touches is
`test/docs-object-term-consistency.test.ts`.

The `#802` term guard has two rules that reach the Chinese language pack by two
different mechanisms, and only one of them was broken. The label-derivation rule
resolves the pack through the stack and has been catching defects all along; it
is untouched here. The other rule — "no retired spelling survives in the language
pack" — named one file, `src/translations/zh-CN.ts`, which was the whole pack
when the rule was written. The `#1311` locale split then moved every string out
of it into `src/translations/zh-CN/`, leaving a 77-line barrel of re-exports, and
the rule kept scanning the barrel: a file that cannot contain a label. It could
no longer fire.

That is the worst failure direction, because it is silent. The suite kept
reporting 33 tests passed, and a rule gone quiet reads as coverage. It was
measured rather than argued: with `#1529`'s defect re-injected verbatim into the
live pack, the old surface still exits 0 with 33 passed, while the repaired
surface exits 1 and names the offending file and line.

The scan surface is now derived the way the three surfaces that survived the same
split are — walk a root, filter by suffix — rather than naming a file. That
covers `_shared.ts`, which holds real pack strings and is reached only through
the family files, and it means the next module added under `zh-CN/` is picked up
with no edit to the guard. The suite's existing "the ledger and the scan surface
are real" check is extended to the pack in the same shape it already applies to
the pages and the test ledgers: the files being scanned must carry the label the
other rules resolve through the stack, so a surface that comes loose from the
pack again goes red instead of going quiet.

No retired spelling is live in the pack today — the repaired rule is green on
`main`'s content.
