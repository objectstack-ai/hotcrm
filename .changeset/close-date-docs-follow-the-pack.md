---
'hotcrm': patch
---

Chinese docs pages name `close_date` the way the Chinese console labels it.

`crm_opportunity.close_date` is declared `label: 'Close Date'`
(`src/objects/opportunity.object.ts`) and the `zh-CN` pack resolves it to
预计成交日期 (`src/translations/zh-CN/objects.pipeline.ts`). The Chinese doc
faces spelled it two ways at once: 56 sites across 16 pages used a coined short
form 成交日期/成交日期, against 18 that already used the pack wording. Both
spellings were shipping on adjacent lines of the same page —
`analytics/dashboards` wrote 商机预计成交日期 in three places and a bare
成交日期 in two, so a reader could not tell whether they were one field or two.

`src/` is the source of truth for a label, not the docs (#1329, AGENTS.md
§Documentation discipline rule 6), so the docs move: every coined site is now
预计成交日期 on the zh-Hans face and 預計成交日期 on the zh-Hant face, across
`analytics/cubes`, `analytics/dashboards`, `getting-started/quick-tour`,
`revenue/approvals`, `sales/leads`, `sales/opportunities`,
`sales/pipeline-management` and `sales/quotes`. That includes
`sales/opportunities`, which had deliberately kept the coined form because #1719
preferred the page's own established term to introducing a second spelling into
one table — the decision that closes the split reaches it too, or the split just
moves to a different page.

One sentence needed more than a substitution. `revenue/approvals` read
承诺成交日期前请预留审核窗口, where 承诺 modifies the field name; stacking the
four-character label straight in gives 承诺预计成交日期, two modifiers deep and
unreadable, so it is written 承诺的预计成交日期 with the label intact.

The English pages are untouched: `Close Date` is the declared label and the
English surface was never split.

The acceptance evidence is a pair of counts, and both of them need care. A naive
replacement is wrong because the coined form is a **substring** of the correct
one — it yields 预计预计成交日期 — so the rewrite is guarded by a lookbehind.
The lookbehind has to name both scripts: `(?<![预預])(?<!计)成交日期` reads 65
rather than 56, because it excludes only the Simplified 计 while the Traditional
pack form 預計成交日期 carries 計, so all nine zh-Hant pack sites are counted as
coined and the count can never reach zero however complete the fix is. It also
has to run in a UTF-8 locale: under `LC_ALL=POSIX`, `grep -P` matches bytes,
`[计計]` becomes a set of six raw bytes, and any multibyte neighbour ending in
one of them suppresses a real match (成交日期 preceded by 动 is the site in
`sales/pipeline-management` that goes missing). Measured as
`LC_ALL=C.UTF-8 grep -rhoP "(?<![计計])成交日期" content/docs/`, the corpus reads
56 before and 0 after, against `预计成交日期|預計成交日期` at 18 before and 74
after. 74 is the invariant total — every occurrence was rewritten in place, none
added and none lost, and the two faces stay at 37 each.
