---
"hotcrm": patch
---

Guard page component copy in every locale, and complete the `en` bundle.

`test/i18n-references.test.ts` now walks `pages.<name>.components.<id>`, the
translation face `@objectstack/spec` 17.0.0-rc.6 added and this repo has been
filling in unguarded. The walk covers the surface the platform actually
honours — components reached through `regions[].components[]`, excluding
`page:header`, whose copy is addressed by the page name — measured in a browser
against a running server rather than read off the schema.

`src/translations/en.ts` gains the `components` face for the six pages that
carry component copy; it was the only bundle with none.
