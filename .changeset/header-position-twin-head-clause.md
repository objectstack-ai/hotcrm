---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` is touched, so this genuinely is
the prose-only case that declaration is for.

`test/source-hygiene-header-position.test.ts` — the comment above the
"does not judge .d.ts" pin opened with a **bare universal negative**: "The rest
of the scanned trees genuinely have no header today". Read on its own that is
false. Measured with the gate's own `COPYRIGHT_HEADER`
(`/^\/\/ Copyright \(c\) \d{4} ObjectStack\./`, applied the way
`scanHeaderPosition` applies it) over `SCANNED`, seven of the fourteen non-`.ts`
files in the scanned trees *do* carry the header — six of the eight `.mjs` under
`scripts/`, and the one `.mts`.

There was a defensible reading under which the sentence was fine: the em-dash
clause that follows does carry a quantifier ("some of the `.mjs` …"), so it can
be read as a restrictive appositive naming which files the head clause is about.
That ambiguity was the whole of the finding, and it is why it was graded
marginal rather than as a defect. It is still worth a word, because the audience
for a gate's comments is the next agent to edit the gate, and an agent reads a
bare universal negative as a fact it can reason from — which is precisely how
this family's previous instance came to state something false.

The fix is the one the gate already took, not a new one. PR #1356 rewrote the
same head clause in `scanHeaderPosition`'s docstring, where the contrast was
explicit and the bare universal negative was unambiguously false:

```
scripts/check-source-hygiene.mjs
 * header is universal in `.ts` and is *not* universal in the rest of the
```

The twin now uses that same predicate:

```
test/source-hygiene-header-position.test.ts
    // #1094's own reproduce loop. The header is *not* universal in the rest of
```

(Both quotes name the file and not the line: this family's own lesson is that a
hand-maintained integer in prose goes stale, and these two lines moved twice in
the day between the finding and this PR.)

Ending exactly this disagreement was the stated purpose of the sweep that
produced the observation ("the point is that this file stops disagreeing with
the suite that tests it"), and a third phrasing would have re-created the defect
under a new spelling — "one fact, two shapes" is the reason the card exists, so
the wording is copied rather than invented.

The em-dash clause is untouched: "the rest of the scanned trees" still ends the
head clause immediately before the dash, so the appositive names the same noun
phrase it always did, and the `.sh` and `src/docs/*.md` halves — which are
accurate — keep their wording. Only the comment reflows; the fixtures, the
assertions and the `describe` block are byte-identical.

No integers and no counting guard, deliberately (ADR-0049 axis 3, the standing
family ruling, unchanged). No change to `COPYRIGHT_HEADER`, the scanned surface,
or any executable line. The measurement above lives in this changeset and in the
PR, where it is dated and re-runnable — not in the source, where it would become
the eighth instance of the defect this family removes.
