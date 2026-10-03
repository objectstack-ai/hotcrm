---
---

CI only: `.github/labeler.yml` now covers `content/docs/**` and `content/blog/**`, the two
content roots the published documentation site sources, so a docs-only PR is labelled
`documentation` instead of coming out of the labeler with no label at all (#1925). The guard,
`test/labeler-config.test.ts`, gained the reverse assertion it was missing — every content root
declared in `apps/docs/source.config.ts` must be covered by a `documentation` glob — so the next
collection added to the doc site fails the suite until a glob covers it.

This PR releases nothing to HotCRM users, so the frontmatter above is deliberately empty (the
sanctioned "releases nothing" declaration `.github/workflows/changeset-check.yml` documents, on
par with the `skip-changeset` label).
