---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No shipped copy changed: `content/docs/**` is read by
the new guard and not written by it.

`test/docs-drift.test.ts` now also guards the `content/docs/**` threshold cell.
Two documentation surfaces state the large-deal operator; only one of them was
guarded. When #1128 flipped the gate from `>` to `>=`, the extractor over
`src/docs/*.md` stopped matching and threw, forcing that surface to be corrected
in the same PR — while the 21 `content/docs/**` product pages shipped the old
operator for about two hours, until #1127 was dispatched to fix them by hand.
`automation-docs-coverage.test.ts` does read those pages, but keys on each
flow's row label and trigger cell, never on the threshold cell: all three
locales' description cells were edited and the suite stayed green.

Two assertions, both keyed on the same compiled condition the existing rules
read, so neither one carries a copy of the number or the operator:

- The six lines that quote the condition **verbatim** —
  `content/docs/sales/opportunities` and `content/docs/sales/pipeline-management`,
  three locales each — must quote the condition the compiled stack actually
  carries. These pages present that string as the authoritative answer to "where
  is this configured?", so a reader copies it; it is the copy-paste surface that
  motivated #1127.
- No page under `content/docs/**` may state the threshold as strictly
  greater-than. This is the reverse-direction check #1127 ran by hand, kept as a
  test.

Both go through `capCel`, so they stay loud by construction: a value change
fails an assertion naming the page, and an operator change misses the pattern
and throws `drift test out of date` rather than asserting nothing. That is what
makes the exclusive-phrasing scan honest — banning "over $100K" is only correct
while the compiled gate is inclusive, so a flip back to `>` does not leave this
guard banning the newly correct wording, it stops the run and demands a rewrite.
The `$100K` abbreviation is derived from the compiled amount rather than written
into the test, and an amount with no such abbreviation throws instead of quietly
scanning for a phrase no page could contain. A vacuity guard pins that the walk
found real pages and that the six named pages still exist, since a walk
returning nothing would pass both assertions by scanning nothing.

Scope, deliberately: the per-locale **phrase table** over prose is not here — it
belongs to #1018. Chinese carries no word-for-word "or more" (`超过` is strictly
exclusive; the inclusive reading needs `及以上` / `达到`), so such a table is not
a transliteration of the English one, and its strictness is its own design
question: too strict is a rewording tax, too loose is a rubber stamp.
