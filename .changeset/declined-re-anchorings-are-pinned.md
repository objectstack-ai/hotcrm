---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed, and the gate itself
(`scripts/check-source-token-ratchet.mjs`) is not touched at all — the pin reads
it, it does not edit it.

The ratchet header records two re-anchorings that were **declined as raises** on
the 2026-08-26 run:

    business semantics  anchor( 82,489) =  87,000  > ceiling  85,000  2026-08-26
    authored total      anchor(133,840) = 141,000  > ceiling 140,000  2026-08-26

Both figures were correct and both were unpinned: nothing in `test/` mentioned
them, so either could rot into a false claim silently. #1341 had reflowed them
out of a wrapped sentence into worked rows shaped like the table above them
precisely so they could be pinned by content; this is the follow-through.

The pin lands in `test/source-token-ratchet.test.ts`, inside the describe block
that already parses the header table, reusing its `source()`, `num()`,
`rows()` and `runs()` helpers — a second file parsing the same artefact is the
defect class this closes, not a way to close it.

It asserts the claim, not the digits. For each declined row: the stated figure
is exactly `anchor(reading)`; the ceiling it is weighed against is the constant
committed below it; that figure is **greater than** that ceiling — the "declined
as a RAISE" claim itself, which is what a reflow could otherwise destroy while
keeping every digit; and the reading is the one the anchoring run named on the
row actually produced. Non-vacuity is structural rather than a hand-kept list:
the declined labels must equal the committed ceilings whose table row is not
dated the latest run, so a header that stops parsing fails instead of passing
empty, and a legitimate future re-anchoring retires its own row.
