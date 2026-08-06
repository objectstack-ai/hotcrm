---
'hotcrm': patch
---

Five simplified-Chinese help bubbles now use the words the locale pack's own
labels use. A help string explains a label, so where the two disagreed the help
followed the label.

`src/translations/zh-CN.ts` was internally inconsistent in three places, and each
one sent the reader looking for a word the product never puts on screen:

| field | help said | pack's label says |
| --- | --- | --- |
| `crm_account.name_normalized` | 线索**转换**的匹配键 | `convert_lead` 转化线索 / `is_converted` 已转化 |
| `crm_lead.company_normalized` | 线索**转换**的匹配键 | 同上 |
| `crm_opportunity.win_reason` | 将商机关闭为"**赢单**"时必填 | `stage.closed_won` 成交 |
| `crm_opportunity.loss_reason` | 将商机关闭为"**丢单**"时必填 | `stage.closed_lost` 失败 |
| `crm_opportunity.crm_campaign` | 带来此商机的**市场活动** | 营销活动 (on the same line) |

The two reason fields are the sharpest case: the help quotes a stage **by name**,
and neither quoted word is in the stage picklist. A rep reading "将商机关闭为
赢单时必填" then opens the stage dropdown and finds 成交. The campaign one is the
starkest: 「市场活动」 was a zero-label word — this help string was its only
occurrence left anywhere in the repository once the documentation moved to
「营销活动」.

**Only the words used as references moved; the pack's own outcome vocabulary did
not.** 赢单/丢单 are what this pack calls a win and a loss — `win_reason` 赢单原因,
`loss_reason` 丢单原因, `loss_details` 赢/丢单详情, 赢单数, 丢单数, 赢单概率 — so
those labels are untouched, exactly as the Chinese documentation kept them. What
changed is only the word each help string quotes as a **stage value**, which is a
different fact from what the field is called.

The other three locales were checked field by field and were already consistent,
so nothing outside zh-CN changed. `ja-JP` in particular already writes what this
change makes zh-CN write — `win_reason` is labelled 受注理由 while its help quotes
the stage as 「成立」, the exact `closed_won` option label. `en` and `es-ES` build
the campaign help from the label's own head word (`Campaign` / `Marketing
campaign that generated this opportunity`), and their lead-conversion help shares
a lexeme with the convert action (`conversion` / `Convert Lead`).

Display text only: no field, option value, label, view or behaviour changed, and
no documentation page rendered any of these five strings.

Fixes #846.
