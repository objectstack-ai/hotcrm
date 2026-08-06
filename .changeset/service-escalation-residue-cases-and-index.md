---
'hotcrm': patch
---

按 flow / hook 源码写实 `content/docs/service/cases.mdx` 的升级说法与 `content/docs/service/index.mdx`
生命周期第 2 步残留的虚构收件人,三语同步(#914、#915)。

#876 / #886(`service/sla-and-escalation`)、#887(`service/cases` 的《工作流自动化》一节)、
#904(`service/index` 的两处清单)已经把这一族说法逐条写实。剩下的两处是同族里没有被那几张
行清单枚举到的副本,而它们比已改的那几处更完整地复述了全部虚构 —— 于是读者在同一页上、
同一屏里同时读到两套互相矛盾的描述,更显眼的那一套是错的。

**`content/docs/service/cases.mdx`(+ `zh-Hans` / `zh-Hant`)**

- **优先级表下面那句话。** 原文写「设为 Critical 时支持经理会收到邮件通知;某个客户账户的
  工单设为 High 时自动升级」——它上方 48 行就是 #887 已写实的《工作流自动化》第一条,那里写的
  是收件人只有工单负责人一人。`src/flows/case-escalation.flow.ts` 的 `notify` 节点
  `recipients` 只有 `{caseRecord.owner_id}` 这一项,`grep -rn "support_manager@" src/` 零命中;
  start 条件全文只有 `record.priority == "critical"`,全仓没有任何一个 flow 读取账户类型。
  现在写实为:Critical 提醒**工单负责人**(站内消息 + 邮件),并点名说清 `support_manager@example.com`
  这个收件人不存在;High 永远不会自动升级,无论账户是什么,要升级它靠的是手动的
  **Escalate Case** 按钮(`src/actions/case.actions.ts`)。
- **《工单升级》整节。** 原文是 #876 已在 sla 页逐条写实过的那份五步清单,原封不动地留在本页:
  触发条件列着不存在的 `High + Customer` 分支;第 1 步「重新分配工单给客服的经理」不存在——
  `update_record` 节点只写 `is_escalated` / `escalation_reason` / `escalated_date` / `status`,
  注释开头即 `No owner reassignment`,通知正文自己写着 `It remains assigned to you.`;第 4 步的
  跟进任务归属错——流程里根本没有任务节点,任务由 `src/objects/case.hook.ts` 的
  `case_status_side_effects` 钩子开出,`owner_id` 取的是**账户负责人**,且仅限有关联账户的工单;
  第 5 步的三方邮件不存在,`support-team@example.com` 同样零命中。整节按 sla 页已落地的口径
  重写为:一个触发条件 + 三步真实动作 + 钩子开出的那条任务 + 三条「刻意不写什么」。
  原清单中经核对属实的两条(标记已升级并标记升级日期、状态改为 *Escalated*)claim 文本一字未改,
  仅因删除其前后条目而由 2./3. 重新编号为 1./2.。同页 #920 / #912 各自认领的两行(状态推进受
  强制约束、《工作流自动化》标题)不在本次改动的任何一个 hunk 内。

**`content/docs/service/index.mdx`(+ `zh-Hans` / `zh-Hant`)**

生命周期第 2 步写着「*Critical* 会立即提醒支持经理」,而 #904 刚在其下方 10 行把《系统为你做的事》
那条写实为「只发给工单负责人……本应用中不存在 `support_manager@example.com` 这个收件人」。
两句说的是同一个 `notify` 节点。现在写实为:*Critical* 立即提醒**工单负责人**,而不是支持经理,
收件人列表只有 `{caseRecord.owner_id}` 一项。顺带把这一行的四个优先级名统一为兄弟页
(`service/cases` 的优先级表、本页其余各行)已用的拉丁写法 Low / Medium / High / Critical ——
中文两页此前只有这一行把 Critical 译作「紧急 / 緊急」。

沿用 #876 / #886 / #887 / #904 已确立的写法:读者来找的那几个词 —— 支持经理、经理、资深客服、
支持团队、原客服 —— 都点名说清**不做**,并写出真正的归属,而不是静默删掉。两页只陈述当前行为,
不预判升级*是否应该*改派、High *是否应该*自动升级(#595 / #596 的产品问题)。顺带去掉了两个中文
cases 页内链上的英文锚点 `#case-escalation` —— 中文页的标题是中文,该锚点在那两页上落不到任何
位置(#755 / #762 惯例,#904 已按同一处理)。

纯文档改动,6 个文件。未触碰 `src/**`,没有任何 flow、hook、条件、收件人或字段发生变化 ——
是页面向已经在跑的行为对齐。
