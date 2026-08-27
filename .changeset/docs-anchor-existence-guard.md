---
---

CI/docs tooling only — this PR ships nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

What it adds is a guard: `test/docs-anchor-links.test.ts` resolves every
anchored link under `content/docs` against the heading ids **fumadocs itself**
emits, via `remarkHeading` from `fumadocs-core/mdx-plugins` — never against a
slug rule written a second time here. It also fixes the nine dangling anchors
the guard found on `origin/main`, and records in `.github/workflows/link-check.yml`
why that job keeps `file-extension: '.md'` instead of being widened to `.mdx`.

The four `devDependencies` this adds (`fumadocs-core`, `remark`, `remark-mdx`,
`remark-frontmatter`) are the renderer's own pipeline. They are dev-only, and
`.stackblitzrc` installs with `--omit=dev`, so the demo container is untouched.
