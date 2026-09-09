---
---

Agent-facing documentation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
that `.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). The package is `private: true` with no `files[]`, and the only changed line lives
in `.github/tasks/autonomous_feature_dev.md`. Nothing under `src/` moves: no object,
field, view, dataset or exported symbol changed.

`.github/tasks/autonomous_feature_dev.md` — the copy-paste brief that puts an agent in the
Autonomous Development role — closed with a self-correction bullet telling it to "Ensure
all foreign keys (`reference_to`) point to valid objects defined in Phase 2". `FieldSchema`
has no `reference_to` key. Measured against the pinned `@objectstack/spec` 17.3.0, the
engine answers:

    Unrecognized key(s) on this field: `reference_to`. Did you mean `reference_to`
    -> `reference`? Until this shape was closed these were dropped silently — the
    field was still created, minus whatever the key was meant to constrain, protect
    or compute.

That tail is why this outlived a spelling fix: an author following the brief got a field
that was created but silently stripped of the constraint they wrote. The brief is also the
worst place for it to survive, because it is handed to an agent as a whole prompt and its
`architect.md` role file names no field factory at all.

This was the **fourth and last** site in the repo teaching that key. PR #1809 corrected the
other three — `AGENTS.md` at `:62`, `:141`, `:348` and `.github/instructions/metadata.md` —
and recorded this one as deliberately unfixed there, being outside that card's file surface.
Both changesets ship in the same release; this one closes the set.

The replacement mirrors the wording that landed rather than coining a third phrasing for one
rule. "lookup / master-detail targets" and "name real objects" are `AGENTS.md`'s own Phase-3
self-correction checklist entry; the factory parenthetical `Field.lookup(...)` /
`Field.masterDetail(...)` is the spelling `AGENTS.md` uses at both of its constraint sites.
The brief's own "defined in Phase 2" anchor is kept, so the bullet still points at the phase
that authored the objects.

Measured at this commit, each zero paired with a control that must hit:
`reference_to` now has **0** matches under `.github/` (control: `Field.lookup` returns 2
there, so the pathspec is live), and **0** teaching sites repo-wide. The 10 remaining
matches are all non-teaching and deliberately untouched: 3 in PR #1809's own changeset
(release-notes history), 2 under `docs/archive/2026-02/` (an archived direction), and 5
lines across 4 `test/*.ts` files that read the key as a tolerant alias — epic #1579's
territory.
