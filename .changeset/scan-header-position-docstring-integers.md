---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

`scripts/check-source-hygiene.mjs` — `scanHeaderPosition`'s docstring carried a
verbatim twin of the sentence PR #1349 had just fixed one file away, plus a
third stale integer four lines above it. Seventh instance of the defect this
family collects: a counted fact stated in prose with no producer and nothing
checking it. As before the numerals are removed rather than corrected, and no
guard is added to pin them.

⭐ The reason this card is worth its own PR rather than a renumber: the twin
sentence went stale **again between being filed and being fixed**. It was filed
against a measurement of "3 of 8" headerless `.mjs`; PR #1354 normalised
`scripts/publish-marketplace.mjs`'s licence-header spelling that same morning,
and the honest reading at the moment of this edit is **2 of 8**. The prose said
"3 of the 5". Two numbers, three readings inside one day, one sentence — which
is the argument, not an anecdote.

Both sentences needed more than a deletion, because in each case a numeral was
carrying meaning and not just arithmetic.

**The "Why `.ts` only" paragraph** said the header "is *not* in the rest of the
scanned trees — 3 of the 5 `.mjs` files under `scripts/`, the `.sh` script and
the four `src/docs/*.md` pages have none". Measured with the gate's own
`COPYRIGHT_HEADER` (`/^\/\/ Copyright \(c\) \d{4} ObjectStack\./`, applied the
way `scanHeaderPosition` applies it), **six of the eight** `.mjs` under
`scripts/` do carry the header, so both the count and the bare enumeration it
props up are false — dropping the numerals alone would have left an assertion
that is wrong in the opposite direction. It now reads "is *not* universal in the
rest of the scanned trees — some of the `.mjs` under `scripts/`, plus the `.sh`
and the `src/docs/*.md` pages, have none", the wording PR #1349 established for
the twin, so the file and the suite that tests it stop disagreeing.

`.sh` and `src/docs/*.md` were unqualified in the old sentence and are still
unqualified, but "the four" goes with the rest. It happens to be accurate today;
it is a hand-maintained integer with no producer, which is the defect this family
removes, and "the `src/docs/*.md` pages" is true without it and stays true.

**The shebang bullet** had two defects rather than one. It said "the two `.mjs`
gates in `scripts/` do, and they carry the header on line 2" — the count is five,
and the claim about "they" is false of `scripts/check-stackblitz-lock.mjs`, which
has a shebang and no licence header at all. Correcting "two" to "five" would have
left that second defect standing and made it worse, since the wrong number was
the only thing keeping the universal claim narrow enough to be true. It now reads
"some of the `.mjs` under `scripts/` do, and where one of those carries the
header it sits on line 2" — no figure, and a conditional in place of the
universal.

The load-bearing half of that bullet was re-verified rather than assumed, because
the allowance rests on it: **no `.ts` file in this repo has a shebang** (0 of 338
measured repo-wide). It is unchanged.

No counting guard, deliberately (ADR-0049 axis 3, as with the six landed
siblings). No change to `COPYRIGHT_HEADER`, `INDENTED_COPYRIGHT_HEADER`, the
scanned surface, the banner, or any executable line — the diff is six lines of
comment out, six in.
