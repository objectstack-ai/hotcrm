---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Project Delivery: a budget that is not ready to approve is refused in one whole sentence in Chinese, Japanese and Spanish (#2766).** Before, sending an incomplete budget version for approval, or sending a project for approval with an incomplete version 1, answered a Chinese, Japanese or Spanish user with a sentence whose middle was English, for instance `预算还不能提交审批：the labor line "现场配置顾问" names no rate card. 请补全后再提交。` Now each of the five cases (the budget has no lines; a labor line names no rate card; a labor line has no hours; another line has no quantity; the total is zero) reads as one sentence in the user's language and still names the line, for instance `预算还不能提交审批：人工明细“现场配置顾问”没有选择费率卡。 请补全后再提交。` The English wording is unchanged. For an integration that reads the refusal's `reason`: `not_ready` on a budget version and `budget_incomplete` on a project are replaced by `budget_no_lines`, `budget_labor_no_rate_card`, `budget_labor_no_hours`, `budget_line_no_quantity` and `budget_total_zero` on both, and the `problem` param by `line` (the line's description).
