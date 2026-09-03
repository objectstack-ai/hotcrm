---
'hotcrm': patch
---

Call `crm_case` 工单, everywhere Chinese is spoken. Maintainer ruling,
2026-08-31: 「crm_case  统一叫工单。」

**What a user sees change:** the object's Chinese label. The console showed
「服务案例」 — on the object header, the record rail, the sidebar entry, and the
case-number field — while the docs a reader searched with mostly said 「工单」.
The pack now says 工单 in all six places it named the object: `label`,
`pluralLabel`, `description`, `case_number`, the `nav_case` sidebar entry, and
`crm_knowledge_article.related_to_case` (来源工单, matching the 关联工单 its two
sibling objects already used). `en`, `es-ES` and `ja-JP` are untouched — they
carry `Case` / `Caso` / `ケース`, not a Chinese term, and the ruling is about
the Chinese word.

**How bad it actually was.** One object answered to five Chinese names at once,
each inside something already green: 服务案例 in the pack, 工单/工單 on 29
zh-Hans and 27 zh-Hant pages, 案例 on 14 and 15 more, 案件 in
`sharing-coverage.test.ts`'s zh-Hant ledger and the three zh-Hant pages it
covers, and 个案 on `whats-new.zh-Hans.mdx`. Five zh-Hans pages and five
zh-Hant pages used two of them on one page. 33 Chinese pages move to
工单/工單; every one of the 92 Chinese occurrences was read before it was
changed, and all 92 were this object. (`ja-JP.ts` uses 案件 in
`crm_opportunity`'s description — 「商談・案件」, a Japanese word about a
different object. It is why this is not a tree-wide replace.)

**Why it could drift that far.** Three test ledgers pinned this object's row
label — the sharing tables, the automation flow table, the state-machine roster
— and each compared its own page to its own ledger and nothing else. Three
guarded tables, three spellings, all passing. Nothing in the repo compared a
ledger to the language pack, and nothing compares one ledger to another.

So the ruling's third part lands with the rename rather than after it:
`test/docs-object-term-consistency.test.ts` derives the Simplified term from
`objects.<name>.label` in the zh-CN pack — the same string the app resolves —
and fails on any retired spelling reaching a zh-Hans page, a zh-Hant page, the
pack itself, or a string literal in any ledger under `test/`. Delete the word
instead of unifying it and it fails too: the surviving term has to be on the
pages, and the three ledgers have to still carry a row. Traditional is authored
rather than derived, because the app ships no Traditional locale (the console
falls back to Simplified) — so there is no field to read it from, and the guard
checks it is a genuinely different string that genuinely appears.

Adding a second object to that guard is one ledger entry.
