---
---

Tooling comment only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed, and no executable line
changed anywhere: every changed line in the diff begins with `//`.

`scripts/check-source-token-ratchet.mjs`'s run-when-main footer told the next
maintainer that only two suites import from the module and that "the stripping
rule and the verdict are exercised by RUNNING this file, not by importing it".
Re-derived on `main` at `81a79ee` (2026-09-05), there are three importers:

- `test/source-token-ratchet.test.ts` — `anchor`, `fmt`, `BUFFER`, `CEILINGS`
- `test/docs-readme-token-figures.test.ts` — `BUFFER`, `CEILINGS`
- `test/docs-object-term-consistency.test.ts` — `stripComments`

The third is the one that matters. That suite is the #802 Chinese-term guard,
and it runs every `.ts` file through `stripComments` to decide what it is
allowed to see — a retired spelling may sit in a comment but not in the code.
So editing `stripComments` edits what that guard scans, and widening it makes
the guard pass by reading nothing, which is indistinguishable from clean. The
footer said the opposite: that changing this function was free.

The comment now names all three importers and what each takes, states the
consequence for the stripper in the sentence a maintainer will actually read,
keeps the parts that are still true (`verdict` really is imported by nothing;
the verdict and the gate's own stripping run are covered by the sandbox suite;
importing must not run the gate), and dates itself — it records the ref it was
derived at and the one-line grep that re-derives it, including the two files
that a name-only grep would wrongly count (`test/deal-threshold-parity.test.ts`
declares its own local `stripComments`; `test/script-main-guard.test.ts` spawns
the gate by path).

Two corrections to the written record, both verified in this tree:

- The predecessor sentence was not wrong when it was written. It landed with
  #1380 on 2026-08-30, and the `stripComments` importer landed with #802 on
  2026-09-03 — the comment was accurate for three days and then was falsified
  from another directory, with nothing in this file able to notice. That is the
  failure mode, and it is why the replacement carries its own derivation date.
- The changeset `.changeset/ratchet-runmain-comment-names-what-imports.md`
  (shipped with #1380) states that "`stripComments` and `verdict` are imported
  by no test in the repo" and that they "stay exported and unimported on
  purpose". Half of that is false today: `verdict` is still unimported, but
  `stripComments` has had an importer since 2026-09-03. That file is a landed
  release note and is left untouched; this entry is the correction of record.

The importer list was deliberately not turned into a test that pins the
comment against the real imports. A comment-to-importer consistency check is a
drift-class gate over this repo's tooling, not a pin on a HotCRM business fact,
and `AGENTS.md` reserves that class for the platform — precedent #1423, where
the comment-volume gate was deliberately not built.

This change cannot move `pnpm hygiene:tokens`: that gate counts
comment-stripped characters, so comment text is invisible to it by
construction. A green run there says nothing about whether this comment is
true, and is not offered as evidence that it is.
