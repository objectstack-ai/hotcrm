---
---

`test/docs-view-rosters.test.ts` only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
that `.github/workflows/changeset-check.yml` documents). No `src/` metadata and no
`content/docs/**` page changed: no object, field, view, label, flow or hook, and not one
byte of any roster the guard reads.

The English list-view roster gained the name-column coverage rule the two translated
faces got in #1557. The rule it joins asks `body.includes(label)` — does the name appear
anywhere in the section, prose and bullets included — which is blind to multiplicity by
construction and blind to an omission whenever the prose still mentions the dropped name.
Measured on the tree #1561 landed: renaming `service/cases.mdx`'s **Escalated Cases** row
to **All Cases** leaves the name column naming *All Cases* twice and never naming
*Escalated Cases*, row count unchanged, and the file ran 11 passed. Nine of the fifty-five
English name cells echo their view name in the section body outside their own row, so
those nine rows were the ones no rule protected.

The body-shaped rule is kept and is now labelled for the job it actually does. Measured,
it is not the wider net it was taken for: name-column coverage strictly implies body
coverage, so every label the body rule reports missing is one the new rule reports missing
too. It stays as a diagnostic — when both fire the view is named nowhere in the section
and the page needs writing; when only the new rule fires the view is named in prose but
has no row — and the header now says exactly that instead of claiming coverage it does
not add.
