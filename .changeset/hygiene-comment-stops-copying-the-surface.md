---
---

CI comment only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, or hook handler logic.

The comment above the source-hygiene step in `code-quality.yml` no longer lists
the trees the gate scans. That list was a hand-maintained copy of the surface
constants in `scripts/check-source-hygiene.mjs`, and it went stale three times
(#818, #1235, #1313) — the step name one line up had the same defect, and #1139
fixed it the same way, by removing the enumeration rather than re-typing it.
The sentence about a vanished surface is generalised in the same move: the
script has two such guards, one for a scanned directory and one for a scanned
root file, each failing with its own message, and the comment described only
the first. What stays is the durable half — why the step exists at all, in
place of three `continue-on-error` greps over a `packages/` tree this repo does
not have — plus a pointer to the banner the script prints on every run, which
is now the single place that reports the current surface.
