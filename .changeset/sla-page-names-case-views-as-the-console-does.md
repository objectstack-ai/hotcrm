---
'hotcrm': patch
---

The Chinese SLA page names the eight case views the way the Chinese console
labels them, matching the sibling Cases page.

`content/docs/service/sla-and-escalation.zh-Hans.mdx` named every `crm_case`
list view in English across 14 lines, while `src/translations/zh-CN.ts` ships a
Chinese label for all eight and the console resolves a view's `label` through
that pack. The sibling `content/docs/service/cases.zh-Hans.mdx` had already been
rewritten to the pack wording, so the two Chinese pages of the same section
named the same eight views two different ways and a reader moving between them
shared no string with either the other page or their own console.

| view (`src/views/case.view.ts`) | was | now (`zh-CN` pack) |
| --- | --- | --- |
| `all_cases` | All Cases | 全部工单 |
| `case_workflow` | Service Workflow | 服务流转 |
| `sla_calendar` | SLA Calendar | SLA 日历 |
| `case_timeline` | Case Timeline | 工单时间线 |
| `my_open_cases` | My Open Cases | 我的待处理工单 |
| `unassigned_triage` | Unassigned — triage | 未分派 — 待分诊 |
| `escalated_cases` | Escalated Cases | 已升级工单 |
| `sla_at_risk` | ⏰ SLA at Risk | ⏰ SLA 风险预警 |

The emoji is carried in the one place the English face carries it — the
canonical eight-name enumeration — and dropped in running prose, so the two
faces stay line-for-line parallel.

Three surfaces are named on this page and only one of them moves. **View names**
convert, because the pack carries all eight. **Dashboard tile names** keep their
spelling: the pack does carry `SLA Violations`, `Critical Cases` and the
`Customer Service` dashboard title, but the ruling this change executes was
carried out with those same pack entries already present and deliberately left
tiles in English, and the sibling page names them in English too — converting
them here would reopen the cross-page disagreement this change closes.
**Report names** keep theirs because there is nothing to take: no locale file
declares a `reports` surface at all, so `SLA Performance Report` has no pack
wording. Sharing-rule names (`Escalated Cases Sharing`) and the phantom names
the page exists to debunk (`Breached SLA`) are unchanged, as before.

The `zh-Hant` face is deliberately untouched: a Traditional page labels platform
navigation in English on purpose, because the console falls back to Simplified
and mixed script is worse. The English face is unaffected.
