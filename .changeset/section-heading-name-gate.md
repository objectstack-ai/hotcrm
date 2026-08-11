---
'hotcrm': patch
---

Name and translate the 66 form/detail section headings that declared only a
`label`, so they resolve through `objects.*._sections.<name>.label` instead of
rendering their raw English text in every locale (13 objects: account, case,
contact, contract, event, event_attendee, forecast, knowledge_article, lead,
opportunity, product, quote, task). Adds a structural test —
`test/i18n-references.test.ts`: "every section with a label carries a name" —
that walks the page/view tree directly and fails on any `sections[]` entry that
declares a `label` with no `name`, independent of the existing translation-
completeness assertions, which cannot see this class at all (a section with no
`name` has no key for them to check). Refs #1100, #1018.
