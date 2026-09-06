---
'hotcrm': patch
---

Split the four locale bundles by translation namespace and CRM domain family.
**No translated string changes** — the built `dist/objectstack.json` is
byte-identical before and after, whole artifact and not just its translation
tree, which is the proof that this is a file layout change and nothing else.

`src/translations/{en,zh-CN,ja-JP,es-ES}.ts` had grown into the largest files
in the repository. Measured on `main`, `es-ES.ts` was at 88.6% of the 100KB
source cap `pnpm hygiene` enforces and `ja-JP.ts` at 87.4%; `zh-CN.ts` had
crossed the 70% advisory band since the band was added, and `en.ts` was the
only one still outside it. The growth is not incidental and there is no version
of "stop adding translations" that fixes it: every new user-visible string in
the app adds a row to all four bundles at once. Over the eleven days before
this change the four grew 42KB between them, so `es-ES.ts` would have hit the
hard cap — a red CI check on somebody else's unrelated PR — inside a month.

Each bundle is now assembled from `src/translations/<locale>/`, and the axis
was chosen on the measured key distribution rather than on taste:

- every namespace that is **not** `objects` — `apps`, `messages`,
  `dashboards`, `datasets`, `pages`, and any namespace `TranslationData` gains
  later — lives in `app.ts`. Together they are under a quarter of a bundle, and
  the schema bounds how many namespaces can ever arrive, so one file holds them
  with room to spare.
- `objects` is 69–78% of every bundle, so it is partitioned again into one file
  per CRM domain family — `customer`, `pipeline`, `commerce`, `service`,
  `activity`, `marketing` — with a detail object following its master: line
  items follow their quote or opportunity, `crm_event_attendee` follows
  `crm_event`, `crm_campaign_member` follows `crm_campaign`, and
  `crm_article_feedback` follows `crm_knowledge_article`.

A namespace axis on its own was measured and rejected. It leaves `objects` in
one 65.7KB file, 3.9KB below the advisory band, which the measured growth of
that namespace crosses in about nine days — landing just under a threshold is
what this card was filed to stop doing. Under the family axis the largest file
in the tree is 24.2% of the cap with 46KB of headroom, and `pnpm hygiene` names
no locale bundle at all.

The public surface is untouched: `src/translations/index.ts` and
`crm.translation.ts` are unchanged, and each `src/translations/<locale>.ts`
still exports the same `TranslationData` under the same name. Those four files
are now assemblers, and they list their object keys one per line rather than
spreading the family files, because `objectstack build` serialises the bundle
into the artifact in insertion order and never sorts it — restating the order is
what keeps the build byte-identical, and each assembler says so where a reader
will find it.

Every split file's header states the axis, so the next bundle lands in the file
for its family instead of re-growing whichever file happened to be open.

One test moved with it. `test/docs-sales-index-navigation.test.ts` proved that
`nav_account_workbench` has a label in every locale by regex-scanning the locale
file's source text; that proxy broke when the bytes moved to a sibling file even
though the label had not changed. It now reads the label through
`CrmTranslations`, the surface the app and the i18n gate actually consume, which
is both layout-independent and stricter — a present-but-empty label satisfied
the old regex and fails this.
