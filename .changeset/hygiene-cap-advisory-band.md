---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Same route as `.changeset/script-entry-point-guard.md`.

`pnpm hygiene`'s 100KB file-size check was silent at 99% of the cap and red at
101%, so the signal always arrived as a failed run on somebody else's change.
It had done that three times: `test/metadata-references.test.ts` was found with
817 B of headroom left, `src/data/index.ts` with ~1.5 KB, and
`test/docs-drift.test.ts` with 2,654 B — the last of which forced an unrelated
PR to re-home a rule mid-implementation. Every one of those margins is smaller
than a single median commit's growth, which is to say there was no lead time at
all.

The check now also names files that have reached **70% of the cap without
passing it**, as an advisory that reports and does not fail. Today that is two
files, `src/translations/es-ES.ts` (75.3%) and `src/translations/ja-JP.ts`
(73.4%) — neither a defect, both far enough along that splitting either is a
scheduled job rather than a detour.

The cap itself is unchanged at 100KB. The advisory cannot make an oversized file
pass: it is a separate reporter that never touches the failure list, and it
reads the same file list the cap check reads, so the two cannot come to disagree
about what a source file is.

70% rather than the 90% first suggested, for two measured reasons. Single-commit
growth of an existing code file runs to 13.7 KB at p99 (13,927 B observed max),
so a 90% band — 10,240 B — is narrower than one large commit and a file could
cross it whole without ever being named, reproducing the silent-then-red failure
10 KB lower down. And a warning is only useful if it is seen on one PR and
actionable on the next, which is two commits of headroom; 70% gives 30,720 B,
about 2.2x that p99. At 90%, zero of the repository's 333 source files would be
named at all.

No `src/` metadata changed; the app bundle is byte-identical.
