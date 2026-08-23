---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

The three scripts under `scripts/` that decide whether they were launched
directly each hand-rolled that comparison, and two of them compared
`import.meta.url` (the realpath) against `process.argv[1]` (the path as the
caller spelled it). Invoked through any symlinked path the comparison is false,
`main()` never runs, and the process prints zero bytes and exits 0 — a gate that
measures nothing, reading as a pass. All three now route through one shared
`scripts/lib/main-module.mjs`, and `test/script-main-guard.test.ts` holds the
whole class: `process.argv[1]` may be read in exactly one file, and every
guarded script is spawned through a symlink and must speak.

No `src/` metadata changed; the app bundle is byte-identical.
