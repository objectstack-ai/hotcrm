---
---

Tooling and tests only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration `.github/workflows/changeset-check.yml` documents). No `src/`
metadata changed: no object, field, view, label or hook handler logic.

The three sandbox suites that run `scripts/check-source-hygiene.mjs` against a
throwaway root each declared their own hand-copied copy of the gate's three
surface constants — `SCANNED`, `TEXT_SCANNED` and `ROOT_TEXT_FILES` — and
nothing checked any copy against the gate. The third suite spelled them a third
way (`REQUIRED_TREES` / `REQUIRED_ROOT_FILES`), so even a grep for a constant
name found two of the three copies.

The lists now live in `scripts/lib/source-hygiene-surface.mjs`, imported by the
gate and by all three suites. No constant value moved; the moved text is
byte-identical to what the gate carried. The gate is still runnable as bare
`node scripts/check-source-hygiene.mjs` with no build step, which is how every
workflow invokes it — a data module with no top-level side effects is
importable by construction, so nothing had to be restructured to make it safe
for a suite to import.

The drift this closes was measured on `origin/main` rather than assumed, and it
is narrower and differently shaped than the card describes. Adding a fourth root
`.ts` to the gate's list does NOT leave the suites green: in a sandbox a stale
mirror means the file is genuinely absent from disk, so the gate's own
missing-file guard fires and all three suites go red — pointing at a missing
fixture rather than at a stale mirror. The silent direction is REMOVAL: dropping
a root `.ts` from the gate's list left `source-hygiene-size-advisory` and
`source-hygiene-header-position` green while both went on materialising a file
the gate no longer reads. With the lists derived, both mutations are followed
automatically instead: the added file gains its own control-byte case (53 tests
to 54) and the removed one loses it (31 cases to 30).
