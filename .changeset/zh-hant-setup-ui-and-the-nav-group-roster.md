---
'hotcrm': patch
---

Name the Setup app in English on the last two zh-Hant sites that still spelled
it in Chinese without an arrow — `administration/index`'s 「**設定 UI**」 and
`guides/integrations`'s roster of the Setup app's nine navigation groups.

The convention is not a style preference. The platform ships `en` / `zh-CN` /
`ja-JP` / `es-ES` and no Traditional-Chinese pack, so a zh-Hant reader's console
falls back to **Simplified**. A Traditional page therefore labels platform
navigation in English rather than mix Simplified glyphs into Traditional prose.
(It is not because the reader sees an English UI — that reason was measured
false and is retired.)

Site 1 is an apposition, `- **設定 UI** ——` against the twin's `- **Setup UI**
—`: the app named in Chinese and then qualified by an English noun, with no
place noun and no arrow.

⚠️ Site 2 carries a trap this repo has already paid for once. The roster read
「另外八個是*概覽*、*應用*、*人員與組織*、*存取控制*、*簽核*、*設定*、*診斷*與
*進階*」, and its sixth entry renders **Configuration**, not *Setup*. Mapping
設定 → `Setup` across that line would have been wrong twice — a mistranslated
group, plus a silent assertion that the app is one of its own navigation groups.
So all eight labels were taken **verbatim from the English twin as one block**,
not translated individually and not mapped entry by entry from the Traditional.

The nine names were checked against three independent sources beyond the twin,
and all four agree on the same names in the same order — Overview, Apps, People
& Organization, Access Control, Approvals, Configuration, Diagnostics,
Integrations, Advanced:

- the platform itself, `SETUP_APP` in `@objectstack/platform-objects/apps`,
  which declares exactly these nine groups;
- `guides/import-and-export.zh-Hant.mdx`, whose copy of this roster is already
  in English;
- `administration/sandbox-and-releases.zh-Hant.mdx`, likewise.

Site 2 was self-evidencing before the twin was opened: the same sentence already
writes **`Setup → Integrations`** and 「平台 Setup 應用」 in English while listing
that app's own groups in Traditional.

⚠️ 設定 is also the ordinary Chinese word for *configure*, so a sweep here has
to grade, not match. All 289 occurrences across the 68 zh-Hant pages were graded
on today's tree: 87 are 權限設定檔 (*Profile*), 8 are the docs site's own page
titles and cross-links (設定清單 = *Setup Checklist*, 「管理 › 設定」), and the
remaining 192 are the verb or the common noun (設定變更, 設定項, 部署設定, 可設定).
Two were the app. Deliberately untouched, as in the twin: 「這張表原先印出的那些
設定路徑」, which glosses the twin's lowercase *setup paths*, and the neighbouring
「每一次設定變更」 / 「測試設定變更」, which gloss *config change*.

Prose only. No guard change: `test/docs-setup-navigation-names.test.ts` is
18/18 green before and after, and its rule-2 citation count is unchanged at 142
(Setup 86, Studio 42, 设置 14, 設定 0) — neither site has the bold `**App → …**`
shape any rule can see, which is why both survived the sweeps that produced them.
