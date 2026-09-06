---
'hotcrm': patch
---

The Cases page stops promising an icon on the case detail header, in all three
locales.

The header bullet enumerated "the case number and subject as the title, the
**account** as the subtitle, plus an icon, a breadcrumb and the action buttons"
— and then closed with *That is the whole header*. Everything in that list is
real except the icon: `icon` was **removed** from `page:header` in
`@objectstack/spec` 17.0.0 (#6946, ADR-0087 D2), deleted rather than renamed
because no renderer ever read it, and no `page:header` under `src/pages/`
authors one. `case_detail.page.ts` records the removal at the property it would
have sat on.

What made it worth correcting is the sentence's own claim to be exhaustive. A
list that ends "that is the whole header" gives a reader no reason to doubt any
item on it, so the one entry the renderer cannot draw was the one entry the
reader would hunt for longest. The clause is deleted and nothing replaces it:
the breadcrumb and the three action buttons in the same sentence are both real
(`breadcrumb: true`; `actions` names `escalate_case`, `close_case` and
`log_call`), so the completeness claim is now simply true — the header holds a
title, a subtitle, a breadcrumb and its action buttons, and the enumeration and
the component's properties block now agree item for item.

The Chinese faces lose the same item and keep their own register — 此外只有面包屑
和几个动作按钮 / 此外只有麵包屑和幾個動作按鈕 — rather than being re-translated
around the gap. One clause per face, three lines in total; no `src/` metadata
changed and no test or guard was added.

The sibling detail-page docs were swept for the same claim before this landed,
by behaviour rather than by the word *icon* — every page describing what a
record header holds, every completeness assertion, and the other nouns the
faces could have used (图标 / 圖示 / 头像 / avatar / logo). **The difference set
is empty**: no account, lead or opportunity page carries this sentence in any
locale. The clause was never a shared template — all three faces got it in one
commit (#946), the change that rewrote this bullet from an older stale
enumeration, at a time when `icon` was still believed to be a header property.
