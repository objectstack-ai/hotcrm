---
'hotcrm': patch
---

按 flow / hook / skill 源码写实 service 三页族剩下的两组行为性失实,三语同步(#886、#890)。

**#886 — `content/docs/service/sla-and-escalation.mdx` 及其 `zh-Hans` / `zh-Hant` 双生页**

- **升级触发条件里那个 `High + Customer` 分支根本不存在。** 页面「何时触发升级」一节写着「Critical,**或者** High 优先级且关联账户为 Customer」,管理员提示里又复述了一遍。`src/flows/case-escalation.flow.ts` 的 start 条件全文只有一个优先级项 —— `record.priority == "critical"` —— 外加防止二次升级的 `escalated_date` / `status` 守卫;它的 insert 版孪生 `case_escalation_on_create` 复用同一条件,只把 `triggerType` 换成 `record-after-create`。全仓 24 个 flow 里没有任何一处读取账户类型或账户分层。现在写实为:只有 Critical 会自动升级;**High 工单永远不会**,无论其账户是 Customer 还是潜在客户,升级它是手动步骤(工单记录上的 Escalate Case 按钮)。管理员提示同步改为点名两个流程,并提醒改条件要两个一起改,否则新建路径仍会漏掉。
- **兜底路径对 High 同样不生效。** `case_sla_monitor` 按 `sla_due_date` 过期扫单,但 `src/objects/case.hook.ts` 只为 `critical` 打 4 小时 SLA,其余优先级一律留空(该字段非 readonly,可以手工填)。所以一个没人过问的 High 工单两条路径都进不去 —— 页面现在明说这批工单需要人工巡检。此处只陈述当前行为,不预判 High 是否*应该*自动升级或*应该*有 SLA(#595 的产品问题)。
- **Critical 违约行承诺的两样东西都不存在。** SLA 目标表 Critical 行写的是「工单详情上的红色横幅、向支持经理发出警报」。`grep -rn banner src/` 在整个 app 里只有 `src/objects/opportunity.object.ts` 的一句无关注释 —— 没有任何横幅机制;违约通知来自 `src/flows/case-sla-monitor.flow.ts` 的 `notify` 节点,`recipients` 只有 `{currentCase.owner_id}` 一项,节点标签就叫 `Alert Owner`。现在写实为:SLA 监控标记违约、升级工单、通过站内消息 + 邮件提醒**工单负责人**,并点名说清没有红色横幅、也不通知支持经理。

**#890 — `content/docs/service/cases.mdx`、`content/docs/service/index.mdx`、`content/docs/service/sla-and-escalation.mdx` 及各自的 `zh-Hans` / `zh-Hant`**

三页把「检索知识库并起草回复」「用知识库对相似历史工单做模式匹配」记在做不到这件事的技能名下:

- `src/skills/case-triage.skill.ts` 的 `tools` 只有 `['describe_object', 'get_record']` —— 没有任何检索类工具,既检索不了文章,也拉不出相似的历史工单;
- `src/skills/email-drafting.skill.ts` 的五步 instructions 从头到尾没有一步去取知识来源,因此草稿不会引用文章;
- 真正读文章的是 `src/skills/customer-360.skill.ts`,它用 `query_records` 查 `status` 已发布、按工单的 category / tags 匹配的 `crm_knowledge_article`。

三处整句按 #861 / #865 的既有口径重写:检索归 Customer 360°,起草回复归邮件撰写,并说明工单分流两件都不做。句中「Support Knowledge Base」是 #808 / #892 已清掉的虚构知识库名,链接保持指向 `/docs/service/knowledge-base`,标签改为该页的真实称谓(知识文章 / knowledge articles)。

纯文档改动,9 个文件。未触碰 `src/**`,没有任何 flow、hook、skill、条件、收件人或字段发生变化 —— 是页面向已经在跑的行为对齐。
