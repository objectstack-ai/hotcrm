---
---

CI and test tooling only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label). The
diff touches `test/` and comment text in `.github/labeler.yml`; it opens no file `objectstack
build` reads, so the published artifact and the documentation site are byte-identical to `main`.

`test/labeler-config.test.ts` stated an invariant — every path glob must match something in the
tree — and enforced it over exactly one file. `vitest.config.ts` then carried a coverage
`include` naming a directory the ADR-0130 layout move had emptied; vitest enforces no threshold
over an empty include set, so `pnpm test:coverage` exited 0 reporting 0% and four coverage
floors guarded nothing for a month (#1924 / PR #1932).

`test/config-glob-liveness.test.ts` now runs that invariant over every other config in the repo
that carries a path glob: `vitest.config.ts` (read by importing the config vitest itself
resolves), every `tsconfig*.json` found by walking the tree, and every `paths:` filter in every
workflow. Globs resolve against the directory that declares them, deliberately-empty globs sit
behind an exemption roster that carries a reason per entry and goes red when an exemption stops
being needed, and the guard was verified by making it fail: a temporary dead glob planted in each
of the three readers turned the suite red, and removing it turned it green again.
