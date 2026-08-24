---
---

Test tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

The docs-drift guard's `headingLabel()` stripped only *leading* non-letters, so a
fumadocs explicit heading id — `## 📈 Sales Performance [#sales-performance]` —
was carried into the label and no longer matched the dashboard's own `label`. The
guard then reported `has no section for: Sales Performance` about a page whose
section was right there, pointing the reader at the heading text instead of at
the matcher. Every heading on the `analytics/dashboards` pages opens with an
emoji, so their slugs all lead with a hyphen and an explicit id is the one clean
way to give such a section a stable anchor — which this closed off.

The helper now drops a trailing explicit id first, using fumadocs' own regex
copied verbatim from the version `apps/docs` pins, and lives in
`test/helpers/heading-label.ts` with `test/heading-label.test.ts` pinning both
directions: an id-bearing heading resolves to the same label as one without, and
headings whose visible text differs still resolve apart.
