---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Same route as `.changeset/hygiene-cap-advisory-band.md`.

`scripts/check-source-token-ratchet.mjs` is a shrink-only ceiling on the
authored surface, and it had been asking to be tightened. #1316 removed the
inert `list.tabs[]` block from every view file, which dropped the interaction
layer from ~39,084 to ~37,424 estimated tokens — far enough below the committed
42,000 ceiling that the gate's own re-anchor advisory started firing on every
run. The ceiling is now `anchor(37,424)` = **40,000**, derived with the script's
own exported helper rather than hand-rounded, and the advisory is silent again.

Lowering needs no ruling: the gate's own discipline says a ceiling may be
lowered by any PR that shrinks its scope, and this one records that the scope
shrank.

The other two ceilings are deliberately untouched. On the same run `anchor()`
would set business semantics to 87,000 (committed: 85,000) and the authored
total to 141,000 (committed: 140,000) — both *above* what is committed, so
re-anchoring either would be a **raise**, which sits on the maintainer floor.
A shrink-only ratchet re-anchors a layer only when `anchor(reading) < ceiling`;
the docstring now says so, so the question does not get re-opened.

The worked table in the script's docstring, which derives each ceiling as
`reading × 1.05 -> ceil 1k -> ceiling`, is updated to match line for line. It
now also names the run each row was anchored from — the three rows no longer
come from one run — and states that its `headroom` column is the headroom at
anchor time, not the live figure the gate prints.

No `src/` metadata changed; the app bundle is byte-identical.
