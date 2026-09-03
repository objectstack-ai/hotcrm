---
'hotcrm': patch
---

Spell platform navigation in English on the last three zh-Hant pages that still
named it in Chinese — `administration/state-machines`, `guides/import-and-export`
and `reference/faq`.

The convention is not a style preference. The platform ships `en` / `zh-CN` /
`ja-JP` / `es-ES` and no Traditional-Chinese pack, so a zh-Hant reader's console
falls back to **Simplified**. A Traditional page therefore labels platform
navigation in English rather than mix Simplified glyphs into Traditional prose.
(An earlier statement of this convention gave a different reason — that the
reader sees an English UI — which was measured false and is not the reason here.)

These three pages were missed by the sweep that converted the other eight
because none of their citations is a live path a reader is sent to. Each names a
screen in order to say it does not exist, and the shapes that carry the name are
all invisible to the bold-path rule in `test/docs-setup-navigation-names.test.ts`,
which extracts a citation only when the bold span *opens* with an app word:

- a bold denial that opens with the denial, not the app word —
  `**不存在「設定 → 資料」選單。**`
- a path inside inline code — `` `設定 → 資料` ``, `` `設定 → 隱私 → 資料主體請求` ``
- a path in plain prose with no bold at all — 「設定 → 營業時間」
- a group named with no arrow to parse — 「設定裡也沒有對應入口」

So the prose was correct and the guard was right to stay silent; what was wrong
was the vocabulary. `reference/faq.zh-Hant.mdx` denied *Business Hours* in
Chinese three paragraphs after citing **Setup → Audit Logs** in English, and
`administration/setup.zh-Hant.mdx` denies that same screen as
「不存在「Setup → Business Hours」這個畫面」 — the product's own word, spelled two
ways for a reader comparing the two pages.

Every replacement is the label its English twin already uses, taken verbatim
rather than translated back. The one that was wrong in a second way is
`guides/import-and-export.zh-Hant.mdx`, which listed the Setup app's nine
navigation groups in Traditional as a roster the reader is told to check against
their own sidebar — a sidebar that renders none of those nine that way. It now
reads *Overview*, *Apps*, *People & Organization*, *Access Control*, *Approvals*,
*Configuration*, *Diagnostics*, *Integrations*, *Advanced*, matching both the
English page and the landed roster on `administration/sandbox-and-releases.zh-Hant.mdx`.
Note the sixth: the Traditional text spelled it 設定, which reads as *Setup* but
names the **Configuration** group.

Prose only — no navigation path changes, no source change, and no guard change.
Widening the citation rule to see denials was considered and rejected: those
sentences are deliberate, and a rule that flagged them would go red on correct
documentation the last three PRs wrote on purpose.
