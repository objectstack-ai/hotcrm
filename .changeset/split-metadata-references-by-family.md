---
'hotcrm': patch
---

Split `test/metadata-references.test.ts` into four files by the metadata surface
each guard resolves against, so the suite stops sitting one edit away from the
100KB source-hygiene ceiling.

The file had reached 99,872 bytes against the `MAX_FILE_BYTES = 100 * 1024`
limit in `scripts/check-source-hygiene.mjs` — 97.5% of the quota, roughly one
commented guard of headroom. That is not a hypothetical: #815 set out to invert
one bulk-dispatch guard, blew past the limit, and had to design and execute an
unplanned split mid-PR before its actual change could be reviewed. Every
subsequent PR touching these guards was queued up to repeat that detour.

The guards now live with the surface they check:

- `test/metadata-references.test.ts` — pages, forms, and the cross-surface
  references (formula predicates, flow conditions, `objectOverride` and
  dashboard global filters, `App.defaultAgent`)
- `test/view-references.test.ts` — view fields, sorts, filter template tokens,
  row colours, kanban groups, stage enumerations, list-view reachability
- `test/action-references.test.ts` — navigation, dashboard actions and routes,
  list-level `rowAction` / `bulkAction` references, dashboard date ranges
- `test/i18n-references.test.ts` — the four locale bundles: action labels,
  select fields and options, and locale completeness on every authored surface

The derivations all four share (`objects`, `views`, `walk`, the flattened locale
packs, the platform-object allowlist) move to `test/helpers/metadata-fixtures.ts`
so they have one definition rather than four. `test/metadata-references.test.ts`
keeps a map at the top naming which family went where.

Nothing about what is checked changed. The split moved text: no assertion,
helper, fixture or test name was edited, and the same 70 tests run before and
after (24 + 16 + 11 + 19). Two categories of byte differ inside a moved block,
and nothing else: five comments whose wording the split itself falsified
(sentences saying "the navigation guard in this file", which now name
`test/action-references.test.ts`), and two `for` statements that destructured a
`key` binding they never read — dead before the split, and reported by CodeQL
once the code landed at a new path. Largest resulting file is 33,433 bytes, 67%
below the ceiling.
