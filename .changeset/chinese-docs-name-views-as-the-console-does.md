---
'hotcrm': patch
---

Chinese docs pages name list views the way the Chinese console labels them.

`content/docs` ships three locales, and the roster tables on the Chinese faces
named views two different ways. `revenue/contracts` and `sales/activities`
used the `zh-CN` locale-pack wording; `service/cases`, `marketing/campaigns`
and `revenue/products` spelled the same column in English. Both spellings were
shipping, on adjacent pages, in the same locale.

What the reader sees on screen is the locale-pack label — the console resolves
a view's `label` through `src/translations/zh-CN.ts`. So the English-spelling
pages named things the Chinese UI does not call them: a reader could not search
the interface with the string the page gave them. This rewrites those three
pages, on both Chinese faces, to the pack wording:

| view (`src/views/*.view.ts`) | was | now (`zh-CN` pack) |
| --- | --- | --- |
| `all_cases` | All Cases | 全部工单 |
| `case_workflow` | Service Workflow | 服务流转 |
| `sla_calendar` | SLA Calendar | SLA 日历 |
| `case_timeline` | Case Timeline | 工单时间线 |
| `escalated_cases` | Escalated Cases | 已升级工单 |
| `unassigned_triage` | Unassigned — triage | 未分派 — 待分诊 |
| `sla_at_risk` | ⏰ SLA at Risk | ⏰ SLA 风险预警 |
| `my_open_cases` | My Open Cases | 我的待处理工单 |
| `all_campaigns` | All Campaigns | 全部营销活动 |
| `campaign_gantt` | Campaign Schedule | 活动排期 |
| `campaign_calendar` | Launch Calendar | 活动日历 |
| `campaign_timeline` | Marketing Timeline | 营销时间线 |
| `all_products` | All Products | 全部产品 |
| `product_catalog` | Product Catalog | 产品目录 |

Prose references to those same views are rewritten with the table, because the
table and the sentence beside it have to agree: one page said the kanban "is
called Service Workflow, and that is what the tab reads", which the tab does
not. Names that are **not** views keep their spelling — the `Critical Cases`
and `SLA Violations` metric tiles, the `Escalated Cases Sharing` sharing rule,
and the phantom names the pages exist to debunk.

The `zh-Hant` face has no locale pack of its own and its names are a
hand-maintained chain: nothing produces them and nothing checks them. They are
written here by the convention the shipped `zh-Hant` pages already follow.
