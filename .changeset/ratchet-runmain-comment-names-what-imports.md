---
---

Tooling comments only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration `.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed and no executable line
changed anywhere: the whole diff is comment text above one `if`.

`scripts/check-source-token-ratchet.mjs`'s run-when-main comment carried a
second copy of the false cross-check claim that was removed from the file's
header paragraph 450 lines above. The header instance landed fixed; this one
survived it, so the file spent that interval contradicting itself — and this
copy is the easier of the two to believe, because a reader arrives at the
run-when-main guard to check something else and reads the claim in passing.

The sentence was wrong three ways, independently:

- "cross-check the stripping rule against the TypeScript scanner" — no such
  cross-check exists, in that suite or anywhere in this repo. The header
  paragraph already says so at length, and says what did validate the stripper
  (a one-off hand run against esbuild).
- It named six exports as importable "so `test/source-token-ratchet.test.ts`
  can …" — that suite imports four of them (`anchor`, `fmt`, `BUFFER`,
  `CEILINGS`), and neither of the two the sentence led with. `stripComments`
  and `verdict` are imported by no test in the repo.
- "without spawning 300KB fixtures for every case" — inverted. Spawning
  fixtures IS the suite's mechanism: `beforeEach` copies the gate into a
  throwaway root, every case writes fixtures under it and runs the real gate,
  and the over-ceiling case writes 344,000 characters —
  `'x'.repeat((85000 + 1000) * 4)` — precisely to exercise the verdict.

The comment now names what is actually imported and why: `anchor`, `fmt`,
`BUFFER` and the ceilings are exported so that every figure derived from a
ceiling is derived by the test quoting it rather than transcribed beside it —
`test/source-token-ratchet.test.ts` for the header's worked table,
`test/docs-readme-token-figures.test.ts` for the README banner. That second
importer was missing from the old sentence as well.

It also states the negative instead of merely dropping the false clause, which
is what makes the claim non-re-addable by the next reader: the stripping rule
and the verdict are exercised by RUNNING this file, not by importing it, and no
cross-check against a TypeScript scanner is involved here or anywhere in this
repo.

No export was added or removed. No ceiling, `BUFFER`, stripping rule, guard or
suite changed. `stripComments` and `verdict` stay exported and unimported on
purpose: the coverage the old sentence implied is not missing — both are
asserted end-to-end through the sandbox run, byte-exactly for the stripper and
by failure text for all three verdict branches — so what remains is a question
about the module's public export surface, not about this comment, and it is
filed separately.
