---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

Three more instances of one defect, fixed the same way its earlier siblings were:
a counted fact stated in prose with no producer and nothing checking it. In each
case the numeral is removed rather than corrected, and no guard is added to pin
it — a corrected figure is just the next one to go stale, and a guard asserting
it would be one more hand-maintained fact wearing a lock.

`scripts/check-source-hygiene.mjs` — `scanHeaderPosition`'s docstring argued that
requiring the licence header to be PRESENT costs nothing, by quoting "all 282
`.ts` files under the scanned trees carry the header, 274 of them on line 1".
Both integers were stale, and the eight-file gap the second one hedged against
has since closed to zero, so the sentence understated its own case and left a
caveat that no longer described anything. This one differs from the rest of the
family in a way worth keeping: `scanHeaderPosition` **is** the producer, so the
universal is the check's own postcondition rather than a hopeful generalisation
— which is why it needs no count at all. The set it ranges over is now named
explicitly, because the widening of `allTs` to the root `.ts` files had made
"under the scanned trees" a proper subset of what the check actually reads.

`test/sharing-coverage.test.ts` — the note above the `crm_campaign` row justified
「营销活动」 as "the word the other 14 zh-Hans doc pages already used". Twenty-one
use it. Nothing in the file contradicted the figure, so it read as a measurement
to every subsequent reader. Without the numeral the claim is stronger: a
universal cannot be falsified by the next zh-Hans page someone writes, and both
halves keep real producers — the locale pack is a file, and "the docs already use
it" is checkable by grep. The `#830` history in the second half is kept and has
discharged cleanly: no page carries the old 「市场活动」 spelling.

`test/flow-scheduled.test.ts` — the suite header opened with "All six scheduled
flows were previously untested at runtime". There are nine, and this file imports
all nine and writes a `describe` block for each, so the sentence undercounted the
coverage of the suite it heads. A reader auditing scheduled-flow coverage reads
"six", counts six, and stops while three tested flows sit below the fold. No
counting guard here either, and this member supplies the sharpest reason: it
would have to solve occurrence-versus-entity to be correct. `grep -c "type:
'schedule'"` over `src/flows` returns ten, because `campaign-completion.flow.ts`
carries the string in its JSDoc above the real declaration and exports exactly
one flow. Nine files, nine flows, ten textual occurrences — a grep-based guard
would pin the wrong number.

No assertion, import, `describe` block, table row or seed changed in any of the
three files. Both test files got smaller.
