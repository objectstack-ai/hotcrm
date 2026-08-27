---
---

Tooling comments only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration `.github/workflows/changeset-check.yml` documents). Nothing under
`src/` changed, and no executable line changed anywhere: the whole diff is
comment text inside one gate's header docstring.

`scripts/check-source-token-ratchet.mjs`'s stripping-rule paragraph claimed its
scanner was cross-checked by `test/source-token-ratchet.test.ts` "against the
TypeScript compiler's own comment-trivia ranges over every real file in
`src/`". No such cross-check exists — in that suite or anywhere in the repo.
There are no executable `typescript` imports under `test/` or `scripts/`, and
no `createScanner` / `getLeadingCommentRanges` call in the tree.

The claim was unusually well camouflaged, which is why it is worth a changeset:
`typescript` really is a declared devDependency, so a reader checking the
sentence the cheap way ("is typescript a dep?") had it confirmed while the
wiring was absent. That is the failure the sentence now cannot cause — someone
wanting to know whether the stripper is validated against a real compiler was
finding the claim already made and stopping there.

What actually validated the stripper is recorded, and the paragraph now points
at it: a one-off hand run against esbuild, minifying every first-party `.ts`
file twice — as authored and comment-stripped — and comparing the two outputs
byte for byte. The record lives in the suite's own docstring under the heading
"The stripper's equivalence proof is a hand run, recorded here", together with
its figures and the reason it is not automated (`esbuild` is not a declared
dependency; it arrives under the ObjectStack CLI). The heading is quoted on a
single line in the new prose so the pointer can be grepped, not just read.

The paragraph also re-attributes the `typescript` devDependency to
`tsc --noEmit`, which is whose it is. The dependency stays; only the sentence
that leaned on it changed. The stripping rule, the ceilings, `BUFFER` and the
suite are all untouched.
