---
'hotcrm': patch
---

Restate `AGENTS.md` §🔒 Schema Validation Requirements around where validation actually
happens, replacing seven per-type `XSchema.parse()` prescriptions that no file under `src/`
follows.

The section opened with "All metadata files MUST be validated against their corresponding
`@objectstack/spec` schemas" and then listed one `XSchema.parse()` call per metadata type.
Measured on the tree rather than on the type signatures: `.parse(` appears in `src/` **zero**
times (control: `Field.` matches 25 files, so the zero is a real reading and not a broken
pattern). An agent following the list wrote a call with no in-repo precedent to pattern-match
against — the same failure this repo has now corrected twice on this surface (#1229 `filter`
vs `where`, #1436 flows), and the reason a wrong instruction here is worse than no
instruction.

Repairing the seven items in place was the other option and was rejected on the measurement.
The list's organising principle — one schema symbol per metadata type — is not how this app
is authored. What the tree actually contains is **three** authoring forms and **one**
enforcement point:

- a validating constructor called in the file (`ObjectSchema.create()` in 18 object files,
  `defineView()` in 14 view files, `defineSkill()` in 6 skill files);
- a typed object literal with no runtime call (pages, dashboards, flows);
- a plain literal with no `@objectstack/spec` import at all (permission sets in
  `src/profiles/`, sharing rules).

All three converge on `defineStack()` in `objectstack.config.ts`, which `pnpm validate` and
`pnpm build` run and which the platform parses again at registration on boot. `AGENTS.md`
named none of those four functions anywhere in the file, while `docs/ARCHITECTURE.md`,
`docs/developers/code_examples.md` and `README.md` all already described them correctly.

Confirmed by ablation rather than assumed. With an unknown key added on disk to a page
(a typed literal) and to a permission set (a file that imports nothing from the spec),
`pnpm validate` exits 1 with `✗ pages.7: Unrecognized key(s) on this page` and
`✗ permissions.1: Unrecognized key(s) on this permission set`; it passes on the restored
tree. Nothing in either metadata file performed that check.

Two traps the old list could not express are now written down, both measured:

- `defineFlow()` is exactly `FlowSchema.parse(config)` and is **not** the authoring form for
  `src/flows/`, even though the sibling `defineView()` and `defineSkill()` *are* the form for
  theirs.
- a metadata file that is never re-exported from its `src/{type}/index.ts` barrel is
  validated by nothing: a valid new object file left out of the barrel leaves `pnpm validate`
  at exit 0, still reporting `Data: 18 Objects`, naming the new file nowhere.

`XSchema.parse()` is kept and correctly placed: the schemas are real exports that do carry
`.parse()`, and calling one is right in a test or when building metadata programmatically —
`content/docs/customization/testing-and-ci.mdx` shows that shape and
`scripts/analytics-reconcile/run.ts` calls `DatasetSchema.parse()`. It is not the authoring
form for `src/`.

The File Suffix Protocol one section earlier is brought into agreement, since the two
sections disagreeing with each other is what produced this card: `*.object.ts` said
`ObjectSchema.parse()`, and `*.permission.ts` named a suffix this app authors nowhere — its
permission sets are `src/profiles/*.profile.ts`.
