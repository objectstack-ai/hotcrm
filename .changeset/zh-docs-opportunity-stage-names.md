---
'hotcrm': patch
---

The Chinese docs now name the seven opportunity stages the way the shipped
locale pack does, and the remaining lead-convert verb face follows the action
label.

`src/translations/zh-CN.ts` is what a Chinese reader sees on screen. Four of the
seven `crm_opportunity.stage` option labels had drifted — and unlike the earlier
term fixes this was not one page getting a word wrong, it was every Chinese page
consistently using a second vocabulary the product never displays:

| value | pack ships | docs said |
| --- | --- | --- |
| `prospecting` | 寻找客户 | 开发期 |
| `qualification` | 资格审查 | 资格审核 |
| `closed_won` | 成交 | 赢单 |
| `closed_lost` | 失败 | 输单 |

`needs_analysis` / `proposal` / `negotiation` already matched and are untouched.
Both stage tables (Opportunities and Pipeline Management, zh-Hans and zh-Hant)
now carry the shipped labels, and so does every sentence that names a stage: the
drag-to-advance example, the close-reason table, the $100K alert, the approval
outcome, the quote-accepted advance, the lead-conversion step that creates an
opportunity, and the glossary's closed-won/lost entry.

**A word the pack ships nowhere is drift wherever it appears; a word the pack
does ship is only drift where it names the stage.** 开发期, 资格审核 and 输单
appear nowhere in the pack, so they are gone from the Chinese docs entirely —
except 开发期 on the integrations pages, where it means the development
environment and not the `prospecting` stage. 赢单 and 丢单 by contrast *are* the
pack's own outcome vocabulary (赢单原因, 丢单原因, 赢/丢单详情, 赢单数, 丢单数,
赢单概率), so they stay wherever they name a reason, a metric or an outcome, and
change only where the reader would go looking for that word as a stage value.
That is why 「未赢单、未丢单的交易」, 「赢单率」 and 「赢单原因」 read as before
while 「阶段会被自动设为**赢单**」 became 成交.

Where the docs paired 赢单 with the non-pack 输单 to name the two *reason
fields* rather than the stages — the state-machine close requirement, the cube
dimension, the Win/Loss report — the pack's counterpart is 丢单, not 失败, so
those became 赢单/丢单.

Two terms belonging to different objects stay separate, as the pack intends:
`crm_opportunity.stage.qualification` is 「资格审查」 and
`crm_lead._sections.qualification` is 「资格评估」. The Leads pages' 「通过资格审核」
is a thing a person does, not either label, and is untouched.

**The convert verb face.** `convert_lead` ships the label 「转化线索」, but the
Sales Copilot page named that very button 「转换线索」. That page now uses the
shipped label, and the traditional-Chinese residuals left over when the
simplified twins were corrected — Accounts, Quick Tour, Introduction, Testing
and CI, and the Traditional Sales Copilot page, which named the action
「轉換潛在客戶」 — now read 转化 / 轉化 as well.

Documentation only: the locale pack is the contract, so nothing under `src/`
changed.

Fixes #829.
