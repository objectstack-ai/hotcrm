---
---

Agent-facing documentation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). The package is `private: true` with no `files[]`, and every
changed line lives in `AGENTS.md` or `.github/instructions/metadata.md`. Nothing
under `src/` moves: no object, field, view, dataset or exported symbol changed, and
the source token ratchet is byte-identical.

`AGENTS.md` told authors to write `reference_to`, and `.github/instructions/metadata.md`
— the brief the Data Modeler reads before writing an `*.object.ts` — faithfully copied
it. `FieldSchema` has no such key. Measured against the pinned `@objectstack/spec`
17.3.0, the engine answers:

    Unrecognized key(s) on this field: `reference_to`. Did you mean `reference_to`
    -> `reference`? Until this shape was closed these were dropped silently — the
    field was still created, minus whatever the key was meant to constrain, protect
    or compute.

That tail is the reason this was worth a card rather than a spelling fix: before the
shape was closed, an author following the brief got a field that was created but
silently stripped of the constraint they wrote. The prescription and its downstream
copy are corrected together, because correcting the brief alone would have put it in
conflict with the file it is derived from.

The brief also taught a definition shape the repo does not have. TypeScript itself
is the witness for the import half:

    error TS2305: Module '"@objectstack/spec"' has no exported member 'ObjectSchema'.

The root exports neither a value nor a type by that name, so the taught
`as ObjectSchema` cast could never have compiled — and a cast checks nothing even
when it does. The corrected example imports from `@objectstack/spec/data`, builds with
the parsing factory `ObjectSchema.create(...)`, and exports a named `const` that
`src/objects/index.ts` re-exports for auto-registration. All 18 `src/objects/*.object.ts`
files already do exactly this, and the example now type-checks and parses end to end.

Two same-class defects in the same brief are fixed here and flagged for the seat in the
PR body rather than folded in silently. `enable.search` is not a key either
(`searchable` is), and it became load-bearing only because this PR swaps a cast that
checked nothing for a factory that parses. Field example 4's `formula:` / `return_type:`
are both rejected, and following the engine's own fix-up hint to `returnType: 'currency'`
still fails, since that enum is `number|text|boolean|date`.

One same-class instance is deliberately NOT fixed here, because it is outside this
card's declared file surface, and is reported instead: `.github/tasks/autonomous_feature_dev.md`
still instructs the agent to check that "all foreign keys (`reference_to`) point to
valid objects".
