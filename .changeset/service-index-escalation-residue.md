---
'hotcrm': patch
---

按 flow / hook 源码写实 `content/docs/service/index.mdx` 上残留的五条升级与通知说法,三语同步(#904)。

服务域的落地页是大多数读者最先读到的一页。`service/sla-and-escalation`(#876 / #886)与
`service/cases`(#850 / #887)的同族说法已经逐条写实之后,本页的「一个典型工单的生命周期」
与「系统为你做的事」两处清单仍在原样承诺重新分配、一个不存在的分支、两个不存在的收件人
和一个不存在的横幅 —— 读者拿到的是自相矛盾的两套描述,而更显眼的那一套是错的。五条按
兄弟页已落地的口径写实,`content/docs/service/index.zh-Hans.mdx` /
`content/docs/service/index.zh-Hant.mdx` 同步:

- **升级不会把工单重新分配给资深客服。** 生命周期第 5 步写的是「如果卡住了(或紧急,或来自
  客户),升级流程会将其重新分配给资深客服」。`src/flows/case-escalation.flow.ts` 的
  `update_record` 节点只写 `is_escalated` / `escalation_reason` / `escalated_date` /
  `status`,从不碰 `owner_id` —— 节点注释开头就是 `No owner reassignment`,因为
  `{caseRecord.owner_id.manager}` 穿不透 lookup、会插值成字面量 `undefined`;升级通知的正文
  自己写着 `It remains assigned to you.`。现在写实为:升级把工单标记为 *Escalated* 并提醒
  它的负责人,不做交接;交到资深客服手里仍是一个需要有人手动完成的步骤。
- **没有 `High + Customer` 这条分支。** 同一步里的「或来自客户」,以及「自动升级——将紧急工单
  或高优先级客户工单升级给资深客服」,说的是同一个不存在的东西:start 条件全文只有
  `record.priority == "critical"`,全仓 24 个 flow 没有任何一处读取账户类型。现在写实为:
  只有 Critical 会自动升级,High 工单永远不会(无论账户是什么),升级它靠的是工单记录上的
  **Escalate Case** 按钮。
- **「紧急时通知」发给工单负责人,不发给支持经理。** 该行说的其实就是工单升级流程的 `notify`
  节点,`recipients` 只有 `{caseRecord.owner_id}` 一项,`support_manager@example.com` 在
  `src/` 下零命中。现在写实为站内消息 + 邮件发给**工单负责人**,并点名说清这个收件人不存在。
- **「升级时通知」不发任何邮件。** `escalation_team@example.com` 全仓零命中,状态转为
  escalated 触发的是 `src/objects/case.hook.ts` 的 `case_status_side_effects` 钩子开出的那条
  **次日到期、优先级为紧急、归账户负责人**的跟进任务。现在写实为这条真实归属。
- **SLA 违约没有红色横幅。** `grep -rn "banner" src/` 在整个 app 里只有
  `src/objects/opportunity.object.ts` 的一句无关注释 —— 没有任何横幅机制。违约的真实表现是
  `is_sla_violated` 被置真、工单被升级,外加 `src/flows/case-sla-monitor.flow.ts` 的 `notify`
  节点发给 `{currentCase.owner_id}` 一人的站内消息 + 邮件。

沿用 #876 / #886 已确立的写法:读者来找的那几个词 —— 资深客服、支持经理、升级团队、红色横幅
—— 都点名说清**不做**,并写出真正的归属,而不是静默删掉、留下一个「页面大概是忘了写」的印象。
本页只陈述当前行为,不预判升级*是否应该*改派、High *是否应该*自动升级(#595 / #596 的产品问题)。
同段中经核对属实的三条(工单分流技能定优先级、关闭时标记解决时间、未写解决方案不能关单)
保持不动。顺带把生命周期第 5 步的中文页内链去掉了英文锚点 `#case-escalation` —— 两个中文页的
标题是中文,该锚点在这两页上落不到任何位置(#755 / #762 惯例)。

纯文档改动,3 个文件。未触碰 `src/**`,没有任何 flow、hook、条件、收件人或字段发生变化 ——
是页面向已经在跑的行为对齐。Fixes #904.
