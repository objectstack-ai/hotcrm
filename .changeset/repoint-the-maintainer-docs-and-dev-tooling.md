---
---

Maintainer documentation and dev tooling only — this PR releases nothing to HotCRM users, so
the frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).

ADR-0130 (#1905) made a directory under `src/` a package, and the flat `src/<kind>/` layout
stopped existing. This repoints the 207 pointer sites that still named it across
`docs/feature-inventory.md`, `docs/architecture/psa-module-plan.md`, `vitest.config.ts` and
four `scripts/` files — including `vitest.config.ts`'s coverage `include`, a live glob that
was matching **zero** files. The 39 remaining sites are records of the pre-move tree and
deliberately keep their paths.

Nothing under `src/` or `content/docs/` moves, so the built artifact and the published
documentation site are byte-identical to `main`. #1918/#1921 covered `content/docs/`, the
published half, and carried a `patch` for exactly that reason.
