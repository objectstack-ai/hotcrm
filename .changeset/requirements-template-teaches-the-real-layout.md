---
---

Maintainer documentation only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
Nothing under `src/` or `content/docs/` moves, so the built artifact and the published
documentation site are byte-identical to `main`.

`docs/requirements/TEMPLATE.md` told every new requirement record to answer a **B** disposition
with metadata "under `src/{type}/`". That placeholder is one level short of the ADR-0130 layout:
a directory under `src/` IS a package, so the real shape is `src/{package}/{type}/`. Every
record is copied from this file, and `docs/requirements/README.md` calls a record "the spec an
agent starts from", read "before writing any `*.object.ts`" — so the template was the generator
of the three dead paths REQ-0002 carried, not another instance of them.

The bullet now reads `src/{package}/{type}/` with `src/sales/objects/` as a worked example, and
asks the record to name the barrel/array that registers the file. Landing in the right directory
is only half of registration: registration is explicit and file-by-file, and a metadata file that
no barrel re-exports — or, for the five hand-ordered collections in `objectstack.composition.ts`,
one that no array lists — is handed to `defineStack()` by nobody while `pnpm validate` still
exits 0 and names it nowhere.

Nothing else in the template changes, and no requirement record, `docs/requirements/README.md`
or guard roster is touched.
