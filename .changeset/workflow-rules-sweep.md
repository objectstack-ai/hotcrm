---
'hotcrm': patch
---

按平台实况清扫「工作流规则」在 automation 页之外的散布，并写实 `service/cases` 的两条虚构通知（#850 / #887）

ObjectStack 已退休独立的工作流规则类型（ADR-0019 / ADR-0020）——不存在 `workflow` 元数据类型、stack 上没有 `workflows` 集合、**Studio → Automation** 下只有 *Flows*（证据链见 PR #854）。automation 页在 #833 / PR #854 里已对齐实况，但另外 8 个页族 ×3 语言仍在讲这个类型，其中 4 处把「阈值 / 收件人在哪配」指向了这个不存在的配置面。本次逐处按语境写实，共 12 行 ×3 语言：

- **指向不存在配置面的 4 处**改指真实位置，并如实写明这些是**源码作者面而非 Setup 界面**：$100K 大单阈值是 `src/flows/opportunity-won-alert.flow.ts` 里 `opportunity_won_alert` 流程的 CEL 起始条件（`record.amount > 100000`），收件人是该流程 `notify` 节点的 `recipients`（只有 `{record.owner_id}`）；工单侧的收件人是 `src/flows/case-escalation.flow.ts` 里 `notify` 节点的 `recipients`（只有 `{caseRecord.owner_id}`）。
- `sales/opportunities` 与 `sales/pipeline-management` 的「你需要同步改三处」清单改指真实的三个源码位置：`OPPORTUNITY_STAGE_OPTIONS`（`src/objects/_picklists.ts`）、`opportunity_lifecycle` 钩子里的 `STAGE_PROBABILITY`（`src/objects/opportunity.hook.ts`）、商机对象上的 `opportunity_stage_progression` 状态机校验规则（`src/objects/opportunity.object.ts`）。
- `reference/glossary` 的 **Workflow rule** 词条与 `reference/performance-and-limits` 的每对象上限行不静默删名，改为点名该类型已退休并指向流程；`administration/index` 与 `administration/state-machines` 的措辞改为流程 / 对象钩子。

`service/cases` 的「工作流自动化」清单两条同步写实：*紧急时通知* 的收件人只有工单负责人一人，`support_manager@example.com` 在本应用零命中；*升级时通知* 不发任何邮件，`escalation_team@example.com` 同样不存在——状态变更为 *Escalated* 真正触发的是 `src/objects/case.hook.ts` 里的 `case_status_side_effects` 钩子，它给**账户负责人**开出一条次日到期的紧急跟进任务，且仅限有关联账户的工单。触发列一并纠正为「状态变更为 *Escalated*」，而非布尔标记翻转。

仅文档改动，`src/**` 零改动。
