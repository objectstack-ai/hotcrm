---
---

Comment and test-guard text only — this PR releases nothing to HotCRM users, so
the frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No object, view, flow, seed row or exported symbol
changed; no ceiling, buffer or README figure moved.

Three more restatements of the source token ratchet's ruled figures, wired to the
gate that produces them.

`test/docs-readme-token-figures.test.ts` — the tolerance the README band is
measured with was `const TOLERANCE = 0.05` under a comment calling it "the
ratchet's own, reused". It was a hand copy, and the comment is the reason it
survived: a reader who checks a literal against its stated source and finds the
claim already made stops looking. It now imports `BUFFER` from the gate, exported
for this since the previous card. The value is unchanged.

The same file's docstring carried a two-row table of the bands and the ceilings
they sit against, and a paragraph arguing from it — and the table had already
gone false. The interaction ceiling was re-anchored 42,000 -> 40,000 eleven days
earlier; the row kept saying 42,000 and the paragraph kept concluding, from the
stale figure, that this rule was the tighter of the two. Both are corrected, and
the paragraph now states what is true of both layers today: the band's upper edge
sits past the committed ceiling, so on growth the ratchet fails first. All of it
is now pinned — every field of both rows is asserted against the README banner,
the imported `BUFFER` and the committed `CEILINGS`, and the paragraph's own claim
is pinned as the relation between the two constants it draws on.

Pinning is the right answer here and deletion was the right answer to the
hand-maintained integers removed last week, for one reason: these figures have a
producer one import away. A number with a producer and no pin is not a small
version of the drift defect, it is all of it.

`scripts/check-source-token-ratchet.mjs` — the header sentence recording the two
re-anchorings that were declined as raises stated both `anchor()` outputs mid
paragraph, wrapped across a comment line break. Both are correct today; the
sentence is reflowed into one worked line per declined re-anchoring, in the shape
of the table above it, so each figure sits on one line beside the reading it
comes from and the ceiling it would have raised. It is not yet pinned; the reason
is recorded on the card.
