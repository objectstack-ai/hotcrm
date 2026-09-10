---
---

Comment and internal-docs text only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). It is preferred over the label here because a file lands inside the diff the
Changeset Check compares against the base, where a label is a separate write that a
later group label PUT can strip without anyone noticing.

Every changed line is inside a TypeScript comment under `src/`, or inside
`docs/architecture/module-split-plan.md`, which is internal maintainer documentation and
ships in no package. Proof rather than assertion: the repo's own authored-source measure
(`authoredText()` from `scripts/check-source-token-ratchet.mjs` — comment-stripped and
blank-stripped) is byte-identical across all 18 changed `.ts` files, base `262c78e0` vs
this branch, with the controls that make that reading mean something (all 18 raw sources
DO differ; the same measure detects an injected one-line code change). `pnpm
hygiene:tokens` reads exactly as it does on the base commit — business semantics ~85,799,
interaction layer ~38,585, authored total ~139,029.
