---
'hotcrm': patch
---

docs(activities): 把「重复任务」用例里的续约提醒按机制写实（三语）

`content/docs/sales/activities.mdx` 及其 zh-Hans / zh-Hant 双语在 **Recurring tasks / 重复任务**一节的用例列表里列着「合同结束前 60 天的续约提醒——由合同流程自动设置」。两处都与源码不符：

- **不是 60 天。** 写死 60 天的激活期任务已从 `src/objects/contract.hook.ts` 删除（原因写在该文件 `:121-124` 的注释里）。今天排续约提醒的是 `contract_renewal` 定时流程（`src/flows/contract-renewal.flow.ts`），每天 08:00 只扫 `status: 'activated'` 的合同，窗口取每份合同自己的 `renewal_notice_days`（`src/objects/contract.object.ts`，`defaultValue: 30`，逐份可设）。
- **不是重复任务。** 该流程的 `create_renewal_task` 节点写入的字段只有 subject / `type: 'follow_up'` / priority / status / due_date / owner_id / related_to_*，没有任何重复字段。它每天重现靠的是「扫描 + 幂等闸门」——合同只要还挂着一条未完成的 `Renewal due` 任务，当天就算已处理——而不是 recurrence 机制。

改法按实测：本仓的重复任务**机制**是真的（`crm_task` 的 `is_recurring` / `recurrence_type` / `recurrence_interval` / `recurrence_end_date` 四个字段、表单的「重复规则」分组、`recurrence_fields_required` 校验规则，以及 `src/objects/task.hook.ts` 的 `task_recurrence` 钩子在完成时生成下一实例），但**没有任何自动化会创建重复任务**——`is_recurring` 在 `src/flows/`、`src/actions/`、`src/data/` 下零命中。因此这一条假用例被移除，改为如实写明：重复任务只由人工勾选发起；续约提醒则按每日扫描 + 每份合同的**续约通知（天）**（默认 30）写清真实工作方式，并指向 `content/docs/revenue/contracts.mdx` 的*每日——续约提醒*一节。口径与 `content/docs/sales/quotes.mdx` 已落地的接受链路一致。

仅文档改动；未触碰 `src/**`、元数据、钩子或流程。
