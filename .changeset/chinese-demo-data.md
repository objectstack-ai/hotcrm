---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**A Chinese organization gets its demo data in Chinese (#2411).** Every sample dataset now ships twice, declared by language on the platform's per-dataset locale filter (`Seed.locale`): the English story for `en`, `ja-JP` and `es-ES`, and a Simplified Chinese twin for `zh-CN`. An organization receives one of the two. The Chinese twin is the same story in other words, record for record: the same accounts, deals, quotes, cases, campaigns, activities and knowledge articles, with the same statuses, amounts, SLA clocks and relative dates, so every dashboard reads the same in both languages. Names, descriptions and notes are written in Chinese, people's names put the family name in **Last Name** (张伟), the thirty generated service cases read as real support tickets instead of "Demo case NN", and the Standard price book is **标准价格表**. The multi-organization (SaaS) shape ships its starter catalogue the same way.

Requires an `@objectstack` release that carries objectstack#30281, under which marketplace install, sample-data reseed and per-organization replay choose datasets by the organization's language. On a release without it those paths load both stories.
