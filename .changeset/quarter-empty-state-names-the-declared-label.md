---
'hotcrm': patch
---

The 本季度待成交商机 empty state names `close_date` the way the same language
pack labels it.

`src/translations/zh-CN/objects.pipeline.ts` declares
`close_date: { label: '预计成交日期' }`, and sixty-nine lines later its own empty
state for the `closing_this_quarter` view named that field twice by a coined
short form 成交日期. A rep who opened the tab with no matching records read a
message calling the field 成交日期, while the field on every opportunity record —
and in the very quarter filter the message describes — was labelled 预计成交日期.
Both strings are shipped Chinese UI, so the reader saw one field wearing two
names at the moment the app was explaining itself.

`src/` is the source of truth for a label (#1329, AGENTS.md §Documentation
discipline rule 6), and here the contradiction was inside a single file, so the
declared label governs and the prose follows it. The message now reads
预计成交日期落在当前季度内 and 预计成交日期更晚的商机, leaving the label
declaration, the empty-state title 本季度暂无待成交商机 and the view label
untouched — none of those spell the field name.

This is the site the docs point the reader to. #1733 aligned 56 coined doc sites
onto the pack wording across 16 pages, including `sales/opportunities`, which
documents this exact tab and its quarter filter; the split it closed in the docs
survived at the one screen those pages send the reader to.

Measured in a UTF-8 locale, because `grep -P` matches bytes under `LC_ALL=POSIX`
and silently drops real hits on multibyte neighbours:
`LC_ALL=C.UTF-8 grep -rhoP "(?<![计計])成交日期" src/` reads 2 before and 0 after,
against `预计成交日期` at 1 before and 3 after — every occurrence rewritten in
place, none added and none lost. The other packs never carried the split:
`ja-JP` labels the field 完了予定日, `es-ES` `Fecha de Cierre` and `en`
`Close Date`, so no other locale spells it in Chinese characters at all.
