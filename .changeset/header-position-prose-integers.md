---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

`test/source-hygiene-header-position.test.ts` — the comment above the
"does not judge .d.ts" pin explained why the header check reads `.ts` only, and
propped that explanation on two hand-maintained integers: "3 of 5 `.mjs` under
scripts/, the `.sh`, the four `src/docs/*.md` pages". Sixth instance of the
defect this family collects: a counted fact stated in prose with no producer and
nothing checking it. As before the numerals are removed rather than corrected,
and no guard is added to pin them.

This one arrived with its own proof that renumbering is not a fix. The card was
filed against "2 of 7", re-measured at dispatch as "2 of 8" — PR #1343 added
`scripts/lib/source-hygiene-surface.mjs` in the two hours between — and measured
again here, with the gate's own rule, as **3 of 8**. The third reading differs
from the second for a reason no reviewer would catch by eye:
`scripts/publish-marketplace.mjs` opens
`// Copyright (c) 2026 ObjectStack contributors.`, and `COPYRIGHT_HEADER` is
anchored `/^\/\/ Copyright \(c\) \d{4} ObjectStack\./` — it requires the period
directly after `ObjectStack`, so that file reads as headerless to the check while
reading as headered to a person. Three measurements, three answers, one sentence.

The surviving claim needed one adjustment beyond dropping the numerals, because
"3 of 5" was carrying meaning and not just arithmetic: it said *some, not all*.
Five of the eight `.mjs` under `scripts/` do carry the header, so the bare
enumeration would have asserted something false. "Some of the `.mjs` under
scripts/" states the same thing without a figure, and stays true whichever way
the `publish-marketplace.mjs` spelling is read. The other two kinds are
unqualified because they are complete: the one `.sh` (`scripts/wow1-live-schema.sh`)
and all four `src/docs/*.md` pages carry no header at all.

No counting guard, deliberately (ADR-0049 axis 3, as with the five landed
siblings). The load-bearing argument — widening the header check would demand
headers in files nobody has decided about — needs only that such files exist,
which is what the enumeration of kinds now says.
