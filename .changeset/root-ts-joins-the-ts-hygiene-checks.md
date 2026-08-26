---
---

Tooling and one licence header only — this PR releases nothing to HotCRM users,
so the frontmatter above is deliberately empty (the sanctioned "releases
nothing" declaration that `.github/workflows/changeset-check.yml` documents, on
par with the `skip-changeset` label). No `src/` metadata changed: no object,
field, view, label, or hook handler logic.

The source-hygiene gate derived its `.ts` surface from a directory list
(`SCANNED`), so the repo's three root-level `.ts` files — `objectstack.config.ts`,
`vitest.config.ts`, `playwright.config.ts` — sat outside the marker and
copyright-header checks. They had joined the control-byte check in #838, which
recorded widening the other two as "a different argument" because
`playwright.config.ts` carried no header and would have gone red. That argument
is now settled in the same direction the header check already argues for
itself: it requires the header to be PRESENT, precisely so deleting it cannot
become a way to satisfy a position-only rule, and that reasoning does not stop
at the repo root. The old boundary was an artefact of the surface being spelled
as a directory list, not a judgement that root files answer to less.

`allTs` is now the walked trees' `.ts` plus the `.ts` members of the existing
root whitelist, derived from `ROOT_TEXT_FILES` rather than listed a second time
— one list that already fails loudly when an entry disappears, instead of two
that drift. `playwright.config.ts` gained the header it was missing. The
`console.log` check stays `src/`-only and the 100KB cap stays on the walked
trees; both boundaries are now pinned by tests in either direction.
