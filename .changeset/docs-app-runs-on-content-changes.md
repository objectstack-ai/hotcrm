---
---

CI only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, or hook handler logic.

`Docs App` is the only job in this repo that compiles the documentation site,
and it never ran for a documentation change. `apps/docs` carries its own
`package.json` and lockfile and is not part of the root pnpm project, so the
root gates have never opened one of its files — but the MDX it builds does not
live under `apps/docs` either. `apps/docs/source.config.ts` declares two
collections that read from the repo root, `content/docs` and `content/blog`,
while the workflow's `push` and `pull_request` filters listed only
`apps/docs/**` and the workflow file. A PR touching only `content/docs/**` —
the shape of nearly every documentation change here — therefore skipped the one
build that would have caught a bad frontmatter block or MDX that does not
compile, and the identical `push` filter meant it was not caught on `main`
either.

Both collection directories are now in both filters, and
`test/docs-app-workflow-paths.test.ts` keeps them there: it reads the collection
directories out of `source.config.ts` and requires every real file under each to
be *matched* by the filters, rather than comparing the lists as strings — "a
path filter that does not cover its target" is the bug being fixed, so the
presence of a path proves nothing on its own.
