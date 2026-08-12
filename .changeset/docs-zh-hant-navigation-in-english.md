---
'hotcrm': patch
---

Spell platform navigation in English on the Traditional-Chinese pages, and
re-judge each name while doing it (#1113, sub-class 3 — the last one).

Thirteen navigation names across eight `.zh-Hant.mdx` pages named screens that
exist in **no configuration of the product**. The reason is structural rather
than editorial: the platform ships `en` / `zh-CN` / `ja-JP` / `es-ES` and **no
Traditional-Chinese pack**, so a zh-Hant reader is looking at the English UI
while the page tells them to click 「設定 → 使用者」. Several of the thirteen
were faithful translations of a label that really exists, which is precisely
why none of them could be found on screen. The pages now use the English path
the reader actually sees — the convention `getting-started/quick-tour.zh-Hant`
already followed — and say once per page why a Chinese page prints English
navigation.

Rendering the label in English was only half of each fix, because every one of
the thirteen was also an instance of one of the two earlier sub-classes wearing
a Hant costume. Each was re-judged against what ships before being translated:

- **Real labels, wrong spelling only** — 使用者 → **Setup → Users**, 整合 →
  **Setup → Integrations**.
- **Invented screens** (sub-class 1) — 公司資訊 → **Setup → Company**, 共用設定
  → **Setup → Sharing Rules**, 權限設定檔 → **Setup → Permission Sets**, each
  with the same plain statement its English twin carries that Setup ships no
  *Profiles* entry.
- **Right name, wrong app** (sub-class 2) — 自動化 and 電子郵件範本 are
  **Studio → Automation** and **Studio → Integration → Email Templates**; the
  validation-rule path 設定 → 物件 → 驗證規則 → 新增 was a four-step path of
  which no step exists, and now says what the English page says: a rule is a
  `validations[]` entry in `src/objects/*.object.ts`, not a screen.
- **Denials that survive as denials** — 潛在客戶設定 and 變更包 name screens
  the product does not have. Those sections now state that, and describe what
  really happens: an ownerless lead goes to whichever holder of `sales_rep` has
  the fewest open leads (`src/objects/lead.hook.ts`), and a package here is the
  platform's own unit, listed at **Setup → Packages** and **Studio → Packages**
  and built from source. On `guides/email-and-calendar` the two 「尚未落地」
  sections keep their Chinese wording and simply drop the arrow form, because
  there the **surface itself** is what is being denied — pointing them at a
  live path would contradict the page's own "HotCRM ships none of it today".

This also clears the two half-converted pages the earlier passes disclosed:
`administration/sandbox-and-releases.zh-Hant` (whose 變更包 sections were left
stale while its 沙箱 sections were fixed) and the
`administration/automation.zh-Hant` / `reference/glossary.zh-Hant` twins.

The quarantine ledger in `test/docs-setup-navigation-names.test.ts` reaches
**zero** — every bold navigation citation in `content/docs/**` now resolves
live against what `@objectstack/platform-objects` ships. The empty ledger is
kept rather than deleted: it is still staleness-checked in both directions, so
the zero is asserted rather than merely absent, and the next wrong name still
has something to fail against.

Documentation only — no metadata, behaviour or field changes.
