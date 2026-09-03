---
'hotcrm': patch
---

Name the Setup app in English on the seven zh-Hant sites that still spelled it
設定 with no arrow — `administration/sandbox-and-releases`,
`administration/setup`, `reference/performance-and-limits`,
`reference/security-and-compliance` and `service/sla-and-escalation`.

The convention is not a style preference. The platform ships `en` / `zh-CN` /
`ja-JP` / `es-ES` and no Traditional-Chinese pack, so a zh-Hant reader's console
falls back to **Simplified**. A Traditional page therefore labels platform
navigation in English rather than mix Simplified glyphs into Traditional prose.
(It is not because the reader sees an English UI — that reason was measured
false and is retired.)

Three of the seven were self-contradicting inside a single sentence: they spelled
the app 設定 and then cited a path through it in English on the same line.

- 「不是本租戶設定裡的某一頁；設定裡唯一與雲相關的入口是 **Setup → Cloud Connection**」
- 「設定裡真正提供的是 **Setup → System Overview**」
- 「**設定裡沒有 SCIM 頁面。**」 … 「位置是 **Setup → SSO Providers**」

Every replacement is the label its English twin already uses, taken verbatim
rather than translated back: "not a page inside this tenant's **Setup**", "what
**Setup** does ship", "**Setup** ships no SCIM screen", "point your team at the
repository, not at **Setup**", and "not on a **Setup** screen" for the three
denial lines in `administration/setup` and `service/sla-and-escalation`. Those
last three read as generic ("any settings screen") until the twin is opened;
the twin capitalises Setup as the app in all three, so all three are the same
defect and are converted. A denial stays a denial — only the app name changes.

⚠️ 設定 is also the ordinary Chinese word for *configure*, and most of its 297
occurrences across the 67 zh-Hant pages are that: 權限設定檔 (Profile, 87
occurrences), 設定變更 / 設定項 (a config change, a setting), 偏好設定, and the
verb itself. All 297 were graded; the seven above are the whole defect class.
Deliberately untouched: `guides/email-and-calendar`'s three 設定頁, which describe
a **Settings** page the twin itself marks *(not shipped)*; the docs-site's own
page titles and cross-links (設定清單 = *Setup Checklist*, 「管理 › 設定」), which are
documentation navigation and are translated in every locale by design; and the
audit-category row 「**設定**」, which renders the twin's **Configuration**.

The guard cannot see this shape, and no rule was added here. All three rules of
`test/docs-setup-navigation-names.test.ts` are structurally blind to it: rule 1
bans only names the platform ships *nowhere*, and 設定 is both a live `zh-CN`
label and an ordinary word, so it can never be listed there; rules 2 and 3 need
a bold `**App → …**` path, and this shape has no arrow. The guard is green
before and after this change — 18 tests, unmoved — which is the expected
result, not a passing grade for the prose.

Prose only — no navigation path changes, no source change, no guard change.
