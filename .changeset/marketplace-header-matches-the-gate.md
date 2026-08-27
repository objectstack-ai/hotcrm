---
---

One comment line and nothing else — this PR releases nothing to HotCRM users, so
the frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents). No `src/`
metadata changed: no object, field, view, label, flow or hook.

`scripts/publish-marketplace.mjs` opened with
`// Copyright (c) 2026 ObjectStack contributors.` while `COPYRIGHT_HEADER` in
`scripts/check-source-hygiene.mjs` is anchored
`/^\/\/ Copyright \(c\) \d{4} ObjectStack\./` — the period is required directly
after `ObjectStack`, so the file carried a licence header to every human reader
and none at all to the gate. Normalised to the canonical spelling the regex
already defines.

The deviation was one file against 335 carrying the canonical form, and it was
not a deliberate marketplace attribution: `LICENSE` is the stock Apache-2.0 text
with its `Copyright [yyyy] [name of copyright owner]` placeholder unfilled, and
the script propagates `license` from `package.json` rather than any copyright
holder — line 2 never reaches the published payload. So this is a typo being
corrected, not a licence statement being changed.

Nothing is red today and nothing goes green: `scanHeaderPosition` reads `allTs`,
so no `.mjs` is judged at all. What the fix buys is that the mismatch is no
longer waiting: widening the header check to `.mjs` would have gone red on a
file whose header a reviewer had just read and approved, which is the failure
mode that makes people doubt a working gate.

It also retires a live measurement hazard rather than documenting it. "How many
`.mjs` lack a header" had two defensible answers — this file was the whole
disagreement. Measured at this commit with the gate's own lifted regex over the
eight `.mjs` under `SCANNED`, the reader's count and the gate's count now agree:

- before: 3 of 8 by the gate's rule, 2 of 8 by `grep Copyright`
- after: 2 of 8 by both

The two still-headerless files (`check-stackblitz-lock.mjs`,
`sync-docs-screenshots.mjs`) are headerless to reader and regex alike, which is
the point — the remaining count means one thing now.

⛔ `COPYRIGHT_HEADER` was not widened to accept "contributors", and the scanned
surface was not widened to `.mjs`. Loosening a gate's predicate so a
non-conforming file passes is gate weakening; widening the scan is a separate,
larger change that this fix is the precondition for, not a part of.
