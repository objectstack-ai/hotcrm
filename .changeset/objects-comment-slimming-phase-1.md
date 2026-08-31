---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata behaviour changed: no object, field,
view, label, validation, index, `description` key or hook handler logic. The
built artifact is byte-identical.

Phase 1 of the `src/objects/` comment sort: delete issue archaeology, keep every
load-bearing platform constraint tightened to the constraint itself.

In a reference app the comments ARE every fork author's input, and a third of
that input described a past that no longer exists — which is worse than noise for
an AI author, because it feeds stale premises. Each block was judged, not swept:
a regex over `#\d+` would have taken the platform constraints with it. What went:
"before #N it was…", PR play-by-play, the narrative of how a constraint was
discovered, and notes about removed platform features stated as history. What
stayed, and was sharpened: the QuickJS body-only hook sandbox, the
ownership-transfer gate's three doors, `delete input.x` as a silent no-op, the
readonly strip on a hook's own `ctx.api` write, CEL nested paths not being
pushdown-able, `$regex` compiling to a LIKE substring, formula fields having no
physical column, the SQLite boolean round-trip, and the rest.

Where a note existed only to stop a future author re-introducing a defect, it was
rewritten forward — "⛔ never do X, because Y" rather than "X used to be here and
broke". Same protection, no history.

Measured with the same instrument both ways: comment blocks that cite an issue
number fell from 70.6% of `src/objects/` comment mass to 39.4%.
